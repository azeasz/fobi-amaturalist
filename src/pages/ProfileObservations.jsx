import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap, Circle } from 'react-leaflet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faSpinner, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import 'leaflet/dist/leaflet.css';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

// Import logo dari assets
import fobiLogo from '../assets/icon/FOBI.png';
import birdLogo from '../assets/icon/icon.png';
import butterflyLogo from '../assets/icon/kupnes.png';

// Ubah object sourceLogo
const sourceLogo = {
    fobi: fobiLogo,
    taxa: fobiLogo,
    bird: birdLogo,
    burungnesia: birdLogo,
    butterfly: butterflyLogo,
    kupunesia: butterflyLogo
};

// Cache untuk lokasi
const locationCache = new Map();

// Fungsi untuk mendapatkan data user dari localStorage
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

// Fungsi untuk mendapatkan warna grid
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
        case 'burungnesia':
            return 'Burungnesia';
        case 'butterfly':
        case 'kupunesia':
            return 'Kupunesia';
        case 'fobi':
        case 'taxa':
            return 'Amaturalist';
        default:
            return source;
    }
};

const getMarkerColor = (source) => {
    switch(source) {
        case 'fobi':
        case 'taxa':
            return '#1a73e8'; // blue - sama dengan UserObservations
        case 'bird':
        case 'burungnesia':
            return '#e91e63'; // pink - sama dengan UserObservations
        case 'butterfly':
        case 'kupunesia':
            return '#9c27b0'; // purple - sama dengan UserObservations
        default:
            return '#6b7280'; // gray
    }
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    } catch (error) {
        console.error('Error formatting date:', error);
        return '-';
    }
};

