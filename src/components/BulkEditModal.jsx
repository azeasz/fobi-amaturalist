import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDna,
    faTree,
    faNoteSticky,
    faMusic,
    faXmark,
    faInfoCircle,
    faLocationDot,
    faCalendar
} from '@fortawesome/free-solid-svg-icons';
import Modal from './Observations/LPModal';
import LocationPicker from './Observations/LocationPicker';
import { toast } from 'react-hot-toast';

function BulkEditModal({ isOpen, onClose, onSave, selectedItems }) {
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [tempFormData, setTempFormData] = useState({
        scientific_name: '',
        habitat: '',
        description: '',
        type_sound: '',
        source: 'live',
        status: 'pristine',
        latitude: '',
        longitude: '',
        locationName: '',
        date: ''
    });

    // Tambahkan state baru
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const suggestionsRef = useRef(null);

    // Tambahkan state yang diperlukan
    const [hasMore, setHasMore] = useState(true);
    const [errors, setErrors] = useState({});
    const [showTooltip, setShowTooltip] = useState('');

    // Tambahkan useRef untuk menyimpan timeout dan controller
    const timeoutRef = useRef(null);
    const abortControllerRef = useRef(null);

    const tooltipContent = {
        scientific_name: "Nama ilmiah spesies (contoh: Gallus gallus). Wajib diisi dengan benar untuk identifikasi spesies.",
        habitat: "Lingkungan tempat spesies ditemukan (contoh: Hutan Primer, Kebun).",
        description: "Catatan tambahan tentang pengamatan.",
        type_sound: "Jenis suara yang direkam (khusus untuk file audio)."
    };

    // Cek apakah ada file audio yang dipilih
    const hasAudioFiles = selectedItems.some(item => item.type === 'audio');
    const hasImageFiles = selectedItems.some(item => item.type === 'image');

    // Animasi untuk modal
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Modifikasi fetchSuggestions untuk menambahkan debugging yang berguna
    const fetchSuggestions = async (searchTerm, pageNum = 1) => {
        if (searchTerm.length > 2) {
            try {
                console.log(`Starting fetchSuggestions for "${searchTerm}", page ${pageNum}`);
                
                // Hanya set loading state untuk halaman selanjutnya, untuk halaman pertama dilakukan di handleChange
                if (pageNum > 1) {
                    setIsLoadingMore(true);
                }

                // Batalkan request sebelumnya jika ada
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }

                // Buat controller baru
                abortControllerRef.current = new AbortController();
                
                // Buat URL dengan parameter yang eksplisit
                const apiUrl = `${import.meta.env.VITE_API_URL}/taxonomy/search`;
                const fullUrl = `${apiUrl}?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&per_page=20`;
                
                console.log(`API Request URL: ${fullUrl}`);

                // Log token untuk debugging (tanpa menampilkan token lengkap)
                const token = localStorage.getItem('jwt_token');
                if (!token) {
                    console.error('No JWT token found in localStorage');
                    throw new Error('Token autentikasi tidak ditemukan. Silakan login kembali.');
                }
                console.log(`Auth token available: ${token ? 'Yes, length: ' + token.length : 'No'}`);

                const requestOptions = {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest' // Helps with some CORS issues
                    },
                    signal: abortControllerRef.current.signal,
                    credentials: 'same-origin' // Pastikan credentials dikirim
                };

                const response = await fetch(fullUrl, requestOptions);

                console.log(`Response status: ${response.status} ${response.statusText}`);

                // Cek common error code
                if (response.status === 401) {
                    throw new Error('Token autentikasi tidak valid atau kedaluwarsa. Silakan login kembali.');
                } else if (response.status === 403) {
                    throw new Error('Anda tidak memiliki izin untuk mengakses data ini.');
                } else if (response.status === 429) {
                    throw new Error('Terlalu banyak permintaan. Silakan coba lagi nanti.');
                } else if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.error('Unexpected content type:', contentType);
                    throw new Error('Server mengembalikan respons yang tidak valid.');
                }

                const data = await response.json();
                console.log('API Response:', data);
                
                // Tambahkan pengecekan struktur data
                if (!data.success) {
                    console.error('API returned success=false:', data.message || 'No error message provided');
                    setSuggestions([]);
                    setShowSuggestions(true); // Tetap tampilkan dropdown dengan status error
                    setHasMore(false);
                    return;
                }
                
                if (!Array.isArray(data.data)) {
                    console.error('Expected data.data to be an array, got:', typeof data.data);
                    setSuggestions([]);
                    setShowSuggestions(true);
                    setHasMore(false);
                    return;
                }

                console.log(`Received ${data.data.length} items from API`);
                
                // Log struktur item pertama untuk debugging
                if (data.data.length > 0) {
                    console.log('First item structure:', JSON.stringify(data.data[0], null, 2));
                }

                // Pastikan pagination info ada dan lengkap
                const pagination = data.pagination || {};
                if (!pagination.total_pages) {
                    console.warn('Pagination data incomplete:', pagination);
                }
                
                const totalPages = pagination.total_pages || 1;
                const currentPage = pagination.current_page || pageNum;
                const totalItems = pagination.total || data.data.length;
                const hasMorePages = pagination.has_more || currentPage < totalPages;
                
                console.log('Pagination info:', { 
                    totalPages, 
                    currentPage, 
                    totalItems,
                    hasMore: hasMorePages
                });

                if (pageNum === 1) {
                    // Halaman pertama - ganti semua suggestion, ambil semua data
                    console.log('Setting initial suggestions:', data.data.length);
                    setSuggestions(data.data);
                    setShowSuggestions(true);
                    setHasMore(hasMorePages);
                    setPage(currentPage);
                } else {
                    // Halaman berikutnya - tambahkan item yang unik
                    const newSuggestions = data.data;
                    console.log('Received new suggestions:', newSuggestions.length);
                    
                    // Gunakan Map untuk melacak ID yang sudah ada (lebih efisien daripada Set untuk objek kompleks)
                    const existingIdsMap = new Map();
                    suggestions.forEach(item => {
                        const idKey = item.full_data?.id || `${item.rank}-${item.scientific_name}`;
                        existingIdsMap.set(idKey, true);
                    });
                    
                    // Filter saran baru untuk memastikan tidak ada duplikasi
                    const uniqueNewSuggestions = newSuggestions.filter(item => {
                        const idKey = item.full_data?.id || `${item.rank}-${item.scientific_name}`;
                        return !existingIdsMap.has(idKey);
                    });
                    
                    console.log('Unique new suggestions:', uniqueNewSuggestions.length);
                    
                    if (uniqueNewSuggestions.length > 0) {
                        setSuggestions(prev => [...prev, ...uniqueNewSuggestions]);
                        setHasMore(hasMorePages);
                        setPage(currentPage);
                    } else {
                        // Jika tidak ada item baru, tandai bahwa tidak ada lagi yang bisa dimuat
                        console.log('No new unique suggestions found');
                        setHasMore(false);
                    }
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching suggestions:', error);
                    setSuggestions([]);
                    setShowSuggestions(true); // Tetap tampilkan dropdown dengan state error
                    setHasMore(false);
                    
                    // Tampilkan toast dengan pesan error yang informatif
                    if (error.message.includes('token')) {
                        // Handle token/auth error 
                        toast?.error && toast.error('Kesalahan autentikasi. Coba login kembali.', {
                            position: "top-right",
                            autoClose: 3000,
                            theme: "colored"
                        });
                    } else {
                        // Handle general API error
                        toast?.error && toast.error(`Gagal mengambil data: ${error.message}`, {
                            position: "top-right",
                            autoClose: 3000,
                            theme: "colored"
                        });
                    }
                } else {
                    console.log('Request aborted');
                }
            } finally {
                if (pageNum > 1) {
                    setIsLoadingMore(false);
                }
                console.log('Finished fetchSuggestions');
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
            setHasMore(false);
            console.log('Search term too short');
        }
    };

    // Modifikasi loadMoreSuggestions untuk debugging dan perbaikan
    const loadMoreSuggestions = async () => {
        if (!hasMore) {
            console.log('No more suggestions to load. hasMore:', hasMore);
            return;
        }
        
        if (isLoadingMore) {
            console.log('Already loading suggestions.');
            return;
        }
        
        console.log('Starting to load more suggestions');
        
        try {
            setIsLoadingMore(true);
            const nextPage = page + 1;
            const value = tempFormData.scientific_name;
            
            // Buat URL dengan parameter yang eksplisit
            const apiUrl = `${import.meta.env.VITE_API_URL}/taxonomy/search`;
            const fullUrl = `${apiUrl}?q=${encodeURIComponent(value)}&page=${nextPage}&per_page=20`;
            
            console.log(`API Request URL for loadMore: ${fullUrl}`);
            console.log('Loading more suggestions, page:', nextPage, 'for term:', value);
            
            // Buat controller baru
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();
            
            const response = await fetch(
                fullUrl,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    signal: abortControllerRef.current.signal
                }
            );

            console.log(`Response status for loadMore: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response for loadMore page', nextPage, ':', data);
            
            // Tambahkan pengecekan struktur data
            if (!data.success) {
                console.error('API returned success=false in loadMore:', data.message || 'No error message provided');
                setHasMore(false);
                return;
            }
            
            if (!Array.isArray(data.data)) {
                console.error('Expected data.data to be an array in loadMore, got:', typeof data.data);
                setHasMore(false);
                return;
            }

            console.log(`Received ${data.data.length} items from API in loadMore`);

            if (data.success) {
                // Ambil semua data dari response
                const newSuggestions = data.data;
                console.log('Received new suggestions:', newSuggestions.length);
                
                // Gunakan Map untuk melacak ID yang sudah ada
                const existingIdsMap = new Map();
                suggestions.forEach(item => {
                    const idKey = item.full_data?.id || `${item.rank}-${item.scientific_name}`;
                    existingIdsMap.set(idKey, true);
                });
                
                // Filter saran baru untuk memastikan tidak ada duplikasi
                const uniqueNewSuggestions = newSuggestions.filter(item => {
                    const idKey = item.full_data?.id || `${item.rank}-${item.scientific_name}`;
                    return !existingIdsMap.has(idKey);
                });
                
                console.log('Unique new suggestions:', uniqueNewSuggestions.length);
                
                if (uniqueNewSuggestions.length > 0) {
                    setSuggestions(prev => [...prev, ...uniqueNewSuggestions]);
                    setPage(nextPage);
                    
                    // Pastikan pagination info ada dan diproses dengan benar
                    const pagination = data.pagination || {};
                    const totalPages = pagination.total_pages || nextPage;
                    const currentPage = pagination.current_page || nextPage;
                    const totalItems = pagination.total || data.data.length;
                    
                    console.log('Pagination info in loadMore:', { 
                        totalPages, 
                        currentPage, 
                        totalItems,
                        hasMore: totalPages > currentPage
                    });
                    
                    setHasMore(totalPages > nextPage);
                } else {
                    // Jika tidak ada item baru yang ditemukan
                    console.log('No new unique suggestions found in loadMore');
                    setHasMore(false);
                }
            } else {
                // Jika API mengembalikan status error
                console.log('API returned error status in loadMore');
                setHasMore(false);
                if (data.message) {
                    console.warn('API warning in loadMore:', data.message);
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading more suggestions:', error);
                setHasMore(false);
            } else {
                console.log('Request aborted in loadMore');
            }
        } finally {
            setIsLoadingMore(false);
            console.log('Finished loading more suggestions');
        }
    };

    // Modifikasi handleChange agar menangani loading state dengan benar
    const handleChange = async (e) => {
        const { name, value } = e.target;

        if (name === 'scientific_name') {
            // Selalu update nilai input terlebih dahulu
            setTempFormData(prev => ({
                ...prev,
                [name]: value,
                displayName: value
            }));

            // Jika input kosong, reset semua field
            if (!value) {
                setTempFormData(prev => ({
                    ...prev,
                    scientific_name: '',
                    species: '',
                    kingdom: '',
                    phylum: '',
                    class: '',
                    order: '',
                    family: '',
                    genus: '',
                    taxon_rank: '',
                    displayName: ''
                }));
                setSuggestions([]);
                setShowSuggestions(false);
                setHasMore(false);
                return;
            }

            // Debounce fetch suggestions
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                if (value.length > 2) {
                    setPage(1);
                    setIsLoadingMore(true);
                    setSuggestions([]); // Reset suggestions while loading
                    setShowSuggestions(true); // Show loading indicator
                    
                    // Batalkan request sebelumnya jika ada
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                    }
                    
                    console.log('Searching for:', value);
                    fetchSuggestions(value, 1)
                        .finally(() => {
                            console.log('Search complete');
                            setIsLoadingMore(false);
                        });
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setHasMore(false);
                }
            }, 300); // Tunggu 300ms sebelum melakukan fetch
        } else {
            setTempFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    // Modifikasi handleSuggestionsScroll agar berhasil mendeteksi ketika scroll mendekati bawah
    const handleSuggestionsScroll = (e) => {
        const element = e.target;
        // Deteksi ketika scroll hampir di dasar (dengan margin 30px)
        const scrollPosition = element.scrollHeight - element.scrollTop - element.clientHeight;
        console.log('Scroll position:', scrollPosition);
        
        if (scrollPosition < 30 && !isLoadingMore && hasMore) {
            console.log('Triggering loadMoreSuggestions from scroll');
            loadMoreSuggestions();
        }
    };

    const renderTaxonSuggestions = (searchResults) => {
        return searchResults.map((taxon, index) => {
            // Gunakan ID unik dari taxon jika tersedia, atau buat ID gabungan yang unik
            const uniqueKey = taxon.full_data?.id || `${taxon.rank}-${taxon.scientific_name}-${index}`;
            
            // Buat family context dengan format yang lebih baik
            let familyContext = '';
            if (taxon.full_data) {
                const ranks = [];
                
                // Tambahkan family jika ada
                if (taxon.full_data.family) {
                    ranks.push(`Family: ${taxon.full_data.family}${taxon.full_data.cname_family ? ` (${taxon.full_data.cname_family})` : ''}`);
                }
                
                // Tambahkan order jika ada
                if (taxon.full_data.order) {
                    ranks.push(`Order: ${taxon.full_data.order}${taxon.full_data.cname_order ? ` (${taxon.full_data.cname_order})` : ''}`);
                }
                
                // Tambahkan class jika ada
                if (taxon.full_data.class) {
                    ranks.push(`Class: ${taxon.full_data.class}${taxon.full_data.cname_class ? ` (${taxon.full_data.cname_class})` : ''}`);
                }
                
                // Tambahkan phylum jika ada
                if (taxon.full_data.phylum) {
                    ranks.push(`Phylum: ${taxon.full_data.phylum}`);
                }
                
                // Tambahkan kingdom jika ada
                if (taxon.full_data.kingdom) {
                    ranks.push(`Kingdom: ${taxon.full_data.kingdom}`);
                }
                
                familyContext = ranks.join(' | ');
            }
            
            return (
                <div
                    key={uniqueKey}
                    onClick={() => handleSuggestionClick(taxon)}
                    className="p-2 hover:bg-[#3c3c3c] cursor-pointer border-b border-[#444]"
                >
                    <div className={`${taxon.rank === 'species' ? 'italic' : ''} text-[#e0e0e0] font-medium`}>
                        {taxon.scientific_name}
                        {taxon.common_name && <span className="not-italic"> | {taxon.common_name}</span>}
                        <span className="text-gray-400 text-sm not-italic"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
                    </div>
                    
                    {familyContext && (
                        <div className="text-sm text-gray-400 ml-2 mt-1">
                            {familyContext}
                        </div>
                    )}
                </div>
            );
        });
    };

    // Modifikasi handleSuggestionClick
    const handleSuggestionClick = (suggestion) => {
        // Tambahkan informasi hierarki yang lebih lengkap
        setTempFormData(prev => ({
            ...prev, // Pertahankan semua data sebelumnya
            taxon_id: suggestion.full_data.id,
            species: suggestion.full_data.species || '',
            subspecies: suggestion.full_data.subspecies || '',
            variety: suggestion.full_data.variety || '',
            form: suggestion.full_data.form || '',
            common_name: suggestion.full_data.cname_species || suggestion.common_name || '',
            scientific_name: suggestion.scientific_name || '',
            kingdom: suggestion.full_data.kingdom || '',
            phylum: suggestion.full_data.phylum || '',
            class: suggestion.full_data.class || '',
            order: suggestion.full_data.order || '',
            family: suggestion.full_data.family || '',
            genus: suggestion.full_data.genus || '',
            taxon_rank: suggestion.rank || suggestion.full_data.taxon_rank || '',
            displayName: extractScientificName(suggestion.scientific_name || suggestion.full_data.species || ''),
            cname_kingdom: suggestion.full_data.cname_kingdom || '',
            cname_phylum: suggestion.full_data.cname_phylum || '',
            cname_class: suggestion.full_data.cname_class || '',
            cname_order: suggestion.full_data.cname_order || '',
            cname_family: suggestion.full_data.cname_family || '',
            cname_genus: suggestion.full_data.cname_genus || '',
            cname_species: suggestion.full_data.cname_species || suggestion.common_name || ''
        }));
        setSuggestions([]);
        setShowSuggestions(false);
    };

    // Tambahkan useEffect untuk menutup suggestions ketika klik di luar
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                // Cek juga apakah klik pada input field
                const inputField = document.querySelector('input[name="scientific_name"]');
                if (inputField && !inputField.contains(event.target)) {
                    console.log('Click outside suggestions container, hiding suggestions');
                    setShowSuggestions(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset form ketika modal ditutup
    useEffect(() => {
        if (!isOpen) {
            setTempFormData({
                scientific_name: '',
                habitat: '',
                description: '',
                type_sound: '',
                source: 'live',
                status: 'pristine',
                latitude: '',
                longitude: '',
                locationName: '',
                date: ''
            });
        }
    }, [isOpen]);

    // Cleanup pada unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Tambahkan useEffect untuk mengambil data lokasi dari item yang dipilih
    useEffect(() => {
        if (isOpen && selectedItems.length > 0) {
            const firstItem = selectedItems[0];
            setTempFormData(prev => ({
                ...prev,
                latitude: firstItem.latitude || '',
                longitude: firstItem.longitude || '',
                locationName: firstItem.locationName || '',
                date: firstItem.date || '',
                scientific_name: firstItem.scientific_name || '',
                species: firstItem.species || '',
                subspecies: firstItem.subspecies || '',
                variety: firstItem.variety || '',
                form: firstItem.form || '',
                common_name: firstItem.common_name || '',
                kingdom: firstItem.kingdom || '',
                phylum: firstItem.phylum || '',
                class: firstItem.class || '',
                order: firstItem.order || '',
                family: firstItem.family || '',
                genus: firstItem.genus || '',
                taxon_rank: firstItem.taxon_rank || '',
                displayName: firstItem.displayName || firstItem.scientific_name || '',
                cname_kingdom: firstItem.cname_kingdom || '',
                cname_phylum: firstItem.cname_phylum || '',
                cname_class: firstItem.cname_class || '',
                cname_order: firstItem.cname_order || '',
                cname_family: firstItem.cname_family || '',
                cname_genus: firstItem.cname_genus || '',
                cname_species: firstItem.cname_species || firstItem.common_name || '',
                habitat: firstItem.habitat || '',
                description: firstItem.description || '',
                type_sound: firstItem.type_sound || '',
                is_combined: firstItem.isCombined || false,
                files: firstItem.files || [firstItem.file]
            }));
        }
    }, [isOpen, selectedItems]);

    const validateForm = () => {
        const newErrors = {};

        if (hasAudioFiles && !tempFormData.type_sound) {
            newErrors.type_sound = "Tipe suara wajib dipilih untuk file audio";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validateForm()) {
            // Pastikan data lokasi termasuk dalam data yang disimpan
            const dataToSave = {
                ...tempFormData,
                latitude: tempFormData.latitude,
                longitude: tempFormData.longitude,
                locationName: tempFormData.locationName
            };
            onSave(dataToSave);
            onClose();
        }
    };

    const handleLocationSave = (lat, lng, name) => {
        setTempFormData(prev => ({
            ...prev, // Pertahankan semua data sebelumnya
            latitude: lat,
            longitude: lng,
            locationName: name
        }));
        setIsLocationModalOpen(false);
    };

    // Tambahkan fungsi helper
    const extractScientificName = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.split(' ');
        const scientificNameParts = parts.filter(part => {
            if (part.includes('(') || part.includes(')')) return false;
            if (/\d/.test(part)) return false;
            if (parts.indexOf(part) > 1 && /^[A-Z]/.test(part)) return false;
            return true;
        });
        return scientificNameParts.join(' ');
    };

    // Tambahkan handleInputFocus untuk memastikan sugestionss muncul kembali saat fokus pada input
    const handleInputFocus = () => {
        if (tempFormData.scientific_name && tempFormData.scientific_name.length > 2) {
            console.log('Input focused, showing suggestions');
            setShowSuggestions(true);
            
            if (suggestions.length === 0) {
                console.log('No suggestions available, fetching again');
                fetchSuggestions(tempFormData.scientific_name, 1);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-800 overflow-y-auto mt-10">
            <div
                className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-2xl transform rounded-xl bg-[#1e1e1e] text-[#e0e0e0] shadow-2xl transition-all border border-[#444]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#444] px-6 py-4">
                        <h3 className="text-xl font-semibold text-white">
                            Isi Form Sekaligus ({selectedItems.length} item)
                        </h3>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 hover:bg-[#2c2c2c] text-gray-400 hover:text-white"
                        >
                            <FontAwesomeIcon icon={faXmark} className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 space-y-4">
                        {/* Form Fields untuk Semua Tipe */}
                        <div className="space-y-4">
                            {/* Nama Taksa */}
                            <div className="form-group relative">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Nama Spesies
                                    <FontAwesomeIcon
                                        icon={faInfoCircle}
                                        className="ml-2 text-gray-400 cursor-help"
                                        onMouseEnter={() => setShowTooltip('scientific_name')}
                                        onMouseLeave={() => setShowTooltip('')}
                                    />
                                </label>
                                {showTooltip === 'scientific_name' && (
                                    <div className="absolute z-50 bg-[#2c2c2c] text-white p-2 rounded text-sm -mt-1 ml-8 border border-[#444]">
                                        {tooltipContent.scientific_name}
                                    </div>
                                )}
                                <div className={`relative flex items-center space-x-3 rounded-lg border p-3 transition-colors bg-[#2c2c2c] ${
                                    errors.scientific_name ? 'border-red-500' : 'border-[#444] hover:border-[#1a73e8]'
                                }`}>
                                    <FontAwesomeIcon icon={faDna} className="text-gray-400" />
                                    <input
                                        type="text"
                                        name="scientific_name"
                                        className="w-full focus:outline-none bg-transparent text-[#e0e0e0]"
                                        value={tempFormData.displayName || tempFormData.common_name || tempFormData.species || tempFormData.scientific_name}
                                        onChange={handleChange}
                                        placeholder="Masukkan nama taksa"
                                        onFocus={() => {
                                            if (tempFormData.scientific_name && tempFormData.scientific_name.length > 2) {
                                                console.log('Input focused, showing suggestions');
                                                setShowSuggestions(true);
                                                
                                                if (suggestions.length === 0) {
                                                    console.log('No suggestions available, fetching again');
                                                    fetchSuggestions(tempFormData.scientific_name, 1);
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                {errors.scientific_name && (
                                    <p className="mt-1 text-sm text-red-500">{errors.scientific_name}</p>
                                )}
                                
                                {/* Tampilkan hierarki taksonomi jika kingdom tersedia */}
                                {tempFormData.kingdom && (
                                    <div className="mt-3 text-sm text-gray-300">
                                        <div className="grid grid-cols-1 gap-1 border border-[#444] p-3 rounded-lg bg-[#2c2c2c]">
                                            <div className="font-medium text-[#e0e0e0] border-b border-[#444] pb-1 mb-1">Hierarki Taksonomi:</div>
                                            
                                            {tempFormData.kingdom && (
                                                <div className="flex justify-between">
                                                    <span>Kingdom:</span> 
                                                    <span className="text-[#e0e0e0]">{tempFormData.kingdom}
                                                        {tempFormData.cname_kingdom && <span className="text-gray-400"> ({tempFormData.cname_kingdom})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.phylum && (
                                                <div className="flex justify-between">
                                                    <span>Phylum:</span> 
                                                    <span className="text-[#e0e0e0]">{tempFormData.phylum}
                                                        {tempFormData.cname_phylum && <span className="text-gray-400"> ({tempFormData.cname_phylum})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.class && (
                                                <div className="flex justify-between">
                                                    <span>Class:</span> 
                                                    <span className="text-[#e0e0e0]">{tempFormData.class}
                                                        {tempFormData.cname_class && <span className="text-gray-400"> ({tempFormData.cname_class})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.order && (
                                                <div className="flex justify-between">
                                                    <span>Order:</span> 
                                                    <span className="text-[#e0e0e0]">{tempFormData.order}
                                                        {tempFormData.cname_order && <span className="text-gray-400"> ({tempFormData.cname_order})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.family && (
                                                <div className="flex justify-between">
                                                    <span>Family:</span> 
                                                    <span className="text-[#e0e0e0]">{tempFormData.family}
                                                        {tempFormData.cname_family && <span className="text-gray-400"> ({tempFormData.cname_family})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.genus && (
                                                <div className="flex justify-between">
                                                    <span>Genus:</span> 
                                                    <span className="text-[#e0e0e0] italic">{tempFormData.genus}
                                                        {tempFormData.cname_genus && <span className="text-gray-400 not-italic"> ({tempFormData.cname_genus})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.species && (
                                                <div className="flex justify-between">
                                                    <span>Species:</span> 
                                                    <span className="text-[#e0e0e0] italic">{extractScientificName(tempFormData.species)}
                                                        {tempFormData.common_name && <span className="text-gray-400 not-italic"> ({tempFormData.common_name})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.subspecies && (
                                                <div className="flex justify-between">
                                                    <span>Subspecies:</span> 
                                                    <span className="text-[#e0e0e0] italic">{tempFormData.subspecies}</span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.variety && (
                                                <div className="flex justify-between">
                                                    <span>Variety:</span> 
                                                    <span className="text-[#e0e0e0] italic">{tempFormData.variety}</span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.form && (
                                                <div className="flex justify-between">
                                                    <span>Form:</span> 
                                                    <span className="text-[#e0e0e0] italic">{tempFormData.form}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {showSuggestions && (
                                    <div
                                        ref={suggestionsRef}
                                        className="absolute z-[500] w-full mt-1 bg-[#2c2c2c] border border-[#444] rounded-lg shadow-xl overflow-auto"
                                        style={{
                                            maxHeight: '350px',
                                            minHeight: '100px',
                                            left: 0,
                                            right: 0,
                                            top: 'calc(100% + 5px)'
                                        }}
                                        onScroll={handleSuggestionsScroll}
                                    >
                                        {suggestions.length > 0 ? (
                                            <>
                                                {renderTaxonSuggestions(suggestions)}
                                                
                                                {isLoadingMore && (
                                                    <div className="p-3 text-center text-gray-400">
                                                        <div className="inline-block w-5 h-5 border-2 border-t-[#1a73e8] border-r-[#1a73e8] border-b-[#1a73e8] border-l-transparent rounded-full animate-spin mr-2"></div>
                                                        <span>Memuat data...</span>
                                                    </div>
                                                )}
                                                
                                                {hasMore && !isLoadingMore && (
                                                    <div 
                                                        className="p-3 text-center text-[#1a73e8] cursor-pointer hover:bg-[#3c3c3c] font-medium"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            loadMoreSuggestions();
                                                        }}
                                                    >
                                                        Lihat lebih banyak
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            isLoadingMore ? (
                                                <div className="p-3 text-center text-gray-400">
                                                    <div className="inline-block w-5 h-5 border-2 border-t-[#1a73e8] border-r-[#1a73e8] border-b-[#1a73e8] border-l-transparent rounded-full animate-spin mr-2"></div>
                                                    <span>Memuat data...</span>
                                                </div>
                                            ) : (
                                                <div className="p-3 text-center text-gray-400">
                                                    Tidak ada hasil yang ditemukan
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Lokasi */}
                            <div className="form-group relative">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Lokasi
                                </label>
                                <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                    <FontAwesomeIcon icon={faLocationDot} className="text-gray-400" />
                                    <button
                                        onClick={() => setIsLocationModalOpen(true)}
                                        className="w-full text-left text-[#e0e0e0] hover:text-white"
                                    >
                                        {tempFormData.locationName || 'Pilih lokasi'}
                                    </button>
                                </div>
                            </div>

                            {/* Tanggal */}
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Tanggal
                                </label>
                                <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                    <FontAwesomeIcon icon={faCalendar} className="text-gray-400" />
                                    <input
                                        type="date"
                                        name="date"
                                        className="w-full focus:outline-none bg-transparent text-[#e0e0e0]"
                                        value={tempFormData.date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Habitat */}
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Habitat
                                </label>
                                <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                    <FontAwesomeIcon icon={faTree} className="text-gray-400" />
                                    <input
                                        type="text"
                                        name="habitat"
                                        className="w-full focus:outline-none bg-transparent text-[#e0e0e0]"
                                        value={tempFormData.habitat}
                                        onChange={handleChange}
                                        placeholder="Masukkan habitat"
                                    />
                                </div>
                            </div>

                            {/* Keterangan */}
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Keterangan
                                </label>
                                <div className="flex space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                    <FontAwesomeIcon icon={faNoteSticky} className="text-gray-400 mt-1" />
                                    <textarea
                                        name="description"
                                        rows="3"
                                        className="w-full focus:outline-none resize-none bg-transparent text-[#e0e0e0]"
                                        value={tempFormData.description}
                                        onChange={handleChange}
                                        placeholder="Masukkan keterangan"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Form Fields khusus Audio */}
                        {hasAudioFiles && (
                            <div className="space-y-4 border-t border-[#444] pt-4">
                                <h4 className="font-medium text-white">Pengaturan Audio</h4>

                                {/* Tipe Suara */}
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Tipe Suara
                                    </label>
                                    <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                        <FontAwesomeIcon icon={faMusic} className="text-gray-400" />
                                        <select
                                            name="type_sound"
                                            className="w-full focus:outline-none bg-[#2c2c2c] text-[#e0e0e0]"
                                            value={tempFormData.type_sound}
                                            onChange={handleChange}
                                        >
                                            <option value="" className="bg-[#2c2c2c]">Pilih tipe suara</option>
                                            <option value="song" className="bg-[#2c2c2c]">Song</option>
                                            <option value="call" className="bg-[#2c2c2c]">Call</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Radio Groups */}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#444] px-6 py-4 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-300 hover:text-white border border-[#444] rounded hover:bg-[#2c2c2c] transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => handleSave()}
                            className="px-4 py-2 bg-[#1a73e8] text-white rounded hover:bg-[#1565c0] transition-colors"
                        >
                            Simpan
                        </button>
                    </div>
                </div>
            </div>

            {/* Tambahkan Modal Lokasi */}
            <Modal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            >
                <LocationPicker
                    onSave={handleLocationSave}
                    onClose={() => setIsLocationModalOpen(false)}
                    initialPosition={tempFormData.latitude && tempFormData.longitude ? [tempFormData.latitude, tempFormData.longitude] : null}
                    initialLocationName={tempFormData.locationName}
                />
            </Modal>

            {tempFormData.is_combined && (
                <div className="mt-4">
                    <h4 className="font-medium text-white mb-2">Gambar Gabungan</h4>
                    <div className="grid grid-cols-4 gap-2">
                        {tempFormData.files.map((file, index) => (
                            <div key={index} className="relative">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Combined image ${index + 1}`}
                                    className="w-full h-24 object-cover rounded"
                                />
                                <div className="absolute top-1 right-1 bg-black/50 text-white px-2 rounded-full text-sm">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default BulkEditModal;
