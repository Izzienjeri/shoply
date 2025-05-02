'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { User, ApiErrorResponse } from '@/lib/types';
import { apiClient } from '@/lib/api';

export const getAuthToken = (): string | null => {
   if (typeof window === 'undefined') return null;
   return localStorage.getItem('authToken');
};

const setAuthToken = (token: string | null): void => {
   if (typeof window === 'undefined') return;
   if (token) {
      localStorage.setItem('authToken', token);
   } else {
      localStorage.removeItem('authToken');
   }
};

export const clearAuthToken = (): void => setAuthToken(null);


interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = useCallback(async () => {
    if (!token) {
       setUser(null);
       setIsLoading(false);
       return;
    }
    setIsLoading(true);
    try {
       console.log("Simulating fetching user based on token (replace with actual GET /api/auth/me)");
       setUser({ id: 'dummy-id', email: 'logged-in@example.com', created_at: new Date().toISOString() });
    } catch (error) {
       console.error("Failed to fetch user:", error);
       setAuthToken(null);
       setToken(null);
       setUser(null);
    } finally {
       setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
     fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
     setIsLoading(true);
     try {
         const response = await apiClient.post<{ access_token: string }>('/auth/login', { email, password });
         setAuthToken(response.access_token);
         setToken(response.access_token);
         await fetchUser();
     } catch (error) {
         console.error("Login failed:", error);
         setAuthToken(null);
         setToken(null);
         setUser(null);
         throw error;
     } finally {
         setIsLoading(false);
     }
  };

 const signup = async (userData: any) => {
    setIsLoading(true);
     try {
         await apiClient.post('/auth/signup', userData);
     } catch (error) {
         console.error("Signup failed:", error);
         throw error;
     } finally {
        setIsLoading(false);
     }
 };

  const logout = async () => {
     setIsLoading(true);
     try {
        if (token) {
           await apiClient.post('/auth/logout', {}, { needsAuth: true });
        }
     } catch (error) {
         console.error("Logout API call failed:", error);
     } finally {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setIsLoading(false);
        window.location.href = '/';
     }
  };

  const isAuthenticated = !isLoading && !!user && !!token;

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated, login, signup, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};