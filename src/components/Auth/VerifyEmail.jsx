import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import './Auth.css';

const VerifyEmail = () => {
  const { token, tokenType } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState(''); // Untuk menyimpan email user
  const [isResending, setIsResending] = useState(false); // State untuk loading saat resend

  useEffect(() => {
    if (!token || !tokenType) {
      setStatus('error');
      setMessage('Token atau tipe token tidak valid.');
      return;
    }
    
    // Ambil email dari URL jika ada
    const params = new URLSearchParams(location.search);
    if (params.get('email')) {
      setUserEmail(params.get('email'));
    }
    
    verifyEmail();
  }, [token, tokenType, location]);

  // Function untuk mengirim ulang verifikasi
  const handleResendVerification = async () => {
    if (!userEmail) {
      setMessage('Email tidak tersedia untuk pengiriman ulang verifikasi.');
      return;
    }
    
    setIsResending(true);
    
    try {
      const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
        ? 'https://amaturalist.com/api'
        : 'http://localhost:8000/api';
        
      const response = await fetch(`${baseURL}/resend-verification`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('Email verifikasi telah dikirim ulang. Silakan cek inbox dan folder spam Anda.');
        // Tampilkan pesan selama 3 detik lalu redirect ke login
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              needVerification: true,
              email: userEmail,
              message: 'Email verifikasi telah dikirim ulang'
            }
          });
        }, 3000);
      } else {
        setMessage(data.message || data.error || 'Gagal mengirim ulang email verifikasi.');
      }
    } catch (err) {
      console.error('Error resending verification:', err);
      setMessage('Terjadi kesalahan saat mengirim ulang verifikasi. Silakan coba lagi nanti.');
    } finally {
      setIsResending(false);
    }
  };

  const verifyEmail = async () => {
    try {
      console.log(`Attempting to verify email with token: ${token} and type: ${tokenType}`);
      
      // Gunakan fetch langsung daripada apiFetch untuk mencegah penambahan header Authorization otomatis
      // yang menyebabkan error 401 Unauthorized karena verifikasi email adalah endpoint publik
      const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
        ? 'https://amaturalist.com/api'
        : 'http://localhost:8000/api';
        
      const response = await fetch(`${baseURL}/verify-email/${token}/${tokenType}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Verification response received:', response);
      
      if (!response.ok) {
        // Tangani error HTTP
        const errorText = await response.text();
        console.error('Verification failed with status:', response.status, errorText);
        throw new Error(`Verifikasi gagal dengan status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Verification data:', data);

      // Jika mendapat email dalam respons, simpan untuk digunakan nanti
      if (data.email) {
        setUserEmail(data.email);
      }

      if (data.success) {
        setStatus('success');
        setMessage(getSuccessMessage(tokenType));
        
        // Jika ini verifikasi email utama FOBI
        if (tokenType === 'email_verification_token') {
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                verificationSuccess: true,
                message: 'Email berhasil diverifikasi. Silakan login.'
              }
            });
          }, 1500);
        } else {
          // Untuk verifikasi Burungnesia/Kupunesia, kembali ke dashboard
          setTimeout(() => {
            navigate('/', { 
              state: { 
                verificationSuccess: true,
                message: getSuccessMessage(tokenType)
              }
            });
          }, 1500);
        }
      } else {
        setStatus('error');
        setMessage(data.message || data.error || 'Verifikasi email gagal. Token mungkin sudah kadaluarsa.');
      }
    } catch (err) {
      console.error('Error during email verification:', err);
      setStatus('error');
      setMessage('Terjadi kesalahan saat memverifikasi email. Silakan coba lagi nanti atau hubungi dukungan jika masalah berlanjut.');
    }
  };

  const getSuccessMessage = (type) => {
    switch (type) {
      case 'email_verification_token':
        return 'Email Talinara Anda berhasil diverifikasi!';
      case 'burungnesia_email_verification_token':
        return 'Email Burungnesia Anda berhasil diverifikasi! Data Burungnesia Anda akan segera tersinkronisasi.';
      case 'kupunesia_email_verification_token':
        return 'Email Kupunesia Anda berhasil diverifikasi! Data Kupunesia Anda akan segera tersinkronisasi.';
      default:
        return 'Email berhasil diverifikasi!';
    }
  };

  return (
    <div className="auth-page bg-[#121212] text-[#e0e0e0] min-h-screen">
      <div className="auth-container">
        <div className="auth-card bg-[#1e1e1e] border border-[#444] shadow-lg">
          <div className="auth-header">
            <h2 className="text-[#e0e0e0]">Verifikasi Email</h2>
          </div>

          <div className={`verification-status ${status}`}>
            {status === 'verifying' && (
              <div className="verification-loading">
                <div className="spinner border-[#1a73e8]"></div>
                <p className="text-[#b0b0b0]">Memverifikasi email Anda...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="verification-success bg-[#133312] border border-[#2b4c2b] rounded-lg p-4">
                <div className="success-icon text-green-400">✓</div>
                <h3 className="text-[#e0e0e0]">Verifikasi Berhasil!</h3>
                <p className="text-[#b0b0b0]">{message}</p>
              </div>
            )}

            {status === 'error' && (
              <div className="verification-error bg-[#3a0f0f] border border-[#5e1a1a] rounded-lg p-4">
                <div className="error-icon text-red-400">✕</div>
                <h3 className="text-[#e0e0e0]">Verifikasi Gagal</h3>
                <p className="text-[#b0b0b0]">{message}</p>
                
                <div className="flex flex-col gap-2 mt-4">
                  {userEmail && (
                    <button 
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="flex items-center justify-center bg-[#1a73e8] hover:bg-[#1565c0] text-white py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Mengirim...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Kirim Ulang Verifikasi
                        </>
                      )}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => navigate('/login')}
                    className="bg-[#323232] hover:bg-[#404040] text-white py-2 px-4 rounded"
                  >
                    Kembali ke Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;