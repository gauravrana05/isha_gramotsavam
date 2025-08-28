"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { getVolunteerAssignments } from "@/lib/actions/admin/volunteerAssignment";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const ALL_ROLES = ["admin", "captain", "player", "general_volunteer", "technical_volunteer", "verification_volunteer", "guest"];


export const getDashboardRoute = async (role: string | null | undefined, lang: string, userId?: string): Promise<string> => {
  const userRole = role || "public";
  
  // Ensure lang is a string and not undefined
  if (!lang || typeof lang !== 'string') {
    lang = 'en'; // fallback to English
  }
  
  switch (userRole) {
    case "admin":
      return `/${lang}/admin/dashboard`;
    case "captain":
      return `/${lang}/captain/dashboard`;
    case "player":
      return `/${lang}/player/dashboard`;
    case "general_volunteer":
    case "technical_volunteer":
      if (userId) {
        try {
          const assignments = await getVolunteerAssignments(userId);
          if (assignments.success && assignments.assignments && assignments.assignments.length > 0) {
            const firstVenue = assignments.assignments[0];
            // Ensure venueId is defined before using it
            if (firstVenue && firstVenue.venueId) {
              return `/${lang}/volunteer/venues/${firstVenue.venueId}`;
            }
          }
        } catch (error) {
          console.error('Failed to fetch volunteer assignments:', error);
        }
      }
      return `/${lang}/volunteer/dashboard`;
    case "verification_volunteer":
      return `/${lang}/verification/dashboard`;
    case "guest":
      return `/${lang}/guest/dashboard`;
    case "public":
      return `/${lang}/public`;
    default:
      return `/${lang}/public`;
  }
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('All retry attempts failed');
};

export const handleRedirect = async (user: any, lang: string, router: AppRouterInstance) => {
  if (!user) {
    router.push(`/${lang}/login`);
    return;
  }

  try {
    
    const fetchUserProfile = async () => {
      const userDoc = await withTimeout(
        getDoc(doc(db, "users", user.uid)),
        10000
      );
      return userDoc;
    };

    const userDoc = await retryOperation(fetchUserProfile, 2, 1000);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const role = userData.role;
      const isProfileComplete = userData.isProfileComplete;
      
      
      const specialRole = role === 'admin' || role === 'public' || (role && role.includes('volunteer'));

      if (isProfileComplete || specialRole) {
        const dashboardRoute = await getDashboardRoute(role, lang as string, user.uid);
        router.push(dashboardRoute);
      } else {
        router.push(`/${lang}/profile/complete`);
      }
    } else {
      router.push(`/${lang}/profile/complete`);
    }
  } catch (error) {
    
    // Check if it's a timeout error
    if (error instanceof Error && error.message.includes('timed out')) {
      // For existing users with timeout issues, try going to public dashboard
      router.push(`/${lang}/guest/dashboard`);
    } else {
      router.push(`/${lang}/login`);
    }
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
        router.push(`/${lang}/profile/complete`);
        return
      }

      const userData = userDoc.data();
      const role = userData.role;
      const isProfileComplete = userData.isProfileComplete;

      const specialRole = role === 'admin' || role === 'public' || (role && role.includes('volunteer'));
      if (!isProfileComplete && !specialRole) {
        router.push(`/${lang}/profile/complete`);
        return;
      }
      
      if (allowedRoles && !allowedRoles.includes(userData.role)) {
        const dashboardRoute = await getDashboardRoute(userData.role, lang as string, user.uid);
        router.push(dashboardRoute);
      }
    }
    checkUser();
  }, [user, loading, router, lang, allowedRoles]);
}
