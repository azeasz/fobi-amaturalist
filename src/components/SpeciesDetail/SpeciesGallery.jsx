import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    Tabs,
    Tab,
    Grid,
    Card,
    CardMedia,
    CardContent,
    Typography,
    TextField,
    Button,
    Box,
    CircularProgress
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';


const extractAuthorFromScientificName = (scientificName) => {
    // Mencari pattern nama author yang biasanya dalam kurung atau setelah spasi
    const matches = scientificName.match(/^([^\(]+)\s*(\([^)]+\)|\s+[^(]\S+.*)$/);
    if (matches) {
        return {
            name: matches[1].trim(),
            author: matches[2].trim()
        };
    }
    return {
        name: scientificName,
        author: ''
    };
};

const getDisplayName = (item) => {
    if (item.cname_species && item.cname_species.trim() !== '') {
        return item.cname_species;
    }
    if (item.species && item.species.trim() !== '') {
        return item.species;
    }
    const { name } = extractAuthorFromScientificName(item.scientific_name);
    return name;
};

const SpeciesGallery = () => {
    const [species, setSpecies] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedSpecies, setSelectedSpecies] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState(null);
    const observer = useRef();

    const lastSpeciesElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const fetchSpecies = async (pageNumber, searchQuery = '') => {
        try {
            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/species-gallery?page=${pageNumber}&search=${searchQuery}`);
            const newData = response.data.data;

            setSpecies(prev => pageNumber === 1 ? newData.data : [...prev, ...newData.data]);
            setHasMore(newData.current_page < newData.last_page);
        } catch (error) {
            console.error('Error fetching species:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchTimeout) clearTimeout(searchTimeout);

        const timeoutId = setTimeout(() => {
            setPage(1);
            setSpecies([]);
            fetchSpecies(1, search);
        }, 500);

        setSearchTimeout(timeoutId);

        return () => {
            if (searchTimeout) clearTimeout(searchTimeout);
        };
    }, [search]);

    useEffect(() => {
        if (page > 1) {
            fetchSpecies(page, search);
        }
    }, [page]);

    const handleSpeciesClick = async (species) => {
        setSelectedSpecies(species);
        // Fetch similar species and distribution data
    };

    return (
        <div className="species-gallery">
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Cari species..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 2, mt: 8, position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper' }}
            />

            <Grid container spacing={2}>
                {species.map((item, index) => {
                    const { name: scientificNameWithoutAuthor, author } = extractAuthorFromScientificName(item.scientific_name);
                    const displayName = getDisplayName(item);
                    const mediaPaths = item.media_paths ? item.media_paths.split(',') : [];

                    return (
                        <Grid
                            item
                            xs={12}
                            sm={6}
                            md={4}
                            lg={3}
                            key={`gallery-${item.taxa_id}-${index}`}
                            ref={index === species.length - 1 ? lastSpeciesElementRef : null}
                        >
                            <Card>
                                {mediaPaths[0] && (
                                    <CardMedia
                                        component="img"
                                        height="200"
                                        image={`https://api.amaturalist.com/storage/${mediaPaths[0]}`}
                                        alt={displayName}
                                    />
                                )}
                                {item.spectrogram && (
                                    <CardMedia
                                        component="img"
                                        height="100"
                                        image={`https://api.amaturalist.com/storage/${item.spectrogram}`}
                                        alt={`Spectrogram ${displayName}`}
                                        sx={{
                                            mt: 1,
                                            borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                                            backgroundColor: '#f5f5f5'
                                        }}
                                    />
                                )}
                                <CardContent>
                                    <Typography variant="h6" component="div">
                                        {displayName}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontStyle: 'italic',
                                            color: 'text.secondary'
                                        }}
                                    >
                                        {scientificNameWithoutAuthor}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'none',
                                            '&:hover': {
                                                display: 'block'
                                            }
                                        }}
                                    >
                                        {author}
                                    </Typography>
                                    <Typography variant="body2">
                                        Family: {item.family}
                                    </Typography>
                                    {item.habitat && (
                                        <Typography variant="body2" color="text.secondary">
                                            Habitat: {item.habitat}
                                        </Typography>
                                    )}
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        Tanggal: {new Date(item.date).toLocaleDateString('id-ID')}
                                    </Typography>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => window.open(`/species/${item.taxa_id}`, '_blank')}
                                        >
                                            Lihat Species Ini
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => handleSpeciesClick(item)}
                                        >
                                            Show Tab
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 3 }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && !hasMore && species.length > 0 && (
                <Typography variant="body1" sx={{ textAlign: 'center', mt: 3, mb: 3 }}>
                    Tidak ada data lagi
                </Typography>
            )}

            {!loading && species.length === 0 && (
                <Typography variant="body1" sx={{ textAlign: 'center', mt: 3 }}>
                    Tidak ada data yang ditemukan
                </Typography>
            )}

            {selectedSpecies && (
                <div className="species-detail">
                    <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                        <Tab label="Species Mirip" />
                        <Tab label="Peta Sebaran" />
                    </Tabs>

                    {tabValue === 0 && <SimilarSpecies taxaId={selectedSpecies.taxa_id} />}
                    {tabValue === 1 && <DistributionMap taxaId={selectedSpecies.taxa_id} />}
                </div>
            )}
        </div>
    );
};

const SimilarSpecies = ({ taxaId }) => {
    const [similarSpecies, setSimilarSpecies] = useState([]);

    useEffect(() => {
        fetchSimilarSpecies();
    }, [taxaId]);

    const fetchSimilarSpecies = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/species-gallery/${taxaId}/similar`);
            console.log('Similar species response:', response.data);
            setSimilarSpecies(response.data.data);
        } catch (error) {
            console.error('Error fetching similar species:', error);
        }
    };

    return (
        <Grid container spacing={2}>
            {similarSpecies.map((species, index) => {
                console.log('Species data:', species);
                const { name: scientificNameWithoutAuthor, author } = extractAuthorFromScientificName(species.scientific_name);
                const displayName = getDisplayName(species);

                return (
                    <Grid item xs={12} sm={6} md={4} key={`similar-${species.id}-${index}`}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" component="div">
                                    {displayName}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontStyle: 'italic',
                                        color: 'text.secondary'
                                    }}
                                >
                                    {scientificNameWithoutAuthor}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: 'none',
                                        '&:hover': {
                                            display: 'block'
                                        }
                                    }}
                                >
                                    {author}
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
                                    onClick={() => {
                                        console.log('Clicked species:', species);
                                        if (species.id) {
                                            window.open(`/species/${species.id}`, '_blank');
                                        } else {
                                            console.error('Species ID is undefined:', species);
                                        }
                                    }}
                                >
                                    Lihat Species Ini
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    );
};

const DistributionMap = ({ taxaId }) => {
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        fetchDistribution();
    }, [taxaId]);

    const fetchDistribution = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/species-gallery/${taxaId}/distribution`);
            setLocations(response.data.data);
        } catch (error) {
            console.error('Error fetching distribution:', error);
        }
    };

    return (
        <MapContainer center={[-2.5489, 118.0149]} zoom={5} style={{ height: '400px', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {locations.map((location, index) => (
                <Marker
                    key={index}
                    position={[location.latitude, location.longitude]}
                >
                    <Popup>
                        Lokasi pengamatan
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default SpeciesGallery;
