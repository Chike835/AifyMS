import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      
      if (storedUser && storedToken) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setPermissions(userData.permissions || []);
        } catch (error) {
          console.error('[ERROR] AuthContext: Error parsing stored user:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
    } catch (error) {
      console.error('[ERROR] AuthContext: Error accessing localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;

      // Store token and user
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Update state
      setUser(userData);
      setPermissions(userData.permissions || []);

      return { success: true };
    } catch (error) {
      // Handle network errors and API errors
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (!error.response) {
        // Network error (backend unreachable)
        errorMessage = 'Unable to connect to server. Please check your connection and try again.';
      } else if (error.response?.data?.error) {
        // API returned an error message - ensure it's a string
        const apiError = error.response.data.error;
        errorMessage = typeof apiError === 'string' 
          ? apiError 
          : apiError?.message || JSON.stringify(apiError);
      } else if (error.response?.status === 500) {
        // Server error
        errorMessage = 'Server error. Please try again later.';
      }
      
      return {
        success: false,
        error: errorMessage, // Always a string
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPermissions([]);
    // Use window.location instead of navigate since we're in a context provider
    window.location.href = '/login';
  };

  const hasPermission = (slug) => {
    if (!user) return false;
    // Super Admin has all permissions
    if (user.role_name === 'Super Admin') return true;
    return permissions.includes(slug);
  };

  const value = {
    user,
    permissions,
    loading,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

