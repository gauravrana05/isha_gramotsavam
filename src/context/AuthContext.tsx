"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { User } from "@prisma/client";
import { api } from "@/server/trpc/react";
import PageLoader from "@/components/ui/loaders/PageLoader";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
      
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      setUser(null);
      window.location.href = '/';
      throw error;
    }
  }, []);

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
        // Check URL params first
        const urlParams = new URLSearchParams(window.location.search);
        const phone = urlParams.get('phone');
        const authSuccess = urlParams.get('auth');
        const userId = urlParams.get('userId');
        const mockUser = urlParams.get('mockUser');

        // Handle auth parameters
        if (phone || authSuccess || userId || mockUser) {
          // Handle mockUser parameter (for testing)
          if (mockUser) {
            try {
              const response = await fetch('/api/auth/mock-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: mockUser }),
                credentials: 'include',
              });
              
              if (response.ok) {
                const { user } = await response.json();
                if (user) {
                  setUser(user);
                  // Clean URL
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.delete('mockUser');
                  window.history.replaceState({}, '', newUrl.toString());
                  setLoading(false);
                  return;
                }
              }
            } catch (error) {
              console.error('❌ Mock user login error:', error);
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
                setUser(user);
                // Clean URL
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('phone');
                window.history.replaceState({}, '', newUrl.toString());
                setLoading(false);
                return;
              }
            }
          }
          
          // Try to get current user
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
          });
          
          if (response.ok) {
            const { user } = await response.json();
            if (user) {
              setUser(user);
              // Clean URL
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('auth');
              newUrl.searchParams.delete('userId');
              newUrl.searchParams.delete('mockUser');
              newUrl.searchParams.delete('phone');
              if (newUrl.href !== window.location.href) {
                window.history.replaceState({}, '', newUrl.href);
              }
              setLoading(false);
              return;
            }
          }
        }

        // Check if user is logged in via cookie
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const { user } = await response.json();
          if (user) {
            setUser(user);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setUser(null);
        setLoading(false);
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