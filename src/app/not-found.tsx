"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 safe-area-inset-top safe-area-inset-bottom">
      <div className="bg-white rounded-2xl shadow-lg p-6 elevation-2 w-full max-w-md text-center">
        
        <h1 className="text-4xl font-bold text-gray-900 font-roboto mb-4">404</h1>
        <p className="text-gray-600 font-roboto mb-6">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Button
          onClick={() => router.push("/en")}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg font-medium ripple"
          variant="large"
          aria-label="Go Back Home"
        >
          Go Back Home
        </Button>
      </div>
    </div>
  );
}