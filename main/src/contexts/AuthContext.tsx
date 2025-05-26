'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { User, ApiErrorResponse, SignupResponse, LoginResponse, UserProfile } from '@/lib/types';
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

export const clearAuthToken = (): void => {
    setAuthToken(null);
};


interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: Omit<User, 'id'|'created_at'|'is_admin'> & {password: string}) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isAdmin = !!user?.is_admin;

  const fetchUser = useCallback(async (currentTokenOverride?: string) => {
    const currentToken = currentTokenOverride || getAuthToken();
    if (!currentToken) {
       setToken(null);
       setUser(null);
       setIsLoading(false);
       return;
    }

    if (!token && currentToken) {
        setToken(currentToken);
    }
    
    setIsLoading(true);
    try {
       const fetchedUser = await apiClient.get<UserProfile>('/api/auth/me', { needsAuth: true });
       if (fetchedUser) {
          setUser(fetchedUser);
       } else {
          setUser(null); 
          if (currentToken) {
            console.warn("User fetch returned null/undefined with a valid token present. Clearing token.");
            clearAuthToken();
            setToken(null);
          }
       }
    } catch (error: any) {
       console.warn("Failed to fetch user:", error.message);
       setUser(null);
       if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
            clearAuthToken();
            setToken(null);
       }
    } finally {
       setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
     const currentTokenOnLoad = getAuthToken();
     if (currentTokenOnLoad && !user) {
         fetchUser(currentTokenOnLoad);
     } else if (!currentTokenOnLoad) {
         setUser(null);
         setToken(null);
         setIsLoading(false);
     } else if (currentTokenOnLoad && user && token !== currentTokenOnLoad) {
         setToken(currentTokenOnLoad);
         fetchUser(currentTokenOnLoad);
     }
     else {
         setIsLoading(false);
     }
  }, [fetchUser, user, token]);


  const login = async (email: string, password: string) => {
     setIsLoading(true);
     try {
         const response = await apiClient.post<LoginResponse>('/api/auth/login', { email, password });

         if (response && typeof response.access_token === 'string') {
             setAuthToken(response.access_token);
             setToken(response.access_token);
             if (response.user) {
                 setUser(response.user as UserProfile);
             } else {
                 await fetchUser(response.access_token);
             }
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
        setIsLoading(false); 
     }
  };

  const signup = async (userData: Omit<User, 'id'|'created_at'|'is_admin'> & {password: string}) => {
     setIsLoading(true);
     try {
         const response = await apiClient.post<SignupResponse>('/api/auth/signup', userData);
         if (!response || !response.user) {
            throw new Error("Signup response did not include user data.");
         }
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
           await apiClient.post('/api/auth/logout', {}, { needsAuth: true });
        }
     } catch (error) {
         console.warn("Logout API call failed (continuing client-side logout):", error);
     } finally {
        clearAuthToken();
        setToken(null);
        setUser(null);
        setIsLoading(false);
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
     }
  };

  const isAuthenticated = !isLoading && !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated, isAdmin, login, signup, logout, fetchUser }}>
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