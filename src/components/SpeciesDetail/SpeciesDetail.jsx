import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
    Grid,
    Card,
    CardMedia,
    CardContent,
    Typography,
    Tabs,
    Tab,
    Box,
    Paper,
    ImageList,
    ImageListItem,
    Button,
    ThemeProvider,
    createTheme,
    CssBaseline
} from '@mui/material';
import { extractAuthorFromScientificName, getDisplayName } from '../../utils/speciesUtils';
import { MapContainer, TileLayer, Rectangle, useMap, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import TreeView from 'react-treeview';
import "react-treeview/react-treeview.css";
import { getColor, getVisibleGridType } from '../../utils/mapHelpers';
import { GRID_SIZES, getGridSizeFromType } from '../../utils/gridHelpers';
import { apiFetch } from '../../utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

// Komponen ZoomHandler yang terpisah
const ZoomHandler = ({ setVisibleGrid }) => {
    const map = useMap();
    
    useEffect(() => {
        const handleZoomChange = () => {
            const zoomLevel = map.getZoom();
            const gridType = getVisibleGridType(zoomLevel);
            setVisibleGrid(gridType);
        };

        map.on('zoomend', handleZoomChange);
        handleZoomChange(); // Initialize on mount

        return () => {
            map.off('zoomend', handleZoomChange);
        };
    }, [map, setVisibleGrid]);

    return null;
};

// Komponen DistributionMap
const DistributionMap = ({ taxaId }) => {
    const [locations, setLocations] = useState([]);
    const [visibleGrid, setVisibleGrid] = useState('large');
    const [gridData, setGridData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/species-gallery/${taxaId}/distribution`);
                if (response.data.success) {
                    console.log('Location data received:', response.data.data);
                    setLocations(response.data.data);
                } else {
                    console.error('API returned success false');
                }
            } catch (error) {
                console.error('Error fetching distribution data:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchLocations();
    }, [taxaId]);
    
    // Membuat grid berdasarkan lokasi dengan menggunakan gridSize dari GRID_SIZES
    useEffect(() => {
        if (locations.length > 0) {
            // Buat objek untuk mengelompokkan lokasi berdasarkan grid key
            const gridGroups = {};
            
            // Buat grid untuk berbagai ukuran
            const gridTypes = ['tiny', 'verySmall', 'small', 'mediumSmall', 'medium', 'mediumLarge', 'large', 'veryLarge', 'extremelyLarge'];
            
            // Log jumlah lokasi yang valid untuk debugging
            let validLocationsCount = 0;
            
            gridTypes.forEach(gridType => {
                const gridSize = getGridSizeFromType(gridType);
                gridGroups[gridType] = {};
                
                locations.forEach(loc => {
                    // Pastikan latitude dan longitude valid
                    const lat = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
                    const lng = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;
                    
                    if (!isNaN(lat) && !isNaN(lng) && 
                        lat >= -90 && lat <= 90 && 
                        lng >= -180 && lng <= 180) {
                        
                        validLocationsCount++;
                        
                        const latKey = Math.floor(lat / gridSize) * gridSize;
                        const lngKey = Math.floor(lng / gridSize) * gridSize;
                        const gridKey = `${latKey}_${lngKey}`;
                        
                        if (!gridGroups[gridType][gridKey]) {
                            gridGroups[gridType][gridKey] = {
                                bounds: [
                                    [latKey, lngKey],
                                    [latKey + gridSize, lngKey + gridSize]
                                ],
                                center: [lat, lng],
                                count: 0,
                                locations: []
                            };
                        }
                        
                        gridGroups[gridType][gridKey].count++;
                        gridGroups[gridType][gridKey].locations.push(loc);
                    }
                });
            });
            
            console.log(`Valid locations count: ${validLocationsCount} out of ${locations.length}`);
            
            // Konversi gridGroups menjadi array
            const grids = {};
            gridTypes.forEach(gridType => {
                grids[gridType] = Object.values(gridGroups[gridType]);
            });
            
            console.log('Grid data generated:', grids);
            
            setGridData(grids);
        }
    }, [locations]);
    
    // Fungsi untuk mendapatkan bounds dari semua lokasi
    const getBounds = () => {
        if (locations.length === 0) {
            // Default bounds untuk Indonesia
            return L.latLngBounds([[-8.5, 95.0], [6.0, 141.0]]);
        }
        
        try {
            // Filter lokasi dengan koordinat valid
            const validPoints = locations
                .map(loc => {
                    const lat = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
                    const lng = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;
                    
                    if (!isNaN(lat) && !isNaN(lng) && 
                        lat >= -90 && lat <= 90 && 
                        lng >= -180 && lng <= 180) {
                        return [lat, lng];
                    }
                    return null;
                })
                .filter(point => point !== null);
            
            if (validPoints.length === 0) {
                // Default bounds untuk Indonesia jika tidak ada titik valid
                return L.latLngBounds([[-8.5, 95.0], [6.0, 141.0]]);
            }
            
            return L.latLngBounds(validPoints).pad(0.2);
        } catch (error) {
            console.error('Error calculating bounds:', error);
            // Default bounds untuk Indonesia jika terjadi kesalahan
            return L.latLngBounds([[-8.5, 95.0], [6.0, 141.0]]);
        }
    };
    
    if (loading) {
        return (
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>Loading map data...</Typography>
            </Box>
        );
    }
    
    if (locations.length === 0) {
        return (
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>No location data available</Typography>
            </Box>
        );
    }
    
    // Debug info untuk memeriksa bounds yang dihasilkan
    const boundsInfo = getBounds();
    console.log('Map bounds:', boundsInfo);
    
    return (
        <div className="relative h-[500px] md:h-[400px] rounded-xl overflow-hidden">
            <MapContainer 
                bounds={getBounds()}
                className="h-full w-full"
                maxZoom={14}
                zoomControl={false}
            >
                <TileLayer
                    url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                />
                
                <ZoomHandler setVisibleGrid={setVisibleGrid} />
                <ZoomControl position="bottomright" />
                
                {gridData[visibleGrid] && gridData[visibleGrid].length > 0 ? (
                    gridData[visibleGrid].map((grid, index) => {
                        // Gunakan getColor dari mapHelpers.js untuk warna yang konsisten
                        const gridStyle = getColor(grid.count);
                        
                        if (!grid.bounds || !Array.isArray(grid.bounds) || grid.bounds.length !== 2) {
                            console.error('Invalid bounds for grid:', grid);
                            return null;
                        }
                        
                        return (
                            <Rectangle
                                key={`grid-${index}`}
                                bounds={grid.bounds}
                                pathOptions={gridStyle}
                            >
                                <Popup className="dark-popup">
                                    <div className="p-2 text-white">
                                        <h4 className="font-medium">Jumlah Observasi: {grid.count}</h4>
                                        {grid.locations && grid.locations.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-300">
                                                    Lat: {parseFloat(grid.center[0]).toFixed(6)}<br />
                                                    Long: {parseFloat(grid.center[1]).toFixed(6)}
                                                </p>
                                                {grid.locations[0].observation_date && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Tanggal Terbaru: {new Date(grid.locations[0].observation_date).toLocaleDateString('id-ID')}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Rectangle>
                        );
                    })
                ) : (
                    <div style={{ position: 'absolute', zIndex: 1000, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
                        <Typography style={{ color: 'white' }}>
                            Tidak ada data grid untuk ditampilkan.
                        </Typography>
                    </div>
                )}
            </MapContainer>
        </div>
    );
};

// Komponen TaxonomyTree untuk menampilkan pohon taksonomi
const TaxonomyTree = ({ speciesData }) => {
    if (!speciesData || !speciesData.species) return null;

    // Fungsi untuk membuat label node dengan styling yang lebih baik
    const renderTaxonomyNode = (label, value, isItalic = false) => (
        <div className="flex items-center py-1.5">
            <div className="flex-1">
                <span className="text-gray-300 text-sm">{label}</span>
                <div className={`font-medium text-white ${isItalic ? 'italic' : ''}`}>
                    {value}
                </div>
            </div>
        </div>
    );

    // Bangun urutan hierarki taksonomi
    const taxonomyLevels = [
        { key: 'kingdom', label: 'Kingdom', italic: false },
        { key: 'phylum', label: 'Phylum', italic: false },
        { key: 'class', label: 'Class', italic: false },
        { key: 'order', label: 'Order', italic: false },
        { key: 'family', label: 'Family', italic: false },
        { key: 'genus', label: 'Genus', italic: true },
        { key: 'species', label: 'Species', italic: true },
        { key: 'subspecies', label: 'Subspecies', italic: true },
        { key: 'variety', label: 'Variety', italic: true },
        { key: 'form', label: 'Form', italic: true }
    ];

    // Fungsi untuk membangun struktur tree
    const buildTaxonomyTree = () => {
        // Filter level yang ada datanya
        const availableLevels = taxonomyLevels.filter(level => 
            speciesData.species[level.key]
        );
        
        if (availableLevels.length === 0) return null;
        
        // Bangun tree dari bawah ke atas
        let currentNode = null;
        for (let i = availableLevels.length - 1; i >= 0; i--) {
            const level = availableLevels[i];
            const value = speciesData.species[level.key];
            
            const newNode = {
                nodeLabel: renderTaxonomyNode(level.label, value, level.italic),
                children: currentNode ? [currentNode] : []
            };
            currentNode = newNode;
        }

        return currentNode;
    };

    const taxonomyTree = buildTaxonomyTree();

    // Fungsi rekursif untuk merender tree
    const renderTree = (node) => {
        if (!node) return null;

        return (
            <TreeView
                nodeLabel={node.nodeLabel}
                defaultCollapsed={false}
                className="taxonomy-node"
            >
                {node.children.map((child, index) => (
                    <div 
                        key={index} 
                        className="ml-4 pl-4 border-l-2 border-[#333] hover:border-[#444] transition-colors"
                    >
                        {renderTree(child)}
                    </div>
                ))}
            </TreeView>
        );
    };

    return (
        <div className="bg-[#1e1e1e] rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-4 text-white">Taksonomi</h3>
            <div className="space-y-1 taxonomy-tree">
                {taxonomyTree && renderTree(taxonomyTree)}
            </div>
        </div>
    );
};

// Tambahkan CSS untuk styling TreeView
const styles = `
.taxonomy-tree .tree-view_item {
    position: relative;
}

.taxonomy-tree .tree-view_arrow {
    position: absolute;
    left: -20px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #B0B0B0;
    transition: all 0.2s ease;
}

.taxonomy-tree .tree-view_arrow::before {
    content: '';
    width: 6px;
    height: 6px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 0.2s ease;
}

.taxonomy-tree .tree-view_arrow-collapsed::before {
    transform: rotate(45deg);
}

.taxonomy-tree .tree-view_children {
    margin-left: 0;
}

.taxonomy-node {
    position: relative;
    padding: 0.25rem 0;
}

.taxonomy-node:hover > .tree-view_item {
    background-color: #2c2c2c;
    border-radius: 0.375rem;
}

.taxonomy-tree a {
    position: relative;
    color: #1a73e8;
    text-decoration: none;
}

.taxonomy-tree a:hover {
    color: #4285f4;
}

.taxonomy-tree a::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 1px;
    bottom: -1px;
    left: 0;
    background-color: currentColor;
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 0.3s ease;
}

.taxonomy-tree a:hover::after {
    transform: scaleX(1);
    transform-origin: left;
}

/* CSS untuk popup leaflet dengan tema gelap */
.leaflet-popup-content-wrapper {
    background-color: #1e1e1e !important;
    color: #e0e0e0 !important;
    border: 1px solid #444;
}

.leaflet-popup-tip {
    background-color: #1e1e1e !important;
    border: 1px solid #444;
}

.leaflet-popup-close-button {
    color: #e0e0e0 !important;
}

.leaflet-popup-close-button:hover {
    color: #fff !important;
}

.dark-popup .leaflet-popup-content p {
    margin-top: 4px !important;
    margin-bottom: 4px !important;
}

.leaflet-control-attribution {
    background: rgba(30, 30, 30, 0.8) !important;
    color: #e0e0e0 !important;
}

.leaflet-control-attribution a {
    color: #1a73e8 !important;
}

.leaflet-control-layers,
.leaflet-control-zoom {
    background: #1e1e1e !important;
    border-color: #444 !important;
}

.leaflet-control-layers-toggle,
.leaflet-control-zoom-in,
.leaflet-control-zoom-out {
    background-color: #1e1e1e !important;
    color: #e0e0e0 !important;
}

.leaflet-control-zoom-in,
.leaflet-control-zoom-out {
    color: #e0e0e0 !important;
}

.leaflet-control-zoom-in:hover,
.leaflet-control-zoom-out:hover {
    background-color: #2c2c2c !important;
}
`;

// Inject CSS
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const SpeciesDetail = () => {
    const { taxaId } = useParams();
    const [speciesData, setSpeciesData] = useState(null);
    const [similarSpecies, setSimilarSpecies] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [iucnStatus, setIucnStatus] = useState(null);
    const [loadingIucn, setLoadingIucn] = useState(false);

    // Membuat tema gelap
    const darkTheme = createTheme({
        palette: {
            mode: 'dark',
            primary: {
                main: '#1a73e8',
            },
            secondary: {
                main: '#4285f4',
            },
            background: {
                paper: '#1e1e1e',
                default: '#121212',
            },
            text: {
                primary: '#e0e0e0',
                secondary: '#b0b0b0',
            },
            divider: '#444',
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundColor: '#1e1e1e',
                        borderRadius: 8,
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundColor: '#2c2c2c',
                        border: '1px solid #444',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    contained: {
                        backgroundColor: '#1a73e8',
                        '&:hover': {
                            backgroundColor: '#0d47a1',
                        },
                    },
                },
            },
            MuiTabs: {
                styleOverrides: {
                    root: {
                        backgroundColor: '#1e1e1e',
                        borderBottom: '1px solid #444',
                    },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        color: '#b0b0b0',
                        '&.Mui-selected': {
                            color: '#1a73e8',
                        },
                    },
                },
            },
        },
    });

    // Fungsi untuk mengambil status IUCN langsung dari API IUCN Red List
    const fetchIUCNStatus = useCallback(async (scientificName) => {
        if (!scientificName) return null;
        
        try {
            setLoadingIucn(true);
            
            // Gunakan backend sebagai proxy untuk menghindari masalah CORS
            const response = await apiFetch(`/observations/iucn-status?scientific_name=${encodeURIComponent(scientificName)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Periksa apakah response valid
            if (!response || !response.ok) {
                throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
            }
            
            // Ambil teks respons terlebih dahulu
            const responseText = await response.text();
            
            // Periksa apakah respons kosong
            if (!responseText || responseText.trim() === '') {
                console.warn('Empty response from IUCN API');
                return null;
            }
            
            // Coba parse JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError, 'Response text:', responseText.substring(0, 100));
                throw new Error(`Invalid JSON response: ${parseError.message}`);
            }
            
            // Periksa struktur data
            if (!data || typeof data !== 'object') {
                console.warn('Invalid data structure from IUCN API', data);
                return null;
            }
            
            if (data.success && data.data && data.data.iucn_status) {
                setIucnStatus(data.data.iucn_status);
                return data.data.iucn_status;
            }
            
            setIucnStatus(null);
            return null;
        } catch (error) {
            console.error('Error fetching IUCN status:', error);
            // Tampilkan pesan error yang lebih informatif
            toast.error(`Gagal mengambil status IUCN: ${error.message}`, {
                duration: 3000,
                position: 'bottom-center'
            });
            setIucnStatus(null);
            return null;
        } finally {
            setLoadingIucn(false);
        }
    }, []);

    // Fungsi untuk mendapatkan warna dan label berdasarkan status IUCN
    const getIUCNStatusDisplay = (status) => {
        if (!status) return null;
        
        const statusLower = status.toLowerCase();
        let bgColor = 'bg-green-900';
        let textColor = 'text-green-200';
        let ringColor = 'ring-green-600/40';
        let color = '#10B981'; // Untuk MUI
        
        if (statusLower.includes('extinct')) {
            bgColor = 'bg-black';
            textColor = 'text-gray-200';
            ringColor = 'ring-gray-600/40';
            color = '#000000';
        } else if (statusLower.includes('critically') || statusLower.includes('endangered')) {
            bgColor = 'bg-red-900';
            textColor = 'text-red-200';
            ringColor = 'ring-red-600/40';
            color = '#DC2626';
        } else if (statusLower.includes('vulnerable')) {
            bgColor = 'bg-orange-900';
            textColor = 'text-orange-200';
            ringColor = 'ring-orange-600/40';
            color = '#EA580C';
        } else if (statusLower.includes('near') || statusLower.includes('threatened')) {
            bgColor = 'bg-yellow-900';
            textColor = 'text-yellow-200';
            ringColor = 'ring-yellow-600/40';
            color = '#CA8A04';
        }
        
        return {
            bgColor,
            textColor,
            ringColor,
            color,
            label: status
        };
    };

    useEffect(() => {
        fetchSpeciesData();
        fetchSimilarSpecies();
    }, [taxaId]);

    const fetchSpeciesData = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/species-gallery/detail/${taxaId}`);
            setSpeciesData(response.data.data);
            
            // Cek status IUCN jika ada scientific_name
            if (response.data.data.species && response.data.data.species.scientific_name) {
                // Jika sudah ada status IUCN dari backend
                if (response.data.data.species.iucn_red_list_category) {
                    setIucnStatus(response.data.data.species.iucn_red_list_category);
                } else {
                    // Jika tidak ada, ambil dari API
                    fetchIUCNStatus(response.data.data.species.scientific_name);
                }
            }
        } catch (error) {
            console.error('Error fetching species data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSimilarSpecies = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/species-gallery/${taxaId}/similar`);
            setSimilarSpecies(response.data.data);
        } catch (error) {
            console.error('Error fetching similar species:', error);
        }
    };

    if (loading || !speciesData) return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography variant="h6" color="text.secondary">Loading...</Typography>
            </Box>
        </ThemeProvider>
    );

    const { species, media, locations } = speciesData;
    const { name: scientificNameWithoutAuthor, author } = extractAuthorFromScientificName(species.scientific_name);
    const displayName = getDisplayName(species);

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
        <Box sx={{ p: 3, mt: 5 }}>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3}>
                    {/* Informasi Species */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            {displayName}
                        </Typography>
                        <Typography variant="h6" sx={{ fontStyle: 'italic' }} gutterBottom>
                            {scientificNameWithoutAuthor}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                            Family: {species.family}
                        </Typography>
                        
                        {/* IUCN Status */}
                        {(iucnStatus || species.iucn_red_list_category) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
                                <Typography variant="body1" sx={{ mr: 1 }}>
                                    Status IUCN:
                                </Typography>
                                {loadingIucn ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Memuat...
                                        </Typography>
                                    </Box>
                                ) : (
                                    (() => {
                                        const status = getIUCNStatusDisplay(iucnStatus || species.iucn_red_list_category);
                                        return (
                                            <Box 
                                                sx={{ 
                                                    px: 1, 
                                                    py: 0.5, 
                                                    borderRadius: 1, 
                                                    bgcolor: status.color,
                                                    color: '#fff',
                                                    display: 'inline-block'
                                                }}
                                            >
                                                {status.label}
                                            </Box>
                                        );
                                    })()
                                )}
                            </Box>
                        )}
                        
                        {/* Tombol Cek Status IUCN jika belum ada */}
                        {!iucnStatus && !species.iucn_red_list_category && species.scientific_name && (
                            <Button 
                                variant="outlined" 
                                size="small" 
                                onClick={() => fetchIUCNStatus(species.scientific_name)}
                                disabled={loadingIucn}
                                sx={{ mt: 1, mb: 1 }}
                                startIcon={loadingIucn ? 
                                    <FontAwesomeIcon icon={faSpinner} spin /> : 
                                    <FontAwesomeIcon icon={faInfoCircle} />}
                            >
                                {loadingIucn ? 'Memuat status IUCN...' : 'Cek Status IUCN'}
                            </Button>
                        )}
                        
                        {species.status_kepunahan && (
                            <Typography variant="body1" gutterBottom>
                                Status Kepunahan: {species.status_kepunahan}
                            </Typography>
                        )}
                        {species.description && (
                            <Typography variant="body1" gutterBottom>
                                Deskripsi: {species.description}
                            </Typography>
                        )}
                    </Grid>

                    {/* Galeri Media dan Spectrogram */}
                    <Grid item xs={12} md={6}>
                        <ImageList cols={2} gap={8}>
                            {media.map((item, index) => (
                                <ImageListItem key={item.id}>
                                    <img
                                        src={`https://api.talinara.com/storage/${item.file_path}`}
                                        alt={`Observasi ${index + 1}`}
                                        loading="lazy"
                                    />
                                    {item.spectrogram && (
                                        <img
                                            src={`https://api.talinara.com/storage/${item.spectrogram}`}
                                            alt={`Spectrogram ${index + 1}`}
                                            style={{
                                                marginTop: '8px',
                                                    borderTop: '1px solid #444',
                                                    backgroundColor: '#2c2c2c'
                                            }}
                                        />
                                    )}
                                    <Typography variant="caption" display="block">
                                        Tanggal: {new Date(item.date).toLocaleDateString('id-ID')}
                                    </Typography>
                                </ImageListItem>
                            ))}
                        </ImageList>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabs untuk Species Mirip dan Peta Sebaran */}
            <Paper elevation={3}>
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Species Mirip" />
                    <Tab label="Peta Sebaran" />
                        <Tab label="Taksonomi" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {tabValue === 0 && (
                        <Grid container spacing={2}>
                            {similarSpecies.map((species) => {
                                const { name: simScientificName, author: simAuthor } = extractAuthorFromScientificName(species.scientific_name);
                                const simDisplayName = getDisplayName(species);

                                return (
                                    <Grid item xs={12} sm={6} md={4} key={species.id}>
                                        <Card>
                                            <CardContent>
                                                <Typography variant="h6">
                                                    {simDisplayName}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontStyle: 'italic' }}
                                                >
                                                    {simScientificName}
                                                </Typography>
                                                {species.family && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Family: {species.family}
                                                    </Typography>
                                                )}
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    sx={{ mt: 2 }}
                                                    onClick={() => window.open(`/species/${species.taxa_id}`, '_blank')}
                                                >
                                                    Lihat Species Ini
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}

                    {tabValue === 1 && <DistributionMap taxaId={taxaId} />}
                        
                        {tabValue === 2 && <TaxonomyTree speciesData={speciesData} />}
                </Box>
            </Paper>
        </Box>
        </ThemeProvider>
    );
};

export default SpeciesDetail;
