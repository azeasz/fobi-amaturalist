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
    CircularProgress,
    Breadcrumbs,
    Link as MuiLink
} from '@mui/material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const extractAuthorFromScientificName = (scientificName) => {
    if (!scientificName) return { name: '', author: '' };
    
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
    if (item.name && item.name.trim() !== '') {
        return item.name;
    }
    const { name } = extractAuthorFromScientificName(item.scientific_name);
    return name;
};

const TaxaCard = ({ item, navigate, rank }) => {
    const [expanded, setExpanded] = useState(false);
    const { name: scientificNameWithoutAuthor, author } = extractAuthorFromScientificName(item.scientific_name);
    const displayName = getDisplayName(item);
    const mediaPaths = item.media_paths ? item.media_paths.split(',') : [];
    const childTaxa = item.child_taxa || [];
    
    // Mendapatkan next rank untuk navigasi
    const getNextRank = (currentRank) => {
        const rankHierarchy = {
            'kingdom': 'phylum',
            'phylum': 'class',
            'class': 'order',
            'order': 'family',
            'family': 'genus',
            'genus': 'species',
        };
        return rankHierarchy[currentRank.toLowerCase()] || 'species';
    };
    
    const nextRank = getNextRank(rank);

    return (
        <Card>
            {mediaPaths[0] && (
                <CardMedia
                    component="img"
                    height="200"
                    image={`https://api.amaturalist.com/storage/${mediaPaths[0]}`}
                    alt={displayName}
                    onError={(e) => {
                        e.target.src = "https://via.placeholder.com/200x200?text=Tidak+Ada+Gambar";
                    }}
                />
            )}
            {!mediaPaths[0] && (
                <CardMedia
                    component="img"
                    height="200"
                    image={`https://via.placeholder.com/200x200?text=${displayName}`}
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
                {item.common_name && (
                    <Typography variant="body2">
                        Nama Umum: {item.common_name}
                    </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                    {item.observation_count || 0} pengamatan
                </Typography>

                {childTaxa.length > 0 && (
                    <>
                        <IconButton
                            onClick={() => setExpanded(!expanded)}
                            sx={{ mt: 1 }}
                            size="small"
                        >
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            <Typography variant="button" sx={{ ml: 1 }}>
                                {expanded ? `Sembunyikan ${nextRank}` : `Lihat ${nextRank}`}
                            </Typography>
                        </IconButton>

                        <Collapse in={expanded}>
                            <List dense>
                                {childTaxa.map((child) => (
                                    <ListItem
                                        key={child.taxa_id}
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
                                                        {child.name}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                                        {child.scientific_name}
                                                    </Typography>
                                                    {child.description && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {child.description.substring(0, 100)}
                                                            {child.description.length > 100 ? '...' : ''}
                                                        </Typography>
                                                    )}
                                                </>
                                            }
                                            onClick={() => window.open(`/${child.taxon_rank}/${child.taxa_id}`, '_blank')}
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
                    onClick={() => navigate(`/${rank}/${item.taxa_id}`)}
                >
                    Lihat Detail
                </Button>
            </CardContent>
        </Card>
    );
};

const TaxonomyGallery = () => {
    const { rank } = useParams();
    const [taxa, setTaxa] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState(null);
    const navigate = useNavigate();
    const observer = useRef();

    // Fungsi breadcrumbs - Taxonomy Navigator
    const getTaxonomyBreadcrumbs = () => {
        const rankHierarchy = ['Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus', 'Species'];
        const currentRankIndex = rankHierarchy.findIndex(r => r.toLowerCase() === rank.toLowerCase());
        
        return (
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, mt: 1 }}>
                <MuiLink 
                    component={Link} 
                    to="/taxonomy"
                    color="inherit"
                >
                    Taxonomy
                </MuiLink>
                {rankHierarchy.slice(0, currentRankIndex + 1).map((r, index) => (
                    <MuiLink
                        key={r}
                        component={Link}
                        to={`/taxonomy/${r.toLowerCase()}`}
                        color={index === currentRankIndex ? "primary" : "inherit"}
                        underline={index === currentRankIndex ? "none" : "hover"}
                    >
                        {r}
                    </MuiLink>
                ))}
            </Breadcrumbs>
        );
    };

    const lastTaxaElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const fetchTaxa = async (pageNumber, searchQuery = '') => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL}/taxonomy/${rank.toLowerCase()}?page=${pageNumber}&search=${searchQuery}`
            );
            const newData = response.data.data;

            if (newData && newData.data) {
                setTaxa(prev => pageNumber === 1 ? newData.data : [...prev, ...newData.data]);
                setHasMore(newData.current_page < newData.last_page);
            }
        } catch (error) {
            console.error(`Error fetching ${rank}:`, error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Reset saat search berubah
        if (searchTimeout) clearTimeout(searchTimeout);

        const timeoutId = setTimeout(() => {
            setPage(1);
            setTaxa([]);
            fetchTaxa(1, search);
        }, 500); // Debounce 500ms

        setSearchTimeout(timeoutId);

        return () => {
            if (searchTimeout) clearTimeout(searchTimeout);
        };
    }, [search, rank]);

    useEffect(() => {
        if (page > 1) {
            fetchTaxa(page, search);
        }
    }, [page]);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" sx={{ mb: 2, mt: 3 }}>
                {rank.charAt(0).toUpperCase() + rank.slice(1)} Gallery
            </Typography>
            
            {getTaxonomyBreadcrumbs()}
            
            <TextField
                fullWidth
                variant="outlined"
                placeholder={`Cari ${rank}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 3, position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper' }}
            />

            <Grid container spacing={2}>
                {taxa.map((item, index) => (
                    <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
                        lg={3}
                        key={`taxa-${item.taxa_id}-${index}`}
                        ref={index === taxa.length - 1 ? lastTaxaElementRef : null}
                    >
                        <TaxaCard item={item} navigate={navigate} rank={rank} />
                    </Grid>
                ))}
            </Grid>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                    <CircularProgress />
                </Box>
            )}
            
            {!loading && taxa.length === 0 && (
                <Box sx={{ textAlign: 'center', mt: 4, mb: 2 }}>
                    <Typography>
                        Tidak ada data {rank} yang ditemukan
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default TaxonomyGallery; 