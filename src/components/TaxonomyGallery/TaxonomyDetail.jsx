import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
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
    Breadcrumbs,
    Link as MuiLink,
    CircularProgress
} from '@mui/material';
import { extractAuthorFromScientificName } from '../../utils/speciesUtils';
import { MapContainer, TileLayer, Rectangle, useMap, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import TreeView from 'react-treeview';
import "react-treeview/react-treeview.css";
import { getColor, getVisibleGridType } from '../../utils/mapHelpers';
import { GRID_SIZES, getGridType } from '../../utils/gridHelpers';

// Fungsi untuk menentukan ukuran grid berdasarkan zoom
const getGridSizeFromType = (gridType) => {
    return GRID_SIZES[gridType] || GRID_SIZES.large;
};

// Handler untuk zoom level
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
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/taxonomy/${taxaId}/distribution`);
                if (response.data.success) {
                    setLocations(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching distribution data:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchLocations();
    }, [taxaId]);
    
    // Fungsi untuk membuat grid
    const createSingleGrid = useCallback((lat, lng, gridSize) => {
        if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return null;
        
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        // Menggunakan pendekatan grid yang sama seperti di MapView.jsx
        const latKey = Math.floor(latitude / gridSize) * gridSize;
        const lngKey = Math.floor(longitude / gridSize) * gridSize;
        
        return {
            bounds: [
                [latKey, lngKey],
                [latKey + gridSize, lngKey + gridSize]
            ],
            center: [latitude, longitude],
            count: 1  // Default count, bisa ditingkatkan jika ada beberapa observasi di grid yang sama
        };
    }, []);
    
    // Membuat grid berdasarkan lokasi dengan menggunakan gridSize dari GRID_SIZES
    useEffect(() => {
        if (locations.length > 0) {
            // Buat objek untuk mengelompokkan lokasi berdasarkan grid key
            const gridGroups = {};
            
            // Buat grid untuk berbagai ukuran
            const gridTypes = ['tiny', 'verySmall', 'small', 'mediumSmall', 'medium', 'mediumLarge', 'large', 'veryLarge', 'extremelyLarge'];
            
            gridTypes.forEach(gridType => {
                const gridSize = getGridSizeFromType(gridType);
                gridGroups[gridType] = {};
                
                locations.forEach(loc => {
                    const lat = parseFloat(loc.latitude);
                    const lng = parseFloat(loc.longitude);
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
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
            
            // Konversi gridGroups menjadi array
            const grids = {};
            gridTypes.forEach(gridType => {
                grids[gridType] = Object.values(gridGroups[gridType]);
            });
            
            setGridData(grids);
        }
    }, [locations]);
    
    // Fungsi untuk mendapatkan bounds dari semua lokasi
    const getBounds = () => {
        if (locations.length === 0) return L.latLngBounds([[-2.5489, 118.0149], [-2.5489, 118.0149]]);
        
        const points = locations.map(loc => [parseFloat(loc.latitude), parseFloat(loc.longitude)]);
        return L.latLngBounds(points).pad(0.2);
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
                
                {gridData[visibleGrid] && gridData[visibleGrid].map((grid, index) => {
                    // Gunakan getColor dari mapHelpers.js untuk warna yang konsisten
                    const gridStyle = getColor(grid.count);
                    
                    return (
                        <Rectangle
                            key={`grid-${index}`}
                            bounds={grid.bounds}
                            pathOptions={gridStyle}
                        >
                            <Popup>
                                <Box>
                                    <Typography variant="body1">
                                        {grid.count} pengamatan di area ini
                                    </Typography>
                                    <Typography variant="body2">
                                        Grid: {grid.bounds[0][0]}, {grid.bounds[0][1]}
                                    </Typography>
                                </Box>
                            </Popup>
                        </Rectangle>
                    );
                })}
            </MapContainer>
        </div>
    );
};

// Komponen Taxonomy Tree
const TaxonomyTree = ({ taxonData }) => {
    // Mendapatkan hierarki taksonomi yang ada dalam data
    const hierarchy = [
        { key: 'kingdom', label: 'Kingdom', value: taxonData.kingdom, commonName: taxonData.cname_kingdom },
        { key: 'phylum', label: 'Phylum', value: taxonData.phylum, commonName: taxonData.cname_phylum },
        { key: 'subphylum', label: 'Subphylum', value: taxonData.subphylum, commonName: null },
        { key: 'class', label: 'Class', value: taxonData.class, commonName: taxonData.cname_class },
        { key: 'subclass', label: 'Subclass', value: taxonData.subclass, commonName: null },
        { key: 'order', label: 'Order', value: taxonData.order, commonName: taxonData.cname_order },
        { key: 'suborder', label: 'Suborder', value: taxonData.suborder, commonName: null },
        { key: 'family', label: 'Family', value: taxonData.family, commonName: taxonData.cname_family },
        { key: 'subfamily', label: 'Subfamily', value: taxonData.subfamily, commonName: null },
        { key: 'genus', label: 'Genus', value: taxonData.genus, commonName: taxonData.cname_genus },
        { key: 'species', label: 'Species', value: taxonData.species, commonName: taxonData.cname_species },
        { key: 'subspecies', label: 'Subspecies', value: taxonData.subspecies, commonName: null }
    ].filter(item => item.value);

    // Render node taksonomi
    const renderTaxonomyNode = (label, value, rank, commonName, isItalic = false) => {
        const formattedLabel = `${label}: `;
        const shouldLink = rank !== taxonData.taxon_rank.toLowerCase();
        
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" component="span" sx={{ fontWeight: 'bold' }}>
                        {formattedLabel}
                    </Typography>
                    
                    {shouldLink ? (
                        <MuiLink 
                            component={RouterLink} 
                            to={`/taxonomy/${rank}/${value}`} 
                            sx={{ 
                                fontStyle: isItalic ? 'italic' : 'normal',
                                textDecoration: 'none',
                                '&:hover': {
                                    textDecoration: 'underline'
                                }
                            }}
                        >
                            {value}
                        </MuiLink>
                    ) : (
                        <Typography 
                            variant="body1" 
                            component="span" 
                            sx={{ fontStyle: isItalic ? 'italic' : 'normal' }}
                        >
                            {value}
                        </Typography>
                    )}
                </Box>
                
                {commonName && (
                    <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                        {commonName}
                    </Typography>
                )}
            </Box>
        );
    };

    // Building Tree UI
    const buildTaxonomyTree = () => {
        return (
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Taxonomic Classification
                </Typography>
                
                <Box sx={{ ml: 2 }}>
                    {hierarchy.map((item, index) => (
                        <Box key={index}>
                            {renderTaxonomyNode(
                                item.label, 
                                item.value, 
                                item.key, 
                                item.commonName, 
                                ['genus', 'species', 'subspecies'].includes(item.key)
                            )}
                        </Box>
                    ))}
                </Box>
            </Paper>
        );
    };

    // Render tree
    return buildTaxonomyTree();
};

// Main Component
const TaxonomyDetail = () => {
    const { taxaId } = useParams();
    const [taxonData, setTaxonData] = useState(null);
    const [childTaxa, setChildTaxa] = useState([]);
    const [media, setMedia] = useState([]);
    const [similarTaxa, setSimilarTaxa] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);

    // Mendapatkan hierarki breadcrumbs berdasarkan data taxon
    const getTaxonomyBreadcrumbs = () => {
        if (!taxonData) return null;
        
        const rankHierarchy = [
            { rank: 'kingdom', value: taxonData.kingdom, label: 'Kingdom' },
            { rank: 'phylum', value: taxonData.phylum, label: 'Phylum' },
            { rank: 'class', value: taxonData.class, label: 'Class' },
            { rank: 'order', value: taxonData.order, label: 'Order' },
            { rank: 'family', value: taxonData.family, label: 'Family' },
            { rank: 'genus', value: taxonData.genus, label: 'Genus' },
            { rank: 'species', value: taxonData.species, label: 'Species' }
        ].filter(item => item.value);
        
        const currentRank = taxonData.taxon_rank.toLowerCase();
        
        return (
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, mt: 1 }}>
                <MuiLink 
                    component={RouterLink} 
                    to="/taxonomy"
                    color="inherit"
                >
                    Taxonomy
                </MuiLink>
                
                {rankHierarchy.map((item, index) => {
                    // Jika ini adalah rank terakhir dan sama dengan current rank, jangan buat link
                    const isCurrentRank = item.rank === currentRank;
                    
                    if (isCurrentRank) {
                        return (
                            <Typography key={item.rank} color="text.primary">
                                {item.value}
                            </Typography>
                        );
                    }
                    
                    return (
                        <MuiLink
                            key={item.rank}
                            component={RouterLink}
                            to={`/taxonomy/${item.rank}/${item.value}`}
                            color="inherit"
                        >
                            {item.value}
                        </MuiLink>
                    );
                })}
            </Breadcrumbs>
        );
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    useEffect(() => {
        const fetchTaxonData = async () => {
            try {
                setLoading(true);
                // Fetch Taxon Data
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/taxonomy/detail/${taxaId}`);
                if (response.data.success) {
                    setTaxonData(response.data.data.taxon);
                    setChildTaxa(response.data.data.child_taxa);
                    setMedia(response.data.data.media);
                }

                // Fetch Similar Taxa
                const similarResponse = await axios.get(`${import.meta.env.VITE_API_URL}/taxonomy/${taxaId}/similar`);
                if (similarResponse.data.success) {
                    setSimilarTaxa(similarResponse.data.data);
                }
            } catch (error) {
                console.error('Error fetching taxon data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTaxonData();
    }, [taxaId]);

    if (loading || !taxonData) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    const { scientific_name } = taxonData;
    const { name: nameWithoutAuthor, author } = extractAuthorFromScientificName(scientific_name);
    const rank = taxonData.taxon_rank.toLowerCase();

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mt: 3, mb: 1 }}>
                {taxonData[rank] || nameWithoutAuthor}
                {rank === 'genus' || rank === 'species' ? (
                    <Typography component="span" variant="h6" sx={{ fontStyle: 'italic', ml: 1 }}>
                        {nameWithoutAuthor}
                    </Typography>
                ) : null}
            </Typography>
            
            {getTaxonomyBreadcrumbs()}

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
                        <Tab label="Taksonomi" />
                        <Tab label="Galeri" />
                        <Tab label="Distribusi" />
                        <Tab label={`${rank === 'species' ? 'Spesies' : 'Taksa'} Serupa`} />
                    </Tabs>

                    {/* Tab Panel Taxonomy */}
                    {tabValue === 0 && (
                        <Box>
                            <TaxonomyTree taxonData={taxonData} />

                            {taxonData.description && (
                                <Paper sx={{ p: 2, mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 1 }}>Deskripsi</Typography>
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                        {taxonData.description}
                                    </Typography>
                                </Paper>
                            )}

                            {childTaxa.length > 0 && (
                                <Paper sx={{ p: 2, mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>
                                        {rank === 'kingdom' ? 'Phyla' : 
                                         rank === 'phylum' ? 'Classes' :
                                         rank === 'class' ? 'Orders' :
                                         rank === 'order' ? 'Families' :
                                         rank === 'family' ? 'Genera' :
                                         rank === 'genus' ? 'Species' : 'Subspecies'} 
                                        {` (${childTaxa.length})`}
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {childTaxa.map((child) => (
                                            <Grid item xs={12} sm={6} md={4} key={child.taxa_id}>
                                                <MuiLink
                                                    component={RouterLink}
                                                    to={`/${child.taxon_rank}/${child.taxa_id}`}
                                                    underline="none"
                                                >
                                                    <Card sx={{ height: '100%' }}>
                                                        <CardContent>
                                                            <Typography variant="body1" sx={
                                                                ['genus', 'species'].includes(child.taxon_rank) ? 
                                                                { fontStyle: 'italic' } : {}
                                                            }>
                                                                {child.name}
                                                            </Typography>
                                                            {child.common_name && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {child.common_name}
                                                                </Typography>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </MuiLink>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Paper>
                            )}
                        </Box>
                    )}

                    {/* Tab Panel Gallery */}
                    {tabValue === 1 && (
                        <Box>
                            {media.length > 0 ? (
                                <ImageList variant="masonry" cols={3} gap={8}>
                                    {media.map((item) => (
                                        <ImageListItem key={item.id}>
                                            <img
                                                src={`https://api.amaturalist.com/storage/${item.file_path}`}
                                                alt={taxonData[rank]}
                                                loading="lazy"
                                                style={{ borderRadius: 4 }}
                                                onError={(e) => {
                                                    e.target.src = "https://via.placeholder.com/300x300?text=Image+Not+Found";
                                                }}
                                            />
                                        </ImageListItem>
                                    ))}
                                </ImageList>
                            ) : (
                                <Box sx={{ textAlign: 'center', p: 4 }}>
                                    <Typography>Tidak ada gambar tersedia</Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Tab Panel Distribution */}
                    {tabValue === 2 && (
                        <Box>
                            <Paper sx={{ p: 2, mb: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>Distribusi</Typography>
                                <DistributionMap taxaId={taxaId} />
                            </Paper>
                        </Box>
                    )}

                    {/* Tab Panel Similar Taxa */}
                    {tabValue === 3 && (
                        <Box>
                            {similarTaxa.length > 0 ? (
                                <Grid container spacing={2}>
                                    {similarTaxa.map((item) => (
                                        <Grid item xs={12} sm={6} md={4} key={item.taxa_id}>
                                            <Card>
                                                <CardContent>
                                                    <Typography variant="h6" sx={
                                                        ['genus', 'species'].includes(rank) ? 
                                                        { fontStyle: 'italic' } : {}
                                                    }>
                                                        {item.name}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {item.common_name}
                                                    </Typography>
                                                    {item.similarity_info && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">
                                                                Tipe kesamaan: {item.similarity_info.similarity_type}
                                                            </Typography>
                                                            <Typography variant="caption" display="block">
                                                                {item.similarity_info.notes}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        sx={{ mt: 1 }}
                                                        component={RouterLink}
                                                        to={`/${rank}/${item.taxa_id}`}
                                                    >
                                                        Lihat Detail
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Box sx={{ textAlign: 'center', p: 4 }}>
                                    <Typography>Tidak ada taksa serupa</Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </Grid>
                
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Status Konservasi</Typography>
                        <Typography>
                            Status IUCN: {taxonData.iucn_red_list_category}
                        </Typography>
                    </Paper>

                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Taksonomi</Typography>
                        <Typography variant="body1">
                            <strong>Rank:</strong> {taxonData.taxon_rank}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Scientific Name:</strong> {scientific_name}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default TaxonomyDetail; 