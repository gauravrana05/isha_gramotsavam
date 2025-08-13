"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Server-side error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 safe-area-inset-top safe-area-inset-bottom">
      <div className="bg-white rounded-2xl shadow-lg p-6 elevation-2 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-fira mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 font-fira mb-6">{error.message || "An unexpected error occurred"}</p>
        <Button
          onClick={reset}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 text-lg font-medium ripple"
          variant="primary"
          size="lg"
          aria-label="Try again"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}