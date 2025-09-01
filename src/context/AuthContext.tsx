"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@prisma/client";
import { api } from "@/server/trpc/react";

interface AuthContextType {
  user: User | null;
  userProfile: User | null; // Keep backward compatibility 
  profileImage: string | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: string | string[]) => boolean;
  updateLanguagePreference: (lang: string) => Promise<void>;
  hasLanguagePreference: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      
      // Clear session storage and user state
      sessionStorage.removeItem('userId');
      setUser(null);
      // Redirect to public home page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if API call fails
      sessionStorage.removeItem('userId');
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

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const { user: updatedUser } = await response.json();
        if (updatedUser) {
          setUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  // Initialize auth state from URL params or session storage
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        // Check if we just came back from OIDC callback
        const urlParams = new URLSearchParams(window.location.search);
        const authSuccess = urlParams.get('auth');
        const userId = urlParams.get('userId');
        const mockUser = urlParams.get('mockUser');
        const phone = urlParams.get('phone');

        // Handle mock authentication or callback
        if (mockUser || authSuccess || userId || phone) {
          // Try to get current user from session
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
          });
          
          if (response.ok) {
            const { user } = await response.json();
            if (user) {
              sessionStorage.setItem('userId', user.id);
              setUser(user);
              
              // Clean up URL parameters
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

        // Try to restore session from storage or cookie
        const storedUserId = sessionStorage.getItem('userId');
        if (storedUserId) {
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
          });
          
          if (response.ok) {
            const { user } = await response.json();
            if (user) {
              setUser(user);
              setLoading(false);
              return;
            }
          }
          
          // Clear invalid session
          sessionStorage.removeItem('userId');
        }

        // No valid session found
        setUser(null);
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setUser(null);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

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
      {children}
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
      refreshUser: async () => {},
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