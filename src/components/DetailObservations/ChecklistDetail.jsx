import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import MediaViewer from './MediaViewer';
import ChecklistMap from './ChecklistMap';
import QualityAssessment from './QualityAssessment';
import TabPanel from './TabPanel';
import TaxonomyHeader from './TaxonomyHeader';
import TaxonomyInfo from './TaxonomyInfo';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faFlag, faTimes, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../../utils/api';
import { Dialog, Transition } from '@headlessui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TreeView from 'react-treeview';
import "react-treeview/react-treeview.css";
import { toast } from 'react-hot-toast';

// Fungsi helper untuk menentukan source dan membersihkan ID
const getSourceAndCleanId = (id) => {
    // Cek parameter source dari URL terlebih dahulu
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');

    if (!id) {
        return { source: 'fobi', cleanId: '' };
    }

    const idString = String(id);

    // Jika ada source parameter, gunakan itu
    if (sourceParam) {
        // Tetap bersihkan ID jika ada prefix
        const cleanId = idString.replace(/^(BN|KP)/, '');
        return { source: sourceParam, cleanId };
    }

    // Jika tidak ada source parameter, tentukan dari prefix ID
    if (idString.startsWith('BN')) {
        return { source: 'burungnesia', cleanId: idString.substring(2) };
    }
    if (idString.startsWith('KP')) {
        return { source: 'kupunesia', cleanId: idString.substring(2) };
    }

    // Default case untuk FOBI
    return { source: 'fobi', cleanId: idString };
};

// Fungsi helper untuk membersihkan nama ilmiah dari author
const cleanScientificName = (name) => {
    if (!name) return '';
    // Menghapus author yang biasanya muncul setelah spasi dan diikuti tahun dalam kurung
    return name.split(' ').filter(part => {
        // Memeriksa apakah bagian mengandung angka (tahun) atau dalam kurung
        return !(/\d/.test(part) || /[\(\)]/.test(part));
    }).join(' ');
};

// Pindahkan FlagModal ke komponen terpisah di luar komponen utama
const FlagModal = React.memo(({
    showFlagModal,
    setShowFlagModal,
    flagForm,
    setFlagForm,
    handleFlagSubmit,
    isSubmittingFlag
}) => (
    <Transition appear show={showFlagModal} as={Fragment}>
        <Dialog
            as="div"
            className="relative z-[9999]"
            onClose={() => setShowFlagModal(false)}
        >
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="fixed inset-0 bg-black bg-opacity-50" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1e1e1e] p-6 text-left align-middle shadow-xl transition-all border border-[#444]">
                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex justify-between items-center">
                                <span>Tandai Masalah</span>
                                <button
                                    onClick={() => setShowFlagModal(false)}
                                    className="text-gray-400 hover:text-gray-300"
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </Dialog.Title>

                            <form onSubmit={handleFlagSubmit} className="mt-4">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Jenis Masalah
                                    </label>
                                    <select
                                        value={flagForm.flag_type}
                                        onChange={(e) => setFlagForm(prev => ({...prev, flag_type: e.target.value}))}
                                        className="w-full p-2 border rounded bg-[#2c2c2c] text-white border-[#444] focus:border-[#1a73e8] focus:ring-[#1a73e8]"
                                        required
                                    >
                                        <option value="">Pilih jenis masalah</option>
                                        <option value="identification">Masalah Identifikasi</option>
                                        <option value="location">Masalah Lokasi</option>
                                        <option value="media">Masalah Media</option>
                                        <option value="date">Masalah Tanggal</option>
                                        <option value="other">Lainnya</option>
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Alasan
                                    </label>
                                    <textarea
                                        value={flagForm.reason}
                                        onChange={(e) => setFlagForm(prev => ({...prev, reason: e.target.value}))}
                                        className="w-full p-2 border rounded bg-[#2c2c2c] text-white border-[#444] focus:border-[#1a73e8] focus:ring-[#1a73e8]"
                                        rows="4"
                                        required
                                        placeholder="Jelaskan masalah yang Anda temukan..."
                                    />
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSubmittingFlag}
                                        className="inline-flex justify-center rounded-md border border-transparent bg-red-900 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                    >
                                        {isSubmittingFlag ? 'Mengirim...' : 'Kirim Flag'}
                                    </button>
                                </div>
                            </form>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
));

