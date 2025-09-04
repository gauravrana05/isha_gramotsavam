"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { User } from "@prisma/client";
import { api } from "@/server/trpc/react";
import PageLoader from "@/components/ui/loaders/PageLoader";

interface CachedUserData {
  user: User;
  timestamp: number;
  expiry: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: User | null; // Keep backward compatibility 
  profileImage: string | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  isAuthenticated: boolean;
  hasRole: (roles: string | string[]) => boolean;
  updateLanguagePreference: (lang: string) => Promise<void>;
  hasLanguagePreference: boolean;
  // NEW: Offline support
  clearOfflineData: () => Promise<void>;
  isOfflineMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const initializationRef = useRef(false);

  // Fetch profile image data using tRPC
  const profileImageQuery = api.profile.checkCompletion.useQuery(
    { userId: user?.id || "" },
    { 
      enabled: !!user?.id && 
               user.id.length > 0 && 
               !['admin', 'general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user.role),
      staleTime: 10 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    }
  );

  const clearOfflineData = useCallback(async () => {
    try {
      // Clear IndexedDB
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name?.includes('volunteer') || db.name?.includes('offline')) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      
      // Clear localStorage offline data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('volunteer') || key.includes('offline') || key.includes('cached_user')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }, []);

  // Stable callback functions
  const login = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        if (authUrl) {
          window.location.href = authUrl;
        }
      } else {
        throw new Error('Failed to initiate login');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.warn('Server logout failed:', error);
    }
    
    // Always clear local data regardless of server response
    setUser(null);
    setIsOfflineMode(false);
    localStorage.removeItem('cached_user_auth');
    
    // Clear offline cache
    await clearOfflineData();
    
    window.location.href = '/';
  }, [clearOfflineData]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const { user: updatedUser } = await response.json();
        if (updatedUser) {
          setUser(updatedUser);
          return updatedUser;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  }, []);

  // Initialize auth state once
  useEffect(() => {
    if (initializationRef.current) return;
    
    const initializeAuth = async () => {
      initializationRef.current = true;
      
      try {
        // STEP 1: Try cached user first for instant load
        const cachedData = localStorage.getItem('cached_user_auth');
        let hasValidCache = false;
        
        if (cachedData) {
          try {
            const { user: cachedUser, expiry }: CachedUserData = JSON.parse(cachedData);
            if (Date.now() < expiry) {
              setUser(cachedUser);
              setLoading(false);
              hasValidCache = true;
              console.log('✅ Using cached user for instant load:', cachedUser.id);
              
              // Background validation if online
              if (navigator.onLine) {
                setTimeout(() => validateAndUpdateUser(cachedUser.id), 100);
              }
            } else {
              localStorage.removeItem('cached_user_auth');
            }
          } catch (error) {
            console.warn('Invalid cached user data:', error);
            localStorage.removeItem('cached_user_auth');
          }
        }
        
        // STEP 2: If no valid cache, try API (but don't block on offline)
        if (!hasValidCache) {
          // Always try API validation, even if offline
          await validateAndUpdateUser();
        }
        
        // Ensure loading is set to false
        if (loading) {
          setLoading(false);
        }
        
      } catch (error) {
        console.error('Auth initialization failed:', error);
        
        // FALLBACK: Try to use cached user even if expired (offline mode)
        const cachedData = localStorage.getItem('cached_user_auth');
        if (cachedData) {
          try {
            const { user: cachedUser }: CachedUserData = JSON.parse(cachedData);
            setUser(cachedUser);
            setIsOfflineMode(true);
            console.log('🔄 Using expired cache due to connection error');
          } catch (fallbackError) {
            console.error('Failed to use cached user:', fallbackError);
          }
        }
        
        setLoading(false);
      }
    };

    const validateAndUpdateUser = async (currentUserId?: string) => {
      try {
        // Check URL params first for auth flows
        const urlParams = new URLSearchParams(window.location.search);
        const phone = urlParams.get('phone');
        const authSuccess = urlParams.get('auth');
        const userId = urlParams.get('userId');
        const mockUser = urlParams.get('mockUser');

        // Handle special auth parameters
        if (phone || authSuccess || userId || mockUser) {
          if (mockUser) {
            const response = await fetch('/api/auth/mock-users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: mockUser }),
              credentials: 'include',
            });
            
            if (response.ok) {
              const { user } = await response.json();
              if (user) {
                await cacheUserData(user);
                setUser(user);
                cleanUrl();
                return;
              }
            }
          }
          
          if (phone && !mockUser && !authSuccess && !userId) {
            const phoneResponse = await fetch('/api/auth/phone', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone }),
              credentials: 'include',
            });
            
            if (phoneResponse.ok) {
              const { user } = await phoneResponse.json();
              if (user) {
                await cacheUserData(user);
                setUser(user);
                cleanUrl();
                return;
              }
            }
          }
        }

