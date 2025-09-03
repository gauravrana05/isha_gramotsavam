import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export function useOnboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip onboarding for certain paths
    const skipPaths = ['/onboarding', '/auth', '/api', '/public'];
    const shouldSkip = skipPaths.some(path => pathname.startsWith(path));
    
    if (shouldSkip || !user) return;

    // Check if user needs onboarding
    const needsOnboarding = checkOnboardingStatus(user);
    
    if (needsOnboarding && !pathname.includes('/onboarding')) {
      router.push('/onboarding');
    }
  }, [user, pathname, router]);

  function checkOnboardingStatus(user: any): boolean {
    // Check if user has completed essential steps
    const hasCompletedProfile = user.profileCompleted;
    const isFirstLogin = !user.lastLoginAt || 
      new Date(user.lastLoginAt) < new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    // New users or users who haven't completed profile need onboarding
    return !hasCompletedProfile || isFirstLogin;
  }
}

export function useOnboardingRedirect() {
  const { user } = useAuth();
  
  function getPostOnboardingRoute(): string {
    switch (user?.role) {
      case 'admin': return '/admin';
      case 'captain': return '/captain/dashboard';
      case 'volunteer': return '/volunteer/venues'; // Will redirect to assigned venue
      default: return '/player/dashboard';
    }
  }
  
  return { getPostOnboardingRoute };
}
