"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslation } from "@/lib/utils/i18n";
import ThemeToggle from "@/components/common/ThemeToggle";

export default function Home() {
  const { lang } = useParams();
  console.log("Rendering [lang]/page.tsx for", lang);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profileComplete, setProfileComplete] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log("No user, redirecting to", `/${lang}/login`);
        router.push(`/${lang}/login`);
      } else {
        const checkProfileCompletion = async () => {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().profileComplete) {
              setProfileComplete(true);
              const role = userDoc.data().role || "player";
              console.log("User role:", role, "Redirecting to", `/${lang}/${role}/dashboard`);
              switch (role) {
                case "admin":
                  router.push(`/${lang}/admin/dashboard`);
                  break;
                case "captain":
                  router.push(`/${lang}/captain/dashboard`);
                  break;
                case "volunteer_general":
                  router.push(`/${lang}/volunteer/dashboard`);
                  break;
                case "volunteer_technical":
                  router.push(`/${lang}/volunteer/dashboard`);
                  break;
                case "guest":
                  router.push(`/${lang}/guest/dashboard`);
                  break;
                default:
                  router.push(`/${lang}/player/dashboard`);
              }
            } else {
              console.log("Profile incomplete, redirecting to", `/${lang}/complete-profile`);
              router.push(`/${lang}/complete-profile`);
            }
          } catch (error) {
            console.error("Error checking profile:", error);
            router.push(`/${lang}/login`);
          }
        };
        checkProfileCompletion();
      }
    }
  }, [user, loading, router, lang]);

  if (loading || !user || !profileComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="large" />
          <p className="text-gray-600 font-roboto">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md text-center">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 font-roboto mb-4">
          {t("welcome")}
        </h1>
        <p className="text-gray-600 font-roboto mb-6">
          {t("profile_description")}
        </p>
        <a
          href={`/${lang}/profile`}
          className="text-orange-600 hover:underline font-medium font-roboto"
        >
          {t("edit_profile")}
        </a>
      </div>
    </main>
  );
}