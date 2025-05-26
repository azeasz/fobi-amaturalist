import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThLarge, faThList, faMap } from '@fortawesome/free-solid-svg-icons';
import GridView from './GridView';
import ListView from './ListView';
import MapView from './MapView';
import StatsBar from './StatsBar';
import { apiFetch } from '../../utils/api';
import { debounce } from 'lodash';
import SpeciesMapOverlay from '../SpeciesMapOverlay';
import Header from '../Header';
import { defaultMapConfig } from '../../utils/mapHelpers';

const HomePage = ({ searchParams, filterParams, onSearch }) => {
  const [view, setView] = useState(() => {
    return localStorage.getItem('viewMode') || 'map';
  });
  const [loading, setLoading] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [stats, setStats] = useState(() => {
    // Coba ambil stats dari localStorage
    const savedStats = localStorage.getItem('currentStats');
    return savedStats ? JSON.parse(savedStats) : {
      burungnesia: 0,
      kupunesia: 0,
      fobi: 0,
      observasi: 0,
      spesies: 0,
      kontributor: 0,
    };
  });
  
  // Tambahkan state untuk menyimpan statistik terakhir dari setiap tampilan
  const [lastViewStats, setLastViewStats] = useState({
    map: null,
    grid: null,
    list: null
  });
  
  // Tambahkan flag untuk menandai bahwa view sedang berubah
  const isViewChanging = useRef(false);
  
  // Tambahkan flag untuk mencegah fetch stats saat pertama kali load setelah view change
  const skipInitialStatsFetch = useRef(false);
  
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [zoom, setZoom] = useState(5);
  const mapRef = useRef(null);
  const [mapResetHandler, setMapResetHandler] = useState(null);
  
  // State untuk menyimpan polygon aktif
  const [activePolygon, setActivePolygon] = useState(() => {
    // Coba ambil polygon dari localStorage
    const savedPolygon = localStorage.getItem('activePolygon');
    return savedPolygon ? JSON.parse(savedPolygon) : null;
  });

  // State untuk menyimpan filter terpusat
  const [centralizedFilters, setCentralizedFilters] = useState({
    search: searchParams?.query || '',
    polygon: null,
    start_date: filterParams?.start_date || null,
    end_date: filterParams?.end_date || null,
    latitude: null,
    longitude: null,
    radius: 10,
    grade: filterParams?.grade || [],
    data_source: filterParams?.data_source || ['burungnesia', 'kupunesia', 'fobi'],
    has_media: filterParams?.has_media || false,
    media_type: filterParams?.media_type || null
  });

  // Effect untuk menginisialisasi lastViewStats saat komponen pertama kali dimuat
  useEffect(() => {
    // Inisialisasi lastViewStats dengan nilai stats saat ini untuk semua tampilan
    const initialStats = {
      map: stats,
      grid: stats,
      list: stats
    };
    setLastViewStats(initialStats);
    
    // Simpan ke localStorage untuk debugging
    localStorage.setItem('lastViewStats', JSON.stringify(initialStats));
  }, []); // Hanya dijalankan sekali saat komponen mount

  // Effect untuk menyimpan stats ke localStorage saat berubah
  useEffect(() => {
    // Simpan stats saat ini ke localStorage
    localStorage.setItem('currentStats', JSON.stringify(stats));
    
    // Simpan stats untuk tampilan saat ini jika tidak sedang berubah view
    if (!isViewChanging.current) {
      console.log(`Menyimpan statistik untuk tampilan ${view}:`, stats);
      
      // Update lastViewStats untuk tampilan saat ini
      setLastViewStats(prev => {
        const updated = {
          ...prev,
          [view]: stats
        };
        
        // Simpan ke localStorage untuk debugging
        localStorage.setItem('lastViewStats', JSON.stringify(updated));
        
        return updated;
      });
    }
  }, [stats, view]);
  
  // Effect untuk menyimpan polygon ke localStorage saat berubah
  useEffect(() => {
    if (activePolygon) {
      localStorage.setItem('activePolygon', JSON.stringify(activePolygon));
      
      // Update centralized filters dengan polygon
      setCentralizedFilters(prev => ({
        ...prev,
        polygon: formatPolygonForApi(activePolygon)
      }));
    } else {
      localStorage.removeItem('activePolygon');
      
      // Hapus polygon dari centralized filters
      setCentralizedFilters(prev => ({
        ...prev,
        polygon: null
      }));
    }
  }, [activePolygon]);

  // Fungsi untuk memformat polygon untuk API
  const formatPolygonForApi = (polygon) => {
    if (!polygon) return null;
    
    if (polygon.type === 'Polygon') {
      // Format: lng1,lat1|lng2,lat2|lng3,lat3...
      return polygon.coordinates[0]
        .map(coord => `${coord[0]},${coord[1]}`)
        .join('|');
    } else if (polygon.type === 'Circle') {
      // Untuk circle, kita perlu mengkonversi ke polygon
      // Ini adalah pendekatan sederhana, bisa dioptimalkan
      const { center, radius } = polygon;
      const points = [];
      const numPoints = 32; // Jumlah titik untuk membuat lingkaran
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const lng = center[0] + (radius / 111320 * Math.cos(angle)) / Math.cos(center[1] * Math.PI / 180);
        const lat = center[1] + (radius / 111320 * Math.sin(angle));
        points.push(`${lng},${lat}`);
      }
      
      // Tutup polygon dengan menambahkan titik pertama di akhir
      points.push(points[0]);
      
      return points.join('|');
    }
    
    return null;
  };

  // Effect untuk update centralized filters saat searchParams atau filterParams berubah
  useEffect(() => {
    setCentralizedFilters(prev => ({
      ...prev,
      search: searchParams?.query || '',
      start_date: filterParams?.start_date || null,
      end_date: filterParams?.end_date || null,
      grade: filterParams?.grade || [],
      data_source: filterParams?.data_source || ['burungnesia', 'kupunesia', 'fobi'],
      has_media: filterParams?.has_media || false,
      media_type: filterParams?.media_type || null
    }));
  }, [searchParams, filterParams]);

  // Fetch markers saat komponen mount
  useEffect(() => {
    const fetchMarkers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('jwt_token');
        const [burungnesiaRes, kupunesiaRes] = await Promise.all([
          apiFetch('/markers', {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          apiFetch('/fobi-markers', {
            headers: { 'Authorization': `Bearer ${token}` },
          })
        ]);

        const burungnesiaData = await burungnesiaRes.json();
        const kupunesiaData = await kupunesiaRes.json();

        // Gabungkan dan tambahkan source untuk setiap marker
        const combinedMarkers = [
          ...burungnesiaData.map(marker => ({ ...marker, source: 'burungnesia' })),
          ...kupunesiaData.map(marker => ({ ...marker, source: 'kupunesia' }))
        ];

        setMarkers(combinedMarkers);
      } catch (error) {
        console.error('Error fetching markers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkers();
  }, []);

  // Effect untuk update markers saat filter atau search berubah
  useEffect(() => {
    if (markers.length > 0) {
      const filteredMarkers = markers.filter(marker => {
        // Filter berdasarkan searchParams
        if (searchParams?.query && typeof searchParams.query === 'string' && searchParams.query.trim() !== '') {
          const searchLower = searchParams.query.toLowerCase();
          const matchesSearch = 
            (marker.name?.toLowerCase().includes(searchLower)) ||
            (marker.location?.toLowerCase().includes(searchLower));
          if (!matchesSearch) return false;
        }

        // Filter berdasarkan filterParams
        if (filterParams?.data_source?.length > 0) {
          const sourceMatch = filterParams.data_source.some(source => {
            if (source === 'burungnesia') {
              return marker.source === 'burungnesia';
            }
            if (source === 'kupunesia') {
              return marker.source === 'kupunesia';
            }
            if (source === 'fobi') {
              return marker.source === 'fobi';
            }
            return false;
          });
          if (!sourceMatch) return false;
        }

        return true;
      });

      setMarkers(filteredMarkers);
    }
  }, [searchParams, filterParams]);

  const debouncedSearch = useCallback(
    debounce((value) => {
      onSearch(value);
    }, 500),
    []
  );

  const fetchStats = async () => {
    const token = localStorage.getItem('jwt_token');
    const cachedStats = localStorage.getItem('cachedStats');

    if (cachedStats) {
      setStats(JSON.parse(cachedStats));
      return;
    }

    try {
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

      const newStats = {
        burungnesia: burungnesiaData.burungnesiaCount,
        kupunesia: kupunesiaData.kupunesiaCount,
        fobi: fobiData.fobiCount,
        observasi: burungnesiaData.burungnesiaCount + kupunesiaData.kupunesiaCount + fobiData.fobiCount,
        spesies: totalSpeciesData.totalSpecies,
        kontributor: totalContributorsData.totalContributors,
        fotoAudio: 0
      };

      setStats(newStats);
      localStorage.setItem('cachedStats', JSON.stringify(newStats));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (searchParams) {
      console.log('Search params received in HomePage:', searchParams);
    }
  }, [searchParams]);

  const resetStats = () => {
    fetchStats();
  };

  const fetchFilteredStats = async (params) => {
    try {
      // Jika ini adalah reset, log untuk debugging
      if (params?.isReset) {
        console.log('HomePage: fetchFilteredStats dipanggil dari handleReset');
      }
      
      // Hapus flag isReset dari params sebelum mengirim ke API
      const apiParams = {...params};
      delete apiParams.isReset;
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?${new URLSearchParams(apiParams)}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        // Simpan stats ke localStorage untuk digunakan oleh komponen lain
        localStorage.setItem('currentStats', JSON.stringify(data.stats));
        console.log('HomePage: Stats diperbarui setelah filter:', data.stats);
      }
    } catch (error) {
      console.error('Error fetching filtered stats:', error);
    }
  };

  const fetchDefaultStats = async () => {
    try {
      console.log('HomePage: Memanggil fetchDefaultStats untuk mendapatkan stats default');
      
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

      // Pastikan semua nilai ada dan valid
      const burungnesiaCount = burungnesiaData.burungnesiaCount || 0;
      const kupunesiaCount = kupunesiaData.kupunesiaCount || 0;
      const fobiCount = fobiData.fobiCount || 0;
      const totalObservasi = burungnesiaCount + kupunesiaCount + fobiCount;
      const totalSpecies = totalSpeciesData.totalSpecies || 0;
      const totalContributors = totalContributorsData.totalContributors || 0;

      const stats = {
        burungnesia: burungnesiaCount,
        kupunesia: kupunesiaCount,
        fobi: fobiCount,
        observasi: totalObservasi,
        spesies: totalSpecies,
        kontributor: totalContributors,
        fotoAudio: 0
      };
      
      console.log('HomePage: Stats default berhasil diambil:', stats);
      
      // Simpan stats ke localStorage
      localStorage.setItem('cachedStats', JSON.stringify(stats));
      localStorage.setItem('currentStats', JSON.stringify(stats));
      
      return stats;
    } catch (error) {
      console.error('Error fetching default stats:', error);
      
      // Coba ambil dari localStorage jika ada
      const cachedStats = localStorage.getItem('cachedStats');
      if (cachedStats) {
        console.log('HomePage: Menggunakan cachedStats dari localStorage karena error:', JSON.parse(cachedStats));
        return JSON.parse(cachedStats);
      }
      
      return null;
    }
  };

  const handleReset = useCallback((params = {}) => {
    console.log('HomePage: handleReset dipanggil dengan params:', params);
    
    // Simpan timestamp reset filter ke localStorage
    localStorage.setItem('lastFilterResetTime', new Date().getTime().toString());
    
    // Reset search dan filter params
    if (onSearch) {
      onSearch(params);
    }
    
    // Reset centralized filters
    setCentralizedFilters({
      search: '',
      polygon: null,
      start_date: null,
      end_date: null,
      latitude: null,
      longitude: null,
      radius: 10,
      grade: [],
      data_source: ['burungnesia', 'kupunesia', 'fobi'],
      has_media: false,
      media_type: null
    });
    
    // Reset active polygon
    setActivePolygon(null);
    
    // Gunakan cachedStats dari localStorage jika tersedia
    const cachedStats = localStorage.getItem('cachedStats');
    if (cachedStats) {
      const statsData = JSON.parse(cachedStats);
      console.log('HomePage: Menggunakan cachedStats dari localStorage setelah reset:', statsData);
      setStats(statsData);
      localStorage.setItem('currentStats', cachedStats);
    } else {
      // Jika tidak ada cachedStats, fetch stats default
      console.log('HomePage: Tidak ada cachedStats, fetch stats default');
      
      // Definisikan fungsi fetch di dalam useCallback
      const fetchDefaultStatsForReset = async () => {
        try {
          const token = localStorage.getItem('jwt_token');
          const apiUrl = import.meta.env.VITE_API_URL;
          
          const [
            burungnesiaResponse,
            kupunesiaResponse,
            fobiResponse,
            totalSpeciesResponse,
            totalContributorsResponse
          ] = await Promise.all([
            fetch(`${apiUrl}/burungnesia-count`, {
              headers: { 'Authorization': `Bearer ${token}` },
            }),
            fetch(`${apiUrl}/kupunesia-count`, {
              headers: { 'Authorization': `Bearer ${token}` },
            }),
            fetch(`${apiUrl}/fobi-count`, {
              headers: { 'Authorization': `Bearer ${token}` },
            }),
            fetch(`${apiUrl}/total-species`),
            fetch(`${apiUrl}/total-contributors`)
          ]);

          const burungnesiaData = await burungnesiaResponse.json();
          const kupunesiaData = await kupunesiaResponse.json();
          const fobiData = await fobiResponse.json();
          const totalSpeciesData = await totalSpeciesResponse.json();
          const totalContributorsData = await totalContributorsResponse.json();

          const stats = {
            burungnesia: burungnesiaData.burungnesiaCount || 0,
            kupunesia: kupunesiaData.kupunesiaCount || 0,
            fobi: fobiData.fobiCount || 0,
            observasi: (burungnesiaData.burungnesiaCount || 0) + (kupunesiaData.kupunesiaCount || 0) + (fobiData.fobiCount || 0),
            spesies: totalSpeciesData.totalSpecies || 0,
            kontributor: totalContributorsData.totalContributors || 0,
            fotoAudio: 0
          };
          
          setStats(stats);
          localStorage.setItem('cachedStats', JSON.stringify(stats));
          localStorage.setItem('currentStats', JSON.stringify(stats));
        } catch (error) {
          console.error('Error fetching default stats for reset:', error);
        }
      };
      
      fetchDefaultStatsForReset();
    }
    
    // Trigger map reset jika dalam view map
    if (view === 'map' && mapRef.current) {
      mapRef.current.setView(defaultMapConfig.center, defaultMapConfig.zoom);
    }
  }, [view, onSearch, setStats, setActivePolygon, setCentralizedFilters]);

  const handleViewChange = (newView) => {
    // Jika view sama, tidak perlu melakukan apa-apa
    if (view === newView) return;
    
    console.log(`Beralih dari tampilan ${view} ke ${newView}`);
    
    // Set flag bahwa view sedang berubah
    isViewChanging.current = true;
    
    // Simpan statistik saat ini ke lastViewStats untuk view saat ini
    setLastViewStats(prev => {
      const updated = {
        ...prev,
        [view]: stats
      };
      
      // Simpan ke localStorage untuk debugging
      localStorage.setItem('lastViewStats', JSON.stringify(updated));
      
      return updated;
    });
    
    // Simpan view baru ke state dan localStorage
    setView(newView);
    localStorage.setItem('viewMode', newView);
    
    // Set flag untuk mencegah fetch stats saat pertama kali load
    skipInitialStatsFetch.current = true;
    
    // Simpan flag ke localStorage untuk diakses oleh GridView dan MapView
    localStorage.setItem('skipInitialStatsFetch', 'true');
    
    // Reset flag setelah 2 detik
    setTimeout(() => {
      isViewChanging.current = false;
      skipInitialStatsFetch.current = false;
      localStorage.removeItem('skipInitialStatsFetch');
    }, 2000);
  };

  // Tambahkan handler untuk species selection
  const handleSpeciesSelect = (species) => {
    setSelectedSpecies(species);
    // Reset stats ketika species berubah
    setStats({
      burungnesia: 0,
      kupunesia: 0,
      fobi: 0,
      observasi: 0,
      spesies: 0,
      kontributor: 0,
    });
  };

  // Tambahkan handler untuk polygon
  const handlePolygonChange = (polygon) => {
    setActivePolygon(polygon);
    
    // Jika polygon null, reset stats ke default
    if (!polygon) {
      // Fetch default stats
      fetchDefaultStats();
    }
  };

  // Handler untuk update bounds dan zoom
  const handleMapChange = (newBounds, newZoom) => {
    setBounds(newBounds);
    setZoom(newZoom);
  };

  // Fungsi untuk memastikan konsistensi statistik antara tampilan
  const syncStats = useCallback((newStats) => {
    console.log('syncStats dipanggil dengan:', newStats);
    
    // Simpan stats baru ke state
    setStats(newStats);
    
    // Perbarui lastViewStats untuk semua tampilan
    setLastViewStats({
      map: newStats,
      grid: newStats,
      list: newStats
    });
    
    // Simpan ke localStorage
    localStorage.setItem('currentStats', JSON.stringify(newStats));
    localStorage.setItem('lastViewStats', JSON.stringify({
      map: newStats,
      grid: newStats,
      list: newStats
    }));
    
    console.log('Statistik diperbarui dan disinkronkan untuk semua tampilan:', newStats);
  }, []);

  // Modifikasi handler untuk filter terpusat
  const handleFilterChange = (newFilters) => {
    setCentralizedFilters(prev => ({
      ...prev,
      ...newFilters
    }));
    
    // Jika ada perubahan pada filter lokasi, update juga di searchParams
    if (newFilters.latitude || newFilters.longitude || newFilters.radius) {
      const locationParams = {};
      if (newFilters.latitude) locationParams.latitude = newFilters.latitude;
      if (newFilters.longitude) locationParams.longitude = newFilters.longitude;
      if (newFilters.radius) locationParams.radius = newFilters.radius;
      
      if (onSearch) {
        onSearch({
          ...searchParams,
          ...locationParams
        });
      }
    }
  };

  return (
    <div>
      <Header 
        onSearch={onSearch} 
        setStats={syncStats}
        onMapReset={mapResetHandler}
        onFilterChange={handleFilterChange}
      />
      <div className="relative">
        <StatsBar
          stats={stats}
          onSearch={onSearch}
          searchParams={searchParams}
          filterParams={filterParams}
          setStats={syncStats}
          onSpeciesSelect={handleSpeciesSelect}
          selectedSpecies={selectedSpecies}
          onMapReset={mapResetHandler}
          onFilterChange={handleFilterChange}
        />
        <div className="flex justify-center md:justify-end md:absolute md:right-4 md:top-30 space-x-1 bg-none p-1 cursor-pointer z-50 text-white">
          <button 
            onClick={() => handleViewChange('map')}
            className={`p-2 ${view === 'map' ? 'bg-[#0d47a1]' : 'bg-[#1a73e8]'} hover:bg-[#333] shadow-inner`}
          >
            <FontAwesomeIcon icon={faMap} className="text-shadow-md" />
          </button>
          <button 
            onClick={() => handleViewChange('grid')}
            className={`p-2 ${view === 'grid' ? 'bg-[#0d47a1]' : 'bg-[#1a73e8]'} hover:bg-[#333] shadow-inner`}
          >
            <FontAwesomeIcon icon={faThLarge} className="text-shadow-md" />
          </button>
          <button 
            onClick={() => handleViewChange('list')}
            className={`p-2 ${view === 'list' ? 'bg-[#0d47a1]' : 'bg-[#1a73e8]'} hover:bg-[#333] shadow-inner`}
          >
            <FontAwesomeIcon icon={faThList} className="text-shadow-md" />
          </button>
        </div>
      </div>

      <div className="mt-0 relative overflow-hidden">
        {loading && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
            <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-3">
              <div className="w-5 h-5 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 text-sm">Memuat data...</span>
            </div>
          </div>
        )}

        {view === 'grid' || view === 'list' ? (
          <GridView
            searchParams={searchParams}
            filterParams={filterParams}
            view={view}
            setStats={syncStats}
            activePolygon={activePolygon}
            centralizedFilters={centralizedFilters}
          />
        ) : (
          <div className="relative w-full h-[calc(100vh-120px)]">
            {selectedSpecies ? (
              <div className="absolute inset-0 z-[900] flex">
                <SpeciesMapOverlay
                  species={selectedSpecies}
                  bounds={bounds}
                  zoomLevel={zoom}
                  setStats={syncStats}
                  onClose={() => setSelectedSpecies(null)}
                />
              </div>
            ) : (
              <MapView
                markers={markers}
                setStats={syncStats}
                searchParams={searchParams}
                filterParams={filterParams}
                setLoading={setLoading}
                onReset={handleReset}
                onMapChange={handleMapChange}
                mapRef={mapRef}
                setMapResetHandler={setMapResetHandler}
                activePolygon={activePolygon}
                onPolygonChange={handlePolygonChange}
                centralizedFilters={centralizedFilters}
                onFilterChange={handleFilterChange}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
