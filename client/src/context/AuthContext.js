import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Flag to prevent checkAuth from overwriting state set by loginWithToken
  const isLoggingInRef = useRef(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await authAPI.getMe();
        // If loginWithToken ran concurrently and already set auth state, don't overwrite
        if (isLoggingInRef.current) return;
        if (response.data) {
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        if (isLoggingInRef.current) return;
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
      }
    }
    if (!isLoggingInRef.current) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        return response.data;
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error.response?.data || error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const loginWithToken = useCallback(async (token) => {
    if (!token) return null;
    isLoggingInRef.current = true;
    try {
      localStorage.setItem('token', token);
      const response = await authAPI.getMe();
      // Handle both cases where response might be the data itself or have a data property
      const userData = response.data ? response.data : response;
      
      console.log('👤 Token login successful:', userData.email);
      
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      console.error('❌ Login with token failed:', error);
      localStorage.removeItem('token');
      throw error;
    } finally {
      isLoggingInRef.current = false;
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated,
    login,
    loginWithToken,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
