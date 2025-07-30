import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { useTranslation } from "@/lib/utils/i18n";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

export const usePhoneAuth = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();

  const setUpRecaptcha = () => {
    // Always clear the old verifier to ensure a fresh one is created.
    // This prevents errors from using an expired reCAPTCHA token.
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = undefined;
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
        console.log("reCAPTCHA solved");
      },
      "expired-callback": () => {
        // Response expired. Ask user to solve reCAPTCHA again.
        console.log("reCAPTCHA expired");
        setError(t("error_recaptcha_expired"));
      },
    });
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

  const sendOtp = async (phone: string) => {
    if (!phone.trim()) {
      setError(t("error_no_phone"));
      return false;
    }
    setError("");
    setLoading(true);
    try {
      setUpRecaptcha();
      const formattedPhone = formatPhoneNumber(phone);
      const appVerifier = window.recaptchaVerifier!;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setPhoneNumber(formattedPhone);
      console.log("OTP sent successfully");
      return true;
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
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (otp: string) => {
    if (!otp.trim()) {
      setError(t("error_no_otp"));
      return false;
    }
    if (!confirmationResult) {
      setError(t("error_no_code_sent"));
      return false;
    }
    setError("");
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      console.log("Phone number verified successfully");
      return true;
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      setError(
        err.code === "auth/invalid-verification-code"
          ? t("error_invalid_otp")
          : err.message || t("error_generic")
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setError("");
    setConfirmationResult(null);
    // The setUpRecaptcha function now handles clearing the verifier,
    // so we can just call sendOtp directly.
    return sendOtp(phoneNumber);
  };

  return {
    phoneNumber,
    setPhoneNumber,
    sendOtp,
    verifyOtp,
    resendOtp,
    error,
    setError,
    loading,
  };
};