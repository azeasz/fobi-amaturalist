import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faInfo, faListDots, faImage, faDove, faLocationDot, faQuestion, faCheck, faLink, faUsers, faPause, faPlay, faSearch, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import ChecklistDetail from '../DetailObservations/ChecklistDetail';
import { useInView } from 'react-intersection-observer';
import defaultFobiLogo from '../../assets/icon/FOBI.png';

// Tambahkan fungsi helper untuk mendapatkan gambar default
const getDefaultImage = (type) => {
  return defaultFobiLogo;
};

// Tambahkan fungsi untuk mendapatkan URL gambar
const getImageUrl = (item) => {
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        const imageUrl = typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url;
        if (imageUrl) return imageUrl;
    }
    return getDefaultImage(item.type);
};

// Tambahkan fungsi getGradeDisplay
const getGradeDisplay = (grade) => {
    if (!grade) return '-';
    
    switch (grade.toLowerCase()) {
        case 'research grade':
            return 'Research';
        case 'needs id':
            return 'Bantu ID';
        case 'low quality id':
            return 'ID Kurang';
        case 'casual':
            return 'Casual';
        default:
            return grade;
    }
};

// Update fungsi getSourceAndCleanId
const getSourceAndCleanId = (id) => {
    if (!id) {
        return { source: 'fobi', cleanId: '' };
    }

    const idString = String(id);
    return { source: 'fobi', cleanId: idString };
};

