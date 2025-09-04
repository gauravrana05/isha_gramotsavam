'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { MobileCard } from './ui/MobileCard';
import { MobileButton } from './ui/MobileButton';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function InstallPrompt({ onInstall, onDismiss }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone || isInWebAppiOS);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay to avoid being intrusive
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, show prompt after some interaction
    if (iOS && !isStandalone && !isInWebAppiOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);

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
  }, [onInstall]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        onInstall?.();
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
    
    // Don't show again for this session
    sessionStorage.setItem('installPromptDismissed', 'true');
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || !showPrompt || sessionStorage.getItem('installPromptDismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50">
      <MobileCard className="border-2 border-[#2C5282] bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-[#2C5282] rounded-lg flex items-center justify-center mr-3">
              <Download size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Install Gramotsavam</h3>
              <p className="text-sm text-gray-600">Get the full app experience</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Works offline</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Faster loading</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Push notifications</span>
          </div>
        </div>

        {isIOS ? (
          // iOS installation instructions
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              To install this app on your iPhone:
            </p>
            <div className="flex items-center text-sm text-gray-600">
              <Share size={16} className="mr-2" />
              <span>Tap the Share button in Safari</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Download size={16} className="mr-2" />
              <span>Then tap "Add to Home Screen"</span>
            </div>
            <MobileButton
              variant="secondary"
              size="sm"
              onClick={handleDismiss}
              fullWidth
            >
              Got it
            </MobileButton>
          </div>
        ) : (
          // Android/Chrome installation
          <div className="flex space-x-2">
            <MobileButton
              variant="primary"
              size="sm"
              onClick={handleInstallClick}
              className="flex-1"
            >
              Install App
            </MobileButton>
            <MobileButton
              variant="secondary"
              size="sm"
              onClick={handleDismiss}
              className="flex-1"
            >
              Not Now
            </MobileButton>
          </div>
        )}
      </MobileCard>
    </div>
  );
}