// Komponen modal konfirmasi untuk Kingdom Quorum
const KingdomQuorumModal = ({ isOpen, closeModal, message, onConfirm, onCancel }) => {
    const kingdomMatch = message?.match(/Kingdom telah ditetapkan berdasarkan kesepakatan quorum: ([A-Za-z]+)/);
    const existingKingdom = kingdomMatch ? kingdomMatch[1] : 'Unknown';
    
    const newKingdomMatch = message?.match(/Usulan ([A-Za-z]+) tidak dapat diterima/);
    const newKingdom = newKingdomMatch ? newKingdomMatch[1] : 'berbeda';

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={closeModal}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1e1e1e] p-6 text-left align-middle shadow-xl transition-all border border-[#444]">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex items-center gap-2">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500" />
                                    <span>Identifikasi Ditolak</span>
                                </Dialog.Title>
                                
                                <div className="mt-4">
                                    <p className="text-sm text-gray-300">
                                        {message || `Usulan Kingdom ${newKingdom} tidak dapat diterima karena Kingdom telah ditetapkan berdasarkan kesepakatan quorum: ${existingKingdom}`}
                                    </p>
                                </div>

                                <div className="mt-6">
                                    <p className="text-sm text-gray-400">
                                        Jika Anda tetap ingin mengirimkan identifikasi ini, identifikasi akan otomatis ditandai sebagai ditarik.
                                    </p>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600 focus:outline-none"
                                        onClick={onCancel}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-900 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-800 focus:outline-none"
                                        onClick={onConfirm}
                                    >
                                        Lanjut
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

function ChecklistDetail({ id: propId, isModal = false, onClose = null }) {
    const { id: paramId } = useParams();
    const id = isModal ? propId : paramId;
    const { source, cleanId } = getSourceAndCleanId(id);
    const queryClient = useQueryClient();

    // Queries
    const {
        data: checklistData,
        isLoading: isLoadingChecklist
    } = useQuery({
        queryKey: ['checklist', cleanId, source],
        queryFn: async () => {
            const response = await apiFetch(`/observations/${cleanId}?source=${source}`);
            return response.json();
        }
    });

    const {
        data: commentsData,
        isLoading: isLoadingComments
    } = useQuery({
        queryKey: ['comments', id],
        queryFn: async () => {
            const response = await apiFetch(`/observations/${id}/comments`);
            return response.json();
        }
    });

    const {
        data: flagsData,
        isLoading: isLoadingFlags
    } = useQuery({
        queryKey: ['flags', id],
        queryFn: async () => {
            const response = await apiFetch(`/observations/${id}/flags`);
            return response.json();
        }
    });

    // Mutations
    const addIdentificationMutation = useMutation({
        mutationFn: async (formData) => {
            const response = await apiFetch(`/observations/${id}/identifications?source=${source}`, {
                method: 'POST',
                body: formData
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['checklist', id]);
        }
    });

    const addCommentMutation = useMutation({
        mutationFn: async (comment) => {
            const response = await apiFetch(`/observations/${id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ comment })
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['comments', id]);
            setNewComment('');
        }
    });

    const agreeWithIdentificationMutation = useMutation({
        mutationFn: async (identificationId) => {
            const response = await apiFetch(
                `/observations/${id}/identifications/${identificationId}/agree?source=${source}`,
                { method: 'POST' }
            );
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['checklist', id]);
        }
    });

    const withdrawIdentificationMutation = useMutation({
        mutationFn: async (identificationId) => {
            const response = await apiFetch(
                `/observations/${id}/identifications/${identificationId}/withdraw?source=${source}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fauna_id: checklist?.fauna_id,
                        identification_id: identificationId
                    })
                }
            );
            if (!response.ok) {
                throw new Error('Gagal menarik identifikasi');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['checklist', id, source]);
        },
        onError: (error) => {
            console.error('Error withdrawing identification:', error);
            alert('Gagal menarik identifikasi. Silakan coba lagi.');
        }
    });

    // State declarations
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [checklist, setChecklist] = useState(null);
    const [identifications, setIdentifications] = useState([]);
    const [locationVerifications, setLocationVerifications] = useState([]);
    const [wildStatusVotes, setWildStatusVotes] = useState([]);
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
    const [locationName, setLocationName] = useState('Memuat lokasi...');
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagForm, setFlagForm] = useState({
        flag_type: '',
        reason: ''
    });
    const [flags, setFlags] = useState([]);
    const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
    const [media, setMedia] = useState({ images: [], sounds: [] });

    // Tambahkan state untuk modal konfirmasi Kingdom Quorum
    const [showKingdomQuorumModal, setShowKingdomQuorumModal] = useState(false);
    const [kingdomQuorumMessage, setKingdomQuorumMessage] = useState('');
    const [pendingIdentificationData, setPendingIdentificationData] = useState(null);

    const { user } = useUser();

    // Update state dari data query
    useEffect(() => {
        if (checklistData?.success) {
            console.log('Identifications data:', checklistData.data.identifications);
            setIdentifications(checklistData.data.identifications || []);
            setChecklist(checklistData.data.checklist);
            setMedia(checklistData.data.media || { images: [], sounds: [] });
            if (checklistData.data.quality_assessment) {
                setQualityAssessment(checklistData.data.quality_assessment);
            }
        }
    }, [checklistData]);

    useEffect(() => {
        if (commentsData?.success) {
            setComments(commentsData.data);
        }
    }, [commentsData]);

    useEffect(() => {
        if (flagsData?.success) {
            setFlags(flagsData.data);
        }
    }, [flagsData]);

    // Tambahkan fungsi polling
    useEffect(() => {
        // Fungsi untuk mengambil data terbaru
        const fetchLatestData = async () => {
            try {
                // Ambil data checklist terbaru
                const checklistResponse = await apiFetch(`/observations/${cleanId}?source=${source}`);
                const checklistData = await checklistResponse.json();
                if (checklistData.success) {
                    setChecklist(checklistData.data.checklist);
                    setIdentifications(checklistData.data.identifications || []);
                    setMedia(checklistData.data.media || { images: [], sounds: [] });
                    if (checklistData.data.quality_assessment) {
                        setQualityAssessment(checklistData.data.quality_assessment);
                    }
                }

                // Ambil komentar terbaru
                const commentsResponse = await apiFetch(`/observations/${id}/comments`);
                const commentsData = await commentsResponse.json();
                if (commentsData.success) {
                    setComments(commentsData.data);
                }

                // Ambil flags terbaru
                const flagsResponse = await apiFetch(`/observations/${id}/flags`);
                const flagsData = await flagsResponse.json();
                if (flagsData.success) {
                    setFlags(flagsData.data);
                }
            } catch (error) {
                console.error('Error fetching latest data:', error);
            }
        };

        // Set interval untuk polling setiap 2 menit
        const intervalId = setInterval(fetchLatestData, 120000); // 120000 ms = 2 menit

        // Panggil fetchLatestData sekali saat komponen dimount
        fetchLatestData();

        // Cleanup interval saat komponen unmount
        return () => clearInterval(intervalId);
    }, [id, cleanId, source]);

    const searchTaxa = async (query) => {
        if (query.length < 3) return;

        try {
            const response = await apiFetch(`/taxa/search?q=${query}&source=${source}`);

            const data = await response.json();
            if (data.success) {
                setSearchResults(data.data);
            } else {
                setSearchResults([]);
                console.error('Search failed:', data.message);
            }
        } catch (error) {
            console.error('Error searching taxa:', error);
            setSearchResults([]);
        }
    };

    const handleIdentificationSubmit = async (e, photo) => {
        try {
            e.preventDefault();
            const formData = new FormData();
            formData.append('taxon_id', selectedTaxon.id);
            formData.append('identification_level', selectedTaxon.taxon_rank);
            if (identificationForm.comment) {
                formData.append('comment', identificationForm.comment);
            }
            if (photo) {
                formData.append('photo', photo);
            }

            // Ganti penggunaan mutasi dengan fetch langsung agar bisa menangkap error dengan lebih baik
            const response = await apiFetch(`/observations/${id}/identifications?source=${source}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Segera ambil data terbaru tanpa menunggu invalidasi query
                try {
                    // Ambil data checklist terbaru
                    const checklistResponse = await apiFetch(`/observations/${cleanId}?source=${source}`);
                    const checklistData = await checklistResponse.json();
                    if (checklistData.success) {
                        setChecklist(checklistData.data.checklist);
                        setIdentifications(checklistData.data.identifications || []);
                        setMedia(checklistData.data.media || { images: [], sounds: [] });
                        if (checklistData.data.quality_assessment) {
                            setQualityAssessment(checklistData.data.quality_assessment);
                        }
                    }
                } catch (fetchError) {
                    console.error('Error fetching updated data:', fetchError);
                    // Tetap invalidasi query sebagai fallback
                    queryClient.invalidateQueries(['checklist', id]);
                }
                
                // Reset form
                setIdentificationForm({
                    taxon_id: '',
                    identification_level: 'species',
                    comment: ''
                });
                setSelectedTaxon(null);
                
                toast.success('Identifikasi berhasil ditambahkan', {
                    position: "top-center",
                    autoClose: 3000,
                });
            } else {
                throw new Error(data.message || 'Gagal menambahkan identifikasi');
            }
        } catch (error) {
            console.error('Error submitting identification:', error);
            
            // Periksa apakah error adalah konflik kingdom quorum
            if (error.status === 409 && error.data?.code === 'KINGDOM_QUORUM_LOCKED') {
                // Simpan pesan error dan tampilkan modal konfirmasi
                setKingdomQuorumMessage(error.data.message);
                
                // Simpan data identifikasi yang akan disubmit
                setPendingIdentificationData({
                    taxon_id: selectedTaxon.id,
                    identification_level: selectedTaxon.taxon_rank,
                    comment: identificationForm.comment,
                    photo: photo,
                    force_submit: true
                });
                
                // Tampilkan modal konfirmasi
                setShowKingdomQuorumModal(true);
            } else {
                toast.error(error.message || 'Terjadi kesalahan saat menambahkan identifikasi', {
                    position: "top-center",
                    autoClose: 5000,
                });
            }
        }
    };

    // Fungsi untuk melanjutkan submit identifikasi meskipun Kingdom berbeda
    const handleForceSubmitIdentification = async () => {
        try {
            if (!pendingIdentificationData) return;
            
            const formData = new FormData();
            formData.append('taxon_id', pendingIdentificationData.taxon_id);
            formData.append('identification_level', pendingIdentificationData.identification_level);
            
            if (pendingIdentificationData.comment) {
                formData.append('comment', pendingIdentificationData.comment);
            }
            
            if (pendingIdentificationData.photo) {
                formData.append('photo', pendingIdentificationData.photo);
            }
            
            // Tambahkan flag untuk memaksa submit meskipun Kingdom berbeda
            // Gunakan string "1" yang akan dikonversi menjadi boolean true di backend
            formData.append('force_submit', "1");
            
            const response = await apiFetch(`/observations/${id}/identifications?source=${source}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Segera ambil data terbaru tanpa menunggu invalidasi query
                try {
                    // Ambil data checklist terbaru
                    const checklistResponse = await apiFetch(`/observations/${cleanId}?source=${source}`);
                    const checklistData = await checklistResponse.json();
                    if (checklistData.success) {
                        setChecklist(checklistData.data.checklist);
                        setIdentifications(checklistData.data.identifications || []);
                        setMedia(checklistData.data.media || { images: [], sounds: [] });
                        if (checklistData.data.quality_assessment) {
                            setQualityAssessment(checklistData.data.quality_assessment);
                        }
                    }
                } catch (fetchError) {
                    console.error('Error fetching updated data:', fetchError);
                    // Tetap invalidasi query sebagai fallback
                    queryClient.invalidateQueries(['checklist', cleanId, source]);
                }
                
                // Reset form
                setIdentificationForm({
                    taxon_id: '',
                    identification_level: 'species',
                    comment: ''
                });
                setSelectedTaxon(null);
                
                // Tutup modal
                setShowKingdomQuorumModal(false);
                setPendingIdentificationData(null);
                
                // Tampilkan notifikasi sukses
                toast.success(data.message || 'Identifikasi berhasil ditambahkan tetapi ditandai sebagai ditarik', {
                    position: "top-center",
                    autoClose: 3000,
                });
            } else {
                throw new Error(data.message || 'Gagal menambahkan identifikasi');
            }
        } catch (error) {
            console.error('Error force submitting identification:', error);
            toast.error(error.message || 'Gagal menambahkan identifikasi', {
                position: "top-center",
                autoClose: 5000,
            });
            
            // Tutup modal jika terjadi error
            setShowKingdomQuorumModal(false);
        }
    };

    // Fungsi untuk membatalkan submit identifikasi
    const handleCancelIdentification = () => {
        setShowKingdomQuorumModal(false);
        setPendingIdentificationData(null);
    };

    const handleLocationVerify = async (isAccurate, comment = '') => {
        try {
            const response = await apiFetch(`/observations/${id}/verify-location`, {
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
            const response = await apiFetch(`/observations/${id}/vote-wild`, {
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
            const response = await apiFetch(`/observations/${id}/comments`, {
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
        await addCommentMutation.mutateAsync(newComment);
    };
    const rateChecklist = async (grade) => {
        try {
            const response = await apiFetch(`/observations/${id}/rate`, {
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
            // Tunggu sampai checklist data tersedia
            if (!checklist) return;

            const response = await apiFetch(`/observations/${id}/quality-assessment?source=${source}`);

            const data = await response.json();
            if (data.success) {
                setQualityAssessment(data.data);
            }
        } catch (error) {
            console.error('Error fetching quality assessment:', error);
            // Set default values jika terjadi error
            setQualityAssessment({
                grade: 'casual',
                has_media: false,
                has_location: false,
                has_date: false,
                is_wild: true,
                location_accurate: true,
                recent_evidence: true,
                related_evidence: true,
                community_id_level: '',
                can_be_improved: null
            });
        }
    };

    const handleQualityAssessmentChange = async (criteria, value) => {
        try {
            setQualityAssessment(prev => ({
                ...prev,
                [criteria]: value
            }));

            const response = await apiFetch(`/observations/${id}/quality-assessment/${criteria}?source=${source}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ value })
            });

            const data = await response.json();
            if (data.success) {
                setQualityAssessment(prev => ({
                    ...prev,
                    ...data.data.assessment
                }));

                setChecklist(prev => ({
                    ...prev,
                    quality_grade: data.data.grade
                }));
            } else {
                setQualityAssessment(prev => ({
                    ...prev,
                    [criteria]: !value
                }));
            }
        } catch (error) {
            setQualityAssessment(prev => ({
                ...prev,
                [criteria]: !value
            }));
            console.error('Error updating quality assessment:', error);
        }
    };

    const handleImprovementChange = async (canImprove) => {
        try {
            const response = await apiFetch(`/observations/${id}/improvement-status?source=${source}`, {
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
                fetchQualityAssessment();
            }
        } catch (error) {
            console.error('Error updating improvement status:', error);
        }
    };

    const handleAgreeWithIdentification = async (identificationId) => {
        try {
            const result = await agreeWithIdentificationMutation.mutateAsync(identificationId);

            // Update state lokal
            setIdentifications(prevIdentifications =>
                prevIdentifications.map(ident => {
                    if (ident.id === identificationId) {
                        return {
                            ...ident,
                            agreement_count: Number(ident.agreement_count || 0) + 1,
                            user_agreed: true
                        };
                    }
                    return ident;
                })
            );
        } catch (error) {
            console.error('Error agreeing with identification:', error);
        }
    };

    const getLocationName = async (latitude, longitude) => {
        try {
            const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
            );
            const data = await response.json();
        
        // Format location name consistently
        const address = data.address;
        const parts = [];
        
        if (address.city || address.town || address.municipality) {
            parts.push(address.city || address.town || address.municipality);
        }
        if (address.county || address.regency) {
            parts.push(address.county || address.regency);
        }
        if (address.state) parts.push(address.state);
        if (address.country) parts.push(address.country);

        return parts.join(', ') || 'Lokasi tidak ditemukan';
    } catch (error) {
        console.error('Error fetching location name:', error);
        return 'Gagal memuat nama lokasi';
    }
    };

    useEffect(() => {
        if (checklist?.latitude && checklist?.longitude) {
            getLocationName(checklist.latitude, checklist.longitude)
                .then(name => setLocationName(name));
        }
    }, [checklist]);
    const handleWithdrawIdentification = async (identificationId) => {
        if (!checklist?.fauna_id) {
            console.error('fauna_id tidak ditemukan');
            alert('Data tidak lengkap untuk menarik identifikasi');
            return;
        }

        try {
            await withdrawIdentificationMutation.mutateAsync(identificationId);

            // Update state lokal
            setIdentifications(prevIdentifications =>
                prevIdentifications.map(ident => {
                    if (ident.id === identificationId) {
                        return {
                            ...ident,
                            is_withdrawn: true,
                            agreement_count: 0 // Reset agreement count saat ditarik
                        };
                    }
                    if (ident.agrees_with_id === identificationId) {
                        return null;
                    }
                    return ident;
                }).filter(Boolean)
            );
        } catch (error) {
            console.error('Error withdrawing identification:', error);
        }
    };
// ChecklistDetail.jsx

const handleCancelAgreement = async (identificationId) => {
    try {
        const response = await apiFetch(
            `/observations/${id}/identifications/${identificationId}/cancel-agreement?source=${source}`,
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
            // Update local state
            setIdentifications(prevIdentifications => 
                prevIdentifications.map(ident => {
                    if (ident.id === identificationId) {
                        return {
                            ...ident,
                            agreement_count: data.data.agreement_count,
                            user_agreed: false
                        };
                    }
                    return ident;
                })
            );

            // Refresh data
            queryClient.invalidateQueries(['checklist', cleanId, source]);
        } else {
            console.error('Failed to cancel agreement:', data.message);
            alert(data.message || 'Gagal membatalkan persetujuan');
        }
    } catch (error) {
        console.error('Error canceling agreement:', error);
        alert('Terjadi kesalahan saat membatalkan persetujuan');
    }
};

    const handleDisagreeWithIdentification = async (identificationId, comment) => {
        try {
            // Cek apakah pengguna sudah memiliki identifikasi langsung (bukan persetujuan) untuk checklist ini
            const existingUserIdentification = checklistData?.data?.identifications?.find(
                ident => ident.user_id === user?.data?.id && 
                        ident.is_withdrawn !== 1 && 
                        !ident.agrees_with_id // Penting: hanya identifikasi langsung, bukan persetujuan
            );

            // Cek apakah pengguna memiliki persetujuan sebelumnya
            const userAgreements = checklistData?.data?.identifications?.filter(
                ident => ident.user_id === user?.data?.id && 
                        ident.is_withdrawn !== 1 && 
                        ident.agrees_with_id // Ini adalah persetujuan
            ) || [];

            const hasExistingAgreement = userAgreements.length > 0;

            const formData = new FormData();
            formData.append('comment', comment || '');
            if (selectedTaxon) {
                formData.append('taxon_id', selectedTaxon.id);
                formData.append('identification_level', selectedTaxon.taxon_rank);
            }

            // Tambahkan parameter untuk menangani identifikasi yang sudah ada
            // Hanya jika identifikasi tersebut adalah identifikasi langsung, bukan persetujuan
            if (existingUserIdentification && !existingUserIdentification.agrees_with_id) {
                formData.append('existing_identification_id', existingUserIdentification.id);
                console.log('Using existing direct identification:', existingUserIdentification.id);
            } else {
                console.log('Creating new disagreement identification');
            }

            // Tambahkan flag untuk menandai bahwa ini harus selalu membuat identifikasi baru
            // jika pengguna sebelumnya hanya memiliki persetujuan
            formData.append('force_new_identification', 'true');

            const response = await apiFetch(
                `/observations/${id}/identifications/${identificationId}/disagree?source=${source}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                    },
                    body: formData
                }
            );

            const data = await response.json();

            if (data.success) {
                // Jika pengguna memiliki persetujuan sebelumnya, tandai sebagai ditarik
                if (hasExistingAgreement) {
                    // Update semua persetujuan sebelumnya sebagai ditarik
                    setIdentifications(prevIdentifications =>
                        prevIdentifications.map(ident => {
                            // Jika ini adalah persetujuan milik pengguna saat ini, tandai sebagai ditarik
                            if (ident.user_id === user?.data?.id && 
                                ident.agrees_with_id && 
                                ident.is_withdrawn !== 1) {
                                return {
                                    ...ident,
                                    is_withdrawn: 1, // Tandai sebagai withdrawn
                                    user_agreed: false // Hapus status user_agreed
                                };
                            }
                            
                            // Jika ini adalah identifikasi yang sebelumnya disetujui, kurangi agreement_count-nya
                            if (userAgreements.some(agreement => agreement.agrees_with_id === ident.id)) {
                                const newCount = (parseInt(ident.agreement_count) || 1) - 1;
                                return {
                                    ...ident,
                                    agreement_count: String(Math.max(0, newCount)),
                                    user_agreed: false
                                };
                            }
                            
                            return ident;
                        })
                    );
                }

                // Jika respons berisi data identifikasi baru
                if (data.data?.identification || data.disagreement) {
                    const newIdentification = data.data?.identification || data.disagreement;
                    
                    // Periksa apakah identifikasi ini sudah ada di daftar
                    const identificationExists = identifications.some(
                        ident => ident.id === newIdentification.id
                    );

                    if (!identificationExists) {
                        // Tambahkan identifikasi baru jika belum ada
                        setIdentifications(prevIdentifications => [
                            ...prevIdentifications,
                            {
                                ...newIdentification,
                                user_disagreed: true,
                                disagrees_with_id: identificationId,
                                agreement_count: 0
                            }
                        ]);
                    } else {
                        // Update identifikasi yang sudah ada
                        setIdentifications(prevIdentifications =>
                            prevIdentifications.map(ident =>
                                ident.id === newIdentification.id
                                    ? {
                                        ...newIdentification,
                                        user_disagreed: true,
                                        disagrees_with_id: identificationId,
                                        agreement_count: ident.agreement_count
                                    }
                                    : ident
                            )
                        );
                    }
                }

                // Update status user_disagreed pada identifikasi yang ditolak
                setIdentifications(prevIdentifications =>
                    prevIdentifications.map(ident =>
                        ident.id === identificationId
                            ? { ...ident, user_disagreed: true }
                            : ident
                    )
                );

                // Refresh data menggunakan React Query (untuk memastikan perubahan lainnya juga terekam)
                await queryClient.invalidateQueries(['checklist', cleanId, source]);
                await queryClient.invalidateQueries(['comments', id]);
            }
        } catch (error) {
            console.error('Error disagreeing with identification:', error);
        }
    };

    // Fungsi untuk mengambil data flag
    const fetchFlags = async () => {
        try {
            const response = await apiFetch(`/observations/${id}/flags`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setFlags(data.data);
            }
        } catch (error) {
            console.error('Error fetching flags:', error);
        }
    };

    // Fungsi untuk submit flag
    const handleFlagSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingFlag(true);

        try {
            const response = await apiFetch(`/observations/${id}/flag`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flagForm)
            });

            const data = await response.json();
            if (data.success) {
                setShowFlagModal(false);
                setFlagForm({ flag_type: '', reason: '' });
                fetchFlags();

                // Notifikasi sukses
                alert('Laporan berhasil dikirim. Tim kami akan segera meninjau laporan Anda.');
            } else {
                // Handle specific error messages
                if (data.message?.includes('sudah melaporkan')) {
                    alert('Anda sudah melaporkan checklist ini sebelumnya. Laporan Anda sedang dalam proses');
                } else {
                    alert(data.message || 'Gagal mengirim laporan. Silakan coba lagi nanti.');
                }
            }
        } catch (error) {
            // Handle different types of errors
            if (error.message?.includes('sudah melaporkan')) {
                alert('Anda sudah melaporkan checklist ini sebelumnya. Laporan Anda sedang dalam proses peninjauan.');
            } else {
                alert('Terjadi kesalahan saat mengirim laporan. Silakan coba lagi nanti.');
            }
            console.error('Error submitting flag:', error);
        } finally {
            setIsSubmittingFlag(false);
        }
    };

    // Fungsi untuk resolve flag (untuk admin/moderator)
    const handleResolveFlag = async (flagId, resolutionNotes) => {
        try {
            const response = await apiFetch(`/observations/flags/${flagId}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resolution_notes: resolutionNotes })
            });

            const data = await response.json();
            if (data.success) {
                fetchFlags(); // Refresh flags
                alert('Flag berhasil diselesaikan');
            } else {
                alert(data.message || 'Gagal menyelesaikan flag');
            }
        } catch (error) {
            console.error('Error resolving flag:', error);
            alert('Terjadi kesalahan saat menyelesaikan flag');
        }
    };

    useEffect(() => {
        if (id) {
            fetchFlags();
        }
    }, [id]);

    useEffect(() => {
        if (checklist) {
            fetchQualityAssessment();
        }
    }, [checklist, id]);

    if (isLoadingChecklist || isLoadingComments || isLoadingFlags) {
        return (
            <div className={`flex items-center justify-center ${isModal ? 'h-96' : 'min-h-screen'}`}>
                <div className="text-lg text-gray-600">Memuat...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-600">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className={`${isModal ? '' : 'max-w-7xl mx-auto'} min-h-screen bg-[#121212]`}>
            {isModal && (
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-300 hover:text-gray-100 z-50"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Header Section */}
            <div className="px-4 py-8 border-b border-[#444] bg-[#1e1e1e] mt-16">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-start gap-4">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold text-white">
                                <TaxonomyHeader checklist={checklist} />
                            </h1>
                            <div className="text-gray-300 text-sm space-y-1">
                                <TaxonomyInfo checklist={checklist} />
                            </div>
                            <div className="text-gray-300 space-y-1 text-sm mt-4">
                                <div className="flex items-center gap-2">
                                    <span>Oleh</span>
                                    <Link
                                        to={`/profile/${checklist?.fobi_user_id || checklist?.user_id}`}
                                        className="text-[#1a73e8] hover:text-[#4285f4] font-medium"
                                    >
                                        {checklist?.observer || 'Pengamat tidak diketahui'}
                                    </Link>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <span>Diobservasi:</span>
                                        <time className="font-medium">
                                            {checklist?.observation_date ?
                                                new Date(checklist.observation_date).toLocaleDateString('id-ID', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                }) : 'Tanggal tidak tersedia'}
                                        </time>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm
                            ${checklist?.grade === 'research grade' ? 'bg-blue-900 text-blue-200 ring-1 ring-blue-600/40' :
                            checklist?.grade === 'confirmed id' ? 'bg-green-900 text-green-200 ring-1 ring-green-600/40' :
                            checklist?.grade === 'needs ID' ? 'bg-yellow-900 text-yellow-200 ring-1 ring-yellow-600/40' :
                            checklist?.grade === 'low quality ID' ? 'bg-orange-900 text-orange-200 ring-1 ring-orange-600/40' :
                            'bg-gray-800 text-gray-200 ring-1 ring-gray-600/40'}`}>
                            {checklist?.grade === 'research grade' ? 'ID Lengkap' :
                             checklist?.grade === 'confirmed id' ? 'ID Terkonfirmasi' :
                             checklist?.grade === 'needs ID' ? 'Bantu Iden' :
                             checklist?.grade === 'low quality ID' ? 'ID Kurang' :
                             'Casual'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Media Section */}
                    <div className="space-y-4">
                        <div className="rounded-2xl overflow-hidden bg-[#1e1e1e] shadow-sm ring-1 ring-[#444]">
                            <MediaViewer checklist={checklist} />
                        </div>
                    </div>

                    {/* Map Section */}
                    <div className="space-y-4">
                        <div className="rounded-2xl overflow-hidden bg-[#1e1e1e] shadow-sm ring-1 ring-[#444]">
                            <ChecklistMap checklist={checklist} />
                        </div>
                        <div className="text-sm text-gray-300 flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8]" />
                                <span>{locationName}</span>
                    </div>
                </div>
            </div>

                {/* Details Section */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[#1e1e1e] rounded-2xl shadow-sm ring-1 ring-[#444] p-6">
<TabPanel
    id={id}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    comments={comments}
    setComments={setComments}
    identifications={identifications}
    setIdentifications={setIdentifications}
    newComment={newComment}
    setNewComment={setNewComment}
    addComment={addComment}
    handleIdentificationSubmit={handleIdentificationSubmit}
    searchTaxa={searchTaxa}
    searchResults={searchResults}
    selectedTaxon={selectedTaxon}
    setSelectedTaxon={setSelectedTaxon}
    identificationForm={identificationForm}
    setIdentificationForm={setIdentificationForm}
    handleLocationVerify={handleLocationVerify}
    handleWildStatusVote={handleWildStatusVote}
    locationVerifications={locationVerifications}
    wildStatusVotes={wildStatusVotes}
    handleAgreeWithIdentification={handleAgreeWithIdentification}
    handleWithdrawIdentification={handleWithdrawIdentification}
    handleCancelAgreement={handleCancelAgreement}
    handleDisagreeWithIdentification={handleDisagreeWithIdentification}
    user={user}
    checklist={checklist}
/>
                        </div>
<button
                        onClick={() => setShowFlagModal(true)}
                            className="inline-flex items-center px-4 py-2 rounded-lg bg-red-900 text-red-200 hover:bg-red-800 
                                transition-colors ring-1 ring-red-600/40"
                    >
                        <FontAwesomeIcon icon={faFlag} className="mr-2" />
                        Tandai Masalah
                    </button>
                </div>

                <div className="space-y-6">
                    {/* 
                    TaxonomyTree dan QualityAssessment dihapus dari tampilan karena:
                    1. TaxonomyTree dipindah ke GenusGallery.jsx dan SpeciesGallery.jsx
                    2. QualityAssessment masih dalam tahap pengembangan
                    */}
                </div>
                </div>
            </div>

            {/* Modal untuk flag */}
            <FlagModal
                showFlagModal={showFlagModal}
                setShowFlagModal={setShowFlagModal}
                flagForm={flagForm}
                setFlagForm={setFlagForm}
                handleFlagSubmit={handleFlagSubmit}
                isSubmittingFlag={isSubmittingFlag}
            />

            {/* Modal konfirmasi Kingdom Quorum */}
            <KingdomQuorumModal
                isOpen={showKingdomQuorumModal}
                closeModal={handleCancelIdentification}
                message={kingdomQuorumMessage}
                onConfirm={handleForceSubmitIdentification}
                onCancel={handleCancelIdentification}
            />
        </div>
    );
}

export default ChecklistDetail;
