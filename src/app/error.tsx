"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/utils/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error("Server-side error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 safe-area-inset-top safe-area-inset-bottom">
      <div className="bg-white rounded-2xl shadow-lg p-6 elevation-2 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-roboto mb-4">
          {t("error_generic")}
        </h2>
        <p className="text-gray-600 font-roboto mb-6">{error.message || t("error_generic")}</p>
        <Button
          onClick={reset}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg font-medium ripple"
          variant="large"
          aria-label={t("try_again")}
        >
          {t("try_again")}
        </Button>
      </div>
    </div>
  );
}