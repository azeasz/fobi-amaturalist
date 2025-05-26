import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      // Get raw response first
      const rawText = await response.text();
      console.log('Raw response:', rawText);

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        setStatus({
          type: 'error',
          message: 'Terjadi kesalahan saat memproses response dari server'
        });
        return;
      }

      if (response.ok) {
        setStatus({
          type: 'success',
          message: data.message
        });
        setEmail('');
      } else {
        setStatus({
          type: 'error',
          message: data.message || 'Terjadi kesalahan'
        });
      }
    } catch (err) {
      console.error('Error:', err);
      setStatus({
        type: 'error',
        message: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
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
            <h2>Lupa Password</h2>
            <p className="auth-subtitle">
              Masukkan email Anda untuk menerima link reset password
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                placeholder="Masukkan email Anda"
                disabled={loading}
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
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
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

export default ForgotPassword;