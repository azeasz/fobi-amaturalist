import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const UserContext = createContext({
  user: null,
  setUser: () => {},
  updateTotalObservations: () => {},
  isLoading: false
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    // Force refresh untuk clear cache
    window.location.href = '/';
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Periksa token expiry
    const tokenExpiry = localStorage.getItem('auth_expiry');
    
    if (tokenExpiry) {
      const now = new Date();
      const expiryDate = new Date(tokenExpiry);
      
      // Jika token telah kedaluwarsa, logout
      if (now > expiryDate) {
        console.log('Token telah kedaluwarsa');
        handleLogout();
        return;
      }
    }

    try {
      const response = await apiFetch('/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Handle expired/invalid token
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      if (response.data) {
        const totalObservations = await fetchUserData(response.data.id);
        setUser({
          ...response.data,
          totalObservations
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    
    // Cek token setiap 30 menit
    const checkInterval = 1800000; // 30 menit
    
    // Set interval untuk cek token
    const interval = setInterval(checkAuth, checkInterval);
    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async (userId) => {
    try {
      const response = await apiFetch(`/user-total-observations/${userId}`);
      if (response.ok) {
        const data = await response.json();
        return data.userTotalObservations;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return 0;
    }
  };

  const updateTotalObservations = async () => {
    if (user?.id) {
      try {
        const total = await fetchUserData(user.id);
        setUser(prev => ({
          ...prev,
          totalObservations: total
        }));
        localStorage.setItem('totalObservations', total.toString());
        return total;
      } catch (error) {
        console.error('Error updating observations:', error);
      }
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      handleLogout();
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      logout, 
      isLoading, 
      checkAuth,
      updateTotalObservations 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);