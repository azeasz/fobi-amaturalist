import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUser, 
    faBinoculars, 
    faEnvelope, 
    faBuilding,
    faPhone 
} from '@fortawesome/free-solid-svg-icons';

function UserProfile() {
    const { id } = useParams();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await apiFetch(`/users/${id}`);
                setUserData(response.data);
            } catch (err) {
                setError('Gagal memuat profil pengguna');
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [id]);

    if (loading) return <div className="text-center p-8">Memuat...</div>;
    if (error) return <div className="text-center text-red-600 p-8">{error}</div>;
    if (!userData) return <div className="text-center p-8">Pengguna tidak ditemukan</div>;

    return (
        <div className="max-w-4xl mx-auto">
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
                   </div>
               </div>
                {/* Informasi Profil */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                       <div className="flex items-center space-x-3">
                           <FontAwesomeIcon icon={faBinoculars} className="text-gray-500" />
                           <span>{userData.totalObservations || 0} Observasi</span>
                       </div>
                       <div className="flex items-center space-x-3">
                           <FontAwesomeIcon icon={faEnvelope} className="text-gray-500" />
                           <span>{userData.email}</span>
                       </div>
                       <div className="flex items-center space-x-3">
                           <FontAwesomeIcon icon={faBuilding} className="text-gray-500" />
                           <span>{userData.organization}</span>
                       </div>
                       <div className="flex items-center space-x-3">
                           <FontAwesomeIcon icon={faPhone} className="text-gray-500" />
                           <span>{userData.phone}</span>
                       </div>
                   </div>
                    {/* Bio */}
                   {userData.bio && (
                       <div className="md:col-span-2">
                           <h2 className="text-lg font-semibold mb-2">Tentang</h2>
                           <p className="text-gray-700">{userData.bio}</p>
                       </div>
                   )}
               </div>
           </div>
       </div>
   );
}

export default UserProfile; 