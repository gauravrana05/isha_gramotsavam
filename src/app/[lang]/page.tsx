"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/ui/loaders";
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
    <PageLoader 
      title="Loading Isha Gramotsavam..."
      subtitle="Redirecting to your dashboard..."
      variant="brand"
      size="lg"
    />
  );
}
