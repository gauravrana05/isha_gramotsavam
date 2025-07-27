"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslation } from "@/lib/utils/i18n";
import { useServiceWorker } from "@/lib/utils/registerServiceWorker";
import Image from "next/image";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile } = useAuth();
  const { t } = useTranslation();
  useServiceWorker();


  useEffect(() => {
    if (user && userProfile) {
      if (!userProfile.isProfileComplete) {
        router.push(`/${lang}/complete-profile`);
      } else {
        const role = userProfile.role || "public";
        console.log("User role:", role, "Redirecting to", `/${lang}/${role}/dashboard`);
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
            router.push(`/${lang}/volunteer/dashboard`);
            break;
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
    }
  }, [user, userProfile, router, lang]);

  // Timer for resend OTP
  useEffect(() => {
    if (step === "otp" && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
  }, [resendTimer, step]);

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
      setCanResend(false);
      setResendTimer(30);
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

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = digitsOnly;
    setOtp(newOtp);

    // Auto focus next input
    if (digitsOnly && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Select all text when input is focused (for better UX when replacing)
    inputRefs.current[index]?.select();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle tab navigation
    else if (e.key === 'Tab' && !e.shiftKey && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
    // Handle shift+tab navigation
    else if (e.key === 'Tab' && e.shiftKey && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent, startIndex: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, ''); // Only digits

    if (pastedData.length > 0) {
      const newOtp = [...otp];
      const remainingSlots = 6 - startIndex;
      const digitsToPaste = Math.min(pastedData.length, remainingSlots);

      // Fill from the current index onwards
      for (let i = 0; i < digitsToPaste; i++) {
        newOtp[startIndex + i] = pastedData[i];
      }

      setOtp(newOtp);

      // Focus the next empty input or the last filled input
      const nextFocusIndex = Math.min(startIndex + digitsToPaste, 5);
      inputRefs.current[nextFocusIndex]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }
    if (!confirmationResult) {
      setError(t("error_no_code_sent"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await confirmationResult.confirm(otpValue);
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
    if (!canResend) return;

    setOtp(['', '', '', '', '', '']);
    setConfirmationResult(null);
    setCanResend(false);
    setResendTimer(30);
    setError('');
    setLoading(true);

    try {
      // Clear existing recaptcha first
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }

      // Set up fresh recaptcha
      setUpRecaptcha();
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const appVerifier = window.recaptchaVerifier!;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      console.log("OTP resent successfully");
    } catch (err: any) {
      console.error("Error resending OTP:", err);
      setError('Failed to resend OTP. Please try again.');
      setCanResend(true);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setOtp(['', '', '', '', '', '']);
    setConfirmationResult(null);
    setStep("phone");
    setError('');
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = undefined;
    }
  };

  if (step === "phone") {
    return (
      <div className="bg-isha p-6 w-full max-w-md">
        <div className="flex justify-center items-center mb-4">
          <div className="logo-container">
            <Image src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" alt="Logo" width={80} height={80} />
          </div>
        </div>
        <div className="mb-6 text-center"><div className="font-fira text-3xl font-semibold ">Namaskaram</div>
          <div className="font-fira pt-4 font-small text-sm">We'll check if you have an account, and help create one if you don't.</div></div>

        <div className="space-y-4">
          <Input
            type="tel"
            placeholder={"Phone"}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={loading}
            className="text-lg font-fira"
            variant="large"
            maxLength={10}
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
            className="w-full bg-[#CE4520] disabled:hover:bg-[#CE4520] hover:bg-[#1565C0] text-white py-3 text-lg font-firo"
            size="large"
            aria-label={t("send_otp")}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <LoadingSpinner size="small" />
              </div>
            ) : <div className="flex items-center justify-center space-x-2">
              Continue
            </div>}
          </Button>
          <div className="hr-sect">or</div>
          <div className="text-center">
            <button
              onClick={() => router.push(`/${lang}/public/`)}
              className="text-[#1976D2] font-fira other-login-button text-sm"
              aria-label={t("continue_as_guest")}
            >
              Continue as Guest
            </button>
          </div>
          <div id="recaptcha-container" className="hidden" />
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm font-fira">
            By clicking on continue, you accept our{" "}
            <a href="/terms" className="text-[#CE4520] hover:underline" target="_blank">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-[#CE4520] hover:underline" target="_blank">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    );
  }

  const isVerifyDisabled = otp.some(digit => !digit) || loading;

  return (
    <div className="bg-isha p-6 w-full max-w-md">
      <div className="flex justify-center items-center mb-4">
        <div className="logo-container">
          <Image
            src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg"
            alt="Logo"
            width={80}
            height={80}
          />
        </div>
      </div>

      <div className="mb-6 text-center">
        <div className="font-fira text-2xl font-semibold mb-2">
          Verify your Mobile Number
        </div>
        <div className="font-fira text-sm text-gray-600 mb-3">
          An OTP (One Time Password) has been sent to {formatPhoneNumber(phoneNumber)}
        </div>
        <div className="text-center">
          <button
            onClick={handleChangeNumber}
            tabIndex={9}
            className="text-[#CE4520] font-fira text-sm hover:underline"
          >
            Change Number
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* OTP Input Container */}
        <div className="mb-4">
          <div className="flex justify-center items-center space-x-2 mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                aria-label={`Please enter OTP character ${index + 1}`}
                className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-[#CE4520] focus:outline-none focus:ring-2 focus:ring-[#CE4520] focus:ring-opacity-20 transition-colors caret-transparent selection:bg-[#CE4520] selection:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onFocus={() => handleFocus(index)}
                onPaste={(e) => handlePaste(e, index)}
                maxLength={1}
                disabled={loading}
                tabIndex={index + 1}
              />
            ))}
          </div>

          {/* Resend OTP */}
          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResendCode}
                className="text-[#CE4520] font-fira text-sm hover:underline"
              >
                Resend OTP
              </button>
            ) : (
              <span className="text-gray-500 font-fira text-sm">
                Resend OTP in {resendTimer}s
              </span>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm font-fira">{error}</p>
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={handleVerifyCode}
          disabled={isVerifyDisabled}
          tabIndex={7}
          className={`w-full py-3 text-lg font-fira rounded-lg transition-colors ${isVerifyDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#CE4520] hover:bg-[#1565C0] text-white'
            }`}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Verifying...</span>
            </div>
          ) : (
            'Verify'
          )}
        </button>
      </div>

      {/* Terms and Privacy */}
      <div className="mt-6 text-center">
        <p className="text-sm font-fira text-gray-600">
          By clicking on verify, you accept our{" "}
          <a href="/terms" className="text-[#CE4520] hover:underline" target="_blank">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-[#CE4520] hover:underline" target="_blank">
            Privacy Policy
          </a>
        </p>
      </div>
      <div id="recaptcha-container" className="hidden" />
    </div>
  );
}