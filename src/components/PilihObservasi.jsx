// src/components/PilihObservasi.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, 
  faTimes, 
  faBell, 
  faEnvelope,
  faUserCircle,
  faExclamationTriangle,
  faUser,
  faList,
  faStar,
  faMicroscope,
  faComments,
  faEdit
} from '@fortawesome/free-solid-svg-icons';
import Header from './Header';

// Fungsi untuk mendapatkan URL gambar yang benar
const getImageUrl = (profilePicture) => {
  if (!profilePicture) return '/default-avatar.png';
  
  if (profilePicture.startsWith('http')) {
      return profilePicture;
  }
  
  const cleanPath = profilePicture
      .replace(/^\/storage\//, '')
      .replace(/^\/api\/storage\//, '')
      .replace(/^storage\//, '')
      .replace(/^api\/storage\//, '');
  
  return `https://api.amaturalist.com/storage/${cleanPath}`;
};

// Ambil data user dari localStorage
const getUserData = () => {
  const burungnesia_user_id = localStorage.getItem('burungnesia_user_id');
  const kupunesia_user_id = localStorage.getItem('kupunesia_user_id');
  const userId = localStorage.getItem('user_id');
  const profile_picture = localStorage.getItem('profile_picture');
  
  return {
    uname: localStorage.getItem('username'),
    level: localStorage.getItem('level'),
    email: localStorage.getItem('email'),
    bio: localStorage.getItem('bio'),
    profile_picture: profile_picture ? getImageUrl(profile_picture) : null,
    totalObservations: localStorage.getItem('totalObservations'),
    burungnesia_user_id: burungnesia_user_id && burungnesia_user_id !== "null" && burungnesia_user_id !== "undefined" ? burungnesia_user_id : null,
    kupunesia_user_id: kupunesia_user_id && kupunesia_user_id !== "null" && kupunesia_user_id !== "undefined" ? kupunesia_user_id : null,
    user_id: userId
  };
};

// Modal Component
const LinkAccountModal = ({ isOpen, onClose, type, hasLinkedAccount }) => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');

  if (!isOpen) return null;

  const appInfo = {
    burungnesia: {
      title: 'Tautan Akun Burungnesia',
      playStoreLink: 'https://play.google.com/store/apps/details?id=com.sikebo.burungnesia.citizenScience2',
      description: 'Untuk menggunakan fitur checklist Burungnesia, Anda perlu menautkan akun Burungnesia Anda terlebih dahulu.'
    },
    kupunesia: {
      title: 'Tautan Akun Kupunesia',
      playStoreLink: 'https://play.google.com/store/apps/details?id=org.kupunesia',
      description: 'Untuk menggunakan fitur checklist Kupunesia, Anda perlu menautkan akun Kupunesia Anda terlebih dahulu.'
    }
  };

  const handleContinue = () => {
    const userData = getUserData();
    const canContinue = type === 'burungnesia' ? 
      userData.burungnesia_user_id : 
      userData.kupunesia_user_id;

    if (canContinue) {
      onClose();
      navigate(`/${type}-upload`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-md w-full border border-[#444]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">{appInfo[type].title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-start mb-4">
            <FontAwesomeIcon 
              icon={hasLinkedAccount ? faExclamationTriangle : faExclamationTriangle} 
              className={`mt-1 mr-3 ${hasLinkedAccount ? 'text-green-500' : 'text-yellow-500'}`}
            />
            <p className="text-gray-300">
              {hasLinkedAccount 
                ? `Akun ${type === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'} Anda sudah tersinkronisasi dan terverifikasi. Klik lanjut untuk membuat checklist.`
                : appInfo[type].description
              }
            </p>
          </div>

          {!hasLinkedAccount && (
            <div className="bg-[#2c2c2c] p-4 rounded-lg mb-4">
              <h4 className="text-white font-semibold mb-2">Tips:</h4>
              <ol className="list-decimal list-inside text-gray-300 space-y-2">
                <li>Unduh dan install aplikasi {type === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'}</li>
                <li>Buat akun baru atau masuk jika sudah memiliki akun</li>
                <li>Kembali ke website dan tautkan akun Anda di halaman profil pada bagian edit profil</li>
              </ol>
              <p className="text-gray-300 mt-3 text-sm italic">
                Catatan: Untuk menautkan akun {type === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'}, silakan klik tombol "Tautkan Akun" di bawah untuk menuju ke halaman profil, lalu klik tombol "Edit Profil".
              </p>
              <div className="mt-4">
                <a 
                  href={appInfo[type].playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                    alt="Google Play"
                    className="h-12"
                  />
                </a>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-6">
            {!hasLinkedAccount && (
              <Link to={`/profile/${userId}`} className="text-[#1a73e8] hover:text-[#1557b0]">
                Tautkan Akun
              </Link>
            )}
            <button
              onClick={handleContinue}
              disabled={!hasLinkedAccount}
              className={`px-4 py-2 rounded ${
                hasLinkedAccount
                  ? 'bg-[#1a73e8] text-white hover:bg-[#1557b0] w-full'
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
            >
              Lanjut
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PilihObservasi = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHeaderFixed, setIsHeaderFixed] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const userData = getUserData();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderFixed(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleObservationClick = (type) => {
    setModalType(type);
    setShowLinkModal(true);
  };

  const roles = {
    1: 'User',
    2: 'Kurator', 
    3: 'Admin',
    4: 'Admin + Kurator'
  };

  const menuItems = [
    { path: `/profile/${userData.user_id}`, label: 'Profil', icon: faUser },
    { path: `/profile/observasi/${userData.user_id}`, label: 'Observasi', icon: faList },
    { path: `/profile/taksa-favorit/${userData.user_id}`, label: 'Taksa favorit', icon: faStar },
    { path: `/profile/spesies/${userData.user_id}`, label: 'Spesies', icon: faMicroscope },
    { path: `/profile/identifikasi/${userData.user_id}`, label: 'Identifikasi', icon: faComments },
    { path: '/my-observations', label: 'Kelola Observasi', icon: faEdit, isAbsolute: true },
  ];

  const handleNavigate = (path, isAbsolute) => {
    if (isAbsolute) {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <Header userData={getUserData()} />
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="md:w-1/4">
            <div className="bg-[#1e1e1e] rounded-lg shadow-md p-6 border border-[#444]">
              <div className="text-center">
                <img 
                  src={userData.profile_picture || "/user.png"}
                  alt="User Profile"
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-2 border-[#444]"
                  onError={(e) => {
                    if (!e.target.src.includes('default-avatar.png')) {
                      e.target.src = '/default-avatar.png';
                    }
                  }}
                />
                <small className="font-bold text-lg text-white">{userData.uname}</small>
                <span>&nbsp;</span>
                <span className="inline-block bg-[#1a73e8] text-white text-xs px-2 py-1 rounded-full mt-2">
                  {roles[userData.level]}
                </span>
                {userData.totalObservations && (
                  <p className="text-gray-400 text-sm mt-2">
                    Total Observasi: {userData.totalObservations}
                  </p>
                )}
              </div>

              {/* Menu */}
              <nav className="mt-8">
                <ul className="space-y-2">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        to={item.path}
                        onClick={(e) => {
                          if (item.isAbsolute) {
                            e.preventDefault();
                            handleNavigate(item.path, item.isAbsolute);
                          }
                        }}
                        className={`block px-4 py-2 text-sm flex items-center ${
                          (item.isAbsolute ? location.pathname === item.path : location.pathname === item.path)
                          ? 'bg-[#1a73e8] text-white'
                          : 'text-[#e0e0e0] hover:bg-[#2c2c2c]'
                        }`}
                      >
                        <FontAwesomeIcon icon={item.icon} className="mr-2" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <div className="block px-4 py-2 text-sm flex items-center bg-[#1a73e8] text-white cursor-default">
                      <FontAwesomeIcon icon={faEdit} className="mr-2" />
                      Unggah Observasi Baru
                    </div>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="md:w-3/4">
            <div className="bg-[#1e1e1e] rounded-lg shadow-md p-6 border border-[#444]">
              <h2 className="text-base font-bold mb-8 pb-4 border-b border-[#444] text-white">Unggah observasi baru</h2>
              
              <h3 className="text-sm font-semibold text-center mb-8 text-gray-300">Pilih Observasi Anda</h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Burungnesia Card */}
                <div className="bg-[#2c2c2c] rounded-lg shadow-md p-6 text-sm border border-[#444] hover:border-[#1a73e8] transition-all duration-200">
                  <div onClick={() => handleObservationClick('burungnesia')} className="block text-center cursor-pointer">
                    <img 
                      src="/icon.png"
                      alt="Checklist Burungnesia"
                      className="w-24 h-24 mx-auto mb-4"
                    />
                  </div>
                  <h4 className="text-sm font-semibold mb-2 text-white">Checklist Burungnesia</h4>
                  <p className="text-gray-400 mb-4">
                    Observasi burung dengan menggunakan checklist Burungnesia.
                  </p>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-300">Sangat disarankan untuk:</p>
                    <ul className="list-none space-y-1 text-sm text-gray-400">
                      <li>1. Observer dengan kemampuan identifikasi burung medium-mahir</li>
                      <li>2. Observasi multi spesies burung ( {'>'}20 jenis)</li>
                      <li>3. Observasi komplit (mencatat semua jenis yang ada di lokasi observasi)</li>
                      <li>4. Tidak ada audit selidik media foto/audio</li>
                    </ul>
                  </div>
                  <div className="mt-10 text-center">
                    <p className="text-sm text-gray-400 mb-2">
                      Coba versi mobile jika anda pengguna Android
                    </p>
                    <a 
                      href="https://play.google.com/store/apps/details?id=com.sikebo.burungnesia.citizenScience2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                        alt="Google Play"
                        className="h-12"
                      />
                    </a>
                  </div>
                </div>

                {/* Kupunesia Card */}
                <div className="bg-[#2c2c2c] rounded-lg shadow-md p-6 text-sm border border-[#444] hover:border-[#1a73e8] transition-all duration-200">
                  <div onClick={() => handleObservationClick('kupunesia')} className="block text-center cursor-pointer">
                    <img 
                      src="/kupnes.png"
                      alt="Checklist Kupunesia"
                      className="w-24 h-24 mx-auto mb-4"
                    />
                  </div>
                  <h4 className="text-sm font-semibold mb-2 text-white">Checklist Kupunesia</h4>
                  <p className="text-gray-400 mb-4">
                    Observasi kupu-kupu dengan menggunakan checklist Kupunesia.
                  </p>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-300">Sangat disarankan untuk:</p>
                    <ul className="list-none space-y-1 text-sm text-gray-400">
                      <li>1. Observer dengan kemampuan identifikasi kupu-kupu medium-mahir</li>
                      <li>2. Observasi multi spesies kupu (tidak termasuk ngengat)</li>
                      <li>3. Observasi komplit (mencatat semua jenis yang ada di lokasi observasi)</li>
                      <li>4. Tidak ada audit selidik media foto/audio</li>
                    </ul>
                  </div>
                  <div className="mt-5 text-center">
                    <p className="text-sm text-gray-400 mb-2">
                      Coba versi mobile jika anda pengguna Android
                    </p>
                    <a 
                      href="https://play.google.com/store/apps/details?id=org.kupunesia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                        alt="Google Play"
                        className="h-12"
                      />
                    </a>
                  </div>
                </div>

                {/* Observasi Bebas Card */}
                <div className="bg-[#2c2c2c] rounded-lg shadow-md p-6 text-sm border border-[#444] hover:border-[#1a73e8] transition-all duration-200">
                  <Link to="/media-upload" className="block text-center">
                    <img 
                      src="/icam.png"
                      alt="Observasi Berbasis Media"
                      className="w-24 h-24 mx-auto mb-4"
                    />
                  </Link>
                  <h4 className="text-sm font-semibold mb-2 text-white">Observasi Media</h4>
                  <p className="text-gray-400 mb-4">
                    Unggah observasi dengan media foto atau audio.
                  </p>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-300">Sangat disarankan untuk:</p>
                    <ul className="list-none space-y-1 text-sm text-gray-400">
                      <li>1. Observasi selain burung & kupu-kupu (tidak termasuk ngengat)</li>
                      <li>2. Tidak ada syarat kemampuan identifikasi</li>
                      <li>3. Observasi tunggal atau sedikit jenis (taksa tunggal maupun multi taksa)</li>
                      <li>4. Bukan observasi komplit</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Link Account Modal */}
      <LinkAccountModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        type={modalType}
        hasLinkedAccount={
          modalType === 'burungnesia' 
            ? !!userData.burungnesia_user_id 
            : !!userData.kupunesia_user_id
        }
      />
    </div>
  );
};

export default PilihObservasi;