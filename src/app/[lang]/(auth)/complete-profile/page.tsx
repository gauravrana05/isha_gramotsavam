"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { uploadFile } from "@/lib/firebase/storage";
import { pincodeService } from "@/lib/services/pincodeService";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { Camera, Upload, Check, Loader2, MapPin } from "lucide-react";

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
  profilePhoto?: File;
  aadhaarFront?: File;
  aadhaarBack?: File;
}

export default function CompleteProfilePage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    pincode: "",
    state: "",
    district: "",
    taluk: "",
    preferredLanguage: "en",
    whatsappNumber: "",
    gender: "",
    dob: "",
    instagramHandle: "",
    panchayat: ""
  });

  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressVerified, setAddressVerified] = useState(false);
  const [error, setError] = useState("");
  const [isWhatsAppSame, setIsWhatsAppSame] = useState(true);
  const [uploadProgress, setUploadProgress] = useState({
    profile: 0,
    aadhaarFront: 0,
    aadhaarBack: 0,
  });

  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const languages = [
    { code: "en", name: "English" },
    { code: "ta", name: "Tamil" },
    { code: "hi", name: "Hindi" },
    { code: "ml", name: "Malayalam" },
    { code: "te", name: "Telugu" },
    { code: "kn", name: "Kannada" },
    { code: "or", name: "Odia" },
  ];

  // Extract phone number from user (remove country code)
  const phoneNumber = user?.phoneNumber?.replace(/^\+91/, '') || '';

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (userProfile?.isProfileComplete) {
      const role = userProfile.role || "public";
      switch (role) {
        case "admin":
          router.push(`/${lang}/admin/dashboard`);
          break;
        case "captain":
          router.push(`/${lang}/captain/dashboard`);
          break;
          case "player":
            router.push(`/${lang}/player/dashboard`);
            break;
        case "volunteer_general":
        case "volunteer_technical":
          router.push(`/${lang}/volunteer/dashboard`);
          break;
        case "guest":
          router.push(`/${lang}/guest/dashboard`);
          break;
        default:
          router.push(`/${lang}/public`);
      }
    }

    // Pre-fill form with existing profile data
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        whatsappNumber: userProfile.whatsappNumber || phoneNumber,
        dob: userProfile.dob || "",
        instagramHandle: userProfile.instagramHandle || "",
        gender: userProfile.gender || "",
        pincode: userProfile.pincode || "",
        state: userProfile.state || "",
        district: userProfile.district || "",
        taluk: userProfile.taluk || "",
        panchayat: userProfile.panchayat || "",
        preferredLanguage: userProfile.preferredLanguage || "en"
      }));

      // Check if WhatsApp number is same as phone number
      if (userProfile.whatsappNumber && userProfile.whatsappNumber === phoneNumber) {
        setIsWhatsAppSame(true);
      } else if (userProfile.whatsappNumber && userProfile.whatsappNumber !== phoneNumber) {
        setIsWhatsAppSame(false);
      }

      // If address data exists, mark as verified
      if (userProfile.state && userProfile.district) {
        setAddressVerified(true);
      }
    }
  }, [user, userProfile, authLoading, router, lang, phoneNumber]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
    
    // Reset address verification if pincode changes
    if (field === 'pincode') {
      setAddressVerified(false);
      if (value.length < 6) {
        setFormData(prev => ({
          ...prev,
          district: "",
          state: "",
          taluk: "",
          panchayat: ""
        }));
      }
    }
  };

  const handleWhatsAppSameChange = (checked: boolean) => {
    setIsWhatsAppSame(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, whatsappNumber: phoneNumber }));
    } else {
      setFormData(prev => ({ ...prev, whatsappNumber: "" }));
    }
  };

  const verifyPincode = async (pincode: string) => {
    if (pincode.length !== 6) return;

    setAddressLoading(true);
    setAddressVerified(false);
    setError("");

    try {
      const addressData = await pincodeService.getAddressByPincode(pincode);
      if (addressData) {
        setFormData(prev => ({
          ...prev,
          state: addressData.state,
          district: addressData.district,
          taluk: addressData.taluk || prev.taluk,
          panchayat: addressData.taluk || prev.panchayat // Set same as taluk for now
        }));
        setAddressVerified(true);
      }
    } catch (err: any) {
      setError(err.message || "Invalid pincode. Please check and try again.");
      setAddressVerified(false);
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validation
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

    // Optional address validation - only if pincode is provided
    if (formData.pincode && formData.pincode.length === 6 && !addressVerified) {
      setError("Please verify your address by entering a valid pincode");
      return;
    }

    // Ensure both Aadhaar photos are uploaded if one is
    if ((formData.aadhaarFront && !formData.aadhaarBack) || (!formData.aadhaarFront && formData.aadhaarBack)) {
      setError("Please upload both front and back sides of Aadhaar card");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const profileData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        whatsappNumber: formData.whatsappNumber,
        dob: formData.dob,
        instagramHandle: formData.instagramHandle,
        gender: formData.gender,
        pincode: formData.pincode,
        state: formData.state,
        district: formData.district,
        taluk: formData.taluk,
        panchayat: formData.panchayat,
        preferredLanguage: formData.preferredLanguage,
        isProfileComplete: true,
        updatedAt: new Date().toISOString(),
      };

      // Upload files with progress tracking
      if (formData.profilePhoto) {
        profileData.profilePhotoURL = await uploadFile(
          formData.profilePhoto,
          `profilePhotos/${user.uid}/profile_photo`,
          (progress) => setUploadProgress(prev => ({ ...prev, profile: progress }))
        );
      }

      if (formData.aadhaarFront) {
        profileData.aadhaarFrontURL = await uploadFile(
          formData.aadhaarFront,
          `aadhaar/${user.uid}/front_${Date.now()}`,
          (progress) => setUploadProgress(prev => ({ ...prev, aadhaarFront: progress }))
        );
      }

      if (formData.aadhaarBack) {
        profileData.aadhaarBackURL = await uploadFile(
          formData.aadhaarBack,
          `aadhaar/${user.uid}/back_${Date.now()}`,
          (progress) => setUploadProgress(prev => ({ ...prev, aadhaarBack: progress }))
        );
      }

      // Update user document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, profileData);

      // Redirect based on role
      const role = userProfile?.role || "player";
      switch (role) {
        case "admin":
          router.push(`/${lang}/admin/dashboard`);
          break;
        case "captain":
          router.push(`/${lang}/captain/dashboard`);
          break;
        case "volunteer_general":
        case "volunteer_technical":
          router.push(`/${lang}/volunteer/dashboard`);
          break;
        case "guest":
          router.push(`/${lang}/guest/dashboard`);
          break;
        default:
          router.push(`/${lang}/player/dashboard`);
      }
    } catch (err: any) {
      console.error("Error completing profile:", err);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE4520]" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-isha">
      <div className="max-w-4xl mx-auto p-4 py-8 bg-isha">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image 
              src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
              alt="Isha Logo" 
              width={80} 
              height={80} 
              className="mx-auto"
            />
          </div>
          <h1 className="text-3xl font-semibold font-fira mb-2">Complete Your Profile</h1>
          <p className="text-gray-600 font-fira">Please provide the following information to complete your profile</p>
        </div>

        {/* Profile Photo Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold font-fira mb-4">Profile Picture</h3>
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                {formData.profilePhoto ? (
                  <img 
                    src={URL.createObjectURL(formData.profilePhoto)} 
                    alt="Profile Preview" 
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : userProfile?.profilePhotoURL ? (
                  <img 
                    src={userProfile.profilePhotoURL} 
                    alt="Current Profile" 
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="btn bg-[#CE4520] text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-[#1565C0] transition-colors">
                <Upload className="w-4 h-4 inline mr-2" />
                {userProfile?.profilePhotoURL ? 'Change Profile Photo' : 'Upload Profile Photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData(prev => ({ ...prev, profilePhoto: file }));
                    }
                  }}
                />
              </label>
              {uploadProgress.profile > 0 && uploadProgress.profile < 100 && (
                <div className="w-full mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#CE4520] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.profile}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{uploadProgress.profile}% uploaded</p>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">Optional - You can upload this later</p>
            </div>
          </div>
        </div>

        {/* Personal Details */}
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
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
              >
                <option value="" disabled>Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Others</option>
              </select>
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Preferred Language
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                value={formData.preferredLanguage}
                onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Address Details - Optional */}
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
                  onBlur={(e) => e.target.value.length === 6 && verifyPincode(e.target.value)}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {addressLoading && <Loader2 className="w-4 h-4 animate-spin text-[#CE4520]" />}
                  {addressVerified && <Check className="w-4 h-4 text-green-500" />}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">State</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-fira"
                placeholder="Auto-filled from pincode"
                value={formData.state}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">District</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-fira"
                placeholder="Auto-filled from pincode"
                value={formData.district}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">Taluk</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-fira"
                placeholder="Auto-filled from pincode"
                value={formData.taluk}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">Panchayat</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-fira"
                placeholder="Auto-filled from pincode"
                value={formData.panchayat}
                readOnly
              />
            </div>
          </div>

          {/* Address verification status */}
          {addressVerified && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <p className="text-green-600 text-sm font-fira">Address verified successfully</p>
              </div>
            </div>
          )}
        </div>

        {/* Identity Verification - Optional */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold font-fira">Identity Verification</h3>
          </div>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Aadhaar Card (Front)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {formData.aadhaarFront ? (
                  <div className="space-y-2">
                    <img 
                      src={URL.createObjectURL(formData.aadhaarFront)} 
                      alt="Aadhaar Front" 
                      className="w-full h-32 object-cover rounded"
                    />
                    <p className="text-sm text-green-600 font-fira">✓ Uploaded</p>
                    {uploadProgress.aadhaarFront > 0 && uploadProgress.aadhaarFront < 100 && (
                      <div className="w-full">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-[#CE4520] h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress.aadhaarFront}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{uploadProgress.aadhaarFront}% uploaded</p>
                      </div>
                    )}
                  </div>
                ) : userProfile?.aadhaarFrontURL ? (
                  <div className="space-y-2">
                    <img 
                      src={userProfile.aadhaarFrontURL} 
                      alt="Current Aadhaar Front" 
                      className="w-full h-32 object-cover rounded"
                    />
                    <p className="text-sm text-green-600 font-fira">✓ Already uploaded</p>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-fira">Click to upload front side</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData(prev => ({ ...prev, aadhaarFront: file }));
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Aadhaar Card (Back)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {formData.aadhaarBack ? (
                  <div className="space-y-2">
                    <img 
                      src={URL.createObjectURL(formData.aadhaarBack)} 
                      alt="Aadhaar Back" 
                      className="w-full h-32 object-cover rounded"
                    />
                    <p className="text-sm text-green-600 font-fira">✓ Uploaded</p>
                    {uploadProgress.aadhaarBack > 0 && uploadProgress.aadhaarBack < 100 && (
                      <div className="w-full">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-[#CE4520] h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress.aadhaarBack}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{uploadProgress.aadhaarBack}% uploaded</p>
                      </div>
                    )}
                  </div>
                ) : userProfile?.aadhaarBackURL ? (
                  <div className="space-y-2">
                    <img 
                      src={userProfile.aadhaarBackURL} 
                      alt="Current Aadhaar Back" 
                      className="w-full h-32 object-cover rounded"
                    />
                    <p className="text-sm text-green-600 font-fira">✓ Already uploaded</p>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-fira">Click to upload back side</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData(prev => ({ ...prev, aadhaarBack: file }));
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4 font-fira">
            Note: If you upload one side of Aadhaar, both sides are required. This is optional but recommended for verification.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm font-fira">{error}</p>
          </div>
        )}

        {/* Submit Button */}
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

        {/* Terms and Privacy */}
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

        {/* Footer */}
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
