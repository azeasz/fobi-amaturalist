import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faComments,
    faSearch,
    faCheckCircle,
    faMapMarkerAlt,
    faPaw,
    faXmark,
    faQuoteLeft,
    faAt,
    faChevronDown,
    faChevronUp,
    faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import 'react-quill/dist/quill.snow.css';
import { apiFetch } from '../../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';

// CSS untuk ReactQuill dark theme
import './quill-dark.css';

const getSourceFromId = (id) => {
    if (!id) return 'fobi';
    return typeof id === 'string' && (
        id.startsWith('BN') ? 'burungnesia' :
        id.startsWith('KP') ? 'kupunesia' :
        'fobi'
    );
};

function TabPanel({
    id,
    activeTab,
    setActiveTab,
    comments,
    setComments,
    identifications,
    setIdentifications,
    newComment,
    setNewComment,
    addComment,
    handleIdentificationSubmit,
    searchTaxa,
    searchResults,
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
    // Log user info saat komponen di-render
    console.log('TabPanel rendered with user:', user);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [showDisagreeModal, setShowDisagreeModal] = useState(false);
    const [disagreeComment, setDisagreeComment] = useState('');
    const [selectedIdentificationId, setSelectedIdentificationId] = useState(null);
    const [identificationPhoto, setIdentificationPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [showIdentifierTooltip, setShowIdentifierTooltip] = useState(false);
    const [activeIdentifierId, setActiveIdentifierId] = useState(null);
    const [showAgreementTooltip, setShowAgreementTooltip] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [selectedUsername, setSelectedUsername] = useState(null);
    const source = getSourceFromId(id);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionsRef] = useState(React.createRef());
    const [modalSuggestionsRef] = useState(React.createRef());
    const [wsConnected, setWsConnected] = useState(false);
    const ws = useRef(null);
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagReason, setFlagReason] = useState('');
    const [selectedCommentId, setSelectedCommentId] = useState(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const [expandedIdentifications, setExpandedIdentifications] = useState({});
    const [loadingStates, setLoadingStates] = useState({
        agree: false,
        disagree: false,
        cancelAgreement: false,
        withdraw: false,
        comment: false,
        flag: false // tambahkan ini
    });

    // State untuk menampung semua konten (identifikasi + komentar) yang telah digabung
    const [combinedContent, setCombinedContent] = useState([]);

    // Fungsi untuk menggabungkan dan mengurutkan identifikasi dan komentar
    const combineAndSortContent = useCallback(() => {
        // Pastikan identifications dan comments adalah array
        const identArray = Array.isArray(identifications) ? identifications : [];
        const commArray = Array.isArray(comments) ? comments : [];
        
        // Siapkan array untuk menampung semua konten
        let combined = [];
        
        // Tambahkan identifikasi dengan tipe 'identification'
        identArray.forEach(ident => {
            combined.push({
                ...ident,
                type: 'identification',
                timestamp: new Date(ident.created_at)
            });
        });
        
        // Tambahkan komentar dengan tipe 'comment'
        commArray.forEach(comment => {
            combined.push({
                ...comment,
                type: 'comment',
                timestamp: new Date(comment.created_at)
            });
        });
        
        // Filter untuk menghilangkan item dengan tanggal tidak valid
        combined = combined.filter(item => !isNaN(item.timestamp.getTime()));
        
        // Urutkan berdasarkan tanggal (terlama ke terbaru)
        combined.sort((a, b) => a.timestamp - b.timestamp);
        
        // Konversi tanggal menjadi string dalam format YYYY-MM-DD untuk grouping
        combined.forEach(item => {
            item.dateStr = item.timestamp.toISOString().split('T')[0];
        });
        
        // Group berdasarkan tanggal
        const groupedByDate = {};
        combined.forEach(item => {
            if (!groupedByDate[item.dateStr]) {
                groupedByDate[item.dateStr] = [];
            }
            groupedByDate[item.dateStr].push(item);
        });
        
        // Flatten kembali dengan date divider
        const result = [];
        Object.keys(groupedByDate).sort().forEach(dateStr => {
            // Tambahkan date divider
            result.push({
                type: 'date_divider', 
                date: dateStr
            });
            // Tambahkan items untuk tanggal ini
            result.push(...groupedByDate[dateStr]);
        });
        
        console.log('Combined content:', result);
        return result;
    }, [identifications, comments]);

    // Update combinedContent ketika identifications atau comments berubah
    useEffect(() => {
        setCombinedContent(combineAndSortContent());
    }, [identifications, comments, combineAndSortContent]);

    useEffect(() => {
        if (!identifications || identifications.length === 0) return;
        
        // Buat objek baru untuk tracking expanded state
        const initialExpandedState = {};
        
        // Set semua identifikasi yang ditarik ke collapsed (false) secara default
        identifications.forEach(ident => {
            if (ident.is_withdrawn === 1) {
                initialExpandedState[ident.id] = false;
            }
        });
        
        setExpandedIdentifications(initialExpandedState);
    }, [identifications]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // For main suggestions
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            // For modal suggestions
            if (modalSuggestionsRef.current && !modalSuggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Fungsi untuk mengambil data terbaru
        const fetchLatestData = async () => {
            try {
                // Ambil komentar terbaru saja
                const commentsResponse = await apiFetch(`/observations/${id}/comments`);
                const commentsData = await commentsResponse.json();
                if (commentsData.success) {
                    setComments(commentsData.data);
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
    }, [id]);

    const tabs = [
        { id: 'identification', label: 'Identifikasi', icon: faSearch },
        { id: 'comments', label: 'Komentar', icon: faComments }
    ];

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length >= 3) {
            await searchTaxa(query);
        }
    };

    const handleTaxonSelect = (taxon) => {
        setSelectedTaxon(taxon);
        setIdentificationForm(prev => ({
            ...prev,
            taxon_id: taxon.full_data.id,
            identification_level: taxon.rank
        }));
        setSearchQuery('');
        setShowSuggestions(false);
    };
    const handleDisagreeSubmit = async (identificationId) => {
        try {
            // Pastikan kita punya takson yang dipilih
            if (!selectedTaxon || !selectedTaxon.full_data || !selectedTaxon.full_data.id) {
                toast.error('Silakan pilih takson terlebih dahulu');
                return;
            }

            // Pastikan komentar tidak kosong
            if (!disagreeComment || disagreeComment.trim() === '') {
                toast.error('Berikan alasan penolakan');
                return;
            }

            // Cek apakah user sudah punya identifikasi langsung (bukan persetujuan) untuk checklist ini
            const existingUserIdentification = identifications.find(
                ident => ident.user_id === user?.id && 
                         !ident.agrees_with_id && // Penting: hanya identifikasi langsung
                         ident.is_withdrawn !== 1
            );
            
            // Cek apakah user memiliki persetujuan sebelumnya
            const userAgreements = identifications.filter(
                ident => ident.user_id === user?.id && 
                         ident.agrees_with_id && 
                         ident.is_withdrawn !== 1
            );
            
            const hasExistingAgreement = userAgreements.length > 0;

            const requestBody = {
                taxon_id: selectedTaxon.full_data.id,
                comment: disagreeComment,
                identification_level: selectedTaxon.rank || 'species',
                force_new_identification: hasExistingAgreement // Selalu buat identifikasi baru jika sebelumnya punya agreement
            };

            // Tambahkan existing_identification_id jika ada identifikasi langsung yang sudah ada
            if (existingUserIdentification && !existingUserIdentification.agrees_with_id) {
                requestBody.existing_identification_id = existingUserIdentification.id;
                console.log('Existing direct identification found:', existingUserIdentification.id);
            } else {
                console.log('No direct identification found, will create new one');
            }

            console.log('Sending disagreement request:', requestBody);

            const response = await apiFetch(`/observations/${id}/identifications/${identificationId}/disagree`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            if (data.success) {
                // Jika pengguna memiliki persetujuan sebelumnya, tandai sebagai ditarik
                if (hasExistingAgreement) {
                    // Update semua persetujuan sebelumnya sebagai ditarik
                    setIdentifications(prevIdentifications =>
                        prevIdentifications.map(ident => {
                            // Jika ini adalah persetujuan milik pengguna saat ini, tandai sebagai ditarik
                            if (ident.user_id === user?.id && 
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
                
                // Perbarui daftar identifikasi - penting untuk menangani potensi duplikasi
                if (data.disagreement) {
                    // Cari apakah sudah ada identifikasi dengan id yang sama
                    const existingIndex = identifications.findIndex(
                        ident => ident.id === data.disagreement.id
                    );
                    
                    if (existingIndex >= 0) {
                        // Update identifikasi yang sudah ada
                        setIdentifications(prevIdentifications => 
                            prevIdentifications.map(ident => 
                                ident.id === data.disagreement.id
                                    ? { ...data.disagreement, disagrees_with_id: identificationId } 
                                    : ident
                            )
                        );
                        console.log('Updated existing identification to disagreement:', data.disagreement);
                    } else {
                        // Tambahkan identifikasi baru
                        setIdentifications(prevIdentifications => [
                            ...prevIdentifications, 
                            { ...data.disagreement, disagrees_with_id: identificationId }
                        ]);
                        console.log('Added new disagreement identification:', data.disagreement);
                    }
                }
                
                // Jika ada panggilan fungsi handler penolakan eksternal, panggil
                if (typeof handleDisagreeWithIdentification === 'function') {
                    await handleDisagreeWithIdentification(identificationId, disagreeComment, selectedTaxon);
                }
                
                // Update status user_agreed untuk identifikasi yang ditolak
                setIdentifications(prevIdentifications =>
                    prevIdentifications.map(ident =>
                        ident.id === identificationId
                            ? { ...ident, user_disagreed: true }
                            : ident
                    )
                );
                
                // Bersihkan form dan tampilan
                setShowDisagreeModal(false);
                setSelectedTaxon(null);
                setDisagreeComment('');
                setSearchQuery('');
                
                toast.success('Berhasil menolak identifikasi');
            } else {
                console.error('Gagal menolak identifikasi:', data.message);
                toast.error(`Gagal menolak identifikasi: ${data.message || 'Silakan coba lagi'}`);
            }
        } catch (error) {
            console.error('Error saat menolak identifikasi:', error);
            toast.error('Terjadi kesalahan saat menolak identifikasi. Silakan coba lagi.');
        }
    };

    const handleDisagreeButton = (identificationId) => {
        setSelectedIdentificationId(identificationId);
        setShowDisagreeModal(true);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIdentificationPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleUsernameClick = (comment, e) => {
        e.preventDefault();
        setSelectedUsername(comment.user_name);
        setSelectedCommentId(comment.id);
        setShowUserMenu(true);
    };

    const formatLink = (url) => {
        if (!url.match(/^https?:\/\//i)) {
            return `https://${url}`;
        }
        return url;
    };

    const quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
        clipboard: {
            matchVisual: false
        },
        keyboard: {
            bindings: {
                tab: false
            }
        }
    };

    const handleLinkClick = useCallback((e) => {
        const target = e.target;
        if (target.tagName === 'A') {
            e.preventDefault();
            const href = target.getAttribute('href');
            if (href) {
                // Jika link mengarah ke profil, gunakan navigasi internal react-router
                if (href.includes('/profile/')) {
                    // Ekstrak path dari URL lengkap
                    const url = new URL(href, window.location.origin);
                    const path = url.pathname;
                    // Gunakan react-router untuk navigasi tanpa refresh halaman
                    navigate(path);
                } else {
                    // Untuk link eksternal, buka di tab baru
                    window.open(formatLink(href), '_blank', 'noopener,noreferrer');
                }
            }
        }
    }, [navigate]);

    const getTaxonomyLevel = (taxon) => {
        // Kasus khusus untuk division/phylum
        if (!taxon.phylum && taxon.division) {
            return `${taxon.division} (Phylum)`;
        }

        // Daftar lengkap level taksonomi dari yang paling spesifik ke yang paling umum
        const taxonomyLevels = [
            'subform',
            'form',
            'variety',
            'subspecies',
            'species',
            'subgenus',
            'genus',
            'subtribe',
            'tribe',
            'supertribe',
            'subfamily',
            'family',
            'superfamily',
            'infraorder',
            'suborder',
            'order',
            'superorder',
            'infraclass',
            'subclass',
            'class',
            'superclass',
            'subdivision',
            'division',
            'superdivision',
            'subphylum',
            'phylum',
            'superphylum',
            'subkingdom',
            'kingdom',
            'superkingdom',
            'domain'
        ];

        // Cari level taksonomi pertama yang tersedia
        for (const level of taxonomyLevels) {
            if (taxon[level]) {
                const displayName = level.charAt(0).toUpperCase() + level.slice(1);
                return `${taxon[level]} (${displayName})`;
            }
        }
        return null;
    };

    // Fungsi baru untuk menemukan taksonomi induk yang sama
    const findCommonTaxonomicAncestor = (identifications) => {
        if (!identifications || identifications.length <= 1) {
            return null;
        }
        
        // Daftar lengkap level taksonomi dari yang paling spesifik ke yang paling umum
        const taxonomyLevels = [
            'subform',
            'form',
            'variety',
            'subspecies',
            'species',
            'subgenus',
            'genus',
            'subtribe',
            'tribe',
            'supertribe',
            'subfamily',
            'family',
            'superfamily',
            'infraorder',
            'suborder',
            'order',
            'superorder',
            'infraclass',
            'subclass',
            'class',
            'superclass',
            'subdivision',
            'division',
            'superdivision',
            'subphylum',
            'phylum',
            'superphylum',
            'subkingdom',
            'kingdom',
            'superkingdom',
            'domain'
        ];
        
        // Pra-proses identifikasi untuk menangani kasus khusus division/phylum
        const processedIdentifications = identifications.map(ident => {
            const processedIdent = {...ident};
            // Jika phylum kosong tapi division ada, gunakan division sebagai phylum
            if (!processedIdent.phylum && processedIdent.division) {
                processedIdent.phylum = processedIdent.division;
                processedIdent.cname_phylum = processedIdent.cname_division;
            }
            return processedIdent;
        });
        
        // Mulai dari level taksonomi paling rendah (yang lebih spesifik)
        for (const level of taxonomyLevels) {
            // Lewati level species, kita mulai dari genus
            if (level === 'species' || level === 'subspecies' || level === 'variety' || level === 'form' || level === 'subform') {
                continue;
            }
            
            // Ambil nilai dari takson pertama untuk level ini sebagai referensi
            const referenceValue = processedIdentifications[0][level];
            
            // Jika referensi tidak ada untuk level ini, lanjut ke level yang lebih tinggi
            if (!referenceValue) {
                continue;
            }
            
            // Periksa apakah semua takson memiliki nilai yang sama untuk level ini
            const allSame = processedIdentifications.every(ident => 
                ident[level] && ident[level] === referenceValue
            );
            
            // Jika semua taxa memiliki nilai yang sama pada level ini, 
            // kita telah menemukan taksonomi induk yang sama
            if (allSame) {
                console.log(`Menemukan taksonomi induk yang sama pada level ${level}: ${referenceValue}`);
                
                // Buat objek taksonomi induk dengan level yang ditemukan
                const commonAncestor = {
                    ...processedIdentifications[0], // Salin properti dari takson pertama
                };
                
                // Hapus semua level yang lebih rendah dari level yang ditemukan
                const indexOfLevel = taxonomyLevels.indexOf(level);
                if (indexOfLevel > 0) {
                    for (let i = 0; i < indexOfLevel; i++) {
                        commonAncestor[taxonomyLevels[i]] = null;
                    }
                }
                
                // Tambahkan properti untuk menunjukkan bahwa ini adalah taksonomi induk
                commonAncestor.isCommonAncestor = true;
                commonAncestor.commonAncestorLevel = level;
                commonAncestor.taxonomicName = referenceValue;
                
                // Tambahkan daftar taksa yang berbeda di bawah taksonomi induk ini
                commonAncestor.differentSpecies = processedIdentifications.map(ident => ({
                    id: ident.id,
                    species: ident.species,
                    scientific_name: ident.scientific_name || ident.species,
                    common_name: ident.common_name || ident.cname_species,
                    identifier_name: ident.identifier_name,
                    agreement_count: ident.agreement_count
                }));
                
                return commonAncestor;
            }
        }
        
        // Jika tidak ada kesamaan ditemukan, kembalikan null
        return null;
    };

    // Fungsi untuk mendapatkan tampilan taksa dengan common name
    const getTaxaDisplayWithCommonName = (taxon) => {
        // Debugging: lihat struktur data taxon yang diterima
        console.log('Taxon data in getTaxaDisplayWithCommonName:', taxon);
        
        // Jika ini adalah taksonomi induk, tampilkan dengan pesan khusus
        if (taxon.isCommonAncestor) {
            const level = taxon.commonAncestorLevel;
            const levelName = level.charAt(0).toUpperCase() + level.slice(1);
            const commonKey = `cname_${level}`;
            
            return (
                <React.Fragment>
                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <span className="font-semibold">{taxon[level]}</span>
                            {taxon[commonKey] && (
                                <span className="text-xs text-gray-400 font-normal ml-2">({taxon[commonKey]})</span>
                            )}
                            <span className="text-xs text-yellow-400 ml-2 px-2 py-0.5 bg-yellow-900/30 border border-yellow-500/30 rounded-full">
                                Taksonomi induk yang sama ({levelName})
                            </span>
                        </div>
                        
                        {taxon.differentSpecies && taxon.differentSpecies.length > 0 && (
                            <div className="mt-2 text-xs text-gray-300">
                                <div className="mb-1">Identifikasi yang berbeda:</div>
                                <div className="ml-2 space-y-1">
                                    {taxon.differentSpecies.map((species, index) => (
                                        <div key={species.id} className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <span className="italic">{species.scientific_name || species.species}</span>
                                                {species.common_name && (
                                                    <span className="text-gray-400 ml-1">({species.common_name})</span>
                                                )}
                                            </div>
                                            <div className="flex items-center">
                                                <span className="text-gray-400 mr-1">oleh</span>
                                                <span className="text-blue-400">{species.identifier_name}</span>
                                                {species.agreement_count && parseInt(species.agreement_count) > 0 && (
                                                    <span className="ml-1 bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded-full text-[10px]">
                                                        +{species.agreement_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {taxon.total_agreements > 0 && (
                                    <div className="mt-2 text-xs text-gray-300">
                                        <span className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded-full">
                                            Total {taxon.total_agreements} persetujuan
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </React.Fragment>
            );
        }
        
        // Kasus khusus untuk division/phylum
        if (!taxon.phylum && taxon.division) {
            if (taxon.cname_division) {
                return (
                    <React.Fragment>
                        {taxon.division} <span className="text-xs text-gray-400 font-normal">({taxon.cname_division})</span>
                    </React.Fragment>
                );
            }
            return taxon.division;
        }
        
        // Level taksa dari paling rendah ke paling tinggi
        const levels = [
            { key: 'subform', commonKey: 'cname_subform' },
            { key: 'form', commonKey: 'cname_form' },
            { key: 'variety', commonKey: 'cname_variety' },
            { key: 'subspecies', commonKey: 'cname_subspecies' },
            { key: 'species', commonKey: 'cname_species' },
            { key: 'subgenus', commonKey: 'cname_subgenus' },
            { key: 'genus', commonKey: 'cname_genus' },
            { key: 'subtribe', commonKey: 'cname_subtribe' },
            { key: 'tribe', commonKey: 'cname_tribe' },
            { key: 'supertribe', commonKey: 'cname_supertribe' },
            { key: 'subfamily', commonKey: 'cname_subfamily' },
            { key: 'family', commonKey: 'cname_family' },
            { key: 'superfamily', commonKey: 'cname_superfamily' },
            { key: 'infraorder', commonKey: 'cname_infraorder' },
            { key: 'suborder', commonKey: 'cname_suborder' },
            { key: 'order', commonKey: 'cname_order' },
            { key: 'superorder', commonKey: 'cname_superorder' },
            { key: 'infraclass', commonKey: 'cname_infraclass' },
            { key: 'subclass', commonKey: 'cname_subclass' },
            { key: 'class', commonKey: 'cname_class' },
            { key: 'superclass', commonKey: 'cname_superclass' },
            { key: 'subdivision', commonKey: 'cname_subdivision' },
            { key: 'division', commonKey: 'cname_division' },
            { key: 'superdivision', commonKey: 'cname_superdivision' },
            { key: 'subphylum', commonKey: 'cname_subphylum' },
            { key: 'phylum', commonKey: 'cname_phylum' },
            { key: 'superphylum', commonKey: 'cname_superphylum' },
            { key: 'subkingdom', commonKey: 'cname_subkingdom' },
            { key: 'kingdom', commonKey: 'cname_kingdom' },
            { key: 'superkingdom', commonKey: 'cname_superkingdom' },
            { key: 'domain', commonKey: 'cname_domain' }
        ];

        // Cari level taksa terendah yang tersedia
        for (const { key, commonKey } of levels) {
            if (taxon[key]) {
                // Tentukan apakah perlu italic berdasarkan level taksonomi
                const needsItalic = ['family', 'genus', 'subgenus', 'species', 'subspecies', 'variety', 'form', 'subform'].includes(key);
                
                // Tampilkan dengan common name jika tersedia
                if (taxon[commonKey]) {
                    return (
                        <React.Fragment>
                            <span className={needsItalic ? 'italic' : ''}>{taxon[key]}</span> 
                            <span className="text-xs text-gray-400 font-normal ml-2">({taxon[commonKey]})</span>
                        </React.Fragment>
                    );
                }
                // Coba cari common name di format lain jika ada
                else if (key === 'species' && taxon.common_name) {
                    return (
                        <React.Fragment>
                            <span className="italic">{taxon[key]}</span> 
                            <span className="text-xs text-gray-400 font-normal ml-2">({taxon.common_name})</span>
                        </React.Fragment>
                    );
                }
                return <span className={needsItalic ? 'italic' : ''}>{taxon[key]}</span>;
            }
        }

        // Jika tidak ada level taksa yang tersedia, gunakan scientific_name
        if (taxon.scientific_name) {
            // Tentukan apakah perlu italic berdasarkan format nama ilmiah
            const needsItalic = taxon.scientific_name.split(' ').length > 1;
            
            if (taxon.common_name) {
                return (
                    <React.Fragment>
                        <span className={needsItalic ? 'italic' : ''}>{taxon.scientific_name}</span> 
                        <span className="text-xs text-gray-400 font-normal ml-2">({taxon.common_name})</span>
                    </React.Fragment>
                );
            }
            return <span className={needsItalic ? 'italic' : ''}>{taxon.scientific_name}</span>;
        }

        return 'Nama tidak tersedia';
    };

    const renderSuggestionsList = (results, containerRef, onClose) => (
        <div
            ref={containerRef}
            className="relative mt-2 border rounded max-h-48 overflow-y-auto bg-white"
        >
            <button
                onClick={onClose}
                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 z-10"
            >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
            {results.map((taxon) => (
                <div
                    key={taxon.id}
                    onClick={() => handleTaxonSelect(taxon)}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                    <div className={`${taxon.rank === 'species' ? 'italic' : ''}`}>
                        {taxon.scientific_name}
                        {taxon.common_name && ` | ${taxon.common_name}`}
                        <span className="text-gray-500 text-sm"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
                    </div>
                    {taxon.family_context && (
                        <div className="text-sm text-gray-600">
                            {taxon.family_context}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    // Fungsi untuk menentukan identifikasi saat ini berdasarkan kriteria
    const getCurrentIdentification = () => {
        if (!identifications || identifications.length === 0) {
            return null;
        }

        // Filter identifikasi yang aktif (tidak ditarik/withdrawn)
        const activeIdentifications = identifications.filter(id => 
            id.is_withdrawn !== 1 && !id.agrees_with_id);
        
        console.log('Active identifications:', activeIdentifications);
        
        if (activeIdentifications.length === 0) {
            return null;
        }

        // Jika hanya ada satu identifikasi, kembalikan langsung
        if (activeIdentifications.length === 1) {
            console.log('Hanya satu identifikasi aktif:', activeIdentifications[0]);
            return {
                ...activeIdentifications[0],
                isSystemIdentification: false
            };
        }
        
        // Cari taksonomi induk yang sama jika ada lebih dari satu identifikasi
        const commonAncestor = findCommonTaxonomicAncestor(activeIdentifications);
        if (commonAncestor) {
            console.log('Ditemukan taksonomi induk yang sama:', commonAncestor);
            return {
                ...commonAncestor,
                isSystemIdentification: true,
                isCommonAncestor: true
            };
        }
        
        // Jika tidak ada ancestor, cari identifikasi dengan persetujuan terbanyak
        const sortedByAgreements = [...activeIdentifications].sort((a, b) => {
            const countA = parseInt(a.agreement_count) || 0;
            const countB = parseInt(b.agreement_count) || 0;
            return countB - countA;
        });

        return {
            ...sortedByAgreements[0],
            isSystemIdentification: false
        };
    };

    // Memoize addLinkEventListeners function dengan useCallback
    const addLinkEventListeners = useCallback((containerId, handleLinkFn) => {
        const container = document.getElementById(containerId);
        if (container) {
            const links = container.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('click', handleLinkFn);
            });
            
            // Return cleanup function
            return () => {
                links.forEach(link => {
                    link.removeEventListener('click', handleLinkFn);
                });
            };
        }
        return () => {};
    }, []);

    // Tambahkan fungsi untuk toggle expanded state suatu identifikasi
    const toggleIdentificationExpand = (identificationId) => {
        setExpandedIdentifications(prev => ({
            ...prev,
            [identificationId]: !prev[identificationId]
        }));
    };

    // Tambahkan useEffect untuk menangani tautan di komentar
    useEffect(() => {
        if (!identifications || identifications.length === 0) return;

        // Berikan waktu untuk DOM di-render
        const timeoutId = setTimeout(() => {
            // Temukan semua elemen komentar identifikasi
            const commentContainers = document.querySelectorAll('[id^="identification-comment-"]');
            const cleanupFunctions = [];
            
            commentContainers.forEach(container => {
                const cleanupFn = addLinkEventListeners(container.id, handleLinkClick);
                cleanupFunctions.push(cleanupFn);
            });
            
            // Return cleanup function
            return () => {
                cleanupFunctions.forEach(fn => fn());
            };
        }, 100);
        
        return () => clearTimeout(timeoutId);
    }, [identifications, addLinkEventListeners, handleLinkClick]);

    const renderIdentifications = () => {
        console.log('Identifications in TabPanel:', identifications);
        
        // Tambahkan debugging rinci untuk setiap identifikasi
        if (identifications && identifications.length > 0) {
            identifications.forEach((ident, index) => {
                console.log(`Identification ${index}:`, {
                    id: ident.id,
                    user_id: ident.user_id,
                    user_id_type: typeof ident.user_id,
                    is_withdrawn: ident.is_withdrawn,
                    identifier_name: ident.identifier_name
                });
            });
        }
        
        if (!identifications || identifications.length === 0) {
            return (
                <div className="text-gray-400 text-center py-4">
                    Belum ada identifikasi
                </div>
            );
        }

        // Group identifications and their agreements
        const groupedIdentifications = identifications.reduce((acc, identification) => {
            if (identification.agrees_with_id) {
                // This is an agreement
                if (!acc[identification.agrees_with_id]) {
                    acc[identification.agrees_with_id] = {
                        main: null,
                        agreements: []
                    };
                }
                acc[identification.agrees_with_id].agreements.push(identification);
            } else {
                // This is a main identification
                if (!acc[identification.id]) {
                    acc[identification.id] = {
                        main: null,
                        agreements: []
                    };
                }
                acc[identification.id].main = identification;
            }
            return acc;
        }, {});

        // Filter out entries without a main identification and sort them - newest at bottom
        const sortedIdentifications = Object.values(groupedIdentifications)
            .filter(group => group.main !== null)
            .sort((a, b) => {
                if (a.main.is_first) return -1;
                if (b.main.is_first) return 1;
                return new Date(a.main.created_at) - new Date(b.main.created_at);
            });

        // Prepare a flat list of all identifications including agreements, properly sorted by date
        const flatIdentificationList = [];
        
        sortedIdentifications.forEach(({ main, agreements }) => {
            // Add the main identification
            flatIdentificationList.push({
                ...main,
                isMainIdentification: true,
                agreements: agreements
            });
            
            // Add each agreement as its own entry
            agreements.forEach(agreement => {
                flatIdentificationList.push({
                    ...agreement,
                    isAgreement: true,
                    mainIdentification: main
                });
            });
        });
        
        // Sort everything by date
        flatIdentificationList.sort((a, b) => {
            try {
                const dateA = new Date(a.created_at);
                const dateB = new Date(b.created_at);
                
                // Validasi kedua tanggal
                if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) {
                    return 0; // Keduanya invalid, anggap sama
                } else if (isNaN(dateA.getTime())) {
                    return 1; // A invalid, B valid, B lebih awal
                } else if (isNaN(dateB.getTime())) {
                    return -1; // A valid, B invalid, A lebih awal
                }
                
                return dateA - dateB;
            } catch (error) {
                console.error('Error sorting dates:', error);
                return 0;
            }
        });

        // Kelompokkan persetujuan yang memiliki tanggal yang sama dengan format YYYY-MM-DD
        const dateGroups = {};
        flatIdentificationList.forEach(item => {
            try {
                // Pastikan created_at adalah string dan bisa di-parse menjadi Date yang valid
                const createdAt = item.created_at ? new Date(item.created_at) : new Date();
                
                // Validasi apakah date valid
                if (isNaN(createdAt.getTime())) {
                    console.warn('Invalid date detected:', item.created_at);
                    // Gunakan tanggal saat ini sebagai fallback
                    item.created_at = new Date().toISOString();
                }
                
                const dateStr = new Date(item.created_at).toISOString().split('T')[0];
                if (!dateGroups[dateStr]) {
                    dateGroups[dateStr] = [];
                }
                dateGroups[dateStr].push(item);
            } catch (error) {
                console.error('Error processing date:', error, item);
                // Jika terjadi error, gunakan tanggal hari ini
                const today = new Date().toISOString().split('T')[0];
                if (!dateGroups[today]) {
                    dateGroups[today] = [];
                }
                dateGroups[today].push(item);
            }
        });

        // Flatten kembali, tapi dengan date divider
        const enhancedList = [];
        Object.keys(dateGroups).sort().forEach(dateStr => {
            // Add date divider
            enhancedList.push({
                isDateDivider: true,
                date: dateStr
            });
            // Add items for this date
            enhancedList.push(...dateGroups[dateStr]);
        });

        return (
            <div className="identification-tree">
                {enhancedList.map((item, index) => {
                    // Render date divider
                    if (item.isDateDivider) {
                        try {
                            const date = new Date(item.date);
                            
                            // Validasi tanggal
                            if (isNaN(date.getTime())) {
                                console.warn('Invalid date in date divider:', item.date);
                                // Gunakan tanggal hari ini sebagai fallback
                                const today = new Date();
                                return (
                                    <div key={`date-invalid-${index}`} className="flex items-center my-2 sm:my-3">
                                        <div className="grow border-t border-[#444]"></div>
                                        <div className="mx-2 sm:mx-4 text-xs text-gray-400 px-2 py-1 rounded-full bg-[#333]/70">
                                            {today.toLocaleDateString('id-ID', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="grow border-t border-[#444]"></div>
                                    </div>
                                );
                            }
                            
                            return (
                                <div key={`date-${item.date}-${index}`} className="flex items-center my-2 sm:my-3">
                                    <div className="grow border-t border-[#444]"></div>
                                    <div className="mx-2 sm:mx-4 text-xs text-gray-400 px-2 py-1 rounded-full bg-[#333]/70">
                                        {date.toLocaleDateString('id-ID', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div className="grow border-t border-[#444]"></div>
                                </div>
                            );
                        } catch (error) {
                            console.error('Error rendering date divider:', error);
                            return null;
                        }
                    }
                    
                    // Render identification
                    if (item.type === 'identification') {
                        // Buat array dengan satu identifikasi untuk diteruskan ke renderIdentifications
                        // yang dimodifikasi untuk menerima array identifikasi spesifik
                        const singleIdent = [item];
                        return (
                            <div key={`ident-${item.id}-${index}`} className="mb-2">
                                {renderSingleIdentification(item, index)}
                            </div>
                        );
                    }
                    
                    // Render comment
                    if (item.type === 'comment') {
                        return (
                            <div key={`comment-${item.id}-${index}`} className="mb-2 bg-[#2c2c2c] rounded-lg">
                                {renderComment(item)}
                            </div>
                        );
                    }
                    
                    return null;
                })}
            </div>
        );
    };
    
    // Fungsi baru untuk merender satu identifikasi tunggal
    const renderSingleIdentification = (item, index) => {
                    const currentUsername = localStorage.getItem('username');
                    const currentUserId = user ? user.id : null;
                    const isOwnIdentification = user && String(item.user_id) === String(user.id);
                    const photoUrl = item.photo_path
            ? `https://api.amaturalist.com/storage/${item.photo_path}`
                        : item.photo_url;
                    
        if (item.isAgreement || item.agrees_with_id) {
                        // Render agreement
                        return (
                <div className="relative">
                                <div className="flex items-start">
                                    {/* User profile image */}
                                    <div className="mr-2 sm:mr-3 flex-shrink-0">
                                        <img 
                                            src={item.profile_pic || `https://ui-avatars.com/api/?name=${item.identifier_name}&background=2c2c2c&color=fff`} 
                                            alt={item.identifier_name}
                                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#444]"
                                        />
                                    </div>
                                    
                                    <div className="bg-[#2c2c2c] rounded-lg border border-[#444] shadow p-3 sm:p-4 relative flex-grow">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-grow">
                                                <div className="mb-2 sm:mb-3">
                                                    <div className="flex items-center">
                                                        <span className="text-base sm:text-xl font-semibold text-white">
                                                            {getTaxaDisplayWithCommonName(item)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs sm:text-sm italic text-gray-400 mt-1">
                                                        {item.family || item.genus || item.species || getTaxonomyLevel(item)}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center text-xs sm:text-sm text-gray-400 flex-wrap">
                                                    <span className="bg-blue-900/30 text-blue-200 px-2 py-1 rounded-full mr-2 text-xs border border-blue-500/30">
                                                        <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                        Disetujui
                                                    </span>
                                                    <Link 
                                                        to={`/profile/${item.user_id}`} 
                                                        className="text-[#1a73e8] hover:underline font-medium mx-1"
                                                    >
                                                        {item.identifier_name}
                                                    </Link>
                                        <span>menyetujui identifikasi</span>
                                                    <span className="mx-1">·</span>
                                                    <span>{
                                                        (() => {
                                                            try {
                                                                const date = new Date(item.created_at);
                                                                if (isNaN(date.getTime())) {
                                                                    return 'Tanggal tidak tersedia';
                                                                }
                                                                return date.toLocaleDateString('id-ID');
                                                            } catch (error) {
                                                                console.error('Error formatting date:', error, item.created_at);
                                                                return 'Tanggal tidak tersedia';
                                                            }
                                                        })()
                                                    }</span>
                                                </div>
                                            </div>
                                            
                                            {isOwnIdentification && (
                                                <button
                                                    onClick={() => handleCancelButton(item.agrees_with_id)}
                                                    className="px-2 sm:px-3 py-1 rounded-full bg-[#444] text-gray-300 hover:bg-[#555] text-xs ml-2"
                                                >
                                                    {loadingStates.cancelAgreement ? (
                                                        <span className="flex items-center">
                                                            <span className="mr-1 h-3 w-3 rounded-full border-[1.5px] border-t-transparent border-gray-300 animate-spin"></span>
                                                            <span>Proses...</span>
                                                        </span>
                                                    ) : (
                                                        <span>Batal Setuju</span>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        // Render main identification
                        return (
                <div className="relative identification-node">
                                {item.is_withdrawn === 1 && !expandedIdentifications[item.id] ? (
                                    // Tampilan minimalis untuk identifikasi yang ditarik (collapsed view)
                                    <div 
                                        className="flex items-center bg-[#2c2c2c] hover:bg-[#333] rounded-lg border border-red-900/50 shadow px-3 sm:px-4 py-2 sm:py-3 relative cursor-pointer transition-colors duration-200"
                                        onClick={() => toggleIdentificationExpand(item.id)}
                                        title="Klik untuk melihat detail lengkap"
                                    >
                                        <div className="flex-grow flex flex-wrap items-center gap-2">
                                            <img 
                                                src={item.profile_pic || `https://ui-avatars.com/api/?name=${item.identifier_name}&background=2c2c2c&color=fff`}
                                                alt={item.identifier_name}
                                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-[#444] flex-shrink-0"
                                            />
                                            <div className="line-through text-gray-400 font-medium text-xs sm:text-sm">
                                                {getTaxaDisplayWithCommonName(item)}
                                            </div>
                                            <div className="bg-red-900 text-red-200 text-xs px-2 py-1 rounded flex-shrink-0">
                                                Ditarik
                                            </div>
                                            <div className="text-xs sm:text-sm text-gray-400 flex-shrink-0">
                                                oleh <Link to={`/profile/${item.user_id}`} className="text-[#1a73e8] hover:underline">{item.identifier_name}</Link>
                                                <span className="mx-1">·</span>
                                                {(() => {
                                                    try {
                                                        const date = new Date(item.created_at);
                                                        if (isNaN(date.getTime())) {
                                                            return 'Tanggal tidak tersedia';
                                                        }
                                                        return date.toLocaleDateString('id-ID');
                                                    } catch (error) {
                                                        console.error('Error formatting date for withdrawn item:', error, item.created_at);
                                                        return 'Tanggal tidak tersedia';
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex items-center text-gray-500 text-xs ml-2">
                                            <span className="mr-1 hidden sm:inline">Lihat detail</span>
                                            <FontAwesomeIcon icon={faChevronDown} className="text-gray-400" />
                                        </div>
                                    </div>
                                ) : (
                                    // Tampilan lengkap (expanded view atau identifikasi normal)
                                    <div className="flex items-start">
                                        {/* User profile image */}
                                        <div className="mr-2 sm:mr-3 flex-shrink-0 z-10">
                                            <img 
                                                src={item.profile_pic || `https://ui-avatars.com/api/?name=${item.identifier_name}&background=2c2c2c&color=fff`} 
                                                alt={item.identifier_name}
                                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#444]"
                                            />
                                        </div>
                                        
                                        <div className={`bg-[#2c2c2c] rounded-lg border ${item.is_withdrawn === 1 ? 'border-red-900/50' : 'border-[#444]'} shadow p-3 sm:p-4 relative z-10 flex-grow`}>
                                            {/* Label jika identifikasi ditarik */}
                                            {item.is_withdrawn === 1 && (
                                                <div className="flex justify-between items-center absolute top-0 right-0">
                                                    <div className="bg-red-900 text-red-200 text-xs px-2 py-1 rounded-bl rounded-tr flex items-center cursor-pointer"
                                                        onClick={() => toggleIdentificationExpand(item.id)}
                                                    >
                                                        <span>Ditarik</span>
                                                        <FontAwesomeIcon icon={faChevronUp} className="ml-1 w-3 h-3" />
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
                                                <div className={`flex-grow ${item.is_withdrawn === 1 ? 'cursor-pointer' : ''}`}
                                                     onClick={item.is_withdrawn === 1 ? () => toggleIdentificationExpand(item.id) : undefined}
                                                >
                                                    {/* Takson dan Informasi Level */}
                                                    <div className="mb-2 sm:mb-3">
                                                        <div className="flex items-center">
                                                            <span className={`${item.is_withdrawn === 1 ? 'line-through text-gray-400' : 'text-base sm:text-xl font-semibold text-white'}`}>
                                                                {getTaxaDisplayWithCommonName(item)}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs sm:text-sm italic text-gray-400 mt-1">
                                                            {item.family || item.genus || item.species || getTaxonomyLevel(item)}
                                                        </div>
                                                    </div>

                                                    {/* Informasi Identifikasi */}
                                                    <div className="flex flex-wrap items-center gap-1 text-xs sm:text-sm text-gray-400">
                                                        <span>diidentifikasi oleh</span>
                                                        <Link 
                                                            to={`/profile/${item.user_id}`} 
                                                            className="text-[#1a73e8] hover:underline font-medium"
                                                            onMouseEnter={() => {
                                                                setShowIdentifierTooltip(true);
                                                                setActiveIdentifierId(item.id);
                                                            }}
                                                            onMouseLeave={() => {
                                                                setShowIdentifierTooltip(false);
                                                                setActiveIdentifierId(null);
                                                            }}
                                                        >
                                                            {item.identifier_name}
                                                        </Link>
                                                        <span>·</span>
                                                        <span>{
                                                            (() => {
                                                                try {
                                                                    const date = new Date(item.created_at);
                                                                    if (isNaN(date.getTime())) {
                                                                        return 'Tanggal tidak tersedia';
                                                                    }
                                                                    return date.toLocaleDateString('id-ID');
                                                                } catch (error) {
                                                                    console.error('Error formatting date:', error, item.created_at);
                                                                    return 'Tanggal tidak tersedia';
                                                                }
                                                            })()
                                                        }</span>
                                                    </div>
                                                    
                                                    {/* Tampilkan jumlah persetujuan */}
                                                    {item.agreements && item.agreements.length > 0 && (
                                                        <div className="mt-2 flex items-center">
                                                            <span className="text-xs bg-[#1a73e8]/10 text-[#1a73e8] px-2 py-1 rounded-full border border-[#1a73e8]/30">
                                                                <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                                Disetujui {item.agreements.length} pengamat
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Tooltips untuk informasi identifier */}
                                                    {showIdentifierTooltip && activeIdentifierId === item.id && (
                                                        <div className="absolute z-20 bg-[#333] border border-[#444] rounded-lg shadow-lg p-3 mt-1 left-0 w-60">
                                                            <div className="text-sm">
                                                                <div className="font-medium text-white">{item.identifier_name}</div>
                                                                {item.identifier_joined_date && (
                                                                    <div className="text-gray-400">
                                                                        Bergabung sejak: {new Date(item.identifier_joined_date).toLocaleDateString('id-ID')}
                                                                    </div>
                                                                )}
                                                                {item.identifier_identification_count && (
                                                                    <div className="text-gray-400">
                                                                        Total Identifikasi: {item.identifier_identification_count}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tombol Aksi */}
                                                {!item.is_withdrawn && (
                                                    <div className="flex flex-wrap gap-2 mt-1 sm:mt-0">
                                                        {/* Tombol Aksi Identifikasi */}
                                                        <div className="flex flex-wrap gap-2">
                                                            {isOwnIdentification ? (
                                                                <button
                                                                    onClick={() => handleWithdrawButton(item.id)}
                                                                    disabled={loadingStates.withdraw}
                                                                    className="px-3 py-1 rounded-full bg-yellow-900/70 text-yellow-200 hover:bg-yellow-800 ring-1 ring-yellow-600/40 text-xs sm:text-sm flex items-center"
                                                                    title="Menarik identifikasi ini akan menghapus semua persetujuan terkait"
                                                                >
                                                                    {loadingStates.withdraw ? (
                                                                        <>
                                                                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                                                            <span>Proses...</span>
                                                                        </>
                                                                    ) : (
                                                                        <span>Tarik Identifikasi</span>
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <>
                                                        {/* Periksa apakah ini identifikasi hasil konversi atau penolakan */}
                                                        {!item.user_agreed ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleAgreeButton(item.id)}
                                                                                className="px-3 py-1 rounded-full bg-green-900 text-green-200 hover:bg-green-800 ring-1 ring-green-600/40 flex items-center text-xs sm:text-sm"
                                                                                title="Setuju dengan identifikasi ini"
                                                                            >
                                                                                {loadingStates.agree ? (
                                                                                    <>
                                                                                        <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                                                                        <span>Proses...</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                                                        <span>Setuju</span>
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDisagreeButton(item.id)}
                                                                                className="px-3 py-1 rounded-full bg-red-900 text-red-200 hover:bg-red-800 ring-1 ring-red-600/40 text-xs sm:text-sm flex items-center"
                                                                            >
                                                                                <FontAwesomeIcon icon={faXmark} className="mr-1" />
                                                                                Tolak
                                                                            </button>
                                                                        </>
                                                        ) : item.user_agreed && (
                                                                        <button
                                                                            onClick={() => handleCancelButton(item.id)}
                                                                            className="px-3 py-1 rounded-full bg-blue-900 text-blue-200 hover:bg-blue-800 ring-1 ring-blue-600/40 flex items-center text-xs sm:text-sm"
                                                                            title="Batalkan persetujuan untuk identifikasi ini"
                                                                        >
                                                                            {loadingStates.cancelAgreement ? (
                                                                                <>
                                                                                    <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                                                                    <span>Proses...</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <FontAwesomeIcon icon={faXmark} className="mr-1" />
                                                                                    <span>Batal Setuju</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Catatan Identifikasi */}
                                            {item.comment && !(item.comment.includes("Dikonversi dari persetujuan karena identifikasi utama ditarik")) && (
                                                <div className="mt-3 text-gray-300 bg-[#333] p-3 rounded-lg border border-[#444]">
                                                    <div className="text-xs sm:text-sm font-medium mb-1">Catatan:</div>
                                        <ExpandableComment text={item.comment} id={`identification-comment-${item.id}`} />
                                                </div>
                                            )}

                                            {/* Indikator untuk identifikasi yang dikonversi dari persetujuan */}
                                            {item.comment && item.comment.includes("Dikonversi dari persetujuan karena identifikasi utama ditarik") && (
                                                <div className="mt-2 flex items-center">
                                                    <span className="text-xs bg-blue-900/30 text-blue-200 px-2 py-1 rounded-full flex items-center gap-1 border border-blue-500/30">
                                            <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                                            Bekas persetujuan identifikasi yang ditarik
                                                    </span>
                                                </div>
                                            )}

                                {/* Indikator untuk identifikasi penolakan */}
                                {/* {item.disagrees_with_id && (
                                    <div className="mt-2 flex items-center">
                                        <span className="text-xs bg-red-900/30 text-red-200 px-2 py-1 rounded-full flex items-center gap-1 border border-red-500/30">
                                            <FontAwesomeIcon icon={faXmark} className="mr-1" />
                                            Menolak identifikasi lain
                                        </span>
                                    </div>
                                )} */}

                                            {/* Foto Identifikasi */}
                                            {(item.photo_path || item.photo_url) && (
                                                <div className="mt-3">
                                                    <img
                                                        src={photoUrl}
                                                        alt="Foto identifikasi"
                                                        className="max-h-36 sm:max-h-48 w-auto rounded-lg"
                                                        onError={(e) => {
                                                            console.error('Error loading image:', e);
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }
    };

    // Custom toast styles
    const toastStyles = {
        success: {
            style: {
                background: '#10B981',
                color: 'white',
            },
            iconTheme: {
                primary: 'white',
                secondary: '#10B981',
            },
        },
        error: {
            style: {
                background: '#EF4444',
                color: 'white',
            },
            iconTheme: {
                primary: 'white',
                secondary: '#EF4444',
            },
        }
    };

    // Modifikasi fungsi handleAddComment untuk memproses mention
    const handleAddComment = async (comment) => {
        if (!comment.trim()) {
            toast.error('Komentar tidak boleh kosong', toastStyles.error);
            return;
        }

        try {
            setLoading('comment', true);
            
            // Ekstrak mentions untuk notifikasi
            const mentions = [];
            const mentionRegex = /@(\w+)/g;
            let match;
            
            while ((match = mentionRegex.exec(comment)) !== null) {
                mentions.push(match[1]);
            }

            const response = await apiFetch(`/observations/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    comment: comment,
                    observation_id: id,
                    user_name: user?.uname,
                    user_id: user?.id,
                    mentions: mentions.join(',') // Kirim mentions ke server
                })
            });

            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error('Terjadi kesalahan saat menambahkan komentar');
            }

            // Gunakan ID dari response server
            const newComment = {
                id: responseData.data.id,
                comment: comment,
                user_name: user?.uname || responseData.data.user_name,
                user_id: user?.id || responseData.data.user_id,
                profile_pic: user?.profile_pic || responseData.data.profile_pic,
                created_at: responseData.data.created_at || new Date().toISOString()
            };

            // Update state comments secara lokal
            setComments(prev => [...prev, newComment]);
            
            // Reset form komentar
            setNewComment('');
            
            toast.success('Komentar berhasil ditambahkan', toastStyles.success);
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Gagal menambahkan komentar. Silakan coba lagi.', toastStyles.error);
        } finally {
            setLoading('comment', false);
        }
    };

    // Modifikasi fungsi parseComment untuk menggunakan React Router Link
    const parseComment = (text) => {
        if (!text) return '';
        
        // Pertama, escape HTML untuk mencegah XSS
        let processedText = DOMPurify.sanitize(text);
        
        // Proses @mentions menjadi links relatif - kita akan menangani base URL di handleLinkClick
        processedText = processedText.replace(/@(\w+)/g, (match, username) => {
            // Cari user_id berdasarkan username dari daftar komentar atau identifikasi
            let userId = null;
            
            // Cari di komentar
            const commentUser = comments.find(c => c.user_name === username);
            if (commentUser) {
                userId = commentUser.user_id;
            } else {
                // Cari di identifikasi
                const identUser = identifications.find(i => i.identifier_name === username);
                if (identUser) {
                    userId = identUser.user_id;
                }
            }
            
            // Jika userId ditemukan, gunakan format yang sama dengan link profil lainnya
            if (userId) {
                return `<a href="/profile/${userId}" class="text-[#1a73e8] hover:underline">@${username}</a>`;
            } else {
                // Jika tidak ditemukan, tetap buat link dengan format yang sama tapi menggunakan username
                return `<a href="/profile/username/${username}" class="text-[#1a73e8] hover:underline">@${username}</a>`;
            }
        });
        
        // Proses URLs menjadi links jika belum dalam tag <a>
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        processedText = processedText.replace(urlRegex, (url) => {
            if (url.match(/<a\s+href/i)) return url; // Skip jika sudah dalam tag <a>
            return `<a href="${url}" class="text-[#1a73e8] hover:underline" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
        
        return processedText;
    };

    // Fungsi untuk menghapus komentar
    const handleDeleteComment = async (commentId) => {
        try {
            const response = await apiFetch(`/observations/${id}/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal menghapus komentar');
            }

            // Update state lokal
            setComments(prev => prev.filter(comment => comment.id !== commentId));

            toast.success('Komentar berhasil dihapus');
            setShowUserMenu(false);

        } catch (error) {
            console.error('Error deleting comment:', error);
            toast.error(error.message || 'Gagal menghapus komentar');
            setShowUserMenu(false);
        }
    };

    // Modifikasi fungsi handleFlagComment untuk menampilkan loading
    const handleFlagComment = async () => {
        if (!flagReason.trim()) {
            toast.error('Alasan laporan harus diisi');
            return;
        }

        try {
            setLoading('flag', true);
            const response = await apiFetch(`/observations/${id}/comments/${selectedCommentId}/flag`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: flagReason })
            });

            if (!response.ok) {
                throw new Error('Gagal melaporkan komentar');
            }

            toast.success('Komentar berhasil dilaporkan');
            setShowFlagModal(false);
            setFlagReason('');
            setShowUserMenu(false);

        } catch (error) {
            console.error('Error flagging comment:', error);
            toast.error('Gagal melaporkan komentar');
        } finally {
            setLoading('flag', false);
        }
    };

    // Tambahkan useEffect baru di level komponen utama untuk menangani semua komentar
    useEffect(() => {
        if (!comments || comments.length === 0) return;
        
        // Berikan waktu untuk DOM di-render
        const timeoutId = setTimeout(() => {
            // Temukan semua elemen komentar
            const commentContainers = document.querySelectorAll('[id^="comment-"]');
            const cleanupFunctions = [];
            
            commentContainers.forEach(container => {
                const cleanupFn = addLinkEventListeners(container.id, handleLinkClick);
                cleanupFunctions.push(cleanupFn);
            });
            
            // Return cleanup function
            return () => {
                cleanupFunctions.forEach(fn => fn());
            };
        }, 100);
        
        return () => clearTimeout(timeoutId);
    }, [comments, addLinkEventListeners, handleLinkClick]);

    // Komponen komentar yang dapat diexpand
    const ExpandableComment = ({ text, id }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const commentRef = useRef(null);
        const [isOverflowing, setIsOverflowing] = useState(false);

        useEffect(() => {
            if (commentRef.current) {
                setIsOverflowing(commentRef.current.scrollHeight > commentRef.current.clientHeight && !isExpanded);
            }
        }, [text, isExpanded]);

        // Fungsi untuk memformat teks komentar panjang
        const formatLongText = (text) => {
            // Jika komentar tidak panjang, kembalikan apa adanya
            if (text.length <= 100) return text;
            
            // Jika komentar panjang dan tidak di-expand, potong teks
            if (!isExpanded) {
                // Tidak perlu memotong, karena kontrol visual sudah dibatasi dengan CSS max-height
                return text;
            }
            
            return text;
        };

        // Bersihkan teks untuk tampilan
        const cleanText = DOMPurify.sanitize(formatLongText(text));

        return (
            <div>
                <div
                    id={id}
                    ref={commentRef}
                    className={`[&_a]:text-[#1a73e8] [&_a]:hover:text-[#4285f4] [&_a]:underline text-xs sm:text-sm
                     ${!isExpanded ? 'max-h-24 overflow-hidden' : 'overflow-visible break-words whitespace-pre-wrap'}
                     ${isExpanded ? 'pt-2 pb-2' : ''} word-break-word w-full`}
                    dangerouslySetInnerHTML={{ __html: cleanText }}
                />
                {isOverflowing && (
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="text-xs text-[#1a73e8] hover:underline mt-1 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Lihat lebih banyak
                    </button>
                )}
                {isExpanded && (
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="text-xs text-[#1a73e8] hover:underline mt-1 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Sembunyikan
                    </button>
                )}
            </div>
        );
    };

    // Tambahkan fungsi helper untuk mengatur loading state
    const setLoading = (action, isLoading) => {
        setLoadingStates(prev => ({
            ...prev,
            [action]: isLoading
        }));
    };

    // Modifikasi fungsi handleAgreeWithIdentification untuk menampilkan loading
    const handleAgreeButton = async (identificationId) => {
        try {
            setLoading('agree', true);
            await handleAgreeWithIdentification(identificationId);
        } catch (error) {
            console.error('Error agreeing with identification:', error);
            toast.error('Gagal menyetujui identifikasi');
        } finally {
            setLoading('agree', false);
        }
    };

    // Modifikasi fungsi handleCancelAgreement untuk menampilkan loading
    const handleCancelButton = async (identificationId) => {
        try {
            setLoading('cancelAgreement', true);
            await handleCancelAgreement(identificationId);
        } catch (error) {
            console.error('Error canceling agreement:', error);
            toast.error('Gagal membatalkan persetujuan');
        } finally {
            setLoading('cancelAgreement', false);
        }
    };

    // Modifikasi fungsi handleWithdrawIdentification untuk menampilkan loading
    const handleWithdrawButton = async (identificationId) => {
        try {
            setLoading('withdraw', true);
            await handleWithdrawIdentification(identificationId);
        } catch (error) {
            console.error('Error withdrawing identification:', error);
            toast.error('Gagal menarik identifikasi');
        } finally {
            setLoading('withdraw', false);
        }
    };

    // Komponen untuk menampilkan komentar dalam daftar diskusi
    const CommentItem = ({ comment, canDelete, handleDeleteComment, handleUsernameClick, showUserMenu, selectedCommentId, setShowUserMenu, setSelectedCommentId, setShowFlagModal, setNewComment, dropdownRef }) => {
        const processedComment = typeof comment.comment === 'string' 
            ? parseComment(comment.comment)
            : JSON.stringify(comment.comment);

        return (
            <div className="p-3 sm:p-4 hover:bg-[#333] transition-colors border-b border-[#444] last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start space-x-2 relative flex-grow mr-2" ref={dropdownRef}>
                        <img 
                            src={comment.profile_pic || `https://ui-avatars.com/api/?name=${comment.user_name}&background=2c2c2c&color=fff`} 
                            alt={comment.user_name}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-[#444] mr-2 flex-shrink-0"
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-grow">
                            <span
                                className="font-medium cursor-pointer hover:text-[#1a73e8] text-white flex items-center gap-2"
                                onClick={(e) => handleUsernameClick(comment, e)}
                            >
                                {comment.user_name || 'Anonymous'}
                            </span>
                            
                            <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleString('id-ID', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                        
                        {showUserMenu && selectedCommentId === comment.id && (
                            <div className="absolute z-10 mt-8 w-48 bg-[#2c2c2c] rounded-lg shadow-lg py-1 border border-[#444]">
                                <Link
                                    to={`/profile/${comment.user_id}`}
                                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    Lihat Profil
                                </Link>
                                {canDelete && (
                                    <button
                                        onClick={() => {
                                            handleDeleteComment(comment.id);
                                            setShowUserMenu(false);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#333]"
                                    >
                                        Hapus Komentar
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        // Buat quote dari komentar pengguna
                                        const content = typeof comment.comment === 'string' ? comment.comment : JSON.stringify(comment.comment);
                                        const plainText = content.replace(/<[^>]*>/g, ''); // Hapus HTML tags untuk plain text
                                        const quoteText = `<blockquote class="border-l-4 border-gray-500 pl-4 py-1 my-2 bg-[#333] text-white italic">
                                            <div class="text-sm text-gray-400 mb-1">@${comment.user_name} mengatakan:</div>
                                            ${plainText.substring(0, 100)}${plainText.length > 100 ? '...' : ''}
                                        </blockquote><p>@${comment.user_name} </p>`;
                                        
                                        setNewComment(quoteText);
                                        setShowUserMenu(false);
                                        
                                        toast.info(`Anda membalas komentar dari @${comment.user_name}`, {
                                            duration: 2000,
                                            position: 'bottom-center'
                                        });
                                        
                                        // Scroll ke form komentar
                                        const commentForm = document.querySelector('.mb-6.bg-\\[\\#2c2c2c\\].rounded-lg');
                                        if (commentForm) commentForm.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                >
                                    <div className="flex items-center">
                                        <FontAwesomeIcon icon={faQuoteLeft} className="mr-2" />
                                        Balas
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        // Menggunakan user_id yang valid untuk mention
                                        const mentionText = `@${comment.user_name} `;
                                        setNewComment(prev => prev + mentionText);
                                        setShowUserMenu(false);
                                        
                                        toast.info(`Anda telah menyebutkan @${comment.user_name}`, {
                                            duration: 2000,
                                            position: 'bottom-center'
                                        });
                                        
                                        // Scroll ke form komentar
                                        const commentForm = document.querySelector('.mb-6.bg-\\[\\#2c2c2c\\].rounded-lg');
                                        if (commentForm) commentForm.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                >
                                    <div className="flex items-center">
                                        <FontAwesomeIcon icon={faAt} className="mr-2" />
                                        Mention
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedCommentId(comment.id);
                                        setShowFlagModal(true);
                                        setShowUserMenu(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                >
                                    Laporkan
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex">
                        {canDelete && (
                            <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-gray-500 hover:text-red-400"
                                title="Hapus komentar"
                            >
                                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="mt-1 text-gray-300 text-sm sm:text-base pl-8 sm:pl-10">
                    <ExpandableComment text={processedComment} id={`comment-${comment.id}`} />
                </div>
            </div>
        );
    };

    // Modifikasi renderComment untuk menggunakan komponen CommentItem
    const renderComment = (comment) => {
        if (!comment || !comment.id || comment.deleted_at) return null;

        // Perbaiki pengecekan izin dengan membandingkan user_id
        const canDelete = user && (
            String(comment.user_id) === String(user.id) || // Pemilik komentar
            user.level >= 3 || // Admin/moderator
            String(checklist?.user_id) === String(user.id) // Pemilik checklist
        );

        return (
            <CommentItem
                key={comment.id}
                comment={comment}
                canDelete={canDelete}
                handleDeleteComment={handleDeleteComment}
                handleUsernameClick={handleUsernameClick}
                showUserMenu={showUserMenu}
                selectedCommentId={selectedCommentId}
                setShowUserMenu={setShowUserMenu}
                setSelectedCommentId={setSelectedCommentId}
                setShowFlagModal={setShowFlagModal}
                setNewComment={setNewComment}
                dropdownRef={dropdownRef}
            />
        );
    };

    // Fungsi untuk merender konten gabungan (identifikasi dan komentar)
    const renderCombinedContent = () => {
        if (combinedContent.length === 0) {
            return (
                <div className="flex items-center justify-center p-4 sm:p-6 bg-[#2c2c2c] rounded-lg text-gray-400 italic">
                    <FontAwesomeIcon icon={faComments} className="mr-2" />
                    Belum ada aktivitas diskusi
                </div>
            );
        }

        return (
            <div className="space-y-1">
                {combinedContent.map((item, index) => {
                    // Render date divider
                    if (item.type === 'date_divider') {
                        try {
                            const date = new Date(item.date);
                            
                            // Validasi tanggal
                            if (isNaN(date.getTime())) {
                                console.warn('Invalid date in date divider:', item.date);
                                // Gunakan tanggal hari ini sebagai fallback
                                const today = new Date();
                                return (
                                    <div key={`date-invalid-${index}`} className="flex items-center my-2 sm:my-3">
                                        <div className="grow border-t border-[#444]"></div>
                                        <div className="mx-2 sm:mx-4 text-xs text-gray-400 px-2 py-1 rounded-full bg-[#333]/70">
                                            {today.toLocaleDateString('id-ID', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="grow border-t border-[#444]"></div>
                                    </div>
                                );
                            }
                            
                            return (
                                <div key={`date-${item.date}-${index}`} className="flex items-center my-2 sm:my-3">
                                    <div className="grow border-t border-[#444]"></div>
                                    <div className="mx-2 sm:mx-4 text-xs text-gray-400 px-2 py-1 rounded-full bg-[#333]/70">
                                        {date.toLocaleDateString('id-ID', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div className="grow border-t border-[#444]"></div>
                                </div>
                            );
        } catch (error) {
                            console.error('Error rendering date divider:', error);
                            return null;
                        }
                    }
                    
                    // Render identification
                    if (item.type === 'identification') {
                        // Buat array dengan satu identifikasi untuk diteruskan ke renderIdentifications
                        // yang dimodifikasi untuk menerima array identifikasi spesifik
                        const singleIdent = [item];
                        return (
                            <div key={`ident-${item.id}-${index}`} className="mb-2">
                                {renderSingleIdentification(item, index)}
                            </div>
                        );
                    }
                    
                    // Render comment
                    if (item.type === 'comment') {
                        return (
                            <div key={`comment-${item.id}-${index}`} className="mb-2 bg-[#2c2c2c] rounded-lg">
                                {renderComment(item)}
                            </div>
                        );
                    }
                    
                    return null;
                })}
            </div>
        );
    };

    return (
        <div className="bg-[#1e1e1e] rounded-lg shadow-lg p-4 sm:p-6 text-white">
            <div className="border-b border-[#444] mb-4">
                <div className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-2 px-2 sm:px-4 flex items-center space-x-2 whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-b-2 border-[#1a73e8] text-[#1a73e8]'
                                    : 'text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            <FontAwesomeIcon icon={tab.icon} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4">
                {/* Identifikasi Saat Ini - SELALU DITAMPILKAN terlepas dari activeTab */}
                {identifications.length > 0 && (
                    <div className="mb-6 p-3 sm:p-5 bg-[#2c2c2c] rounded-lg border border-[#444]">
                        <h3 className="font-medium text-base sm:text-lg text-white mb-2">Identifikasi Saat Ini</h3>
                        {(() => {
                            const currentId = getCurrentIdentification();
                            if (!currentId) return (
                                <div className="flex items-center justify-center p-4 bg-[#333] rounded-lg text-gray-300 italic">
                                    <FontAwesomeIcon icon={faSearch} className="mr-2" />
                                    Belum ada identifikasi yang aktif
                                </div>
                            );
                            
                            return (
                                <div className="bg-[#333] rounded-lg p-4 border-l-4 border-[#1a73e8]">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                                        <div>
                                            <div className="text-base sm:text-xl font-medium text-white">
                                                {getTaxaDisplayWithCommonName(currentId)}
                                            </div>
                                            <div className="text-xs sm:text-sm italic text-gray-400 mt-1">
                                                {currentId.family || currentId.genus || currentId.species || getTaxonomyLevel(currentId)}
                                            </div>
                                            <p className="text-xs sm:text-sm text-gray-400 mt-2 flex flex-wrap items-center gap-2">
                                                <FontAwesomeIcon icon={faCheckCircle} className="text-[#1a73e8]" />
                                                {currentId.isSystemIdentification ? (
                                                    <span>Identifikasi sistem berdasarkan konsensus</span>
                                                ) : (
                                                    <>
                                                        <span>Diidentifikasi oleh </span>
                                                        <Link to={`/profile/${currentId.user_id}`} className="text-[#1a73e8] hover:underline">
                                                            {currentId.identifier_name}
                                                        </Link>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        
                                        {!currentId.isSystemIdentification && user && 
                                        String(currentId.user_id) === String(user.id) && (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleWithdrawButton(currentId.id)}
                                                    disabled={loadingStates.withdraw}
                                                    className="px-3 py-1 rounded bg-yellow-900/70 text-yellow-200 hover:bg-yellow-800 ring-1 ring-yellow-600/40 text-xs sm:text-sm flex items-center"
                                                    title="Menarik identifikasi ini akan menghapus semua persetujuan terkait"
                                                >
                                                    {loadingStates.withdraw ? (
                                                        <>
                                                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                                            <span>Proses...</span>
                                                        </>
                                                    ) : (
                                                        <span>Tarik Identifikasi</span>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        
                                        {!currentId.isSystemIdentification && user &&
                                        String(currentId.user_id) !== String(user.id) &&
                                        !currentId.user_agreed && (
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => handleAgreeButton(currentId.id)}
                                                    disabled={loadingStates.agree}
                                                    className="px-3 py-1 rounded bg-green-900 text-green-200 hover:bg-green-800 ring-1 ring-green-600/40 flex items-center text-xs sm:text-sm"
                                                >
                                                    {loadingStates.agree ? (
                                                        <>
                                                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                                            <span>Proses...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                            <span>Setuju</span>
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleDisagreeButton(currentId.id)}
                                                    className="px-3 py-1 rounded bg-red-900 text-red-200 hover:bg-red-800 ring-1 ring-red-600/40 text-xs sm:text-sm flex items-center"
                                                >
                                                    <FontAwesomeIcon icon={faXmark} className="mr-1" />
                                                    Tolak
                                                </button>
                                            </div>
                                        )}
                                        
                                        {!currentId.isSystemIdentification && user &&
                                        String(currentId.user_id) !== String(user.id) &&
                                        currentId.user_agreed && (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleCancelButton(currentId.id)}
                                                    disabled={loadingStates.cancelAgreement}
                                                    className="px-3 py-1 rounded bg-blue-900 text-blue-200 hover:bg-blue-800 ring-1 ring-blue-600/40 flex items-center text-xs sm:text-sm"
                                                >
                                                    {loadingStates.cancelAgreement ? (
                                                        <>
                                                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                                            <span>Proses...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FontAwesomeIcon icon={faXmark} className="mr-1" />
                                                            <span>Batal Setuju</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {checklist?.iucn_status && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-xs sm:text-sm font-medium text-white">Status IUCN: </span>
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                checklist.iucn_status.toLowerCase().includes('endangered')
                                                    ? 'bg-red-900 text-red-200 ring-1 ring-red-600/40'
                                                    : 'bg-green-900 text-green-200 ring-1 ring-green-600/40'
                                            }`}>
                                                {checklist.iucn_status}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Timeline Aktivitas (Gabungan Identifikasi dan Komentar) */}
                <div className="mb-6">
                    <h5 className="font-medium text-base sm:text-lg text-white mb-3">Aktivitas</h5>
                    <div className="space-y-1">
                        {renderCombinedContent()}
                            </div>
                </div>

                {/* Form Input - Berganti sesuai tab aktif */}
                {activeTab === 'identification' && (
                    <div>
                        {/* Form Menambahkan Identifikasi / Add Identification Form */}
                        <div className="mt-6 bg-[#2c2c2c] rounded-lg border border-[#444] p-3 sm:p-5">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-medium text-base sm:text-lg text-white">Tambahkan Identifikasi</h3>
                                <button 
                                    onClick={() => setActiveTab('comments')}
                                    className="text-xs sm:text-sm text-[#1a73e8] hover:underline flex items-center"
                                >
                                    <FontAwesomeIcon icon={faComments} className="mr-1" />
                                    Tambah Komentar
                                </button>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-400 mb-4">
                                Bantu pengamat memastikan identifikasinya dengan memberi komentar, foto pembanding atau usul nama.
                            </div>
                            
                        <div className="mb-4">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Cari takson..."
                                className="w-full p-2 sm:p-3 border border-[#444] rounded-lg bg-[#333] text-white placeholder-gray-500 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none text-sm"
                            />
                            {searchQuery.length >= 3 && searchResults.length > 0 && (
                                <div
                                    ref={suggestionsRef}
                                    className="relative mt-2 border border-[#444] rounded-lg max-h-40 sm:max-h-60 overflow-y-auto bg-[#333] shadow-lg"
                                >
                                    <button
                                        onClick={() => {
                                            setShowSuggestions(false);
                                            setSearchQuery('');
                                        }}
                                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-300 z-10"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                                    </button>
                                    {searchResults.map((taxon) => (
                                        <div
                                            key={taxon.id}
                                            onClick={() => handleTaxonSelect(taxon)}
                                            className="p-2 sm:p-3 hover:bg-[#444] cursor-pointer border-b border-[#444] last:border-b-0"
                                        >
                                            <div className={`text-white text-sm ${taxon.rank === 'species' ? 'italic' : ''}`}>
                                                {taxon.scientific_name}
                                                {taxon.common_name && (
                                                    <span className="ml-1 text-gray-300">| {taxon.common_name}</span>
                                                )}
                                                <span className="text-gray-400 text-xs ml-2 bg-[#444] px-2 py-0.5 rounded">
                                                    {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}
                                                </span>
                                            </div>
                                            {taxon.family_context && (
                                                <div className="text-xs sm:text-sm text-gray-400 mt-1">
                                                    {taxon.family_context}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedTaxon && (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setIsSubmitting(true);
                                try {
                                    await handleIdentificationSubmit(e, identificationPhoto);
                                    setIdentificationPhoto(null);
                                    setPhotoPreview(null);
                                    setSelectedTaxon(null);
                                    setSearchQuery('');
                                    setIdentificationForm(prev => ({
                                        ...prev,
                                        comment: '',
                                        taxon_id: null,
                                        identification_level: null
                                    }));
                                } catch (error) {
                                    console.error('Error submitting identification:', error);
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }} className="space-y-4">
                                <div className="p-3 sm:p-4 border border-[#1a73e8]/30 rounded-lg bg-[#1a73e8]/10">
                                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                                        Takson Terpilih
                                    </label>
                                    <div className="p-2 sm:p-3 border border-[#444] rounded-lg bg-[#333]">
                                        <div className="text-sm sm:text-lg font-medium text-white">
                                            {getTaxaDisplayWithCommonName(selectedTaxon)}
                                        </div>
                                        <div className="text-xs sm:text-sm italic text-gray-400 mt-1">
                                            {selectedTaxon.family || selectedTaxon.genus || selectedTaxon.species || getTaxonomyLevel(selectedTaxon)}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                                        Foto Pendukung (Opsional)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="mt-1 block w-full text-sm text-gray-400
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-xs sm:file:text-sm file:font-semibold
                                        file:bg-[#1a73e8] file:text-white
                                        hover:file:bg-[#0d47a1]"
                                    />
                                    {photoPreview && (
                                        <div className="mt-2">
                                            <img
                                                src={photoPreview}
                                                alt="Preview"
                                                className="h-20 sm:h-32 w-auto object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIdentificationPhoto(null);
                                                    setPhotoPreview(null);
                                                }}
                                                className="mt-1 text-xs sm:text-sm text-red-400 hover:text-red-300"
                                            >
                                                Hapus foto
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                                        Komentar (Opsional)
                                    </label>
                                    <ReactQuill
                                        value={identificationForm.comment}
                                        onChange={(value) => setIdentificationForm(prev => ({
                                            ...prev,
                                            comment: value
                                        }))}
                                        className="mt-1 bg-[#333] text-white border border-[#444] rounded-lg text-sm"
                                        modules={quillModules}
                                        formats={[
                                            'bold', 'italic', 'underline',
                                            'list', 'bullet',
                                            'link'
                                        ]}
                                        placeholder="Tulis komentar..."
                                        onBlur={(range, source, editor) => {
                                            const element = editor.container.firstChild;
                                            element.addEventListener('click', handleLinkClick);
                                        }}
                                        onUnmount={(range, source, editor) => {
                                            const element = editor.container.firstChild;
                                            element.removeEventListener('click', handleLinkClick);
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-2 sm:py-3 px-4 rounded-lg ${
                                        isSubmitting
                                            ? 'bg-[#1a73e8]/60 cursor-not-allowed'
                                            : 'bg-[#1a73e8] hover:bg-[#0d47a1] transition-colors'
                                    } text-white font-medium text-sm`}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Mengirim...
                                        </span>
                                    ) : (
                                        'Kirim Identifikasi'
                                    )}
                                </button>
                            </form>
                        )}

                        {!selectedTaxon && (
                            <div className="flex items-center justify-center py-6 sm:py-8 text-gray-400 italic text-sm">
                                Cari takson untuk menambahkan identifikasi
                            </div>
                        )}
                        </div>
                    </div>
                )}

                {activeTab === 'comments' && (
                    <div>
                        {/* Form Tambah Komentar dengan fitur tag identifikasi */}
                        <div className="mb-6 bg-[#2c2c2c] rounded-lg border border-[#444] p-3 sm:p-5">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium text-base sm:text-lg text-white">Tambahkan Komentar</h4>
                                <button 
                                    onClick={() => setActiveTab('identification')}
                                    className="text-xs sm:text-sm text-[#1a73e8] hover:underline flex items-center"
                                >
                                    <FontAwesomeIcon icon={faSearch} className="mr-1" />
                                    Tambah Identifikasi
                                </button>
                            </div>
                            <div className="mb-3">
                                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                                    Referensi Identifikasi (Opsional)
                                </label>
                                <select 
                                    className="w-full p-2 border border-[#444] rounded mb-2 bg-[#2c2c2c] text-white text-sm"
                                    onChange={(e) => {
                                        const selectedId = e.target.value;
                                        if (selectedId) {
                                            const ident = identifications.find(i => i.id === parseInt(selectedId));
                                            if (ident) {
                                                const quoteText = `<blockquote class="border-l-4 border-[#1a73e8] pl-4 py-1 my-2 bg-[#1a73e8]/10 text-white italic">
                                                    <div class="text-sm font-medium mb-1">Membahas identifikasi:</div>
                                                    <div class="text-white font-medium">${getTaxaDisplayWithCommonName(ident)}</div>
                                                    <div class="text-xs text-gray-400 mt-1">Diidentifikasi oleh ${ident.identifier_name} pada ${new Date(ident.created_at).toLocaleDateString('id-ID')}</div>
                                                </blockquote><p></p>`;
                                                
                                                setNewComment(prev => quoteText + prev);
                                            }
                                        }
                                    }}
                                >
                                    <option value="">-- Pilih Identifikasi untuk Direferensikan --</option>
                                    {identifications
                                        .filter(ident => !ident.agrees_with_id && ident.is_withdrawn !== 1)
                                        .map(ident => (
                                            <option key={ident.id} value={ident.id}>
                                                {getTaxaDisplayWithCommonName(ident)} oleh {ident.identifier_name}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                                <button
                                    className="px-3 py-1 text-xs sm:text-sm bg-[#333] hover:bg-[#444] rounded text-gray-300 flex items-center"
                                    onClick={() => {
                                        // Tambahkan text formatting untuk mention dengan pesan bantuan
                                        if (user) {
                                            setNewComment(prev => prev + '@');
                                            toast.info('Ketik username pengguna setelah @ untuk mention', {
                                                duration: 3000,
                                                position: 'bottom-center',
                                                icon: '💡'
                                            });
                                        } else {
                                            toast.error('Silakan login untuk menggunakan fitur mention', toastStyles.error);
                                        }
                                    }}
                                >
                                    <FontAwesomeIcon icon={faAt} className="mr-1" />
                                    Mention
                                </button>
                                
                                <button
                                    className="px-3 py-1 text-xs sm:text-sm bg-[#333] hover:bg-[#444] rounded text-gray-300 flex items-center"
                                    onClick={() => {
                                        // Tambahkan text formatting untuk quote
                                        const quoteText = `<blockquote class="border-l-4 border-gray-500 pl-4 py-1 my-2 bg-[#333] text-white italic">
                                            Teks kutipan di sini
                                        </blockquote><p></p>`;
                                        setNewComment(prev => prev + quoteText);
                                        
                                        toast.info('Ganti "Teks kutipan di sini" dengan kutipan yang ingin ditambahkan', {
                                            duration: 3000,
                                            position: 'bottom-center',
                                            icon: '💡'
                                        });
                                    }}
                                >
                                    <FontAwesomeIcon icon={faQuoteLeft} className="mr-1" />
                                    Quote
                                </button>
                            </div>
                            
                            <ReactQuill
                                value={newComment}
                                onChange={setNewComment}
                                placeholder="Tulis komentar atau pertanyaan..."
                                className="bg-[#333] text-white border border-[#444] rounded-lg text-sm"
                                modules={quillModules}
                                formats={[
                                    'bold', 'italic', 'underline',
                                    'list', 'bullet',
                                    'link'
                                ]}
                            />
                            <div className="flex flex-col sm:flex-row justify-between items-center mt-3 gap-2">
                                <div className="text-xs text-gray-400 w-full sm:w-auto text-center sm:text-left">
                                    <span>Untuk mention pengguna, gunakan @username</span>
                                </div>
                                <button
                                    onClick={() => handleAddComment(newComment)}
                                    disabled={!newComment.trim() || loadingStates.comment}
                                    className="w-full sm:w-auto bg-[#1a73e8] text-white py-2 px-4 rounded-lg hover:bg-[#0d47a1] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    {loadingStates.comment ? (
                                        <span className="flex items-center justify-center">
                                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                            <span>Mengirim...</span>
                                        </span>
                                    ) : (
                                        <span>Kirim Komentar</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal untuk menolak identifikasi */}
            {showDisagreeModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#1e1e1e] rounded-lg p-4 sm:p-6 w-full max-w-[350px] sm:max-w-md border border-[#444]">
            <h3 className="text-base sm:text-lg font-semibold mb-4 text-white">Tolak Identifikasi</h3>

            <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Pilih Takson
                </label>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Cari takson..."
                    className="w-full p-2 border border-[#444] rounded mb-2 bg-[#2c2c2c] text-white text-sm"
                />

                {searchResults.length > 0 && (
                    <div
                        ref={modalSuggestionsRef}
                        className="mt-2 border border-[#444] rounded max-h-40 overflow-y-auto bg-[#2c2c2c]"
                    >
                        <button
                            onClick={() => {
                                setShowSuggestions(false);
                                setSearchQuery('');
                            }}
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-300 z-10"
                        >
                            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                        </button>
                        {searchResults.map((taxon) => (
                            <div
                                key={taxon.id}
                                onClick={() => handleTaxonSelect(taxon)}
                                className="p-2 hover:bg-[#333] cursor-pointer text-sm"
                            >
                                <div className={`text-white ${taxon.rank === 'species' ? 'italic' : ''}`}>
                                    {taxon.scientific_name}
                                    {taxon.common_name && ` | ${taxon.common_name}`}
                                    <span className="text-gray-400 text-xs"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
                                </div>
                                {taxon.family_context && (
                                    <div className="text-xs text-gray-400">
                                        {taxon.family_context}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {selectedTaxon && (
                    <div className="mt-2 p-2 bg-[#333] rounded border border-[#444] text-sm">
                        <div className={`text-white ${selectedTaxon.rank === 'species' ? 'italic' : ''}`}>
                            {selectedTaxon.scientific_name}
                            {selectedTaxon.common_name && ` | ${selectedTaxon.common_name}`}
                            <span className="text-gray-400 text-xs"> – {selectedTaxon.rank.charAt(0).toUpperCase() + selectedTaxon.rank.slice(1)}</span>
                        </div>
                        {selectedTaxon.family_context && (
                            <div className="text-xs text-gray-400">
                                {selectedTaxon.family_context}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Alasan Penolakan
                </label>
                <textarea
                    value={disagreeComment}
                    onChange={(e) => setDisagreeComment(e.target.value)}
                    placeholder="Berikan alasan penolakan..."
                    className="w-full p-2 border rounded border-[#444] bg-[#2c2c2c] text-white text-sm"
                    rows={4}
                />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
                <button
                    onClick={() => {
                        setShowDisagreeModal(false);
                        setDisagreeComment('');
                        setSearchQuery('');
                        setSelectedTaxon(null);
                    }}
                    className="px-4 py-2 bg-[#2c2c2c] text-gray-300 rounded hover:bg-[#333] border border-[#444] text-sm mt-2 sm:mt-0"
                >
                    Batal
                </button>
                <button
                    onClick={() => {
                        try {
                            if (!selectedTaxon) {
                                toast.error('Pilih takson terlebih dahulu');
                                return;
                            }
                            if (!disagreeComment.trim()) {
                                toast.error('Berikan alasan penolakan');
                                return;
                            }
                            
                            setLoading('disagree', true);
                            
                            // Gunakan handleDisagreeSubmit bukan handleDisagreeWithIdentification
                            handleDisagreeSubmit(selectedIdentificationId)
                                .finally(() => {
                                    setLoading('disagree', false);
                                });
                        } catch (error) {
                            console.error('Error saat mengirim ketidaksetujuan:', error);
                            toast.error('Terjadi kesalahan saat mengirim ketidaksetujuan');
                            setLoading('disagree', false);
                        }
                    }}
                    disabled={loadingStates.disagree}
                    className="px-4 py-2 bg-red-900 text-red-200 rounded hover:bg-red-800 ring-1 ring-red-600/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    {loadingStates.disagree ? (
                        <span className="flex items-center justify-center">
                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                            <span>Mengirim...</span>
                        </span>
                    ) : (
                        <span>Kirim</span>
                    )}
                </button>
            </div>
        </div>
    </div>
)}

            {/* Modal Flag */}
            {showFlagModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e1e1e] rounded-lg p-4 sm:p-6 w-full max-w-[350px] sm:max-w-md border border-[#444]">
                        <h3 className="text-base sm:text-lg font-semibold mb-4 text-white">Laporkan Komentar</h3>
                        <textarea
                            value={flagReason}
                            onChange={(e) => setFlagReason(e.target.value)}
                            placeholder="Berikan alasan pelaporan..."
                            className="w-full p-2 border rounded mb-4 border-[#444] bg-[#2c2c2c] text-white text-sm"
                            rows="4"
                        />
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
                            <button
                                onClick={() => {
                                    setShowFlagModal(false);
                                    setFlagReason('');
                                }}
                                className="px-4 py-2 text-gray-300 hover:text-gray-200 bg-[#2c2c2c] rounded border border-[#444] text-sm mt-2 sm:mt-0"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleFlagComment}
                                disabled={loadingStates.flag}
                                className="px-4 py-2 bg-red-900 text-red-200 rounded hover:bg-red-800 ring-1 ring-red-600/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {loadingStates.flag ? (
                                    <span className="flex items-center justify-center">
                                        <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                        <span>Proses...</span>
                                    </span>
                                ) : (
                                    'Laporkan'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TabPanel;
