import React, { createContext, useState, useEffect } from 'react';
import { UserSession } from '../types/auth.types';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string, user: UserSession) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check initial auth state from storage
    const token = localStorage.getItem('sile_access_token');
    const storedUser = localStorage.getItem('sile_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('sile_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, refreshToken: string, userData: UserSession) => {
    localStorage.setItem('sile_access_token', token);
    localStorage.setItem('sile_refresh_token', refreshToken);
    localStorage.setItem('sile_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('sile_access_token');
    localStorage.removeItem('sile_refresh_token');
    localStorage.removeItem('sile_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
