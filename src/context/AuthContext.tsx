"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

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

  const login = useCallback(async () => {
    setLoading(true);
    try {
      // Initiate OIDC login flow
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to initiate login');
      }

      const { authUrl } = await response.json();
      
      // Redirect to Isha SSO
      window.location.href = authUrl;
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
      
      // Clear user state
      setUser(null);
      // Redirect to public home page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if API call fails
      setUser(null);
      window.location.href = '/';
      throw error;
    }
  }, []);

  const isAuthenticated = !!user;

  const hasRole = useCallback((roles: string | string[]) => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user]);

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

  // Initialize auth state from URL params or session storage
  useEffect(() => {
    const initializeAuth = async () => {
      // Prevent multiple initializations
      if (initialized) return;
      
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
                  setInitialized(true);
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
                setInitialized(true);
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
              setInitialized(true);
              return;
            }
          }
        }

        // Check session storage
        // Check if user is logged in via cookie
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const { user } = await response.json();
          if (user) {
            setUser(user);
            setLoading(false);
            setInitialized(true);
            return;
          }
        }

        // No valid session
        setUser(null);
        setLoading(false);
        setInitialized(true);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setUser(null);
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [initialized]);

  const updateLanguagePreference = useCallback(async (lang: string) => {
    // This will be handled by the component using the tRPC mutation
    // We just need to refresh the user data after update
    await refreshUser();
  }, [refreshUser]);

  const hasLanguagePreference = Boolean(user?.languagePreference && user.languagePreference !== 'en');

  const value: AuthContextType = {
    user,
    userProfile: user, // Backward compatibility - same as user
    profileImage: profileImageQuery.data?.userProfileImages?.profilePhotoPath || null,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated,
    hasRole,
    updateLanguagePreference,
    hasLanguagePreference,
  };

  return (
    <AuthContext.Provider value={value}>
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

// Role-based hook
export const useRequireAuth = (requiredRoles?: string | string[]) => {
  const { user, loading, hasRole } = useAuth();
  
  const hasRequiredRole = requiredRoles ? hasRole(requiredRoles) : true;
  
  return {
    user,
    loading,
    isAuthorized: !!user && hasRequiredRole,
    hasRole,
  };
};

// Admin check hook
export const useRequireAdmin = () => {
  return useRequireAuth('admin');
};