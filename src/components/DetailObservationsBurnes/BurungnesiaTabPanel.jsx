import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faComments,
    faSearch,
    faCheckCircle,
    faTimes
} from '@fortawesome/free-solid-svg-icons';
import 'react-quill/dist/quill.snow.css';
import { apiFetch } from '../../utils/api';

function BurungnesiaTabPanel({
    id,
    activeTab,
    setActiveTab,
    checklist,
    user
}) {
    const [comments, setComments] = useState([]);
    const [identifications, setIdentifications] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedTaxon, setSelectedTaxon] = useState(null);
    const [identificationForm, setIdentificationForm] = useState({
        taxon_id: '',
        identification_level: 'species',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const tabs = [
        { id: 'identification', label: 'Identifikasi', icon: faSearch },
        { id: 'comments', label: 'Komentar', icon: faComments }
    ];

    useEffect(() => {
        if (id) {
            fetchComments();
            fetchIdentifications();
        }
    }, [id]);

    const fetchComments = async () => {
        try {
            const response = await apiFetch(`/burungnesia/observations/${id}/comments`);
            const data = await response.json();
            if (data.success) {
                setComments(data.data);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const fetchIdentifications = async () => {
        try {
            const response = await apiFetch(`/burungnesia/observations/${id}/identifications`);
            const data = await response.json();
            if (data.success) {
                setIdentifications(data.data);
            }
        } catch (error) {
            console.error('Error fetching identifications:', error);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length >= 3) {
            try {
                const response = await apiFetch(`/burungnesia/taxa/search?q=${query}`);
                const data = await response.json();
                if (data.success) {
                    setSearchResults(data.data);
                }
            } catch (error) {
                console.error('Error searching taxa:', error);
            }
        }
    };

    const handleTaxonSelect = (taxon) => {
        setSelectedTaxon(taxon);
        setIdentificationForm(prev => ({
            ...prev,
            taxon_id: taxon.id,
            identification_level: taxon.rank || 'species'
        }));
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleIdentificationSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTaxon) {
            alert('Silakan pilih takson terlebih dahulu');
            return;
        }

        setLoading(true);
        try {
            const response = await apiFetch(`/burungnesia/observations/${id}/identify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify(identificationForm)
            });

            const data = await response.json();
            if (data.success) {
                setIdentifications(prev => [...prev, data.data]);
                setSelectedTaxon(null);
                setIdentificationForm({
                    taxon_id: '',
                    identification_level: 'species',
                    notes: ''
                });
            }
        } catch (error) {
            console.error('Error submitting identification:', error);
            alert('Terjadi kesalahan saat mengirim identifikasi');
        } finally {
            setLoading(false);
        }
    };

    const handleAgreeWithIdentification = async (identificationId) => {
        try {
            const response = await apiFetch(`/burungnesia/identifications/${identificationId}/agree`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchIdentifications();
            }
        } catch (error) {
            console.error('Error agreeing with identification:', error);
        }
    };

    const addComment = async () => {
        if (!newComment.trim()) return;

        try {
            const response = await apiFetch(`/burungnesia/observations/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ comment: newComment })
            });

            const data = await response.json();
            if (data.success) {
                setComments(prev => [...prev, data.data]);
                setNewComment('');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex space-x-4 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-4 py-2 rounded-lg ${
                            activeTab === tab.id
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'identification' && (
                <div className="space-y-6">
                    {/* Form Identifikasi */}
                    <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-4">Tambah Identifikasi Baru</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cari Takson
                                </label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full p-2 border rounded"
                                    placeholder="Ketik minimal 3 karakter..."
                                />
                                {searchResults.length > 0 && (
                                    <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                                        {searchResults.map(taxon => (
                                            <div
                                                key={taxon.id}
                                                onClick={() => handleTaxonSelect(taxon)}
                                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                            >
                                                <div className="font-medium">{taxon.scientific_name}</div>
                                                <div className="text-sm text-gray-500">{taxon.common_name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedTaxon && (
                                <>
                                    <div className="p-3 bg-gray-50 rounded">
                                        <div className="font-medium">{selectedTaxon.scientific_name}</div>
                                        <div className="text-sm text-gray-600">
                                            Level: {selectedTaxon.rank || 'species'}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Catatan (opsional)
                                        </label>
                                        <textarea
                                            value={identificationForm.notes}
                                            onChange={(e) => setIdentificationForm(prev => ({
                                                ...prev,
                                                notes: e.target.value
                                            }))}
                                            className="w-full p-2 border rounded"
                                            rows={3}
                                            placeholder="Tambahkan catatan identifikasi..."
                                        />
                                    </div>

                                    <button
                                        onClick={handleIdentificationSubmit}
                                        disabled={loading}
                                        className={`w-full py-2 px-4 rounded ${
                                            loading
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        }`}
                                    >
                                        {loading ? 'Mengirim...' : 'Kirim Identifikasi'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Daftar Identifikasi */}
                    <div className="space-y-4">
                        {identifications.map(identification => (
                            <div key={identification.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium">{identification.taxon.scientific_name}</div>
                                        <div className="text-sm text-gray-500">
                                            oleh {identification.user.name} •
                                            {new Date(identification.created_at).toLocaleDateString('id-ID')}
                                        </div>
                                        {identification.notes && (
                                            <div className="mt-2 text-gray-700">{identification.notes}</div>
                                        )}
                                    </div>
                                    {user && user.id !== identification.user_id && (
                                        <button
                                            onClick={() => handleAgreeWithIdentification(identification.id)}
                                            className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                        >
                                            <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                            Setuju ({identification.agreement_count})
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'comments' && (
                <div className="space-y-6">
                    {/* Form Komentar */}
                    <div>
                        <ReactQuill
                            value={newComment}
                            onChange={setNewComment}
                            placeholder="Tulis komentar..."
                        />
                        <button
                            onClick={addComment}
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Kirim Komentar
                        </button>
                    </div>

                    {/* Daftar Komentar */}
                    <div className="space-y-4">
                        {comments.map(comment => (
                            <div key={comment.id} className="border-b pb-4">
                                <div className="flex justify-between">
                                    <span className="font-medium">{comment.user.name}</span>
                                    <span className="text-sm text-gray-500">
                                        {new Date(comment.created_at).toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                                <div
                                    className="mt-2"
                                    dangerouslySetInnerHTML={{ __html: comment.comment }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default BurungnesiaTabPanel;
