"use client";

import { ReactNode } from "react";
// 1. Import the library's ErrorBoundary and give it an alias to avoid naming conflicts
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from "react-error-boundary";
import Button from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/utils/i18n";

// 2. Create a separate component for your Fallback UI
// It receives `error` and `resetErrorBoundary` as props.
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 safe-area-inset-top safe-area-inset-bottom">
      <div className="bg-white rounded-2xl shadow-lg p-6 elevation-2 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-fira mb-4">
          {t("error_generic")}
        </h2>
        <p className="text-gray-600 font-fira mb-6">{error.message || t("error_generic")}</p>
        <Button
          onClick={resetErrorBoundary}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 text-lg font-medium ripple"
          size="lg"
          aria-label={t("try_again")}
        >
          {t("try_again")}
        </Button>
      </div>
    </div>
  );
}


// 3. Your main ErrorBoundary component now uses the library's component
//    and provides your custom fallback to it.
interface ErrorBoundaryProps {
  children: ReactNode;
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
}