import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Pusher from 'pusher-js';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/free-mode';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import './MediaViewer.css';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';

function ChecklistDetail() {
    const [checklist, setChecklist] = useState(null);
    const [identifications, setIdentifications] = useState([]);
    const [locationVerifications, setLocationVerifications] = useState([]);
    const [wildStatusVotes, setWildStatusVotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedTaxon, setSelectedTaxon] = useState(null);
    const [identificationForm, setIdentificationForm] = useState({
        taxon_id: '',
        identification_level: 'species',
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
        community_id_level: '',
        can_be_improved: null
    });
    const [activeTab, setActiveTab] = useState('identification');
    const [activeIndex, setActiveIndex] = useState(0);
    const swiperRef = useRef(null);
    const [spectrogramSwiper, setSpectrogramSwiper] = useState(null);
    const [activeAudioIndex, setActiveAudioIndex] = useState(0);
    const audioRefs = useRef([]);
    const progressRefs = useRef([]);
    const spectrogramSwipers = useRef([]);

    const { id } = useParams();
    const { user } = useUser();

    useEffect(() => {
        fetchChecklistDetail();
        fetchComments();
        fetchQualityAssessment();

        // Inisialisasi Pusher
        const pusher = new Pusher('2d50c7dd083d072bcc27', {
            cluster: 'ap1',
        });

        // Berlangganan ke channel
        const channel = pusher.subscribe('checklist');

        // Mendengarkan event komentar
        channel.bind('CommentAdded', function(data) {
            setComments(prev => [...prev, data.comment]);
        });

        // Mendengarkan event quality assessment
        channel.bind('QualityAssessmentUpdated', function(data) {
            setQualityAssessment(data.assessment);
        });

        // Mendengarkan event identifikasi
        channel.bind('IdentificationUpdated', function(data) {
            setIdentifications(prev => prev.map(ident =>
                ident.id === data.identificationId ? { ...ident, agreement_count: data.agreementCount, user_agreed: data.userAgreed } : ident
            ));
        });

        // Cleanup
        return () => {
            channel.unbind_all();
            channel.unsubscribe();
        };
    }, []);
    const fetchChecklistDetail = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/observations/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                // Tambahkan informasi persetujuan ke setiap identifikasi
                const identificationsWithAgreements = data.data.identifications.map(identification => ({
                    ...identification,
                    agreement_count: identification.agreement_count || 0,
                    user_agreed: identification.user_agreed || false
                }));

                setChecklist({
                    ...data.data.checklist,
                    quality_grade: data.data.checklist.grade
                });
                setIdentifications(identificationsWithAgreements);
                setLocationVerifications(data.data.location_verifications);
                setWildStatusVotes(data.data.wild_status_votes);
            } else {
                setError('Gagal memuat data checklist');
            }
        } catch (error) {
            console.error('Error fetching checklist detail:', error);
            setError('Terjadi kesalahan saat memuat data');
        } finally {
            setLoading(false);
        }
    };
    const searchTaxa = async (query) => {
        if (query.length < 3) return;

        try {
            const response = await fetch(`http://localhost:8000/api/taxa/search?q=${query}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setSearchResults(data.data);
            }
        } catch (error) {
            console.error('Error searching taxa:', error);
        }
    };

    const handleIdentificationSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`http://localhost:8000/api/observations/${id}/identify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(identificationForm)
            });

            const data = await response.json();
            if (data.success) {
                fetchChecklistDetail();
                setIdentificationForm({
                    taxon_id: '',
                    identification_level: 'species',
                    comment: ''
                });
                setSelectedTaxon(null);
            }
        } catch (error) {
            console.error('Error submitting identification:', error);
        }
    };

    const handleLocationVerify = async (isAccurate, comment = '') => {
        try {
            const response = await fetch(`http://localhost:8000/api/observations/${id}/verify-location`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_accurate: isAccurate, comment })
            });

            if (response.ok) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error verifying location:', error);
        }
    };

    const handleWildStatusVote = async (isWild, comment = '') => {
        try {
            const response = await fetch(`http://localhost:8000/api/observations/${id}/vote-wild`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_wild: isWild, comment })
            });

            if (response.ok) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error voting wild status:', error);
        }
    };

    const fetchComments = async () => {
        try {
            const response = await fetch(`http://localhost:8000/api/observations/${id}/comments`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setComments(data.data);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const addComment = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:8000/api/observations/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ comment: newComment })
            });

            const data = await response.json();
            if (data.success) {
                setNewComment('');
                fetchComments();
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };
    const rateChecklist = async (grade) => {
        try {
            const response = await fetch(`http://localhost:8000/api/observations/${id}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ grade })
            });

            const data = await response.json();
            if (data.success) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error rating checklist:', error);
        }
    };

    const fetchQualityAssessment = async () => {
        try {
            const response = await fetch(`http://localhost:8000/api/observations/${id}/assess-quality`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setQualityAssessment(data.data);

                if (data.data.grade && (!checklist || checklist.quality_grade !== data.data.grade)) {
                    setChecklist(prev => ({
                        ...prev,
                        quality_grade: data.data.grade
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching quality assessment:', error);
        }
    };

    const handleQualityAssessmentChange = async (criteria, value) => {
        try {
            setQualityAssessment(prevAssessment => ({
                ...prevAssessment,
                [criteria]: value
            }));

            const response = await fetch(`http://localhost:8000/api/observations/${id}/quality-assessment/${criteria}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ value })
            });

            const data = await response.json();

            if (data.success) {
                if (data.data.grade) {
                    setChecklist(prev => ({
                        ...prev,
                        quality_grade: data.data.grade
                    }));
                }
            } else {
                setQualityAssessment(prevAssessment => ({
                    ...prevAssessment,
                    [criteria]: !value
                }));
                console.error('Gagal memperbarui penilaian:', data.message);
            }
        } catch (error) {
            setQualityAssessment(prevAssessment => ({
                ...prevAssessment,
                [criteria]: !value
            }));
            console.error('Error updating quality assessment:', error);
        }
    };

    const handleImprovementChange = async (canImprove) => {
        try {
            const response = await fetch(`http://localhost:8000/api/observations/${id}/improvement-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({
                    can_be_improved: canImprove
                })
            });

            const data = await response.json();
            if (data.success) {
                setQualityAssessment(prev => ({
                    ...prev,
                    can_be_improved: canImprove
                }));

                // Refresh quality assessment untuk mendapatkan grade terbaru
                fetchQualityAssessment();
            } else {
                console.error('Gagal memperbarui status improvement:', data.message);
            }
        } catch (error) {
            console.error('Error updating improvement status:', error);
        }
    };
    const renderQualityAssessment = () => (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
                Data Quality Assessment
                <i className="fas fa-info-circle ml-2 text-gray-500 cursor-help"
                   title="Quality assessment criteria"></i>
            </h2>

            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Quality Grade: </span>
                    <span className={`px-3 py-1 rounded ${
                        checklist?.quality_grade === 'research grade' ? 'bg-green-200' :
                        checklist?.quality_grade === 'needs ID' ? 'bg-yellow-200' :
                        'bg-gray-200'
                    }`}>
                        {checklist?.quality_grade || 'casual'}
                    </span>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <span>Casual</span>
                    <span>Needs ID</span>
                    <span>Research Grade</span>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                    The below items are needed to achieve Research Grade:
                </p>
            </div>

            <table className="w-full">
                <tbody>
                    <tr>
                        <td className="py-2">
                            <span className="flex items-center">
                                <i className="far fa-calendar mr-2"></i>
                                Date specified
                            </span>
                        </td>
                        <td className="text-center">
                            <input
                                type="checkbox"
                                checked={qualityAssessment.has_date}
                                disabled={true}
                                className="w-4 h-4"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="py-2">
                            <span className="flex items-center">
                                <i className="fas fa-map-marker-alt mr-2"></i>
                                Location specified
                            </span>
                        </td>
                        <td className="text-center">
                            <input
                                type="checkbox"
                                checked={qualityAssessment.has_location}
                                disabled={true}
                                className="w-4 h-4"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="py-2">
                            <span className="flex items-center">
                                <i className="fas fa-camera mr-2"></i>
                                Has Photos or Sounds
                            </span>
                        </td>
                        <td className="text-center">
                            <input
                                type="checkbox"
                                checked={qualityAssessment.has_media}
                                disabled={true}
                                className="w-4 h-4"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="py-2">
                            <span className="flex items-center">
                                <i className="fas fa-users mr-2"></i>
                                Has ID supported by two or more
                            </span>
                        </td>
                        <td className="text-center">
                            <input
                                type="checkbox"
                                checked={identifications.length >= 2}
                                disabled={true}
                                className="w-4 h-4"
                            />
                        </td>
                    </tr>

                    {[
                        { key: 'is_wild', label: 'Organism is wild', icon: 'fa-paw' },
                        { key: 'location_accurate', label: 'Location is accurate', icon: 'fa-map-marked' },
                        { key: 'recent_evidence', label: 'Recent evidence of organism', icon: 'fa-clock' },
                        { key: 'related_evidence', label: 'Evidence related to single subject', icon: 'fa-link' }
                    ].map(({ key, label, icon }) => (
                        <tr key={key}>
                            <td className="py-2">
                                <span className="flex items-center">
                                    <i className={`fas ${icon} mr-2`}></i>
                                    {label}
                                </span>
                            </td>
                            <td className="text-center">
                                <div className="flex justify-center space-x-4">
                                    <button
                                        onClick={() => handleQualityAssessmentChange(key, true)}
                                        className={`p-1 rounded ${qualityAssessment[key] === true ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                                    >
                                        <i className="fas fa-thumbs-up"></i>
                                    </button>
                                    <button
                                        onClick={() => handleQualityAssessmentChange(key, false)}
                                        className={`p-1 rounded ${qualityAssessment[key] === false ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                                    >
                                        <i className="fas fa-thumbs-down"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}

                    <tr>
                        <td className="py-2">
                            <span className="flex items-center">
                                <i className="fas fa-sitemap mr-2"></i>
                                Community Taxon at species level or lower
                            </span>
                        </td>
                        <td className="text-center">
                            <input
                                type="checkbox"
                                checked={
                                    ['species', 'subspecies', 'variety'].includes(qualityAssessment.community_id_level) &&
                                    identifications.filter(id => id.is_agreed).length >= 2
                                }
                                disabled={true}
                                className="w-4 h-4"
                            />
                        </td>
                    </tr>

                    {user?.id === checklist?.user_id && (
    <tr>
        <td colSpan="2" className="py-4 border-t">
            <div className="space-y-2">
                <p className="font-medium">
                    Based on the evidence, can the Community Taxon be confirmed or improved?
                </p>
                <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                        <input
                            type="radio"
                            name="canBeImproved"
                            checked={qualityAssessment.can_be_improved === false}
                            onChange={() => handleImprovementChange(false)}
                            className="w-4 h-4"
                        />
                        <span>No, it's as good as it can be</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="radio"
                            name="canBeImproved"
                            checked={qualityAssessment.can_be_improved === true}
                            onChange={() => handleImprovementChange(true)}
                            className="w-4 h-4"
                        />
                        <span>Yes</span>
                    </label>
                </div>
            </div>
        </td>
    </tr>
)}
                </tbody>
            </table>
        </div>
    );

    const TabPanel = () => {
        const [formState, setFormState] = useState({
            comment: '',
            isSubmitting: false
        });

        const handleCommentChange = useCallback((e) => {
            const value = e.target.value;
            setFormState(prev => ({
                ...prev,
                comment: value
            }));
        }, []);

        const handleCommentSubmit = useCallback(async (e) => {
            e.preventDefault();
            if (formState.isSubmitting) return;

            try {
                setFormState(prev => ({ ...prev, isSubmitting: true }));

                const response = await fetch(`http://localhost:8000/api/observations/${id}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                    },
                    body: JSON.stringify({ comment: formState.comment })
                });

                const data = await response.json();
                if (data.success) {
                    setFormState(prev => ({
                        ...prev,
                        comment: '',
                        isSubmitting: false
                    }));
                    fetchComments();
                }
            } catch (error) {
                console.error('Error adding comment:', error);
                setFormState(prev => ({ ...prev, isSubmitting: false }));
            }
        }, [id, formState.isSubmitting, fetchComments]);

        const renderCommentSection = useCallback(() => (
            <div className="space-y-4">
                <div className="mb-6">
                    <form onSubmit={handleCommentSubmit} className="space-y-4">
                        <ReactQuill
                            value={formState.comment}
                            onChange={(value) => setFormState(prev => ({
                                ...prev,
                                comment: value
                            }))}
                            placeholder="Tambahkan komentar..."
                            className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            theme="snow"
                            readOnly={formState.isSubmitting}
                        />
                        <button
                            type="submit"
                            className={`bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors
                                ${formState.isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={formState.isSubmitting}
                        >
                            {formState.isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin mr-2"></i>
                                    Mengirim...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-paper-plane mr-2"></i>
                                    Kirim Komentar
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {comments.length > 0 ? (
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-gray-900">
                                        {comment.user_name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {new Date(comment.created_at).toLocaleDateString('id-ID', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </div>
                                <div className="text-gray-600" dangerouslySetInnerHTML={{ __html: comment.comment }}></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500">
                        <i className="fas fa-comments mb-2 text-2xl"></i>
                        <p>Belum ada komentar</p>
                    </div>
                )}
            </div>
        ), [comments, formState, handleCommentSubmit, setFormState]);

        const renderTabNavigation = useCallback(() => (
            <div className="border-b mb-4">
                <div className="flex space-x-4">
                    <button
                        className={`py-2 px-4 -mb-px ${
                            activeTab === 'identification'
                                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab('identification')}
                    >
                        <i className="fas fa-tag mr-2"></i>
                        Identifikasi
                    </button>
                    <button
                        className={`py-2 px-4 -mb-px ${
                            activeTab === 'comment'
                                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab('comment')}
                    >
                        <i className="fas fa-comments mr-2"></i>
                        Komentar
                    </button>
                </div>
            </div>
        ), [activeTab]);

        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                {renderTabNavigation()}
                {activeTab === 'identification' ? (
                    <div className="space-y-4">
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-medium mb-4">Tambah Identifikasi</h3>
                            <form onSubmit={handleIdentificationSubmit}>
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        onChange={(e) => searchTaxa(e.target.value)}
                                        className="w-full p-2 border rounded"
                                        placeholder="Ketik nama ilmiah..."
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                                            {searchResults.map(taxon => (
                                                <div
                                                    key={taxon.id}
                                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => {
                                                        setSelectedTaxon(taxon);
                                                        setIdentificationForm(prev => ({
                                                            ...prev,
                                                            taxon_id: taxon.id
                                                        }));
                                                        setSearchResults([]);
                                                    }}
                                                >
                                                    {taxon.scientific_name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedTaxon && (
    <>
        <div className="mb-4">
            <textarea
                value={identificationForm.comment}
                onChange={(e) => setIdentificationForm(prev => ({
                    ...prev,
                    comment: e.target.value
                }))}
                className="w-full p-2 border rounded"
                placeholder="Tambahkan komentar (opsional)..."
                rows="3"
            />
        </div>

        <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
            <i className="fas fa-plus mr-2"></i>
            Tambah Identifikasi
        </button>
    </>
)}
                            </form>
                        </div>

                        {identifications.length > 0 ? (
                            <div className="space-y-4">
                                {identifications.map(renderIdentifications)}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500">
                                <i className="fas fa-search mb-2 text-2xl"></i>
                                <p>Belum ada identifikasi</p>
                            </div>
                        )}
                    </div>
                ) : renderCommentSection()}
            </div>
        );
    };

    const renderIdentifications = (identification) => {
        const [agreementCount, setAgreementCount] = useState(identification.agreement_count || 0);
        const [userAgreed, setUserAgreed] = useState(identification.user_agreed || false);
        const [isSubmitting, setIsSubmitting] = useState(false);

        const handleAgree = async () => {
            if (isSubmitting) return;

            setIsSubmitting(true);
            try {
                const response = await fetch(
                    `http://localhost:8000/api/observations/${id}/identifications/${identification.id}/agree`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const data = await response.json();
                if (data.success) {
                    setAgreementCount(data.data.agreement_count);
                    setUserAgreed(data.data.user_agreed);
                }
            } catch (error) {
                console.error('Error agreeing with identification:', error);
            } finally {
                setIsSubmitting(false);
            }
        };

        return (
            <div key={identification.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                            {identification.scientific_name}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>oleh {identification.uname}</span>
                            <span>•</span>
                            <span>Level: {identification.identification_level}</span>
                            {agreementCount > 0 && (
                                <>
                                    <span>•</span>
                                    <span>{agreementCount} persetujuan</span>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleAgree}
                        disabled={isSubmitting}
                        className={`px-4 py-2 rounded ${
                            userAgreed
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        } transition-colors duration-200`}
                    >
                        {isSubmitting ? (
                            <span>Loading...</span>
                        ) : userAgreed ? (
                            <>
                                <i className="fas fa-check mr-2"></i>
                                Disetujui
                            </>
                        ) : (
                            <>
                                <i className="fas fa-thumbs-up mr-2"></i>
                                Setuju
                            </>
                        )}
                    </button>
                </div>
                {identification.comment && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        <i className="fas fa-comment-alt mr-2 text-gray-400"></i>
                        {identification.comment}
                    </div>
                )}
            </div>
        );
    };

    const renderMap = () => (
        <MapContainer center={[checklist.latitude, checklist.longitude]} zoom={13} style={{ height: "400px", width: "100%" }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={[checklist.latitude, checklist.longitude]}>
                <Popup>
                    {checklist.scientific_name}
                </Popup>
            </Marker>
        </MapContainer>
    );

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = (index) => {
        if (activeAudioIndex !== index) {
            // Jika memilih audio berbeda, pause yang aktif
            audioRefs.current[activeAudioIndex]?.pause();
            setActiveAudioIndex(index);
        }
        
        const audio = audioRefs.current[index];
        if (audio) {
            if (isPlaying && activeAudioIndex === index) {
                audio.pause();
            } else {
                audio.play();
            }
            setIsPlaying(!isPlaying || activeAudioIndex !== index);
        }
    };

    const handleTimeUpdate = (index) => {
        if (index === activeAudioIndex) {
            const audio = audioRefs.current[index];
            const swiper = spectrogramSwipers.current[index];
            if (audio && swiper && isFinite(audio.currentTime)) {
                const time = audio.currentTime;
                const audioDuration = audio.duration;
                setCurrentTime(time);

                if (isFinite(audioDuration) && audioDuration > 0) {
                    const progress = time / audioDuration;
                    const spectrogramWidth = swiper.virtualSize - swiper.size;
                    const scrollPosition = -spectrogramWidth * progress;

                    swiper.translateTo(scrollPosition, 300, true);

                    if (progressRefs.current[index]) {
                        const containerWidth = swiper.size;
                        const progressPosition = containerWidth * progress;
                        progressRefs.current[index].style.transform = `translateX(${progressPosition}px)`;
                    }
                }
            }
        }
    };

    const handleAudioLoad = (e, index) => {
        if (index === activeAudioIndex) {
            setDuration(e.target.duration);
        }
    };

    const handleAudioEnd = (index) => {
        if (index === activeAudioIndex) {
            setIsPlaying(false);
        }
    };

    const handleSpectrogramTouchStart = (index) => {
        if (isPlaying && index === activeAudioIndex) {
            audioRefs.current[index]?.pause();
            setIsPlaying(false);
        }
    };

    const handleSpectrogramTouchEnd = (swiper, index) => {
        if (index === activeAudioIndex && audioRefs.current[index]) {
            const progress = Math.abs(swiper.translate) / (swiper.virtualSize - swiper.size);
            const duration = audioRefs.current[index].duration;
            const newTime = progress * duration;
            
            // Pastikan waktu valid sebelum mengatur currentTime
            if (isFinite(newTime) && newTime >= 0 && newTime <= duration) {
                audioRefs.current[index].currentTime = newTime;
            }
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSlideChange = (swiper) => {
        setActiveIndex(swiper.activeIndex);
        // Pause audio jika sedang playing
        if (isPlaying) {
            audioRefs.current[activeAudioIndex]?.pause();
            setIsPlaying(false);
        }
    };

    const handleThumbnailClick = (index) => {
        if (swiperRef.current?.swiper) {
            swiperRef.current.swiper.slideTo(index);
        }
    };

    const renderMediaViewer = () => {
        const imageMedias = checklist?.medias?.filter(media => 
            media.type === 'photo' || media.type === 'image'
        ).map(media => ({
            original: media.url,
            thumbnail: media.url,
            thumbnailClass: 'thumbnail-item',
            originalClass: 'main-image',
            originalAlt: 'Observation image',
            thumbnailAlt: 'Thumbnail',
            renderItem: (item) => (
                <div className="image-container">
                    <img 
                        src={item.original} 
                        alt={item.originalAlt} 
                        className="gallery-image"
                    />
                    <div className="license-overlay">CC BY-NC</div>
                </div>
            )
        })) || [];

        const audioMedias = checklist?.medias?.filter(media => 
            media.type === 'audio'
        ) || [];

        return (
            <div className="media-viewer-container">
                {/* Image Gallery */}
                {imageMedias.length > 0 && (
                    <div className="image-viewer">
                        <ImageGallery 
                            items={imageMedias}
                            showPlayButton={false}
                            showFullscreenButton={true}
                            showNav={false}
                            showThumbnails={true}
                            thumbnailPosition="bottom"
                            slideDuration={300}
                            slideInterval={3000}
                            slideOnThumbnailOver={false}
                            additionalClass="custom-image-gallery"
                            renderLeftNav={() => null}
                            renderRightNav={() => null}
                            renderPlayPauseButton={() => null}
                            showBullets={true}
                            renderCustomControls={() => (
                                <div className="custom-indicator-container">
                                    {imageMedias.map((_, index) => (
                                        <div 
                                            key={index} 
                                            className={`custom-indicator ${index === activeIndex ? 'active' : ''}`}
                                            onClick={() => swiperRef.current?.slideToIndex(index)}
                                        />
                                    ))}
                                </div>
                            )}
                        />
                    </div>
                )}

                {/* Audio Section */}
                {audioMedias.length > 0 && (
                    <div className="audio-section">
                        <div className="audio-player-container">
                            {/* Audio Controls */}
                            <div className="audio-controls flex items-center gap-4 mb-4">
                                <button 
                                    onClick={() => togglePlay(activeAudioIndex)}
                                    className="play-button"
                                >
                                    <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
                                </button>
                                <div className="time-display">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </div>
                                <audio
                                    ref={el => audioRefs.current[activeAudioIndex] = el}
                                    src={audioMedias[activeAudioIndex].url}
                                    onTimeUpdate={() => handleTimeUpdate(activeAudioIndex)}
                                    onLoadedMetadata={(e) => handleAudioLoad(e, activeAudioIndex)}
                                    onEnded={() => handleAudioEnd(activeAudioIndex)}
                                    className="hidden"
                                />
                            </div>

                            {/* Spectrogram */}
                            <div className="spectrogram-container">
                                <div className="relative h-48">
                                    <div className="frequency-labels">
                                        <div className="label">20 kHz</div>
                                        <div className="label">15 kHz</div>
                                        <div className="label">10 kHz</div>
                                        <div className="label">5 kHz</div>
                                        <div className="label">0 kHz</div>
                                    </div>
                                    <div className="spectrogram-scroll">
                                        <img
                                            src={audioMedias[activeAudioIndex].spectrogramUrl}
                                            alt={`Spectrogram ${activeAudioIndex + 1}`}
                                            className="h-full w-auto"
                                        />
                                        <div 
                                            ref={el => progressRefs.current[activeAudioIndex] = el}
                                            className="progress-overlay"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Audio Navigation */}
                            {audioMedias.length > 1 && (
                                <div className="flex justify-between items-center mt-4">
                                    <button
                                        onClick={() => {
                                            if (isPlaying) {
                                                audioRefs.current[activeAudioIndex]?.pause();
                                                setIsPlaying(false);
                                            }
                                            setActiveAudioIndex(prev => Math.max(0, prev - 1));
                                        }}
                                        disabled={activeAudioIndex === 0}
                                        className="nav-button"
                                    >
                                        <FontAwesomeIcon icon={faChevronLeft} />
                                    </button>
                                    <span className="text-sm font-medium">
                                        Recording {activeAudioIndex + 1} of {audioMedias.length}
                                    </span>
                                    <button
                                        onClick={() => {
                                            if (isPlaying) {
                                                audioRefs.current[activeAudioIndex]?.pause();
                                                setIsPlaying(false);
                                            }
                                            setActiveAudioIndex(prev => Math.min(audioMedias.length - 1, prev + 1));
                                        }}
                                        disabled={activeAudioIndex === audioMedias.length - 1}
                                        className="nav-button"
                                    >
                                        <FontAwesomeIcon icon={faChevronRight} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="container mx-auto mt-10 px-4 py-8">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Media</h2>
                        {renderMediaViewer()}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Peta Sebaran</h2>
                        {renderMap()}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">{checklist?.scientific_name || 'Nama tidak tersedia'}</h1>
                        <div className="text-gray-600">
                            Diamati oleh {checklist?.observer_name || 'Pengamat tidak diketahui'} pada {checklist?.created_at ? new Date(checklist.created_at).toLocaleDateString('id-ID') : 'Tanggal tidak tersedia'}
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold
                        ${checklist?.quality_grade === 'research grade' ? 'bg-green-100 text-green-800' :
                          checklist?.quality_grade === 'needs ID' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {checklist?.quality_grade === 'research grade' ? 'Research Grade' :
                         checklist?.quality_grade === 'needs ID' ? 'Needs ID' :
                         'Casual'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Detail Taksonomi</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="font-semibold">Kingdom</div>
                                <div>{checklist?.kingdom || 'Tidak tersedia'}</div>
                            </div>
                            <div>
                                <div className="font-semibold">Family</div>
                                <div>{checklist?.family || 'Tidak tersedia'}</div>
                            </div>
                            <div>
                                <div className="font-semibold">Genus</div>
                                <div>{checklist?.genus || 'Tidak tersedia'}</div>
                            </div>
                            <div>
                                <div className="font-semibold">Species</div>
                                <div>{checklist?.species || 'Tidak tersedia'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 mb-5">
                    <TabPanel />

                </div>
            </div>



            {renderQualityAssessment()}
        </div>
    );
}

export default ChecklistDetail;
