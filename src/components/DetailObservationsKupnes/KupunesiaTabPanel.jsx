import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faComments,
    faSearch,
    faCheckCircle,
    faMapMarkerAlt,
    faPaw
} from '@fortawesome/free-solid-svg-icons';
import 'react-quill/dist/quill.snow.css';
import { apiFetch } from '../../utils/api';
import { Link } from 'react-router-dom';

function KupunesiaTabPanel({
    id,
    activeTab,
    setActiveTab,
    comments,
    identifications,
    newComment,
    setNewComment,
    handleIdentificationSubmit,
    searchFauna,
    searchResults,
    setSearchResults,
    selectedTaxon,
    setSelectedTaxon,
    identificationForm,
    setIdentificationForm,
    handleAgreeWithIdentification,
    handleWithdrawIdentification,
    handleCancelAgreement,
    handleDisagreeWithIdentification,
    user,
    checklist
}) {
    const [showDisagreeModal, setShowDisagreeModal] = useState(false);
    const [disagreeComment, setDisagreeComment] = useState('');
    const [selectedIdentificationId, setSelectedIdentificationId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const addComment = async () => {
        try {
            const response = await apiFetch(`/kupunesia/observations/${id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ comment: newComment })
            });

            if (response.success) {
                setNewComment('');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        setIsSearching(true);

        if (query.length >= 2) {
            try {
                const token = localStorage.getItem('jwt_token');
                const response = await fetch(`http://localhost:8000/api/kupunesia/fauna/search?q=${encodeURIComponent(query.trim())}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    credentials: 'omit'
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setSearchResults(data.data || []);
                } else {
                    console.error('Search error:', data.message);
                    setSearchResults([]);
                }
            } catch (error) {
                console.error('Error searching fauna:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    };

    const handleSelectFauna = (fauna) => {
        setSelectedTaxon({
            ...fauna,
            source: fauna.source
        });
        setSearchQuery('');
        setSearchResults([]);
        setIdentificationForm(prev => ({
            ...prev,
            comment: ''
        }));
    };

    const renderIdentifications = () => {
        console.log('Current user:', user);
        console.log('Identifications:', identifications);

        const uniqueIdentifications = identifications.reduce((acc, current) => {
            console.log('Processing identification:', current);
            const x = acc.find(item => item.id === current.id);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, []);

        return uniqueIdentifications.map((identification) => {
            const isOwnIdentification = identification.user_id === user?.id;
            console.log('Checking identification:', {
                identificationUserId: identification.user_id,
                currentUserId: user?.id,
                isOwnIdentification
            });
            const hasAgreed = identification.user_agreed === 1;

            return (
                <div key={identification.id} className="border-b border-gray-200 py-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="font-medium">
                                {identification.fauna_name}
                                <span className="text-gray-500 text-sm ml-2">
                                    ({identification.fauna_name_id})
                                </span>
                            </div>
                            <div className="text-sm text-gray-600">
                                Diidentifikasi oleh {identification.identifier_name}
                            </div>
                            {identification.comment && (
                                <div className="mt-2 text-gray-700">{identification.comment}</div>
                            )}
                        </div>
                        <div className="flex space-x-2">
                            {isOwnIdentification ? (
                                <button
                                    onClick={() => handleWithdrawIdentification(identification.id)}
                                    className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                                >
                                    Tarik Usulan
                                </button>
                            ) : (
                                <>
                                    {!hasAgreed ? (
                                        <>
                                            <button
                                                onClick={() => handleAgreeWithIdentification(id, identification.id)}
                                                className="px-3 py-1 text-sm text-green-600 border border-green-600 rounded hover:bg-green-50"
                                            >
                                                Setuju
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowDisagreeModal(true);
                                                    setSelectedIdentificationId(identification.id);
                                                }}
                                                className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                                            >
                                                Tidak Setuju
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleCancelAgreement(id, identification.id)}
                                            className="px-3 py-1 text-sm text-gray-600 border border-gray-600 rounded hover:bg-gray-50"
                                        >
                                            Batal Setuju
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        {identification.agreement_count} persetujuan • {new Date(identification.created_at).toLocaleDateString()}
                    </div>
                </div>
            );
        });
    };

    const renderComments = () => {
        return comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-200 py-4">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-medium">{comment.user_name}</div>
                        <div className="mt-1">{comment.comment}</div>
                        <div className="mt-2 text-sm text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                        </div>
                    </div>
                    {comment.user_id === user?.id && (
                        <button
                            onClick={async () => {
                                try {
                                    await apiFetch(`/api/kupunesia/observations/${id}/comments/${comment.id}`, {
                                        method: 'DELETE'
                                    });
                                } catch (error) {
                                    console.error('Error deleting comment:', error);
                                }
                            }}
                            className="text-red-600 hover:text-red-700 text-sm"
                        >
                            Hapus
                        </button>
                    )}
                </div>
            </div>
        ));
    };

    return (
        <div className="mt-6">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('identification')}
                        className={`${
                            activeTab === 'identification'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        <FontAwesomeIcon icon={faPaw} className="mr-2" />
                        Identifikasi ({identifications.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('comments')}
                        className={`${
                            activeTab === 'comments'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        <FontAwesomeIcon icon={faComments} className="mr-2" />
                        Komentar ({comments.length})
                    </button>
                </nav>
            </div>

            <div className="mt-4">
                {activeTab === 'identification' ? (
                    <div>
                        <div className="mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cari nama kupu-kupu..."
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="absolute right-3 top-3">
                                    {isSearching ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                    ) : (
                                        <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                    )}
                                </div>
                            </div>
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {searchResults.map((fauna) => (
                                        <button
                                            key={`${fauna.source}-${fauna.id}`}
                                            onClick={() => handleSelectFauna(fauna)}
                                            className="w-full px-4 py-2 text-left hover:bg-gray-100"
                                        >
                                            <div className="font-medium text-gray-900">{fauna.nameLat}</div>
                                            <div className="text-sm text-gray-600">{fauna.nameId}</div>
                                            <div className="text-xs text-gray-500">
                                                {fauna.source === 'taxas' ? 'Database Utama' : 'Database Kupunesia'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {searchQuery && !isSearching && searchResults.length === 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
                                    Tidak ada hasil ditemukan
                                </div>
                            )}
                        </div>

                        {selectedTaxon && (
                            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                <div className="font-medium">{selectedTaxon.nameLat}</div>
                                <div className="text-sm text-gray-600">{selectedTaxon.nameId}</div>
                                <textarea
                                    placeholder="Tambahkan komentar identifikasi..."
                                    value={identificationForm.comment}
                                    onChange={(e) =>
                                        setIdentificationForm(prev => ({
                                            ...prev,
                                            comment: e.target.value
                                        }))
                                    }
                                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    rows="3"
                                />
                                <div className="mt-2 flex justify-end space-x-2">
                                    <button
                                        onClick={() => {
                                            setSelectedTaxon(null);
                                            setIdentificationForm({
                                                fauna_id: '',
                                                comment: ''
                                            });
                                        }}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={() => handleIdentificationSubmit(identificationForm)}
                                        className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                    >
                                        Tambah Identifikasi
                                    </button>
                                </div>
                            </div>
                        )}

                        {renderIdentifications()}
                    </div>
                ) : (
                    <div>
                        <div className="mb-4">
                            <ReactQuill
                                value={newComment}
                                onChange={setNewComment}
                                placeholder="Tulis komentar..."
                            />
                            <div className="mt-2 flex justify-end">
                                <button
                                    onClick={addComment}
                                    disabled={!newComment}
                                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Kirim Komentar
                                </button>
                            </div>
                        </div>
                        {renderComments()}
                    </div>
                )}
            </div>

            {/* Modal Tidak Setuju */}
            {showDisagreeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-lg font-medium mb-4">Tidak Setuju dengan Identifikasi</h3>
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Cari fauna..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            {searchResults.length > 0 && (
                                <div className="mt-2 border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                                    {searchResults.map((fauna) => (
                                        <button
                                            key={fauna.id}
                                            onClick={() => {
                                                setSelectedTaxon(fauna);
                                                setSearchQuery('');
                                                setSearchResults([]);
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-gray-100"
                                        >
                                            <div>{fauna.scientific_name}</div>
                                            <div className="text-sm text-gray-500">{fauna.common_name}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedTaxon && (
                            <div className="mb-4 p-2 bg-gray-50 rounded">
                                <div>{selectedTaxon.scientific_name}</div>
                                <div className="text-sm text-gray-500">{selectedTaxon.common_name}</div>
                            </div>
                        )}
                        <textarea
                            placeholder="Berikan alasan ketidaksetujuan..."
                            value={disagreeComment}
                            onChange={(e) => setDisagreeComment(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                            rows="3"
                        />
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    if (selectedTaxon && disagreeComment) {
                                        handleDisagreeWithIdentification(selectedIdentificationId, {
                                            fauna_id: selectedTaxon.id,
                                            comment: disagreeComment
                                        });
                                        setShowDisagreeModal(false);
                                        setDisagreeComment('');
                                        setSearchQuery('');
                                        setSelectedTaxon(null);
                                    }
                                }}
                                disabled={!selectedTaxon || !disagreeComment}
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
                                }}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default KupunesiaTabPanel;
