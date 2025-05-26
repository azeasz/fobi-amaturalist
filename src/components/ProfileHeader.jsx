// src/components/ProfileHeader.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, 
  faTimes, 
  faBell, 
  faEnvelope,
  faUserCircle,
  faSignOutAlt 
} from '@fortawesome/free-solid-svg-icons';

const ProfileHeader = ({ userData }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHeaderFixed, setIsHeaderFixed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderFixed(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <header className={`${
      isHeaderFixed ? 'fixed top-0 w-full shadow-lg' : ''
    } bg-[#f2f2f2] border-b-4 border-[#679995] z-600`}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img 
              src="/FOBI.png" 
              alt="Fobi Logo"
              className="h-8" 
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:block">
            <ul className="flex space-x-6 text-xs mt-7">
              <li><Link to="/" className="hover:text-[#679995] transition-colors">Jelajahi</Link></li>
              <li><Link to="/user-observations" className="hover:text-[#679995] transition-colors">Eksplorasi Saya</Link></li>
              <li><Link to="/bantu-ident" className="hover:text-[#679995] transition-colors">Bantu Ident</Link></li>
              <li><Link to="/community" className="hover:text-[#679995] transition-colors">Komunitas</Link></li>
            </ul>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4">
              {/* Notifications */}
              <Link to="/notifications" className="relative">
                <FontAwesomeIcon 
                  icon={faBell} 
                  className="text-gray-600 hover:text-[#679995] text-xl"
                />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  2
                </span>
              </Link>

              {/* Messages */}
              <Link to="/messages" className="relative">
                <FontAwesomeIcon 
                  icon={faEnvelope} 
                  className="text-gray-600 hover:text-[#679995] text-xl"
                />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  3
                </span>
              </Link>

              {/* User Profile */}
              <div className="flex items-center space-x-3 border-l pl-4">
                <img 
                  src={"/src/assets/icon/user.png"}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-700">{userData.uname}</p>
                  <p className="text-xs text-gray-500">{userData.totalObservations} Observasi</p>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="text-gray-600 hover:text-[#679995]"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="text-xl" />
              </button>
            </div>

            {/* Upload Button */}
            <Link 
              to="/pilih-observasi"
              className="bg-[#679995] text-white px-4 py-2 rounded-md hover:bg-[#527b78] text-sm font-medium transition duration-150 ease-in-out"
            >
              Observasi Baru
            </Link>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <FontAwesomeIcon 
                icon={isMobileMenuOpen ? faTimes : faBars}
                className="text-2xl text-gray-600" 
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-72 bg-white shadow-xl">
            <div className="p-4">
              {/* Mobile User Profile */}
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
                <img 
                  src={userData.profile_picture || "/src/assets/icon/user.png"}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-gray-700">{userData.uname}</p>
                  <p className="text-sm text-gray-500">{userData.totalObservations} Observasi</p>
                </div>
              </div>

              {/* Mobile Navigation */}
              <nav className="space-y-4">
                <Link to="/" className="block py-2 text-gray-700 hover:text-[#679995]">Jelajahi</Link>
                <Link to="/user-observations" className="block py-2 text-gray-700 hover:text-[#679995]">Eksplorasi Saya</Link>
                <Link to="/bantu-ident" className="block py-2 text-gray-700 hover:text-[#679995]">Bantu Ident</Link>
                <Link to="/community" className="block py-2 text-gray-700 hover:text-[#679995]">Komunitas</Link>
                <div className="border-t pt-4 mt-4">
                  <Link to="/notifications" className="flex items-center space-x-3 py-2 text-gray-700 hover:text-[#679995]">
                    <FontAwesomeIcon icon={faBell} />
                    <span>Notifikasi</span>
                    <span className="bg-red-500 text-white text-xs rounded-full px-2">2</span>
                  </Link>
                  <Link to="/messages" className="flex items-center space-x-3 py-2 text-gray-700 hover:text-[#679995]">
                    <FontAwesomeIcon icon={faEnvelope} />
                    <span>Pesan</span>
                    <span className="bg-red-500 text-white text-xs rounded-full px-2">3</span>
                  </Link>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-3 py-2 text-gray-700 hover:text-[#679995] w-full"
                >
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  <span>Keluar</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default ProfileHeader;