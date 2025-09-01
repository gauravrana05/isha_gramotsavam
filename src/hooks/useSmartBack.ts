import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface UseSmartBackOptions {
  fallbackPath?: string;
  role?: 'admin' | 'captain' | 'player' | 'volunteer' | 'verification';
}

export const useSmartBack = (options: UseSmartBackOptions = {}) => {
  const router = useRouter();
  const { fallbackPath, role } = options;

  const goBack = useCallback(() => {
    // Try custom fallback first
    if (fallbackPath) {
      router.push(fallbackPath);
      return;
    }

    // Try browser history
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    // Role-based fallback
    if (role) {
      const dashboardMap = {
        admin: '/admin/dashboard',
        captain: '/captain/dashboard', 
        player: '/player/dashboard',
        volunteer: '/volunteer/dashboard',
        verification: '/verification/dashboard'
      };
      
      const currentLang = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';
      router.push(`/${currentLang}${dashboardMap[role]}`);
      return;
    }

    // Auto-detect role from current path
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const currentLang = currentPath.split('/')[1] || 'en';
      
      if (currentPath.includes('/admin/')) {
        router.push(`/${currentLang}/admin/dashboard`);
      } else if (currentPath.includes('/captain/')) {
        router.push(`/${currentLang}/captain/dashboard`);
      } else if (currentPath.includes('/player/')) {
        router.push(`/${currentLang}/player/dashboard`);
      } else if (currentPath.includes('/volunteer/')) {
        router.push(`/${currentLang}/volunteer/dashboard`);
      } else if (currentPath.includes('/verification/')) {
        router.push(`/${currentLang}/verification/dashboard`);
      } else {
        router.push(`/${currentLang}/dashboard`);
      }
    }
  }, [router, fallbackPath, role]);

  return { goBack };
};