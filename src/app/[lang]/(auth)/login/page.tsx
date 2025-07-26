"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Phone, MessageSquare, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/utils/i18n";
import { useServiceWorker } from "@/lib/utils/registerServiceWorker";
import ThemeToggle from "@/components/common/ThemeToggle";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile } = useAuth();
  const { t } = useTranslation();
  useServiceWorker();

  console.log("Rendering [lang]/(auth)/login/page.tsx for", lang);

  useEffect(() => {
    if (user && userProfile) {
      if (!userProfile.isProfileComplete) {
        console.log("Redirecting to", `/${lang}/complete-profile`);
        router.push(`/${lang}/complete-profile`);
      } else {
        const role = userProfile.role || "player";
        console.log("User role:", role, "Redirecting to", `/${lang}/${role}/dashboard`);
        switch (role) {
          case "admin":
            router.push(`/${lang}/admin/dashboard`);
            break;
          case "captain":
            router.push(`/${lang}/captain/dashboard`);
            break;
          case "volunteer_general":
            router.push(`/${lang}/volunteer/dashboard`);
            break;
          case "volunteer_technical":
            router.push(`/${lang}/volunteer/dashboard`);
            break;
          case "guest":
            router.push(`/${lang}/guest/dashboard`);
            break;
          default:
            router.push(`/${lang}/player/dashboard`);
        }
      }
    }
  }, [user, userProfile, router, lang]);

  const setUpRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => console.log("reCAPTCHA solved"),
        "expired-callback": () => {
          console.log("reCAPTCHA expired");
          setError(t("error_recaptcha_expired"));
        },
      });
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `+91${digits}`;
    } else if (digits.length === 12 && digits.startsWith("91")) {
      return `+${digits}`;
    } else if (digits.length === 13 && digits.startsWith("+91")) {
      return digits;
    }
    return phone;
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError(t("error_no_phone"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      setUpRecaptcha();
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const appVerifier = window.recaptchaVerifier!;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setStep("otp");
      console.log("OTP sent successfully");
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      setError(
        err.code === "auth/invalid-phone-number"
          ? t("error_invalid_phone")
          : err.message || t("error_generic")
      );
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!otp.trim()) {
      setError(t("error_no_otp"));
      return;
    }
    if (!confirmationResult) {
      setError(t("error_no_code_sent"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      console.log("Phone number verified successfully");
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      setError(
        err.code === "auth/invalid-verification-code"
          ? t("error_invalid_otp")
          : err.message || t("error_generic")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setOtp("");
    setConfirmationResult(null);
    setStep("phone");
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = undefined;
    }
  };

  if (step === "phone") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-roboto mb-2">
              {t("welcome")}
            </h2>
            <p className="text-gray-600 font-roboto">{t("phone_number_placeholder")}</p>
          </div>
          <div className="space-y-4">
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
              onClick={handleSendCode}
              disabled={loading || phoneNumber.length < 10}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg font-medium"
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
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 font-roboto">{t("terms_privacy")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
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
            placeholder={t("otp_placeholder_text")}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={loading}
            className="text-center text-xl tracking-widest"
            variant="large"
            maxLength={6}
            aria-label={t("otp_placeholder_text")}
          />
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-roboto">{error}</p>
            </div>
          )}
          <Button
            onClick={handleVerifyCode}
            disabled={loading || otp.length < 6}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-medium"
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
            className="w-full bg-transparent border border-gray-300 text-gray-700 py-3 text-lg font-medium hover:bg-gray-100"
            variant="large"
            aria-label={t("resend_otp")}
          >
            <ArrowLeft className="w-5 h-5 inline mr-2" />
            {t("resend_otp")}
          </Button>
        </div>
      </div>
    </div>
  );
}