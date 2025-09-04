'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { type MobileTab } from '@/components/mobile/BottomNavigation';

interface NavigationState {
  currentTab: MobileTab;
  history: string[];
  canGoBack: boolean;
}

export function useMobileNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentTab: 'dashboard',
    history: [],
    canGoBack: false
  });

  // Determine current tab from pathname
  const getCurrentTabFromPath = useCallback((path: string): MobileTab => {
    if (path.includes('/team')) return 'team';
    if (path.includes('/live') || path.includes('/matches')) return 'live';
    if (path.includes('/media')) return 'media';
    if (path.includes('/chat')) return 'chat';
    return 'dashboard';
  }, []);

  // Update navigation state when pathname changes
  useEffect(() => {
    const currentTab = getCurrentTabFromPath(pathname);
    
    setNavigationState(prev => ({
      ...prev,
      currentTab,
      history: prev.history.includes(pathname) 
        ? prev.history 
        : [...prev.history, pathname],
      canGoBack: prev.history.length > 0
    }));
  }, [pathname, getCurrentTabFromPath]);

  // Handle back navigation
  const goBack = useCallback(() => {
    if (navigationState.canGoBack && navigationState.history.length > 1) {
      const previousPath = navigationState.history[navigationState.history.length - 2];
      router.push(previousPath);
    } else {
      // Fallback to dashboard if no history
      router.push('/dashboard');
    }
  }, [navigationState, router]);

  // Handle tab change
  const changeTab = useCallback((tab: MobileTab) => {
    const role = pathname.includes('/captain') ? 'captain' : 'player';
    const lang = pathname.split('/')[1] || 'en';
    
    let newPath = `/${lang}/${role}`;
    
    switch (tab) {
      case 'dashboard':
        newPath += '/dashboard';
        break;
      case 'team':
        newPath += '/teams';
        break;
      case 'live':
        newPath += '/matches';
        break;
      case 'media':
        newPath += '/media';
        break;
      case 'chat':
        newPath += '/chat';
        break;
    }
    
    router.push(newPath);
  }, [pathname, router]);

  // Navigate to specific page
  const navigateTo = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  // Clear navigation history
  const clearHistory = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      history: [pathname],
      canGoBack: false
    }));
  }, [pathname]);

  return {
    currentTab: navigationState.currentTab,
    canGoBack: navigationState.canGoBack,
    history: navigationState.history,
    goBack,
    changeTab,
    navigateTo,
    clearHistory
  };
}
