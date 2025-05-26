import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    Grid,
    Card,
    CardMedia,
    CardContent,
    Typography,
    TextField,
    Button,
    Box,
    Collapse,
    List,
    ListItem,
    ListItemText,
    IconButton,
    CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const extractAuthorFromScientificName = (scientificName) => {
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
    if (item.genus && item.genus.trim() !== '') {
        return item.genus;
    }
    const { name } = extractAuthorFromScientificName(item.scientific_name);
    return name;
};

const GenusCard = ({ item, navigate }) => {
    const [expanded, setExpanded] = useState(false);
    const { name: scientificNameWithoutAuthor, author } = extractAuthorFromScientificName(item.scientific_name);
    const displayName = getDisplayName(item);
    const mediaPaths = item.media_paths ? item.media_paths.split(',') : [];

    return (
        <Card>
            {mediaPaths[0] && (
                <CardMedia
                    component="img"
                    height="200"
                    image={`https://api.amaturalist.com/storage/${mediaPaths[0]}`}
                    alt={displayName}
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
                <Typography variant="body2" color="text.secondary">
                    {item.species_list?.length || 0} species
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {item.species_observations || 0} pengamatan species
                </Typography>

                {item.species_list && item.species_list.length > 0 && (
                    <>
                        <IconButton
                            onClick={() => setExpanded(!expanded)}
                            sx={{ mt: 1 }}
                            size="small"
                        >
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            <Typography variant="button" sx={{ ml: 1 }}>
                                {expanded ? 'Sembunyikan Species' : 'Lihat Species'}
                            </Typography>
                        </IconButton>

                        <Collapse in={expanded}>
                            <List dense>
                                {item.species_list.map((species) => (
                                    <ListItem
                                        key={species.id}
                                        sx={{
                                            pl: 2,
                                            '&:hover': {
                                                backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                            }
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="body2">
                                                        {species.species}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {species.observation_count} pengamatan
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                                        {species.scientific_name}
                                                    </Typography>
                                                    {species.description && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {species.description.substring(0, 100)}
                                                            {species.description.length > 100 ? '...' : ''}
                                                        </Typography>
                                                    )}
                                                </>
                                            }
                                            onClick={() => window.open(`/species/${species.id}`, '_blank')}
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Collapse>
                    </>
                )}

                <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => navigate(`/genus/${item.taxa_id}`)}
                >
                    Lihat Detail Genus
                </Button>
            </CardContent>
        </Card>
    );
};

const GenusGallery = () => {
    const [genera, setGenera] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState(null);
    const navigate = useNavigate();
    const observer = useRef();

    const lastGenusElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const fetchGenera = async (pageNumber, searchQuery = '') => {
        try {
            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/genus-gallery?page=${pageNumber}&search=${searchQuery}`);
            const newData = response.data.data;

            setGenera(prev => pageNumber === 1 ? newData.data : [...prev, ...newData.data]);
            setHasMore(newData.current_page < newData.last_page);
        } catch (error) {
            console.error('Error fetching genera:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Reset saat search berubah
        if (searchTimeout) clearTimeout(searchTimeout);

        const timeoutId = setTimeout(() => {
            setPage(1);
            setGenera([]);
            fetchGenera(1, search);
        }, 500); // Debounce 500ms

        setSearchTimeout(timeoutId);

        return () => {
            if (searchTimeout) clearTimeout(searchTimeout);
        };
    }, [search]);

    useEffect(() => {
        if (page > 1) {
            fetchGenera(page, search);
        }
    }, [page]);

    return (
        <Box sx={{ p: 3 }}>
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Cari genus..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 2, mt: 5, position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper' }}
            />

            <Grid container spacing={2}>
                {genera.map((item, index) => (
                    <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
                        lg={3}
                        key={`genus-${item.taxa_id}-${index}`}
                        ref={index === genera.length - 1 ? lastGenusElementRef : null}
                    >
                        <GenusCard item={item} navigate={navigate} />
                    </Grid>
                ))}
            </Grid>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 3 }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && !hasMore && genera.length > 0 && (
                <Typography variant="body1" sx={{ textAlign: 'center', mt: 3, mb: 3 }}>
                    Tidak ada data lagi
                </Typography>
            )}

            {!loading && genera.length === 0 && (
                <Typography variant="body1" sx={{ textAlign: 'center', mt: 3 }}>
                    Tidak ada data yang ditemukan
                </Typography>
            )}
        </Box>
    );
};

export default GenusGallery;
