import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import Sidebar from '../components/Sidebar';
import EditProfileModal from '../components/EditProfileModal';
import ActivityChart from '../components/ActivityChart';
import TopTaxa from '../components/TopTaxa';
import Header from '../components/Header';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

function Profile() {
    const { id } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activityData, setActivityData] = useState([]);
    const [activityPeriod, setActivityPeriod] = useState('year');
    const [topTaxa, setTopTaxa] = useState({
        observations: [],
        identifications: []
    });
    const [showSidebar, setShowSidebar] = useState(true);
    
    const currentUserId = localStorage.getItem('user_id');
    const isOwnProfile = currentUserId === id;
    
    const currentUserData = {
        id: currentUserId,
        fname: profileData?.user?.fname || '',
        lname: profileData?.user?.lname || '',
        uname: profileData?.user?.uname || '',
        email: profileData?.user?.email || '',
        phone: profileData?.user?.phone || '',
        organization: profileData?.user?.organization || '',
        bio: profileData?.user?.bio || '',
        profile_picture: profileData?.user?.profile_picture || '',
        burungnesia_email: profileData?.user?.burungnesia_email,
        burungnesia_email_verified_at: profileData?.user?.burungnesia_email_verified_at,
        kupunesia_email: profileData?.user?.kupunesia_email,
        kupunesia_email_verified_at: profileData?.user?.kupunesia_email_verified_at
    };

    const defaultBio = `"Talinara" adalah komunitas yang mengedepankan kejujuran dan kepercayaan antar anggota karena informasi yang termuat dalam "Talinara" mempunyai pertanggungjawaban secara ilmiah. Terkadang orang lain perlu mengetahui latar belakang anda untuk menaruh kepercayaan akan observasi atau bantuan identifikasi dari anda`;


    useEffect(() => {
        if (id) {
            // Log untuk debugging
            console.log('Fetching profile data for ID:', id);
            
            Promise.all([
                fetchProfileData(),
                fetchActivityData(),
                fetchTopTaxa()
            ]).then(() => {
                console.log('All profile data fetched');
            }).catch(error => {
                console.error('Error fetching profile data:', error);
            });
        }
    }, [id]);

    const fetchProfileData = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/home/${id}`);
            const data = await response.json();
            
            // Log response untuk debugging
            console.log('Profile data response:', data);
            
            if (data.success) {
                setProfileData(data.data);
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Error fetching profile data:', err);
            setError('Gagal memuat data profil');
        } finally {
            setLoading(false);
        }
    };

    const fetchActivityData = async (period = 'year') => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/activities/${id}?period=${period}`);
            const data = await response.json();
            
            if (data.success) {
                setActivityData(data.data);
            } else {
                console.error('Gagal memuat data aktivitas:', data.message);
            }
        } catch (err) {
            console.error('Gagal memuat data aktivitas:', err);
        }
    };

    const fetchTopTaxa = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/top-taxa/${id}`);
            const data = await response.json();
            
            if (data.success) {
                setTopTaxa(data.data);
            }
        } catch (err) {
            console.error('Gagal memuat data taksa teratas:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#121212]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a73e8]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#121212]">
                <div className="text-center text-red-400">{error}</div>
            </div>
        );
    }
    // Ambil data user dari localStorage
const getUserData = () => {
    return {
      uname: localStorage.getItem('username'),
      level: localStorage.getItem('level'),
      email: localStorage.getItem('email'),
      bio: localStorage.getItem('bio'),
      profile_picture: localStorage.getItem('profile_picture'),
      totalObservations: localStorage.getItem('totalObservations'),
    };
  };
  const userData = getUserData();


    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            scriptProps={{
                async: true,
                defer: true,
                appendTo: 'head'
            }}
        >
            <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
                <Header userData={getUserData()} />

                <div className="container mx-auto px-2 sm:px-4 py-8 mt-8">
                    {/* Toggle Sidebar Button - Visible on mobile */}
                    <button 
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="lg:hidden mb-4 p-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0] w-full"
                    >
                        {showSidebar ? <FontAwesomeIcon icon={faTimes} /> : <FontAwesomeIcon icon={faBars} />}
                    </button>

                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                        {/* Sidebar dengan kondisi responsive */}
                        <div className={`
                            ${showSidebar ? 'block' : 'hidden'}
                            lg:block
                            w-full lg:w-64
                            transition-all duration-300
                        `}>
                            <Sidebar userId={id} />
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                            {/* Profile Header Card */}
                            <div className="bg-[#1e1e1e] rounded shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-[#444]">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                    <div>
                                        <h2 className="text-xl font-semibold text-[#e0e0e0]">{profileData.user.uname}</h2>
                                        <p className="text-gray-400 text-sm">
                                            Bergabung {new Date(profileData.user.created_at).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    {isOwnProfile && (
                                        <button
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="w-full sm:w-auto px-4 py-2 bg-[#1a73e8] text-white rounded hover:bg-[#1565c0]"
                                        >
                                            Edit Profile
                                        </button>
                                    )}
                                </div>
                                <div className="text-[#e0e0e0] whitespace-pre-line mb-4">
                                    {profileData.user.bio || defaultBio}
                                </div>
                            </div>

                            {/* Konten khusus untuk pemilik profil */}
                            {isOwnProfile && (
                                <>
                                    {/* Aktivitas Section */}
                                    <div className="bg-[#1e1e1e] rounded shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-[#444]">
                                        <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Aktivitas saya</h2>
                                        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4">
                                            <button 
                                                className={`px-3 sm:px-4 py-2 rounded text-sm ${
                                                    activityPeriod === 'year' ? 'bg-[#1a73e8] text-white' : 'bg-[#2c2c2c] text-[#e0e0e0]'
                                                }`}
                                                onClick={() => setActivityPeriod('year')}
                                            >
                                                1 tahun
                                            </button>
                                            <button 
                                                className={`px-3 sm:px-4 py-2 rounded text-sm ${
                                                    activityPeriod === 'month' ? 'bg-[#1a73e8] text-white' : 'bg-[#2c2c2c] text-[#e0e0e0]'
                                                }`}
                                                onClick={() => setActivityPeriod('month')}
                                            >
                                                1 bulan
                                            </button>
                                            <button 
                                                className={`px-3 sm:px-4 py-2 rounded text-sm ${
                                                    activityPeriod === 'week' ? 'bg-[#1a73e8] text-white' : 'bg-[#2c2c2c] text-[#e0e0e0]'
                                                }`}
                                                onClick={() => setActivityPeriod('week')}
                                            >
                                                1 minggu
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <ActivityChart data={activityData} />
                                        </div>
                                    </div>

                                    {/* TopTaxa Section */}
                                    <TopTaxa 
                                        observationTaxa={topTaxa.observations}
                                        identificationTaxa={topTaxa.identifications}
                                    />
                                </>
                            )}

                            {/* Followers & Following Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {/* Mengikuti */}
                                <div className="bg-[#1e1e1e] rounded shadow-sm p-4 sm:p-6 border border-[#444]">
                                    <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">
                                        Mengikuti {profileData.social.followingCount} orang
                                    </h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                                        {profileData.social.following.map(following => (
                                            <Link 
                                                key={following.id} 
                                                to={`/profile/${following.id}`}
                                                className="flex flex-col items-center"
                                            >
                                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[#2c2c2c] mb-2 border border-[#444]">
                                                    {following.profile_picture ? (
                                                        <img 
                                                            src={following.profile_picture} 
                                                            alt={following.uname} 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs sm:text-sm text-center truncate w-full text-[#e0e0e0]">
                                                    {following.uname}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* Diikuti */}
                                <div className="bg-[#1e1e1e] rounded shadow-sm p-4 sm:p-6 border border-[#444]">
                                    <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">
                                        Diikuti {profileData.social.followerCount} orang
                                    </h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                                        {profileData.social.followers.map(follower => (
                                            <Link 
                                                key={follower.id} 
                                                to={`/profile/${follower.id}`}
                                                className="flex flex-col items-center"
                                            >
                                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[#2c2c2c] mb-2 border border-[#444]">
                                                    {follower.profile_picture ? (
                                                        <img 
                                                            src={follower.profile_picture} 
                                                            alt={follower.uname} 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs sm:text-sm text-center truncate w-full text-[#e0e0e0]">
                                                    {follower.uname}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Edit Profile Modal */}
                    {isOwnProfile && (
                        <EditProfileModal
                            isOpen={isEditModalOpen}
                            onClose={() => setIsEditModalOpen(false)}
                            userData={currentUserData}
                            onSave={fetchProfileData}
                        />
                    )}
                </div>
            </div>
        </GoogleReCaptchaProvider>
    );
}

export default Profile; 