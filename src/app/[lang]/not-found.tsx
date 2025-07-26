"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/utils/i18n";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/common/ThemeToggle";

export default function NotFound() {
  const { lang } = useParams();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 safe-area-inset-top safe-area-inset-bottom">
      <div className="bg-white rounded-2xl shadow-lg p-6 elevation-2 w-full max-w-md text-center">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 font-roboto mb-4">404</h1>
        <p className="text-gray-600 font-roboto mb-6">
          {t("not_found_message")}
        </p>
        <Button
          onClick={() => router.push(`/${lang || "en"}`)}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg font-medium ripple"
          variant="large"
          aria-label={t("go_back_home")}
        >
          {t("go_back_home")}
        </Button>
      </div>
    </div>
  );
}