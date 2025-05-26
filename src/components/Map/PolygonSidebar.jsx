import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEllipsisV, faSync, faArrowLeft, faChevronUp, faChevronDown, faTimes } from '@fortawesome/free-solid-svg-icons';
import { getSourceLogo } from '../../utils/mapHelpers';
import { useNavigate } from 'react-router-dom';
import { MediaSlider } from './MediaSlider';
import { getLocationName } from '../../utils/geocoding';
import { apiFetch } from '../../utils/api';
import { debounce } from 'lodash';
import { SkeletonLoader } from './SkeletonLoader';
import localforage from 'localforage';

// Konstanta untuk optimasi
const ITEMS_PER_PAGE = 5;
const BATCH_SIZE = 2; 
const BATCH_DELAY = 1000;
const MAX_RETRIES = 3;
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik
const INITIAL_LOAD = 5; // Jumlah data yang dimuat pertama kali
const LOAD_MORE = 5;    // Jumlah data yang dimuat saat scroll

// Buat cache store untuk species data
const speciesCache = localforage.createInstance({
  name: 'speciesCache'
});

// Buat queue untuk rate limiting
const fetchQueue = [];
let isProcessingQueue = false;

// Fungsi untuk memproses queue dengan rate limiting
const processFetchQueue = async () => {
  if (isProcessingQueue || fetchQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  try {
    const { url, options, resolve, reject } = fetchQueue.shift();
    
    try {
      // Tambahkan delay untuk rate limiting
      await new Promise(r => setTimeout(r, 300));
      
      const response = await apiFetch(url, options);
      resolve(response);
    } catch (error) {
      reject(error);
    }
  } finally {
    isProcessingQueue = false;
    
    // Proses item berikutnya dalam queue jika ada
    if (fetchQueue.length > 0) {
      setTimeout(processFetchQueue, 300);
    }
  }
};

// Fungsi untuk fetch dengan rate limiting
const rateLimitedFetch = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    fetchQueue.push({ url, options, resolve, reject });
    
    if (!isProcessingQueue) {
      processFetchQueue();
    }
  });
};

