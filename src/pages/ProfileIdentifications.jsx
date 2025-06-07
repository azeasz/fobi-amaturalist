import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import UnderDevelopmentPage from '../components/UnderDevelopmentPage';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

const ProfileIdentifications = () => {
  const { id } = useParams();
  const [userData, setUserData] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // Get user data from local storage
  React.useEffect(() => {
    const user = {
      id: localStorage.getItem('user_id'),
      name: localStorage.getItem('username'),
      email: localStorage.getItem('email'),
      profile_picture: localStorage.getItem('profile_picture'),
    };
    setUserData(user);
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
      <Header userData={userData} />
      
      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Toggle Sidebar Button - Visible on mobile */}
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="lg:hidden mb-4 p-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0] flex items-center justify-center gap-2 w-full"
        >
          <FontAwesomeIcon icon={showSidebar ? faTimes : faBars} />
          <span>Menu</span>
        </button>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar dengan properti baru */}
          <div className="lg:block lg:w-1/5 xl:w-1/6">
            <Sidebar 
              userId={id} 
              activeItem="Identifikasi"
              isMobileOpen={showSidebar}
              onMobileClose={() => setShowSidebar(false)}
            />
          </div>
          
          <div className="flex-1">
            <UnderDevelopmentPage 
              title="Identifikasi" 
              description="Halaman ini akan menampilkan identifikasi yang telah Anda berikan pada observasi pengguna lain. Kami sedang menyiapkan fitur untuk melacak dan mengelola kontribusi identifikasi Anda dalam komunitas."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileIdentifications; 