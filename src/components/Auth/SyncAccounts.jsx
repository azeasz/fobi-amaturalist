import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faCheck, faTimes, faArrowLeft, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@mui/material/Tooltip';
import Modal from '@mui/material/Modal';
import burungnesiaLogo from '../../assets/icon/icon.png';
import kupunesiaLogo from '../../assets/icon/kupnes.png';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const SyncAccountsContent = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [syncStatus, setSyncStatus] = useState({
    burungnesia: {
      synced: false,
      email: '',
      loading: false,
      error: ''
    },
    kupunesia: {
      synced: false,
      email: '',
      loading: false,
      error: ''
    }
  });
  const [syncForm, setSyncForm] = useState({
    burungnesia: {
      email: '',
      password: '',
      showPassword: false,
      recaptcha: null
    },
    kupunesia: {
      email: '',
      password: '',
      showPassword: false,
      recaptcha: null
    }
  });
  const [openModal, setOpenModal] = useState(false);
  const [platformToUnlink, setPlatformToUnlink] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    // Load reCAPTCHA v3 script
    const loadRecaptchaScript = () => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${import.meta.env.VITE_RECAPTCHA_SITE_KEY}`;
      script.async = true;
      document.body.appendChild(script);
    };
    loadRecaptchaScript();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil data profil');
      }

      const data = await response.json();
      if (data.success) {
        setUserData(data.data);
        setSyncStatus(prev => ({
          burungnesia: {
            ...prev.burungnesia,
            synced: !!data.data.burungnesia_email_verified_at,
            email: data.data.burungnesia_email || ''
          },
          kupunesia: {
            ...prev.kupunesia,
            synced: !!data.data.kupunesia_email_verified_at,
            email: data.data.kupunesia_email || ''
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleSync = async (platform) => {
    setSyncStatus(prev => ({
      ...prev,
      [platform]: { ...prev[platform], loading: true, error: '' }
    }));

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha();
      const token = localStorage.getItem('jwt_token');
      
      // Log data yang akan dikirim untuk debugging
      console.log('Sending data:', {
        email: syncForm[platform].email,
        password: syncForm[platform].password,
        recaptcha_token: recaptchaToken
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/sync-platform-email/${platform}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: syncForm[platform].email,
          password: syncForm[platform].password,
          recaptcha_token: recaptchaToken
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mensinkronkan akun');
      }

      if (data.success) {
        navigate('/platform-verification', {
          state: {
            email: syncForm[platform].email,
            platform: platform
          }
        });
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        [platform]: { 
          ...prev[platform], 
          error: error.message, 
          loading: false 
        }
      }));
    }
  };

  const UnlinkConfirmationModal = ({ platform, isOpen, onClose, onConfirm }) => {
    if (!platform) return null;
    
    const platformName = platform === 'burungnesia' ? 'Burungnesia' : 'Kupunesia';
    
    return (
      <Modal
        open={isOpen}
        onClose={onClose}
        className="flex items-center justify-center"
      >
        <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-xl max-w-md mx-4 border border-[#444] text-[#e0e0e0]">
          <h3 className="text-lg font-semibold mb-4">Konfirmasi Pelepasan Akun</h3>
          <p className="text-[#b0b0b0] mb-4">
            Melepaskan akun tidak akan menghapus akun {platformName} Anda, 
            tapi Anda akan kehilangan stats observasi dari {platformName} saat ini.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#2c2c2c] text-[#e0e0e0] border border-[#444] rounded hover:bg-[#3c3c3c]"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
            >
              Ya, Lepaskan
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  const confirmUnlink = async () => {
    setOpenModal(false);
    setPlatformToUnlink(null);

    if (!platformToUnlink) return;

    setSyncStatus(prev => ({
      ...prev,
      [platformToUnlink]: { ...prev[platformToUnlink], loading: true, error: '' }
    }));

    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/unlink-platform-account/${platformToUnlink}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal melepaskan akun');
      }

      setSyncForm(prev => ({
        ...prev,
        [platformToUnlink]: {
          email: '',
          password: '',
          showPassword: false
        }
      }));

      setSyncStatus(prev => ({
        ...prev,
        [platformToUnlink]: {
          synced: false,
          email: '',
          loading: false,
          error: ''
        }
      }));

      await fetchUserData();

    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        [platformToUnlink]: {
          ...prev[platformToUnlink],
          error: error.message,
          loading: false
        }
      }));
    }
  };

  const renderPlatformForm = (platform) => {
    const isLoading = syncStatus[platform].loading;
    const error = syncStatus[platform].error;
    const isSynced = syncStatus[platform].synced;
    const formData = syncForm[platform];

    const handleUnlink = () => {
      setPlatformToUnlink(platform);
      setOpenModal(true);
    };

    if (isSynced) {
      return (
        <div className="bg-[#133312] p-4 rounded-lg border border-[#2b4c2b]">
          <div className="flex items-center text-green-400">
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            <div>
              <p className="font-medium text-[#e0e0e0]">Akun Tersinkronisasi</p>
              <p className="text-sm text-[#b0b0b0]">{syncStatus[platform].email}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Tooltip title={`Melepaskan akun akan menghilangkan stats observasi dari ${platform === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'}`} arrow>
              <button
                onClick={handleUnlink}
                className="text-sm text-red-400 hover:text-red-300 px-3 py-1 border border-red-800 rounded hover:bg-[#3a1a1a]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <FontAwesomeIcon icon={faSync} spin className="mr-2" />
                ) : 'Unlink'}
              </button>
            </Tooltip>
          </div>
          {error && (
            <div className="mt-2 text-red-400 text-sm">
              <FontAwesomeIcon icon={faTimes} className="mr-2" />
              {error}
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#e0e0e0] mb-2">
            Email {platform === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'}
          </label>
          <input
            type="email"
            placeholder={`Masukkan email ${platform === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'} Anda`}
            className="w-full p-2 bg-[#2c2c2c] border border-[#444] rounded text-[#e0e0e0] focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent"
            value={formData.email}
            onChange={(e) => setSyncForm(prev => ({
              ...prev,
              [platform]: { ...prev[platform], email: e.target.value }
            }))}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[#e0e0e0] mb-2">
            Password
          </label>
          <Tooltip title="Gunakan password yang sama dengan akun Talinara(Fobi) Anda" arrow>
            <div className="relative">
              <input
                type={formData.showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                className="w-full p-2 bg-[#2c2c2c] border border-[#444] rounded text-[#e0e0e0] focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent"
                value={formData.password}
                onChange={(e) => setSyncForm(prev => ({
                  ...prev,
                  [platform]: { ...prev[platform], password: e.target.value }
                }))}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#999]"
                onClick={() => setSyncForm(prev => ({
                  ...prev,
                  [platform]: { ...prev[platform], showPassword: !prev[platform].showPassword }
                }))}
              >
                <FontAwesomeIcon icon={formData.showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </Tooltip>
        </div>

        <button
          onClick={() => handleSync(platform)}
          className="w-full bg-[#1a73e8] text-white px-4 py-2 rounded hover:bg-[#1565c0] disabled:opacity-50 disabled:bg-[#444]"
          disabled={isLoading || !formData.email || !formData.password}
        >
          {isLoading ? (
            <FontAwesomeIcon icon={faSync} spin className="mr-2" />
          ) : 'Sinkronkan Akun'}
        </button>

        {error && (
          <div className="mt-2 text-red-400 text-sm">
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#121212] min-h-screen text-[#e0e0e0]">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="text-[#e0e0e0] hover:text-white mr-4"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="text-2xl font-bold text-[#e0e0e0]">Sinkronisasi Akun</h1>
      </div>

      {/* Burungnesia Section */}
      <div className="mb-8 p-6 border border-[#444] rounded-lg shadow-sm bg-[#1e1e1e]">
        <div className="flex items-center mb-4">
          <img 
            src={burungnesiaLogo} 
            alt="Burungnesia Logo" 
            className="w-8 h-8 mr-2 object-contain"
          />
          <h2 className="text-xl font-semibold text-[#e0e0e0]">Burungnesia</h2>
        </div>
        {renderPlatformForm('burungnesia')}
      </div>

      {/* Kupunesia Section */}
      <div className="p-6 border border-[#444] rounded-lg shadow-sm bg-[#1e1e1e]">
        <div className="flex items-center mb-4">
          <img 
            src={kupunesiaLogo} 
            alt="Kupunesia Logo" 
            className="w-8 h-8 mr-2 object-contain"
          />
          <h2 className="text-xl font-semibold text-[#e0e0e0]">Kupunesia</h2>
        </div>
        {renderPlatformForm('kupunesia')}
      </div>

      {/* Modal konfirmasi unlink */}
      <UnlinkConfirmationModal 
        platform={platformToUnlink}
        isOpen={openModal}
        onClose={() => {
          setOpenModal(false);
          setPlatformToUnlink(null);
        }}
        onConfirm={confirmUnlink}
      />
    </div>
  );
};

const SyncAccounts = () => {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head'
      }}
    >
      <SyncAccountsContent />
    </GoogleReCaptchaProvider>
  );
};

export default SyncAccounts; 