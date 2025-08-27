"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { users } from "@prisma/client";

interface AuthContextType {
  user: users | null;
  userProfile: users | null; // Keep backward compatibility 
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: string | string[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<users | null>(null);
  const [loading, setLoading] = useState(true);

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
    const userId = sessionStorage.getItem('userId');
    if (!userId) return;

    try {
      const response = await fetch(`/api/auth/me?userId=${userId}`, {
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

        // Handle mock authentication for testing
        if (mockUser && (mockUser === 'admin' || mockUser === 'public' || mockUser ==='captain' || mockUser === 'player' || mockUser === 'verification_volunteer' || mockUser === 'technical_volunteer')) {
          try {
            const response = await fetch(`/api/auth/mock?role=${mockUser}`, {
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
                newUrl.searchParams.delete('mockUser');
                window.history.replaceState({}, '', newUrl.toString());
                setLoading(false);
                return;
              }
            }
          } catch (error) {
            console.error('Mock auth failed:', error);
          }
        }

        if (authSuccess === 'success' && userId) {
          // Store userId in session storage for persistence
          sessionStorage.setItem('userId', userId);
          
          // Clean up URL parameters
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('auth');
          newUrl.searchParams.delete('userId');
          window.history.replaceState({}, '', newUrl.toString());
        }

        // Try to get userId from session storage
        const storedUserId = userId || sessionStorage.getItem('userId');

        if (storedUserId) {
          const response = await fetch(`/api/auth/me?userId=${storedUserId}`, {
            method: 'GET',
            credentials: 'include',
          });

          if (response.ok) {
            const { user } = await response.json();
            if (user) {
              setUser(user);
            } else {
              // Clear invalid session
              sessionStorage.removeItem('userId');
            }
          } else {
            // Clear invalid session
            sessionStorage.removeItem('userId');
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        sessionStorage.removeItem('userId');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    userProfile: user, // Backward compatibility - same as user
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated,
    hasRole,
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
      isAuthenticated: false,
      hasRole: () => false,
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