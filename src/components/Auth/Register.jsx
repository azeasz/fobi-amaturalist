import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';
import { apiFetch } from '../../utils/api';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    uname: '',
    password: '',
    phone: '',
    organization: '',
    burungnesia_email: '',
    kupunesia_email: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Khusus untuk nomor telepon, terapkan batasan 14 digit dan hanya angka
    if (name === 'phone') {
      // Hanya mengizinkan digit dan batasi maksimal 14 karakter
      const sanitizedValue = value.replace(/\D/g, '').slice(0, 14);
      setFormData({ ...formData, [name]: sanitizedValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Hapus pesan error saat user mengetik
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    // Validasi tambahan sebelum mengirim data ke server
    let validationErrors = {};
    
    // Validasi format telepon
    if (formData.phone) {
      if (formData.phone.length < 10) {
        validationErrors.phone = 'Nomor telepon minimal 10 digit';
      } else if (formData.phone.length > 14) {
        validationErrors.phone = 'Nomor telepon maksimal 14 digit';
      } else if (!/^\d+$/.test(formData.phone)) {
        validationErrors.phone = 'Nomor telepon hanya boleh berisi angka';
      }
    }
    
    // Jika ada error validasi, tampilkan dan batalkan pengiriman
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await apiFetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        },
        body: JSON.stringify(formData),
      });

      // Debug response headers
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Get raw response text first
      const rawText = await response.text();
      console.log('Raw response:', rawText);

      // Try parsing manually
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('Parse error details:', parseError);
        throw new Error(`Failed to parse response: ${rawText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else if (data.error) {
          // Handle specific error messages
          switch (data.error) {
            case 'EMAIL_EXISTS':
              setErrors({ email: 'Email sudah terdaftar' });
              break;
            case 'USERNAME_EXISTS':
              setErrors({ uname: 'Username sudah digunakan' });
              break;
            default:
              setErrors({ general: data.error || 'Terjadi kesalahan saat mendaftar' });
          }
        }
        return;
      }

      // Registrasi berhasil
      setSuccessMessage(
        `Pendaftaran berhasil! Silakan cek email Anda di ${formData.email} untuk verifikasi akun.
         ${formData.burungnesia_email ? '\nEmail Burungnesia akan diverifikasi secara terpisah.' : ''}
         ${formData.kupunesia_email ? '\nEmail Kupunesia akan diverifikasi secara terpisah.' : ''}`
      );
      
      // Tunggu sebentar sebelum redirect
      setTimeout(() => {
        navigate('/verification-pending', { 
          state: { 
            email: formData.email,
            hasBurungnesia: !!formData.burungnesia_email,
            hasKupunesia: !!formData.kupunesia_email
          }
        });
      }, 3000);

    } catch (err) {
      console.error('Error during registration:', err);
      setErrors({
        general: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] mt-5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-[#1e1e1e] p-8 rounded-lg shadow-lg border border-[#444]">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">
            Daftar Akun Talinara
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Bergabunglah dengan Komunitas Citizen Science Indonesia
          </p>
        </div>

        {successMessage && (
          <div className="rounded-md bg-green-900 bg-opacity-20 p-4 border border-green-800">
            <p className="text-sm text-green-400">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="fname" className="block text-sm font-medium text-gray-300">
                Nama Depan <span className="text-red-500">*</span>
              </label>
              <input
                id="fname"
                type="text"
                name="fname"
                value={formData.fname}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
              />
              {errors.fname && <p className="mt-1 text-sm text-red-400">{errors.fname}</p>}
            </div>

            <div>
              <label htmlFor="lname" className="block text-sm font-medium text-gray-300">
                Nama Belakang <span className="text-red-500">*</span>
              </label>
              <input
                id="lname"
                type="text"
                name="lname"
                value={formData.lname}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="uname" className="block text-sm font-medium text-gray-300">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                id="uname"
                type="text"
                name="uname"
                value={formData.uname}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
              />
              {errors.uname && <p className="mt-1 text-sm text-red-400">{errors.uname}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                Nomor Telepon <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                maxLength="14"
                placeholder="Contoh: 081234567890"
                className="mt-1 block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
              <p className="mt-1 text-xs text-gray-400">
                • Masukkan nomor telepon aktif (10-14 digit)
                <br />
                • Gunakan format Indonesia, misal: 08123456789
                <br />
                • Tanpa awalan +62, spasi, atau tanda hubung
              </p>
            </div>

            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-300">
                Organisasi
              </label>
              <input
                id="organization"
                type="text"
                name="organization"
                value={formData.organization}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
              />
            </div>

            <div>
              <label htmlFor="burungnesia_email" className="block text-sm font-medium text-gray-300">
                Email Burungnesia (Opsional)
              </label>
              <input
                id="burungnesia_email"
                type="email"
                name="burungnesia_email"
                value={formData.burungnesia_email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
              />
            </div>

            <div>
              <label htmlFor="kupunesia_email" className="block text-sm font-medium text-gray-300">
                Email Kupunesia (Opsional)
              </label>
              <input
                id="kupunesia_email"
                type="email"
                name="kupunesia_email"
                value={formData.kupunesia_email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
              />
            </div>
          </div>

          {errors.general && (
            <div className="rounded-md bg-red-900 bg-opacity-20 p-4 border border-red-800">
              <p className="text-sm text-red-400">{errors.general}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              'Daftar'
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Sudah punya akun?{' '}
              <Link to="/login" className="font-medium text-[#1a73e8] hover:text-[#4285f4]">
                Masuk di sini
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;