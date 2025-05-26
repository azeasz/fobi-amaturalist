import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { apiFetch } from '../../utils/api';

const Logout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useUser();
  const from = location.state?.from?.pathname || '/';

  // Fungsi untuk membersihkan cache
  const clearBrowserCache = async () => {
    if ('caches' in window) {
      try {
        const keys = await window.caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      } catch (err) {
        console.error('Error clearing cache:', err);
      }
    }
  };

  // Fungsi untuk membersihkan semua storage
  const clearAllStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(cookie => {
      document.cookie = cookie
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        clearAllStorage();
        await clearBrowserCache();
        window.location.href = from;
        return;
      }

      // Attempt to logout from server
      const response = await apiFetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('Logout successful');
      }

    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      // Cleanup regardless of server response
      setUser(null);
      clearAllStorage();
      await clearBrowserCache();
      
      // Use window.location for complete page refresh
      window.location.href = from;
    }
  };

  // Auto-logout jika komponen di-mount
  useEffect(() => {
    handleLogout();
  }, []);

  return (
    <div className="logout-container">
      <h2>Logging out...</h2>
      <p>Please wait while we securely log you out.</p>
    </div>
  );
};

export default Logout;