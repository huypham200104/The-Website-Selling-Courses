import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
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

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    console.log('[checkAuth] start, token exists:', !!token, '| isLoggingIn:', isLoggingInRef.current);
    if (token) {
      try {
        const response = await authAPI.getMe();
        console.log('[checkAuth] getMe response:', response?.data);
        // If loginWithToken ran concurrently and already set auth state, don't overwrite
        if (isLoggingInRef.current) {
          console.log('[checkAuth] SKIPPED overwrite because loginWithToken is running');
          return;
        }
        if (response.data) {
          console.log('[checkAuth] setting user:', response.data.email, 'role:', response.data.role);
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        if (isLoggingInRef.current) {
          console.log('[checkAuth] error but SKIPPED logout because loginWithToken is running');
          return;
        }
        console.error('[checkAuth] Auth check failed:', error?.response?.status, error?.message);
        logout();
      }
    }
    if (!isLoggingInRef.current) {
      console.log('[checkAuth] setLoading(false)');
      setLoading(false);
    }
  };

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
    console.log('[logout] clearing auth state');
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const loginWithToken = async (token) => {
    if (!token) {
      console.log('[loginWithToken] no token provided!');
      return null;
    }
    console.log('[loginWithToken] START, token:', token.substring(0, 20) + '...');
    isLoggingInRef.current = true;
    try {
      setLoading(true);
      localStorage.setItem('token', token);
      console.log('[loginWithToken] calling getMe()...');
      const response = await authAPI.getMe();
      console.log('[loginWithToken] getMe raw response:', response);
      // Handle both cases where response might be the data itself or have a data property
      const userData = response.data ? response.data : response;
      
      console.log('[loginWithToken] ✅ SUCCESS - user:', userData.email, '| role:', userData.role);
      
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      console.error('[loginWithToken] ❌ FAILED:', error?.response?.status, error?.response?.data, error?.message);
      localStorage.removeItem('token');
      throw error;
    } finally {
      isLoggingInRef.current = false;
      console.log('[loginWithToken] setLoading(false)');
      setLoading(false);
    }
  };

  const value = {
    user,
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
