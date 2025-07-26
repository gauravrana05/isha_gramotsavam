// src/app/[lang]/(auth)/complete-profile/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { uploadFile } from "@/lib/firebase/storage";
import { pincodeService } from "@/lib/services/pincodeService";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ImageUpload from "@/components/ui/ImageUpload";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { User, MapPin, CheckCircle } from "lucide-react";
import { useTranslation } from "@/lib/utils/i18n";

export default function CompleteProfilePage() {
  const { user, userProfile } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    pincode: "",
    village: "",
    panchayat: "",
    district: "",
    state: "",
    language: "en",
    aadharPhotoFront: null as File | null,
    aadharPhotoBack: null as File | null,
    profilePhoto: null as File | null,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [addressVerified, setAddressVerified] = useState(false);

  const [uploadProgress, setUploadProgress] = useState({
    aadharPhotoFront: 0,
    aadharPhotoBack: 0,
    profilePhoto: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push(`/${formData.language}/auth/login`);
    } else if (userProfile?.isProfileComplete) {
      // Navigate to appropriate dashboard based on role
      const role = userProfile.role || "player";
      switch (role) {
        case "admin":
          router.push(`/${formData.language}/admin/dashboard`);
          break;
        case "captain":
          router.push(`/${formData.language}/captain/dashboard`);
          break;
        case "volunteer_general":
        case "volunteer_technical":
          router.push(`/${formData.language}/volunteer/dashboard`);
          break;
        case "guest":
          router.push(`/${formData.language}/guest/dashboard`);
          break;
        default:
          router.push(`/${formData.language}/player/dashboard`);
      }
    }
  }, [user, userProfile, router, formData.language]);

  const handleInputChange = (field: keyof typeof formData, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Reset address verification if pincode changes
    if (field === 'pincode') {
      setAddressVerified(false);
      if (typeof value === 'string' && value.length < 6) {
        setFormData((prev) => ({
          ...prev,
          district: "",
          state: "",
          panchayat: "",
        }));
      }
    }
  };

  const handlePincodeBlur = async () => {
    if (formData.pincode.length === 6) {
      setPincodeLoading(true);
      setError("");
      try {
        const addressData = await pincodeService.getAddressByPincode(formData.pincode);
        if (addressData) {
          setFormData((prev) => ({
            ...prev,
            district: addressData.district,
            state: addressData.state,
            panchayat: addressData.panchayat || prev.panchayat,
          }));
          setAddressVerified(true);
        }
      } catch (err: any) {
        setError(err.message || t("error_invalid_pincode"));
        setAddressVerified(false);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate required fields
    if (!formData.name.trim()) {
      setError(t("error_name_required"));
      return;
    }
    // Ensure both Aadhaar photos are uploaded if one is
    if ((formData.aadharPhotoFront && !formData.aadharPhotoBack) ||
      (!formData.aadharPhotoFront && formData.aadharPhotoBack)) {
      setError(t("error_aadhar_both_sides")); // You'll need to add this translation key
      return;
    }
    if (!addressVerified && formData.pincode.length === 6) {
      setError(t("error_verify_pincode"));
      return;
    }

    setError("");
    setLoading(true);

    try {
      let aadharPhotoFrontUrl = "";
      let aadharPhotoBackUrl = "";
      let profilePhotoUrl = "";

      // Upload Front Aadhaar Photo
      if (formData.aadharPhotoFront) {
        aadharPhotoFrontUrl = await uploadFile(
          formData.aadharPhotoFront,
          `users/${user.uid}/aadhar_photo_front`,
          (progress) => setUploadProgress((p) => ({ ...p, aadharPhotoFront: progress }))
        );
      }

      // Upload Back Aadhaar Photo
      if (formData.aadharPhotoBack) {
        aadharPhotoBackUrl = await uploadFile(
          formData.aadharPhotoBack,
          `users/${user.uid}/aadhar_photo_back`,
          (progress) => setUploadProgress((p) => ({ ...p, aadharPhotoBack: progress }))
        );
      }

      // Upload Profile Photo
      if (formData.profilePhoto) {
        profilePhotoUrl = await uploadFile(
          formData.profilePhoto,
          `users/${user.uid}/profile_photo`,
          (progress) => setUploadProgress((p) => ({ ...p, profilePhoto: progress }))
        );
      }

      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        name: formData.name,
        pincode: formData.pincode,
        village: formData.village,
        panchayat: formData.panchayat,
        district: formData.district,
        state: formData.state,
        language: formData.language,
        aadharPhotoFrontUrl, // Updated field name
        aadharPhotoBackUrl,  // New field for back photo URL
        profilePhotoUrl,
        isProfileComplete: true,
        updatedAt: new Date().toISOString(),
      });

      // Navigate to appropriate dashboard based on role
      const role = userProfile?.role || "player";
      switch (role) {
        case "admin":
          router.push(`/${formData.language}/admin/dashboard`);
          break;
        case "captain":
          router.push(`/${formData.language}/captain/dashboard`);
          break;
        case "volunteer_general":
        case "volunteer_technical":
          router.push(`/${formData.language}/volunteer/dashboard`);
          break;
        case "guest":
          router.push(`/${formData.language}/guest/dashboard`);
          break;
        default:
          router.push(`/${formData.language}/player/dashboard`);
      }
    } catch (err: any) {
      console.error("Error completing profile:", err);
      setError(
        err.code === "storage/unauthorized"
          ? t("error_upload_failed")
          : err.message || t("error_generic")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 font-roboto mb-2">
            {t("complete_profile")}
          </h2>
          <p className="text-gray-600 font-roboto">{t("profile_description")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("name_label")}
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            required
            className="text-lg"
            variant="large"
            aria-label={t("name_label")}
          />
          <div className="relative">
            <Input
              label={t("pincode_label")}
              value={formData.pincode}
              onChange={(e) => handleInputChange("pincode", e.target.value)}
              onBlur={handlePincodeBlur}
              required
              type="number"
              maxLength={6}
              className="text-lg"
              variant="large"
              aria-label={t("pincode_label")}
            />
            {pincodeLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <LoadingSpinner size="small" />
              </div>
            )}
            {addressVerified && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            )}
          </div>
          <Input
            label={t("village_label")}
            value={formData.village}
            onChange={(e) => handleInputChange("village", e.target.value)}
            required
            className="text-lg"
            variant="large"
            aria-label={t("village_label")}
          />
          <Input
            label={t("panchayat_label")}
            value={formData.panchayat}
            onChange={(e) => handleInputChange("panchayat", e.target.value)}
            className="text-lg"
            variant="large"
            aria-label={t("panchayat_label")}
            disabled={!addressVerified && formData.pincode.length === 6}
          />
          <Input
            label={t("district_label")}
            value={formData.district}
            onChange={(e) => handleInputChange("district", e.target.value)}
            required
            className="text-lg"
            variant="large"
            aria-label={t("district_label")}
            disabled={addressVerified}
          />
          <Input
            label={t("state_label")}
            value={formData.state}
            onChange={(e) => handleInputChange("state", e.target.value)}
            required
            className="text-lg"
            variant="large"
            aria-label={t("state_label")}
            disabled={addressVerified}
          />
          <Select
            label={t("language_label")}
            value={formData.language}
            onChange={(e) => handleInputChange("language", e.target.value)}
            options={[
              { value: "en", label: "English" },
              { value: "ta", label: "Tamil" },
              { value: "hi", label: "Hindi" },
              { value: "ml", label: "Malayalam" },
              { value: "te", label: "Telugu" },
              { value: "kn", label: "Kannada" },
              { value: "or", label: "Odia" },
            ]}
            variant="large"
            className="text-lg"
            aria-label={t("language_label")}
          />
          <ImageUpload
            label={t("aadhar_photo_front_label")} // Updated label
            onChange={(file) => handleInputChange("aadharPhotoFront", file)} // Updated field name
            progress={uploadProgress.aadharPhotoFront} // Updated progress key
            accept="image/*"
            className="text-lg"
            aria-label={t("aadhar_photo_front_label")} // Updated aria-label
            required
          />
          <ImageUpload
            label={t("aadhar_photo_back_label")} // New label for back
            onChange={(file) => handleInputChange("aadharPhotoBack", file)} // New field name for back
            progress={uploadProgress.aadharPhotoBack} // New progress key for back
            accept="image/*"
            className="text-lg"
            aria-label={t("aadhar_photo_back_label")} // New aria-label for back
            required={(formData.aadharPhotoFront !== null)} // Make required if front is uploaded
          />
          <ImageUpload
            label={t("profile_photo_label")}
            onChange={(file) => handleInputChange("profilePhoto", file)}
            progress={uploadProgress.profilePhoto}
            accept="image/*"
            className="text-lg"
            aria-label={t("profile_photo_label")}
          />
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-roboto">{error}</p>
            </div>
          )}
          {addressVerified && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <p className="text-green-600 text-sm font-roboto">
                  {t("address_verified")}
                </p>
              </div>
            </div>
          )}
          <Button
            type="submit"
            disabled={loading || (formData.pincode.length === 6 && !addressVerified)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg font-medium ripple"
            variant="large"
            aria-label={t("complete_profile")}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <LoadingSpinner size="small" />
                <span>{t("loading")}</span>
              </div>
            ) : (
              t("complete_profile")
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}