'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  showPrompt: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export function useInstallPrompt() {
  const [state, setState] = useState<InstallPromptState>({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    showPrompt: false,
    deferredPrompt: null
  });

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const isInstalled = isStandalone || isInWebAppiOS;

    setState(prev => ({
      ...prev,
      isIOS: iOS,
      isInstalled
    }));

    // Don't show prompts if already installed
    if (isInstalled) {
      return;
    }

    // Handle beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const deferredPrompt = e as BeforeInstallPromptEvent;
      
      setState(prev => ({
        ...prev,
        isInstallable: true,
        deferredPrompt,
        showPrompt: !sessionStorage.getItem('installPromptDismissed')
      }));
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        showPrompt: false,
        deferredPrompt: null
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, make installable after some time if not dismissed
    if (iOS && !isInstalled) {
      const timer = setTimeout(() => {
        if (!sessionStorage.getItem('installPromptDismissed')) {
          setState(prev => ({
            ...prev,
            isInstallable: true,
            showPrompt: true
          }));
        }
      }, 10000); // Show after 10 seconds

      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger installation prompt
  const promptInstall = useCallback(async () => {
    if (!state.deferredPrompt) {
      return false;
    }

    try {
      state.deferredPrompt.prompt();
      const { outcome } = await state.deferredPrompt.userChoice;
      
      setState(prev => ({
        ...prev,
        deferredPrompt: null,
        showPrompt: false
      }));

      return outcome === 'accepted';
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  }, [state.deferredPrompt]);

  // Dismiss the prompt
  const dismissPrompt = useCallback(() => {
    setState(prev => ({
      ...prev,
      showPrompt: false
    }));
    
    // Remember dismissal for this session
    sessionStorage.setItem('installPromptDismissed', 'true');
  }, []);

  // Check if should show prompt
  const shouldShowPrompt = useCallback(() => {
    return (
      state.isInstallable &&
      !state.isInstalled &&
      state.showPrompt &&
      !sessionStorage.getItem('installPromptDismissed')
    );
  }, [state.isInstallable, state.isInstalled, state.showPrompt]);

  // Get installation instructions for iOS
  const getIOSInstructions = useCallback(() => {
    return [
      'Tap the Share button in Safari',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" to install the app'
    ];
  }, []);

  return {
    ...state,
    promptInstall,
    dismissPrompt,
    shouldShowPrompt,
    getIOSInstructions
  };
}
