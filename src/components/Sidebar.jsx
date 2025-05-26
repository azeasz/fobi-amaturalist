import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faList, faStar, faMicroscope, faComments, faEdit } from '@fortawesome/free-solid-svg-icons';

function Sidebar({ userId }) {
    const location = useLocation();
    const navigate = useNavigate();
    const currentUserId = localStorage.getItem('user_id');
    const isOwnProfile = userId && currentUserId && userId.toString() === currentUserId.toString();
    
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
    };

    return (
        <div className="w-64 bg-[#1e1e1e] shadow-sm rounded border border-[#444]">
            {menuItems.map((item) => (
                <Link
                    key={item.path}
                    to={item.path}
                    onClick={(e) => {
                        if (item.isAbsolute) {
                            e.preventDefault();
                            handleNavigate(item.path);
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
            ))}
        </div>
    );
}

export default Sidebar;