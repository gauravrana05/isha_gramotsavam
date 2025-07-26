import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ImageUpload from "@/components/ui/ImageUpload";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { User } from "lucide-react";
import { useTranslation } from "@/lib/utils/i18n";

interface ProfileSetupProps {
  formData: {
    name: string;
    village: string;
    panchayat: string;
    district: string;
    state: string;
    language: string;
    aadharFront: File | null;
    aadharBack: File | null;
    profilePhoto: File | null;
  };
  setFormData: (data: any) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  formData,
  setFormData,
  onSubmit,
  loading,
  error,
}) => {
  const { t } = useTranslation();
  const [uploadProgress, setUploadProgress] = useState({
    aadharFront: 0,
    aadharBack: 0,
    profilePhoto: 0,
  });

  const handleInputChange = (field: keyof typeof formData, value: string | File | null) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-roboto mb-2">
          {t("complete_profile")}
        </h2>
        <p className="text-gray-600 font-roboto">{t("profile_description")}</p>
      </div>
      <Input
        label={t("name_label")}
        value={formData.name}
        onChange={(e) => handleInputChange("name", e.target.value)}
        required
        className="text-lg"
        variant="large"
        aria-label={t("name_label")}
      />
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
        required
        className="text-lg"
        variant="large"
        aria-label={t("panchayat_label")}
      />
      <Input
        label={t("district_label")}
        value={formData.district}
        onChange={(e) => handleInputChange("district", e.target.value)}
        required
        className="text-lg"
        variant="large"
        aria-label={t("district_label")}
      />
      <Input
        label={t("state_label")}
        value={formData.state}
        onChange={(e) => handleInputChange("state", e.target.value)}
        required
        className="text-lg"
        variant="large"
        aria-label={t("state_label")}
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
        label={t("aadhar_front_label")}
        onChange={(file) => handleInputChange("aadharFront", file)}
        progress={uploadProgress.aadharFront}
        accept="image/*"
        className="text-lg"
        aria-label={t("aadhar_front_label")}
      />
      <ImageUpload
        label={t("aadhar_back_label")}
        onChange={(file) => handleInputChange("aadharBack", file)}
        progress={uploadProgress.aadharBack}
        accept="image/*"
        className="text-lg"
        aria-label={t("aadhar_back_label")}
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
      <Button
        onClick={onSubmit}
        disabled={loading}
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
    </div>
  );
};