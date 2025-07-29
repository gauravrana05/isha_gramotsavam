import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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
        switch (userProfile?.role) {
          case 'admin':
            router.push(`/${lang}/admin/dashboard`);
            break;
          case 'captain':
            router.push(`/${lang}/captain/dashboard`);
            break;
          case 'verification_volunteer':
            router.push(`/${lang}/verification/dashboard`);
            break;
          case 'volunteer_general':
          case 'volunteer_technical':
            router.push(`/${lang}/volunteer/dashboard`);
            break;
          case 'guest':
            router.push(`/${lang}/guest/dashboard`);
            break;
          default:
            router.push(`/${lang}/player/dashboard`);
        }
      }
      return;
    }
  }, [userProfile, loading, user, allowedRoles, router, lang, redirectTo]);

  if (loading || !user || !userProfile?.isProfileComplete || !allowedRoles.includes(userProfile.role)) {
    return null;
  }

  return <>{children}</>;
};