const ProfileObservations = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [hoveredMarker, setHoveredMarker] = useState(null);
    const [showSidebar, setShowSidebar] = useState(false);

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
            
            let locationName = '';
            const address = data.address;

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
                locationName = data.display_name || 'Lokasi tidak diketahui';
            }

            // Simpan ke cache
            locationCache.set(cacheKey, locationName);
            return locationName;
        } catch (error) {
            console.error('Error fetching location:', error);
            return 'Lokasi tidak diketahui';
        }
    }, []);

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

    // Handle klik pada grid
    const handleGridClick = useCallback((grid) => {
        setSelectedGrid(grid);
        setShowMarkers(true);
    }, []);

    // ZoomHandler sebagai komponen terpisah
    const ZoomHandler = () => {
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
    };

    // Fetch map data
    const fetchMapData = useCallback(async () => {
        try {
            setLoading(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/profile/observations/${id}`, window.location.origin);
            url.searchParams.append('map', 'true');
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                const observations = Array.isArray(data.data) ? data.data : [];
                setMapObservations(observations);
                const grids = generateGridLevels(observations);
                setGridLevels(grids);
                
                // Jika ada observasi, set center ke observasi pertama
                if (observations.length > 0) {
                    setMapCenter([observations[0].latitude, observations[0].longitude]);
                }
            }
        } catch (error) {
            console.error('Error fetching map data:', error);
            setError('Gagal memuat data peta. Silakan coba lagi nanti.');
        } finally {
            setLoading(false);
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

    // Komponen Marker sebagai komponen terpisah
    const ObservationMarker = React.memo(({ observation }) => {
        const isSelected = selectedMarker?.id === observation.id;
        const isHovered = hoveredMarker?.id === observation.id;
        
        const handleClick = () => {
            setSelectedMarker(observation);
        };

        const handleMouseOver = () => {
            setHoveredMarker(observation);
        };

        const handleMouseOut = () => {
            setHoveredMarker(null);
        };

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
                {(isSelected || isHovered) && (
                    <Popup>
                        <div className="bg-[#2c2c2c] p-2 rounded shadow-md max-w-[200px]">
                            {observation.photo_url && (
                                <img
                                    src={observation.photo_url}
                                    alt={observation.scientific_name || observation.nama_latin}
                                    className="w-full h-24 object-cover rounded mb-2"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        if (observation.source === 'kupunesia' || observation.source === 'butterfly') {
                                            e.target.src = butterflyLogo;
                                        } else if (observation.source === 'burungnesia' || observation.source === 'bird') {
                                            e.target.src = birdLogo;
                                        } else {
                                            e.target.src = fobiLogo;
                                        }
                                    }}
                                />
                            )}
                            <h3 className="font-bold text-[#e0e0e0] italic">{observation.scientific_name || observation.nama_latin}</h3>
                            <p className="text-sm text-[#aaa] flex items-center gap-1 mt-1">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8]" />
                                <span>{observation.location_name || "Memuat lokasi..."}</span>
                            </p>
                            <p className="text-sm text-[#aaa] flex items-center gap-1 mt-1">
                                <span className="whitespace-nowrap">{formatDate(observation.observation_date || observation.date || observation.created_at)}</span>
                            </p>
                            <div className="mt-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                    observation.source === 'burungnesia' || observation.source === 'bird' ? 'bg-pink-800 text-white' : 
                                    observation.source === 'kupunesia' || observation.source === 'butterfly' ? 'bg-purple-800 text-white' : 
                                    'bg-blue-800 text-white'
                                }`}>
                                    {getSourceName(observation.source)}
                                </span>
                            </div>
                        </div>
                    </Popup>
                )}
            </Circle>
        );
    });

    return (
        <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
            <Header userData={getUserData()} />

            <div className="container mx-auto px-2 sm:px-4 py-8 mt-10">
                {/* Toggle Sidebar Button - Visible on mobile */}
                <button 
                    onClick={toggleSidebar}
                    className="lg:hidden mb-4 p-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0] flex items-center justify-center gap-2"
                >
                    <FontAwesomeIcon icon={showSidebar ? faTimes : faBars} />
                    <span>Menu</span>
                </button>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar dengan properti baru */}
                    <div className="lg:block lg:w-1/5 xl:w-1/6">
                        <Sidebar 
                            userId={id} 
                            activeItem="Observasi"
                            isMobileOpen={showSidebar}
                            onMobileClose={() => setShowSidebar(false)}
                        />
                    </div>
                    
                    {/* Main Content dengan responsive layout */}
                    <div className="flex-1 min-w-0">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-[#e0e0e0] mb-2">Peta Lokasi Observasi</h1>
                            <p className="text-[#aaa]">Visualisasi semua lokasi observasi dan checklist Anda</p>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                                <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-lg flex flex-col items-center gap-4 border border-[#444]">
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[#1a73e8]" />
                                    <p className="text-lg text-[#e0e0e0]">Memuat data peta...</p>
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
                        <div className="h-[500px] sm:h-[600px] mb-6 rounded-lg overflow-hidden shadow-lg border border-[#444]">
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
                                                                    <p className="italic text-[#e0e0e0]">{obs.scientific_name || obs.nama_latin}</p>
                                                                    <div className="flex justify-between items-center mt-1">
                                                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                                                                            obs.source === 'burungnesia' || obs.source === 'bird' ? 'bg-pink-800 text-white' : 
                                                                            obs.source === 'kupunesia' || obs.source === 'butterfly' ? 'bg-purple-800 text-white' : 
                                                                            'bg-blue-800 text-white'
                                                                        }`}>
                                                                            {getSourceName(obs.source)}
                                                                        </span>
                                                                        <span className="text-xs text-gray-400">{formatDate(obs.observation_date || obs.date || obs.created_at)}</span>
                                                                    </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                        </div>
                                                    </Popup>
                                                )}
                                            </Rectangle>
                                        ))}

                                    {/* Individual Markers */}
                                {showMarkers && mapObservations.map((obs, index) => (
                                        <ObservationMarker 
                                            key={`marker-${obs.id}-${index}`}
                                            observation={obs}
                                        />
                                    ))}
                                </MapContainer>
                            </div>

                        {/* Legend */}
                        <div className="bg-[#1e1e1e] p-4 rounded-lg border border-[#444] mb-6">
                            <h3 className="text-lg font-semibold mb-3">Legenda</h3>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-blue-800"></div>
                                    <span>Amaturalist</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-pink-800"></div>
                                    <span>Burungnesia</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-purple-800"></div>
                                    <span>Kupunesia</span>
                                </div>
                            </div>
                            <div className="mt-3 text-sm text-[#aaa]">
                                <p>Zoom in untuk melihat marker individual atau klik pada grid untuk melihat observasi di area tersebut.</p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="bg-[#1e1e1e] p-4 rounded-lg border border-[#444]">
                            <h3 className="text-lg font-semibold mb-3">Statistik</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-[#2c2c2c] p-3 rounded-lg">
                                    <div className="text-sm text-[#aaa]">Total Observasi</div>
                                    <div className="text-2xl font-bold">{getUserData().totalObservations || 0}</div>
                                </div>
                                <div className="bg-[#2c2c2c] p-3 rounded-lg">
                                    <div className="text-sm text-[#aaa]">Total Lokasi</div>
                                    <div className="text-2xl font-bold">
                                        {Object.keys(gridLevels.small).length || 0}
                                    </div>
                                </div>
                                <div className="bg-[#2c2c2c] p-3 rounded-lg">
                                    <div className="text-sm text-[#aaa]">Sumber Data</div>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-800 text-white">
                                            Amaturalist
                                        </span>
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-pink-800 text-white">
                                            Burungnesia
                                        </span>
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-800 text-white">
                                            Kupunesia
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileObservations;

