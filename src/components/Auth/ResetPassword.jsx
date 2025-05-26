import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import './Auth.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Ambil token dan email dari URL saat komponen dimuat
  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    
    if (!token || !email) {
      setStatus({
        type: 'error',
        message: 'Link reset password tidak valid'
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== passwordConfirmation) {
      setStatus({
        type: 'error',
        message: 'Password dan konfirmasi password tidak sama'
      });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await apiFetch('/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: searchParams.get('token'),
          email: searchParams.get('email'),
          password: password,
          password_confirmation: passwordConfirmation
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mereset password');
      }

      setStatus({
        type: 'success',
        message: 'Password berhasil direset. Silakan login dengan password baru Anda.'
      });

      // Redirect ke halaman login setelah 3 detik
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Reset Password</h2>
            <p className="auth-subtitle">
              Masukkan password baru Anda
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">Password Baru</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
                minLength="6"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password_confirmation">Konfirmasi Password</label>
              <input
                id="password_confirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                className="auth-input"
                minLength="6"
                placeholder="Masukkan ulang password"
              />
            </div>

            {status.message && (
              <p className={`message ${status.type}`}>
                {status.message}
              </p>
            )}

            <button 
              type="submit" 
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Reset Password'}
            </button>

            <div className="auth-footer">
              <Link to="/login" className="back-to-login">
                ← Kembali ke Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;