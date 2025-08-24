"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import { ButtonLoader, PageLoader } from "@/components/ui/loaders";
import { useTranslation } from "@/lib/utils/i18n";
import { useServiceWorker } from "@/lib/utils/registerServiceWorker";
import Image from "next/image";
import { handleRedirect } from "@/lib/utils/navigation";

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
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  useServiceWorker();


  useEffect(() => {
    if (!authLoading && user) {
      handleRedirect(user, lang as string, router);
    }
  }, [user, authLoading, router, lang]);

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
        callback: () => {/* reCAPTCHA solved */},
        "expired-callback": () => {
          // reCAPTCHA expired
          setError(t("error_recaptcha_expired"));
        },
        // Add timeout and error handling
        "error-callback": () => {
          setError("RecaptchaVerifier error. Please try again.");
        }
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

  // Timeout wrapper for async operations
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        
        // Clear timeout if promise resolves first
        promise.finally(() => clearTimeout(timeoutId));
      })
    ]);
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
      
      // Add timeout wrapper to prevent hanging
      const result = await withTimeout(
        signInWithPhoneNumber(auth, formattedPhone, appVerifier),
        30000 // 30 second timeout
      );
      
      setConfirmationResult(result);
      setStep("otp");
      setCanResend(false);
      setResendTimer(30);
      // OTP sent successfully
    } catch (err: any) {
      console.error('OTP Send Error:', err);
      
      let errorMessage;
      if (err.message?.includes('timed out')) {
        errorMessage = "Request timed out. Please check your connection and try again.";
      } else if (err.code === "auth/invalid-phone-number") {
        errorMessage = t("error_invalid_phone");
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = err.message || t("error_generic");
      }
      
      setError(errorMessage);
      
      // Clean up recaptcha on error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (cleanupErr) {
          console.warn('RecaptchaVerifier cleanup error:', cleanupErr);
        } finally {
          window.recaptchaVerifier = undefined;
        }
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
    // Handle Enter key - verify OTP when all digits are filled
    if (e.key === 'Enter') {
      const otpValue = otp.join('');
      if (otpValue.length === 6 && !loading) {
        e.preventDefault();
        handleVerifyCode();
      }
      return;
    }
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
      // Add timeout wrapper to prevent hanging
      await withTimeout(
        confirmationResult.confirm(otpValue),
        20000 // 20 second timeout for OTP verification
      );
      // Phone number verified successfully
      
    } catch (err: any) {
      console.error('OTP Verification Error:', err);
      
      let errorMessage;
      if (err.message?.includes('timed out')) {
        errorMessage = "Verification timed out. Please try again.";
      } else if (err.code === "auth/invalid-verification-code") {
        errorMessage = t("error_invalid_otp");
      } else if (err.code === "auth/code-expired") {
        errorMessage = "OTP has expired. Please request a new one.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = err.message || t("error_generic");
      }
      
      setError(errorMessage);
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
      // Clean up existing recaptcha
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (cleanupErr) {
          console.warn('RecaptchaVerifier cleanup error during resend:', cleanupErr);
        } finally {
          window.recaptchaVerifier = undefined;
        }
      }

      setUpRecaptcha();
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const appVerifier = window.recaptchaVerifier!;
      
      // Add timeout wrapper for resend operation
      const result = await withTimeout(
        signInWithPhoneNumber(auth, formattedPhone, appVerifier),
        30000 // 30 second timeout
      );
      
      setConfirmationResult(result);
      // OTP resent successfully
    } catch (err: any) {
      console.error('OTP Resend Error:', err);
      
      let errorMessage;
      if (err.message?.includes('timed out')) {
        errorMessage = "Resend timed out. Please try again.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please wait before trying again.";
      } else {
        errorMessage = 'Failed to resend OTP. Please try again.';
      }
      
      setError(errorMessage);
      setCanResend(true);
      
      // Clean up recaptcha on error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (cleanupErr) {
          console.warn('RecaptchaVerifier cleanup error:', cleanupErr);
        } finally {
          window.recaptchaVerifier = undefined;
        }
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
    setCanResend(false);
    setResendTimer(30);
    
    // Clean up recaptcha properly
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (cleanupErr) {
        console.warn('RecaptchaVerifier cleanup error during number change:', cleanupErr);
      } finally {
        window.recaptchaVerifier = undefined;
      }
    }
  };

  if (authLoading || user) {
    return (
      <PageLoader 
        title="Loading..."
      />
    );
  }

  if (step === "phone") {
    return (
      <div className="bg-gray-50 p-6 w-full max-w-md">
        <div className="flex justify-center items-center mb-4">
          <div className="logo-container">
            <Image src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" alt="Logo" width={80} height={80} />
          </div>
        </div>
        <div className="mb-6 text-center"><div className="font-fira text-3xl font-semibold ">Namaskaram</div>
          <div className="font-fira pt-4 font-small text-sm">We&apos;ll check if you have an account, and help create one if you don&apos;t.</div></div>

        <form onSubmit={(e) => { e.preventDefault(); handleSendCode(); }} className="space-y-4">
          <Input
            type="tel"
            placeholder={"Phone"}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && phoneNumber.length >= 10 && !loading) {
                e.preventDefault();
                handleSendCode();
              }
            }}
            disabled={loading}
            className="text-lg font-fira"
            variant="large"
            maxLength={10}
            aria-label={t("phone_number_placeholder")}
            tabIndex={1}
          />
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-fira">{error}</p>
            </div>
          )}
          <ButtonLoader
            onClick={handleSendCode}
            disabled={phoneNumber.length < 10}
            loading={loading}
            className="w-full bg-primary-600 disabled:hover:bg-primary-600 hover:bg-primary-700 py-3 text-lg font-fira"
            size="lg"
            variant="primary"
            fullWidth
            aria-label={t("send_otp")}
            tabIndex={2}
          >
            Continue
          </ButtonLoader>
          <div className="hr-sect">or</div>
          <div className="text-center">
            <ButtonLoader
            onClick={() => router.push(`/${lang}/public/`)}
            size="md"
            className="text-info font-fira"
            variant="ghost"
            fullWidth
            aria-label={t("continue_as_guest")}
            tabIndex={3}
          >
            Continue as Guest
          </ButtonLoader>
            
          </div>
          <div id="recaptcha-container" className="hidden" />
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm font-fira">
            By clicking on continue, you accept our{" "}
            <a href="/terms" className="text-primary-600 hover:underline" target="_blank">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-primary-600 hover:underline" target="_blank">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    );
  }

  const isVerifyDisabled = otp.some(digit => !digit) || loading;

  return (
    <div className="bg-gray-50 p-6 w-full max-w-md">
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
            tabIndex={7}
            className="text-[#CE4520] font-fira text-sm hover:underline"
          >
            Change Number
          </button>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (!isVerifyDisabled) handleVerifyCode(); }} className="space-y-6">
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
                className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-opacity-20 transition-colors caret-transparent selection:bg-primary-600 selection:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResendCode}
                className="text-primary-600 font-fira text-sm hover:underline"
                tabIndex={8}
                type="button"
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

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm font-fira">{error}</p>
          </div>
        )}

        <ButtonLoader
          onClick={handleVerifyCode}
          disabled={otp.some(digit => !digit)}
          loading={loading}
          loadingText="Verifying..."
          className="w-full bg-primary-600 hover:bg-primary-700 py-3 text-lg font-fira"
          size="lg"
          variant="primary"
          fullWidth
          tabIndex={9}
        >
          Verify
        </ButtonLoader>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm font-fira text-gray-600">
          By clicking on verify, you accept our{" "}
          <a href="/terms" className="text-primary-600 hover:underline" target="_blank">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-primary-600 hover:underline" target="_blank">
            Privacy Policy
          </a>
        </p>
      </div>
      <div id="recaptcha-container" className="hidden" />
    </div>
  );
}
