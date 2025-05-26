import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../utils/api';
import MediaViewer from './MediaViewer';
import ChecklistMapBurkup from './ChecklistMapBurkup';
import ImageComments from './ImageComments';
import LocationDetail from './LocationDetail';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

function DetailChecklistBurkup() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [locationName, setLocationName] = useState('Memuat lokasi...');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [ratingsUpdated, setRatingsUpdated] = useState(0);

    // Fungsi helper untuk menentukan source
    const getSource = (checklistId) => {
        if (checklistId.startsWith('BN') || checklistId.startsWith('BNAPP')) {
            return 'burungnesia';
        } else if (checklistId.startsWith('KP') || checklistId.startsWith('KPAPP')) {
            return 'kupunesia';
        }
        throw new Error('Format ID checklist tidak valid');
    };

    const {
        data: checklistData,
        isLoading,
        error
    } = useQuery({
        queryKey: ['simple-checklist', id],
        queryFn: async () => {
            const source = getSource(id);
            const response = await apiFetch(`/observations/${id}/simple?source=${source}`);
            return response.json();
        }
    });

    useEffect(() => {
        if (checklistData?.data?.checklist?.latitude && checklistData?.data?.checklist?.longitude) {
            getLocationName(
                checklistData.data.checklist.latitude,
                checklistData.data.checklist.longitude
            ).then(name => setLocationName(name));
        }
    }, [checklistData]);

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

    // Cek apakah user adalah pemilik atau admin
    const canEdit = checklistData?.data?.checklist && (
        localStorage.getItem('user_id') === checklistData.data.checklist.fobi_user_id?.toString() ||
        [3, 4].includes(parseInt(localStorage.getItem('level')))
    );

    // Handle delete checklist
    const handleDelete = async () => {
        try {
            const source = getSource(id);
            const token = localStorage.getItem('jwt_token');

            if (!token) {
                throw new Error('Sesi telah berakhir, silakan login kembali');
            }

            const response = await apiFetch(`/observations/${id}?source=${source}`, {
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

    // Handle delete fauna
    const handleDeleteFauna = async (faunaId) => {
        try {
            const source = getSource(id);
            const userId = localStorage.getItem('user_id');
            const userLevel = parseInt(localStorage.getItem('level'));

            if (userId !== checklistData.data.checklist.fobi_user_id?.toString() &&
                ![3, 4].includes(userLevel)) {
                throw new Error('Anda tidak memiliki izin untuk menghapus spesies ini');
            }

            const response = await apiFetch(`/observations/${id}/fauna/${faunaId}?source=${source}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                queryClient.invalidateQueries(['simple-checklist', id]);
            } else {
                throw new Error('Gagal menghapus spesies');
            }
        } catch (error) {
            console.error('Error deleting fauna:', error);
            alert(error.message || 'Gagal menghapus spesies');
        }
    };

    const handleRatingsUpdate = () => {
        setRatingsUpdated(prev => prev + 1);
    };

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
        <div className="container mx-auto px-4 py-8 mt-10 bg-[#121212] text-[#e0e0e0]">
            {/* Header */}
            <div className="bg-[#1e1e1e] rounded-lg shadow p-6 mb-6 border border-[#444]">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-[#b0b0b0]">
                            Oleh: {checklistData?.data?.checklist?.username || 'Tidak diketahui'} pada{' '}
                            {new Date(checklistData?.data?.checklist?.tgl_pengamatan).toLocaleDateString('id-ID')}
                            <div className="mt-2">
                                Total Observasi: {checklistData?.data?.checklist?.total_observations || '0'}
                            </div>
                        </div>
                    </div>
                    {canEdit && (
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

            {/* Edit Modal */}
            {showEditModal && (
                <EditChecklistModal
                    checklist={checklistData?.data?.checklist}
                    fauna={checklistData?.data?.fauna}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={() => {
                        setShowEditModal(false);
                        queryClient.invalidateQueries(['simple-checklist', id]);
                    }}
                    source={getSource(id)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <DeleteConfirmationModal
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDelete}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Media Section */}
                <div className="bg-[#1e1e1e] rounded-lg shadow p-6 border border-[#444]">
                    <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Media</h2>
                    <MediaViewer
                        checklistData={checklistData?.data}
                        images={checklistData?.data?.media?.images || []}
                        sounds={checklistData?.data?.media?.sounds || []}
                        onRatingUpdate={handleRatingsUpdate}
                    />
                </div>

                {/* Details Section */}
                <div className="bg-[#1e1e1e] rounded-lg shadow p-6 border border-[#444]">
                    <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Detail Lokasi</h2>
                    <div className="mb-6">
                        <ChecklistMapBurkup
                            latitude={checklistData?.data?.checklist?.latitude}
                            longitude={checklistData?.data?.checklist?.longitude}
                            locationName={locationName}
                        />
                        <p className="text-sm text-[#b0b0b0] mt-2 text-center">
                            {locationName}
                        </p>
                    </div>
                </div>
            </div>

            {/* Comments & Ratings Section (replacing Taxonomy Section) */}
            <div className="mt-6">
                <ImageComments 
                    images={checklistData?.data?.media?.images || []}
                    key={`comments-container-${ratingsUpdated}`}
                    onRatingUpdate={handleRatingsUpdate}
                />
            </div>
        </div>
    );
}

// Delete Confirmation Modal
function DeleteConfirmationModal({ onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">Konfirmasi Hapus</h2>
                <p className="text-gray-600 mb-6">
                    Apakah Anda yakin ingin menghapus checklist ini? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    );
}

// Modal Edit Checklist
function EditChecklistModal({ checklist, fauna, onClose, onSuccess, source }) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        tgl_pengamatan: checklist?.tgl_pengamatan || '',
        start_time: checklist?.start_time || '',
        end_time: checklist?.end_time || '',
        latitude: checklist?.latitude || '',
        longitude: checklist?.longitude || '',
        additional_note: checklist?.additional_note || '',
        fauna: fauna?.map(f => ({
            ...f,
            isDeleted: false,
            count: f.jumlah || f.count || 0,
            notes: f.catatan || f.notes || ''
        })) || []
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const checklistId = checklist?.id?.toString();

            if (!checklistId) {
                throw new Error('ID checklist tidak valid');
            }

            const faunaData = formData.fauna.filter(f => !f.isDeleted).map(f => ({
                id: f.fauna_id || f.id,
                count: parseInt(f.count) || 0,
                notes: f.notes || '',
                breeding: Boolean(f.breeding),
                breeding_note: f.breeding_note || '',
                ...(source === 'kupunesia' && f.breeding_type_id ? { breeding_type_id: f.breeding_type_id } : {})
            }));

            const token = localStorage.getItem('jwt_token');
            if (!token) {
                throw new Error('Sesi telah berakhir, silakan login kembali');
            }

            const response = await apiFetch(`/observations/${checklistId}?source=${source}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tgl_pengamatan: formData.tgl_pengamatan,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    additional_note: formData.additional_note,
                    fauna: faunaData
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memperbarui checklist');
            }

            await queryClient.invalidateQueries(['simple-checklist', checklistId]);
            onSuccess();
            onClose();

        } catch (error) {
            console.error('Error updating checklist:', error);
            alert(error.message || 'Gagal memperbarui checklist');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">Edit Checklist</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Tanggal Pengamatan
                            </label>
                            <input
                                type="date"
                                value={formData.tgl_pengamatan}
                                onChange={e => setFormData({...formData, tgl_pengamatan: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Waktu Mulai
                                </label>
                                <input
                                    type="time"
                                    value={formData.start_time}
                                    onChange={e => setFormData({...formData, start_time: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Waktu Selesai
                                </label>
                                <input
                                    type="time"
                                    value={formData.end_time}
                                    onChange={e => setFormData({...formData, end_time: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Latitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.latitude}
                                    onChange={e => setFormData({...formData, latitude: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Longitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.longitude}
                                    onChange={e => setFormData({...formData, longitude: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Catatan Tambahan
                            </label>
                            <textarea
                                value={formData.additional_note}
                                onChange={e => setFormData({...formData, additional_note: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                rows={3}
                            />
                        </div>

                        {/* Fauna List dengan input jumlah dan catatan */}
                        <div className="mt-4">
                            <h3 className="font-medium mb-2">Daftar Spesies</h3>
                            {formData.fauna.map((f, index) => (
                                <div key={f.id} className={`p-4 ${f.isDeleted ? 'bg-red-50' : 'bg-gray-50'} rounded mb-2`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="font-medium">{f.nama_lokal}</div>
                                            <div className="mt-2 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-gray-600">
                                                        Jumlah
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={f.count}
                                                        onChange={e => {
                                                            const newFauna = [...formData.fauna];
                                                            newFauna[index].count = e.target.value;
                                                            setFormData({...formData, fauna: newFauna});
                                                        }}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                                        disabled={f.isDeleted}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-600">
                                                        Catatan
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={f.notes || ''}
                                                        onChange={e => {
                                                            const newFauna = [...formData.fauna];
                                                            newFauna[index].notes = e.target.value;
                                                            setFormData({...formData, fauna: newFauna});
                                                        }}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                                        disabled={f.isDeleted}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newFauna = [...formData.fauna];
                                                newFauna[index].isDeleted = !newFauna[index].isDeleted;
                                                setFormData({...formData, fauna: newFauna});
                                            }}
                                            className={`ml-4 text-sm ${f.isDeleted ? 'text-green-600' : 'text-red-600'}`}
                                        >
                                            {f.isDeleted ? 'Batalkan' : 'Hapus'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                            disabled={isSubmitting}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-4 py-2 text-white rounded-md ${
                                isSubmitting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default DetailChecklistBurkup;
