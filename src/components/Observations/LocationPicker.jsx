import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import debounce from 'lodash/debounce';
import L from 'leaflet';

// Definisikan custom marker icon
const customIcon = new L.Icon({
    iconUrl: 'https://cdn.mapmarker.io/api/v1/pin?size=50&background=%231a73e8&icon=fa-location-dot&color=%23FFFFFF',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50],
    className: 'custom-marker-icon'
});

// Style untuk marker
const markerStyle = `
  .custom-marker-icon {
    background: none !important;
    border: none !important;
    box-shadow: none !important;
  }
`;

// Definisikan tile layers yang tersedia
const tileLayers = {
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        name: 'Normal'
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>',
        name: 'Dark'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        name: 'Satelit'
    }
};

function LocationPicker({ onSave, onClose, initialPosition, initialLocationName }) {
    const [position, setPosition] = useState(initialPosition || null);
    const [locationName, setLocationName] = useState(initialLocationName || '');
    const [searchQuery, setSearchQuery] = useState(initialLocationName || '');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const searchContainerRef = useRef(null);
    const [isGPSLoading, setIsGPSLoading] = useState(false);
    const [gpsError, setGpsError] = useState(null);
    const [activeLayer, setActiveLayer] = useState('dark');

    const debouncedSearch = useRef(
        debounce(async (query) => {
            if (!query || query.length < 3) {
                setSearchResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                    `q=${encodeURIComponent(query)}&` +
                    `format=json&` +
                    `limit=10&` +
                    `countrycodes=id&` +
                    `addressdetails=1&` +
                    `namedetails=1&` +
                    `dedupe=1&` +
                    `extratags=1`
                );
                const data = await response.json();
                
                const filteredResults = data
                    .map(item => {
                        const address = item.address;
                        const extraTags = item.extratags || {};
                        const parts = [];
                        let mainName = '';
                        let type = 'Lokasi';

                        // Menentukan nama utama dan tipe lokasi
                        if (item.type === 'university' || extraTags.university) {
                            mainName = item.namedetails?.name || item.display_name.split(',')[0];
                            type = 'Universitas';
                        } else if (item.type === 'tourism' || extraTags.tourism) {
                            mainName = item.namedetails?.name || item.display_name.split(',')[0];
                            type = 'Tempat Wisata';
                        } else if (item.type === 'peak' || item.type === 'volcano') {
                            mainName = item.namedetails?.name || item.display_name.split(',')[0];
                            type = item.type === 'volcano' ? 'Gunung' : 'Puncak';
                        } else if (item.type === 'school' || extraTags.school) {
                            mainName = item.namedetails?.name || item.display_name.split(',')[0];
                            type = 'Sekolah';
                        } else if (item.type === 'hospital' || extraTags.healthcare) {
                            mainName = item.namedetails?.name || item.display_name.split(',')[0];
                            type = 'Rumah Sakit';
                        } else if (address.city || address.town || address.municipality) {
                            mainName = address.city || address.town || address.municipality;
                            type = 'Kota';
                        } else if (address.village || address.suburb) {
                            mainName = address.village || address.suburb;
                            type = 'Desa/Kelurahan';
                        } else if (address.county || address.regency) {
                            mainName = address.county || address.regency;
                            type = 'Kabupaten';
                        } else if (address.state) {
                            mainName = address.state;
                            type = 'Provinsi';
                        }

                        // Menyusun alamat lengkap
                        parts.push(mainName);
                        
                        if (address.suburb && !parts.includes(address.suburb)) {
                            parts.push(address.suburb);
                        }
                        if (address.city && !parts.includes(address.city)) {
                            parts.push(address.city);
                        } else if (address.town && !parts.includes(address.town)) {
                            parts.push(address.town);
                        } else if (address.municipality && !parts.includes(address.municipality)) {
                            parts.push(address.municipality);
                        }
                        if (address.state && !parts.includes(address.state)) {
                            parts.push(address.state);
                        }

                        return {
                            display_name: parts.join(', '),
                            lat: item.lat,
                            lon: item.lon,
                            type: type,
                            importance: item.importance || 0
                        };
                    })
                    .filter(item => item.display_name)
                    .sort((a, b) => b.importance - a.importance);

                setSearchResults(filteredResults);
            } catch (error) {
                console.error('Error searching location:', error);
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 500)
    ).current;

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedSearch(value);
    };

    const handleSelectLocation = (result) => {
        const newPosition = [parseFloat(result.lat), parseFloat(result.lon)];
        setPosition(newPosition);
        setLocationName(result.display_name);
        setSearchResults([]);
        setSearchQuery(result.display_name);
    };

    const fetchLocationName = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?` +
                `format=json&` +
                `lat=${lat}&` +
                `lon=${lng}&` +
                `addressdetails=1`
    );
            const data = await response.json();
            
            const address = data.address;
            const parts = [];
            
            if (address.city || address.town || address.municipality) {
                parts.push(address.city || address.town || address.municipality);
}
            if (address.county || address.regency) {
                parts.push(address.county || address.regency);
            }
            if (address.state) parts.push(address.state);
            if (address.country) parts.push(address.country);

            const displayName = parts.join(', ');
            setLocationName(displayName || 'Lokasi tidak ditemukan');
            setSearchQuery(displayName || '');
        } catch (error) {
            console.error('Error fetching location name:', error);
            setLocationName('Error mendapatkan nama lokasi');
        }
    };

    const LocationMarker = () => {
    const map = useMap();
        useMapEvents({
            click(e) {
                const currentZoom = map.getZoom();
    
                setPosition([e.latlng.lat, e.latlng.lng]);
                fetchLocationName(e.latlng.lat, e.latlng.lng);
                
                map.setView(e.latlng, currentZoom, {
                    animate: true
                });
            },
        });

        return position === null ? null : (
            <Marker position={position} icon={customIcon}></Marker>
        );
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setSearchResults([]);
}
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getCurrentLocation = () => {
        setIsGPSLoading(true);
        setGpsError(null);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setPosition([lat, lng]);
                    
                    try {
                        await fetchLocationName(lat, lng);
                    } catch (error) {
                        console.error('Error fetching location name:', error);
                    }

                    setIsGPSLoading(false);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setGpsError('Tidak dapat mengakses lokasi. Pastikan GPS aktif.');
                    setIsGPSLoading(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            setGpsError('GPS tidak didukung di browser ini');
            setIsGPSLoading(false);
        }
    };

    useEffect(() => {
        if (initialPosition && initialLocationName) {
            setPosition(initialPosition);
            setLocationName(initialLocationName);
            setSearchQuery(initialLocationName);
        }
    }, [initialPosition, initialLocationName]);

    const MapLayerUpdater = () => {
        const map = useMap();
        
        // Tambahkan effect untuk update map jika layer berubah
        useEffect(() => {
            // Tidak ada yang perlu dilakukan, TileLayer akan update berdasarkan prop
        }, [activeLayer]);
        
        return null;
    };

    return (
        <div className='mt-20'>
            <style>{markerStyle}</style>
            
            <div className="mb-4 relative" ref={searchContainerRef}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                        <div className="flex items-center border border-[#444] rounded-lg overflow-hidden shadow-sm bg-[#2c2c2c]">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Cari lokasi..."
                                className="w-full p-3 outline-none bg-transparent text-[#e0e0e0]"
                            />
                            {isLoading && (
                                <div className="px-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1a73e8]"></div>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={getCurrentLocation}
                        disabled={isGPSLoading}
                        className={`p-3 rounded-lg transition-colors ${
                            isGPSLoading 
                                ? 'bg-[#3c3c3c] cursor-not-allowed' 
                                : 'bg-[#1a73e8] hover:bg-[#1565c0] text-white'
                        }`}
                    >
                        {isGPSLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            'Gunakan GPS'
                        )}
                    </button>
                </div>
                {gpsError && (
                    <div className="text-red-500 text-sm mb-2">{gpsError}</div>
                )}

                {searchResults.length > 0 && (
                    <div className="absolute w-full bg-[#2c2c2c] border border-[#444] rounded-lg mt-1 shadow-lg max-h-60 overflow-y-auto z-[9999]">
                        {searchResults.map((result, index) => (
                            <div
                                key={index}
                                className="p-3 hover:bg-[#3c3c3c] cursor-pointer border-b border-[#444] last:border-b-0"
                                onClick={() => handleSelectLocation(result)}
                            >
                                <div className="font-medium text-[#e0e0e0]">{result.display_name}</div>
                                <div className="text-sm text-gray-400">
                                    {result.type} • {result.lat}, {result.lon}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Layer Selector */}
            <div className="mb-2 flex items-center justify-center bg-[#1e1e1e] p-2 rounded-lg border border-[#444]">
                <div className="flex space-x-1 bg-[#2c2c2c] p-1 rounded-md">
                    {Object.entries(tileLayers).map(([key, layer]) => (
                        <button
                            key={key}
                            onClick={() => setActiveLayer(key)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                                activeLayer === key 
                                    ? 'bg-[#1a73e8] text-white' 
                                    : 'bg-transparent text-gray-300 hover:bg-[#3c3c3c]'
                            }`}
                        >
                            {layer.name}
                        </button>
                    ))}
                </div>
            </div>

            <MapContainer 
                center={position || [-2.5489, 118.0149]} 
                zoom={position ? 13 : 5} 
                className="rounded-lg shadow-md"
                style={{ height: '400px', width: '100%' }}>
                <TileLayer
                    url={tileLayers[activeLayer].url}
                    attribution={tileLayers[activeLayer].attribution}
                />
                <LocationMarker />
                <RecenterAutomatically position={position} />
                <MapLayerUpdater />
            </MapContainer>

            <div className="mt-4 space-y-3">
                {locationName && (
                    <div className="p-3 bg-[#2c2c2c] rounded-lg border border-[#444]">
                        <div className="text-sm text-gray-400">Lokasi terpilih:</div>
                        <div className="text-[#e0e0e0]">{locationName}</div>
                    </div>
                )}
                
                <div className="flex space-x-3">
                    <button 
                        onClick={() => position && onSave(position[0], position[1], locationName)} 
                        className={`flex-1 p-3 rounded-lg transition-colors ${
                            position 
                                ? 'bg-[#1a73e8] hover:bg-[#1565c0] text-white' 
                                : 'bg-[#3c3c3c] text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!position}
                    >
                        {position ? 'Simpan Lokasi' : 'Pilih lokasi pada peta'}
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            if (typeof onClose === 'function') {
                                onClose();
                            }
                        }}
                        className="flex-1 p-3 rounded-lg border border-[#444] hover:bg-[#2c2c2c] text-[#e0e0e0] transition-colors"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
}

function RecenterAutomatically({ position }) {
    const map = useMap();
    
    useEffect(() => {
        if (position) {
            const currentZoom = map.getZoom();
            // map.setView(position, currentZoom);
        }
    }, [position, map]);
    
    return null;
}

export default LocationPicker;