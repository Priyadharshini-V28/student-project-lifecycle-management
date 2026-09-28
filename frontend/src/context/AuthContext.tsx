import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api';
import { User, ApiResponse } from '../types';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: Record<string, unknown>) => Promise<User>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Set Authorization header on Axios client whenever access token changes
  const applyAccessToken = (token: string | null) => {
    setAccessToken(token);
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  };

  // Attempt silent session recovery via HttpOnly refresh cookie on application load
  const checkSession = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh-token');
      if (res.data.success && res.data.data?.accessToken) {
        applyAccessToken(res.data.data.accessToken);

        // Fetch current user details
        const meRes = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
        if (meRes.data.success && meRes.data.data?.user) {
          setUser(meRes.data.data.user);
        }
      }
    } catch {
      // No active session or refresh cookie expired
      applyAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiClient.post<ApiResponse<{ accessToken: string; user: User }>>('/auth/login', {
      email,
      password,
    });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Login failed');
    }

    const { accessToken: token, user: loggedInUser } = res.data.data;
    applyAccessToken(token);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (payload: Record<string, unknown>): Promise<User> => {
    const res = await apiClient.post<ApiResponse<{ accessToken: string; user: User }>>('/auth/register', payload);

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Registration failed');
    }

    const { accessToken: token, user: registeredUser } = res.data.data;
    applyAccessToken(token);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      applyAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        register,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
