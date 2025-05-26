import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import MediaViewer from '../DetailObservations/MediaViewer';
import ChecklistMap from '../DetailObservations/ChecklistMap';
import QualityAssessment from '../DetailObservations/QualityAssessment';
import KupunesiaTabPanel from './KupunesiaTabPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faFlag, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const SearchInput = ({ onSearch }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    const searchFauna = async (searchQuery) => {
        try {
            if (!searchQuery || searchQuery.trim() === '') {
                setSuggestions([]);
                return;
            }

            setLoading(true);
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`http://localhost:8000/api/kupunesia/fauna/search?q=${encodeURIComponent(searchQuery.trim())}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'omit'
            });

            if (response.status === 401) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login';
                return;
            }

            const data = await response.json();
            if (data.success && data.data) {
                setSuggestions(data.data);
            } else {
                setSuggestions([]);
            }
        } catch (error) {
            console.error('Error searching fauna:', error);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const debouncedSearch = useCallback(
        debounce((value) => {
            searchFauna(value);
        }, 300),
        []
    );

    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        debouncedSearch(value);
    };

    const handleSelectSuggestion = (suggestion) => {
        onSearch(suggestion);
        setQuery('');
        setSuggestions([]);
    };

    return (
        <div className="relative w-full">
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder="Cari nama kupu-kupu..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {loading && (
                <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
            )}

            {suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                        <div
                            key={`${suggestion.source}-${suggestion.id}`}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                            <div className="font-medium text-gray-900">{suggestion.nameLat}</div>
                            <div className="text-sm text-gray-600">{suggestion.nameId}</div>
                            <div className="text-xs text-gray-500">
                                {suggestion.source === 'taxas' ? 'Database Utama' : 'Database Kupunesia'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {query && !loading && suggestions.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
                    Tidak ada hasil ditemukan
                </div>
            )}
        </div>
    );
};

function KupunesiaChecklistDetail({ id: propId, isModal = false, onClose = null }) {
    const { id: paramId } = useParams();
    const id = propId || paramId;
    const { user } = useUser();
    const pollingInterval = useRef(null);

    const [checklist, setChecklist] = useState(null);
    const [identifications, setIdentifications] = useState([]);
    const [locationVerifications, setLocationVerifications] = useState([]);
    const [wildStatusVotes, setWildStatusVotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedTaxon, setSelectedTaxon] = useState(null);
    const [identificationForm, setIdentificationForm] = useState({
        fauna_id: '',
        comment: ''
    });
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [qualityAssessment, setQualityAssessment] = useState({
        has_date: false,
        has_location: false,
        has_media: false,
        is_wild: true,
        location_accurate: true,
        recent_evidence: true,
        related_evidence: true,
        needs_id: true
    });
    const [activeTab, setActiveTab] = useState('identification');
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagForm, setFlagForm] = useState({
        reason: '',
        details: ''
    });

    useEffect(() => {
        console.log('Component mounted with ID:', id);
        if (id) {
            fetchChecklistDetail();
        }
    }, [id]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('jwt_token');
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const fetchChecklistDetail = async () => {
        try {
            console.log('Fetching data for ID:', id);
            const token = localStorage.getItem('jwt_token');

            if (!token) {
                setError('Sesi telah berakhir, silakan login kembali');
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`http://localhost:8000/api/kupunesia/observations/${id}`, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'omit'
            });

            if (response.status === 401) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            if (data.success && data.data) {
                setChecklist(data.data.checklist);
                setIdentifications(data.data.identifications || []);
                setLocationVerifications(data.data.location_verifications || []);
                setWildStatusVotes(data.data.wild_status_votes || []);
                if (data.data.checklist) {
                    setQualityAssessment({
                        has_date: data.data.checklist.has_date || false,
                        has_location: data.data.checklist.has_location || false,
                        has_media: data.data.checklist.has_media || false,
                        is_wild: data.data.checklist.is_wild || true,
                        location_accurate: data.data.checklist.location_accurate || true,
                        needs_id: data.data.checklist.needs_id || true
                    });
                }
            } else {
                setError('Data tidak ditemukan');
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Gagal memuat detail checklist');
            setLoading(false);
        }
    };

    const handleNewIdentification = (data) => {
        setIdentifications(prev => [data.identification, ...prev]);
    };

    const handleNewComment = (data) => {
        setComments(prev => [data.comment, ...prev]);
    };

    const handleIdentificationSubmit = async (formData) => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`http://localhost:8000/api/kupunesia/observations/${id}/identifications`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fauna_id: selectedTaxon.id,
                    source: selectedTaxon.source,
                    comment: formData.comment
                })
            });

            const data = await response.json();

            if (data.success) {
                setIdentifications(prevIdentifications => {
                    const filteredIdentifications = prevIdentifications.filter(
                        item => item.id !== data.data.id
                    );
                    return [...filteredIdentifications, data.data];
                });

                setSelectedTaxon(null);
                setIdentificationForm({
                    comment: ''
                });
            } else {
                console.error('Error submitting identification:', data.message);
            }
        } catch (error) {
            console.error('Error submitting identification:', error);
        }
    };

    const handleAgreeWithIdentification = async (id, identificationId) => {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`http://localhost:8000/api/kupunesia/observations/${id}/identifications/${identificationId}/agree`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error agreeing with identification:', error);
        }
    };

    const handleWithdrawIdentification = async (identificationId) => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`http://localhost:8000/api/kupunesia/observations/${id}/identifications/${identificationId}/withdraw`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error withdrawing identification:', error);
        }
    };

    const handleCancelAgreement = async (identificationId) => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`http://localhost:8000/api/kupunesia/observations/${id}/identifications/${identificationId}/cancel-agreement`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error canceling agreement:', error);
        }
    };

    const handleDisagreeWithIdentification = async (identificationId, comment) => {
        try {
            const response = await fetch(`http://localhost:8000/api/kupunesia/observations/${id}/identifications/${identificationId}/disagree`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    fauna_id: selectedTaxon.id,
                    comment: comment
                })
            });

            if (response.success) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error disagreeing with identification:', error);
        }
    };

    const searchFauna = async (query) => {
        try {
            if (!query || query.trim() === '') {
                setSearchResults([]);
                return;
            }

            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`http://localhost:8000/api/kupunesia/fauna/search?q=${encodeURIComponent(query.trim())}`, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'omit'
            });

            if (response.status === 401) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login';
                return;
            }

            if (response.status === 422) {
                console.error('Validation error in search query');
                setSearchResults([]);
                return;
            }

            const data = await response.json();
            if (data.success) {
                setSearchResults(data.data);
            } else {
                setSearchResults([]);
                console.error('Search failed:', data.message);
            }
        } catch (error) {
            console.error('Error searching fauna:', error);
            setSearchResults([]);
        }
    };

    const debouncedSearch = useCallback(
        debounce((query) => {
            searchFauna(query);
        }, 300),
        []
    );

    const handleSearchInputChange = (e) => {
        const query = e.target.value;
        debouncedSearch(query);
    };

    const handleQualityAssessmentChange = async (field, value) => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`http://localhost:8000/api/kupunesia/observations/${id}/quality-assessment`, {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'omit',
                body: JSON.stringify({ field, value })
            });

            if (response.status === 401) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login';
                return;
            }

            const data = await response.json();
            if (data.success) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error updating quality assessment:', error);
        }
    };

    const handleFlagSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:8000/api/kupunesia/observations/${id}/flag`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify(flagForm)
            });

            if (response.success) {
                setShowFlagModal(false);
                setFlagForm({ reason: '', details: '' });
            }
        } catch (error) {
            console.error('Error submitting flag:', error);
        }
    };

    const handleSearchResult = (selectedFauna) => {
        setSelectedTaxon(selectedFauna);
        setIdentificationForm(prev => ({
            ...prev,
            fauna_id: selectedFauna.kupnes_fauna_id
        }));
    };

    const FlagModal = () => (
        <Transition appear show={showFlagModal} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setShowFlagModal(false)}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                    Laporkan Observasi
                                </Dialog.Title>
                                <form onSubmit={handleFlagSubmit} className="mt-4">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700">Alasan</label>
                                        <input
                                            type="text"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={flagForm.reason}
                                            onChange={(e) => setFlagForm(prev => ({ ...prev, reason: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700">Detail</label>
                                        <textarea
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            rows={3}
                                            value={flagForm.details}
                                            onChange={(e) => setFlagForm(prev => ({ ...prev, details: e.target.value }))}
                                        />
                                    </div>
                                    <div className="mt-4 flex justify-end space-x-2">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                            onClick={() => setShowFlagModal(false)}
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                                        >
                                            Laporkan
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 text-center p-4">
                <div className="text-lg">{error}</div>
            </div>
        );
    }

    if (!checklist) {
        return (
            <div className="text-center p-4">
                <div className="text-lg">Data tidak ditemukan</div>
            </div>
        );
    }

    return (
        <div className={`bg-white ${isModal ? '' : 'container mx-auto p-4'}`}>
            {isModal && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    <FontAwesomeIcon icon={faTimes} className="text-xl" />
                </button>
            )}

            <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">
                            {checklist.nameLat || 'Belum Teridentifikasi'}
                        </h1>
                        <h2 className="text-lg text-gray-600 mb-2">
                            {checklist.nameId || 'Nama lokal tidak tersedia'}
                        </h2>
                        <div className="text-sm text-gray-500">
                            Diamati oleh {checklist.observer_name} pada {new Date(checklist.tgl_pengamatan).toLocaleDateString()}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowFlagModal(true)}
                        className="text-red-600 hover:text-red-700"
                    >
                        <FontAwesomeIcon icon={faFlag} className="mr-1" />
                        Laporkan
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <MediaViewer images={checklist.medias || []} />
                    </div>
                    <div>
                        <ChecklistMap
                            latitude={checklist.latitude}
                            longitude={checklist.longitude}
                            locationName={checklist.location_details}
                        />
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold mb-2">Informasi Taksonomi</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="font-semibold">Family</div>
                                    <div>{checklist.family || '-'}</div>
                                </div>
                                <div>
                                    <div className="font-semibold">Nama Latin</div>
                                    <div>{checklist.nameLat || '-'}</div>
                                </div>
                                <div>
                                    <div className="font-semibold">Nama Lokal</div>
                                    <div>{checklist.nameId || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <QualityAssessment
                checklist={checklist}
                qualityAssessment={qualityAssessment}
                onQualityChange={handleQualityAssessmentChange}
            />

            <KupunesiaTabPanel
                id={id}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                comments={comments}
                identifications={identifications}
                newComment={newComment}
                setNewComment={setNewComment}
                handleIdentificationSubmit={handleIdentificationSubmit}
                searchFauna={searchFauna}
                searchResults={searchResults}
                setSearchResults={setSearchResults}
                selectedTaxon={selectedTaxon}
                setSelectedTaxon={setSelectedTaxon}
                identificationForm={identificationForm}
                setIdentificationForm={setIdentificationForm}
                handleAgreeWithIdentification={handleAgreeWithIdentification}
                handleWithdrawIdentification={handleWithdrawIdentification}
                handleCancelAgreement={handleCancelAgreement}
                handleDisagreeWithIdentification={handleDisagreeWithIdentification}
                user={user}
                checklist={checklist}
            />

            <FlagModal />
        </div>
    );
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default KupunesiaChecklistDetail;
