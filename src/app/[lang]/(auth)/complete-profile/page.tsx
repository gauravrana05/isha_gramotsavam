"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { documentUploadService } from "@/lib/services/documentUploadService";
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
  const [uploadProgress, setUploadProgress] = useState({
    profile: 0,
    aadhaarFront: 0,
    aadhaarBack: 0,
  });
  const [districts, setDistricts] = useState<string[]>([]);
  const [taluks, setTaluks] = useState<string[]>([]);
  const [panchayats, setPanchayats] = useState<string[]>([]);

  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();


  const phoneNumber = user?.phoneNumber?.replace(/^\+91/, '') || '';

  // Clean Firestore data by removing undefined values and converting dates
  const cleanFirestoreData = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(cleanFirestoreData);
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = cleanFirestoreData(value);
        }
      }
      return cleaned;
    }
    return obj;
  };

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

    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        whatsappNumber: userProfile.whatsappNumber || phoneNumber,
        dob: userProfile.dob || "",
        gender: userProfile.gender || "",
        pincode: userProfile.pincode || "",
        state: userProfile.state || "",
        district: userProfile.district || "",
        taluk: userProfile.taluk || "",
        panchayat: userProfile.panchayat || "",
        instagramHandle: userProfile.instagramHandle || "",
        preferredLanguage: userProfile.preferredLanguage || ""
      }));

      if (userProfile.whatsappNumber && userProfile.whatsappNumber === phoneNumber) {
        setIsWhatsAppSame(true);
      } else if (userProfile.whatsappNumber && userProfile.whatsappNumber !== phoneNumber) {
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
    if (!formData.pincode || formData.pincode.length !== 6) {
      setError("Please enter your 6-digit pincode");
      return;
    }
    if (!addressCaptured) {
      setError("Please complete the address selection by choosing a panchayat");
      return;
    }
    if ((formData.aadhaarFront && !formData.aadhaarBack) || (!formData.aadhaarFront && formData.aadhaarBack)) {
      setError("Please upload both front and back sides of Aadhaar card");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Check if profile is complete (all required fields + documents)
      const hasAllRequiredFields = formData.firstName.trim() && 
        formData.lastName.trim() && 
        formData.whatsappNumber.trim() && 
        formData.dob && 
        formData.gender && 
        formData.pincode && 
        addressCaptured;
      
      const hasAllDocuments = formData.profilePhoto && 
        formData.aadhaarFront && 
        formData.aadhaarBack;
      
      const isComplete = hasAllRequiredFields && hasAllDocuments;

      const profileData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        whatsappNumber: formData.whatsappNumber,
        dob: formData.dob,
        gender: formData.gender,
        pincode: formData.pincode,
        state: formData.state,
        district: formData.district,
        taluk: formData.taluk,
        panchayat: formData.panchayat,
        instagramHandle: formData.instagramHandle,
        preferredLanguage: formData.preferredLanguage,
        isProfileComplete: isComplete,
        updatedAt: new Date().toISOString(),
      };

      // Initialize documents structure with new simplified schema
      const documents: any = {
        profilePhoto: {
          storagePath: formData.profilePhoto ? documentUploadService.getStoragePath(user.uid, 'profilePhoto') : "",
          verified: false,
          uploadedAt: null,
          uploadedBy: null
        },
        aadhaarFront: {
          storagePath: formData.aadhaarFront ? documentUploadService.getStoragePath(user.uid, 'aadhaarFront') : "",
          verified: false,
          uploadedAt: null,
          uploadedBy: null
        },
        aadhaarBack: {
          storagePath: formData.aadhaarBack ? documentUploadService.getStoragePath(user.uid, 'aadhaarBack') : "",
          verified: false,
          uploadedAt: null,
          uploadedBy: null
        }
      };

      // Upload profile photo if provided
      if (formData.profilePhoto) {
        const profilePhotoURL = await documentUploadService.uploadProfilePhoto(
          user.uid,
          formData.profilePhoto,
          (progress) => setUploadProgress(prev => ({ ...prev, profile: progress.progress }))
        );
        documents.profilePhoto.url = profilePhotoURL;
        documents.profilePhoto.uploadedAt = new Date();
        documents.profilePhoto.uploadedBy = user.uid;
      }

      // Upload Aadhaar front if provided
      if (formData.aadhaarFront) {
        const aadhaarFrontURL = await documentUploadService.uploadAadhaarFront(
          user.uid,
          formData.aadhaarFront,
          (progress) => setUploadProgress(prev => ({ ...prev, aadhaarFront: progress.progress }))
        );
        documents.aadhaarFront.url = aadhaarFrontURL;
        documents.aadhaarFront.uploadedAt = new Date();
        documents.aadhaarFront.uploadedBy = user.uid;
      }

      // Upload Aadhaar back if provided
      if (formData.aadhaarBack) {
        const aadhaarBackURL = await documentUploadService.uploadAadhaarBack(
          user.uid,
          formData.aadhaarBack,
          (progress) => setUploadProgress(prev => ({ ...prev, aadhaarBack: progress.progress }))
        );
        documents.aadhaarBack.url = aadhaarBackURL;
        documents.aadhaarBack.uploadedAt = new Date();
        documents.aadhaarBack.uploadedBy = user.uid;
      }

      // Add the structured documents to profileData
      profileData.documents = documents;

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, cleanFirestoreData(profileData));

      const role = userProfile?.role || "public";
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
                ) : userProfile?.documents?.profilePhoto?.storagePath ? (
                  <img 
                    src={`/api/storage/${userProfile.documents.profilePhoto.storagePath}`} 
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
                {userProfile?.documents?.profilePhoto?.storagePath ? 'Change Profile Photo' : 'Upload Profile Photo'}
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
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                value={formData.preferredLanguage}
                onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
              >
                <option value="" disabled>Select Preferred Language</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
                <option value="or">Odia</option>
                <option value="bn">Bengali</option>
                <option value="gu">Gujarati</option>
                <option value="mr">Marathi</option>
                <option value="pa">Punjabi</option>
                <option value="as">Assamese</option>
              </select>
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
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                value={formData.district}
                onChange={(e) => {
                  e.preventDefault();
                  handleInputChange('district', e.target.value);
                }}
                disabled={!formData.state || !districts.length}
              >
                <option value="" disabled>Select District</option>
                {districts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">Taluk</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                value={formData.taluk}
                onChange={(e) => {
                  e.preventDefault();
                  handleInputChange('taluk', e.target.value);
                }}
                disabled={!formData.district || !taluks.length}
              >
                <option value="" disabled>Select Taluk</option>
                {taluks.map(taluk => (
                  <option key={taluk} value={taluk}>{taluk}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">Panchayat</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                value={formData.panchayat}
                onChange={(e) => {
                  e.preventDefault();
                  handleInputChange('panchayat', e.target.value);
                }}
                disabled={!formData.taluk || !panchayats.length}
              >
                <option value="" disabled>Select Panchayat</option>
                {panchayats.map(panchayat => (
                  <option key={panchayat} value={panchayat}>{panchayat}</option>
                ))}
              </select>
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
                ) : userProfile?.documents?.aadhaarFront?.storagePath ? (
                  <div className="space-y-2">
                    <img 
                      src={`/api/storage/${userProfile.documents.aadhaarFront.storagePath}`} 
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
                ) : userProfile?.documents?.aadhaarBack?.storagePath ? (
                  <div className="space-y-2">
                    <img 
                      src={`/api/storage/${userProfile.documents.aadhaarBack.storagePath}`} 
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