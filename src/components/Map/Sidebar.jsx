import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEllipsisV, faSync, faArrowLeft, faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { getSourceLogo } from '../../utils/mapHelpers';
import { useNavigate } from 'react-router-dom';
import { MediaSlider } from './MediaSlider';
import { queueLocationName } from '../../utils/geocoding';
import { apiFetch } from '../../utils/api';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { debounce } from 'lodash';
import { SkeletonLoader } from './SkeletonLoader';

// Konstanta untuk optimasi
const ITEMS_PER_PAGE = 5; // Hanya 5 item per halaman
const BATCH_SIZE = 2; 
const BATCH_DELAY = 1000;
const MAX_RETRIES = 3;

// Cache untuk lokasi
const locationCache = {};

export const Sidebar = React.memo(({ data, onClose, onLoadMore }) => {
  const { selectedGrid, species, currentPage, loading, error, checklist } = data;
  
  // Gunakan ITEMS_PER_PAGE yang lebih kecil
  const paginatedData = useMemo(() => {
    return selectedGrid?.data?.slice(0, currentPage * ITEMS_PER_PAGE) || [];
  }, [selectedGrid, currentPage]);
  
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [locationNames, setLocationNames] = useState({});
  const [itemData, setItemData] = useState({});
  const [loadingItems, setLoadingItems] = useState({});
  const [retryCount, setRetryCount] = useState({});
  const [fetchQueue, setFetchQueue] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [locationQueue, setLocationQueue] = useState([]);
  const [processingLocation, setProcessingLocation] = useState(false);
  
  // Ref untuk scroll container
  const scrollContainerRef = useRef(null);

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

  // Optimasi close handler
  const handleClose = useCallback(() => {
    if (onClose) {
      // Langsung tutup sidebar
      onClose();
      
      // Fetch stats lengkap di background
      fetchStats().then(stats => {
        if (stats) {
          // Update stats setelah sidebar tertutup
          setTimeout(() => {
            onClose(stats);
          }, 100);
        }
      });
    }
  }, [onClose]);

  // Fungsi untuk infinite scroll dengan optimasi
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // Threshold lebih besar untuk memuat lebih awal
    const threshold = 200;
    const shouldLoadMore = scrollHeight - scrollTop - threshold <= clientHeight;
    
    if (shouldLoadMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [loading, onLoadMore]);

  // Force scroll overflow selalu aktif
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Tambahkan konten dummy untuk memastikan overflow selalu ada
      const ensureScroll = () => {
        const container = scrollContainerRef.current;
        if (container) {
          // Cek apakah overflow sudah aktif
          const hasOverflow = container.scrollHeight > container.clientHeight;
          
          // Jika tidak ada overflow dan ada data, tambahkan padding
          if (!hasOverflow && paginatedData.length > 0) {
            container.style.paddingBottom = '100vh';
          } else if (paginatedData.length === 0) {
            container.style.paddingBottom = '0';
          }
        }
      };
      
      ensureScroll();
      
      // Jalankan lagi setelah render
      const timer = setTimeout(ensureScroll, 500);
      return () => clearTimeout(timer);
    }
  }, [paginatedData]);

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  const handleImageClick = (index, e) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === index ? null : index);
  };
  
  // Fungsi untuk format tanggal
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Tanggal tidak tersedia';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('id-ID', options);
    } catch (e) {
      return dateString;
    }
  }, []);
  
  // Fungsi untuk navigasi ke detail checklist
  const handleLogoClick = useCallback((item, newTab = true) => {
    let prefix = '';
    let url;
    const baseId = item.id
      .replace(/^(fobi_[bkt]_)/, '')
      .replace(/^(brn_|kpn_)/, '');

    // Cek sumber data dan set prefix
    if (item.source === 'burungnesia' || item.source === 'burungnesia_fobi' || item.id.startsWith('fobi_b_')) {
        prefix = 'BN';
    } else if (item.source === 'kupunesia' || item.source === 'kupunesia_fobi' || item.id.startsWith('fobi_k_')) {
        prefix = 'KP';
    }

    // Tentukan URL berdasarkan sumber data
    if (item.source === 'taxa_fobi' || item.id.startsWith('fobi_t_')) {
        url = `/observations/${baseId}`;
    } else if (item.source?.includes('fobi')) {
        url = `/detail-checklist/${prefix}${baseId}`;
    } else {
        // Untuk data non-FOBI (burungnesia dan kupunesia biasa)
        url = `/app-checklist/${prefix}${baseId}`;
    }

    if (newTab) {
        window.open(url, '_blank');
    } else {
        navigate(url);
        onClose();
    }
  }, [navigate, onClose]);
  
  // Fungsi untuk refresh data item
  const refreshItem = useCallback((item) => {
    if (!item || !item.id) return;
    
    // Hapus dari cache
    const rawId = item.checklist_id || item.id;
    let endpoint = '';
    
    if (item.source?.includes('burungnesia')) {
      endpoint = `/grid-species/brn_${rawId}`;
    } else if (item.source?.includes('kupunesia')) {
      endpoint = `/grid-species/kpn_${rawId}`;
    } else if (item.source?.includes('fobi')) {
      const sourceType = item.source.includes('burungnesia') ? 'burungnesia_fobi' : 
                        item.source.includes('kupunesia') ? 'kupunesia_fobi' : 'taxa_fobi';
      
      const fobiId = item.id.startsWith('fobi_') ? item.id : 
                    item.source.includes('burungnesia') ? `fobi_b_${rawId}` : 
                    item.source.includes('kupunesia') ? `fobi_k_${rawId}` : `fobi_t_${rawId}`;
      
      endpoint = `/fobi-species/${fobiId}/${sourceType}`;
    }
    
    if (endpoint) {
      const cacheKey = `species_${endpoint}`;
      localStorage.removeItem(cacheKey);
    }
    
    // Hapus dari state
    setItemData(prev => {
      const newState = { ...prev };
      delete newState[item.id];
      return newState;
    });
    
    // Reset loading state
    setLoadingItems(prev => ({
      ...prev,
      [item.id]: false
    }));
    
    // Reset retry count
    setRetryCount(prev => {
      const newState = { ...prev };
      delete newState[item.id];
      return newState;
    });
    
    // Tambahkan ke queue untuk fetch ulang
    setFetchQueue(prev => [...prev, item]);
  }, []);

  // Fungsi untuk fetch data spesies untuk setiap item dengan retry logic
  const fetchItemData = useCallback(async (item, retry = 0) => {
    if (!item || !item.id || itemData[item.id]) return;
    
    try {
      setLoadingItems(prev => ({ ...prev, [item.id]: true }));
      
      const rawId = item.checklist_id || item.id;
      let endpoint = '';
      let sourceType = '';
      
      // Perbaikan format endpoint untuk FOBI
      if (item.source?.includes('fobi')) {
        // Tentukan tipe sumber data FOBI
        if (item.source.includes('burungnesia')) {
          sourceType = 'burungnesia_fobi';
        } else if (item.source.includes('kupunesia')) {
          sourceType = 'kupunesia_fobi';
        } else {
          sourceType = 'taxa_fobi';
        }
        
        // Format ID FOBI dengan benar
        let fobiId = rawId;
        if (!fobiId.startsWith('fobi_')) {
          if (sourceType === 'burungnesia_fobi') {
            fobiId = `fobi_b_${rawId}`;
          } else if (sourceType === 'kupunesia_fobi') {
            fobiId = `fobi_k_${rawId}`;
          } else {
            fobiId = `fobi_t_${rawId}`;
          }
        }
        
        endpoint = `/fobi-species/${fobiId}/${sourceType}`;
      } else if (item.source?.includes('burungnesia')) {
        endpoint = `/grid-species/brn_${rawId}`;
      } else if (item.source?.includes('kupunesia')) {
        endpoint = `/grid-species/kpn_${rawId}`;
      }
      
      if (!endpoint) return;
      
      // Gunakan cache untuk mengurangi request
      const cacheKey = `species_${endpoint}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          setItemData(prev => ({
            ...prev,
            [item.id]: parsedData
          }));
          setLoadingItems(prev => ({ ...prev, [item.id]: false }));
          return;
        } catch (e) {
          // Jika parsing gagal, hapus cache yang rusak
          localStorage.removeItem(cacheKey);
        }
      }
      
      const response = await apiFetch(endpoint);
      const responseData = await response.json();
      
      if (responseData.error) {
        throw new Error(responseData.error);
      }
      
      // Normalisasi data berdasarkan sumber
      let normalizedData = {
        checklist: {},
        species: []
      };
      
      // Untuk FOBI, struktur data mungkin berbeda
      if (item.source?.includes('fobi')) {
        // Jika responseData.species adalah array, gunakan itu
        if (Array.isArray(responseData.species)) {
          normalizedData.species = responseData.species.map(s => ({
            nameLat: s.scientific_name || s.nameLat,
            nameId: s.common_name || s.nameId,
            count: s.count || 1,
            id: s.id
          }));
          normalizedData.checklist = responseData.checklist || {};
        } 
        // Jika responseData sendiri adalah array, mungkin itu adalah daftar spesies
        else if (Array.isArray(responseData)) {
          normalizedData.species = responseData.map(s => ({
            nameLat: s.scientific_name || s.nameLat,
            nameId: s.common_name || s.nameId,
            count: s.count || 1,
            id: s.id
          }));
          // Gunakan item sebagai checklist data
          normalizedData.checklist = {
            id: item.id,
            observer: item.observer || 'Tidak diketahui',
            date: item.date || null,
            latitude: item.latitude,
            longitude: item.longitude
          };
        }
        // Jika responseData adalah objek dengan data spesies di dalamnya
        else if (responseData.data && Array.isArray(responseData.data)) {
          normalizedData.species = responseData.data.map(s => ({
            nameLat: s.scientific_name || s.nameLat,
            nameId: s.common_name || s.nameId,
            count: s.count || 1,
            id: s.id
          }));
          normalizedData.checklist = responseData.checklist || {
            id: item.id,
            observer: item.observer || 'Tidak diketahui',
            date: item.date || null,
            latitude: item.latitude,
            longitude: item.longitude
          };
        }
        // Fallback jika tidak ada struktur yang cocok
        else {
          normalizedData.species = [];
          normalizedData.checklist = {
            id: item.id,
            observer: item.observer || 'Tidak diketahui',
            date: item.date || null,
            latitude: item.latitude,
            longitude: item.longitude
          };
        }
      } else {
        // Untuk Burungnesia dan Kupunesia, gunakan format standar
        normalizedData = {
          checklist: responseData.checklist || {},
          species: Array.isArray(responseData.species) ? responseData.species : []
        };
      }
      
      // Simpan ke cache
      localStorage.setItem(cacheKey, JSON.stringify(normalizedData));
      
      // Simpan data ke state
      setItemData(prev => ({
        ...prev,
        [item.id]: normalizedData
      }));
      
      // Reset loading state
      setLoadingItems(prev => ({
        ...prev,
        [item.id]: false
      }));
      
      // Reset retry count
      setRetryCount(prev => {
        const newState = { ...prev };
        delete newState[item.id];
        return newState;
      });
      
    } catch (error) {
      console.error('Error fetching item data:', error);
      
      // Increment retry count
      const currentRetry = retryCount[item.id] || 0;
      setRetryCount(prev => ({
        ...prev,
        [item.id]: currentRetry + 1
      }));
      
      // Retry with exponential backoff if under max retries
      if (currentRetry < MAX_RETRIES) {
        console.log(`Retrying fetch for item ${item.id}, attempt ${currentRetry + 1}`);
        const backoffTime = Math.pow(2, currentRetry) * 1000; // Exponential backoff
        
        setTimeout(() => {
          setFetchQueue(prev => [...prev, item]);
        }, backoffTime);
      } else {
        // Max retries reached, set error state
        setLoadingItems(prev => ({ ...prev, [item.id]: false }));
      }
    }
  }, [itemData, retryCount]);
  
  // Effect untuk fetch lokasi
  useEffect(() => {
    if (paginatedData && paginatedData.length > 0) {
      paginatedData.forEach((item, index) => {
        const lat = item.latitude;
        const lng = item.longitude;
        
        if (!lat || !lng) return;
        
        // Cek apakah sudah ada di cache
        const cacheKey = `${lat},${lng}`;
        
        if (locationCache[cacheKey]) {
          setLocationNames(prev => ({
            ...prev,
            [index]: locationCache[cacheKey]
          }));
          return;
        }
        
        // Cek localStorage
        const storedLocation = localStorage.getItem(`location_${cacheKey}`);
        if (storedLocation) {
          locationCache[cacheKey] = storedLocation;
          setLocationNames(prev => ({
            ...prev,
            [index]: storedLocation
          }));
          return;
        }
        
        // Tambahkan ke queue untuk geocoding
        setLocationQueue(prev => {
          if (prev.some(item => item.index === index)) return prev;
          return [...prev, { lat, lng, index }];
        });
      });
    }
  }, [paginatedData]);
  
  // Processor untuk queue lokasi
  useEffect(() => {
    const processLocationQueue = async () => {
      if (locationQueue.length === 0 || processingLocation) return;
      
      setProcessingLocation(true);
      
      // Ambil item pertama dari queue
      const [item, ...rest] = locationQueue;
      setLocationQueue(rest);
      
      try {
        // Gunakan bahasa Indonesia untuk geocoding
        const locationName = await queueLocationName(item.lat, item.lng, 'id');
        
        // Simpan ke cache
        locationCache[`${item.lat},${item.lng}`] = locationName;
        try {
          localStorage.setItem(`location_${item.lat},${item.lng}`, locationName);
        } catch (e) {
          console.warn('Failed to cache location:', e);
        }
        
        setLocationNames(prev => ({
          ...prev,
          [item.index]: locationName
        }));
      } catch (error) {
        console.error('Error fetching location name:', error);
      } finally {
        setProcessingLocation(false);
        
        // Delay sebelum item berikutnya untuk menghindari rate limit
        if (locationQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };
    
    processLocationQueue();
  }, [locationQueue, processingLocation]);
  
  // Effect untuk fetch data untuk setiap item yang terlihat
  useEffect(() => {
    if (paginatedData && paginatedData.length > 0) {
      // Cek item yang belum di-fetch
      const itemsToFetch = paginatedData.filter(
        item => !itemData[item.id] && !loadingItems[item.id]
      );
      
      if (itemsToFetch.length > 0) {
        // Tambahkan ke queue
        setFetchQueue(prev => [...prev, ...itemsToFetch]);
      }
    }
  }, [paginatedData, itemData, loadingItems]);
  
  // Processor untuk fetch queue
  useEffect(() => {
    const processFetchQueue = async () => {
      if (fetchQueue.length === 0 || isFetching) return;
      
      setIsFetching(true);
      
      try {
        // Ambil batch dari queue
        const batch = fetchQueue.slice(0, BATCH_SIZE);
        setFetchQueue(prev => prev.slice(BATCH_SIZE));
        
        // Fetch semua item dalam batch secara parallel
        await Promise.all(batch.map(item => fetchItemData(item)));
        
        // Delay sebelum batch berikutnya
        if (fetchQueue.length > BATCH_SIZE) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      } finally {
        setIsFetching(false);
      }
    };
    
    processFetchQueue();
  }, [fetchQueue, isFetching, fetchItemData]);
  
  // Render observation card
  const renderObservationCard = useCallback((item, index) => {
    const isExpanded = expandedItems[index];
    const isItemLoading = loadingItems[item.id] || false;
    
    // Get data for this item
    const itemDataValue = itemData[item.id] || {};
    const checklistData = itemDataValue.checklist || {};
    const speciesData = itemDataValue.species || [];
    
    // Get location name or coordinates
    const locationDisplay = locationNames[index] || 
      `${item.latitude}, ${item.longitude}`;

    // Dapatkan tanggal dari berbagai sumber yang mungkin
    const observationDate = 
      checklistData.tgl_pengamatan || 
      checklistData.observation_date || 
      checklistData.created_at || 
      checklistData.date ||
      item.date || 
      'Tanggal tidak tersedia';

    // Dapatkan nama pengamat dari berbagai sumber yang mungkin
    const observerName = 
      checklistData.observer_name || 
      checklistData.observer || 
      checklistData.user_name || 
      item.observer || 
      'Tidak diketahui';

    return (
      <div 
        key={index} 
        className={`mb-3 p-3 rounded-md relative ${isExpanded ? 'bg-[#2c2c2c]' : 'bg-[#2c2c2c]'}`}
      >
        <div 
          className="flex justify-between items-start cursor-pointer"
          onClick={() => toggleExpand(index)}
        >
          <div className="flex-1">
            <h3 className="font-bold">{locationDisplay}</h3>
            <p className="text-xs text-gray-200">
              Pengamat: {observerName}
            </p>
            <p className="text-xs text-gray-200">
              Tanggal: {formatDate(observationDate)}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex flex-col items-center">
              <img 
                src={getSourceLogo(item.source)} 
                alt={item.source} 
                className="w-12 h-12 rounded-md cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogoClick(item, true);
                }}
              />
              <div 
                className="flex items-center mt-1 px-2 py-1 bg-[#1a73e8] rounded-md cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(index);
                }}
              >
                <span className="mr-1">{speciesData.length || 0} Spesies</span>
                <FontAwesomeIcon 
                  icon={isExpanded ? faChevronUp : faChevronDown} 
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  refreshItem(item);
                }}
                className="text-gray-200 hover:text-white p-1"
                disabled={isItemLoading}
                title="Refresh data"
              >
                <FontAwesomeIcon 
                  icon={faSync} 
                  className={isItemLoading ? 'animate-spin' : ''}
                />
              </button>
            <button 
              onClick={(e) => handleImageClick(index, e)}
                className="text-gray-200 hover:text-white p-1"
                title="Menu"
            >
                <FontAwesomeIcon icon={faEllipsisV} />
            </button>
            </div>
          </div>
        </div>
        
        {/* Species List */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-[#444]">
            {isItemLoading ? (
              <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            ) : speciesData.length === 0 ? (
              <p className="text-center text-gray-200">
                Tidak ada data spesies
              </p>
            ) : (
              speciesData.map((species, idx) => (
                <div key={idx} className="mb-3 pb-3 border-b border-[#444] last:border-0">
                  <h4 className="font-medium flex items-center">
                    <span className="text-white">{species.nameLat}</span>
                    {species.nameId && (
                      <span className="text-gray-200 text-sm ml-2">
                        {species.nameId}
                      </span>
                    )}
                  </h4>
                  {species.count && (
                    <p className="text-sm text-gray-200 mt-1">
                      Jumlah: {species.count}
                    </p>
                  )}
                  {species.notes && (
                    <p className="text-sm text-gray-300 mt-1">
                      {species.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Context Menu */}
        {activeMenu === index && (
          <div className="absolute right-3 mt-1 w-32 bg-[#1e1e1e] shadow-lg rounded-md overflow-hidden z-10 border border-[#444]">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLogoClick(item, true);
              }}
              className="w-full text-left px-4 py-2 text-gray-200 hover:bg-[#2c2c2c]"
            >
              Buka di tab baru
            </button>
          </div>
        )}
      </div>
    );
  }, [expandedItems, activeMenu, itemData, loadingItems, locationNames, handleLogoClick, refreshItem, formatDate, toggleExpand, handleImageClick]);

  React.useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  return (
    <div
      className="fixed md:relative top-0 right-0 w-full md:w-[400px] h-[100vh] bg-[#1e1e1e] p-2 box-border text-white text-sm z-[1002] flex flex-col"
      style={{ 
        height: '100vh',
        overflowY: 'hidden'
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

      {/* Header */}
      <div className="flex justify-between items-center py-2 px-1 border-b border-[#444] mb-2">
        <h2 className="font-bold">Detail Observasi</h2>
        <button
          onClick={handleClose}
          className="hidden md:block hover:text-gray-200"
          aria-label="Tutup"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {/* Queue Status */}
      {(fetchQueue.length > 0 || locationQueue.length > 0) && (
        <div className="p-2 bg-[#2c2c2c] rounded mb-2 text-xs">
          <div className="flex justify-between items-center">
            <span>
              Memuat data: {fetchQueue.length} item, {locationQueue.length} lokasi dalam antrian
            </span>
            <div className="w-3 h-3 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
          </div>
        </div>
      )}

      {/* Content dengan Skeleton Loading */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-scroll min-h-0 relative"
        onScroll={handleScroll}
        style={{ 
          WebkitOverflowScrolling: 'touch',
          height: 'calc(100vh - 60px)',
          overflowY: 'scroll'
        }}
      >
        {loading && paginatedData.length === 0 ? (
          // Tampilkan skeleton loader saat initial loading
          <SkeletonLoader count={5} />
        ) : (
          <div className="space-y-3">
            {paginatedData.map((item, index) => (
              <div key={index} className="relative">
                {renderObservationCard(item, index)}
              </div>
            ))}

            {/* Loading More Skeleton */}
            {loading && paginatedData.length > 0 && (
              <SkeletonLoader count={2} />
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && paginatedData.length === 0 && (
          <div className="p-4 text-center text-gray-200">
            Tidak ada data observasi
          </div>
        )}
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar'; 