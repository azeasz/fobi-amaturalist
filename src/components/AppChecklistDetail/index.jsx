import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../utils/api';
import EditChecklistModal from './EditChecklistModal';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import MediaViewer from './MediaViewer';
import ChecklistMapBurkup from './ChecklistMapBurkup';
import TaxonomyDetail from './TaxonomyDetail';
import LocationDetail from './LocationDetail';
import ImageComments from './ImageComments';

function AppChecklistDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [locationName, setLocationName] = useState('Memuat lokasi...');
    const queryClient = useQueryClient();
    const [ratingsUpdated, setRatingsUpdated] = useState(0);

    // Fungsi untuk memperbarui state ketika rating diubah
    const handleRatingsUpdate = () => {
        setRatingsUpdated(prev => prev + 1);
    };

    // Tentukan source dan endpoint berdasarkan prefix ID
    const source = id.startsWith('BN') ? 'burungnesia' :
                  id.startsWith('KP') ? 'kupunesia' : 'fobi';

    const endpoint = (() => {
        if (source === 'burungnesia') {
            return `/burungnesia/checklists/${id.substring(2)}`;
        } else if (source === 'kupunesia') {
            return `/kupunesia/checklists/${id.substring(2)}`;
        }
        return null;
    })();

    // Query untuk mengambil data checklist
    const { data: checklistData, isLoading, error } = useQuery({
        queryKey: ['checklist', id],
        queryFn: async () => {
            if (!endpoint) {
                throw new Error('ID checklist tidak valid');
            }
            const response = await apiFetch(endpoint);
            if (!response.ok) {
                throw new Error('Gagal memuat data checklist');
            }
            return response.json();
        },
        enabled: !!endpoint
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

    useEffect(() => {
        if (checklistData?.data?.checklist?.latitude && checklistData?.data?.checklist?.longitude) {
            getLocationName(
                checklistData.data.checklist.latitude,
                checklistData.data.checklist.longitude
            ).then(name => setLocationName(name));
        }
    }, [checklistData]);

    const handleUpdateSuccess = async () => {
        await queryClient.invalidateQueries(['checklist', id]);
        setShowEditModal(false);
    };

    // Handle delete checklist
    const handleDelete = async () => {
        try {
            if (!endpoint) {
                throw new Error('ID checklist tidak valid');
            }
            
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                throw new Error('Sesi telah berakhir, silakan login kembali');
            }

            const response = await apiFetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                navigate('/observations');
            } else {
                throw new Error('Gagal menghapus checklist');
            }
        } catch (error) {
            console.error('Error deleting checklist:', error);
            alert(error.message || 'Gagal menghapus checklist');
        }
    };

    if (!source) {
        return <div className="text-red-400 text-center p-4 bg-[#121212]">Error: Format ID tidak valid</div>;
    }

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

    const { checklist, fauna, media } = checklistData.data;

    return (
        <div className="container mx-auto px-4 py-8 mt-10 bg-[#121212] text-[#e0e0e0]">
            {/* Header */}
            <div className="bg-[#1e1e1e] rounded-lg shadow p-6 mb-6 border border-[#444]">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-[#b0b0b0]">
                            Oleh: {checklist.username || 'Tidak diketahui'} pada{' '}
                            {new Date(checklist.tgl_pengamatan).toLocaleDateString('id-ID')}
                            <div className="mt-2">
                                Total Observasi: {checklist.total_observations || '0'}
                            </div>
                        </div>
                    </div>
                    {checklist.can_edit && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="p-2 text-[#1a73e8] hover:bg-[#2c2c2c] rounded-full"
                                title="Edit Checklist"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="p-2 text-red-400 hover:bg-[#2c2c2c] rounded-full"
                                title="Hapus Checklist"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Media Section */}
                <div className="bg-[#1e1e1e] rounded-lg shadow p-6 border border-[#444]">
                    <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Media</h2>
                    <MediaViewer
                        checklistData={checklistData.data}
                        images={media.images || []}
                        sounds={media.sounds || []}
                        onRatingUpdate={handleRatingsUpdate}
                        source={source}
                    />
                </div>

                {/* Details Section */}
                <div className="bg-[#1e1e1e] rounded-lg shadow p-6 border border-[#444]">
                    <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Detail Lokasi</h2>
                    <div className="mb-6">
                        <ChecklistMapBurkup
                            latitude={checklist.latitude}
                            longitude={checklist.longitude}
                            locationName={locationName}
                            source={source}
                        />
                        <p className="text-sm text-[#b0b0b0] mt-2 text-center">
                            {locationName}
                        </p>
                    </div>
                </div>
            </div>

            {/* Comments & Ratings Section */}
            <div className="mt-6">
                <ImageComments 
                    images={media.images || []}
                    key={`comments-container-${ratingsUpdated}`}
                    onRatingUpdate={handleRatingsUpdate}
                    source={source}
                />
            </div>

            {/* Taxonomy Section */}
            <div className="mt-6 bg-[#1e1e1e] rounded-lg shadow p-6 border border-[#444]">
                <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Daftar Fauna</h2>
                <div className="space-y-4">
                    <TaxonomyDetail
                        fauna={fauna}
                        checklist={checklist}
                    />
                </div>
            </div>

            {/* Additional Notes */}
            {checklist.additional_note && (
                <div className="mt-6 bg-[#1e1e1e] rounded-lg shadow p-6 border border-[#444]">
                    <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Catatan Tambahan</h2>
                    <p className="text-[#b0b0b0]">{checklist.additional_note}</p>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && checklist.can_edit && (
                <EditChecklistModal
                    checklist={checklist}
                    fauna={fauna}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={handleUpdateSuccess}
                    source={source}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <DeleteConfirmationModal
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    );
}

// Delete Confirmation Modal
function DeleteConfirmationModal({ onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-md w-full border border-[#444]">
                <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Konfirmasi Hapus</h2>
                <p className="text-[#b0b0b0] mb-6">
                    Apakah Anda yakin ingin menghapus checklist ini? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[#2c2c2c] text-[#e0e0e0] rounded-lg hover:bg-[#333] transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AppChecklistDetail;
