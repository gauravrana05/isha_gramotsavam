"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "@/lib/utils/i18n";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/common/ThemeToggle";

export default function ProfilePage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { lang } = useParams();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) {
      router.push(`/${lang}/auth/login`);
    }
  }, [user, router, lang]);

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 safe-area-inset-top safe-area-inset-bottom">
      <div className="bg-white rounded-2xl shadow-lg p-6 elevation-2 w-full max-w-md">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-roboto mb-4">
          {t("edit_profile")}
        </h2>
        <p className="text-gray-600 font-roboto mb-6">
          {t("profile_description")}
        </p>
        <p className="text-gray-600 font-roboto mb-4">
          Role: {userProfile.role || "player"}
        </p>
        <Button
          onClick={() => router.push(`/${lang}/auth/logout`)}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg font-medium ripple"
          variant="large"
          aria-label={t("logout")}
        >
          {t("logout")}
        </Button>
      </div>
    </div>
  );
}