import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useMarkers } from '../../hooks/useMarkers';
import { useMapZoom } from '../../hooks/useMapZoom';
import { useSidebar } from '../../hooks/useSidebar';
import { useGridData } from '../../hooks/useGridData';
import { MapControls } from '../Map/MapControls';
import { MapOverlay } from '../Map/GridMarkers';
import { defaultMapConfig, redCircleIcon } from '../../utils/mapHelpers';
import { generateGrid, getGridType, GRID_SIZES } from '../../utils/gridHelpers';
import 'leaflet/dist/leaflet.css';
import './MapView.css';
import { ZoomHandler } from '../Map/ZoomHandler';
import { calculateZoomLevel } from '../../utils/geoHelpers';
import { throttle, debounce } from 'lodash';
import { Sidebar } from '../Map/Sidebar';
import SpeciesMapOverlay from '../SpeciesMapOverlay';
import DrawingTools from '../Map/DrawingTools';
import * as turf from '@turf/turf';
import { PolygonSidebar } from '../Map/PolygonSidebar';
import { apiFetch } from '../../utils/api';
import L from 'leaflet';
import { getVisibleGridType } from '../../utils/mapHelpers';


// Optimasi MapController dengan throttling
const MapController = ({ setVisibleBounds, setZoomLevel, setVisibleGrid }) => {
  const map = useMap();
  const updateRef = useRef(null);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    const updateMapState = throttle(() => {
      const currentZoom = map.getZoom();
      const bounds = map.getBounds();
      
      if (bounds && bounds._southWest && bounds._northEast) {
        setVisibleBounds(bounds);
      }
      
      setZoomLevel(currentZoom);

      // Gunakan getVisibleGridType dari mapHelpers untuk konsistensi
      const gridType = getVisibleGridType(currentZoom);
      setVisibleGrid(gridType);
    }, 100); // Kurangi throttle untuk initial load

    // Trigger initial update
    if (!initialLoadRef.current) {
      updateMapState();
      initialLoadRef.current = true;
    }

    map.on('moveend', updateMapState);
    map.on('zoomend', updateMapState);
    map.on('load', updateMapState);

    return () => {
      map.off('moveend', updateMapState);
      map.off('zoomend', updateMapState);
      map.off('load', updateMapState);
      updateMapState.cancel();
    };
  }, [map, setVisibleBounds, setZoomLevel, setVisibleGrid]);

  return null;
};

