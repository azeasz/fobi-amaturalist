import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCheckCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../../../utils/api';

function BirdIdentificationPanel({
    checklist,
    identifications,
    setIdentifications,
    onIdentificationSubmit,
    user
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedBird, setSelectedBird] = useState(null);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDisagreeModal, setShowDisagreeModal] = useState(false);
    const [selectedIdentificationId, setSelectedIdentificationId] = useState(null);
    const [disagreeComment, setDisagreeComment] = useState('');
    const [identificationPhoto, setIdentificationPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    const handleSearch = async (query) => {
        if (query.length >= 3) {
            try {
                const response = await apiFetch(`/burnes/birds/search?q=${query}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'X-Source': 'burungnesia'
                    }
                });
                const data = await response.json();
                if (data.success) {
                    setSearchResults(data.data);
                }
            } catch (error) {
                console.error('Error searching birds:', error);
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBird) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('fauna_id', selectedBird.id);
            formData.append('comment', comment);

            const newIdentification = await onIdentificationSubmit(formData);
            setIdentifications(prev => [newIdentification, ...prev]);
            
            // Reset form
            setSelectedBird(null);
            setComment('');
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            console.error('Error submitting identification:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAgree = async (identificationId) => {
        try {
            const response = await apiFetch(
                `/bird-observations/${checklist.id}/identifications/${identificationId}/agree`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'X-Source': 'burungnesia'
                    }
                }
            );

            const data = await response.json();
            if (data.success) {
                setIdentifications(prev =>
                    prev.map(ident =>
                        ident.id === identificationId
                            ? { ...ident, agreement_count: data.data.agreement_count, user_agreed: true }
                            : ident
                    )
                );
            }
        } catch (error) {
            console.error('Error agreeing with identification:', error);
        }
    };

    // Handle photo upload
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIdentificationPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    // Handle withdraw identification
    const handleWithdraw = async (identificationId) => {
        try {
            const response = await apiFetch(
                `/burnes/identifications/${identificationId}/withdraw`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'X-Source': 'burungnesia'
                    }
                }
            );

            if (response.ok) {
                setIdentifications(prev =>
                    prev.map(ident =>
                        ident.id === identificationId
                            ? { ...ident, is_withdrawn: true }
                            : ident
                    )
                );
            }
        } catch (error) {
            console.error('Error withdrawing identification:', error);
        }
    };

    // Handle disagree with identification
    const handleDisagree = async (identificationId) => {
        try {
            const formData = new FormData();
            formData.append('comment', disagreeComment);
            if (identificationPhoto) {
                formData.append('photo', identificationPhoto);
            }

            const response = await apiFetch(
                `/burnes/identifications/${identificationId}/disagree`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'X-Source': 'burungnesia'
                    },
                    body: formData
                }
            );

            if (response.ok) {
                const data = await response.json();
                setIdentifications(prev => [...prev, data.data]);
                setShowDisagreeModal(false);
                setDisagreeComment('');
                setIdentificationPhoto(null);
                setPhotoPreview(null);
            }
        } catch (error) {
            console.error('Error disagreeing with identification:', error);
        }
    };

    // Render identification actions
    const renderIdentificationActions = (identification) => {
        const isOwnIdentification = user && user.id === identification.user_id;

        if (isOwnIdentification) {
            return !identification.is_withdrawn && (
                <button
                    onClick={() => handleWithdraw(identification.id)}
                    className="text-yellow-600 hover:text-yellow-700"
                >
                    <FontAwesomeIcon icon={faTimes} className="mr-1" />
                    Tarik Identifikasi
                </button>
            );
        }

        return !identification.user_agreed && !identification.is_withdrawn && (
            <div className="space-x-2">
                <button
                    onClick={() => handleAgree(identification.id)}
                    className="text-green-600 hover:text-green-700"
                >
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                    Setuju
                </button>
                <button
                    onClick={() => {
                        setSelectedIdentificationId(identification.id);
                        setShowDisagreeModal(true);
                    }}
                    className="text-red-600 hover:text-red-700"
                >
                    <FontAwesomeIcon icon={faTimes} className="mr-1" />
                    Tolak
                </button>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Detail Observasi</h2>
                <div className="text-gray-600">
                    <p className="font-medium">
                        {checklist?.scientific_name || checklist?.nameLat || 'Nama ilmiah tidak tersedia'}
                    </p>
                    <p>
                        {checklist?.common_name || checklist?.nameId || 'Nama umum tidak tersedia'}
                    </p>
                    <p className="text-sm mt-1">
                        Family: {checklist?.family || '-'}<br />
                        Genus: {checklist?.genus || '-'}<br />
                        Species: {checklist?.species || '-'}
                    </p>
                </div>

                {checklist.burungnesia_data && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                        <h3 className="text-sm font-medium text-gray-700">Data Burungnesia</h3>
                        <p className="text-sm text-gray-600">
                            {checklist.burungnesia_data.scientific_name_burung}<br />
                            {checklist.burungnesia_data.common_name_burung}
                        </p>
                    </div>
                )}
            </div>

            {/* Form Identifikasi */}
            <form onSubmit={handleSubmit} className="mb-6">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cari Spesies
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                handleSearch(e.target.value);
                            }}
                            className="w-full p-2 border rounded pr-10"
                            placeholder="Ketik nama spesies..."
                        />
                        <FontAwesomeIcon 
                            icon={faSearch}
                            className="absolute right-3 top-3 text-gray-400"
                        />
                    </div>

                    {searchResults.length > 0 && (
                        <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                            {searchResults.map(bird => (
                                <div
                                    key={bird.id}
                                    onClick={() => {
                                        setSelectedBird(bird);
                                        setSearchQuery(bird.scientific_name);
                                        setSearchResults([]);
                                    }}
                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                >
                                    <div className="font-medium">{bird.scientific_name}</div>
                                    <div className="text-sm text-gray-600">{bird.common_name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Komentar
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full p-2 border rounded"
                        rows="3"
                    />
                </div>

                <button
                    type="submit"
                    disabled={!selectedBird || loading}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-300"
                >
                    {loading ? 'Mengirim...' : 'Kirim Identifikasi'}
                </button>
            </form>

            {/* List of Identifications */}
            <div className="space-y-4">
                {identifications?.map(identification => (
                    <div key={identification.id} className="border rounded p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-medium">{identification.scientific_name}</div>
                                <div className="text-sm text-gray-600">
                                    oleh {identification.identifier_name}
                                </div>
                                {identification.comment && (
                                    <div className="mt-2 text-gray-700">{identification.comment}</div>
                                )}
                                <div className="mt-2 text-sm text-gray-500">
                                    {identification.agreement_count || 0} persetujuan
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                {user && user.id === identification.user_id && !identification.is_withdrawn && (
                                    <button
                                        onClick={() => handleWithdraw(identification.id)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <FontAwesomeIcon icon={faTimes} className="mr-1" />
                                        Tarik
                                    </button>
                                )}
                                {user && user.id !== identification.user_id && !identification.is_withdrawn && (
                                    <div className="flex flex-col gap-2">
                                        {!identification.user_agreed && (
                                            <button
                                                onClick={() => handleAgree(identification.id)}
                                                className="text-blue-500 hover:text-blue-600"
                                            >
                                                <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                Setuju
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedIdentificationId(identification.id);
                                                setShowDisagreeModal(true);
                                            }}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <FontAwesomeIcon icon={faTimes} className="mr-1" />
                                            Tidak Setuju
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {identification.is_withdrawn && (
                            <div className="mt-2 text-sm text-gray-500 italic">
                                Identifikasi ini telah ditarik
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal Disagree */}
            {showDisagreeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96">
                        <h3 className="text-lg font-semibold mb-4">Tolak Identifikasi</h3>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Alasan Penolakan
                            </label>
                            <textarea
                                value={disagreeComment}
                                onChange={(e) => setDisagreeComment(e.target.value)}
                                className="w-full p-2 border rounded"
                                rows="4"
                                placeholder="Berikan alasan penolakan..."
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Foto Pendukung (Opsional)
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="w-full"
                            />
                            {photoPreview && (
                                <img
                                    src={photoPreview}
                                    alt="Preview"
                                    className="mt-2 h-32 w-auto object-cover rounded"
                                />
                            )}
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setShowDisagreeModal(false);
                                    setDisagreeComment('');
                                    setIdentificationPhoto(null);
                                    setPhotoPreview(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleDisagree(selectedIdentificationId)}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Kirim
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BirdIdentificationPanel; 