// Komponen ObservationCard
const ObservationCard = ({ observation, onClick }) => {
    const getGradeDisplay = (grade) => {
        switch(grade.toLowerCase()) {
            case 'needs id':
                return 'Bantu Iden';
            case 'low quality id':
                return 'ID Kurang';
            default:
                return 'Casual';
        }
    };

    const getTypeLabel = (type) => {
        return 'FOBI';
    };

    return (
        <div className="card bg-[#2c2c2c] rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300 border border-[#444]" 
             onClick={onClick}>
            <div className="relative h-48 bg-[#1e1e1e]">
                {observation.spectrogram ? (
                    <SpectrogramPlayer
                        spectrogramUrl={observation.spectrogram}
                        audioUrl={observation.audioUrl}
                    />
                ) : (
                    <div className="w-full h-full bg-[#1e1e1e]">
                        <img 
                            src={getImageUrl(observation)}
                            alt=""
                            className={`w-full h-full ${
                                getImageUrl(observation).includes('/assets/icon/') 
                                    ? 'object-contain p-4' 
                                    : 'object-cover'
                            }`}
                            loading="lazy"
                            onError={(e) => {
                                e.target.src = getDefaultImage(observation.type);
                            }}
                        />
                    </div>
                )}
                <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${
                        observation.quality.grade.toLowerCase().includes('needs') ? 'bg-yellow-500' :
                        observation.quality.grade.toLowerCase().includes('low') ? 'bg-orange-500' :
                        'bg-gray-600'
                    }`}>
                        {getGradeDisplay(observation.quality.grade)}
                    </span>
                </div>
            </div>

            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-300">{observation.observer}</span>
                    <span className="text-xs font-medium text-gray-400">
                        {getTypeLabel(observation.type)}
                    </span>
                </div>

                <h5 className="font-medium text-lg mb-2 line-clamp-2 text-white">{observation.title}</h5>

                <div className="flex items-center justify-between mt-4">
                    <div className="quality-indicators flex gap-2 text-gray-400">
                        {observation.quality.has_media && 
                            <FontAwesomeIcon icon={faImage} title="Has Media" />}
                        {observation.quality.is_wild && 
                            <FontAwesomeIcon icon={faDove} title="Wild" />}
                        {observation.quality.location_accurate && 
                            <FontAwesomeIcon icon={faLocationDot} title="Location Accurate" />}
                        {observation.quality.needs_id && 
                            <FontAwesomeIcon icon={faQuestion} title="Needs ID" />}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <FontAwesomeIcon icon={faUsers} />
                        <span>{observation.identifications_count}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Update ObservationModal untuk menangani ID dengan prefix
const ObservationModal = ({ isOpen, onClose, observation }) => {
    const queryClient = useQueryClient();
    const formattedId = observation ? observation.id : null;

    const updateMutation = useMutation({
        mutationFn: async (updatedData) => {
            const { source, cleanId } = getSourceAndCleanId(updatedData.id);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/observations/${cleanId}?source=${source}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['observations']);
            onClose();
        },
        onError: (error) => {
            console.error('Update error:', error);
        }
    });

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-100"
                onClose={onClose}
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
                    <div className="fixed inset-0 bg-black bg-opacity-75" />
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
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-[#1e1e1e] shadow-xl transition-all">
                                {observation && (
                                    <ChecklistDetail 
                                        id={formattedId}
                                        isModal={true}
                                        onClose={onClose}
                                        onUpdate={(data) => updateMutation.mutate(data)}
                                    />
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// Tambahkan komponen SpectrogramPlayer
const SpectrogramPlayer = ({ audioUrl, spectrogramUrl }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.addEventListener('timeupdate', () => {
                const duration = audioRef.current.duration;
                const currentTime = audioRef.current.currentTime;
                const progress = (currentTime / duration) * 100;
                setProgress(progress);
            });

            audioRef.current.addEventListener('ended', () => {
                setIsPlaying(false);
                setProgress(0);
            });
        }
    }, []);

    return (
        <div className="relative w-full h-full bg-black flex flex-col">
            <div className="relative flex-1 w-full h-full bg-gray-900 overflow-hidden">
                <img
                    src={spectrogramUrl}
                    alt="Spectrogram"
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
                {audioUrl && (
                    <>
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-700">
                            <div
                                className="h-full bg-emerald-500 transition-width duration-100"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePlay();
                            }}
                            className="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 hover:scale-110 active:scale-95 transition-all duration-200"
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                            <FontAwesomeIcon
                                icon={isPlaying ? faPause : faPlay}
                                className="text-xs"
                            />
                        </button>
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            className="hidden"
                            preload="metadata"
                        />
                    </>
                )}
            </div>
        </div>
    );
};

// Tambahkan fungsi helper untuk membuat unique key
const generateUniqueKey = (observation) => {
    const timestamp = Date.parse(observation.created_at);
    const randomSuffix = Math.random().toString(36).substring(7);
    return `${observation.type}-${observation.id}-${timestamp}-${randomSuffix}`;
};

// Komponen utama BantuIdent dengan React Query
const BantuIdent = () => {
    const [selectedObservation, setSelectedObservation] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const queryClient = useQueryClient();
    const [displayedItems, setDisplayedItems] = useState(10);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);
    const [visibleIndex, setVisibleIndex] = useState(null);
    const [filters, setFilters] = useState({
        grades: ['needs id', 'low quality id'],
        searchQuery: '',
        searchType: 'species'
    });

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '100px',
    });

    const formatGeneralData = (data) => {
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
            id: item?.id || '',
            taxa_id: item?.taxa_id || '',
            media_id: item?.media_id || '',
            images: item?.images || [],
            title: item?.cname_species || 
                   item?.cname_genus || 
                   item?.cname_family || 
                   item?.cname_order || 
                   item?.cname_tribe || 
                   item?.cname_superfamily || 
                   item?.cname_subfamily ||
                   item?.cname_variety ||
                   item?.cname_subspecies ||
                   item?.family || 
                   item?.genus || 
                   item?.species || 
                   item?.form || 
                   item?.variety ||
                   item?.subspecies ||
                   item?.class ||
                   item?.order ||
                   item?.phylum ||
                   item?.kingdom ||
                   item?.superkingdom ||
                   item?.superphylum ||
                   item?.division ||
                   item?.superdivision ||
                   item?.domain ||
                   item?.subkingdom ||
                   item?.superorder ||
                   item?.infraorder ||
                   item?.superfamily ||
                   item?.subfamily ||
                   item?.tribe ||
                   'Tidak ada nama',
            description: `Family: ${item?.family || '-'}
            Genus: ${item?.genus || '-'}
            Species: ${item?.species || '-'}`,
            observer: item?.observer_name || 'Anonymous',
            quality: {
                grade: item?.grade || 'casual',
                has_media: Boolean(item?.has_media),
                is_wild: Boolean(item?.is_wild),
                location_accurate: Boolean(item?.location_accurate),
                needs_id: Boolean(item?.needs_id)
            },
            type: 'general',
            spectrogram: item?.spectrogram || null,
            audioUrl: item?.audio_url || null,
            created_at: item?.created_at || new Date().toISOString(),
            identifications_count: item?.identifications_count || 0,
            fobi_count: item?.fobi_count || 0,
        }));
    };

    const fetchObservations = async () => {
        const baseUrl = `${import.meta.env.VITE_API_URL}`;
        
        // Tambahkan query params untuk grade
        const queryParams = new URLSearchParams();
        queryParams.append('grade[]', 'needs id');
        queryParams.append('grade[]', 'low quality id');
        const queryString = queryParams.toString();

        try {
            const response = await fetch(`${baseUrl}/general-observations?${queryString}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch general observations');
            }
            
            const json = await response.json();
            
            if (!json.success) {
                console.error('Error in general observations response:', json);
                return [];
            }
            
            const data = json.data || [];
            const formattedData = formatGeneralData(data);
            
            // Filter hanya needs id dan low quality id
            return formattedData.filter(item => 
                item.quality.grade.toLowerCase() === 'needs id' || 
                item.quality.grade.toLowerCase() === 'low quality id'
            );
        } catch (err) {
            console.error('Error fetching general observations:', err);
            return [];
        }
    };

    // Implementasi React Query
    const { data: observations, isLoading, error } = useQuery({
        queryKey: ['observations'],
        queryFn: fetchObservations,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 30000, // Data dianggap stale setelah 30 detik
        cacheTime: 5 * 60 * 1000, // Cache bertahan 5 menit
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    const handleCardClick = (observation) => {
        setSelectedObservation(observation);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        queryClient.invalidateQueries(['observations']);
    };

    // Update fungsi loadMore
    const loadMore = () => {
        if (loadingMore) return;
        
        setLoadingMore(true);
        setTimeout(() => {
            const increment = 10; // Tambah 10 item setiap kali
            const nextItems = displayedItems + increment;
            setDisplayedItems(nextItems);
            
            // Cek apakah masih ada item yang bisa dimuat
            const filteredData = filterObservations(observations);
            if (nextItems >= (filteredData?.length || 0)) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
            
            // Setelah 30 item, gunakan tombol
            if (nextItems >= 30) {
                setShowLoadMoreButton(true);
            }
            
            setLoadingMore(false);
        }, 300);
    };

    // Update effect untuk infinite scroll
    useEffect(() => {
        if (inView && hasMore && !showLoadMoreButton && !loadingMore) {
            loadMore();
        }
    }, [inView, hasMore, showLoadMoreButton, loadingMore]);

    // Reset displayed items ketika filter berubah
    useEffect(() => {
        setDisplayedItems(10);
        setHasMore(true);
        setShowLoadMoreButton(false);
    }, [filters]);

    const toggleDescription = (index) => {
        setVisibleIndex(visibleIndex === index ? null : index);
    };

    // Update fungsi filter
    const filterObservations = (data) => {
        if (!data) return [];
        
        return data.filter(item => {
            // Filter berdasarkan grade
            if (!filters.grades.includes(item.quality.grade.toLowerCase())) {
                return false;
            }

            // Filter berdasarkan search query
            if (filters.searchQuery) {
                switch (filters.searchType) {
                    case 'species':
                        return item.title.toLowerCase().includes(filters.searchQuery.toLowerCase());
                    case 'date':
                        const itemDate = new Date(item.created_at).toLocaleDateString();
                        const searchDate = new Date(filters.searchQuery).toLocaleDateString();
                        return itemDate === searchDate;
                    default:
                        return true;
                }
            }

            return true;
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#121212] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#121212] text-white">
                <div className="text-red-500">Gagal memuat data: {error.message}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 overflow-hidden mb-2 bg-[#121212] text-white">
            <h1 className="text-2xl font-bold mb-6">Bantu Identifikasi</h1>

            {/* Filter dan Search Section */}
            <div className="mb-6 space-y-4">
                {/* Grade Filters */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilters(prev => ({
                            ...prev,
                            grades: ['needs id', 'low quality id']
                        }))}
                        className={`px-4 py-2 rounded-full text-sm ${
                            filters.grades.length === 2 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-[#2c2c2c] text-gray-300 hover:bg-[#333]'
                        }`}
                    >
                        Semua
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({
                            ...prev,
                            grades: ['needs id']
                        }))}
                        className={`px-4 py-2 rounded-full text-sm ${
                            filters.grades.length === 1 && filters.grades[0] === 'needs id'
                                ? 'bg-blue-600 text-white' 
                                : 'bg-[#2c2c2c] text-gray-300 hover:bg-[#333]'
                        }`}
                    >
                        Bantu Ident
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({
                            ...prev,
                            grades: ['low quality id']
                        }))}
                        className={`px-4 py-2 rounded-full text-sm ${
                            filters.grades.length === 1 && filters.grades[0] === 'low quality id'
                                ? 'bg-blue-600 text-white' 
                                : 'bg-[#2c2c2c] text-gray-300 hover:bg-[#333]'
                        }`}
                    >
                        ID Kurang
                    </button>
                </div>

                {/* Search Section */}
                <div className="flex flex-wrap gap-2">
                    <div className="flex-1 relative">
                        {filters.searchType === 'date' ? (
                            <input
                                type="date"
                                value={filters.searchQuery}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    searchQuery: e.target.value
                                }))}
                                className="w-full px-4 py-2 rounded-lg border border-[#444] bg-[#2c2c2c] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cari species..."
                                    value={filters.searchQuery}
                                    onChange={(e) => {
                                        setFilters(prev => ({
                                            ...prev,
                                            searchQuery: e.target.value
                                        }));
                                    }}
                                    className="w-full px-4 py-2 rounded-lg border border-[#444] bg-[#2c2c2c] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <FontAwesomeIcon 
                                    icon={faSearch} 
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                />
                            </div>
                        )}
                    </div>
                    <select
                        value={filters.searchType}
                        onChange={(e) => {
                            setFilters(prev => ({
                                ...prev,
                                searchQuery: '', // Reset search query when changing type
                                searchType: e.target.value
                            }));
                        }}
                        className="px-4 py-2 rounded-lg border border-[#444] bg-[#2c2c2c] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="species">Species</option>
                        <option value="date">Tanggal</option>
                    </select>
                </div>
            </div>

            {/* Tampilan Desktop - Update untuk menggunakan filtered data */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filterObservations(observations)?.slice(0, displayedItems).map((observation) => (
                    <ObservationCard 
                        key={generateUniqueKey(observation)}
                        observation={observation}
                        onClick={() => handleCardClick(observation)}
                    />
                ))}
            </div>

            {/* Tampilan Mobile - Update untuk menggunakan filtered data */}
            <div className="grid grid-cols-2 gap-2 md:hidden mx-1">
                {filterObservations(observations)?.slice(0, displayedItems).map((observation) => (
                    <div 
                        key={generateUniqueKey(observation)}
                        className="card relative rounded-md overflow-hidden shadow-sm bg-[#2c2c2c] border border-[#444]"
                    >
                        <div
                            className="cursor-pointer aspect-square relative"
                            onClick={() => handleCardClick(observation)}
                        >
                            {observation.spectrogram ? (
                                <SpectrogramPlayer
                                    spectrogramUrl={observation.spectrogram}
                                    audioUrl={observation.audioUrl}
                                />
                            ) : (
                                <div className="w-full h-full bg-[#1e1e1e]">
                                    <img 
                                        src={getImageUrl(observation)} 
                                        alt={observation.title} 
                                        className={`w-full h-full ${
                                            getImageUrl(observation).includes('/assets/icon/') 
                                                ? 'object-contain p-4' 
                                                : 'object-cover'
                                        }`}
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.src = getDefaultImage(observation.type);
                                        }}
                                    />
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                                <span className="text-white text-[10px] line-clamp-1">
                                    {observation.title}
                                </span>
                            </div>
                        </div>

                        <span className={`absolute top-1 left-1 text-[8px] px-1.5 py-0.5 rounded-full text-white ${
                            observation.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-500/70' :
                            observation.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-500/70' :
                            'bg-gray-500/70'
                        }`}>
                            {observation.quality.grade.toLowerCase() === 'needs id' ? 'Bantu Iden' :
                             observation.quality.grade.toLowerCase() === 'low quality id' ? 'ID Kurang' :
                             'Casual'}
                        </span>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleDescription(observation.id);
                            }}
                            className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                        >
                            <FontAwesomeIcon icon={faInfo} className="text-[8px]" />
                        </button>

                        {visibleIndex === observation.id && (
                            <div className="absolute inset-0 bg-black/90 text-white p-3 text-xs overflow-y-auto">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium">{observation.title}</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setVisibleIndex(null);
                                            }}
                                            className="text-white/80 hover:text-white"
                                        >
                                            <FontAwesomeIcon icon={faTimes} className="text-xs" />
                                        </button>
                                    </div>
                                    <p className="whitespace-pre-line text-gray-300">{observation.description}</p>
                                    <p className="text-gray-300">Observer: {observation.observer}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Update Loading dan Load More Button */}
            {(hasMore || showLoadMoreButton) && observations?.length > 0 && (
                <div className="mt-4 flex justify-center" ref={ref}>
                    {loadingMore ? (
                        <div className="flex items-center space-x-2 text-gray-400">
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Memuat...</span>
                        </div>
                    ) : (hasMore || showLoadMoreButton) ? (
                        <button
                            onClick={loadMore}
                            className="px-4 py-2 bg-[#2c2c2c] hover:bg-[#333] rounded-lg text-sm text-gray-300 transition-colors border border-[#444]"
                        >
                            Muat Lebih Banyak
                        </button>
                    ) : null}
                </div>
            )}

            {observations?.length === 0 && !isLoading && (
                <div className="text-center text-gray-400 mt-8 bg-[#1e1e1e] p-8 rounded-lg border border-[#444]">
                    <FontAwesomeIcon icon={faSearch} className="text-3xl mb-2" />
                    <p>Tidak ada data yang perlu diidentifikasi</p>
                </div>
            )}

            <ObservationModal 
                isOpen={showModal}
                onClose={handleModalClose}
                observation={selectedObservation}
            />
        </div>
    );
};

export default BantuIdent;