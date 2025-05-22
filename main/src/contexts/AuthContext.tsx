// === contexts/AuthContext.tsx ===
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

export const clearAuthToken = (): void => setAuthToken(null);


interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: Omit<User, 'id'|'created_at'> & {password: string}) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true to load token and potentially user

  const fetchUser = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
       setToken(null);
       setUser(null);
       setIsLoading(false);
       return;
    }

    // If token exists, but user is not loaded, set token and try to fetch user
    if (currentToken && !user) {
        setToken(currentToken); // Ensure token state is up-to-date
    }

    setIsLoading(true);
    try {
       // IMPORTANT: The backend currently does NOT have a `/api/auth/me` endpoint.
       // This is a placeholder for if one is added.
       // If this endpoint doesn't exist, this call will fail, and user will remain null.
       const fetchedUser = await apiClient.get<UserProfile>('/auth/me', { needsAuth: true });
       if (fetchedUser) {
          setUser(fetchedUser);
       } else {
          // If /auth/me exists but returns no user for a valid token (unlikely but possible)
          setUser(null);
          // Potentially clear token if it's deemed invalid by this response
          // clearAuthToken(); setToken(null);
       }
    } catch (error: any) {
       console.warn("Failed to fetch user (e.g., /auth/me endpoint might not exist or token is invalid):", error.message);
       // Don't clear token here if it's just that /me doesn't exist.
       // If it's a 401, the apiClient might handle it, or we might need to.
       // For now, assume a failed fetch means user data isn't available.
       setUser(null);
       if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
            clearAuthToken();
            setToken(null);
       }
    } finally {
       setIsLoading(false);
    }
  }, [user]); // Added user to dependency array to avoid re-fetching if user is already loaded

  useEffect(() => {
     // Only run fetchUser on initial mount or if token changes and user isn't loaded
     const currentToken = getAuthToken();
     if (currentToken && !user) {
         fetchUser();
     } else {
         setIsLoading(false); // No token, or user already loaded
     }
  }, [fetchUser, user]);


  const login = async (email: string, password: string) => {
     // No need to setIsLoading(true) here, as page loading state should not be affected
     // Individual components can handle their own submit loading state
     try {
         const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });

         if (response && typeof response.access_token === 'string') {
             setAuthToken(response.access_token);
             setToken(response.access_token);
             // Backend login doesn't return user object, so call fetchUser
             await fetchUser(); // This will attempt /auth/me
         } else {
             console.error("Login failed: Invalid response structure from server.", response);
             throw new Error("Login failed: Received an invalid response from the server.");
         }
     } catch (error) {
         console.error("Login failed:", error);
         clearAuthToken();
         setToken(null);
         setUser(null);
         throw error; // Re-throw for the form to handle
     }
  };

 const signup = async (userData: Omit<User, 'id'|'created_at'> & {password: string}) => {
    // No need to setIsLoading(true) here
     try {
         const response = await apiClient.post<SignupResponse>('/auth/signup', userData);
         if (response && response.user) {
            // Signup on backend does not auto-login or return a token.
            // It just creates the user. User needs to login separately.
            // If backend auto-logged in and returned a token:
            // setAuthToken(response.access_token);
            // setToken(response.access_token);
            // setUser(response.user);
         } else {
            throw new Error("Signup response did not include user data.");
         }
     } catch (error) {
         console.error("Signup failed:", error);
         throw error; // Re-throw for the form to handle
     }
 };

  const logout = async () => {
     // setIsLoading(true); // Not for global loading, component can handle its own
     const currentToken = getAuthToken();
     try {
        if (currentToken) {
           await apiClient.post('/auth/logout', {}, { needsAuth: true });
        }
     } catch (error) {
         console.warn("Logout API call failed (continuing client-side logout):", error);
     } finally {
        clearAuthToken();
        setToken(null);
        setUser(null);
        // setIsLoading(false);
        // Force reload or redirect to ensure all states are cleared, and cart context also updates
        window.location.href = '/';
     }
  };

  // Derived state: isAuthenticated depends on token, user, and loading status
  // Considered authenticated if not loading, and token is present.
  // User object might still be null if /me endpoint is not available.
  const isAuthenticated = !isLoading && !!token;

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