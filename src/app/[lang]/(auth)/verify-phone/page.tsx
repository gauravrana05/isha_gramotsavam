"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { usePhoneAuth } from "@/hooks/auth/usePhoneAuth";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/utils/i18n";

export default function VerifyPhonePage() {
  const { user, userProfile } = useAuth();
  const { verifyOtp, resendOtp, error, setError, loading, phoneNumber } = usePhoneAuth();
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    if (!phoneNumber) {
      router.push("/auth/login");
    } else if (user && userProfile) {
      router.push(userProfile.isProfileComplete ? "/dashboard" : "/auth/complete-profile");
    }
  }, [user, userProfile, phoneNumber, router]);

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError(t("error_no_otp"));
      return;
    }
    const success = await verifyOtp(otp);
    if (success) {
      router.push(userProfile?.isProfileComplete ? "/dashboard" : "/auth/complete-profile");
    }
  };

  const handleResendCode = async () => {
    setOtp("");
    setError("");
    await resendOtp();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 elevation-2">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-roboto mb-2">
          {t("verify_otp")}
        </h2>
        <p className="text-gray-600 font-roboto">{t("otp_placeholder")}</p>
        <p className="text-orange-600 font-medium font-roboto">{phoneNumber}</p>
      </div>
      <div className="space-y-4">
        <Input
          type="number"
          placeholder={t("otp_placeholder")}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          disabled={loading}
          className="text-center text-xl tracking-widest"
          variant="large"
          maxLength={6}
          aria-label={t("otp_placeholder")}
        />
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm font-roboto">{error}</p>
          </div>
        )}
        <Button
          onClick={handleVerifyOtp}
          disabled={loading || otp.length < 6}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-medium ripple"
          variant="large"
          aria-label={t("verify_otp")}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="small" />
              <span>{t("loading")}</span>
            </div>
          ) : (
            t("verify_otp")
          )}
        </Button>
        <Button
          onClick={handleResendCode}
          className="w-full bg-transparent border border-gray-300 text-gray-700 py-3 text-lg font-medium hover:bg-gray-100 ripple"
          variant="large"
          aria-label={t("resend_otp")}
        >
          <ArrowLeft className="w-5 h-5 inline mr-2" />
          {t("resend_otp")}
        </Button>
      </div>
    </div>
  );
}