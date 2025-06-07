import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faList, faStar, faMicroscope, faComments, faEdit, faTimes } from '@fortawesome/free-solid-svg-icons';

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

// Fungsi untuk mendapatkan data user dari localStorage
const getUserData = () => {
    const userId = localStorage.getItem('user_id');
    const profile_picture = localStorage.getItem('profile_picture');
    
    return {
        uname: localStorage.getItem('username'),
        level: localStorage.getItem('level'),
        profile_picture: profile_picture ? getImageUrl(profile_picture) : null,
        totalObservations: localStorage.getItem('totalObservations'),
        user_id: userId
    };
};

function Sidebar({ userId, activeItem, isMobileOpen, onMobileClose }) {
    const location = useLocation();
    const navigate = useNavigate();
    const currentUserId = localStorage.getItem('user_id');
    const isOwnProfile = userId && currentUserId && userId.toString() === currentUserId.toString();
    const userData = getUserData();
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    
    // Deteksi ukuran layar
    useEffect(() => {
        const checkScreenSize = () => {
            setIsSmallScreen(window.innerWidth < 1024); // lg breakpoint
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => {
            window.removeEventListener('resize', checkScreenSize);
        };
    }, []);
    
    const roles = {
        1: 'User',
        2: 'Kurator', 
        3: 'Admin',
        4: 'Admin + Kurator',
        5: 'Superadmin'
    };
    
    const menuItems = [
        { path: `/profile/${userId}`, label: 'Profil', icon: faUser },
        { path: `/profile/${userId}/observasi`, label: 'Observasi', icon: faList },
        { path: `/profile/${userId}/taksa`, label: 'Taksa favorit', icon: faStar },
        { path: `/profile/${userId}/spesies`, label: 'Spesies', icon: faMicroscope },
        { path: `/profile/${userId}/identifikasi`, label: 'Identifikasi', icon: faComments },
    ];

    // Tambahkan menu pengelolaan observasi jika profile sendiri
    if (isOwnProfile) {
        menuItems.push({ 
            path: '/my-observations', 
            label: 'Kelola Observasi', 
            icon: faEdit,
            isAbsolute: true 
        });
    }

    const handleNavigate = (path) => {
        navigate(path);
        if (isSmallScreen && onMobileClose) {
            onMobileClose();
        }
    };

    const handleLinkClick = (e, item) => {
        if (item.isAbsolute) {
            e.preventDefault();
            handleNavigate(item.path);
        } else if (isSmallScreen && onMobileClose) {
            onMobileClose();
        }
    };

    // Kelas CSS untuk sidebar container
    const sidebarClasses = `
        ${isSmallScreen ? 'fixed inset-y-0 left-0 z-1000 w-64 transform transition-transform duration-300 ease-in-out' : 'w-64'} 
        ${isSmallScreen && !isMobileOpen ? '-translate-x-full' : 'translate-x-0'}
        bg-[#1e1e1e] shadow-sm rounded border border-[#444] overflow-y-auto
    `;

    return (
        <>
            {/* Overlay untuk mobile */}
            {isSmallScreen && isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-1000"
                    onClick={onMobileClose}
                ></div>
            )}
            
            <div className={sidebarClasses}>
                {/* Header dengan tombol tutup untuk mobile */}
                {isSmallScreen && (
                    <div className="flex items-center justify-between p-4 border-b border-[#444]">
                        <h2 className="font-bold text-lg text-white">Menu</h2>
                        <button 
                            onClick={onMobileClose}
                            className="text-gray-400 hover:text-white"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                )}
                
                {/* Profil user */}
                <div className="p-4 border-b border-[#444]">
                    <div className="text-center">
                        <img 
                            src={userData.profile_picture || "/user.png"}
                            alt="User Profile"
                            className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-[#444]"
                            onError={(e) => {
                                if (!e.target.src.includes('default-avatar.png')) {
                                    e.target.src = '/default-avatar.png';
                                }
                            }}
                        />
                        <h3 className="font-bold text-base text-white">{userData.uname}</h3>
                        <span className="inline-block bg-[#1a73e8] text-white text-xs px-2 py-1 rounded-full mt-1">
                            {roles[userData.level] || 'User'}
                        </span>
                        {userData.totalObservations && (
                            <p className="text-gray-400 text-xs mt-2">
                                Total Observasi: {userData.totalObservations}
                            </p>
                        )}
                    </div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={(e) => handleLinkClick(e, item)}
                            className={`block px-4 py-3 text-sm flex items-center transition-colors duration-200 ${
                                (activeItem === item.label || 
                                (item.isAbsolute ? location.pathname === item.path : location.pathname === item.path))
                                ? 'bg-[#1a73e8] text-white'
                                : 'text-[#e0e0e0] hover:bg-[#2c2c2c]'
                            }`}
                        >
                            <FontAwesomeIcon icon={item.icon} className="mr-3 w-5" />
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}

export default Sidebar;