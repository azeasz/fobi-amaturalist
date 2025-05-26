import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import './Auth.css';
import burungnesiaBirdIcon from '../../assets/icon/icon.png';
import kupunesiaIcon from '../../assets/icon/kupnes.png';

const PlatformVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, platform } = location.state || {};
  const [verificationStatus, setVerificationStatus] = useState({
    loading: false,
    success: false,
    error: ''
  });

  const handleResendVerification = async () => {
    setVerificationStatus({ loading: true, success: false, error: '' });
    
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/resend-platform-verification/${platform}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengirim ulang email verifikasi');
      }

      setVerificationStatus({
        loading: false,
        success: true,
        error: ''
      });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setVerificationStatus(prev => ({ ...prev, success: false }));
      }, 5000);

    } catch (err) {
      setVerificationStatus({
        loading: false,
        success: false,
        error: err.message
      });
    }
  };

  const getPlatformInfo = () => {
    switch (platform) {
      case 'burungnesia':
        return {
          name: 'Burungnesia',
          icon: '/icon.png',
          color: 'bg-blue-500'
        };
      case 'kupunesia':
        return {
          name: 'Kupunesia',
          icon: '/kupnes.png',
          color: 'bg-purple-500'
        };
      default:
        return {
          name: 'Platform',
          icon: '📱',
          color: 'bg-gray-500'
        };
    }
  };

  const platformInfo = getPlatformInfo();

  return (
    <div className="auth-page bg-[#121212] text-[#e0e0e0] min-h-screen">
      <div className="auth-container">
        <div className="auth-card bg-[#1e1e1e] border border-[#444] shadow-lg">
          <div className="auth-header">
            <h2 className="text-[#e0e0e0]">Verifikasi {platformInfo.name}</h2>
            <p className="auth-subtitle text-[#b0b0b0]">Silakan periksa email Anda</p>
          </div>

          <div className="verification-info">
            <div className="verification-step bg-[#2c2c2c] border border-[#444] rounded-lg p-4 mb-4">
              <div className={`step-number ${platformInfo.color} flex items-center justify-center`}>
                {platform === 'default' ? (
                  <span>{platformInfo.icon}</span>
                ) : (
                  <img 
                    src={platformInfo.icon}
                    alt={`${platformInfo.name} Icon`}
                    className="w-6 h-6"
                  />
                )}
              </div>
              <div className="step-content">
                <h3 className="text-[#e0e0e0]">Email {platformInfo.name}</h3>
                <p className="text-[#b0b0b0]">Link verifikasi telah dikirim ke: <strong className="text-[#e0e0e0]">{email}</strong></p>
                <p className="text-[#b0b0b0]">Silakan klik link dalam email untuk menautkan akun {platformInfo.name} Anda.</p>
              </div>
            </div>

            <div className="verification-actions">
              <button 
                onClick={() => window.location.href = `mailto:${email}`}
                className="auth-button secondary bg-[#2c2c2c] text-[#e0e0e0] border border-[#444] hover:bg-[#3c3c3c]"
              >
                <span className="button-icon">📧</span>
                Buka Email
              </button>
              <button 
                onClick={() => navigate('/sync-accounts')}
                className="auth-button bg-[#1a73e8] text-white hover:bg-[#1565c0]"
              >
                <span className="button-icon">⚙️</span>
                Kembali ke Pengaturan
              </button>
            </div>

            <div className="verification-help">
              <p className="text-[#b0b0b0]">Tidak menerima email? Periksa folder spam atau</p>
              <button 
                onClick={handleResendVerification}
                className="text-button text-[#1a73e8] hover:text-[#4285f4]"
                disabled={verificationStatus.loading}
              >
                {verificationStatus.loading ? 'Mengirim...' : 'kirim ulang email verifikasi'}
              </button>

              {verificationStatus.success && (
                <div className="success-message bg-[#133312] border border-[#2b4c2b] text-[#4ade80] p-3 rounded mt-2">
                  Email verifikasi telah dikirim ulang!
                </div>
              )}

              {verificationStatus.error && (
                <div className="error-message bg-[#3a0f0f] border border-[#5e1a1a] text-[#f87171] p-3 rounded mt-2">
                  {verificationStatus.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformVerification; 