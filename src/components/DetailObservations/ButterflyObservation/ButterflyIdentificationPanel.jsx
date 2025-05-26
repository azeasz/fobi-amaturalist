import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCheckCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../../../utils/api';

// Fungsi untuk mengkonversi grade dari backend ke tampilan frontend
const convertGradeToDisplay = (grade) => {
    switch(grade?.toLowerCase()) {
        case 'research grade':
            return 'ID Lengkap';
        case 'low quality id':
            return 'ID Kurang';
        case 'needs id':
            return 'Bantu Iden';
        case 'casual':
            return 'Casual';
        default:
            return 'Bantu Iden';
    }
};

function ButterflyIdentificationPanel({
    checklist,
    identifications,
    setIdentifications,
    onIdentificationSubmit,
    user,
    onGradeUpdate
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedButterfly, setSelectedButterfly] = useState(null);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDisagreeModal, setShowDisagreeModal] = useState(false);
    const [selectedIdentificationId, setSelectedIdentificationId] = useState(null);
    const [disagreeComment, setDisagreeComment] = useState('');
    const [identificationPhoto, setIdentificationPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [selectedTaxon, setSelectedTaxon] = useState(null);

    console.log('Checklist:', checklist);
    console.log('Identifications:', identifications);

    const handleSearch = async (query) => {
        if (query.length >= 3) {
            try {
                const response = await apiFetch(`/kupunesia/species/search?q=${query}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'X-Source': 'kupunesia'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setSearchResults(data.data);
                }
            } catch (error) {
                console.error('Error searching species:', error);
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedButterfly) return;

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('fauna_id', selectedButterfly.id);
            formData.append('comment', comment);
            formData.append('identification_level', selectedButterfly.species ? 'species' : 
                                                  selectedButterfly.genus ? 'genus' : 
                                                  selectedButterfly.family ? 'family' : 
                                                  selectedButterfly.order ? 'order' : 'class');
            
            if (identificationPhoto) {
                formData.append('photo', identificationPhoto);
            }

            const response = await apiFetch(`/kupunesia/observations/${checklist.id}/identifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'X-Source': 'kupunesia'
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setIdentifications(prev => [data.data, ...prev]);
                // Reset form
                setSearchQuery('');
                setSelectedButterfly(null);
                setComment('');
                setIdentificationPhoto(null);
                setPhotoPreview(null);
            }
        } catch (error) {
            console.error('Error submitting identification:', error);
        } finally {
            setLoading(false);
        }

        await evaluateQuality();
    };

    const handleAgree = async (identificationId) => {
        try {
            // Cari identifikasi yang akan disetujui
            const identificationToAgree = identifications.find(i => i.id === identificationId);
            
            const response = await apiFetch(`/kupunesia/observations/${checklist.id}/identifications/${identificationId}/agree`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'X-Source': 'kupunesia'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Update identifications dengan menambahkan sub-identification
                setIdentifications(prev => {
                    const newIdentifications = [...prev];
                    // Tambahkan sub-identification yang baru
                    newIdentifications.unshift({
                        ...data.data,
                        is_sub_identification: true, // Tandai sebagai sub-identification
                        parent_identification_id: identificationId
                    });
                    return newIdentifications;
                });
                
                await evaluateQuality();
            }
        } catch (error) {
            console.error('Error agreeing with identification:', error);
        }
    };

    const handleWithdraw = async (identificationId) => {
        try {
            const response = await apiFetch(`/kupunesia/observations/${checklist.id}/identifications/${identificationId}/withdraw`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'X-Source': 'kupunesia'
                }
            });

            if (response.ok) {
                // Update identifications dengan menandai sebagai withdrawn
                setIdentifications(prev => 
                    prev.map(ident => 
                        ident.id === identificationId 
                            ? { ...ident, is_withdrawn: true }
                            : ident
                    )
                );
                
                await evaluateQuality();
            }
        } catch (error) {
            console.error('Error withdrawing identification:', error);
        }
    };

    const handleCancelAgreement = async (identificationId) => {
        try {
            const response = await apiFetch(`/kupunesia/observations/${checklist.id}/identifications/${identificationId}/cancel-agreement`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'X-Source': 'kupunesia'
                }
            });

            if (response.ok) {
                // Hapus sub-identification dari list
                setIdentifications(prev => 
                    prev.filter(ident => ident.id !== identificationId)
                );
                
                await evaluateQuality();
            }
        } catch (error) {
            console.error('Error canceling agreement:', error);
        }
    };

    const handleDisagree = async (identificationId) => {
        if (!selectedTaxon) {
            alert('Pilih taxa terlebih dahulu');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('taxon_id', selectedTaxon.kupnes_fauna_id || selectedTaxon.id);
            formData.append('comment', disagreeComment);
            
            formData.append('identification_level', 
                selectedTaxon.taxon_rank || 
                (selectedTaxon.species ? 'species' : 
                 selectedTaxon.genus ? 'genus' : 
                 selectedTaxon.family ? 'family' : 
                 selectedTaxon.order ? 'order' : 'class')
            );
            
            if (identificationPhoto) {
                formData.append('photo', identificationPhoto);
            }

            const response = await apiFetch(
                `/kupunesia/observations/${checklist.id}/identifications/${identificationId}/disagree`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'X-Source': 'kupunesia'
                    },
                    body: formData
                }
            );

            if (response.ok) {
                const data = await response.json();
                setIdentifications(prev => [data.data, ...prev]);
                setShowDisagreeModal(false);
                setDisagreeComment('');
                setSearchQuery('');
                setSelectedTaxon(null);
                setIdentificationPhoto(null);
                setPhotoPreview(null);
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Terjadi kesalahan saat mengirim ketidaksetujuan');
            }
        } catch (error) {
            console.error('Error disagreeing with identification:', error);
            alert('Terjadi kesalahan saat menolak identifikasi');
        }

        await evaluateQuality();
    };

    const isOwnIdentification = (identification) => {
        console.log('Current user:', user);
        console.log('Identification:', identification);
        return user && identification && String(user.id) === String(identification.user_id);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIdentificationPhoto(file);
            // Buat preview foto
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const evaluateQuality = async () => {
        try {
            const response = await apiFetch(`/kupunesia/observations/${checklist.id}/evaluate-quality`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'X-Source': 'kupunesia'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && onGradeUpdate) {
                    onGradeUpdate(convertGradeToDisplay(data.grade));
                    // Update IUCN status jika ada
                    if (data.iucn_status) {
                        setIucnStatus(data.iucn_status);
                    }
                }
            }
        } catch (error) {
            console.error('Error evaluating quality:', error);
        }
    };

    // Render identification item
    const renderIdentificationItem = (identification) => {
        const isOwnIdentification = identification.user_id === user?.id;
        const isSubIdentification = identification.is_sub_identification;
        const isWithdrawn = identification.is_withdrawn;

        return (
            <div key={identification.id} 
                 className={`p-4 border rounded mb-2 ${isWithdrawn ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        <div className={`font-medium ${identification?.is_withdrawn ? 'line-through text-gray-400' : ''}`}>
                            {identification?.scientific_name || 'Nama ilmiah tidak tersedia'}
                            {identification?.is_withdrawn && (
                                <span className="ml-2 text-sm text-red-500 no-underline">
                                    (Ditarik)
                                </span>
                            )}
                        </div>
                        <div className={`text-sm ${identification?.is_withdrawn ? 'text-gray-400' : 'text-gray-600'}`}>
                            oleh {identification?.identifier_name || 'Pengguna tidak diketahui'}
                        </div>
                        {identification?.photo_path && (
                            <div className="mt-2">
                                <img 
                                    src={identification.photo_path} 
                                    alt="Foto pendukung identifikasi"
                                    className="max-h-48 rounded-lg object-cover"
                                    onClick={() => {
                                        // Opsional: Tambahkan modal/lightbox untuk melihat foto lebih besar
                                        window.open(identification.photo_path, '_blank');
                                    }}
                                    style={{ cursor: 'pointer' }}
                                />
                            </div>
                        )}
                        {identification?.comment && (
                            <div className={`mt-2 ${identification?.is_withdrawn ? 'text-gray-400' : 'text-gray-700'}`}>
                                {identification.comment}
                            </div>
                        )}
                        <div className={`mt-2 text-sm ${identification?.is_withdrawn ? 'text-gray-400' : 'text-gray-500'}`}>
                            {identification?.agreement_count || 0} persetujuan
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                        {!identification?.is_withdrawn && (
                            <>
                                {isOwnIdentification ? (
                                    <button
                                        onClick={() => handleWithdraw(identification?.id)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <FontAwesomeIcon icon={faTimes} className="mr-1" />
                                        Tarik Usulan
                                    </button>
                                ) : (
                                    !identification?.user_agreed && (
                                        <>
                                            <button
                                                onClick={() => handleAgree(identification?.id)}
                                                className="text-blue-500 hover:text-blue-600"
                                            >
                                                <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                Setuju
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedIdentificationId(identification?.id);
                                                    setShowDisagreeModal(true);
                                                }}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <FontAwesomeIcon icon={faTimes} className="mr-1" />
                                                Tidak Setuju
                                            </button>
                                        </>
                                    )
                                )}
                            </>
                        )}
                    </div>
                </div>
                {identification?.is_withdrawn && (
                    <div className="mt-2 text-sm text-gray-500 italic">
                        Identifikasi ini telah ditarik
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Detail Observasi</h2>
                <div className="text-gray-600">
                    <p className="font-medium">
                        {checklist?.scientific_name || 'Nama ilmiah tidak tersedia'}
                    </p>
                    <p>
                        {checklist?.common_name || 'Nama umum tidak tersedia'}
                    </p>
                    <p className="text-sm mt-1">
                        Class: {checklist?.class || '-'}<br />
                        Order: {checklist?.order || '-'}<br />
                        Family: {checklist?.family || '-'}<br />
                        Genus: {checklist?.genus || '-'}<br />
                        Species: {checklist?.species || '-'}
                    </p>
                    {checklist?.iucn_status && (
                        <p className="mt-2">
                            <span className="font-medium">Status IUCN:</span> {checklist.iucn_status}
                        </p>
                    )}
                    <p className="mt-2">
                        <span className="font-medium">Grade:</span>{' '}
                        <span className={`font-medium ${
                            checklist?.quality_grade === 'ID Lengkap' ? 'text-green-600' :
                            checklist?.quality_grade === 'ID Kurang' ? 'text-yellow-600' :
                            checklist?.quality_grade === 'Bantu Iden' ? 'text-blue-600' :
                            'text-gray-600'
                        }`}>
                            {checklist?.quality_grade || 'Bantu Iden'}
                        </span>
                    </p>
                </div>
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
                        <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1">
                            {searchResults.map((butterfly) => (
                                <div
                                    key={butterfly.id}
                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                        setSelectedButterfly(butterfly);
                                        setSearchQuery(butterfly.scientific_name);
                                        setSearchResults([]);
                                    }}
                                >
                                    <p className="font-medium">{butterfly.scientific_name}</p>
                                    <p className="text-sm text-gray-600">{butterfly.common_name}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto Pendukung (Opsional)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                setIdentificationPhoto(file);
                                // Buat preview foto
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setPhotoPreview(reader.result);
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                        className="w-full"
                    />
                    {photoPreview && (
                        <div className="mt-2">
                            <img 
                                src={photoPreview} 
                                alt="Preview" 
                                className="max-h-32 rounded"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setIdentificationPhoto(null);
                                    setPhotoPreview(null);
                                }}
                                className="mt-2 text-red-500 text-sm hover:text-red-600"
                            >
                                Hapus Foto
                            </button>
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Komentar (opsional)
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full p-2 border rounded"
                        rows="3"
                        placeholder="Tambahkan komentar..."
                    />
                </div>

                <button
                    type="submit"
                    disabled={!selectedButterfly || loading}
                    className={`w-full py-2 px-4 rounded ${
                        !selectedButterfly || loading
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                >
                    {loading ? 'Mengirim...' : 'Kirim Identifikasi'}
                </button>
            </form>

            {/* List of Identifications */}
            <div className="space-y-4">
                {identifications?.map((identification) => {
                    const isOwner = isOwnIdentification(identification);

                    return (
                        <div 
                            key={identification.id}
                            className="border-b last:border-b-0 py-4"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                    <div className={`font-medium ${identification?.is_withdrawn ? 'line-through text-gray-400' : ''}`}>
                                        {identification?.scientific_name || 'Nama ilmiah tidak tersedia'}
                                        {identification?.is_withdrawn && (
                                            <span className="ml-2 text-sm text-red-500 no-underline">
                                                (Ditarik)
                                            </span>
                                        )}
                                    </div>
                                    <div className={`text-sm ${identification?.is_withdrawn ? 'text-gray-400' : 'text-gray-600'}`}>
                                        oleh {identification?.identifier_name || 'Pengguna tidak diketahui'}
                                    </div>
                                    {identification?.photo_path && (
                                        <div className="mt-2">
                                            <img 
                                                src={identification.photo_path} 
                                                alt="Foto pendukung identifikasi"
                                                className="max-h-48 rounded-lg object-cover"
                                                onClick={() => {
                                                    // Opsional: Tambahkan modal/lightbox untuk melihat foto lebih besar
                                                    window.open(identification.photo_path, '_blank');
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </div>
                                    )}
                                    {identification?.comment && (
                                        <div className={`mt-2 ${identification?.is_withdrawn ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {identification.comment}
                                        </div>
                                    )}
                                    <div className={`mt-2 text-sm ${identification?.is_withdrawn ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {identification?.agreement_count || 0} persetujuan
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                    {!identification?.is_withdrawn && (
                                        <>
                                            {isOwner ? (
                                                <button
                                                    onClick={() => handleWithdraw(identification?.id)}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <FontAwesomeIcon icon={faTimes} className="mr-1" />
                                                    Tarik Usulan
                                                </button>
                                            ) : (
                                                !identification?.user_agreed && (
                                                    <>
                                                        <button
                                                            onClick={() => handleAgree(identification?.id)}
                                                            className="text-blue-500 hover:text-blue-600"
                                                        >
                                                            <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                            Setuju
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedIdentificationId(identification?.id);
                                                                setShowDisagreeModal(true);
                                                            }}
                                                            className="text-red-500 hover:text-red-600"
                                                        >
                                                            <FontAwesomeIcon icon={faTimes} className="mr-1" />
                                                            Tidak Setuju
                                                        </button>
                                                    </>
                                                )
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            {identification?.is_withdrawn && (
                                <div className="mt-2 text-sm text-gray-500 italic">
                                    Identifikasi ini telah ditarik
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal Disagree */}
            {showDisagreeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96">
                        <h3 className="text-lg font-semibold mb-4">Tolak Identifikasi</h3>
                        
                        {/* Input pencarian taxa */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cari Taxa
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
                                    placeholder="Ketik nama taxa..."
                                />
                                <FontAwesomeIcon 
                                    icon={faSearch}
                                    className="absolute right-3 top-3 text-gray-400"
                                />
                            </div>

                            {searchResults.length > 0 && (
                                <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                                    {searchResults.map(taxa => (
                                        <div
                                            key={taxa.id}
                                            onClick={() => {
                                                setSelectedTaxon(taxa);
                                                setSearchQuery(taxa.scientific_name);
                                                setSearchResults([]);
                                            }}
                                            className="p-2 hover:bg-gray-100 cursor-pointer"
                                        >
                                            <div className="font-medium">{taxa.scientific_name}</div>
                                            <div className="text-sm text-gray-600">{taxa.common_name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedTaxon && (
                                <div className="mt-2 p-2 bg-gray-50 rounded border">
                                    <p className="font-medium">{selectedTaxon.scientific_name}</p>
                                    <p className="text-sm text-gray-600">
                                        Level: {selectedTaxon.taxon_rank || 
                                               (selectedTaxon.species ? 'species' : 
                                                selectedTaxon.genus ? 'genus' : 
                                                selectedTaxon.family ? 'family' : 
                                                selectedTaxon.order ? 'order' : 'class')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Input foto */}
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
                                <div className="mt-2">
                                    <img 
                                        src={photoPreview} 
                                        alt="Preview" 
                                        className="max-h-32 rounded"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Input alasan penolakan */}
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

                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    if (!selectedTaxon) {
                                        alert('Pilih taxa terlebih dahulu');
                                        return;
                                    }
                                    handleDisagree(selectedIdentificationId);
                                }}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                Kirim
                            </button>
                            <button
                                onClick={() => {
                                    setShowDisagreeModal(false);
                                    setDisagreeComment('');
                                    setSearchQuery('');
                                    setSelectedTaxon(null);
                                    setIdentificationPhoto(null);
                                    setPhotoPreview(null);
                                }}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Status Observasi</h3>
                
                {/* Quality Grade */}
                <div className="mb-2">
                    <span className="font-medium">Grade: </span>
                    <span className={`${
                        checklist?.quality_grade === 'ID Lengkap' ? 'text-green-600' :
                        checklist?.quality_grade === 'ID Kurang' ? 'text-yellow-600' :
                        checklist?.quality_grade === 'Bantu Iden' ? 'text-blue-600' :
                        'text-gray-600'
                    } font-medium`}>
                        {checklist?.quality_grade || 'Bantu Iden'}
                    </span>
                </div>

                {/* IUCN Status - hanya tampil jika Research Grade */}
                {checklist?.quality_grade === 'ID Lengkap' && checklist?.iucn_status && (
                    <div className="mb-2">
                        <span className="font-medium">Status IUCN: </span>
                        <span className={`${
                            checklist.iucn_status === 'Extinct' ? 'text-black' :
                            checklist.iucn_status === 'Extinct in the Wild' ? 'text-gray-600' :
                            checklist.iucn_status === 'Critically Endangered' ? 'text-red-600' :
                            checklist.iucn_status === 'Endangered' ? 'text-orange-600' :
                            checklist.iucn_status === 'Vulnerable' ? 'text-yellow-600' :
                            checklist.iucn_status === 'Near Threatened' ? 'text-blue-600' :
                            checklist.iucn_status === 'Least Concern' ? 'text-green-600' :
                            'text-gray-600'
                        } font-medium`}>
                            {checklist.iucn_status}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ButterflyIdentificationPanel; 