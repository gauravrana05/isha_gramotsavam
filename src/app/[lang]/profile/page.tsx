"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { pincodeService } from "@/lib/services/pincodeService";
import { api } from "@/server/trpc/react";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { LoadingSpinner, PageLoader, SectionLoader } from "@/components/ui/loaders";
import { DocumentUpload } from "@/components/documents";
import { useDocumentManager } from "@/hooks/documents";
import {
  MapPin,
  CheckCircle,
  User,
  Edit,
  Save,
  X,
  Trash2,
  Upload,
  Check,
  ArrowLeft,
  LogOut,
  Camera,
  Phone,
  Mail,
  Globe,
  Building,
  CreditCard,
  Briefcase,
  Plus,
  Calendar,
  UserCheck
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';

interface EditState {
  basicProfile: boolean;
  addressDetails: boolean;
  otherDetails: boolean;
  identityVerification: boolean;
}

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

export default function ProfilePage() {
  const { user, userProfile, loading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const { lang } = useParams();
  const { t } = useTranslation();

  // tRPC mutations
  const updateProfileMutation = api.profile.updateComplete.useMutation();
  const profileDataQuery = api.profile.checkCompletion.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  );

  const [editState, setEditState] = useState<EditState>({
    basicProfile: false,
    addressDetails: false,
    otherDetails: false,
    identityVerification: false,
  });

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    whatsappNumber: "",
    dob: "",
    instagramHandle: "",
    gender: "",
    pincode: "",
    state: "",
    district: "",
    taluk: "",
    panchayat: "",
    preferredLanguage: "en",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressCaptured, setAddressCaptured] = useState(false);
  const [isWhatsAppSame, setIsWhatsAppSame] = useState(true);
  const [districts, setDistricts] = useState<string[]>([]);
  const [taluks, setTaluks] = useState<string[]>([]);
  const [panchayats, setPanchayats] = useState<string[]>([]);

  const languages = [
    { code: "en", name: "English" },
    { code: "ta", name: "Tamil" },
    { code: "hi", name: "Hindi" },
    { code: "ml", name: "Malayalam" },
    { code: "te", name: "Telugu" },
    { code: "kn", name: "Kannada" },
    { code: "or", name: "Odia" },
  ];

  const phoneNumber = user?.phone?.replace(/^\+91/, '') || '';
  const whatsappNumber = userProfile?.whatsapp_number?.replace(/^\+91/, '') || '';

  useEffect(() => {
    if (loading || !userProfile) return;

    setFormData({
      firstName: userProfile.first_name || "",
      lastName: userProfile.last_name || "",
      whatsappNumber: whatsappNumber || phoneNumber,
      dob: userProfile.date_of_birth ? new Date(userProfile.date_of_birth).toISOString().split('T')[0] : "",
      instagramHandle: userProfile.instagram_handle || "",
      gender: userProfile.gender || "",
      pincode: userProfile.pincode || "",
      state: userProfile.state || "",
      district: userProfile.district || "",
      taluk: userProfile.taluk || "",
      panchayat: userProfile.panchayat || "",
      preferredLanguage: userProfile.language_preference || "en",
    });

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
  }, [userProfile, phoneNumber, loading]);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${lang}/login`);
    }
  }, [user, loading, router, lang]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");

    if (field === "pincode") {
      setAddressCaptured(false);
      setDistricts([]);
      setTaluks([]);
      setPanchayats([]);
      setFormData((prev) => ({
        ...prev,
        state: "",
        district: "",
        taluk: "",
        panchayat: ""
      }));
      if (value.length === 6) {
        fetchState(value);
      }
    } else if (field === "state") {
      setDistricts([]);
      setTaluks([]);
      setPanchayats([]);
      setFormData((prev) => ({
        ...prev,
        district: "",
        taluk: "",
        panchayat: ""
      }));
      if (value) {
        fetchDistricts(value);
      }
    } else if (field === "district") {
      setTaluks([]);
      setPanchayats([]);
      setFormData((prev) => ({
        ...prev,
        taluk: "",
        panchayat: ""
      }));
      if (value && formData.state) {
        fetchTaluks(formData.state, value);
      }
    } else if (field === "taluk") {
      setPanchayats([]);
      setFormData((prev) => ({
        ...prev,
        panchayat: ""
      }));
      if (value && formData.state && formData.district) {
        fetchPanchayats(formData.state, formData.district, value);
      }
    } else if (field === "panchayat") {
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

  const toggleEdit = (section: keyof EditState) => {
    setEditState(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
    setError("");
    setSuccess("");
  };

  const fetchState = async (pincode: string) => {
    if (pincode.length !== 6) return;

    setAddressLoading(true);
    setError("");

    try {
      const addressData = await pincodeService.getAddressByPincode(pincode);
      setFormData((prev) => ({
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


  const handleSave = async (section: keyof EditState) => {
    if (!user) return;

    if (section === 'basicProfile') {
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
    }

    if (section === 'addressDetails' && formData.pincode.length === 6 && !addressCaptured) {
      setError("Please complete the address selection by choosing a panchayat");
      return;
    }

    setFormLoading(true);
    setError("");
    setSuccess("");

    try {
      // Use tRPC to update profile with all current form data
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
      
      toggleEdit(section);
      setSuccess("Profile updated successfully!");
    } catch (error) {
      // Error handling removed
      setError("Failed to update profile. Please try again.");
    } finally {
      setFormLoading(false);
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

  const handleCompleteProfile = () => {
    router.push(`/${lang}/profile/complete`);
  };

  const isProfileComplete = userProfile?.profile_complete || false;
  const hasAddress = userProfile?.pincode && userProfile?.state && userProfile?.district;
  const hasAadhaar = userProfile?.documents?.aadhaarFront?.url && userProfile?.documents?.aadhaarBack?.url;

  if (loading) {
    return (
      <PageLoader
        title="Loading Profile..."
        variant="brand"
        size="lg"
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
              width={0}
              height={80}
              className="mx-auto pb-8"
            /> */}
          </div>
          <h1 className="text-3xl font-semibold font-fira flex items-center justify-center space-x-2">
            <User className="w-8 h-8" />
            <span>Profile</span>
          </h1>
        </div>

        {!isProfileComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-yellow-600" />
                <p className="text-yellow-800 font-fira">Your profile is incomplete</p>
              </div>
              <button
                onClick={handleCompleteProfile}
                className="bg-[#CE4520] sm:w-sm text-white px-4 py-2 rounded-lg hover:bg-[#1565C0] font-fira transition-colors"
              >
                Complete Profile
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-600 text-sm font-fira">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm font-fira">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center flex justify-center">
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
            <button
              onClick={() => toggleEdit('basicProfile')}
              className="text-[#CE4520] hover:text-[#1565C0] font-fira text-sm transition-colors"
            >
              {editState.basicProfile ? 'Close' : 'Edit'}
            </button>
          </div>
          <hr className="mb-6" />

          {!editState.basicProfile ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1 font-fira">First Name</div>
                <div className="text-gray-900 font-fira">{formData.firstName || 'Not Available'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1 font-fira">Last Name</div>
                <div className="text-gray-900 font-fira">{formData.lastName || 'Not Available'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1 font-fira">Phone Number</div>
                <div className="text-gray-900 font-fira">+91 {phoneNumber || 'Not Available'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1 font-fira">WhatsApp Number</div>
                <div className="text-gray-900 font-fira">+91 {formData.whatsappNumber || 'Not Available'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1 font-fira">Date of Birth</div>
                <div className="text-gray-900 font-fira">{formData.dob || 'Not Available'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1 font-fira">Gender</div>
                <div className="text-gray-900 font-fira">
                  {formData.gender === 'M' ? 'Male' : formData.gender === 'F' ? 'Female' : formData.gender === 'O' ? 'Others' : 'Not Available'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1 font-fira">Preferred Language</div>
                <div className="text-gray-900 font-fira">
                  {languages.find(lang => lang.code === formData.preferredLanguage)?.name || 'Not Available'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1 font-fira">Role</div>
                <div className="text-gray-900 font-fira">{userProfile.role || "player"}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
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
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleInputChange('gender', value)}
                  >
                    <SelectTrigger className="w-full font-fira">
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
                    Preferred Language
                  </label>
                  <Select
                    value={formData.preferredLanguage}
                    onValueChange={(value) => handleInputChange('preferredLanguage', value)}
                  >
                    <SelectTrigger className="w-full font-fira">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => toggleEdit('basicProfile')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-fira transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave('basicProfile')}
                  disabled={formLoading}
                  className="px-4 py-2 bg-[#CE4520] text-white rounded-lg hover:bg-[#1565C0] font-fira transition-colors disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="xs" color="primary" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold font-fira">Address Details</h3>
            <button
              onClick={() => toggleEdit('addressDetails')}
              className="text-[#CE4520] hover:text-[#1565C0] font-fira text-sm transition-colors"
            >
              {editState.addressDetails ? 'Close' : hasAddress ? 'Edit' : 'Add'}
            </button>
          </div>
          <hr className="mb-6" />

          {!editState.addressDetails ? (
            hasAddress ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1 font-fira">Pincode</div>
                  <div className="text-gray-900 font-fira">{formData.pincode || 'Not Available'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1 font-fira">State</div>
                  <div className="text-gray-900 font-fira">{formData.state || 'Not Available'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1 font-fira">District</div>
                  <div className="text-gray-900 font-fira">{formData.district || 'Not Available'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1 font-fira">Taluk</div>
                  <div className="text-gray-900 font-fira">{formData.taluk || 'Not Available'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1 font-fira">Panchayat</div>
                  <div className="text-gray-900 font-fira">{formData.panchayat || 'Not Available'}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-fira mb-4">No address information added yet</p>
                <button
                  onClick={() => toggleEdit('addressDetails')}
                  className="flex items-center space-x-2 bg-[#CE4520] text-white px-4 py-2 rounded-lg hover:bg-[#1565C0] font-fira transition-colors mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Address</span>
                </button>
              </div>
            )
          ) : (
            <div className="space-y-6">
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
                      {addressLoading && <LoadingSpinner size="xs" color="primary" />}
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
                    <SelectTrigger className="w-full font-fira">
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
                    <SelectTrigger className="w-full font-fira">
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
                    <SelectTrigger className="w-full font-fira">
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
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <p className="text-green-600 text-sm font-fira">Address captured successfully</p>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => toggleEdit('addressDetails')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-fira transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave('addressDetails')}
                  disabled={formLoading || (formData.pincode.length === 6 && !addressCaptured)}
                  className="px-4 py-2 bg-[#CE4520] text-white rounded-lg hover:bg-[#1565C0] font-fira transition-colors disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="xs" color="primary" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold font-fira">Identity Verification</h3>
          </div>
          <hr className="mb-6" />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <DocumentUpload
                type="aadhaarFront"
                label="Aadhar Card Front"
                currentUrl={profileDataQuery.data?.userProfileImages?.aadhaar_front_path}
                variant="card"
                className="flex flex-col justify-center items-center font-fira"
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
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <DocumentUpload
                type="aadhaarBack"
                label="Aadhar Card Back"
                currentUrl={profileDataQuery.data?.userProfileImages?.aadhaar_back_path}
                variant="card"
                className="flex flex-col justify-center items-center font-fira"
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
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold font-fira">Other Information</h3>
            <button
              onClick={() => toggleEdit('otherDetails')}
              className="text-[#CE4520] hover:text-[#1565C0] font-fira text-sm transition-colors"
            >
              {editState.otherDetails ? 'Close' : 'Edit'}
            </button>
          </div>
          <hr className="mb-6" />

          {!editState.otherDetails ? (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1 font-fira">Instagram Handle</div>
              <div className="text-gray-900 font-fira">{formData.instagramHandle || 'Not Available'}</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                  placeholder="@username (optional)"
                  value={formData.instagramHandle}
                  onChange={(e) => handleInputChange('instagramHandle', e.target.value)}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => toggleEdit('otherDetails')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-fira transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave('otherDetails')}
                  disabled={formLoading}
                  className="px-4 py-2 bg-[#CE4520] text-white rounded-lg hover:bg-[#1565C0] font-fira transition-colors disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="xs" color="primary" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12">
          <Image
            src="/images/placeholders/footer-mural.png"
            alt="Footer Mural"
            width={1200}
            height={400}
            className="w-full h-auto rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
