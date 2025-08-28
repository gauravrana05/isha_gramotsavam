"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { users } from "@prisma/client";

export const ALL_ROLES = ["admin", "captain", "player", "volunteer", "technical_volunteer", "verification", "public"];

export const getDashboardRoute = (role: string | null | undefined, lang: string): string => {
  const userRole = role || "public";
  switch (userRole) {
    case "admin":
      return `/${lang}/admin/dashboard`;
    case "captain":
      return `/${lang}/captain/dashboard`;
    case "player":
      return `/${lang}/player/dashboard`;
    case "volunteer":
    case "technical_volunteer":
      return `/${lang}/volunteer/dashboard`;
    case "verification":
    case "verification_volunteer":
      return `/${lang}/verification/dashboard`;
    default:
      return `/${lang}/public`;
  }
};

export const handleRedirect = async (user: users, lang: string, router: AppRouterInstance) => {
  if (!user) {
    router.push(`/${lang}/login`);
    return;
  }

  try {
    const role = user.role;
    const isProfileComplete = user.profileComplete;
    
    // Special roles that can skip profile completion
    const specialRole = role === 'admin' || role === 'public' || (role && role.includes('volunteer'));

    if (isProfileComplete || specialRole) {
      const dashboardRoute = getDashboardRoute(role, lang);
      router.push(dashboardRoute);
    } else {
      router.push(`/${lang}/profile/complete`);
    }
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback to login on error
    router.push(`/${lang}/login`);
  }
};

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
      const role = user.role;
      const isProfileComplete = user.profileComplete;

      const specialRole = role === 'admin' || role === 'public' || (role && role.includes('volunteer'));
      if (!isProfileComplete && !specialRole) {
        router.push(`/${lang}/profile/complete`);
        return;
      }
      
      if (allowedRoles && !allowedRoles.includes(role)) {
        const dashboardRoute = getDashboardRoute(role, lang as string);
        router.push(dashboardRoute);
      }
    };
    
    checkUser();
  }, [user, loading, router, lang, allowedRoles]);
};