"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { User } from "@prisma/client";
import { api } from "@/server/trpc/react";

export const ALL_ROLES = ["admin", "captain", "player", "volunteer", "general_volunteer", "technical_volunteer", "verification", "public"];

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
    case "general_volunteer":
    case "technical_volunteer":
      return `/${lang}/volunteer`;
    case "verification":
    case "verification_volunteer":
      return `/${lang}/verification/dashboard`;
    default:
      return `/${lang}/public`;
  }
};

// Helper function to get volunteer venue assignment
export const getVolunteerVenueRedirect = async (userId: string): Promise<string | null> => {
  try {
    // This would need to be implemented as a server-side function
    // For now, return null to fallback to dashboard
    return null;
  } catch (error) {
    console.error('Error getting volunteer venue assignment:', error);
    return null;
  }
};

export const handleRedirect = async (user: User, lang: string, router: AppRouterInstance) => {
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
      // For volunteers, try to get venue assignment first
      if (role === 'general_volunteer' || role === 'technical_volunteer') {
        const venueId = await getVolunteerVenueRedirect(user.id);
        if (venueId) {
          router.push(`/${lang}/volunteer/venues/${venueId}`);
          return;
        }
      }
      
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

/**
 * Custom hook to handle user redirection based on authentication state, profile completion, and role.
 * For volunteers, it specifically checks for an assigned venue and redirects if one is found.
 * If no venue is assigned, it does NOT redirect, allowing the component to render its "no assignments" message.
 * @param allowedRoles - An optional array of roles allowed to view the current page.
 */
export const useRedirect = (allowedRoles?: string[]) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang;

  // Fetch volunteer assignments. This query is only enabled for volunteers.
  const { data: assignmentsData, isLoading: assignmentsLoading } = api.volunteers.getMyAssignments.useQuery(
    undefined,
    {
      enabled: !loading && !!user && (user.role === 'general_volunteer' || user.role === 'technical_volunteer'),
    }
  );

  useEffect(() => {
    // Exit if still loading or if lang is not yet available
    if (loading || assignmentsLoading || !lang) {
      return;
    }

    // Redirect to login if the user is not authenticated
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    const checkAndRedirect = async () => {
      const role = user.role;
      const isProfileComplete = user.profileComplete;

      const specialRole = role === 'admin' || role === 'public' || (role && role.includes('volunteer'));
      
      // Redirect to profile completion if the profile is incomplete and it's not a special role
      if (!isProfileComplete && !specialRole) {
        router.push(`/${lang}/profile/complete`);
        return;
      }
      
      // Special handling for volunteers: redirect to an assigned venue
      if ((role === 'general_volunteer' || role === 'technical_volunteer') && assignmentsData?.assignments) {
        if (assignmentsData.assignments.length > 0) {
          // Redirect to the first assigned venue
          const firstAssignment = assignmentsData.assignments[0];
          router.push(`/${lang}/volunteer/venues/${firstAssignment.venueId}`);
          return;
        } 
        // If there are no assignments, we do NOT redirect.
        // The component (VolunteerMainPage) will handle rendering the "no assignments" message.
        // This is the key change to prevent the infinite loop.
      }
      
      // If allowedRoles are specified and the user's role is not in the list, redirect them
      if (allowedRoles && !allowedRoles.includes(role)) {
        const dashboardRoute = getDashboardRoute(role, lang as string);
        router.push(dashboardRoute);
      }
    };
    
    checkAndRedirect();
  }, [user, loading, assignmentsLoading, assignmentsData, router, lang, allowedRoles]);
};

