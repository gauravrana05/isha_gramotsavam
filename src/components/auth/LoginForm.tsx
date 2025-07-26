import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Phone } from "lucide-react";
import { useTranslation } from "@/lib/utils/i18n";

interface LoginFormProps {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  onSendOtp: () => void;
  loading: boolean;
  error: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  phoneNumber,
  setPhoneNumber,
  onSendOtp,
  loading,
  error,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-roboto mb-2">
          {t("welcome")}
        </h2>
        <p className="text-gray-600 font-roboto">{t("phone_number_placeholder")}</p>
      </div>
      <Input
        type="tel"
        placeholder={t("phone_number_placeholder")}
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        disabled={loading}
        className="text-center text-lg"
        variant="large"
        maxLength={13}
        aria-label={t("phone_number_placeholder")}
      />
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm font-roboto">{error}</p>
        </div>
      )}
      <Button
        onClick={onSendOtp}
        disabled={loading || phoneNumber.length < 10}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg font-medium ripple"
        variant="large"
        aria-label={t("send_otp")}
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <LoadingSpinner size="small" />
            <span>{t("loading")}</span>
          </div>
        ) : (
          t("send_otp")
        )}
      </Button>
      <div id="recaptcha-container" className="hidden" />
    </div>
  );
};