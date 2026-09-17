import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (name?: string, avatar?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mcq_auth_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (!ApiClient.getToken()) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await ApiClient.getMe();
      if (res && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
        ApiClient.setToken(null);
      }
    } catch (err) {
      console.warn('Auth session invalid or expired:', err);
      setUser(null);
      ApiClient.setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await ApiClient.login(email, pass);
    ApiClient.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await ApiClient.register(name, email, pass);
    ApiClient.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    ApiClient.setToken(null);
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = async (name?: string, avatar?: string) => {
    const res = await ApiClient.updateProfile(name, avatar);
    if (res && res.user) {
      setUser(res.user);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAdmin,
      login,
      register,
      logout,
      updateUserProfile,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
