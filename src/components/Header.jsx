import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEnvelope, faUserCircle, faBars, faSearch, faArrowLeft, faArrowRight, faSignOutAlt, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useUser } from '../context/UserContext'; // Import useUser
import axios from 'axios';
import { apiFetch } from '../utils/api';
import { calculateDistance, calculateZoomLevel } from '../utils/geoHelpers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NotificationBar from './NotificationBar';
import PropTypes from 'prop-types';

// Tambahkan fungsi getGradeDisplay di luar komponen
const getGradeDisplay = (grade) => {
  switch(grade.toLowerCase()) {
    case 'research grade':
      return 'ID Lengkap';
    case 'confirmed id':
      return 'ID Terkonfirmasi';
    case 'needs id':
      return 'Bantu Iden';
    case 'low quality id':
      return 'ID Kurang';
    default:
      return 'Casual';
  }
};

const Header = ({ onSearch, setStats, onMapReset, onFilterChange }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { user, setUser, updateTotalObservations } = useUser();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useState({
        search: '',
        location: '',
        latitude: '',
        longitude: '',
        searchType: 'all',
        boundingbox: null,
        radius: 10
    });
    const [filterParams, setFilterParams] = useState({
        start_date: '',
        end_date: '',
        grade: [],
        has_media: false,
        media_type: '',
        data_source: ['fobi', 'burungnesia', 'kupunesia']
    });
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [speciesSuggestions, setSpeciesSuggestions] = useState([]);
    const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);
    const locationDebounceTimer = useRef(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);
    const queryClient = useQueryClient();
    const [showMobileNotifications, setShowMobileNotifications] = useState(false);
    const mobileNotificationRef = useRef(null);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleSearch = () => setIsSearchOpen(!isSearchOpen);
    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

    const handleLogout = async () => {
      try {
        await apiFetch('/logout', {
          method: 'POST'
        });
        localStorage.clear();
        setUser(null);
        navigate('/');
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    const checkUserAuth = () => {
      const token = localStorage.getItem('jwt_token');
      const storedUser = {
        id: localStorage.getItem('user_id'),
        uname: localStorage.getItem('username'),
        totalObservations: localStorage.getItem('totalObservations'),
      };

      if (token && storedUser.id) {
        setUser(storedUser);
      } else {
        setUser(null);
      }
    };

    useEffect(() => {
      checkUserAuth();
    }, [setUser]);

    useEffect(() => {
      const interval = setInterval(() => {
        if (user?.id) {
          updateTotalObservations();
        }
      }, 30000); // Update setiap 30 detik
    
      return () => clearInterval(interval);
    }, [user]);

    const getTaxonomicLevel = (item) => {
      // Check from most general to most specific
      const ranks = [
        'domain',
        'superkingdom',
        'kingdom', 'subkingdom',
        'superphylum', 'phylum', 'subphylum',
        'superclass', 'class', 'subclass', 'infraclass',
        'superorder', 'order', 'suborder', 'infraorder',
        'superfamily', 'family', 'subfamily',
        'supertribe', 'tribe', 'subtribe',
        'genus', 'subgenus',
        'species', 'subspecies', 'variety'
      ];

      for (const rank of ranks) {
        if (item[rank]) {
          return rank;
        }
      }
      return 'species'; // default fallback
    };

    const handleSpeciesSearch = async (query) => {
      if (!query) {
        setSpeciesSuggestions([]);
        return;
      }

      setIsLoadingSpecies(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(query)}`);
        const responseData = await response.json();

        if (!responseData.success) {
          console.error('Error from API:', responseData.message);
          setSpeciesSuggestions([]);
          return;
        }

        const data = responseData.data || [];
        const processedData = data.map(item => ({
          ...item,
          display_name: item.display_name || formatDisplayName(item),
          search_param: item.scientific_name,
          taxonomicLevel: item.rank || getTaxonomicLevel(item)
        }));

        // Urutkan berdasarkan level taksonomi
        const sortedData = processedData.sort((a, b) => {
          const rankOrder = getTaxonomicRankOrder();
          return rankOrder[a.taxonomicLevel] - rankOrder[b.taxonomicLevel];
        });

        setSpeciesSuggestions(sortedData);
      } catch (error) {
        console.error('Error searching species:', error);
        setSpeciesSuggestions([]);
      } finally {
        setIsLoadingSpecies(false);
      }
    };

    const getTaxonomicRankOrder = () => {
      // Urutan dari yang paling umum ke spesifik
      const ranks = [
        'domain',
        'superkingdom',
        'kingdom', 'subkingdom',
        'superphylum', 'phylum', 'subphylum',
        'superclass', 'class', 'subclass', 'infraclass',
        'superorder', 'order', 'suborder', 'infraorder',
        'superfamily', 'family', 'subfamily',
        'supertribe', 'tribe', 'subtribe',
        'genus', 'subgenus',
        'species', 'subspecies', 'variety'
      ];
      
      // Buat object untuk mapping rank ke index untuk sorting
      return ranks.reduce((acc, rank, index) => {
        acc[rank] = index;
        return acc;
      }, {});
    };

    // Tambahkan fungsi helper
    const formatDisplayName = (item) => {
      const rank = item.rank || getTaxonomicLevel(item);
      const scientificName = item[rank] || item.scientific_name;
      const commonName = item[`cname_${rank}`] || item.common_name;

      let displayName = scientificName;
      if (commonName) {
        displayName += ` (${commonName})`;
      }

      // Add family context for genus and species
      if ((rank === 'genus' || rank === 'species') && item.family) {
        displayName += ` | Family: ${item.family}`;
      }

      return displayName;
    };

    const handleSpeciesSelect = (suggestion) => {
      const updatedParams = {
        ...searchParams,
        search: suggestion.scientific_name,
        display: suggestion.display_name,
        searchType: suggestion.rank,
        selectedId: suggestion.id,
        species: {
          id: suggestion.id,
          rank: suggestion.rank,
          scientific_name: suggestion.scientific_name,
          display_name: suggestion.display_name,
          family: suggestion.full_data?.family
        }
      };

      setSearchParams(updatedParams);
      setSpeciesSuggestions([]);
      
      // Buat objek filter lengkap
      const filters = {
        search: suggestion.scientific_name,
        location: searchParams.location || '',
        latitude: searchParams.latitude || null,
        longitude: searchParams.longitude || null,
        radius: searchParams.radius || 10,
        boundingbox: searchParams.boundingbox || null,
        grade: filterParams.grade || [],
        data_source: filterParams.data_source || ['fobi', 'burungnesia', 'kupunesia'],
        has_media: filterParams.has_media || false,
        media_type: filterParams.media_type || null,
        start_date: filterParams.start_date || null,
        end_date: filterParams.end_date || null
      };
      
      // Gunakan onFilterChange jika tersedia
      if (onFilterChange) {
        console.log('Header: Memanggil onFilterChange dari handleSpeciesSelect');
        onFilterChange(filters);
      }
      
      // Fetch stats untuk species yang dipilih
      fetchFilteredStats(filters).then(stats => {
        console.log('Header: Stats fetched in handleSpeciesSelect:', stats);
      });
      
      // Tutup panel pencarian di mobile
      setIsSearchOpen(false);
    };

    const handleLocationSelect = (location) => {
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);
        const bbox = location.boundingbox;

        // Validasi koordinat
        if (isNaN(lat) || isNaN(lon) || 
            lat < -90 || lat > 90 || 
            lon < -180 || lon > 180) {
            console.error('Invalid coordinates:', {lat, lon});
            return;
        }

        // Hitung zoom level berdasarkan radius dan bounding box
        const zoomLevel = calculateZoomLevel(location.radius, bbox);

        setSearchParams({
            ...searchParams,
            location: location.display_name,
            latitude: lat,
            longitude: lon,
            radius: location.radius,
            boundingbox: bbox,
            zoomLevel: zoomLevel
        });

        setLocationSuggestions([]);

        // Update filter dengan lokasi yang dipilih
        if (onFilterChange) {
            onFilterChange({
                latitude: lat,
                longitude: lon,
                radius: location.radius || 10 // Default radius 10km
            });
        }

        // Tetap gunakan fetchFilteredStats untuk backward compatibility
        fetchFilteredStats({
            latitude: lat,
            longitude: lon,
            radius: location.radius || 10
        });
    };

    const handleLocationSearch = async (locationName) => {
        if (!locationName) {
            setLocationSuggestions([]);
            return;
        }

        setIsLoadingLocation(true);
        try {
            // Daftar pulau besar di Indonesia dan koordinatnya
            const majorIslands = {
                'jawa': {
                    display_name: 'Pulau Jawa, Indonesia',
                    lat: -7.6145,
                    lon: 110.7124,
                    radius: 500,
                    boundingbox: [-8.7, -5.9, 105.0, 114.4],
                    type: 'island'
                },
                'sumatera': {
                    display_name: 'Pulau Sumatera, Indonesia',
                    lat: -0.5897,
                    lon: 101.3431,
                    radius: 500,
                    boundingbox: [-6.0, 6.0, 95.0, 106.0],
                    type: 'island'
                },
                'kalimantan': {
                    display_name: 'Pulau Kalimantan, Indonesia',
                    lat: 0.9619,
                    lon: 114.5548,
                    radius: 800,
                    boundingbox: [-4.0, 7.0, 108.0, 119.0],
                    type: 'island'
                },
                'sulawesi': {
                    display_name: 'Pulau Sulawesi, Indonesia',
                    lat: -2.5489,
                    lon: 120.7999,
                    radius: 600,
                    boundingbox: [-6.0, 2.0, 118.0, 125.0],
                    type: 'island'
                },
                'papua': {
                    display_name: 'Pulau Papua, Indonesia',
                    lat: -4.2690,
                    lon: 138.0804,
                    radius: 1000,
                    boundingbox: [-9.0, 0.0, 130.0, 141.0],
                    type: 'island'
                },
                'bali': {
                    display_name: 'Pulau Bali, Indonesia',
                    lat: -8.3405,
                    lon: 115.0920,
                    radius: 100,
                    boundingbox: [-8.9, -8.0, 114.4, 115.7],
                    type: 'island'
                },
                'nusa tenggara': {
                    display_name: 'Kepulauan Nusa Tenggara, Indonesia',
                    lat: -8.6524,
                    lon: 118.7278,
                    radius: 500,
                    boundingbox: [-10.0, -8.0, 115.0, 125.0],
                    type: 'island'
                },
                'maluku': {
                    display_name: 'Kepulauan Maluku, Indonesia',
                    lat: -3.2385,
                    lon: 130.1452,
                    radius: 500,
                    boundingbox: [-8.0, 2.0, 124.0, 135.0],
                    type: 'island'
                }
            };

            // Dapatkan hasil dari Nominatim
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `format=json&` +
                `q=${encodeURIComponent(locationName)}&` +
                `limit=5&` +
                `addressdetails=1&` +
                `bounded=1&` +
                `countrycodes=id`
            );
            const nominatimData = await response.json();

            // Proses hasil Nominatim
            const processedNominatim = nominatimData
                .filter(item => {
                    const lat = parseFloat(item.lat);
                    const lon = parseFloat(item.lon);
                    return !isNaN(lat) && !isNaN(lon) &&
                           lat >= -11.0 && lat <= 6.0 &&
                           lon >= 95.0 && lon <= 141.0;
                })
                .map(item => {
                    const address = item.address;
                    const parts = [];

                    if (address.city || address.town || address.municipality) {
                        parts.push(address.city || address.town || address.municipality);
                    }
                    if (address.state || address.province) {
                        parts.push(address.state || address.province);
                    }

                    const bbox = item.boundingbox.map(coord => parseFloat(coord));
                    const [south, north, west, east] = bbox;
                    const width = calculateDistance(south, west, south, east);
                    const height = calculateDistance(south, west, north, west);
                    const radius = Math.max(width, height) / 2;

                    // Normalisasi koordinat
                    const normalizedLon = ((parseFloat(item.lon) + 180) % 360) - 180;

                    return {
                        display_name: parts.join(', '),
                        lat: parseFloat(item.lat),
                        lon: normalizedLon,
                        boundingbox: bbox,
                        radius: radius,
                        type: address.city ? 'city' :
                              address.town ? 'town' :
                              address.municipality ? 'municipality' :
                              address.state ? 'state' :
                              'area'
                    };
                });

            // Cek apakah pencarian cocok dengan pulau besar
            const searchLower = locationName.toLowerCase();
            const suggestions = [];

            // Tambahkan pulau besar jika ada yang cocok
            Object.entries(majorIslands).forEach(([key, islandData]) => {
                if (searchLower.includes(key)) {
                    suggestions.push({
                        ...islandData,
                        type: 'island'
                    });
                }
            });

            // Tambahkan hasil Nominatim
            suggestions.push(...processedNominatim);

            // Urutkan hasil: pulau dulu, baru hasil spesifik
            const sortedSuggestions = suggestions.sort((a, b) => {
                if (a.type === 'island' && b.type !== 'island') return -1;
                if (a.type !== 'island' && b.type === 'island') return 1;
                if (a.type === 'state' && b.type !== 'state') return -1;
                if (a.type !== 'state' && b.type === 'state') return 1;
                return 0;
            });

            setLocationSuggestions(sortedSuggestions);
        } catch (error) {
            console.error('Error searching location:', error);
            setLocationSuggestions([]);
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleSearch = () => {
      const combinedParams = {
        ...searchParams,
        ...filterParams
      };

      console.log('Header: Memanggil handleSearch dengan params:', combinedParams);

      // Gunakan onFilterChange jika tersedia
      if (onFilterChange) {
        console.log('Header: Memanggil onFilterChange dari handleSearch');
        onFilterChange({
          search: searchParams.search || '',
          location: searchParams.location || '',
          latitude: searchParams.latitude || null,
          longitude: searchParams.longitude || null,
          radius: searchParams.radius || 10,
          boundingbox: searchParams.boundingbox || null,
          grade: filterParams.grade || [],
          data_source: filterParams.data_source || ['fobi', 'burungnesia', 'kupunesia'],
          has_media: filterParams.has_media || false,
          media_type: filterParams.media_type || null,
          start_date: filterParams.start_date || null,
          end_date: filterParams.end_date || null
        });
      }

      // Fetch stats
      fetchFilteredStats(combinedParams).then(stats => {
        console.log('Header: Stats fetched in handleSearch:', stats);
      });

      if (onSearch) {
        console.log('Header: Memanggil onSearch dari handleSearch');
        onSearch(combinedParams);
      }

      // Tutup panel pencarian
      setIsSearchOpen(false);
    };

    const handleFilter = () => {
        // Buat objek filter
        const filters = {
            search: searchParams.search || '',
            location: searchParams.location || '',
            latitude: searchParams.latitude || null,
            longitude: searchParams.longitude || null,
            radius: searchParams.radius || 10,
            boundingbox: searchParams.boundingbox || null,
            grade: filterParams.grade || [],
            data_source: filterParams.data_source || ['fobi', 'burungnesia', 'kupunesia'],
            has_media: filterParams.has_media || false,
            media_type: filterParams.media_type || null,
            start_date: filterParams.start_date || null,
            end_date: filterParams.end_date || null
        };
        
        console.log('Header: Memanggil handleFilter dengan filters:', filters);
        
        // Gunakan onFilterChange jika tersedia
        if (onFilterChange) {
            console.log('Header: Memanggil onFilterChange dari handleFilter');
            onFilterChange(filters);
        }
        
        // Fetch stats
        fetchFilteredStats(filters).then(stats => {
            console.log('Header: Stats fetched in handleFilter:', stats);
        });
        
        // Tutup panel pencarian
        setIsSearchOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchParams.search) {
                handleSpeciesSearch(searchParams.search);
            } else {
                setSpeciesSuggestions([]);
            }
        }, 500); // Delay 500ms untuk menghindari terlalu banyak request

        return () => clearTimeout(delayDebounce);
    }, [searchParams.search]);

    const handleGradeChange = (grade) => {
        setFilterParams(prev => {
            const newGrades = prev.grade.includes(grade)
                ? prev.grade.filter(g => g !== grade)
                : [...prev.grade, grade];

            return {
                ...prev,
                grade: newGrades
            };
        });
    };

    // Query untuk notifikasi
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            if (!user || !localStorage.getItem('jwt_token')) {
                return [];
            }
            const response = await apiFetch('/notifications', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            const data = await response.json();
            return data.success ? data.data : [];
        },
        enabled: !!user && !!localStorage.getItem('jwt_token'),
        refetchInterval: 30000
    });

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    const handleMarkAsRead = async (notificationId) => {
        try {
            await apiFetch(`/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            // Invalidate dan refetch notifikasi
            queryClient.invalidateQueries(['notifications']);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await apiFetch('/notifications/read-all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            queryClient.invalidateQueries(['notifications']);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Modifikasi fungsi untuk menampilkan notifikasi
    const renderMobileNotifications = () => (
        <div className="relative" ref={mobileNotificationRef}>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    setShowMobileNotifications(!showMobileNotifications);
                    // Otomatis tandai semua dibaca saat membuka notifikasi
                    if (!showMobileNotifications && unreadCount > 0) {
                        handleMarkAllAsRead();
                    }
                    e.stopPropagation();
                }}
                className="w-full flex items-center space-x-3 py-2 text-gray-300 hover:text-[#1a73e8] transition-colors"
            >
                <FontAwesomeIcon icon={faBell} />
                <span>Notifikasi</span>
                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 ml-auto">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {showMobileNotifications && (
                <div className="fixed inset-x-4 top-20 bg-[#1e1e1e] rounded-lg shadow-xl z-50 max-h-[70vh] overflow-y-auto">
                    <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-[#1e1e1e]">
                        <h3 className="text-lg font-medium text-gray-300">Notifikasi</h3>
                        <div className="flex items-center space-x-4">
                            {unreadCount > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAllAsRead();
                                    }}
                                    className="text-sm text-[#1a73e8] hover:text-[#0d47a1]"
                                >
                                    Tandai semua dibaca
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMobileNotifications(false);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    </div>
                    <div className="divide-y">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-500">
                                Memuat notifikasi...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                Tidak ada notifikasi baru
                            </div>
                        ) : (
                            notifications.map(notification => {
                                const date = new Date(notification.created_at);
                                const formattedDate = date.toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'numeric',
                                    year: 'numeric'
                                });
                                const formattedTime = date.toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-[#2c2c2c] cursor-pointer ${!notification.is_read ? 'bg-[#121c2c]' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Tandai notifikasi individual dibaca saat diklik
                                            if (!notification.is_read) {
                                                handleMarkAsRead(notification.id);
                                            }
                                            setShowMobileNotifications(false);
                                            toggleSidebar();
                                            navigate(`/observations/${notification.checklist_id}`);
                                        }}
                                    >
                                        <p className="text-sm text-white">{notification.message}</p>
                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                            <span>{formattedDate}</span>
                                            <span className="mx-1">•</span>
                                            <span>{formattedTime}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    // Fungsi untuk mengecek filter aktif
    const hasActiveFilters = () => {
        return searchParams.search || 
               searchParams.location || 
               searchParams.selectedId ||
               filterParams.start_date || 
               filterParams.end_date || 
               filterParams.grade.length > 0 || 
               filterParams.has_media || 
               filterParams.media_type;
    };

    // Modifikasi handleReset untuk menggunakan onFilterChange
    const handleReset = () => {
        console.log('Header: Memanggil handleReset');
        
        // Reset search params
        setSearchParams({
            search: '',
            location: '',
            latitude: '',
            longitude: '',
            searchType: 'all',
            boundingbox: null,
            radius: 10
        });

        // Reset filter params
        setFilterParams({
            start_date: '',
            end_date: '',
            grade: [],
            has_media: false,
            media_type: '',
            data_source: ['fobi', 'burungnesia', 'kupunesia']
        });

        // Gunakan onFilterChange jika tersedia
        if (onFilterChange) {
            console.log('Header: Memanggil onFilterChange dari handleReset');
            onFilterChange({
                search: '',
                location: '',
                latitude: null,
                longitude: null,
                radius: 10,
                boundingbox: null,
                grade: [],
                data_source: ['fobi', 'burungnesia', 'kupunesia'],
                has_media: false,
                media_type: null,
                start_date: null,
                end_date: null
            });
        }
        
        // Fetch stats dengan parameter kosong
        fetchFilteredStats({
            data_source: ['fobi', 'burungnesia', 'kupunesia']
        }).then(stats => {
            console.log('Header: Stats fetched in handleReset:', stats);
        });

        // Reset map jika ada
        if (onMapReset) {
            onMapReset();
        }
        
        // Tutup panel pencarian
        setIsSearchOpen(false);
    };

    const fetchFilteredStats = async (params) => {
      try {
        // Buat query params
        const queryParams = new URLSearchParams();
        
        // Tambahkan parameter search jika ada
        if (params.search) {
          queryParams.append('search', params.search);
        }

        // Tambahkan parameter data source
        if (params.data_source && Array.isArray(params.data_source)) {
          params.data_source.forEach(source => {
            queryParams.append('data_source[]', source);
          });
        } else if (!queryParams.has('data_source[]')) {
          // Default data sources jika tidak ada
          ['fobi', 'burungnesia', 'kupunesia'].forEach(source => {
            queryParams.append('data_source[]', source);
          });
        }

        // Tambahkan parameter lainnya jika ada
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.grade && params.grade.length > 0) {
          params.grade.forEach(g => queryParams.append('grade[]', g));
        }
        if (params.has_media) queryParams.append('has_media', params.has_media);
        if (params.media_type) queryParams.append('media_type', params.media_type);
        
        // Tambahkan parameter lokasi jika ada
        if (params.latitude) queryParams.append('latitude', params.latitude);
        if (params.longitude) queryParams.append('longitude', params.longitude);
        if (params.radius) queryParams.append('radius', params.radius);
        
        // Tambahkan parameter boundingbox jika ada
        if (params.boundingbox && Array.isArray(params.boundingbox) && params.boundingbox.length === 4) {
          queryParams.append('min_lat', params.boundingbox[0]);
          queryParams.append('max_lat', params.boundingbox[1]);
          queryParams.append('min_lng', params.boundingbox[2]);
          queryParams.append('max_lng', params.boundingbox[3]);
        }

        console.log('Header: Fetching filtered stats with params:', queryParams.toString());
        const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?${queryParams}`);
        const data = await response.json();

        if (data.success && data.stats) {
          // Pastikan data memiliki format yang benar
          const validStats = {
            burungnesia: data.stats.burungnesia || 0,
            kupunesia: data.stats.kupunesia || 0,
            fobi: data.stats.fobi || 0,
            observasi: data.stats.observasi || 0,
            spesies: data.stats.spesies || 0,
            kontributor: data.stats.kontributor || 0,
          };
          
          // Simpan stats ke localStorage untuk digunakan oleh GridView dan MapView
          localStorage.setItem('currentStats', JSON.stringify(validStats));
          console.log('Header: Menyimpan stats ke localStorage:', validStats);
          
          if (setStats) {
            setStats(validStats);
          }
          
          return validStats;
        } else {
          console.error('Header: API returned error:', data.message || 'Unknown error');
          return null;
        }
      } catch (error) {
        console.error('Error fetching filtered stats:', error);
        return null;
      }
    };

    // Modifikasi fungsi groupSuggestionsByHierarchy
    const groupSuggestionsByHierarchy = (suggestions) => {
      const searchTerm = searchParams.search.toLowerCase();
      const grouped = {
        families: [], // Untuk menyimpan family suggestions
        taxa: {}      // Untuk menyimpan genus, species, subspecies
      };
      
      if (!suggestions) return grouped;

      suggestions.forEach(suggestion => {
        // Jika ini adalah family, cek apakah match dengan search term
        if (suggestion.rank === 'family' || suggestion.full_data?.taxon_rank === 'family') {
          const familyName = (suggestion.scientific_name || suggestion.full_data?.family || '').toLowerCase();
          const commonName = (suggestion.common_name || suggestion.full_data?.cname_family || '').toLowerCase();
          
          if (familyName.includes(searchTerm) || commonName.includes(searchTerm)) {
            grouped.families.push({
              id: suggestion.id,
              rank: 'family',
              scientific_name: suggestion.scientific_name || suggestion.full_data?.family,
              common_name: suggestion.common_name || suggestion.full_data?.cname_family,
              full_data: suggestion.full_data
            });
          }
          return;
        }

        if (!suggestion.full_data) return;

        const genus = suggestion.full_data.genus;
        const species = suggestion.full_data.species;
        const genusLower = (genus || '').toLowerCase();
        const speciesLower = (species || '').toLowerCase();
        const genusCommonName = (suggestion.full_data.cname_genus || '').toLowerCase();
        const speciesCommonName = (suggestion.full_data.cname_species || '').toLowerCase();
        
        // Tambahkan family jika match dengan search term
        if (suggestion.full_data.family) {
          const familyName = suggestion.full_data.family.toLowerCase();
          const familyCommonName = (suggestion.full_data.cname_family || '').toLowerCase();
          
          if ((familyName.includes(searchTerm) || familyCommonName.includes(searchTerm)) && 
              !grouped.families.some(f => f.scientific_name === suggestion.full_data.family)) {
            grouped.families.push({
              id: suggestion.full_data.id,
              rank: 'family',
              scientific_name: suggestion.full_data.family,
              common_name: suggestion.full_data.cname_family,
              full_data: suggestion.full_data
            });
          }
        }

        // Cek apakah genus match dengan search term
        if (genus && (genusLower.includes(searchTerm) || genusCommonName.includes(searchTerm))) {
          if (!grouped.taxa[genus]) {
            grouped.taxa[genus] = {
              id: suggestion.full_data.id,
              genus: suggestion.full_data.genus,
              cname_genus: suggestion.full_data.cname_genus,
              species: {}
            };
          }
        }
        
        // Cek apakah species match dengan search term
        if (species && (speciesLower.includes(searchTerm) || speciesCommonName.includes(searchTerm))) {
          if (!grouped.taxa[genus]) {
            grouped.taxa[genus] = {
              id: suggestion.full_data.id,
              genus: suggestion.full_data.genus,
              cname_genus: suggestion.full_data.cname_genus,
              species: {}
            };
          }
          
          if (!grouped.taxa[genus].species[species]) {
            grouped.taxa[genus].species[species] = {
              data: suggestion.full_data,
              subspecies: []
            };
          }
        }
        
        // Cek apakah subspecies match dengan search term
        if (suggestion.rank === 'subspecies') {
          const subspeciesName = suggestion.scientific_name.toLowerCase();
          const subspeciesCommonName = (suggestion.common_name || '').toLowerCase();
          
          if (subspeciesName.includes(searchTerm) || subspeciesCommonName.includes(searchTerm)) {
            if (!grouped.taxa[genus]) {
              grouped.taxa[genus] = {
                id: suggestion.full_data.id,
                genus: suggestion.full_data.genus,
                cname_genus: suggestion.full_data.cname_genus,
                species: {}
              };
            }
            
            if (!grouped.taxa[genus].species[species]) {
              grouped.taxa[genus].species[species] = {
                data: suggestion.full_data,
                subspecies: []
              };
            }
            
            grouped.taxa[genus].species[species].subspecies.push(suggestion);
          }
        }
      });

      // Hapus duplikat family
      grouped.families = Array.from(new Set(grouped.families.map(f => f.scientific_name)))
        .map(name => grouped.families.find(f => f.scientific_name === name));
      
      // Hapus taxa yang tidak memiliki species yang match
      Object.keys(grouped.taxa).forEach(genusName => {
        if (Object.keys(grouped.taxa[genusName].species).length === 0) {
          delete grouped.taxa[genusName];
        }
      });
      
      return grouped;
    };

    // Tambahkan useEffect untuk memperbarui stats saat parameter berubah
    useEffect(() => {
      if (searchParams.selectedId || hasActiveFilters()) {
        const combinedParams = {
          ...searchParams,
          ...filterParams
        };
        fetchFilteredStats(combinedParams);
      }
    }, [searchParams.selectedId]);

    // Gunakan di dalam sidebar navigation
    return (
        <header className="fixed top-0 left-0 w-full bg-[#121212] shadow-md z-[55] h-14">
            <div className="w-full h-full px-4">
                <div className="flex items-center justify-between h-full">
                    {/* Logo dan Navigasi di kiri */}
                    <div className="flex items-center h-full">
                        {/* Logo */}
                        <Link to="/" className="flex items-center mr-6">
                            <div className="p-1 flex items-center justify-center">
                                <img src="/FOBI.png" alt="Logo" className="h-7" />
                            </div>
                        </Link>

                        {/* Navigation - Desktop */}
                        <nav className="hidden md:flex h-full">
                            <ul className="flex space-x-6 h-full">
                                <li className="flex items-center">
                                    <Link to="/" className="text-gray-300 hover:text-[#1a73e8] transition-colors text-sm">Jelajahi</Link>
                                </li>
                                <li className="flex items-center">
                                    <Link
                                        to={user ? `/profile/${user.id}/observasi` : '/login'}
                                        className="text-gray-300 hover:text-[#1a73e8] transition-colors text-sm"
                                    >
                                        Eksplorasi Saya
                                    </Link>
                                </li>
                                <li className="flex items-center">
                                    <Link to="/bantu-ident" className="text-gray-300 hover:text-[#1a73e8] transition-colors text-sm">Bantu Ident</Link>
                                </li>
                                <li className="flex items-center">
                                    <Link to="/community" className="text-gray-300 hover:text-[#1a73e8] transition-colors text-sm">Komunitas</Link>
                                </li>
                            </ul>
                        </nav>
                    </div>

                    {/* User Menu - Desktop */}
                    <div className="hidden md:flex items-center">
                        {/* Upload Button - Selalu Tampil */}
                        <Link
                            to="/pilih-observasi"
                            className="bg-[#1a73e8] text-white px-4 py-2 rounded-md hover:bg-[#0d47a1] text-sm font-medium transition duration-150 ease-in-out mr-4"
                        >
                            Observasi Baru
                        </Link>

                        {user ? (
                            <>
                                {/* User Profile dengan Dropdown */}
                                <div className="relative mr-4" ref={dropdownRef}>
                                    <button
                                        onClick={toggleDropdown}
                                        className="flex items-center space-x-2 cursor-pointer"
                                    >
                                        <FontAwesomeIcon icon={faUserCircle} className="text-xl text-[#1a73e8]" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-300">{user.uname}</span>
                                            <span className="text-xs text-gray-400">{user.totalObservations} Observasi</span>
                                        </div>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-[#2c2c2c] rounded-lg shadow-lg py-2 z-50">
                                            <Link
                                                to={`/profile/${user.id}`}
                                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                            >
                                                Profil Saya
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333] flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Notifications & Messages */}
                                <div className="flex items-center space-x-4">
                                    {/* Notifications */}
                                    <div className="relative" ref={notificationRef}>
                                        <button
                                            onClick={() => setShowNotifications(!showNotifications)}
                                            className="relative p-2 text-gray-400 hover:text-gray-200"
                                        >
                                            <FontAwesomeIcon icon={faBell} className="text-xl" />
                                            {!isLoading && notifications.filter(n => !n.is_read).length > 0 && (
                                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                                                    {notifications.filter(n => !n.is_read).length > 99 ? '99+' : notifications.filter(n => !n.is_read).length}
                                                </span>
                                            )}
                                        </button>
                                        {showNotifications && !isLoading && (
                                            <NotificationBar
                                                notifications={notifications}
                                                onClose={() => setShowNotifications(false)}
                                                onMarkAsRead={handleMarkAsRead}
                                            />
                                        )}
                                    </div>

                                    {/* Messages */}
                                    <Link
                                        to="/messages"
                                        className="relative group hidden"
                                    >
                                        <FontAwesomeIcon
                                            icon={faEnvelope}
                                            className="text-gray-400 group-hover:text-[#1a73e8] transition-colors text-xl"
                                        />
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                                            3
                                        </span>
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <div className="relative">
                                <button
                                    onClick={toggleDropdown}
                                    className="flex items-center space-x-2 cursor-pointer text-gray-300 hover:text-[#1a73e8]"
                                >
                                    <FontAwesomeIcon icon={faUserCircle} className="text-xl" />
                                    <span className="text-[12px]">Masuk/Daftar</span>
                                </button>

                                {/* Dropdown untuk Guest */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-[#2c2c2c] rounded-lg shadow-lg py-2 z-50">
                                        <Link
                                            to="/login"
                                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            to="/register"
                                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                        >
                                            Daftar
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mobile Controls */}
                    <div className="flex items-center space-x-3 md:hidden">
                        <button onClick={toggleSearch} className="p-2 text-gray-400">
                            <FontAwesomeIcon icon={faSearch} className="text-xl" />
                        </button>
                        <button onClick={toggleSidebar} className="p-2 text-gray-400">
                            <FontAwesomeIcon icon={faBars} className="text-xl" />
                        </button>
                    </div>
                </div>
            </div>

            {isSearchOpen && (
                <div className="fixed inset-0 z-40 bg-[#1e1e1e]">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <button className="text-gray-400" onClick={toggleSearch}>
                                <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
                            </button>
                            
                            <div className="p-1 inline-flex items-center justify-center">
                                <img src="/FOBI.png" alt="Logo" className="h-6" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Spesies/ genus/ famili"
                                    value={searchParams.display || searchParams.search}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchParams({
                                            ...searchParams,
                                            search: value,
                                            display: value,
                                            selectedId: null
                                        });
                                    }}
                                    className="w-full p-3 border border-[#444] rounded-lg text-sm bg-[#2c2c2c] text-white focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                                />

                                {/* Loading indicator */}
                                {isLoadingSpecies && (
                                    <div className="absolute right-3 top-3">
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}

                                {/* Species suggestions dengan grouping */}
                                {speciesSuggestions.length > 0 && !searchParams.selectedId && (
                                    <div className="absolute z-50 w-full bg-[#2c2c2c] mt-1 rounded shadow-lg max-h-[300px] overflow-y-auto">
                                        {/* Render Family suggestions */}
                                        {groupSuggestionsByHierarchy(speciesSuggestions).families.map((family, index) => (
                                            <div key={`family-${index}`}>
                                                <div className="text-[10px] text-gray-400 px-3 pt-2">
                                                    Family
                                                </div>
                                                <div
                                                    className="p-3 bg-[#333] cursor-pointer text-gray-300 border-b border-gray-700"
                                                    onClick={() => handleSpeciesSelect({
                                                        id: family.id,
                                                        rank: 'family',
                                                        scientific_name: family.scientific_name,
                                                        common_name: family.common_name,
                                                        display_name: `${family.scientific_name}${family.common_name ? ` (${family.common_name})` : ''} - Family`
                                                    })}
                                                >
                                                    <div className="font-medium text-sm">
                                                        <i>{family.scientific_name}</i>
                                                        {family.common_name && ` (${family.common_name})`}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Render Genus, Species, dan Subspecies */}
                                        {Object.entries(groupSuggestionsByHierarchy(speciesSuggestions).taxa).map(([genusName, genusData]) => (
                                            <React.Fragment key={genusName}>
                                                {/* Genus Header */}
                                                <div className="text-[10px] text-gray-400 px-3 pt-2">
                                                    Genus
                                                </div>
                                                <div
                                                    className="p-3 bg-[#333] cursor-pointer text-gray-300 border-b border-gray-700"
                                                    onClick={() => handleSpeciesSelect({
                                                        id: genusData.id,
                                                        rank: 'genus',
                                                        scientific_name: genusData.genus,
                                                        common_name: genusData.cname_genus,
                                                        display_name: `${genusData.genus}${genusData.cname_genus ? ` (${genusData.cname_genus})` : ''} - Genus`
                                                    })}
                                                >
                                                    <div className="font-medium text-sm">
                                                        <i>{genusData.genus}</i>
                                                        {genusData.cname_genus && ` (${genusData.cname_genus})`}
                                                    </div>
                                                    <div className="text-[11px] text-gray-600 mt-0.5">
                                                        Family: {genusData.species[Object.keys(genusData.species)[0]]?.data?.family || ''}
                                                    </div>
                                                </div>

                                                {/* Species and their Subspecies */}
                                                {Object.entries(genusData.species).map(([speciesName, speciesData]) => (
                                                    <React.Fragment key={speciesName}>
                                                        {/* Species */}
                                                        <div className="text-[10px] text-gray-400 px-3 pt-2">
                                                            Species
                                                        </div>
                                                        <div
                                                            className="p-3 pl-6 cursor-pointer text-gray-300 border-b border-gray-700 hover:bg-gray-700"
                                                            onClick={() => handleSpeciesSelect({
                                                                id: speciesData.data.id,
                                                                rank: 'species',
                                                                scientific_name: speciesData.data.species,
                                                                common_name: speciesData.data.cname_species,
                                                                display_name: `${speciesData.data.species}${speciesData.data.cname_species ? ` (${speciesData.data.cname_species})` : ''} - Species`
                                                            })}
                                                        >
                                                            <div className="font-medium text-sm">
                                                                <i>{speciesData.data.species}</i>
                                                                {speciesData.data.cname_species && ` (${speciesData.data.cname_species})`}
                                                            </div>
                                                            <div className="text-[11px] text-gray-600 mt-0.5">
                                                                Family: {speciesData.data.family}
                                                            </div>
                                                        </div>

                                                        {/* Subspecies */}
                                                        {speciesData.subspecies.map((subspecies, index) => (
                                                            <React.Fragment key={index}>
                                                                <div className="text-[10px] text-gray-400 px-3 pt-2">
                                                                    Subspecies
                                                                </div>
                                                                <div
                                                                    className="p-3 pl-9 cursor-pointer text-gray-300 border-b border-gray-700 hover:bg-gray-700"
                                                                    onClick={() => handleSpeciesSelect(subspecies)}
                                                                >
                                                                    <div className="font-medium text-sm">
                                                                        <i>{subspecies.scientific_name}</i>
                                                                        {subspecies.common_name && ` (${subspecies.common_name})`}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-600 mt-0.5">
                                                                        Family: {subspecies.full_data.family}
                                                                    </div>
                                                                </div>
                                                            </React.Fragment>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Lokasi"
                                    value={searchParams.location}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchParams(prev => ({ ...prev, location: value }));
                                        handleLocationSearch(value);
                                    }}
                                    className="w-full p-3 border border-[#444] rounded-lg text-sm bg-[#2c2c2c] text-white focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                                />

                                {/* Loading indicator */}
                                {isLoadingLocation && (
                                    <div className="absolute right-3 top-3">
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}

                                {/* Location suggestions */}
                                {locationSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-[#2c2c2c] border border-[#444] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {locationSuggestions.map((location, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleLocationSelect(location)}
                                                className="w-full p-3 text-left text-sm text-gray-300 hover:bg-[#333] border-b border-[#444] last:border-b-0"
                                            >
                                                {location.display_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Filter Options */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-300">Filter Data</span>
                                </div>

                                {/* Grade Filter */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-300">Grade</label>
                                    {['research grade', 'confirmed id', 'needs id', 'low quality id', 'casual'].map((grade) => (
                                        <label key={grade} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={filterParams.grade.includes(grade)}
                                                onChange={() => handleGradeChange(grade)}
                                                className="rounded bg-[#2c2c2c] border-[#444] text-[#1a73e8]"
                                            />
                                            <span className="text-sm capitalize text-gray-300">{getGradeDisplay(grade)}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Data Source Filter */}
                                <div className="space-y-2">
                                    {['fobi', 'burungnesia', 'kupunesia'].map((source) => (
                                        <label key={source} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filterParams.data_source.includes(source)}
                                                onChange={(e) => {
                                                    const newSources = e.target.checked
                                                        ? [...filterParams.data_source, source]
                                                        : filterParams.data_source.filter(s => s !== source);
                                                    setFilterParams({...filterParams, data_source: newSources});
                                                }}
                                                className="mr-2 bg-[#2c2c2c] border-[#444] text-[#1a73e8]"
                                            />
                                            <span className="text-sm text-gray-300 capitalize">{source}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Media Type Filter */}
                                <select
                                    value={filterParams.media_type}
                                    onChange={(e) => setFilterParams({...filterParams, media_type: e.target.value})}
                                    className="w-full p-2 border border-[#444] rounded text-sm bg-[#2c2c2c] text-gray-300"
                                >
                                    <option value="">Semua Media</option>
                                    <option value="photo">Foto</option>
                                    <option value="audio">Audio</option>
                                </select>

                                {/* Has Media Checkbox */}
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={filterParams.has_media}
                                        onChange={(e) => setFilterParams({...filterParams, has_media: e.target.checked})}
                                        className="mr-2 bg-[#2c2c2c] border-[#444] text-[#1a73e8]"
                                    />
                                    <span className="text-sm text-gray-300">Hanya tampilkan dengan media</span>
                                </label>
                            </div>

                            <div className="flex justify-between items-center mt-4">
                                {hasActiveFilters() && (
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-2 bg-[#333] text-red-400 rounded-full hover:bg-[#444] transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
                                    >
                                        <FontAwesomeIcon icon={faTimes} className="text-sm" />
                                        <span>Reset</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleSearch}
                                    className="bg-[#1a73e8] text-white py-2 px-6 rounded-full text-sm hover:bg-[#0d47a1] transition-colors flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faSearch} />
                                    <span>Terapkan</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleSidebar} />
                    <div className="fixed right-0 top-0 bottom-0 w-72 bg-[#1e1e1e] shadow-xl">
                        <button
                            onClick={toggleSidebar}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#333] transition-colors"
                            aria-label="Close sidebar"
                        >
                            <FontAwesomeIcon icon={faTimes} className="text-gray-400 text-lg" />
                        </button>

                        <div className="p-4">
                            {/* Logo FOBI pada sidebar mobile */}
                            <div className="flex justify-center mb-6">
                                <div className="p-1.5 inline-flex items-center justify-center">
                                    <img src="/FOBI.png" alt="Logo" className="h-8" />
                                </div>
                            </div>
                            
                            {/* User Profile Section dengan padding tambahan di kanan untuk tombol close */}
                            {user ? (
                                <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-[#444] pr-8">
                                    <FontAwesomeIcon icon={faUserCircle} className="text-[#1a73e8] text-3xl" />
                                    <div>
                                        <p className="font-medium text-gray-300">{user.uname}</p>
                                        <p className="text-sm text-gray-400">{user.totalObservations} Observasi</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6 pb-4 border-b border-[#444] space-y-3 pr-8">
                                    <p className="text-gray-400">Guest</p>
                                    <div className="space-y-2">
                                        <Link
                                            to="/login"
                                            className="block w-full text-center py-2 text-[#1a73e8] border border-[#1a73e8] rounded-lg hover:bg-[#1a73e8] hover:text-white transition-colors"
                                            onClick={toggleSidebar}
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            to="/register"
                                            className="block w-full text-center py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#0d47a1] transition-colors"
                                            onClick={toggleSidebar}
                                        >
                                            Daftar
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <nav className="space-y-4">
                                {user && (
                                    <Link
                                        to="/pilih-observasi"
                                        className="flex items-center py-2 text-white bg-[#1a73e8] rounded-lg px-3 hover:bg-[#0d47a1] transition-colors"
                                        onClick={toggleSidebar}
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                        <span>Observasi Baru</span>
                                    </Link>
                                )}

                                <Link
                                    to="/"
                                    className="flex items-center py-2 text-gray-300 hover:text-[#1a73e8] transition-colors"
                                    onClick={toggleSidebar}
                                >
                                    Jelajahi
                                </Link>
                                <Link
                                    to={user ? `/profile/${user.id}/observasi` : '/login'}
                                    className="flex items-center py-2 text-gray-300 hover:text-[#1a73e8] transition-colors"
                                    onClick={toggleSidebar}
                                >
                                    Eksplorasi Saya
                                </Link>
                                <Link
                                    to="/bantu-ident"
                                    className="flex items-center py-2 text-gray-300 hover:text-[#1a73e8] transition-colors"
                                    onClick={toggleSidebar}
                                >
                                    Bantu Ident
                                </Link>
                                <Link
                                    to="/community"
                                    className="flex items-center py-2 text-gray-300 hover:text-[#1a73e8] transition-colors"
                                    onClick={toggleSidebar}
                                >
                                    Komunitas
                                </Link>

                                {user && (
                                    <>
                                        <div className="border-t border-[#444] pt-4 mt-4 space-y-4">
                                            <Link
                                                to={`/profile/${user.id}`}
                                                className="flex items-center space-x-3 py-2 text-gray-300 hover:text-[#1a73e8] transition-colors"
                                                onClick={toggleSidebar}
                                            >
                                                <FontAwesomeIcon icon={faUserCircle} />
                                                <span>Profil Saya</span>
                                            </Link>
                                            {renderMobileNotifications()}
                                            <Link
                                                to="/messages"
                                                className="flex items-center space-x-3 py-2 text-gray-300 hover:text-[#1a73e8] transition-colors hidden"
                                                onClick={toggleSidebar}
                                            >
                                                <FontAwesomeIcon icon={faEnvelope} />
                                                <span>Pesan</span>
                                                <span className="bg-red-500 text-white text-xs rounded-full px-2 ml-auto">3</span>
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left flex items-center space-x-3 py-2 text-gray-300 hover:text-[#1a73e8] transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faSignOutAlt} />
                                                <span>Keluar</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

Header.propTypes = {
    onSearch: PropTypes.func,
    setStats: PropTypes.func.isRequired,
    onMapReset: PropTypes.func,
    onFilterChange: PropTypes.func
};

export default Header;