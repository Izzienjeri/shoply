'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { User, ApiErrorResponse } from '@/lib/types';
import { apiClient } from '@/lib/api';

export const getAuthToken = (): string | null => {
   if (typeof window === 'undefined') return null;
   try {
      return localStorage.getItem('authToken');
   } catch (error) {
      console.error("Failed to read auth token from localStorage:", error);
      return null;
   }
};

const setAuthToken = (token: string | null): void => {
   if (typeof window === 'undefined') return;
   try {
      if (token) {
         localStorage.setItem('authToken', token);
      } else {
         localStorage.removeItem('authToken');
      }
   } catch (error) {
      console.error("Failed to update auth token in localStorage:", error);
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
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
       setToken(null);
       setUser(null);
       setIsLoading(false);
       return;
    }
    setIsLoading(true);
    try {
       console.log("Simulating fetching user based on token (replace with actual GET /api/auth/me)");
       const fetchedUser: User = { id: 'dummy-id', email: 'logged-in@example.com', created_at: new Date().toISOString() };

       if (fetchedUser) {
          setUser(fetchedUser);
          setToken(currentToken);
       } else {
          throw new Error("User data not found in response.");
       }
    } catch (error: any) {
       console.error("Failed to fetch user:", error);
       clearAuthToken();
       setToken(null);
       setUser(null);
    } finally {
       setIsLoading(false);
    }
  }, []);

  useEffect(() => {
     setIsLoading(true);
     fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
     setIsLoading(true);
     try {
         const response = await apiClient.post<{ access_token: string }>('/auth/login', { email, password });

         if (response && typeof response.access_token === 'string') {
             setAuthToken(response.access_token);
             setToken(response.access_token);
             await fetchUser();
         } else {
             console.error("Login failed: Invalid response structure from server.", response);
             throw new Error("Login failed: Received an invalid response from the server.");
         }

     } catch (error) {
         console.error("Login failed:", error);
         clearAuthToken();
         setToken(null);
         setUser(null);
         throw error;
     } finally {
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
     const currentToken = getAuthToken();
     try {
        if (currentToken) {
           await apiClient.post('/auth/logout', {}, { needsAuth: true });
        }
     } catch (error) {
         console.error("Logout API call failed (continuing client-side logout):", error);
     } finally {
        clearAuthToken();
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