// Fungsi untuk mendapatkan data dari cache atau fetch
const getCachedOrFetch = async (url, options = {}) => {
  const cacheKey = `${url}`;
  
  try {
    // Coba ambil dari cache
    const cachedData = await speciesCache.getItem(cacheKey);
    
    if (cachedData && cachedData.timestamp && (Date.now() - cachedData.timestamp < CACHE_EXPIRY)) {
      return cachedData.data;
    }
    
    // Jika tidak ada di cache atau sudah expired, fetch data baru
    const response = await rateLimitedFetch(url, options);
    const data = await response.json();
    
    // Simpan ke cache
    await speciesCache.setItem(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error(`Error fetching or caching ${url}:`, error);
    throw error;
  }
};

export const PolygonSidebar = React.memo(({ data, onClose, setStats }) => {
  const { gridsInPolygon, loading: initialLoading, shape } = data;
  const [expandedItems, setExpandedItems] = useState({});
  const [locationNames, setLocationNames] = useState({});
  const [loadingItems, setLoadingItems] = useState({});
  const [loadingQueue, setLoadingQueue] = useState([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [totalGrids, setTotalGrids] = useState(0);
  const [loadedGrids, setLoadedGrids] = useState(0);
  const [allObservations, setAllObservations] = useState([]);
  const [visibleObservations, setVisibleObservations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [polygonStats, setPolygonStats] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  
  // Effect untuk mempertahankan filter saat component di-mount
  useEffect(() => {
    if (shape && gridsInPolygon) {
      // Pastikan shape tetap aktif saat component di-mount
    setTotalGrids(gridsInPolygon.length);
      const initialGrids = gridsInPolygon.slice(0, INITIAL_LOAD);
      const remainingGrids = gridsInPolygon.slice(INITIAL_LOAD);
      
      setLoadingQueue(remainingGrids);
      processInitialBatch(initialGrids);
    }
  }, [shape, gridsInPolygon]);
  
  // Effect untuk update visible observations berdasarkan currentPage
  useEffect(() => {
    setVisibleObservations(allObservations.slice(0, currentPage * ITEMS_PER_PAGE));
  }, [allObservations, currentPage]);
  
  // Fungsi untuk memproses batch awal dengan optimasi
  const processInitialBatch = async (initialGrids) => {
    setProcessingQueue(true);
    
    try {
      // Proses grid secara sekuensial untuk menghindari rate limiting
      const observations = [];
      
      for (const grid of initialGrids) {
        try {
          // Gunakan cached fetch
          const gridData = await getCachedOrFetch(`/grid-data/${grid.id}`);
          
          if (gridData.status === 'success' && gridData.data) {
            // Proses observasi
            const processedObservations = gridData.data.map(obs => ({
              ...obs,
              gridId: grid.id,
              gridCenter: grid.center,
              uniqueId: `${obs.source}_${obs.id}_${grid.id}`
            }));
            
            observations.push(...processedObservations);
            
            // Fetch location name
            if (grid.center) {
              try {
                const locationName = await getLocationName(grid.center[1], grid.center[0]);
                setLocationNames(prev => ({
                  ...prev,
                  [grid.id]: locationName
                }));
              } catch (error) {
                console.error('Error getting location name:', error);
                  setLocationNames(prev => ({
                    ...prev,
                  [grid.id]: `${grid.center[1]}, ${grid.center[0]}`
                  }));
                }
            }
          }
        } catch (error) {
          console.error('Error loading grid', grid.id, ':', error);
        }
      }
      
      // Update state dengan observasi baru
      setAllObservations(observations);
      setLoadedGrids(initialGrids.length);
    } catch (error) {
      console.error('Error processing initial batch:', error);
    } finally {
      setProcessingQueue(false);
    }
  };

  // Fungsi untuk load more data
  const loadMore = useCallback(() => {
    if (processingQueue || isLoadingMore) return;
    
    setIsLoadingMore(true);
    setCurrentPage(prev => prev + 1);
    
    // Jika perlu memuat grid baru
    if (visibleObservations.length >= allObservations.length - 5 && loadingQueue.length > 0) {
      const nextBatch = loadingQueue.slice(0, BATCH_SIZE);
      const remainingQueue = loadingQueue.slice(BATCH_SIZE);
      
      setLoadingQueue(remainingQueue);
      processNextBatch(nextBatch);
    } else {
      // Jika hanya perlu menampilkan lebih banyak dari data yang sudah ada
      setTimeout(() => {
        setIsLoadingMore(false);
      }, 300);
    }
  }, [processingQueue, isLoadingMore, visibleObservations.length, allObservations.length, loadingQueue]);

  // Fungsi untuk memproses batch berikutnya
  const processNextBatch = async (batch) => {
    setProcessingQueue(true);
    
    try {
      const newObservations = [];
      
      for (const grid of batch) {
        try {
          const gridData = await getCachedOrFetch(`/grid-data/${grid.id}`);
          
          if (gridData.status === 'success' && gridData.data) {
            const processedObservations = gridData.data.map(obs => ({
              ...obs,
              gridId: grid.id,
              gridCenter: grid.center,
              uniqueId: `${obs.source}_${obs.id}_${grid.id}`
            }));
            
            newObservations.push(...processedObservations);
            
            // Fetch location name
            if (grid.center) {
              try {
                const locationName = await getLocationName(grid.center[1], grid.center[0]);
                setLocationNames(prev => ({
                  ...prev,
                  [grid.id]: locationName
                }));
              } catch (error) {
                console.error('Error getting location name:', error);
                setLocationNames(prev => ({
                ...prev,
                  [grid.id]: `${grid.center[1]}, ${grid.center[0]}`
                }));
              }
            }
          }
        } catch (error) {
          console.error('Error loading grid', grid.id, ':', error);
        }
        
        // Tambahkan delay kecil antara request
        await new Promise(r => setTimeout(r, 100));
      }
      
      // Update state dengan observasi baru
      setAllObservations(prev => [...prev, ...newObservations]);
      setLoadedGrids(prev => prev + batch.length);
      
      // Update hasMore
      setHasMore(loadingQueue.length > 0 || newObservations.length > 0);
    } catch (error) {
      console.error('Error processing next batch:', error);
    } finally {
            setProcessingQueue(false);
      setIsLoadingMore(false);
    }
  };

  // Fungsi untuk scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    
    // Load more ketika scroll mendekati bottom
    if (scrollBottom < 200 && !processingQueue && !isLoadingMore && hasMore) {
      loadMore();
    }
  }, [processingQueue, isLoadingMore, hasMore, loadMore]);

  // Pasang scroll event listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    // Gunakan throttled scroll handler untuk performa
    const throttledScrollHandler = debounce(handleScroll, 200);
    scrollContainer.addEventListener('scroll', throttledScrollHandler);
    
    return () => {
      scrollContainer.removeEventListener('scroll', throttledScrollHandler);
      throttledScrollHandler.cancel();
    };
  }, [handleScroll]);

  // Pastikan scroll container selalu memiliki overflow
  useEffect(() => {
    const ensureScrollable = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      // Tambahkan padding bottom jika konten tidak cukup untuk scroll
      if (container.scrollHeight <= container.clientHeight && visibleObservations.length > 0) {
        container.style.paddingBottom = '200px';
        } else {
        container.style.paddingBottom = '0';
      }
    };
    
    ensureScrollable();
    
    // Re-check setelah render
    const timer = setTimeout(ensureScrollable, 500);
    return () => clearTimeout(timer);
  }, [visibleObservations]);

  // Fungsi untuk fetch species data
  const fetchSpeciesDataForObservation = useCallback(async (observation) => {
    const id = observation.id;
    
    // Cek cache terlebih dahulu
    const speciesKey = `species_${id}`;
    try {
      const cachedSpecies = await speciesCache.getItem(speciesKey);
      if (cachedSpecies && cachedSpecies.timestamp && (Date.now() - cachedSpecies.timestamp < CACHE_EXPIRY)) {
        return cachedSpecies.data;
      }
    } catch (error) {
      console.error('Error checking species cache:', error);
    }
    
    // Jika tidak ada di cache, fetch dari API
    try {
      let endpoint = '';
      if (observation.source === 'burungnesia' || id.startsWith('brn_')) {
        endpoint = `/grid-species/${id}`;
      } else if (observation.source === 'kupunesia' || id.startsWith('kpn_')) {
        endpoint = `/grid-species/${id}`;
      } else if (observation.source?.includes('fobi') || id.startsWith('fobi_')) {
        let sourceType = 'taxa_fobi';
        endpoint = `/fobi-species/${id}/${sourceType}`;
      }
      
      if (!endpoint) return [];
      
      const data = await getCachedOrFetch(endpoint);
      
      if (data && data.species) {
        // Cache species data
        await speciesCache.setItem(speciesKey, {
          data: data.species,
          timestamp: Date.now()
        });
        
        return data.species;
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching species data for ${id}:`, error);
      return [];
    }
  }, []);

  // Fungsi untuk handle logo click
  const handleLogoClick = useCallback((observation, openInNewTab = false) => {
    let url = '';
    
    if (observation.source === 'burungnesia') {
      url = `/app-checklist/BN${observation.id}`;
    } else if (observation.source === 'kupunesia') {
      url = `/app-checklist/KP${observation.id}`;
    } else if (observation.source?.includes('fobi')) {
      url = `/detail-checklist/fobi${observation.id}`;
    }
    
    if (url) {
      if (openInNewTab) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    }
  }, []);

  // Fungsi untuk toggle expand
  const toggleExpand = useCallback((id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  // Fungsi untuk refresh item
  const refreshItem = useCallback(async (observation) => {
    setLoadingItems(prev => ({ ...prev, [observation.id]: true }));
    
    // Clear cache untuk item ini
    const id = observation.id;
    
    let endpoint = '';
    if (observation.source === 'taxa_fobi' || observation.id.startsWith('fobi_t_')) {
      endpoint = `/fobi-species/${observation.id}/taxa_fobi`;
    } else if (observation.source?.includes('fobi') || observation.id.startsWith('fobi_')) {
      let sourceType = '';
      if (observation.source?.includes('burungnesia') || observation.id.startsWith('fobi_b_')) {
        sourceType = 'burungnesia_fobi';
      } else if (observation.source?.includes('kupunesia') || observation.id.startsWith('fobi_k_')) {
        sourceType = 'kupunesia_fobi';
      } else {
        sourceType = 'taxa_fobi';
      }
      endpoint = `/fobi-species/${observation.id}/${sourceType}`;
    } else if (observation.source === 'burungnesia' || observation.id.startsWith('brn_')) {
      const id = observation.id.replace('brn_', '');
      endpoint = `/grid-species/brn_${id}`;
    } else if (observation.source === 'kupunesia' || observation.id.startsWith('kpn_')) {
      const id = observation.id.replace('kpn_', '');
      endpoint = `/grid-species/kpn_${id}`;
    }
    
    if (endpoint) {
      const cacheKey = `species_${endpoint}`;
      localStorage.removeItem(cacheKey);
    }
    
    try {
      // Re-fetch data
      const species = await fetchSpeciesDataForObservation(observation);
      
      // Update data in allObservations
      setAllObservations(prev => 
        prev.map(obs => 
          obs.uniqueId === observation.uniqueId ? { ...obs, species } : obs
        )
      );
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoadingItems(prev => ({ ...prev, [observation.id]: false }));
    }
  }, [fetchSpeciesDataForObservation]);

  // Modal untuk menampilkan species
  const SpeciesModal = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [species, setSpecies] = useState([]);
    
    useEffect(() => {
      if (!selectedObservation) return;
      
      const loadSpecies = async () => {
        setIsLoading(true);
        try {
          const speciesData = await fetchSpeciesDataForObservation(selectedObservation);
          setSpecies(speciesData || []);
        } catch (error) {
          console.error('Error loading species:', error);
          setSpecies([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadSpecies();
    }, [selectedObservation]);
    
    if (!showSpeciesModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1003] p-4">
        <div className="bg-[#1e1e1e] rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-[#444]">
            <h3 className="text-lg font-bold text-white">Daftar Spesies</h3>
            <button 
              onClick={() => setShowSpeciesModal(false)}
              className="text-white hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading && (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {!isLoading && species.length === 0 && (
              <div className="text-center text-white py-8">
                <p>Tidak ada data spesies</p>
              </div>
            )}
            
            {!isLoading && species.length > 0 && (
              <ul className="space-y-3">
                {Array.isArray(species) && species.map((spesies, idx) => (
                  <li key={idx} className="bg-[#2c2c2c] p-3 rounded-lg">
                    <p className="text-white font-bold italic">{spesies.nameLat || 'Nama tidak tersedia'}</p>
                    {spesies.nameId && <p className="text-white">{spesies.nameId}</p>}
                    <div className="flex justify-between text-sm text-gray-200 mt-1">
                      <span>Jumlah: {spesies.count || 1}</span>
                      {spesies.notes && <span>Catatan: {spesies.notes}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-4 border-t border-[#444] flex justify-end">
            <button
              onClick={() => {
                if (selectedObservation) {
                  refreshItem(selectedObservation);
                }
              }}
              className="bg-[#1a73e8] text-white py-2 px-4 rounded mr-2 hover:bg-[#0d47a1] disabled:opacity-50"
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faSync} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
              Refresh
            </button>
            <button
              onClick={() => setShowSpeciesModal(false)}
              className="bg-[#333] text-white py-2 px-4 rounded hover:bg-[#444]"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render observation card
  const renderObservationCard = useCallback((observation) => {
    const isExpanded = expandedItems[observation.id];
    const locationName = locationNames[observation.gridId] || `${observation.gridCenter?.[1]}, ${observation.gridCenter?.[0]}`;
    
    return (
      <div className="bg-[#2c2c2c] rounded-md p-4 relative">
        <div className="flex items-start space-x-4">
          {/* Logo */}
          <div 
            className="w-12 h-12 bg-[#1e1e1e] rounded-md flex items-center justify-center cursor-pointer"
            onClick={() => handleLogoClick(observation)}
          >
            <img 
              src={getSourceLogo(observation.source)} 
              alt={observation.source} 
              className="w-10 h-10 object-contain"
            />
          </div>
          
          {/* Content */}
          <div className="flex-1">
            {/* Location */}
            <div className="font-medium">
              {locationName}
            </div>
            
            {/* Observer */}
            <div className="text-sm text-gray-200">
              Pengamat: {observation.observer || 'Tidak diketahui'}
            </div>
            
            {/* Date */}
            <div className="text-sm text-gray-200">
              Tanggal: {observation.date || 'Tidak diketahui'}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => refreshItem(observation)}
              className="w-8 h-8 bg-[#1a73e8] hover:bg-[#0d47a1] rounded flex items-center justify-center"
              aria-label="Refresh"
              disabled={loadingItems[observation.id]}
            >
              <FontAwesomeIcon 
                icon={faSync} 
                className={loadingItems[observation.id] ? 'animate-spin' : ''}
              />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === observation.id ? null : observation.id);
              }}
              className="w-8 h-8 bg-[#333] hover:bg-[#444] rounded flex items-center justify-center"
              aria-label="Menu"
              title="Menu"
            >
              <FontAwesomeIcon icon={faEllipsisV} />
            </button>
          </div>
        </div>
        
        {/* Species button */}
        <div className="mt-3">
          <button
            onClick={() => {
              setSelectedObservation(observation);
              setShowSpeciesModal(true);
            }}
            className="bg-[#1a73e8] hover:bg-[#0d47a1] text-white py-1 px-3 rounded text-sm"
          >
            Lihat Spesies
          </button>
        </div>
        
        {/* Menu dropdown */}
        {activeMenu === observation.id && (
          <div className="absolute right-4 mt-1 bg-[#1e1e1e] shadow-lg rounded-md z-10 w-40 border border-[#444]">
            <ul className="py-1">
              <li>
                <button 
                  className="w-full text-left px-4 py-2 hover:bg-[#2c2c2c] text-white text-sm"
                  onClick={() => {
                    handleLogoClick(observation, true);
                    setActiveMenu(null);
                  }}
                >
                  Buka di tab baru
                </button>
              </li>
              <li>
                <button 
                  className="w-full text-left px-4 py-2 hover:bg-[#2c2c2c] text-white text-sm"
                  onClick={() => {
                    const coords = observation.gridCenter;
                    if (coords) {
                      navigator.clipboard.writeText(`${coords[1]}, ${coords[0]}`);
                      // Todo: tambahkan notifikasi
                    }
                    setActiveMenu(null);
                  }}
                >
                  Salin koordinat
                </button>
              </li>
            </ul>
          </div>
        )}
        
        {/* Media slider */}
        {observation.media && observation.media.length > 0 && (
          <div className="mt-3">
            <MediaSlider media={observation.media} />
          </div>
        )}
      </div>
    );
  }, [expandedItems, activeMenu, locationNames, handleLogoClick, loadingItems, refreshItem]);
  
  // Fungsi untuk fetch stats lengkap
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      
      const [
        burungnesiaResponse,
        kupunesiaResponse,
        fobiResponse,
        totalSpeciesResponse,
        totalContributorsResponse
      ] = await Promise.all([
        apiFetch('/burungnesia-count', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        apiFetch('/kupunesia-count', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        apiFetch('/fobi-count', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        apiFetch('/total-species'),
        apiFetch('/total-contributors')
      ]);

      const burungnesiaData = await burungnesiaResponse.json();
      const kupunesiaData = await kupunesiaResponse.json();
      const fobiData = await fobiResponse.json();
      const totalSpeciesData = await totalSpeciesResponse.json();
      const totalContributorsData = await totalContributorsResponse.json();

      return {
        burungnesia: burungnesiaData.burungnesiaCount,
        kupunesia: kupunesiaData.kupunesiaCount,
        fobi: fobiData.fobiCount,
        observasi: burungnesiaData.burungnesiaCount + kupunesiaData.kupunesiaCount + fobiData.fobiCount,
        spesies: totalSpeciesData.totalSpecies,
        kontributor: totalContributorsData.totalContributors,
        fotoAudio: 0
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
  };
  
  // Modifikasi fungsi handleClose untuk tidak mereset polygon saat sidebar ditutup
  const handleClose = useCallback(() => {
    // Panggil onClose yang diteruskan dari parent
    if (onClose) {
      // Panggil onClose dengan parameter false untuk menandakan jangan reset polygon
      onClose(false); // Ubah parameter menjadi false
    }
  }, [onClose]);
  
  // Fungsi untuk menghapus filter polygon dan mereset stats
  const handleRemoveFilter = useCallback(() => {
    // Fetch stats lengkap di background
    fetchStats().then(stats => {
      if (stats && setStats) {
        // Update stats sebelum menutup sidebar
        setStats(stats);
        
        // Kemudian panggil onClose dengan parameter true untuk reset polygon
        if (onClose) {
          onClose(true);
        }
      } else {
        // Jika gagal fetch stats, tetap panggil onClose
        if (onClose) {
          onClose(true);
        }
      }
    });
  }, [onClose, setStats]);
  
  return (
    <div 
      className="fixed inset-0 z-[1002] bg-black/50 md:bg-transparent md:relative md:inset-auto md:w-96 md:h-full md:z-[999] transition-all duration-300 ease-in-out"
      style={{
        transform: data.isOpen ? 'translateX(0)' : 'translateX(-100%)',
        opacity: data.isOpen ? 1 : 0,
        pointerEvents: data.isOpen ? 'auto' : 'none'
      }}
    >
      {/* Tombol Close Floating untuk Mobile */}
      <button
        onClick={handleClose}
        className="fixed left-2 top-1/2 transform -translate-y-1/2 z-[1003] bg-[#1e1e1e] hover:bg-[#2c2c2c] text-white p-3 rounded-full shadow-lg md:hidden"
        aria-label="Tutup sidebar"
      >
        <FontAwesomeIcon icon={faArrowLeft} />
      </button>

      {/* Container dengan background color */}
      <div className="h-full w-full bg-[#1e1e1e] p-2 box-border text-white text-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center py-2 px-1 border-b border-[#444] mb-2">
          <h2 className="font-bold">Detail Observasi</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClose}
              className="hover:text-gray-200"
              aria-label="Tutup"
            >
          <FontAwesomeIcon icon={faXmark} />
        </button>
          </div>
        </div>
        
        {/* Tambahkan tombol untuk menghapus polygon */}
        <div className="mb-2 p-2 bg-[#2c2c2c] rounded">
          <div className="flex justify-between items-center">
            <span>Filter Polygon Aktif</span>
            <button 
              onClick={handleRemoveFilter} // Gunakan fungsi baru untuk menghapus filter
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
              aria-label="Hapus filter polygon"
            >
              Hapus Filter
            </button>
          </div>
      </div>
      
        {/* Queue Status */}
        {(loadingQueue.length > 0 || processingQueue) && (
          <div className="p-2 bg-[#2c2c2c] rounded mb-2 text-xs">
            <div className="flex justify-between items-center">
              <span>
                Memuat data: {loadingQueue.length} grid, {allObservations.length} observasi dimuat
              </span>
              <div className="w-3 h-3 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
            </div>
          </div>
        )}
        
        {/* Content dengan infinite scroll */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 relative p-2"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            height: 'calc(100vh - 60px)'
          }}
        >
          {initialLoading || (loadingQueue.length > 0 && allObservations.length === 0) ? (
            <SkeletonLoader count={5} />
          ) : (
            <>
              <div className="space-y-3">
                {visibleObservations.map((observation) => (
                  <div key={observation.uniqueId}>
                    {renderObservationCard(observation)}
          </div>
                ))}
          </div>

              {/* Loading More Skeleton */}
              {(processingQueue || isLoadingMore) && (
                <div className="mt-4">
                  <SkeletonLoader count={2} />
        </div>
      )}
      
              {/* Load More Button (fallback jika scroll tidak berfungsi) */}
              {!processingQueue && !isLoadingMore && hasMore && visibleObservations.length > 0 && (
                <div className="text-center py-4">
                  <button
                    onClick={loadMore}
                    className="bg-[#1a73e8] hover:bg-[#0d47a1] text-white px-4 py-2 rounded"
                  >
                    Muat lebih banyak
                  </button>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!initialLoading && allObservations.length === 0 && (
            <div className="p-4 text-center text-gray-200">
              Tidak ada data observasi
            </div>
          )}
        </div>

        {/* Modal spesies */}
        <SpeciesModal />
      </div>
    </div>
  );
});

PolygonSidebar.displayName = 'PolygonSidebar'; 