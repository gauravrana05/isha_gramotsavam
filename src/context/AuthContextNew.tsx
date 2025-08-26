"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/server/trpc/react";
import { User } from "@prisma/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: string | string[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
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
      setUser(null);
      // Redirect to public home page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, []);

  const isAuthenticated = !!user;

  const hasRole = useCallback((roles: string | string[]) => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user]);

  // Initialize auth state from cookies/session
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const { user } = await response.json();
          setUser(user);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
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