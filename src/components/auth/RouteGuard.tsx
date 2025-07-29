import React from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

// Route permission mapping
const routePermissions: Record<string, string[]> = {
  // Public routes - any authenticated user
  '/public/register/team': ['authenticated'],
  
  // Captain routes - only captains and admins
  '/captain': ['captain', 'admin'],
  
  // Verification routes - only verification volunteers and admins
  '/verification': ['verification_volunteer', 'admin'],
  
  // Admin routes - only admins
  '/admin': ['admin'],
  
  // Player routes - players, captains, and admins
  '/player': ['player', 'captain', 'admin'],
  
  // Volunteer routes - volunteers and admins
  '/volunteer': ['volunteer_general', 'volunteer_technical', 'admin'],
  
  // Guest routes - guests and above
  '/guest': ['guest', 'player', 'captain', 'verification_volunteer', 'volunteer_general', 'volunteer_technical', 'admin'],
};

interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const lang = params?.lang || 'en';

  useEffect(() => {
    if (loading) return;

    // Extract the route pattern from pathname
    const pathParts = pathname.split('/').filter(Boolean);
    const routePattern = '/' + pathParts.slice(1).join('/'); // Remove language segment

    // Find matching route permission
    let requiredRoles: string[] = [];
    for (const [pattern, roles] of Object.entries(routePermissions)) {
      if (routePattern.startsWith(pattern)) {
        requiredRoles = roles;
        break;
      }
    }

    // If no specific permissions found, allow access (for public routes)
    if (requiredRoles.length === 0) {
      return;
    }

    // Check authentication for routes requiring 'authenticated'
    if (requiredRoles.includes('authenticated')) {
      if (!user) {
        router.push(`/${lang}/login`);
        return;
      }
      if (!userProfile?.isProfileComplete) {
        router.push(`/${lang}/complete-profile`);
        return;
      }
      return; // Authenticated users can access
    }

    // Check specific role permissions
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.isProfileComplete) {
      router.push(`/${lang}/complete-profile`);
      return;
    }

    if (!userProfile || !requiredRoles.includes(userProfile.role)) {
      // Redirect to appropriate dashboard based on role
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
      return;
    }
  }, [pathname, user, userProfile, loading, router, lang]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CE4520]"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RouteGuard;