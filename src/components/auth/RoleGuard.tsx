import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDashboardRoute } from "@/lib/utils/navigation";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles, 
  redirectTo 
}) => {
  const { userProfile, loading, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang || 'en';

  useEffect(() => {
    if (loading) return;

    // Not authenticated
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    // Profile incomplete
    if (!userProfile?.isProfileComplete) {
      router.push(`/${lang}/complete-profile`);
      return;
    }

    // Role not allowed
    if (!userProfile || !allowedRoles.includes(userProfile.role)) {
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        // Default redirects based on role
        const dashboardRoute = getDashboardRoute(userProfile?.role, lang as string);
        router.push(dashboardRoute);
      }
      return;
    }
  }, [userProfile, loading, user, allowedRoles, router, lang, redirectTo]);

  if (loading || !user || !userProfile?.isProfileComplete || !allowedRoles.includes(userProfile.role)) {
    return null;
  }

  return <>{children}</>;
};