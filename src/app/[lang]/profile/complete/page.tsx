"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { pincodeService } from "@/lib/services/pincodeService";
import { useTranslation } from "@/lib/utils/i18n";
import { getDashboardRoute } from "@/lib/utils/navigation";
import { api } from "@/server/trpc/react";
import Image from "next/image";
import { Camera, Upload, Check,ArrowLeft, Loader2, MapPin, LogOut } from "lucide-react";
import { LoadingSpinner, PageLoader, SectionLoader } from "@/components/ui/loaders";
import { DocumentUpload } from "@/components/documents";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';

interface FormData {
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  dob: string;
  instagramHandle: string;
  gender: string;
  pincode: string;
  state: string;
  district: string;
  taluk: string;
  panchayat: string;
  preferredLanguage: string;
}

export default function CompleteProfilePage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    pincode: "",
    state: "",
    district: "",
    taluk: "",
    panchayat: "",
    whatsappNumber: "",
    gender: "",
    dob: "",
    instagramHandle: "",
    preferredLanguage: ""
  });

  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressCaptured, setAddressCaptured] = useState(false);
  const [error, setError] = useState("");
  const [isWhatsAppSame, setIsWhatsAppSame] = useState(true);
  const [districts, setDistricts] = useState<string[]>([]);
  const [taluks, setTaluks] = useState<string[]>([]);
  const [panchayats, setPanchayats] = useState<string[]>([]);

  const router = useRouter();
  const { lang } = useParams();
  const searchParams = useSearchParams();
  const { user, userProfile, loading: authLoading, logout, refreshUser } = useAuth();
  
  // Get return URL if user came from team registration
  const returnTo = searchParams.get('returnTo');
  const { t } = useTranslation();


  const phoneNumber = user?.phone?.replace(/^\+91/, '') || '';
  const whatsappNumber = userProfile?.whatsapp_number?.replace(/^\+91/, '') || '';

  // tRPC mutations
  const updateProfileMutation = api.profile.updateComplete.useMutation();
  const profileDataQuery = api.profile.checkCompletion.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  );

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    // No automatic redirect - only redirect on Save button

    if (userProfile && Object.values(formData).every(value => !value)) {
      setFormData(prev => ({
        ...prev,
        firstName: userProfile.first_name || "",
        lastName: userProfile.last_name || "",
        whatsappNumber: whatsappNumber || phoneNumber,
        dob: userProfile.date_of_birth ? new Date(userProfile.date_of_birth).toISOString().split('T')[0] : "",
        gender: userProfile.gender || "",
        pincode: userProfile.pincode || "",
        state: userProfile.state || "",
        district: userProfile.district || "",
        taluk: userProfile.taluk || "",
        panchayat: userProfile.panchayat || "",
        instagramHandle: userProfile.instagram_handle || "",
        preferredLanguage: userProfile.language_preference || ""
      }));

      if (userProfile.whatsapp_number && userProfile.whatsapp_number === phoneNumber) {
        setIsWhatsAppSame(true);
      } else if (userProfile.whatsapp_number && userProfile.whatsapp_number !== phoneNumber) {
        setIsWhatsAppSame(false);
      }

      if (userProfile.state && userProfile.district && userProfile.taluk && userProfile.panchayat) {
        setAddressCaptured(true);
        if (userProfile.state) {
          fetchDistricts(userProfile.state).then(() => {
            if (userProfile.district) {
              fetchTaluks(userProfile.state, userProfile.district).then(() => {
                if (userProfile.taluk) {
                  fetchPanchayats(userProfile.state, userProfile.district, userProfile.taluk);
                }
              });
            }
          });
        }
      }
    }
  }, [user, userProfile, authLoading, router, lang, phoneNumber]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");

    if (field === 'pincode') {
      setAddressCaptured(false);
      setDistricts([]);
      setTaluks([]);
      setPanchayats([]);
      setFormData(prev => ({
        ...prev,
        state: "",
        district: "",
        taluk: "",
        panchayat: ""
      }));
      if (value.length === 6) {
        fetchState(value);
      }
    } else if (field === 'state') {
      setDistricts([]);
      setTaluks([]);
      setPanchayats([]);
      setFormData(prev => ({
        ...prev,
        district: "",
        taluk: "",
        panchayat: ""
      }));
      if (value) {
        fetchDistricts(value);
      }
    } else if (field === 'district') {
      setTaluks([]);
      setPanchayats([]);
      setFormData(prev => ({
        ...prev,
        taluk: "",
        panchayat: ""
      }));
      if (value && formData.state) {
        fetchTaluks(formData.state, value);
      }
    } else if (field === 'taluk') {
      setPanchayats([]);
      setFormData(prev => ({
        ...prev,
        panchayat: ""
      }));
      if (value && formData.state && formData.district) {
        fetchPanchayats(formData.state, formData.district, value);
      }
    } else if (field === 'panchayat') {
      setAddressCaptured(!!value);
    }
  };

  const handleWhatsAppSameChange = (checked: boolean) => {
    setIsWhatsAppSame(checked);
    if (checked) {
      // Remove +91 prefix if present
      const cleanPhoneNumber = phoneNumber.replace(/^\+91/, '');
      setFormData(prev => ({ ...prev, whatsappNumber: cleanPhoneNumber }));
    } else {
      setFormData(prev => ({ ...prev, whatsappNumber: "" }));
    }
  };

  const fetchState = async (pincode: string) => {
    if (pincode.length !== 6) return;

    setAddressLoading(true);
    setError("");

    try {
      const addressData = await pincodeService.getAddressByPincode(pincode);
      setFormData(prev => ({
        ...prev,
        state: addressData.state,
        district: "",
        taluk: "",
        panchayat: ""
      }));
      if (addressData.state) {
        await fetchDistricts(addressData.state);
      }
    } catch (err: any) {
      setError(err.message || "Invalid pincode. Please check and try again.");
    } finally {
      setAddressLoading(false);
    }
  };

  const fetchDistricts = async (state: string) => {
    setAddressLoading(true);
    try {
      const districtList = await pincodeService.getDistrictsByState(state);
      setDistricts(districtList);
    } catch (err: any) {
      setError(err.message || "Failed to fetch districts. Please try again.");
    } finally {
      setAddressLoading(false);
    }
  };

  const fetchTaluks = async (state: string, district: string) => {
    setAddressLoading(true);
    try {
      const { taluks } = await pincodeService.getTaluksByDistrict(state, district);
      setTaluks(taluks);
    } catch (err: any) {
      setError(err.message || "Failed to fetch taluks. Please try again.");
    } finally {
      setAddressLoading(false);
    }
  };

  const fetchPanchayats = async (state: string, district: string, taluk: string) => {
    setAddressLoading(true);
    try {
      const panchayatList = await pincodeService.getPanchayatsByTaluk(state, district, taluk);
      setPanchayats(panchayatList);
    } catch (err: any) {
      setError(err.message || "Failed to fetch panchayats. Please try again.");
    } finally {
      setAddressLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      await logout();
      router.push(`/${lang}/login`);
    } catch (error) {
      // Error handling removed
    }
  };
  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.firstName.trim()) {
      setError("Please enter your first name");
      return;
    }
    if (!formData.lastName.trim()) {
      setError("Please enter your last name");
      return;
    }
    if (!formData.whatsappNumber.trim()) {
      setError("Please enter your WhatsApp number");
      return;
    }
    if (!formData.dob) {
      setError("Please enter your date of birth");
      return;
    }
    if (!formData.gender) {
      setError("Please select your gender");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Update profile using tRPC
      await updateProfileMutation.mutateAsync({
        userId: user.id,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        whatsappNumber: formData.whatsappNumber.trim() || undefined,
        dateOfBirth: formData.dob,
        gender: formData.gender as 'M' | 'F',
        instagramHandle: formData.instagramHandle.trim() || undefined,
        pincode: formData.pincode || undefined,
        panchayat: formData.panchayat,
        taluk: formData.taluk || undefined,
        district: formData.district,
        state: formData.state,
        preferredLanguage: formData.preferredLanguage || undefined,
      });

      // Refresh user data to reflect changes
      await refreshUser();

      // Redirect to return URL if coming from team registration, otherwise to profile page
      if (returnTo) {
        router.push(decodeURIComponent(returnTo));
      } else {
        router.push(`/${lang}/profile`);
      }
    } catch (err: any) {
      // Error handling removed
      setError(
        err.code === "storage/unauthorized"
          ? "Upload failed. Please try again."
          : err.message || "Failed to complete profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <PageLoader 
      title="Loading Complete Profile..."
      variant="minimal"
      size="md"
    /> 
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-isha">
      <div className="max-w-4xl mx-auto p-4 py-8 bg-isha">
      <div className="mb-6 flex justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-[#CE4520] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-fira">Back</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-fira">Logout</span>
          </button>
        </div>
        <div className="text-center mb-8">
          <div className="mb-4">
            {/* <Image 
              src="/images/logos/dark.png"
              alt="Isha Logo" 
              width={180} 
              height={80} 
              className="mx-auto pb-10"
            /> */}
          </div>
          <h1 className="text-3xl font-semibold font-fira mb-2">Complete Your Profile</h1>
          <p className="text-gray-600 font-fira">Please provide the following information to complete your profile</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold font-fira mb-4">Profile Picture</h3>
            <DocumentUpload
              type="profilePhoto"
              label="Profile Photo"
              currentUrl={profileDataQuery.data?.userProfileImages?.profile_photo_path}
              variant="profile"
              className="flex flex-col justify-center items-center"
              onSuccess={async () => {
                setError("");
                const { data: updatedData } = await profileDataQuery.refetch();
                // Refresh user data if profile completion status changed
                if (updatedData?.profileComplete !== user?.profile_complete) {
                  await refreshUser();
                }
              }}
              onError={(error) => setError(error)}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold font-fira">Personal Details</h3>
          </div>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                pattern="^(?=.*[A-Za-z])[A-Za-z\s.\-]{1,50}$"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                pattern="^(?=.*[A-Za-z])[A-Za-z\s.\-]{1,50}$"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Phone Number
              </label>
              <div className="flex">
                <div className="flex items-center bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg px-3">
                  <span className="text-sm font-fira">+91</span>
                </div>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-r-lg bg-gray-50 font-fira"
                  value={phoneNumber}
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isWhatsAppSame"
                    className="mr-2 form-checkbox text-[#CE4520] focus:ring-[#CE4520]"
                    checked={isWhatsAppSame}
                    onChange={(e) => handleWhatsAppSameChange(e.target.checked)}
                  />
                  <label htmlFor="isWhatsAppSame" className="text-sm font-fira">
                    My WhatsApp number is the same as my phone number
                  </label>
                </div>
                {isWhatsAppSame ? (
                  <div className="flex">
                    <div className="flex items-center bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg px-3">
                      <span className="text-sm font-fira">+91</span>
                    </div>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-r-lg bg-gray-50 font-fira"
                      value={phoneNumber}
                      readOnly
                    />
                  </div>
                ) : (
                  <div className="flex">
                    <div className="flex items-center bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg px-3">
                      <span className="text-sm font-fira">+91</span>
                    </div>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                      placeholder="Enter WhatsApp number"
                      value={formData.whatsappNumber}
                      onChange={(e) => handleInputChange('whatsappNumber', e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                      minLength={10}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                value={formData.dob}
                onChange={(e) => handleInputChange('dob', e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 14)).toISOString().split('T')[0]}
                min="1875-01-01"
              />
              <small className="text-gray-500 text-xs font-fira">Minimum age for a player is 14.</small>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Gender <span className="text-red-500">*</span>
              </label>
              <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="O">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Instagram Handle
              </label>
              <div className="flex">
                <div className="flex items-center bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg px-3">
                  <span className="text-sm font-fira">@</span>
                </div>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                  placeholder="username"
                  value={formData.instagramHandle}
                  onChange={(e) => handleInputChange('instagramHandle', e.target.value)}
                  maxLength={30}
                />
              </div>
              <small className="text-gray-500 text-xs font-fira">Optional - Enter your Instagram username without @</small>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Preferred Language
              </label>
              <Select value={formData.preferredLanguage} onValueChange={(value) => handleInputChange('preferredLanguage', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Preferred Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="ta">Tamil</SelectItem>
                  <SelectItem value="te">Telugu</SelectItem>
                  <SelectItem value="kn">Kannada</SelectItem>
                </SelectContent>
              </Select>
              <small className="text-gray-500 text-xs font-fira">Optional - Choose your preferred language for communication</small>
            </div>

          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold font-fira">Address Details</h3>
          </div>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Pincode
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira pr-10"
                  placeholder="Enter 6-digit pincode"
                  value={formData.pincode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    handleInputChange('pincode', value);
                  }}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {addressLoading && <Loader2 className="w-4 h-4 animate-spin text-[#CE4520]" />}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">State</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-fira"
                placeholder="Select pincode first"
                value={formData.state}
                disabled={!formData.pincode}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">District</label>
              <Select 
                value={formData.district} 
                onValueChange={(value) => handleInputChange('district', value)}
                disabled={!formData.state || !districts.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map(district => (
                    <SelectItem key={district} value={district}>{district}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">Taluk</label>
              <Select 
                value={formData.taluk} 
                onValueChange={(value) => handleInputChange('taluk', value)}
                disabled={!formData.district || !taluks.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Taluk" />
                </SelectTrigger>
                <SelectContent>
                  {taluks.map(taluk => (
                    <SelectItem key={taluk} value={taluk}>{taluk}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">Panchayat</label>
              <Select 
                value={formData.panchayat} 
                onValueChange={(value) => handleInputChange('panchayat', value)}
                disabled={!formData.taluk || !panchayats.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Panchayat" />
                </SelectTrigger>
                <SelectContent>
                  {panchayats.map(panchayat => (
                    <SelectItem key={panchayat} value={panchayat}>{panchayat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {addressCaptured && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <p className="text-green-600 text-sm font-fira">Address captured successfully</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold font-fira">Identity Verification</h3>
          </div>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-2 gap-6 font-fira">
            <DocumentUpload
              type="aadhaarFront"
              label="Aadhaar Card (Front)"
              currentUrl={profileDataQuery.data?.userProfileImages?.aadhaar_front_path}
              variant="card"
              onSuccess={async () => {
                setError("");
                const { data: updatedData } = await profileDataQuery.refetch();
                // Refresh user data if profile completion status changed
                if (updatedData?.profileComplete !== user?.profile_complete) {
                  await refreshUser();
                }
              }}
              onError={(error) => setError(error)}
            />

            <DocumentUpload
              type="aadhaarBack"
              label="Aadhaar Card (Back)"
              currentUrl={profileDataQuery.data?.userProfileImages?.aadhaar_back_path}
              variant="card"
              onSuccess={async () => {
                setError("");
                const { data: updatedData } = await profileDataQuery.refetch();
                // Refresh user data if profile completion status changed
                if (updatedData?.profileComplete !== user?.profile_complete) {
                  await refreshUser();
                }
              }}
              onError={(error) => setError(error)}
            />
          </div>
          <p className="text-sm text-gray-500 mt-4 font-fira">
            Note: Aadhaar documents are optional but recommended for verification. If you upload one side, both sides are required.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm font-fira">{error}</p>
          </div>
        )}

        <div className="text-center mb-8">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#CE4520] hover:bg-[#1565C0] text-white px-8 py-3 rounded-lg font-fira text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              'Save'
            )}
          </button>
        </div>

        <div className="text-center mb-6">
          <p className="text-sm font-fira text-gray-600">
            By clicking on complete profile, you accept our{" "}
            <a href="/terms" className="text-[#CE4520] hover:underline" target="_blank">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-[#CE4520] hover:underline" target="_blank">
              Privacy Policy
            </a>
          </p>
        </div>
        

        <div className="mt-12">
          <Image
            src="/images/placeholders/footer-mural.png"
            alt="Footer Mural"
            width={1200}
            height={200}
            className="w-full h-auto rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}