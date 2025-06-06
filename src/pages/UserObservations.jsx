import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faEdit, faTrash, faPlus, faSpinner, faTimes, faMapMarkerAlt, faCalendar, faExclamationTriangle, faBars } from '@fortawesome/free-solid-svg-icons';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, Circle } from 'react-leaflet';
import L from 'leaflet';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DeleteObservationModal from '../components/UserObservations/DeleteObservationModal';
import ObservationDetailsModal from '../components/UserObservations/ObservationDetailsModal';
import MultiSpeciesModal from '../components/UserObservations/MultiSpeciesModal';
import axios from 'axios';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import defaultPlaceholder from '../assets/icon/FOBI.png';
import defaultPlaceholderKupunesia from '../assets/icon/kupnes.png';
import defaultPlaceholderBurungnesia from '../assets/icon/icon.png';
import { useMap } from 'react-leaflet';
import { toast } from 'react-hot-toast';

// Delete marker icon issue in webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const UserObservations = () => {
  const navigate = useNavigate();
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMultiSpeciesModal, setShowMultiSpeciesModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userData, setUserData] = useState(null);
  const [mapCenter, setMapCenter] = useState([-2.5489, 118.0149]);
  const [mapObservations, setMapObservations] = useState([]);
  const [gridLevels, setGridLevels] = useState({
    small: [],      // ~2km
    medium: [],     // ~5km
    large: [],      // ~20km
    extraLarge: []  // ~50km
  });
  const [visibleGrid, setVisibleGrid] = useState('extraLarge');
  const [showMarkers, setShowMarkers] = useState(false);
  const [selectedGrid, setSelectedGrid] = useState(null);
  const [locationCache, setLocationCache] = useState({});
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Get user data from local storage
  useEffect(() => {
    const user = {
      id: localStorage.getItem('user_id'),
      name: localStorage.getItem('username'),
      email: localStorage.getItem('email'),
      profile_picture: localStorage.getItem('profile_picture'),
    };
    setUserData(user);
  }, []);

  // Fungsi untuk mendapatkan nama lokasi dari koordinat
  const getLocationName = async (latitude, longitude) => {
    // Cek cache terlebih dahulu
    const cacheKey = `${latitude},${longitude}`;
    if (locationCache[cacheKey]) {
      return locationCache[cacheKey];
    }

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FOBI-App'
          }
        }
      );

      let locationName = '';
      const address = response.data.address;

      if (address) {
        const components = [];
        
        // Urutkan komponen alamat dari yang paling spesifik ke umum
        if (address.village || address.suburb) components.push(address.village || address.suburb);
        if (address.city || address.town || address.municipality) 
          components.push(address.city || address.town || address.municipality);
        if (address.state) components.push(address.state);
        if (address.country) components.push(address.country);

        locationName = components.join(', ');
      } else {
        locationName = response.data.display_name;
      }

      // Simpan ke cache
      setLocationCache(prev => ({
        ...prev,
        [cacheKey]: locationName
      }));

      return locationName;
    } catch (error) {
      console.error('Error fetching location name:', error);
      return `${latitude}, ${longitude}`;
    }
  };

  // Tambahkan fungsi format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'd MMMM yyyy', { locale: id });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  // Tambahkan fungsi untuk format tanggal input (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  };

  // Fetch observations
  const fetchObservations = useCallback(async () => {
    if (!userData || !userData.id) return;
    
    try {
      setLoading(true);
      
      const params = {
        page: currentPage,
        search: searchQuery,
        search_type: searchType,
        date: dateFilter, // Format tanggal sudah YYYY-MM-DD dari input
      };
      
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('Token tidak ditemukan');
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/user-observations`, {
        params,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        // Tambahkan nama lokasi dan format tanggal untuk setiap observasi
        const observationsWithLocationAndDate = await Promise.all(
          response.data.data.data.map(async (obs) => {
            const locationName = await getLocationName(obs.latitude, obs.longitude);
            return {
              ...obs,
              location_name: locationName,
              formatted_date: formatDate(obs.observation_date || obs.date || obs.created_at) // Prioritaskan observation_date
            };
          })
        );

        setObservations(observationsWithLocationAndDate);
        setMapObservations(observationsWithLocationAndDate);
        setTotalPages(response.data.data.last_page);
        
        if (observationsWithLocationAndDate.length > 0 && !searchQuery) {
          setMapCenter([observationsWithLocationAndDate[0].latitude, observationsWithLocationAndDate[0].longitude]);
        }
      } else {
        setError(response.data.message || 'Gagal memuat data observasi');
      }
    } catch (err) {
      console.error('Error fetching observations:', err);
      if (err.response?.status === 401) {
        setError('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        setError('Gagal terhubung ke server. Silakan coba lagi nanti.');
      }
    } finally {
      setLoading(false);
    }
  }, [userData, currentPage, searchQuery, searchType, dateFilter, navigate]);
  
  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchObservations();
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchType('all');
    setDateFilter('');
    setCurrentPage(1);
  };
  
  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // Edit observation
  const handleEdit = (observation) => {
    // Cek sumber observasi
    if (observation.source === 'burungnesia' || observation.source === 'kupunesia') {
      // Tampilkan pesan error jika sumber adalah burungnesia atau kupunesia
      toast.error(
        'Fitur edit untuk observasi Burungnesia dan Kupunesia sedang dinonaktifkan sementara karena adanya perubahan besar pada struktur database. Saat ini, fitur edit hanya tersedia untuk observasi Amaturalist.',
        {
          duration: 5000, // Tampilkan pesan lebih lama (5 detik)
          style: {
            background: '#2c2c2c',
            color: '#e0e0e0',
            border: '1px solid #444',
          },
        }
      );
      return; // Berhenti dan jangan navigasi ke halaman edit
    }
    
    // Jika sumber adalah taxa atau lainnya, lanjutkan seperti biasa
    let editId = observation.id;
    if (observation.source === 'burungnesia') {
      editId = `BN${observation.id}`;
    } else if (observation.source === 'kupunesia') {
      editId = `KN${observation.id}`;
    }
    
    navigate(`/edit-observation/${editId}`);
  };
  
  // Delete observation
  const handleDeleteClick = (observation) => {
    setSelectedObservation(observation);
    setShowDeleteModal(true);
  };
  
  const fetchObservationDetails = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('jwt_token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/user-observations/${id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setDetails(response.data.data);
      } else {
        setError(response.data.message || 'Gagal memuat detail observasi');
      }
    } catch (err) {
      console.error('Error fetching observation details:', err);
      if (err.response?.status === 401) {
        setError('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        setError('Gagal terhubung ke server. Silakan coba lagi nanti.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedObservation) return;
    
    try {
      setIsDeleting(true);
      
      // Tambahkan prefix untuk ID berdasarkan sumber data
      let deleteId = selectedObservation.id;
      if (selectedObservation.source === 'burungnesia') {
        deleteId = `BN${selectedObservation.id}`;
      } else if (selectedObservation.source === 'kupunesia') {
        deleteId = `KN${selectedObservation.id}`;
      }
      
      const token = localStorage.getItem('jwt_token');
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/user-observations/${deleteId}`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        // Remove from state
        setObservations(observations.filter(obs => obs.id !== selectedObservation.id || obs.source !== selectedObservation.source));
        setMapObservations(mapObservations.filter(obs => obs.id !== selectedObservation.id || obs.source !== selectedObservation.source));
        
        // Reset
        setShowDeleteModal(false);
        setSelectedObservation(null);
        
        // Show success toast
        toast.success('Observasi berhasil dihapus');
      } else {
        setError(response.data.message || 'Gagal menghapus observasi');
      }
    } catch (err) {
      console.error('Error deleting observation:', err);
      if (err.response?.status === 401) {
        setError('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        setError('Gagal menghapus observasi. Silakan coba lagi nanti.');
        toast.error('Gagal menghapus observasi');
      }
    } finally {
      setIsDeleting(false);
    }
  };
  
  // View details
  const handleViewDetails = (observation) => {
    setSelectedObservation(observation);
    
    // Cek sumber data untuk menentukan modal yang akan ditampilkan
    if (observation.source === 'burungnesia' || observation.source === 'kupunesia') {
      setShowMultiSpeciesModal(true);
    } else {
      setShowDetailsModal(true);
    }
  };

  // Fungsi untuk generate grid
  const generateGrid = useCallback((observations, gridSize) => {
    if (!Array.isArray(observations)) return [];
    
    const grid = {};
    observations.forEach((obs) => {
      if (obs.latitude && obs.longitude) {
        const lat = Math.floor(obs.latitude / gridSize) * gridSize;
        const lng = Math.floor(obs.longitude / gridSize) * gridSize;
        const key = `${lat},${lng}`;

        if (!grid[key]) {
          grid[key] = { count: 0, data: [] };
        }
        grid[key].count++;
        grid[key].data.push(obs);
      }
    });

    return Object.keys(grid).map(key => {
      const [lat, lng] = key.split(',').map(Number);
      return {
        bounds: [
          [lat, lng],
          [lat + gridSize, lng + gridSize]
        ],
        count: grid[key].count,
        data: grid[key].data
      };
    });
  }, []);

  // Fungsi untuk generate grid levels
  const generateGridLevels = useCallback((observations) => {
    return {
      small: generateGrid(observations, 0.02),      // ~2km
      medium: generateGrid(observations, 0.05),     // ~5km
      large: generateGrid(observations, 0.2),       // ~20km
      extraLarge: generateGrid(observations, 0.5)   // ~50km
    };
  }, [generateGrid]);

  // Fungsi untuk mendapatkan warna grid
  const getColor = (count) => {
    return count > 50 ? 'rgba(66, 133, 244, 0.9)' :
           count > 20 ? 'rgba(52, 120, 246, 0.85)' :
           count > 10 ? 'rgba(30, 108, 247, 0.8)' :
           count > 5  ? 'rgba(8, 96, 248, 0.75)' :
           count > 2  ? 'rgba(8, 84, 216, 0.7)' :
                       'rgba(8, 72, 184, 0.65)';
  };

  // Fungsi untuk handle klik grid
  const handleGridClick = (grid) => {
    setSelectedGrid(grid);
    setShowMarkers(true);
  };

  // Komponen untuk mengatur zoom dan grid level
  const ZoomHandler = () => {
    const map = useMap();
    
    useEffect(() => {
      const handleZoom = () => {
        const zoom = map.getZoom();
        if (zoom >= 12) {
          setVisibleGrid('small');
          setShowMarkers(true);
        } else if (zoom >= 10) {
          setVisibleGrid('medium');
          setShowMarkers(false);
        } else if (zoom >= 8) {
          setVisibleGrid('large');
          setShowMarkers(false);
        } else {
          setVisibleGrid('extraLarge');
          setShowMarkers(false);
        }
      };
      
      map.on('zoomend', handleZoom);
      return () => {
        map.off('zoomend', handleZoom);
      };
    }, [map]);
    
    return null;
  };

  // Update useEffect setelah fetchObservations
  useEffect(() => {
    if (observations.length > 0) {
      const levels = generateGridLevels(observations);
      setGridLevels(levels);
    }
  }, [observations, generateGridLevels]);
  
  // Tambahkan badge untuk menunjukkan sumber data
  const getSourceBadge = (source) => {
    if (source === 'burungnesia') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-pink-800 text-white">
          Burungnesia
        </span>
      );
    } else if (source === 'kupunesia') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-800 text-white">
          Kupunesia
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-800 text-white">
          Amaturalist
        </span>
      );
    }
  };

  // Fungsi untuk mendapatkan ringkasan spesies untuk observasi burungnesia/kupunesia
  const getSpeciesSummary = (observation) => {
    if (observation.source !== 'burungnesia' && observation.source !== 'kupunesia') {
      return observation.scientific_name;
    }
    
    // Jika faunas tersedia dan memiliki data
    if (observation.faunas && observation.faunas.length > 0) {
      const count = observation.faunas.length;
      
      // Jika hanya ada 1 spesies, tampilkan nama spesies tersebut
      if (count === 1 && observation.faunas[0].fauna) {
        return observation.faunas[0].fauna.nameLat;
      }
      
      // Jika ada lebih dari 1 spesies, tampilkan ringkasan
      const firstSpecies = observation.faunas[0]?.fauna?.nameLat || 'Unknown Species';
      return `${count} spesies (${firstSpecies}, dsb.)`;
    }
    
    // Fallback jika tidak ada data fauna
    return observation.scientific_name || 'Belum ada spesies terdaftar';
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
      <Header userData={userData} />
      
      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Toggle Sidebar Button - Visible on mobile */}
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="lg:hidden mb-4 p-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0] flex items-center justify-center gap-2 w-full"
        >
          <FontAwesomeIcon icon={showSidebar ? faTimes : faBars} />
          <span>Menu</span>
        </button>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar dengan properti baru */}
          <div className="lg:block lg:w-1/5 xl:w-1/6">
            <Sidebar 
              userId={userData?.id} 
              activeItem="Kelola Observasi"
              isMobileOpen={showSidebar}
              onMobileClose={() => setShowSidebar(false)}
            />
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h1 className="text-2xl font-bold text-[#e0e0e0] mb-4 md:mb-0">Kelola Observasi Anda</h1>
              <button 
                onClick={() => navigate('/pilih-observasi')}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0] transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Tambah Observasi</span>
              </button>
            </div>
            
            {/* Search & Filter */}
            <div className="mb-6 bg-[#1e1e1e] p-4 rounded-lg shadow-md border border-[#333]">
              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari observasi..."
                      className="w-full p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
                      className="p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                    >
                      <option value="all">Semua</option>
                      <option value="species">Nama Spesies</option>
                      <option value="location">Lokasi</option>
                      <option value="date">Tanggal</option>
                    </select>
                    <div className="flex flex-col">
                      <input
                        id="dateFilter"
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0]"
                      >
                        <FontAwesomeIcon icon={faSearch} />
                      </button>
                      {(searchQuery || dateFilter) && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="px-4 py-2 bg-[#2c2c2c] text-[#e0e0e0] rounded-lg hover:bg-[#3c3c3c] border border-[#444]"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Map View */}
            {mapObservations.length > 0 && (
              <div className="mb-6 bg-[#1e1e1e] p-4 rounded-lg shadow-md border border-[#333]">
                <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Lokasi Observasi</h2>
                <div className="h-[300px] rounded-lg overflow-hidden">
                  <MapContainer
                    center={mapCenter}
                    zoom={5}
                    style={{ height: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <ZoomHandler />
                    
                    {/* Grid System */}
                    {!showMarkers && visibleGrid !== 'none' && 
                      gridLevels[visibleGrid]?.map((grid, index) => (
                        <Rectangle
                          key={`grid-${index}`}
                          bounds={grid.bounds}
                          pathOptions={{
                            color: getColor(grid.count),
                            fillColor: getColor(grid.count),
                            fillOpacity: 0.8,
                            weight: 1
                          }}
                          eventHandlers={{
                            click: () => handleGridClick(grid)
                          }}
                        >
                          {selectedGrid === grid && (
                            <Popup className="dark-popup">
                              <div className="bg-[#2c2c2c] p-2 rounded">
                                <h3 className="font-bold text-[#e0e0e0]">Total Observasi: {grid.count}</h3>
                                <div className="max-h-40 overflow-y-auto">
                                  {grid.data.map((obs, i) => (
                                    <div key={i} className="mt-2 border-t border-[#444] pt-1">
                                      <p className="italic text-[#e0e0e0]">{obs.scientific_name}</p>
                                      <p className="text-gray-300">{obs.location_name}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Popup>
                          )}
                        </Rectangle>
                      ))
                    }

                    {/* Individual Markers */}
                    {showMarkers && mapObservations.map((obs, index) => (
                      <Circle
                        key={`marker-${obs.id}-${index}`}
                        center={[obs.latitude, obs.longitude]}
                        radius={800}
                        pathOptions={{
                          color: '#1a73e8',
                          fillColor: '#1a73e8',
                          fillOpacity: 0.6,
                          weight: 1
                        }}
                      >
                        <Popup>
                          <div className="bg-[#2c2c2c] p-2 rounded shadow-md max-w-[200px]">
                            {obs.photo_url && (
                              <img
                                src={obs.photo_url}
                                alt={obs.scientific_name}
                                className="w-full h-24 object-cover rounded mb-2"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  if (obs.source === 'kupunesia') {
                                    e.target.src = defaultPlaceholderKupunesia;
                                  } else if (obs.source === 'burungnesia') {
                                    e.target.src = defaultPlaceholderBurungnesia;
                                  } else {
                                    e.target.src = defaultPlaceholder;
                                  }
                                }}
                              />
                            )}
                            <h3 className="font-bold text-[#e0e0e0] italic">{obs.scientific_name}</h3>
                            <p className="text-sm text-[#aaa] flex items-center gap-1 mt-1">
                              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8]" />
                              <span>{obs.location_name}</span>
                            </p>
                            <p className="text-sm text-[#aaa] flex items-center gap-1 mt-1">
                              <FontAwesomeIcon icon={faCalendar} className="text-[#1a73e8]" />
                              <span>{obs.formatted_date}</span>
                            </p>
                          </div>
                        </Popup>
                      </Circle>
                    ))}
                  </MapContainer>
                </div>
              </div>
            )}
            
            {/* Observations Table */}
            <div className="bg-[#1e1e1e] rounded-lg shadow-md overflow-hidden border border-[#333]">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex justify-center items-center p-8">
                    <FontAwesomeIcon icon={faSpinner} spin size="lg" className="text-[#1a73e8]" />
                    <span className="ml-2">Memuat data...</span>
                  </div>
                ) : error ? (
                  <div className="flex justify-center items-center p-8 text-red-400">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                    <span>{error}</span>
                  </div>
                ) : observations.length === 0 ? (
                  <div className="p-8 text-center text-[#aaa]">
                    Tidak ada observasi ditemukan.
                    {(searchQuery || dateFilter) && (
                      <p className="mt-2">
                        <button
                          onClick={handleClearFilters}
                          className="text-[#1a73e8] hover:underline"
                        >
                          Hapus filter
                        </button>
                      </p>
                    )}
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-[#333]">
                    <thead className="bg-[#2c2c2c]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider">
                          Foto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider">
                          Spesies / Taksa
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider">
                          Lokasi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider min-w-[120px]">
                          Tanggal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider min-w-[110px]">
                          Sumber
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider min-w-[130px]">
                          Grade
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333]">
                      {observations.map((observation) => (
                        <tr 
                          key={`${observation.source}-${observation.id}`} 
                          className="hover:bg-[#2a2a2a] transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-16 h-16 relative bg-[#2c2c2c] rounded flex items-center justify-center overflow-hidden">
                              {observation.photo_url ? (
                                <img
                                  src={observation.photo_url}
                                  alt={observation.scientific_name}
                                  className="w-16 h-16 object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    if (observation.source === 'kupunesia') {
                                      e.target.src = defaultPlaceholderKupunesia;
                                    } else if (observation.source === 'burungnesia') {
                                      e.target.src = defaultPlaceholderBurungnesia;
                                    } else {
                                      e.target.src = defaultPlaceholder;
                                    }
                                    console.log('Error loading image:', observation.photo_url);
                                  }}
                                  onLoad={() => {
                                    console.log('Image loaded successfully:', observation.photo_url);
                                  }}
                                />
                              ) : (
                                <img
                                  src={observation.source === 'kupunesia' ? defaultPlaceholderKupunesia : observation.source === 'burungnesia' ? defaultPlaceholderBurungnesia : defaultPlaceholder}
                                  alt="Default"
                                  className="w-12 h-12 object-contain opacity-60"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-[#e0e0e0] font-medium italic">
                                {getSpeciesSummary(observation)}
                              </p>
                              {observation.genus && observation.species && observation.source === 'taxa' && (
                                <p className="text-[#aaa] text-sm">
                                  {observation.family}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8] mr-2" />
                              <span className="text-[#e0e0e0]">{observation.location_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[#e0e0e0] whitespace-nowrap">
                            {observation.formatted_date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getSourceBadge(observation.source)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs text-white ${
                              observation.quality_assessment?.grade?.toLowerCase() === 'research grade' ? 'bg-blue-700/70' :
                              observation.quality_assessment?.grade?.toLowerCase() === 'confirmed id' ? 'bg-green-700/70' :
                              observation.quality_assessment?.grade?.toLowerCase() === 'needs id' ? 'bg-yellow-700/70' :
                              observation.quality_assessment?.grade?.toLowerCase() === 'low quality id' ? 'bg-orange-700/70' :
                              'bg-gray-700/70'
                            }`}>
                              {observation.quality_assessment?.grade 
                                ? (observation.quality_assessment.grade.toLowerCase() === 'research grade' ? 'ID Lengkap' :
                                   observation.quality_assessment.grade.toLowerCase() === 'confirmed id' ? 'ID Terkonfirmasi' :
                                   observation.quality_assessment.grade.toLowerCase() === 'needs id' ? 'Bantu Iden' :
                                   observation.quality_assessment.grade.toLowerCase() === 'low quality id' ? 'ID Kurang' :
                                   'casual')
                                : (observation.source === 'burungnesia' ? 'Checklist' :
                                   observation.source === 'kupunesia' ? 'Checklist' :
                                   'casual')
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleViewDetails(observation)}
                                className="p-2 bg-[#323232] hover:bg-[#3c3c3c] rounded text-blue-300 transition-colors"
                                title="Lihat Detail"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => handleEdit(observation)}
                                className="p-2 bg-[#323232] hover:bg-[#3c3c3c] rounded text-yellow-300 transition-colors"
                                title="Edit"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(observation)}
                                className="p-2 bg-[#323232] hover:bg-[#3c3c3c] rounded text-red-400 transition-colors"
                                title="Hapus"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              {/* Pagination */}
              {observations.length > 0 && totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-[#333]">
                  <div>
                    <p className="text-sm text-[#aaa]">
                      Halaman {currentPage} dari {totalPages}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-[#323232] text-[#e0e0e0] rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sebelumnya
                    </button>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-[#323232] text-[#e0e0e0] rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Modal */}
      <DeleteObservationModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        observation={selectedObservation}
      />
      
      {/* Details Modal for single species (FOBI-Amaturalist) */}
      <ObservationDetailsModal
        show={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        observation={selectedObservation}
        onEdit={() => {
          setShowDetailsModal(false);
          if (selectedObservation) {
            handleEdit(selectedObservation);
          }
        }}
      />
      
      {/* Multi-species Modal for Burungnesia/Kupunesia */}
      <MultiSpeciesModal
        show={showMultiSpeciesModal}
        onClose={() => setShowMultiSpeciesModal(false)}
        observation={selectedObservation}
        onEdit={() => {
          setShowMultiSpeciesModal(false);
          if (selectedObservation) {
            handleEdit(selectedObservation);
          }
        }}
      />
    </div>
  );
};

export default UserObservations; 