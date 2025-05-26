import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUser, 
    faBinoculars, 
    faEnvelope, 
    faBuilding,
    faPhone,
    faCalendar
} from '@fortawesome/free-solid-svg-icons';

function UserProfile() {
    const { id } = useParams();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                if (!id) {
                    setError('ID pengguna tidak valid');
                    return;
                }

                console.log('Fetching user profile for ID:', id);
                const response = await fetch(`${import.meta.env.VITE_API_URL}/user-profile/${id}`);
                const data = await response.json();
                
                console.log('Response:', data);
                
                if (data.success && data.data) {
                    setUserData(data.data);
                } else {
                    setError(data.message || 'Data pengguna tidak ditemukan');
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError('Gagal memuat profil pengguna');
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Memuat profil...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center p-8 bg-red-50 rounded-lg">
                    <FontAwesomeIcon icon={faUser} className="text-red-500 text-4xl mb-4" />
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <FontAwesomeIcon icon={faUser} className="text-gray-400 text-4xl mb-4" />
                    <p className="text-gray-600">Pengguna tidak ditemukan</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                {/* Header Profil */}
                <div className="flex items-center space-x-4 mb-6">
                    {userData.profile_picture ? (
                        <img 
                            src={userData.profile_picture} 
                            alt={`${userData.fname} ${userData.lname}`}
                            className="w-24 h-24 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                            <FontAwesomeIcon icon={faUser} className="text-gray-400 text-3xl" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold">
                            {userData.fname} {userData.lname}
                        </h1>
                        <p className="text-gray-600">@{userData.uname}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            <FontAwesomeIcon icon={faCalendar} className="mr-2" />
                            Bergabung {new Date(userData.created_at).toLocaleDateString('id-ID')}
                        </p>
                    </div>
                </div>

                {/* Informasi Profil */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                            <FontAwesomeIcon icon={faBinoculars} className="text-gray-500 w-5" />
                            <span>{userData.totalObservations || 0} Observasi</span>
                        </div>
                        {userData.email && (
                            <div className="flex items-center space-x-3">
                                <FontAwesomeIcon icon={faEnvelope} className="text-gray-500 w-5" />
                                <span>{userData.email}</span>
                            </div>
                        )}
                        {userData.organization && (
                            <div className="flex items-center space-x-3">
                                <FontAwesomeIcon icon={faBuilding} className="text-gray-500 w-5" />
                                <span>{userData.organization}</span>
                            </div>
                        )}
                        {userData.phone && (
                            <div className="flex items-center space-x-3">
                                <FontAwesomeIcon icon={faPhone} className="text-gray-500 w-5" />
                                <span>{userData.phone}</span>
                            </div>
                        )}
                    </div>

                    {/* Bio */}
                    {userData.bio && (
                        <div className="md:col-span-2">
                            <h2 className="text-lg font-semibold mb-2">Tentang</h2>
                            <p className="text-gray-700 bg-gray-50 p-4 rounded">{userData.bio}</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-blue-700">Total Observasi FOBI</h3>
                        <p className="text-2xl font-bold text-blue-800">{userData.totalFobiObservations}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-green-700">Total Observasi Burung</h3>
                        <p className="text-2xl font-bold text-green-800">{userData.totalBirdObservations}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-purple-700">Total Observasi Kupu-kupu</h3>
                        <p className="text-2xl font-bold text-purple-800">{userData.totalButterflyObservations}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserProfile; 