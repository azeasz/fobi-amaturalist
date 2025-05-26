import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap, Circle, Tooltip } from 'react-leaflet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faChevronLeft, faChevronRight, faMapMarkerAlt, faSpinner, faTimes, faBars } from '@fortawesome/free-solid-svg-icons';
import 'leaflet/dist/leaflet.css';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useInView } from 'react-intersection-observer';

// Import logo dari assets
import fobiLogo from '../assets/icon/FOBI.png';
import birdLogo from '../assets/icon/icon.png';
import butterflyLogo from '../assets/icon/kupnes.png';

// Ubah object sourceLogo
const sourceLogo = {
    fobi: fobiLogo,
    bird: birdLogo,
    butterfly: butterflyLogo
};

// Cache untuk lokasi
const locationCache = new Map();

// Ambil data user dari localStorage
const getUserData = () => {
    return {
      uname: localStorage.getItem('username'),
      level: localStorage.getItem('level'),
      email: localStorage.getItem('email'),
      bio: localStorage.getItem('bio'),
      profile_picture: localStorage.getItem('profile_picture'),
      totalObservations: localStorage.getItem('totalObservations'),
    };
  };
  const userData = getUserData();


// Tambahkan fungsi generateGrid
const generateGrid = (observations, gridSize) => {
    const grid = {};
    observations.forEach(({ latitude, longitude, nama_latin, nama_umum, id, source }) => {
        const lat = Math.floor(latitude / gridSize) * gridSize;
        const lng = Math.floor(longitude / gridSize) * gridSize;
        const key = `${lat},${lng}`;

        if (!grid[key]) {
            grid[key] = { count: 0, data: [] };
        }
        grid[key].count++;
        grid[key].data.push({ id, latitude, longitude, nama_latin, nama_umum, source });
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
};

// Ubah fungsi getColor untuk tema gelap
const getColor = (count) => {
    return count > 50 ? 'rgba(66, 133, 244, 0.9)' :
           count > 20 ? 'rgba(52, 120, 246, 0.85)' :
           count > 10 ? 'rgba(30, 108, 247, 0.8)' :
           count > 5  ? 'rgba(8, 96, 248, 0.75)' :
           count > 2  ? 'rgba(8, 84, 216, 0.7)' :
                       'rgba(8, 72, 184, 0.65)';
};

// Pindahkan fungsi helper ke luar komponen
const getSourceName = (source) => {
    switch(source) {
        case 'bird':
            return 'Burungnesia';
        case 'butterfly':
            return 'Kupunesia';
        case 'fobi':
            return 'FOBI';
        default:
            return source;
    }
};

const getMarkerColor = (source) => {
    switch(source) {
        case 'fobi':
            return '#2563eb'; // blue
        case 'bird':
            return '#16a34a'; // green
        case 'butterfly':
            return '#dc2626'; // red
        default:
            return '#6b7280'; // gray
    }
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const ProfileObservations = () => {
    const { id } = useParams();
    const [observations, setObservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [mapCenter, setMapCenter] = useState([-2.5489, 118.0149]);
    const [locations, setLocations] = useState({});
    const [imageLoading, setImageLoading] = useState({});
    const searchTimeout = useRef(null);
    const [dateFilter, setDateFilter] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchType, setSearchType] = useState('all'); // 'all', 'species', 'location', 'date'
    const abortController = useRef(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [gridData, setGridData] = useState([]);
    const [selectedGrid, setSelectedGrid] = useState(null);
    const [mapObservations, setMapObservations] = useState([]);
    const [visibleGrid, setVisibleGrid] = useState('extraLarge');
    const [gridLevels, setGridLevels] = useState({
        small: [],
        medium: [],
        large: [],
        extraLarge: []
    });
    const [showMarkers, setShowMarkers] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [hoveredMarker, setHoveredMarker] = useState(null);
    const [filteredMapObservations, setFilteredMapObservations] = useState([]);
    const [filteredGridLevels, setFilteredGridLevels] = useState({
        small: [],
        medium: [],
        large: [],
        extraLarge: []
    });
    const [userData, setUserData] = useState({
        uname: '',
        totalObservations: 0
    });
    const [displayedItems, setDisplayedItems] = useState(10);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [allObservations, setAllObservations] = useState([]);
    const [showSidebar, setShowSidebar] = useState(true);

    const { ref, inView } = useInView({
        threshold: 0,
    });

    // Tambahkan fungsi untuk generate unique key
    const generateUniqueKey = (obs) => {
        const timestamp = new Date(obs.observation_date).getTime() || Date.now();
        const randomId = uuidv4();
        return `${obs.id}-${obs.source}-${timestamp}-${randomId}`;
    };

    // Fungsi untuk mendapatkan nama lokasi dengan cache
    const getLocationName = useCallback(async (latitude, longitude) => {
        const cacheKey = `${latitude},${longitude}`;

        if (locationCache.has(cacheKey)) {
            return locationCache.get(cacheKey);
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'FOBI/1.0'
                    }
                }
            );
            const data = await response.json();
            const locationName = data.display_name || 'Lokasi tidak diketahui';

            // Simpan ke cache
            locationCache.set(cacheKey, locationName);
            return locationName;
        } catch (error) {
            console.error('Error fetching location:', error);
            return 'Lokasi tidak diketahui';
        }
    }, []);

    // Fungsi untuk handle pencarian
    const handleSearch = useCallback(async () => {
        try {
            setIsSearching(true);
            setError(null);

            // Cancel request sebelumnya jika ada
            if (abortController.current) {
                abortController.current.abort();
            }

            abortController.current = new AbortController();

            const url = new URL(`${import.meta.env.VITE_API_URL}/profile/observations/${id}`, window.location.origin);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('search', searchQuery);
            url.searchParams.append('search_type', searchType);

            // Format tanggal ke YYYY-MM-DD jika ada
            if (dateFilter) {
                url.searchParams.append('date', dateFilter);
            }

            const response = await fetch(url, {
                signal: abortController.current.signal,
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Gagal memuat data');
            }

            const data = await response.json();

            if (data.success) {
                setObservations(data.data.observations);
                setTotalPages(data.data.last_page);

                // Update map center jika ada hasil
                if (data.data.observations.length > 0) {
                    const firstObs = data.data.observations[0];
                    setMapCenter([firstObs.latitude, firstObs.longitude]);
                }
            } else {
                throw new Error(data.message || 'Terjadi kesalahan');
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Error searching observations:', err);
            setError('Gagal mencari data observasi');
        } finally {
            setIsSearching(false);
        }
    }, [id, searchQuery, dateFilter, searchType, page]);

    // Update fungsi fetchSuggestions
    const fetchSuggestions = useCallback(async (query) => {
        if (!query || query.length < 2) return;

        try {
            // const url = new URL(`/api/profile/search-suggestions`);
            const url = new URL(`${import.meta.env.VITE_API_URL}/profile/search-suggestions`); // alternatif jika menggunakan port berbeda
            url.searchParams.append('q', query);
            url.searchParams.append('type', searchType);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (data.success) {
                const transformedSuggestions = data.data.map(item => {
                    if (item.scientific_name) {
                        return {
                            scientific_name: item.scientific_name,
                            common_name: item.common_name || item.cname_species || item.nameId,
                            type: 'species'
                        };
                    }
                    return {
                        name: item.name || item.location,
                        type: item.type || 'location'
                    };
                });
                setSuggestions(transformedSuggestions);
            } else {
                setSuggestions([]);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            setSuggestions([]);
        }
    }, [searchType]);

    // Update handleSearchChange dengan error handling yang lebih baik
    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        setSearch(value);
        
        if (!value) {
            setFilteredMapObservations(mapObservations);
            setFilteredGridLevels(gridLevels);
            setSearchQuery('');
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            if (value.length >= 2) {
                fetchSuggestions(value);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [mapObservations, gridLevels, fetchSuggestions]);

    // Update handleSearchTypeChange untuk reset suggestions
    const handleSearchTypeChange = useCallback((e) => {
        setSearchType(e.target.value);
        setSuggestions([]);
        setShowSuggestions(false);
        if (search.length >= 2) {
            fetchSuggestions(search);
        }
    }, [search, fetchSuggestions]);

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

    // Fungsi untuk filter observasi
    const filterObservations = useCallback((observations, searchQuery, searchType, dateFilter) => {
        if (!Array.isArray(observations)) return [];
        
        return observations.filter(obs => {
            if (!searchQuery && !dateFilter) return true;

            if (searchType === 'species') {
                const searchLower = searchQuery.toLowerCase();
                const namaLatin = (obs.nama_latin || obs.scientific_name || obs.nameLat || '').toLowerCase();
                const namaUmum = (obs.nama_umum || obs.common_name || obs.nameId || obs.cname_species || '').toLowerCase();
                return namaLatin.includes(searchLower) || namaUmum.includes(searchLower);
            }
            else if (searchType === 'location' && obs.location) {
                return obs.location.toLowerCase().includes(searchQuery.toLowerCase());
            }
            else if (searchType === 'date' && dateFilter) {
                const obsDate = new Date(obs.observation_date || obs.created_at).toISOString().split('T')[0];
                return obsDate === dateFilter;
            }
            else if (searchType === 'all' && searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                const namaLatin = (obs.nama_latin || obs.scientific_name || obs.nameLat || '').toLowerCase();
                const namaUmum = (obs.nama_umum || obs.common_name || obs.nameId || obs.cname_species || '').toLowerCase();
                const location = (obs.location || '').toLowerCase();
                return namaLatin.includes(searchLower) || 
                       namaUmum.includes(searchLower) || 
                       location.includes(searchLower);
            }
            return true;
        });
    }, []);

    // Update handleSearchSubmit
    const handleSearchSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSearching(true);

        try {
            const filteredObs = filterObservations(mapObservations, search, searchType, dateFilter);
            setFilteredMapObservations(filteredObs);
            
            // Generate grid baru dari hasil filter
            const newGrids = generateGridLevels(filteredObs);
            setFilteredGridLevels(newGrids);
            
            setSearchQuery(search);
        } catch (error) {
            console.error('Error filtering observations:', error);
        } finally {
            setIsSearching(false);
        }
    }, [search, searchType, dateFilter, mapObservations, filterObservations, generateGridLevels]);

    // Handle pilih suggestion
    const handleSelectSuggestion = useCallback(async (suggestion) => {
        setShowSuggestions(false);
        setSearch(suggestion.name || suggestion.scientific_name || '');
        setIsSearching(true);

        try {
            let filteredObs;
            if (suggestion.type === 'species') {
                // Filter berdasarkan nama spesies
                filteredObs = mapObservations.filter(obs => {
                    const namaLatin = (obs.nama_latin || obs.scientific_name || obs.nameLat || '').toLowerCase();
                    const namaUmum = (obs.nama_umum || obs.common_name || obs.nameId || obs.cname_species || '').toLowerCase();
                    const searchName = (suggestion.name || suggestion.scientific_name || '').toLowerCase();
                    return namaLatin.includes(searchName) || namaUmum.includes(searchName);
                });
            } else if (suggestion.type === 'location') {
                // Filter berdasarkan lokasi
                filteredObs = mapObservations.filter(obs => 
                    obs.location?.toLowerCase().includes(suggestion.name.toLowerCase())
                );
            } else {
                filteredObs = filterObservations(mapObservations, suggestion.name, 'all', dateFilter);
            }

            // Update state untuk map
            setFilteredMapObservations(filteredObs);
            const newGrids = generateGridLevels(filteredObs);
            setFilteredGridLevels(newGrids);
            setSearchQuery(suggestion.name || suggestion.scientific_name || '');
            setSearchType(suggestion.type);

            // Update state untuk tabel
            const url = new URL(`${import.meta.env.VITE_API_URL}/profile/observations/${id}`, window.location.origin);
            url.searchParams.append('search', suggestion.name || suggestion.scientific_name || '');
            url.searchParams.append('search_type', suggestion.type);
            url.searchParams.append('page', '1');
            if (dateFilter) url.searchParams.append('date', dateFilter);

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setObservations(data.data.observations);
                setTotalPages(data.data.last_page);
                setPage(1);
            }
        } catch (error) {
            console.error('Error handling suggestion:', error);
        } finally {
            setIsSearching(false);
        }
    }, [id, mapObservations, dateFilter, filterObservations, generateGridLevels]);

    // Handle perubahan tanggal
    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setDateFilter(newDate);
        setPage(1); // Reset halaman ke 1

        // Trigger pencarian setelah tanggal berubah
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            handleSearch();
        }, 500);
    };

    const fetchObservations = useCallback(async () => {
        try {
            setLoading(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/profile/observations/${id}`);
            url.searchParams.append('page', page);
            url.searchParams.append('search', searchQuery);
            if (dateFilter) {
                url.searchParams.append('date', dateFilter);
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setAllObservations(prev => [...prev, ...data.data.observations]);
                setHasMore(data.data.current_page < data.data.last_page);
                
                if (data.data.observations.length > 0 && page === 1) {
                    const firstObs = data.data.observations[0];
                    setMapCenter([firstObs.latitude, firstObs.longitude]);
                }

                // Batch fetch locations untuk data baru
                const newLocations = {};
                await Promise.all(
                    data.data.observations.map(async (obs) => {
                        const locationName = await getLocationName(obs.latitude, obs.longitude);
                        newLocations[obs.id] = locationName;
                    })
                );
                setLocations(prev => ({ ...prev, ...newLocations }));
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Error fetching observations:', err);
            setError('Gagal memuat data observasi');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [id, page, searchQuery, dateFilter, getLocationName]);

    // Fungsi untuk memuat lebih banyak data
    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            setLoadingMore(true);
            setPage(prevPage => prevPage + 1);
        }
    }, [loadingMore, hasMore]);

    // Effect untuk infinite scroll
    useEffect(() => {
        if (inView && hasMore && !loadingMore) {
            loadMore();
        }
    }, [inView, hasMore, loadingMore, loadMore]);

    // Reset data saat search atau filter berubah
    useEffect(() => {
        setAllObservations([]);
        setPage(1);
        setHasMore(true);
    }, [searchQuery, dateFilter, searchType]);

    useEffect(() => {
        if (id) {
            fetchObservations();
        }

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
            if (abortController.current) {
                abortController.current.abort();
            }
        };
    }, [id, page, searchQuery, dateFilter, fetchObservations]);

    useEffect(() => {
        if (observations.length > 0) {
            const grid = generateGrid(observations, 0.5); // Sesuaikan ukuran grid sesuai kebutuhan
            setGridData(grid);
        }
    }, [observations]);

    // Handle klik pada grid
    const handleGridClick = useCallback((grid) => {
        setSelectedGrid(grid);
    }, []);

    const handleImageLoad = useCallback((obsId) => {
        setImageLoading(prev => ({
            ...prev,
            [obsId]: false
        }));
    }, []);

    const getDefaultImage = useCallback((source) => {
        return sourceLogo[source] || fobiLogo;
    }, []);

    // Komponen untuk baris tabel
    const TableRow = React.memo(({ observation }) => {
        const rowKey = `${observation.id}-${observation.source}-${Date.now()}`;

        return (
            <tr key={rowKey} className="border-b">
                <td className="px-4 py-2">
                    <div className="w-16 h-16 relative bg-gray-50 rounded flex items-center justify-center overflow-hidden">
                        {observation.photo_url ? (
                            <img
                                src={observation.photo_url}
                                alt={observation.nama_latin}
                                className="w-16 h-16 object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = getDefaultImage(observation.source);
                                }}
                                loading="lazy"
                            />
                        ) : (
                            <img
                                src={getDefaultImage(observation.source)}
                                alt={`Logo ${observation.source}`}
                                className="w-12 h-12 object-contain"
                            />
                        )}
                    </div>
                </td>
                <td className="px-4 py-2 italic">{observation.nama_latin}</td>
                <td className="px-4 py-2">{observation.nama_umum}</td>
                <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-teal-600" />
                        <span className="text-sm">{locations[observation.id] || 'Memuat lokasi...'}</span>
                    </div>
                </td>
                <td className="px-4 py-2">
                    {observation.source === 'fobi' ? 'FOBI' :
                     observation.source === 'bird' ? 'Burungnesia' :
                     observation.source === 'butterfly' ? 'Kupunesia' : observation.source}
                </td>
                <td className="px-4 py-2">
                    {observation.observation_date ?
                        new Date(observation.observation_date).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }) :
                        '-'}
                </td>
            </tr>
        );
    });

    // Komponen untuk marker peta
    const MapMarker = React.memo(({ observation }) => {
        const markerKey = `marker-${observation.id}-${observation.source}-${Date.now()}`;

        return (
            <Marker
                key={markerKey}
                position={[observation.latitude, observation.longitude]}
            >
                <Popup>
                    <div>
                        <h3 className="font-bold">{observation.nama_latin}</h3>
                        <p>{observation.nama_umum}</p>
                        <p className="text-sm">{locations[observation.id]}</p>
                    </div>
                </Popup>
            </Marker>
        );
    });

    // Komponen Marker sebagai komponen terpisah
    const ObservationMarker = memo(({ observation }) => {
        const isSelected = selectedMarker?.id === observation.id;
        const isHovered = hoveredMarker?.id === observation.id;
        
        const handleClick = useCallback(() => {
            setSelectedMarker(observation);
        }, [observation]);

        const handleMouseOver = useCallback(() => {
            setHoveredMarker(observation);
        }, [observation]);

        const handleMouseOut = useCallback(() => {
            setHoveredMarker(null);
        }, []);

        return (
            <Circle
                center={[observation.latitude, observation.longitude]}
                radius={isSelected || isHovered ? 1000 : 800}
                pathOptions={{
                    color: getMarkerColor(observation.source),
                    fillColor: getMarkerColor(observation.source),
                    fillOpacity: isSelected || isHovered ? 0.8 : 0.6,
                    weight: isSelected || isHovered ? 2 : 1
                }}
                eventHandlers={{
                    click: handleClick,
                    mouseover: handleMouseOver,
                    mouseout: handleMouseOut
                }}
            >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                    <div className="text-sm">
                        <p className="font-semibold italic">{observation.nama_latin}</p>
                        <p>{observation.nama_umum}</p>
                        <p className="text-xs text-gray-600">{getSourceName(observation.source)}</p>
                    </div>
                </Tooltip>
                {isSelected && (
                    <Popup>
                        <div className="max-w-xs">
                            {observation.photo_url && (
                                <img 
                                    src={observation.photo_url} 
                                    alt={observation.nama_latin}
                                    className="w-full h-32 object-cover rounded-lg mb-2"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = getDefaultImage(observation.source);
                                    }}
                                />
                            )}
                            <h3 className="font-bold italic">{observation.nama_latin}</h3>
                            <p className="text-gray-600">{observation.nama_umum}</p>
                            <div className="mt-2 text-sm">
                                <p className="flex items-center gap-1">
                                    <span className="font-semibold">Sumber:</span>
                                    <span className="capitalize">{getSourceName(observation.source)}</span>
                                </p>
                                <p className="flex items-center gap-1">
                                    <span className="font-semibold">Tanggal:</span>
                                    <span>{formatDate(observation.observation_date)}</span>
                                </p>
                                {observation.family && (
                                    <p className="flex items-center gap-1">
                                        <span className="font-semibold">Famili:</span>
                                        <span>{observation.family}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </Popup>
                )}
            </Circle>
        );
    });

    // ZoomHandler sebagai komponen terpisah
    const ZoomHandler = memo(() => {
        const map = useMap();

        useEffect(() => {
            if (!map) return;

            const handleZoomEnd = () => {
                const zoom = map.getZoom();
                if (zoom > 12) {
                    setShowMarkers(true);
                    setVisibleGrid('none');
                } else if (zoom > 10) {
                    setShowMarkers(false);
                    setVisibleGrid('small');
                } else if (zoom > 8) {
                    setVisibleGrid('medium');
                } else if (zoom > 6) {
                    setVisibleGrid('large');
                } else {
                    setVisibleGrid('extraLarge');
                }
            };

            map.on('zoomend', handleZoomEnd);
            handleZoomEnd();

            return () => {
                map.off('zoomend', handleZoomEnd);
            };
        }, [map]);

        return null;
    });

    // Reset filter
    const handleClearSearch = useCallback(() => {
        setSearch('');
        setSearchQuery('');
        setDateFilter('');
        setSearchType('all');
        setFilteredMapObservations(mapObservations);
        setFilteredGridLevels(gridLevels);
    }, [mapObservations, gridLevels]);

    // Fetch map data
    const fetchMapData = useCallback(async () => {
        try {
            const url = new URL(`${import.meta.env.VITE_API_URL}/profile/observations/${id}`, window.location.origin);
            url.searchParams.append('map', 'true');
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                const observations = Array.isArray(data.data) ? data.data : [];
                setMapObservations(observations);
                const grids = generateGridLevels(observations);
                setGridLevels(grids);
                setFilteredMapObservations(observations);
                setFilteredGridLevels(grids);
            }
        } catch (error) {
            console.error('Error fetching map data:', error);
        }
    }, [id, generateGridLevels]);

    // Panggil fetchMapData saat komponen dimount
    useEffect(() => {
        fetchMapData();
    }, [fetchMapData]);

    // Tambahkan toggle function
    const toggleSidebar = () => {
        setShowSidebar(!showSidebar);
    };

    return (
        <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
            <Header userData={getUserData()} />

            <div className="container mx-auto px-2 sm:px-4 py-8 mt-10">
                {/* Toggle Sidebar Button - Visible on mobile */}
                <button 
                    onClick={toggleSidebar}
                    className="lg:hidden mb-4 p-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0]"
                >
                    {showSidebar ? <FontAwesomeIcon icon={faBars} /> : <FontAwesomeIcon icon={faBars} />}
                </button>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar dengan kondisi responsive */}
                    <div className={`
                        ${showSidebar ? 'block' : 'hidden'} 
                        lg:block
                        w-full lg:w-64 
                        transition-all duration-300
                    `}>
                        <Sidebar userId={id} />
                    </div>
                    
                    {/* Main Content dengan responsive layout */}
                    <div className="flex-1 min-w-0">
                        {/* Search Bar */}
                        <div className="mb-6 bg-[#1e1e1e] p-2 sm:p-4 rounded-lg shadow border border-[#444]">
                            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={handleSearchChange}
                                            placeholder="Cari observasi..."
                                            className="w-full p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                                            disabled={isSearching}
                                        />
                                        {/* Suggestions dropdown */}
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="absolute z-800 w-full mt-1 bg-[#2c2c2c] border border-[#444] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {suggestions.map((suggestion, index) => (
                                                    <div
                                                        key={index}
                                                        className="p-2 hover:bg-[#3c3c3c] cursor-pointer border-b border-[#444] last:border-b-0"
                                                        onClick={() => handleSelectSuggestion(suggestion)}
                                                    >
                                                        {suggestion.scientific_name ? (
                                                            <div>
                                                                <div className="font-semibold italic text-[#e0e0e0]">{suggestion.scientific_name}</div>
                                                                {suggestion.common_name && (
                                                                    <div className="text-sm text-gray-400">{suggestion.common_name}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[#e0e0e0]">{suggestion.name}</div>
                                                        )}
                                                        <div className="text-xs text-gray-400">{suggestion.type}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                        <select
                                            value={searchType}
                                            onChange={handleSearchTypeChange}
                                            className="w-full sm:w-48 p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                                            disabled={isSearching}
                                        >
                                            <option value="all">Semua</option>
                                            <option value="species">Nama Spesies</option>
                                            <option value="location">Lokasi</option>
                                            <option value="date">Tanggal</option>
                                        </select>
                                        <input
                                            type="date"
                                            value={dateFilter}
                                            onChange={handleDateChange}
                                            className="w-full sm:w-48 p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                                            disabled={isSearching}
                                        />
                                        <button
                                            type="submit"
                                            className="w-full sm:w-auto px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0] disabled:opacity-50"
                                            disabled={isSearching}
                                        >
                                            {isSearching ? (
                                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                            ) : (
                                                <FontAwesomeIcon icon={faSearch} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Loading Overlay */}
                        {isSearching && (
                            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-800">
                                <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-lg flex flex-col items-center gap-4 border border-[#444]">
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[#1a73e8]" />
                                    <p className="text-lg text-[#e0e0e0]">Mencari data...</p>
                                </div>
                            </div>
                        )}

                        {/* Content area */}
                        <div className={`transition-all duration-200 ${isSearching ? 'opacity-50' : 'opacity-100'}`}>
                            {/* Loading State */}
                            {loading && (
                                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-800">
                                    <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-lg flex flex-col items-center gap-4 border border-[#444]">
                                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[#1a73e8]" />
                                        <p className="text-lg text-[#e0e0e0]">Memuat data...</p>
                                    </div>
                                </div>
                            )}

                            {/* Error State */}
                            {error && (
                                <div className="bg-[#3a0f0f] border border-red-700 text-red-300 px-4 py-3 rounded relative mb-4">
                                    <span className="block sm:inline">{error}</span>
                                </div>
                            )}


                            {/* Map */}
                            <div className="h-[300px] sm:h-[400px] mb-6 rounded-lg overflow-hidden shadow-lg border border-[#444]">
                                <MapContainer
                                    center={mapCenter}
                                    zoom={5}
                                    style={{ height: '100%', width: '100%' }}
                                    className="dark-map"
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                    />
                                    <ZoomHandler />
                                    
                                    {/* Grid Rectangles */}
                                    {!showMarkers && visibleGrid !== 'none' && 
                                        (searchQuery ? filteredGridLevels : gridLevels)[visibleGrid]?.map((grid, index) => (
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
                                                                        <p className="italic text-[#e0e0e0]">{obs.nama_latin}</p>
                                                                        <p className="text-gray-300">{obs.nama_umum}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                )}
                                            </Rectangle>
                                        ))}

                                    {/* Individual Markers */}
                                    {showMarkers && (searchQuery ? filteredMapObservations : mapObservations).map((obs, index) => (
                                        <ObservationMarker 
                                            key={`marker-${obs.id}-${index}`}
                                            observation={obs}
                                        />
                                    ))}
                                </MapContainer>
                            </div>

                            {/* Tambahkan tombol reset filter */}
                            {searchQuery && (
                                <div className="mb-4">
                                    <button
                                        onClick={handleClearSearch}
                                        className="px-4 py-2 bg-[#2c2c2c] text-[#e0e0e0] rounded-lg hover:bg-[#3c3c3c] flex items-center gap-2 border border-[#444]"
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                        <span>Reset Filter</span>
                                    </button>
                                </div>
                            )}

                            {/* Table */}
                            <div className="overflow-x-auto -mx-2 sm:mx-0">
                                <div className="inline-block min-w-full align-middle">
                                    <table className="min-w-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-[#444]">
                                        <thead className="bg-[#2c2c2c]">
                                            <tr>
                                                <th className="px-2 sm:px-4 py-2 text-[#e0e0e0]">Foto</th>
                                                <th className="px-2 sm:px-4 py-2 text-[#e0e0e0]">Nama Latin</th>
                                                <th className="px-2 sm:px-4 py-2 text-[#e0e0e0]">Nama Umum</th>
                                                <th className="hidden sm:table-cell px-4 py-2 text-[#e0e0e0]">Lokasi</th>
                                                <th className="hidden sm:table-cell px-4 py-2 text-[#e0e0e0]">Sumber</th>
                                                <th className="hidden sm:table-cell px-4 py-2 text-[#e0e0e0]">Tanggal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allObservations.map((obs, index) => (
                                                <tr key={`${obs.id}-${obs.source}-${index}`} className="border-b border-[#444] hover:bg-[#2a2a2a]">
                                                    <td className="px-2 sm:px-4 py-2">
                                                        <div className="w-12 sm:w-16 h-12 sm:h-16 relative bg-[#2c2c2c] rounded flex items-center justify-center overflow-hidden">
                                                            {obs.photo_url ? (
                                                                <img
                                                                    src={obs.photo_url}
                                                                    alt={obs.nama_latin}
                                                                    className="w-16 h-16 object-cover"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = getDefaultImage(obs.source);
                                                                    }}
                                                                    loading="lazy"
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={getDefaultImage(obs.source)}
                                                                    alt={`Logo ${obs.source}`}
                                                                    className="w-12 h-12 object-contain"
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 sm:px-4 py-2 italic text-sm sm:text-base text-[#e0e0e0]">{obs.nama_latin}</td>
                                                    <td className="px-2 sm:px-4 py-2 text-sm sm:text-base text-[#e0e0e0]">{obs.nama_umum}</td>
                                                    <td className="hidden sm:table-cell px-4 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8]" />
                                                            <span className="text-sm text-[#e0e0e0]">{locations[obs.id] || 'Memuat lokasi...'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="hidden sm:table-cell px-4 py-2 text-sm text-[#e0e0e0]">
                                                        {getSourceName(obs.source)}
                                                    </td>
                                                    <td className="hidden sm:table-cell px-4 py-2 text-sm text-[#e0e0e0]">
                                                        {formatDate(obs.observation_date)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Loading States */}
                            {loading && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="flex items-center space-x-2 text-[#e0e0e0]">
                                        <div className="w-4 h-4 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin"></div>
                                        <span>Memuat data...</span>
                                    </div>
                                </div>
                            )}

                            {/* Load More Button */}
                            {hasMore && !loading && (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                        className="px-4 py-2 bg-[#2c2c2c] hover:bg-[#3c3c3c] rounded-lg text-sm text-[#e0e0e0] transition-colors disabled:opacity-50 flex items-center space-x-2 border border-[#444]"
                                    >
                                        {loadingMore ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin"></div>
                                                <span>Memuat...</span>
                                            </>
                                        ) : (
                                            <span>Muat Lebih Banyak</span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="text-center py-4 text-red-400">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileObservations;