        // Regular user validation
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const { user: freshUser } = await response.json();
          if (freshUser) {
            await cacheUserData(freshUser);
            
            // Update user if different from current
            if (!currentUserId || currentUserId !== freshUser.id) {
              setUser(freshUser);
              
              // If user changed, clear old offline data
              if (currentUserId && currentUserId !== freshUser.id) {
                await clearOfflineData();
              }
            }
            
            setIsOfflineMode(false);
            cleanUrl();
          }
        }
        
        // Always set loading to false after API attempt
        if (loading) {
          setLoading(false);
        }
      } catch (error) {
        console.warn('Background user validation failed:', error);
        // Don't fail - continue with cached user
        if (loading) {
          setLoading(false);
        }
      }
    };

    const cacheUserData = async (user: User) => {
      const cacheData: CachedUserData = {
        user,
        timestamp: Date.now(),
        expiry: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      };
      localStorage.setItem('cached_user_auth', JSON.stringify(cacheData));
    };

    const cleanUrl = () => {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auth');
      newUrl.searchParams.delete('userId');
      newUrl.searchParams.delete('mockUser');
      newUrl.searchParams.delete('phone');
      if (newUrl.href !== window.location.href) {
        window.history.replaceState({}, '', newUrl.href);
      }
    };

    initializeAuth();
  }, []); // Empty dependency array - only run once

  // Stable derived values
  const isAuthenticated = useMemo(() => !!user, [user]);
  
  const hasRole = useCallback((roles: string | string[]) => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user?.role]); // Only depend on user.role, not entire user object

  const updateLanguagePreference = useCallback(async (lang: string) => {
    await refreshUser();
  }, [refreshUser]);

  const hasLanguagePreference = useMemo(() => 
    Boolean(user?.languagePreference && user.languagePreference !== 'en'), 
    [user?.languagePreference]
  );

  const profileImage = useMemo(() => 
    profileImageQuery.data?.userProfileImages?.profilePhotoPath || null,
    [profileImageQuery.data?.userProfileImages?.profilePhotoPath]
  );

  // Stable context value - only recreate when actual values change
  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    userProfile: user, // Backward compatibility
    profileImage,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated,
    hasRole,
    updateLanguagePreference,
    hasLanguagePreference,
    clearOfflineData,
    isOfflineMode,
  }), [
    user,
    profileImage,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated,
    hasRole,
    updateLanguagePreference,
    hasLanguagePreference,
    clearOfflineData,
    isOfflineMode,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {loading ? (
        <PageLoader title="Authenticating..." variant="brand" />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Temporary fallback while AuthProvider issues are being resolved
    return {
      user: null,
      userProfile: null,
      profileImage: null,
      loading: false,
      login: async () => {
        const response = await fetch('/api/auth/login', { method: 'POST' });
        const { authUrl } = await response.json();
        window.location.href = authUrl;
      },
      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      },
      refreshUser: async () => null,
      isAuthenticated: false,
      hasRole: () => false,
      updateLanguagePreference: async () => {},
      hasLanguagePreference: false,
    };
  }
  return context;
};