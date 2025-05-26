import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Mail, AlertTriangle, Loader2, CheckCircle, Inbox, ExternalLink } from 'lucide-react';
import './Auth.css';

const VerificationPending = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, hasBurungnesia, hasKupunesia } = location.state || {};
  const [resendStatus, setResendStatus] = useState({
    loading: false,
    success: false,
    error: ''
  });
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isCountdownActive, setIsCountdownActive] = useState(false);

  // Periksa status verifikasi saat komponen dimuat
  useEffect(() => {
    if (email) {
      fetchVerificationStatus();
    }
  }, [email]);

  // Set interval untuk auto-refresh status verifikasi setiap 30 detik
  useEffect(() => {
    let intervalId;

    if (email) {
      intervalId = setInterval(() => {
        fetchVerificationStatus();
      }, 30000); // Cek setiap 30 detik
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [email]);

  // Effect untuk countdown timer
  useEffect(() => {
    let countdownId;
    
    if (isCountdownActive && timeLeft > 0) {
      countdownId = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsCountdownActive(false);
      setTimeLeft(30);
    }
    
    return () => {
      if (countdownId) clearInterval(countdownId);
    };
  }, [isCountdownActive, timeLeft]);

  const fetchVerificationStatus = async () => {
    if (!email) return;
    
    try {
      console.log('Checking verification status for:', email);
      // Gunakan fetch langsung, bukan apiFetch
      const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
        ? 'https://amaturalist.com/api'
        : 'http://localhost:8000/api';
      
      const response = await fetch(`${baseURL}/verification-status`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      if (!response.ok) {
        console.error('Error fetching verification status:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('Verification status response:', data);
      
      if (data.success && data.verificationStatus) {
        setVerificationStatus(data.verificationStatus);
        
        // Cek jika semua sudah terverifikasi untuk navigasi otomatis
        const allVerified = data.verificationStatus.fobi && 
          (!data.verificationStatus.burungnesia || data.verificationStatus.burungnesia) && 
          (!data.verificationStatus.kupunesia || data.verificationStatus.kupunesia);
          
        if (allVerified) {
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                verificationSuccess: true,
                message: 'Email berhasil diverifikasi. Silakan login.'
              }
            });
          }, 3000);
        }
      }
    } catch (err) {
      console.error('Error fetching verification status:', err);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setResendStatus({ 
        loading: false, 
        success: false, 
        error: 'Email tidak ditemukan. Silakan kembali ke halaman register.' 
      });
      return;
    }

    console.log('Attempting to resend verification email to:', email);
    setResendStatus({ loading: true, success: false, error: '' });
    
    try {
      // Gunakan fetch langsung, bukan apiFetch
      const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
        ? 'https://amaturalist.com/api'
        : 'http://localhost:8000/api';
        
      const response = await fetch(`${baseURL}/resend-verification`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Gagal mengirim ulang email verifikasi');
      }
      
      const data = await response.json();
      console.log('Resend verification response:', data);

      if (!data.success) {
        throw new Error(data.message || data.error || 'Gagal mengirim ulang email verifikasi');
      }

      setResendStatus({
        loading: false,
        success: true,
        error: ''
      });

      // Update verifikasi status jika tersedia
      if (data.verificationStatus) {
        setVerificationStatus(data.verificationStatus);
      }

      // Mulai countdown untuk resend berikutnya
      setTimeLeft(30);
      setIsCountdownActive(true);

      // Reset success message after 5 seconds
      setTimeout(() => {
        setResendStatus(prev => ({ ...prev, success: false }));
      }, 5000);

    } catch (err) {
      console.error('Error during resend verification:', err);
      setResendStatus({
        loading: false,
        success: false,
        error: err.message || 'Terjadi kesalahan saat mengirim ulang email verifikasi'
      });
    }
  };

  const handleContinueToLogin = () => {
    navigate('/login', { 
      search: `?needVerification=true&email=${encodeURIComponent(email)}`,
      state: { 
        needVerification: true,
        email: email
      }
    });
  };

  // Jika tidak ada email (misalnya saat menyegarkan halaman), tampilkan pesan error
  if (!email) {
    return (
      <div className="auth-page bg-[#121212] text-[#e0e0e0] min-h-screen">
        <div className="auth-container">
          <div className="auth-card bg-[#1e1e1e] border border-[#444] shadow-lg">
            <div className="auth-header">
              <h2 className="text-[#e0e0e0]">Error</h2>
            </div>
            <div className="verification-error bg-[#3a0f0f] border border-[#5e1a1a] rounded-lg p-4">
              <div className="error-icon text-red-400">✕</div>
              <h3 className="text-[#e0e0e0]">Informasi Tidak Lengkap</h3>
              <p className="text-[#b0b0b0]">Tidak dapat menemukan informasi email untuk verifikasi.</p>
              <Link to="/register" className="auth-button bg-[#1a73e8] hover:bg-[#1565c0] text-white py-2 px-4 rounded mt-4 inline-block">
                Kembali ke Pendaftaran
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cek jika semua email sudah terverifikasi
  const allVerified = verificationStatus && 
    verificationStatus.fobi && 
    (!verificationStatus.burungnesia || verificationStatus.burungnesia) && 
    (!verificationStatus.kupunesia || verificationStatus.kupunesia);

  return (
    <div className="auth-page bg-[#121212] text-[#e0e0e0] min-h-screen">
      <div className="auth-container">
        <div className="auth-card bg-[#1e1e1e] border border-[#444] shadow-lg">
          <div className="auth-header">
            <h2 className="text-[#e0e0e0]">Verifikasi Email</h2>
            <p className="auth-subtitle text-[#b0b0b0]">Silakan periksa email Anda</p>
          </div>

          {/* Tampilkan pesan sukses jika semua terverifikasi */}
          {allVerified && (
            <div className="mb-6 p-4 bg-[#133312] border border-[#2b4c2b] rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-green-400 font-medium">Verifikasi Berhasil!</h3>
                  <p className="text-[#b0b0b0] mt-1">
                    Semua email telah berhasil diverifikasi. Anda dapat melanjutkan proses login.
                  </p>
                  <button 
                    onClick={() => navigate('/login')}
                    className="mt-2 bg-green-700 hover:bg-green-600 text-white py-1 px-3 rounded-md flex items-center text-sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Lanjut ke Login
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="verification-info">
            {/* Status Verifikasi */}
            {verificationStatus && (
              <div className="mb-4 bg-[#2c2c2c] border border-[#444] rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[#e0e0e0]">Status Verifikasi:</h3>
                  <button 
                    onClick={fetchVerificationStatus}
                    className="text-xs text-[#1a73e8] hover:text-[#4285f4] flex items-center"
                  >
                    <Loader2 className="h-3 w-3 mr-1" />
                    Cek Status
                  </button>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    {verificationStatus.fobi 
                      ? <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                      : <AlertTriangle className="h-4 w-4 text-amber-400 mr-2" />
                    }
                    <span className={`${verificationStatus.fobi ? 'text-green-400' : 'text-amber-400'}`}>
                      Email FOBI: {verificationStatus.fobi ? 'Sudah Terverifikasi' : 'Belum Terverifikasi'}
                    </span>
                  </li>
                  {verificationStatus.burungnesia !== null && (
                    <li className="flex items-center">
                      {verificationStatus.burungnesia 
                        ? <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                        : <AlertTriangle className="h-4 w-4 text-amber-400 mr-2" />
                      }
                      <span className={`${verificationStatus.burungnesia ? 'text-green-400' : 'text-amber-400'}`}>
                        Email Burungnesia: {verificationStatus.burungnesia ? 'Sudah Terverifikasi' : 'Belum Terverifikasi'}
                      </span>
                    </li>
                  )}
                  {verificationStatus.kupunesia !== null && (
                    <li className="flex items-center">
                      {verificationStatus.kupunesia 
                        ? <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                        : <AlertTriangle className="h-4 w-4 text-amber-400 mr-2" />
                      }
                      <span className={`${verificationStatus.kupunesia ? 'text-green-400' : 'text-amber-400'}`}>
                        Email Kupunesia: {verificationStatus.kupunesia ? 'Sudah Terverifikasi' : 'Belum Terverifikasi'}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Langkah Verifikasi */}
            <div className="verification-step bg-[#2c2c2c] border border-[#444] rounded-lg p-4 mb-4">
              <div className="step-number bg-[#1a73e8] text-white">1</div>
              <div className="step-content">
                <h3 className="text-[#e0e0e0]">Email Talinara</h3>
                <p className="text-[#b0b0b0]">Link verifikasi telah dikirim ke: <strong className="text-[#e0e0e0]">{email}</strong></p>
                <p className="text-[#b0b0b0]">Silakan klik link dalam email untuk mengaktifkan akun Anda.</p>
              </div>
            </div>

            {(hasBurungnesia || hasKupunesia) && (
              <div className="verification-step bg-[#2c2c2c] border border-[#444] rounded-lg p-4 mb-4">
                <div className="step-number bg-[#1a73e8] text-white">2</div>
                <div className="step-content">
                  <h3 className="text-[#e0e0e0]">Integrasi Akun</h3>
                  {hasBurungnesia && (
                    <div className="integration-item">
                      <span className="integration-icon">
                        <img 
                          src="/icon.png"
                          alt="Burungnesia Icon"
                          className="w-6 h-6 inline-block"
                        />
                      </span>
                      <p className="text-[#b0b0b0]">Email verifikasi Burungnesia akan dikirim setelah verifikasi Talinara selesai</p>
                    </div>
                  )}
                  {hasKupunesia && (
                    <div className="integration-item">
                      <span className="integration-icon">
                        <img 
                          src="/kupnes.png"
                          alt="Kupunesia Icon"
                          className="w-6 h-6 inline-block"
                        />
                      </span>
                      <p className="text-[#b0b0b0]">Email verifikasi Kupunesia akan dikirim setelah verifikasi Talinara selesai</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="verification-actions">
              <button 
                onClick={() => window.location.href = `mailto:${email}`}
                className="auth-button secondary bg-[#2c2c2c] text-[#e0e0e0] border border-[#444] hover:bg-[#3c3c3c] flex items-center"
              >
                <Inbox className="h-4 w-4 mr-2" />
                Buka Email
              </button>
              {verificationStatus && !verificationStatus.fobi ? (
                <button
                  onClick={handleContinueToLogin}
                  className="auth-button bg-[#1a73e8] text-white hover:bg-[#1565c0] flex items-center"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Bantuan Verifikasi
                </button>
              ) : (
                <Link to="/login" className="auth-button bg-[#1a73e8] text-white hover:bg-[#1565c0] flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Lanjut ke Login
                </Link>
              )}
            </div>

            <div className="verification-help">
              <p className="text-[#b0b0b0]">Tidak menerima email? Periksa folder spam atau</p>
              <button 
                onClick={handleResendVerification}
                className="text-button text-[#1a73e8] hover:text-[#4285f4] flex items-center mx-auto"
                disabled={resendStatus.loading || isCountdownActive}
              >
                {resendStatus.loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-1" />
                    <span>Mengirim...</span>
                  </>
                ) : isCountdownActive ? (
                  <>
                    <span>Kirim ulang dalam {timeLeft} detik</span>
                  </>
                ) : (
                  <>
                    <span>Kirim ulang email verifikasi</span>
                  </>
                )}
              </button>

              {resendStatus.success && (
                <div className="success-message bg-[#133312] border border-[#2b4c2b] text-[#4ade80] p-3 rounded mt-2">
                  <CheckCircle className="h-4 w-4 inline-block mr-1" />
                  Email verifikasi telah dikirim ulang!
                </div>
              )}

              {resendStatus.error && (
                <div className="error-message bg-[#3a0f0f] border border-[#5e1a1a] text-[#f87171] p-3 rounded mt-2">
                  <AlertTriangle className="h-4 w-4 inline-block mr-1" />
                  {resendStatus.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;