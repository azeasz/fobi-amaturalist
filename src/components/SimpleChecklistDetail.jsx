import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../utils/api';
import { useQuery } from '@tanstack/react-query';

function SimpleChecklistDetail() {
    const { id } = useParams();
    const [locationName, setLocationName] = useState('Memuat lokasi...');
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);

    // Query untuk mengambil data checklist
    const {
        data: checklistData,
        isLoading,
        error
    } = useQuery({
        queryKey: ['simple-checklist', id],
        queryFn: async () => {
            const source = id.startsWith('BN') ? 'burungnesia' : 'kupunesia';
            const response = await apiFetch(`/observations/${id}/simple?source=${source}`);
            return response.json();
        }
    });

    // Fungsi untuk mendapatkan nama lokasi
    const getLocationName = async (latitude, longitude) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            return data.display_name;
        } catch (error) {
            console.error('Error fetching location name:', error);
            return 'Gagal memuat nama lokasi';
        }
    };

    // Effect untuk mengambil nama lokasi
    useEffect(() => {
        if (checklistData?.data?.checklist?.latitude && checklistData?.data?.checklist?.longitude) {
            getLocationName(
                checklistData.data.checklist.latitude,
                checklistData.data.checklist.longitude
            ).then(name => setLocationName(name));
        }
    }, [checklistData]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-gray-600">Memuat...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-600">Error: {error.message}</div>
            </div>
        );
    }

    const { checklist, media } = checklistData.data;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">
                            {checklist.fauna.nama_lokal || 'Nama tidak tersedia'}
                        </h1>
                        <h2 className="text-xl text-gray-600 italic mb-2">
                            {checklist.fauna.nama_ilmiah || 'Nama ilmiah tidak tersedia'}
                        </h2>
                        <div className="text-gray-600">
                            Pengamat: {checklist.observer || 'Tidak diketahui'} pada{' '}
                            {new Date(checklist.tgl_pengamatan).toLocaleDateString('id-ID')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Media Section */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Media</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {media.images.map((image, index) => (
                            <div
                                key={image.id}
                                className="relative cursor-pointer"
                                onClick={() => {
                                    setActiveImageIndex(index);
                                    setShowImageModal(true);
                                }}
                            >
                                <img
                                    src={image.url}
                                    alt={image.caption || 'Foto pengamatan'}
                                    className="w-full h-48 object-cover rounded-lg"
                                />
                            </div>
                        ))}
                    </div>
                    {media.sounds.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold mb-2">Rekaman Suara</h3>
                            {media.sounds.map(sound => (
                                <div key={sound.id} className="mb-2">
                                    <audio controls className="w-full">
                                        <source src={sound.url} type="audio/mpeg" />
                                        Browser Anda tidak mendukung pemutaran audio.
                                    </audio>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className="space-y-6">
                    {/* Location */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Lokasi</h2>
                        <div className="mb-4">
                            <div className="h-64 bg-gray-200 rounded-lg">
                                {/* Tambahkan komponen peta di sini */}
                                <div className="w-full h-full flex items-center justify-center">
                                    <FontAwesomeIcon
                                        icon={faMapMarkerAlt}
                                        className="text-red-500 text-2xl"
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-2 text-center">
                                {locationName}
                            </p>
                        </div>
                    </div>

                    {/* Taxonomic Details */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Detail Taksonomi</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="font-semibold">Family</div>
                                <div>{checklist.fauna.family || '-'}</div>
                            </div>
                            <div>
                                <div className="font-semibold">Genus</div>
                                <div>{checklist.fauna.genus || '-'}</div>
                            </div>
                            <div>
                                <div className="font-semibold">Species</div>
                                <div>{checklist.fauna.species || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Notes */}
                    {checklist.additional_note && (
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Catatan Tambahan</h2>
                            <p className="text-gray-700">{checklist.additional_note}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Image Modal */}
            {showImageModal && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="max-w-4xl w-full mx-4">
                        <img
                            src={media.images[activeImageIndex].url}
                            alt={media.images[activeImageIndex].caption || 'Foto pengamatan'}
                            className="w-full h-auto max-h-[80vh] object-contain"
                        />
                        <button
                            className="absolute top-4 right-4 text-white text-2xl"
                            onClick={() => setShowImageModal(false)}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SimpleChecklistDetail;
