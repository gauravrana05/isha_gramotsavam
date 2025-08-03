"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const ALL_ROLES = ["admin", "captain", "player", "general_volunteer", "technical_volunteer", "verification_volunteer", "guest"];


export const getDashboardRoute = (role: string | null | undefined, lang: string): string => {
  console.log("THe role of the user is", role);
  const userRole = role || "public";
  switch (userRole) {
    case "admin":
      return `/${lang}/admin/dashboard`;
    case "captain":
      return `/${lang}/captain/dashboard`;
    case "player":
      return `/${lang}/player/dashboard`;
    case "general_volunteer":
    case "technical_volunteer":
      return `/${lang}/volunteer/dashboard`;
    case "verification_volunteer":
      return `/${lang}/verification/dashboard`;
    case "guest":
      return `/${lang}/guest/dashboard`;
    default:
      return `/${lang}/public`;
  }
};

export const handleRedirect = async (user: any, lang: string, router: AppRouterInstance) => {
  if (!user) {
    router.push(`/${lang}/login`);
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const role = userData.role;
      const isProfileComplete = userData.isProfileComplete;
      
      const specialRole = role === 'admin' || role === 'public' || (role && role.includes('volunteer'));

      if (isProfileComplete || specialRole) {
        const dashboardRoute = getDashboardRoute(role, lang as string);
        router.push(dashboardRoute);
      } else {
        router.push(`/${lang}/complete-profile`);
      }
    } else {
      router.push(`/${lang}/complete-profile`);
    }
  } catch (error) {
    console.error("Error checking profile:", error);
    router.push(`/${lang}/login`);
  }
}

export const useRedirect = (allowedRoles?: string[]) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang;

  useEffect(() => {
    if (loading || !lang) {
      return;
    }

    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }
    const checkUser = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        router.push(`/${lang}/complete-profile`);
        return
      }

      const userData = userDoc.data();
      const role = userData.role;
      const isProfileComplete = userData.isProfileComplete;

      const specialRole = role === 'admin' || role === 'public' || (role && role.includes('volunteer'));

      if (!isProfileComplete && !specialRole) {
        router.push(`/${lang}/complete-profile`);
        return;
      }
      
      if (allowedRoles && !allowedRoles.includes(userData.role)) {
        const dashboardRoute = getDashboardRoute(userData.role, lang as string);
        router.push(dashboardRoute);
      }
    }
    checkUser();
  }, [user, loading, router, lang, allowedRoles]);
}