const MapView = ({ 
  searchParams, 
  filterParams, 
  setStats, 
  setLoading: setParentLoading, 
  onReset, 
  onMapChange, 
  mapRef, 
  setMapResetHandler, 
  activePolygon, 
  onPolygonChange,
  centralizedFilters,
  onFilterChange
}) => {
  const isMobile = window.innerWidth <= 768;

  // Custom Hooks
  const { mapMarkers, loading, filterMarkers, refreshMarkers, lastUpdate, currentShape, setCurrentShape } = useMarkers();
  const { gridData, updateGridData } = useGridData();
  const { currentZoom, handleZoom } = useMapZoom();
  const { sidebarData, toggleSidebar, loadMore } = useSidebar();

  const [visibleBounds, setVisibleBounds] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(5);
  const [visibleGrid, setVisibleGrid] = useState('large');
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  
  // Tambahkan state untuk drawing mode
  const [drawingMode, setDrawingMode] = useState(false);

  // State untuk species view
  const [speciesMarkers, setSpeciesMarkers] = useState([]);
  const isSpeciesView = Boolean(searchParams?.species);

  // State untuk polygon sidebar
  const [polygonSidebarData, setPolygonSidebarData] = useState({
    isOpen: false,
    gridsInPolygon: [],
    loading: false,
    shape: null
  });

  // State untuk menyimpan layer polygon yang aktif
  const [activePolygonLayer, setActivePolygonLayer] = useState(null);
  const polygonInitializedRef = useRef(false);
  const polygonStatsLoadedRef = useRef(false);
  
  // Tambahkan state untuk active shape
  const [activeShape, setActiveShape] = useState(null);
  
  // Flag untuk menandai apakah ini adalah load pertama
  const isInitialLoad = useRef(true);

  // Gabungkan loading state lokal dan parent
  const isLoading = localLoading || loading;

  // Effect untuk update loading state parent
  useEffect(() => {
    setParentLoading(isLoading);
  }, [isLoading, setParentLoading]);

  // Tambahkan gridSize calculation
  const gridType = getGridType(zoomLevel);
  const gridSize = GRID_SIZES[gridType];

  // Fungsi untuk membagi data ke dalam tiles
  const createTileIndex = useCallback((markers, bounds) => {
    if (!markers || !bounds) return new Map();
    
    const tileSize = 1; // 1 derajat per tile
    const tileIndex = new Map();

    markers.forEach(marker => {
      const lat = parseFloat(marker.latitude);
      const lng = parseFloat(marker.longitude);
      
      // Hitung tile key berdasarkan posisi
      const tileX = Math.floor(lng / tileSize);
      const tileY = Math.floor(lat / tileSize);
      const tileKey = `${tileX}:${tileY}`;

      if (!tileIndex.has(tileKey)) {
        tileIndex.set(tileKey, []);
      }
      tileIndex.get(tileKey).push(marker);
    });

    return tileIndex;
  }, []);

  // Modifikasi effect untuk update data dengan shape filtering
  useEffect(() => {
    const updateMap = async () => {
      if (!mapMarkers || !visibleBounds) return;

      setLocalLoading(true);
      try {
        // Gunakan centralizedFilters jika tersedia, jika tidak gunakan filterParams
        const effectiveFilters = centralizedFilters || filterParams;
        
        // Log untuk debugging
        console.log('MapView: Menggunakan filter:', effectiveFilters);
        
        // Gunakan activeShape untuk filtering
        const filteredMarkers = activeShape 
          ? filterMarkers(mapMarkers, effectiveFilters, searchParams, activeShape)
          : filterMarkers(mapMarkers, effectiveFilters, searchParams);
        
        const tileIndex = createTileIndex(filteredMarkers, visibleBounds);
        const visibleTiles = getVisibleTiles(visibleBounds, zoomLevel);
        const visibleMarkers = [];
        
        visibleTiles.forEach(tileKey => {
          const tileMarkers = tileIndex.get(tileKey) || [];
          visibleMarkers.push(...tileMarkers);
        });

        updateGridData(visibleMarkers, zoomLevel, visibleBounds);
        setLocalLoading(false);
      } catch (error) {
        console.error('Error updating map:', error);
        setLocalLoading(false);
      }
    };

    updateMap();
  }, [mapMarkers, visibleBounds, zoomLevel, filterParams, searchParams, activeShape, centralizedFilters]);

  // Helper function untuk mendapatkan visible tiles
  const getVisibleTiles = (bounds, zoom) => {
    if (!bounds) return [];

    const tileSize = 1; // 1 derajat per tile
    const tiles = new Set();

    const minLng = Math.floor(bounds.getWest() / tileSize);
    const maxLng = Math.ceil(bounds.getEast() / tileSize);
    const minLat = Math.floor(bounds.getSouth() / tileSize);
    const maxLat = Math.ceil(bounds.getNorth() / tileSize);

    for (let x = minLng; x <= maxLng; x++) {
      for (let y = minLat; y <= maxLat; y++) {
        tiles.add(`${x}:${y}`);
      }
    }

    return Array.from(tiles);
  };

  // Modifikasi effect untuk update stats
  useEffect(() => {
    if (sidebarData.selectedGrid) {
      const gridData = sidebarData.selectedGrid.data || [];
      
      // Hitung stats reguler
      let burungnesiaCount = 0;
      let kupunesiaCount = 0; 
      let fobiCount = 0;
      let taxaCount = 0;
      const uniqueSpecies = new Set();
      const checklistIds = [];
      
      gridData.forEach(item => {
        const id = String(item.id || '');
        // Tambahkan prefix sesuai sumber data
        if (item.source?.includes('burungnesia')) {
          checklistIds.push(`brn_${id}`);
          burungnesiaCount++;
        } else if (item.source?.includes('kupunesia')) {
          checklistIds.push(`kpn_${id}`);
          kupunesiaCount++;
        } else if (item.source?.includes('fobi')) {
          checklistIds.push(`fob_${id}`);
          fobiCount++;
        } else if (item.source?.includes('taxa')) {
          taxaCount++;
        }
      });

      // Gunakan totalUniqueSpecies dari sidebarData jika tersedia
      const speciesCount = sidebarData.totalUniqueSpecies || 
        (sidebarData.allSpecies && sidebarData.allSpecies.length > 0 
          ? new Set(sidebarData.allSpecies.map(s => s.nameLat).filter(Boolean)).size 
          : 0);

      // Fetch kontributor count dari API
      const fetchContributors = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/grid-contributors`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
            },
            body: JSON.stringify({ checklistIds })
          });
          
          const data = await response.json();
          
          if (data.status === 'success') {
            setStats({
              burungnesia: burungnesiaCount,
              kupunesia: kupunesiaCount,
              fobi: fobiCount,
              observasi: gridData.length,
              spesies: speciesCount,
              kontributor: data.totalContributors
            });
          } else {
            throw new Error(data.message || 'Failed to fetch contributors');
          }
        } catch (error) {
          console.error('Error fetching contributors:', error);
          setStats({
            burungnesia: burungnesiaCount,
            kupunesia: kupunesiaCount,
            fobi: fobiCount,
            observasi: gridData.length,
            spesies: speciesCount,
            kontributor: gridData.length
          });
        }
      };
      
      fetchContributors();
    }
  }, [sidebarData.selectedGrid, sidebarData.allSpecies, sidebarData.totalUniqueSpecies]);

  // Tambahkan initial load effect
  useEffect(() => {
    if (mapRef.current && mapMarkers && !gridData.tiles.length) {
      const map = mapRef.current;
      const currentZoom = map.getZoom();
      const currentBounds = map.getBounds();
      
      if (currentBounds && currentBounds._southWest && currentBounds._northEast) {
        const filteredMarkers = filterMarkers(mapMarkers, filterParams, searchParams);
        updateGridData(filteredMarkers, currentZoom, currentBounds);
      }
    }
  }, [mapRef.current, mapMarkers]);

  const handleMapCreated = useCallback((map) => {
    mapRef.current = map;
    
    // Trigger immediate update after map creation
    const currentZoom = map.getZoom();
    const currentBounds = map.getBounds();
    
    if (currentBounds && currentBounds._southWest && currentBounds._northEast) {
      setZoomLevel(currentZoom);
      setVisibleBounds(currentBounds);
      
      if (mapMarkers) {
        // Gunakan centralizedFilters jika tersedia, jika tidak gunakan filterParams
        const effectiveFilters = centralizedFilters || filterParams;
        
        // Log untuk debugging
        console.log('MapView handleMapCreated: Menggunakan filter:', effectiveFilters);
        
        const filteredMarkers = filterMarkers(mapMarkers, effectiveFilters, searchParams);
        updateGridData(filteredMarkers, currentZoom, currentBounds);
      }
    }
  }, [mapMarkers, filterParams, searchParams, updateGridData, centralizedFilters]);

  // Effect untuk mengatur view peta saat ada filter lokasi
  useEffect(() => {
    if (mapRef.current && searchParams?.latitude && searchParams?.longitude) {
      const map = mapRef.current;
      
      if (searchParams.boundingbox) {
        // Jika ada bounding box, gunakan fitBounds
        const bounds = [
          [searchParams.boundingbox[0], searchParams.boundingbox[2]],
          [searchParams.boundingbox[1], searchParams.boundingbox[3]]
        ];
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 12,
          animate: true,
          duration: 1 // durasi animasi dalam detik
        });
      } else {
        // Jika hanya ada koordinat, gunakan setView
        const zoom = filterParams?.radius 
          ? calculateZoomFromRadius(filterParams.radius)
          : 12;

        map.setView(
          [searchParams.latitude, searchParams.longitude],
          zoom,
          {
            animate: true,
            duration: 1
          }
        );
      }
    }
  }, [searchParams?.latitude, searchParams?.longitude, searchParams?.boundingbox, filterParams?.radius]);

  // Helper function untuk menghitung zoom level berdasarkan radius
  const calculateZoomFromRadius = (radius) => {
    // Konversi radius (km) ke zoom level
    // Semakin kecil radius, semakin besar zoom level
    if (radius <= 1) return 15;
    if (radius <= 5) return 13;
    if (radius <= 10) return 12;
    if (radius <= 20) return 11;
    if (radius <= 50) return 10;
    if (radius <= 100) return 9;
    return 8;
  };

  // Tambahkan fungsi untuk handle sidebar close
  const handleSidebarClose = useCallback((newStats) => {
    // Reset sidebar state
    if (sidebarData.isOpen) {
      toggleSidebar(null);
      
      // Update stats jika ada
      if (newStats) {
        // Simpan stats ke localStorage untuk digunakan oleh GridView
        localStorage.setItem('currentStats', JSON.stringify(newStats));
        console.log('MapView: Menyimpan stats ke localStorage dari handleSidebarClose:', newStats);
        
        setStats(newStats);
      }
    }
  }, [sidebarData.isOpen, toggleSidebar, setStats]);

  // Modifikasi updateMap untuk menggunakan centralizedFilters
  const updateMap = async () => {
    if (!map) return;
    
    setLoading(true);
    if (setParentLoading) setParentLoading(true);
    
    try {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      // Perbarui bounds dan zoom di parent component
      if (onMapChange) {
        onMapChange(bounds, zoom);
      }
      
      // Dapatkan grid yang terlihat
      const visibleTiles = getVisibleTiles(bounds, zoom);
      setVisibleGrid(visibleTiles);
      
      // Perbarui centralizedFilters dengan bounds saat ini
      if (onFilterChange) {
        const center = bounds.getCenter();
        const radius = calculateRadiusFromBounds(bounds);
        
        onFilterChange({
          latitude: center.lat,
          longitude: center.lng,
          radius: radius / 1000 // Konversi ke km
        });
      }
      
      // Gunakan centralizedFilters jika tersedia, jika tidak gunakan filterParams
      const effectiveFilters = centralizedFilters || filterParams;
      
      // Log untuk debugging
      console.log('MapView updateMap: Menggunakan filter:', effectiveFilters);
      
      // Periksa apakah stats sudah di-fetch oleh HomePage setelah reset filter
      const lastResetTime = localStorage.getItem('lastFilterResetTime');
      const currentTime = new Date().getTime();
      const isRecentReset = lastResetTime && (currentTime - parseInt(lastResetTime) < 1000); // 1 detik
      
      // Hanya fetch stats jika ini bukan load pertama atau jika ada perubahan filter
      // dan bukan hasil dari reset filter baru-baru ini
      if (!isInitialLoad.current || 
          (effectiveFilters && 
           Object.keys(effectiveFilters).some(key => 
            effectiveFilters[key] !== null && 
            effectiveFilters[key] !== undefined && 
            (Array.isArray(effectiveFilters[key]) ? effectiveFilters[key].length > 0 : true)
           ) && 
           !isRecentReset)) {
        // Ambil data marker berdasarkan filter
        await fetchFilteredStats({
          bounds: bounds,
          zoom: zoom,
          filters: effectiveFilters
        });
      } else if (isRecentReset) {
        // Jika ini adalah hasil dari reset filter baru-baru ini,
        // gunakan stats yang sudah di-fetch oleh HomePage
        const currentStats = localStorage.getItem('currentStats');
        if (currentStats) {
          console.log('MapView: Menggunakan stats dari localStorage setelah reset filter');
          setStats(JSON.parse(currentStats));
        }
      }
      
      // Setelah load pertama, set flag menjadi false
      isInitialLoad.current = false;
      
    } catch (error) {
      console.error('Error updating map:', error);
    } finally {
      setLoading(false);
      if (setParentLoading) setParentLoading(false);
    }
  };

  // Fungsi untuk menghitung radius dari bounds
  const calculateRadiusFromBounds = (bounds) => {
    const center = bounds.getCenter();
    const northEast = bounds.getNorthEast();
    
    // Hitung jarak dari pusat ke sudut dalam meter
    const radiusInMeters = center.distanceTo(northEast);
    
    return radiusInMeters;
  };

  // Modifikasi fetchFilteredStats untuk menggunakan centralizedFilters
  const fetchFilteredStats = async (params) => {
    try {
      const { bounds, zoom, filters } = params || {};
      
      // Periksa apakah ini adalah hasil dari reset filter baru-baru ini
      const lastResetTime = localStorage.getItem('lastFilterResetTime');
      const currentTime = new Date().getTime();
      const isRecentReset = lastResetTime && (currentTime - parseInt(lastResetTime) < 1000); // 1 detik
      
      // Jika ini adalah hasil dari reset filter baru-baru ini, gunakan stats dari localStorage
      if (isRecentReset) {
        console.log('MapView fetchFilteredStats: Terdeteksi reset filter baru-baru ini');
        
        // Coba gunakan cachedStats terlebih dahulu (stats default)
        const cachedStats = localStorage.getItem('cachedStats');
        if (cachedStats) {
          console.log('MapView fetchFilteredStats: Menggunakan cachedStats dari localStorage setelah reset filter');
          if (setStats) {
            setStats(JSON.parse(cachedStats));
          }
          return JSON.parse(cachedStats);
        }
        
        // Jika tidak ada cachedStats, coba gunakan currentStats
        const currentStats = localStorage.getItem('currentStats');
        if (currentStats) {
          console.log('MapView fetchFilteredStats: Menggunakan currentStats dari localStorage setelah reset filter');
          if (setStats) {
            setStats(JSON.parse(currentStats));
          }
          return JSON.parse(currentStats);
        }
        
        // Jika tidak ada stats di localStorage, lanjutkan dengan fetch
        console.log('MapView fetchFilteredStats: Tidak ada stats di localStorage, lanjutkan dengan fetch');
      }
      
      // Buat query params
      const queryParams = new URLSearchParams();
      
      // Tambahkan filter dari centralizedFilters jika tersedia
      if (centralizedFilters) {
        if (centralizedFilters.search) queryParams.append('search', centralizedFilters.search);
        if (centralizedFilters.start_date) queryParams.append('start_date', centralizedFilters.start_date);
        if (centralizedFilters.end_date) queryParams.append('end_date', centralizedFilters.end_date);
        if (centralizedFilters.grade && centralizedFilters.grade.length > 0) {
          centralizedFilters.grade.forEach(g => queryParams.append('grade[]', g));
        }
        if (centralizedFilters.data_source && centralizedFilters.data_source.length > 0) {
          centralizedFilters.data_source.forEach(ds => queryParams.append('data_source[]', ds));
        }
        if (centralizedFilters.has_media) queryParams.append('has_media', centralizedFilters.has_media);
        if (centralizedFilters.media_type) queryParams.append('media_type', centralizedFilters.media_type);
        if (centralizedFilters.polygon) queryParams.append('polygon', centralizedFilters.polygon);
      } else {
        // Gunakan filterParams jika centralizedFilters tidak tersedia
        if (filterParams) {
          Object.entries(filterParams).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(`${key}[]`, v));
            } else if (value !== null && value !== undefined) {
              queryParams.append(key, value);
            }
          });
        }
        
        // Tambahkan searchParams jika ada
        if (searchParams?.query) {
          queryParams.append('search', searchParams.query);
        }
      }
      
      // Tambahkan bounds sebagai filter lokasi jika bounds tersedia
      if (bounds && typeof bounds.getNorthEast === 'function') {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        // Gunakan bounding box sebagai filter
        queryParams.append('min_lat', sw.lat);
        queryParams.append('max_lat', ne.lat);
        queryParams.append('min_lng', sw.lng);
        queryParams.append('max_lng', ne.lng);
      }
      
      // Tambahkan zoom level jika tersedia
      if (zoom) {
        queryParams.append('zoom', zoom);
      }
      
      console.log('MapView fetchFilteredStats: Fetching stats dengan params:', queryParams.toString());
      
      // Fetch stats
      const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?${queryParams}`);
      const data = await response.json();
      
      // Jika ada callback setStats, panggil dengan data stats
      if (setStats && data.stats) {
        // Pastikan semua properti stats ada
        const validStats = {
          burungnesia: data.stats.burungnesia || 0,
          kupunesia: data.stats.kupunesia || 0,
          fobi: data.stats.fobi || 0,
          observasi: data.stats.observasi || 0,
          spesies: data.stats.spesies || 0,
          kontributor: data.stats.kontributor || 0,
        };
        
        console.log('MapView fetchFilteredStats: Stats berhasil diambil:', validStats);
        
        // Simpan stats ke localStorage untuk digunakan oleh GridView
        localStorage.setItem('currentStats', JSON.stringify(validStats));
        
        setStats(validStats);
      }
      
      return data.stats;
    } catch (error) {
      console.error('Error fetching filtered stats:', error);
      return null;
    }
  };

  // Modifikasi effect untuk update stats
  useEffect(() => {
    if (lastUpdate) {
      // Perbarui grid data ketika ada pembaruan markers
      const currentBounds = mapRef.current?.getBounds();
      const currentZoom = mapRef.current?.getZoom();
      
      if (currentBounds && currentZoom) {
        const filteredMarkers = filterMarkers(mapMarkers, filterParams, searchParams);
        updateGridData(filteredMarkers, currentZoom, currentBounds);
      }
    }
  }, [lastUpdate, mapMarkers]);

  // Modifikasi useEffect untuk searchParams
  useEffect(() => {
    if (searchParams?.species) {
      setSelectedSpecies(searchParams.species);
    } else {
      setSelectedSpecies(null);
    }
  }, [searchParams?.species]);

  const handleBoundsChange = (newBounds) => {
    setVisibleBounds(newBounds);
  };

  const handleZoomChange = (newZoom) => {
    setZoomLevel(newZoom);
  };

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      
      const handleMapUpdate = () => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        onMapChange?.(bounds, zoom);
      };

      map.on('moveend', handleMapUpdate);
      map.on('zoomend', handleMapUpdate);

      return () => {
        map.off('moveend', handleMapUpdate);
        map.off('zoomend', handleMapUpdate);
      };
    }
  }, [onMapChange]);

  // Effect untuk fetch species markers
  useEffect(() => {
    if (searchParams?.species?.id) {
      const fetchSpeciesMarkers = async () => {
        setLocalLoading(true);
        try {
          const [fobiResponse, markersResponse] = await Promise.all([
            fetch(`${import.meta.env.VITE_API_URL}/fobi-markers-by-taxa?taxa_id=${searchParams.species.id}`),
            fetch(`${import.meta.env.VITE_API_URL}/markers-by-taxa?taxa_id=${searchParams.species.id}`)
          ]);

          const [fobiMarkers, otherMarkers] = await Promise.all([
            fobiResponse.json(),
            markersResponse.json()
          ]);

          setSpeciesMarkers([...fobiMarkers, ...otherMarkers]);
        } catch (error) {
          console.error('Error fetching species markers:', error);
        } finally {
          setLocalLoading(false);
        }
      };

      fetchSpeciesMarkers();
    } else {
      setSpeciesMarkers([]);
    }
  }, [searchParams?.species]);

  // Tambahkan kembali fungsi handleReset
  const handleReset = useCallback(() => {
    console.log('MapView: handleReset dipanggil');
    
    const emptyParams = {
      search: '',
      location: '',
      latitude: '',
      longitude: '',
      searchType: 'all',
      selectedId: null,
      display: '',
      species: null,
      start_date: '',
      end_date: '',
      grade: [],
      has_media: false,
      media_type: '',
      data_source: ['fobi', 'burungnesia', 'kupunesia']
    };

    // Reset map view ke default
    if (mapRef.current) {
      const map = mapRef.current;
      map.setView(
        defaultMapConfig.center,
        defaultMapConfig.zoom,
        { animate: true }
      );

      // Reset semua state
      setVisibleBounds(null);
      setZoomLevel(defaultMapConfig.zoom);
      setVisibleGrid('large');
      setSpeciesMarkers([]);
      setSelectedSpecies(null);
      setLocalLoading(false);

      // Reset sidebar
      toggleSidebar(null);

      // Trigger parent reset dengan parameter kosong
      if (onReset) {
        console.log('MapView: Memanggil onReset (handleReset di HomePage)');
        onReset(emptyParams);
      }
      
      // Gunakan stats dari localStorage jika tersedia
      const cachedStats = localStorage.getItem('cachedStats');
      if (cachedStats && setStats) {
        console.log('MapView: Menggunakan cachedStats dari localStorage setelah reset');
        setStats(JSON.parse(cachedStats));
      }
    }

    // Update current shape
    setCurrentShape(null);
    setActiveShape(null);
  }, [mapRef, toggleSidebar, onReset, setVisibleBounds, setZoomLevel, setVisibleGrid, setSpeciesMarkers, setSelectedSpecies, setLocalLoading, setStats]);

  // Berikan handler reset ke parent
  useEffect(() => {
    if (setMapResetHandler) {
      setMapResetHandler(() => handleReset);
    }
  }, [handleReset, setMapResetHandler]);

  // Di dalam komponen MapView, tambahkan state baru
  const [drawnShape, setDrawnShape] = useState(activePolygon);
  const [indonesiaBoundary, setIndonesiaBoundary] = useState(null);

  // Tambahkan useEffect untuk load GeoJSON Indonesia
  useEffect(() => {
    fetch('/indo.geojson')
      .then(response => response.json())
      .then(data => {
        setIndonesiaBoundary(data);
      })
      .catch(error => console.error('Error loading Indonesia boundary:', error));
  }, []);

  // Tambahkan ref untuk debounce
  const fetchPolygonStatsDebounced = useRef(
    debounce(async (shapeData) => {
      try {
        if (polygonStatsLoadedRef.current) {
          console.log('Polygon stats already loaded, skipping fetch');
          return;
        }
        
        const token = localStorage.getItem('jwt_token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/polygon-stats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ shape: shapeData })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && setStats) {
          setStats(data.stats);
          polygonStatsLoadedRef.current = true;
        }
      } catch (error) {
        console.error('Error fetching polygon stats:', error);
      }
    }, 1000)
  ).current;

  // Tambahkan handler untuk drawing tools dengan debounce
  const handleShapeDrawn = useCallback(async (layer, shapeData) => {
    try {
      // Set active shape untuk filtering
      setActiveShape(shapeData);
      
      // Panggil onPolygonChange untuk update state di parent
      if (onPolygonChange) {
        onPolygonChange(shapeData);
      }
      
      // Reset flag untuk polygon stats
      polygonStatsLoadedRef.current = false;
      
      // Gunakan debounce untuk fetch grids in polygon
      setTimeout(async () => {
        try {
      // Ambil data grid dalam polygon
      const response = await apiFetch('/grids-in-polygon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shape: shapeData })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setPolygonSidebarData({
          isOpen: true,
          gridsInPolygon: data.gridsInPolygon,
              loading: false,
              shape: shapeData
        });
            
            // Fetch stats untuk polygon dengan debounce
            fetchPolygonStatsDebounced(shapeData);
      } else {
        console.error('Error fetching grids in polygon:', data.message);
      }
        } catch (error) {
          console.error('Error handling shape drawn (delayed):', error);
        }
      }, 500);
    } catch (error) {
      console.error('Error handling shape drawn:', error);
    }
  }, [onPolygonChange, fetchPolygonStatsDebounced]);

  const handleShapeDeleted = () => {
    setDrawnShape(null);
    // Reset polygon di parent
    if (onPolygonChange) {
      onPolygonChange(null);
    }
    
    if (mapMarkers) {
      const filteredMarkers = filterMarkers(mapMarkers, filterParams, searchParams);
      updateGridData(filteredMarkers, zoomLevel, visibleBounds);
    }

    // Reset polygon sidebar
    setPolygonSidebarData({
      isOpen: false,
      gridsInPolygon: [],
      loading: false,
      shape: null
    });
  };

  // Ubah cara mengakses species data
  useEffect(() => {
    if (sidebarData) {
      // Pastikan species adalah array
      const speciesArray = Array.isArray(sidebarData.species) ? sidebarData.species : [];
      
      if (speciesArray.length > 0) {
        // Proses species data
        speciesArray.forEach(species => {
          // ... proses data species
        });
      }
    }
  }, [sidebarData]);

  // Effect untuk menginisialisasi polygon saat component mount atau activePolygon berubah
  useEffect(() => {
    if (!activePolygon || !mapRef.current || polygonInitializedRef.current) return;
    
    // Buat fungsi untuk menginisialisasi polygon
    const initializePolygon = () => {
      try {
        // Buat layer dari data polygon
        let layer;
        if (activePolygon.type === 'Circle') {
          const center = L.latLng(activePolygon.center[1], activePolygon.center[0]);
          layer = L.circle(center, { radius: activePolygon.radius });
        } else if (activePolygon.type === 'Polygon') {
          const latLngs = activePolygon.coordinates[0].map(coord => 
            L.latLng(coord[1], coord[0])
          );
          layer = L.polygon(latLngs);
        }
        
        if (layer) {
          // Tambahkan layer ke peta
          layer.addTo(mapRef.current);
          setActivePolygonLayer(layer);
          
          // Tandai bahwa polygon sudah diinisialisasi
          polygonInitializedRef.current = true;
          
          // Set active shape untuk filtering grid
          setActiveShape(activePolygon);
          
          // Fetch data untuk polygon tanpa zoom dengan debounce
          setTimeout(() => {
            handlePolygonInitialized(layer, activePolygon);
          }, 500);
        }
      } catch (error) {
        console.error('Error initializing polygon:', error);
      }
    };
    
    // Jika peta sudah siap, inisialisasi polygon
    if (mapRef.current._loaded) {
      initializePolygon();
    } else {
      // Jika peta belum siap, tunggu hingga siap
      mapRef.current.once('load', initializePolygon);
    }
    
    return () => {
      // Cleanup
      if (mapRef.current && !mapRef.current._loaded) {
        mapRef.current.off('load', initializePolygon);
      }
    };
  }, [activePolygon, mapRef.current]);
  
  // Fungsi untuk menangani polygon yang diinisialisasi
  const handlePolygonInitialized = async (layer, shapeData) => {
    try {
      // Simpan polygon di state
      if (onPolygonChange) {
        onPolygonChange(shapeData);
      }
      
      // Update centralizedFilters dengan polygon
      if (onFilterChange) {
        onFilterChange({
          polygon: formatPolygonForApi(shapeData)
        });
      }
      
      // Fetch stats untuk polygon dengan debounce
      fetchPolygonStatsDebounced(shapeData);
    } catch (error) {
      console.error('Error initializing polygon:', error);
    }
  };
  
  // Fungsi untuk fetch stats polygon (tidak digunakan langsung, gunakan fetchPolygonStatsDebounced)
  const fetchPolygonStats = async (shapeData) => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/polygon-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shape: shapeData })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && setStats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching polygon stats:', error);
    }
  };

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

  // Modifikasi handlePolygonSidebarClose di MapView untuk mereset stats jika diperlukan
  const handlePolygonSidebarClose = useCallback((resetPolygon = false, newStats = null) => {
    // Jika resetPolygon true, hapus polygon dari peta dan reset state
    if (resetPolygon) {
      // Reset active shape
      setActiveShape(null);
      
      // Reset polygon di parent component
      if (onPolygonChange) {
        onPolygonChange(null);
      }
      
      // Hapus layer polygon jika ada
      if (activePolygonLayer && mapRef.current) {
        mapRef.current.removeLayer(activePolygonLayer);
        setActivePolygonLayer(null);
      }
      
      // Reset polygon initialized flag
      polygonInitializedRef.current = false;
      
      // Refresh grid data tanpa polygon filter
      if (mapMarkers) {
        const filteredMarkers = filterMarkers(mapMarkers, filterParams, searchParams);
        updateGridData(filteredMarkers, zoomLevel, visibleBounds);
      }
      
      // Update stats jika ada
      if (newStats && setStats) {
        // Simpan stats ke localStorage untuk digunakan oleh GridView
        localStorage.setItem('currentStats', JSON.stringify(newStats));
        console.log('MapView: Menyimpan stats ke localStorage dari handlePolygonSidebarClose:', newStats);
        
        setStats(newStats);
      }
    }
    
    // Tutup sidebar tanpa mereset polygon
    setPolygonSidebarData(prev => ({
      ...prev,
      isOpen: false
    }));
  }, [mapMarkers, filterParams, searchParams, zoomLevel, visibleBounds, updateGridData, onPolygonChange, activePolygonLayer, mapRef, setStats]);

  // Tambahkan effect untuk memperbarui tampilan peta saat centralizedFilters berubah
  useEffect(() => {
    // Log untuk debugging
    console.log('MapView: centralizedFilters berubah:', centralizedFilters);
    
    // Jika mapMarkers dan visibleBounds sudah tersedia, perbarui tampilan peta
    if (mapMarkers && visibleBounds) {
      const effectiveFilters = centralizedFilters || filterParams;
      
      // Gunakan activeShape untuk filtering
      const filteredMarkers = activeShape 
        ? filterMarkers(mapMarkers, effectiveFilters, searchParams, activeShape)
        : filterMarkers(mapMarkers, effectiveFilters, searchParams);
      
      // Update grid data dengan marker yang sudah difilter
      updateGridData(filteredMarkers, zoomLevel, visibleBounds);
    }
  }, [centralizedFilters]);

  if (loading) {
    return (
      <div className="h-[70vh] w-full bg-gray-900 relative overflow-hidden">
        {/* Skeleton Loading untuk Peta Indonesia */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Grid overlay effect */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-6">
            {Array(48).fill().map((_, i) => (
              <div key={i} className="border border-gray-800 opacity-30"></div>
            ))}
          </div>
          
          {/* Pulau-pulau Utama Indonesia */}
          <div className="w-[80%] max-w-4xl relative">
            {/* Sumatra */}
            <div className="absolute top-[25%] left-[10%] w-[20%] h-[40%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            
            {/* Jawa */}
            <div className="absolute top-[60%] left-[30%] w-[18%] h-[8%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            
            {/* Kalimantan */}
            <div className="absolute top-[30%] left-[35%] w-[22%] h-[30%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            
            {/* Sulawesi */}
            <div className="absolute top-[30%] left-[60%] w-[10%] h-[25%] bg-gray-700 rounded-full opacity-70 animate-pulse transform rotate-45"></div>
            
            {/* Papua */}
            <div className="absolute top-[35%] left-[75%] w-[18%] h-[25%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            
            {/* Pulau-pulau kecil */}
            <div className="absolute top-[65%] left-[50%] w-[5%] h-[5%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            <div className="absolute top-[50%] left-[55%] w-[7%] h-[7%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            <div className="absolute top-[60%] left-[65%] w-[6%] h-[6%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
          </div>
          
          {/* Beberapa titik data acak sebagai indikator */}
          <div className="absolute inset-0">
            {Array(15).fill().map((_, i) => (
              <div 
                key={i} 
                className="absolute w-2 h-2 bg-blue-500 rounded-full opacity-70 animate-ping"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 1}s`
                }}
              ></div>
            ))}
          </div>
          
          {/* Loading Text */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-200 text-sm">Memuat peta...</span>
            </div>
          </div>
          
          {/* Background pulse effect */}
          <div className="absolute inset-0 bg-blue-500 opacity-5 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col md:flex-row h-full">
      <div className="relative w-full h-full">
        <MapContainer
          center={defaultMapConfig.center}
          zoom={defaultMapConfig.zoom}
          ref={mapRef}
          className="w-full h-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          <MapController 
            setVisibleBounds={setVisibleBounds}
            setZoomLevel={setZoomLevel}
            setVisibleGrid={setVisibleGrid}
          />

          <ZoomHandler 
            gridData={gridData}
            setVisibleGrid={setVisibleGrid}
            isMobile={isMobile}
          />

          <MapControls onReset={handleReset} />

          <MapOverlay
            grid={isSpeciesView ? generateGrid(speciesMarkers, gridSize) : gridData.tiles}
            markers={isSpeciesView ? speciesMarkers : mapMarkers}
            bounds={visibleBounds}
            zoomLevel={zoomLevel}
            onGridClick={(tile) => {
              // Tambahkan species data ke tile jika dalam species view
              if (isSpeciesView) {
                tile.data = tile.data?.map(item => ({
                  ...item,
                  species_name_latin: searchParams.species.scientific_name,
                  species_name_local: searchParams.species.common_name,
                  count: item.count || 1
                }));
              }
              toggleSidebar(tile);
            }}
            filterParams={filterParams}
            searchParams={searchParams}
          />

          <DrawingTools 
            onShapeDrawn={handleShapeDrawn}
            onShapeDeleted={handleShapeDeleted}
            setStats={setStats}
            onDrawingStateChange={setDrawingMode}
            activePolygon={activePolygon}
          />

          {/* Tambahkan indikator polygon aktif dengan tombol toggle sidebar */}
          {activePolygon && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-600 text-white px-3 py-1 rounded-full text-sm shadow-lg flex items-center space-x-2">
              <span>Filter Polygon Aktif</span>
              <button 
                onClick={() => setPolygonSidebarData(prev => ({
                  ...prev,
                  isOpen: !prev.isOpen
                }))}
                className="ml-2 text-white hover:text-gray-200 bg-blue-700 hover:bg-blue-800 px-2 py-0.5 rounded-full text-xs"
                aria-label="Toggle sidebar polygon"
              >
                {polygonSidebarData.isOpen ? 'Sembunyikan Detail' : 'Lihat Detail'}
              </button>
              <button 
                onClick={() => handlePolygonSidebarClose(true)}
                className="ml-1 text-white hover:text-red-200"
                aria-label="Hapus filter polygon"
              >
                ×
              </button>
            </div>
          )}
        </MapContainer>

        {isLoading && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
            <div className="bg-gray-800 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-3">
              <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-200 text-sm">Memuat data peta...</span>
              <div className="ml-1 flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      {sidebarData.isOpen && (
        <Sidebar
          data={{
            ...sidebarData,
            species: isSpeciesView ? [searchParams.species] : sidebarData.species
          }}
          setStats={setStats}
          onClose={handleSidebarClose}
          onLoadMore={loadMore}
          onReset={handleReset}
        />
      )}

      {/* Polygon Sidebar */}
      {polygonSidebarData.isOpen && (
        <div className="absolute inset-0 z-[1001] md:relative md:inset-auto md:z-[999]">
        <PolygonSidebar
          data={polygonSidebarData}
          onClose={handlePolygonSidebarClose}
          setStats={setStats}
        />
        </div>
      )}
    </div>
  );
};

export default React.memo(MapView);
