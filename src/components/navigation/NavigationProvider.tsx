'use client'
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface NavigationContextType {
  role: 'captain' | 'player' | null;
  notifications: number;
  setNotifications: (count: number) => void;
  isOnline: boolean;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ 
  children 
}) => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Determine user role
  const role = userProfile?.role === 'captain' ? 'captain' 
             : userProfile?.role === 'player' ? 'player' 
             : null;

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load notifications count (placeholder for future implementation)
  useEffect(() => {
    if (role) {
      // TODO: Load actual notifications from API
      setNotifications(0);
    }
  }, [role]);

  const value: NavigationContextType = {
    role,
    notifications,
    setNotifications,
    isOnline,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationProvider;