"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslation } from "@/lib/utils/i18n";
import { handleRedirect } from "@/lib/utils/navigation";

export default function Home() {
  const { lang } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading) {
      handleRedirect(user, lang as string, router);
    }
  }, [user, loading, router, lang]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="large" />
        <p className="text-gray-600 font-roboto">{t("loading")}</p>
      </div>
    </div>
  );
}
