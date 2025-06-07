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
  faEdit,
  faCheckCircle,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import Header from './Header';
import Sidebar from './Sidebar';

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
  
  return `https://api.talinara.com/storage/${cleanPath}`;
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
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
              icon={hasLinkedAccount ? faCheckCircle : faExclamationTriangle} 
              className={`mt-1 mr-3 ${hasLinkedAccount ? 'text-green-500' : 'text-yellow-500'}`}
              size="lg"
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
  const [showSidebar, setShowSidebar] = useState(false);
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

  return (
    <div className="min-h-screen bg-[#121212]">
      <Header userData={getUserData()} />
      
      {/* Mobile Sidebar Toggle Button */}
      <button 
        onClick={() => setShowSidebar(!showSidebar)}
        className="fixed bottom-4 right-4 z-40 lg:hidden bg-[#1a73e8] text-white p-3 rounded-full shadow-lg"
      >
        <FontAwesomeIcon icon={showSidebar ? faTimes : faBars} />
      </button>
      
      {/* Main Content */}
      <main className="container mx-auto pt-4 pb-8 mt-16">
        <div className="flex flex-col lg:flex-row lg:px-4">
          {/* Sidebar */}
          <div className="lg:w-1/5 xl:w-1/6">
            <Sidebar 
              userId={userData.user_id} 
              activeItem="Unggah Observasi Baru" 
              isMobileOpen={showSidebar}
              onMobileClose={() => setShowSidebar(false)}
            />
          </div>

          {/* Content */}
          <div className="w-full lg:w-4/5 xl:w-5/6 lg:pl-4">
            <div className="bg-[#1e1e1e] rounded-lg shadow-lg p-6 sm:p-8 border border-[#444]">
              <h2 className="text-xl font-bold mb-6 pb-4 border-b border-[#444] text-white">Unggah observasi baru</h2>
              
              <h3 className="text-base font-semibold text-center mb-8 text-gray-200">Pilih Observasi Anda</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Burungnesia Card */}
                <div 
                  className="bg-[#242424] rounded-lg shadow-lg p-5 text-sm border border-[#333] hover:border-[#1a73e8] hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:-translate-y-1" 
                  onClick={() => handleObservationClick('burungnesia')}
                >
                  <div className="text-center mb-4">
                    <div className="bg-[#1a1a1a] rounded-full p-3 inline-flex items-center justify-center mb-2 border-4 border-[#303030]">
                      <img 
                        src="/icon.png"
                        alt="Checklist Burungnesia"
                        className="w-20 h-20 object-contain"
                      />
                    </div>
                  </div>
                  <h4 className="text-base font-bold mb-3 text-white text-center">Checklist Burungnesia</h4>
                  <p className="text-gray-300 mb-4 text-center">
                    Observasi burung dengan menggunakan checklist Burungnesia.
                  </p>
                  <div className="space-y-3 bg-[#1a1a1a] p-4 rounded-lg">
                    <p className="font-semibold text-gray-200">Sangat disarankan untuk:</p>
                    <ul className="list-none space-y-2 text-sm text-gray-300">
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">1</span>
                        Observer dengan kemampuan identifikasi burung medium-mahir
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">2</span>
                        Observasi multi spesies burung ({'>'}20 jenis)
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">3</span>
                        Observasi komplit (mencatat semua jenis yang ada di lokasi observasi)
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">4</span>
                        Tidak ada audit selidik media foto/audio
                      </li>
                    </ul>
                  </div>
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400 mb-2">
                      Coba versi mobile jika anda pengguna Android
                    </p>
                    <a 
                      href="https://play.google.com/store/apps/details?id=com.sikebo.burungnesia.citizenScience2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                      onClick={(e) => e.stopPropagation()} // Mencegah card action saat klik tombol
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
                <div 
                  className="bg-[#242424] rounded-lg shadow-lg p-5 text-sm border border-[#333] hover:border-[#1a73e8] hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
                  onClick={() => handleObservationClick('kupunesia')}
                >
                  <div className="text-center mb-4">
                    <div className="bg-[#1a1a1a] rounded-full p-3 inline-flex items-center justify-center mb-2 border-4 border-[#303030]">
                      <img 
                        src="/kupnes.png"
                        alt="Checklist Kupunesia"
                        className="w-20 h-20 object-contain"
                      />
                    </div>
                  </div>
                  <h4 className="text-base font-bold mb-3 text-white text-center">Checklist Kupunesia</h4>
                  <p className="text-gray-300 mb-4 text-center">
                    Observasi kupu-kupu dengan menggunakan checklist Kupunesia.
                  </p>
                  <div className="space-y-3 bg-[#1a1a1a] p-4 rounded-lg">
                    <p className="font-semibold text-gray-200">Sangat disarankan untuk:</p>
                    <ul className="list-none space-y-2 text-sm text-gray-300">
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">1</span>
                        Observer dengan kemampuan identifikasi kupu-kupu medium-mahir
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">2</span>
                        Observasi multi spesies kupu (tidak termasuk ngengat)
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">3</span>
                        Observasi komplit (mencatat semua jenis yang ada di lokasi observasi)
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">4</span>
                        Tidak ada audit selidik media foto/audio
                      </li>
                    </ul>
                  </div>
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400 mb-2">
                      Coba versi mobile jika anda pengguna Android
                    </p>
                    <a 
                      href="https://play.google.com/store/apps/details?id=org.kupunesia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                      onClick={(e) => e.stopPropagation()} // Mencegah card action saat klik tombol
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
                <div 
                  className="bg-[#242424] rounded-lg shadow-lg p-5 text-sm border border-[#333] hover:border-[#1a73e8] hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:-translate-y-1 sm:col-span-2 lg:col-span-1"
                  onClick={() => navigate('/media-upload')}
                >
                  <div className="text-center mb-4">
                    <div className="bg-[#1a1a1a] rounded-full p-3 inline-flex items-center justify-center mb-2 border-4 border-[#303030]">
                      <img 
                        src="/icam.png"
                        alt="Observasi Berbasis Media"
                        className="w-20 h-20 object-contain"
                      />
                    </div>
                  </div>
                  <h4 className="text-base font-bold mb-3 text-white text-center">Observasi Media</h4>
                  <p className="text-gray-300 mb-4 text-center">
                    Unggah observasi dengan media foto atau audio.
                  </p>
                  <div className="space-y-3 bg-[#1a1a1a] p-4 rounded-lg">
                    <p className="font-semibold text-gray-200">Sangat disarankan untuk:</p>
                    <ul className="list-none space-y-2 text-sm text-gray-300">
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">1</span>
                        Observasi selain burung & kupu-kupu (tidak termasuk ngengat)
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">2</span>
                        Tidak ada syarat kemampuan identifikasi
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">3</span>
                        Observasi tunggal atau sedikit jenis (taksa tunggal maupun multi taksa)
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-xs bg-[#333] rounded-full w-5 h-5 flex items-center justify-center mt-0.5">4</span>
                        Bukan observasi komplit
                      </li>
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