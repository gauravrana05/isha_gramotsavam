"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ButtonLoader, PageLoader } from "@/components/ui/loaders";
import { useTranslation } from "@/lib/utils/i18n";
import { useServiceWorker } from "@/lib/utils/registerServiceWorker";
import Image from "next/image";
import { handleRedirect } from "@/lib/utils/navigation";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { lang } = useParams();
  const { user, loading: authLoading, login } = useAuth();
  const { t } = useTranslation();
  useServiceWorker();

  useEffect(() => {
    if (!authLoading && user) {
      handleRedirect(user, lang as string, router);
    }
  }, [user, authLoading, router, lang]);

  const handleIshaLogin = async () => {
    setError("");
    setLoading(true);
    
    try {
      await login();
      // The login function will redirect to Isha SSO
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <PageLoader 
        title="Loading..."
      />
    );
  }

  return (
    <div className="bg-gray-50 p-6 w-full max-w-md">
      <div className="flex justify-center items-center mb-4">
        <div className="logo-container">
          <Image src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" alt="Logo" width={80} height={80} />
        </div>
      </div>
      <div className="mb-6 text-center">
        <div className="font-fira text-3xl font-semibold">Namaskaram</div>
        <div className="font-fira pt-4 font-small text-sm">
          Welcome to Isha Gramotsavam! Please login to continue.
        </div>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm font-fira">{error}</p>
          </div>
        )}
        
        <ButtonLoader
          onClick={handleIshaLogin}
          loading={loading}
          className="w-full bg-primary-600 disabled:hover:bg-primary-600 hover:bg-primary-700 py-3 text-lg font-fira"
          size="lg"
          variant="primary"
          fullWidth
          aria-label="Continue with Isha SSO"
          tabIndex={1}
        >
          Continue with Isha SSO
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
            tabIndex={2}
          >
            Continue as Guest
          </ButtonLoader>
        </div>
      </div>
      
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