import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Typography,
    Box,
    Paper,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Button,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemButton
} from '@mui/material';
import { Link } from 'react-router-dom';

const TaxonomyRankCard = ({ rank, title, description, count, thumbnailSrc }) => {
    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardMedia
                component="img"
                height="160"
                image={thumbnailSrc || `https://via.placeholder.com/400x200?text=${title}`}
                alt={title}
            />
            <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" component="div" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {description}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    {count > 0 ? `${count} ${title.toLowerCase()} tercatat` : 'Data belum tersedia'}
                </Typography>
                <Button 
                    variant="contained" 
                    component={Link} 
                    to={`/taxonomy/${rank}`}
                    fullWidth
                >
                    Jelajahi {title}
                </Button>
            </CardContent>
        </Card>
    );
};

const TaxonomyNavigator = () => {
    const [loading, setLoading] = useState(true);
    const [taxaCounts, setTaxaCounts] = useState({
        kingdom: 0,
        phylum: 0,
        class: 0,
        order: 0,
        family: 0,
        genus: 0,
        species: 0
    });

    useEffect(() => {
        const fetchTaxaCounts = async () => {
            try {
                setLoading(true);
                
                // Biasanya ada endpoint untuk mendapatkan statistik taksonomi
                // Untuk saat ini, kita gunakan data dummy
                // Ideally, this would be a real API call:
                // const response = await axios.get(`${import.meta.env.VITE_API_URL}/taxonomy/stats`);
                // setTaxaCounts(response.data);
                
                // Dummy data
                setTimeout(() => {
                    setTaxaCounts({
                        kingdom: 5,
                        phylum: 38,
                        class: 87,
                        order: 345,
                        family: 1290,
                        genus: 9825,
                        species: 42567
                    });
                    setLoading(false);
                }, 1000);
                
            } catch (error) {
                console.error('Error fetching taxa counts:', error);
                setLoading(false);
            }
        };

        fetchTaxaCounts();
    }, []);

    const taxonomyRanks = [
        { 
            rank: 'kingdom', 
            title: 'Kingdom', 
            description: 'Tingkat tertinggi dalam klasifikasi taksonomi yang membagi organisme menjadi kelompok besar seperti Animalia, Plantae, dan Fungi.',
            thumbnailSrc: 'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80'
        },
        { 
            rank: 'phylum', 
            title: 'Phylum', 
            description: 'Subdivisi dari kingdom, mengelompokkan organisme berdasarkan rencana tubuh atau karakteristik fundamental.',
            thumbnailSrc: 'https://images.unsplash.com/photo-1602491453631-e2a5ad90a131?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80'
        },
        { 
            rank: 'class', 
            title: 'Class', 
            description: 'Subdivisi dari phylum, mengelompokkan organisme ke dalam kategori yang lebih spesifik berdasarkan karakteristik mereka.',
            thumbnailSrc: 'https://images.unsplash.com/photo-1565611579479-5c9e51c219e7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80'
        },
        { 
            rank: 'order', 
            title: 'Order', 
            description: 'Subdivisi dari class, mengelompokkan organisme berdasarkan karakteristik yang lebih spesifik.',
            thumbnailSrc: 'https://images.unsplash.com/photo-1516550893885-1f4d1d84e020?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80'
        },
        { 
            rank: 'family', 
            title: 'Family', 
            description: 'Subdivisi dari order, biasanya ditandai dengan akhiran -idae (untuk hewan) atau -aceae (untuk tumbuhan).',
            thumbnailSrc: 'https://images.unsplash.com/photo-1553608449-2093c9a1de19?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80'
        },
        { 
            rank: 'genus', 
            title: 'Genus', 
            description: 'Subdivisi dari family, merupakan bagian pertama dari nama ilmiah suatu organisme.',
            thumbnailSrc: 'https://images.unsplash.com/photo-1576334132979-64d49a1ea3cc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80'
        },
        { 
            rank: 'species', 
            title: 'Species', 
            description: 'Tingkat dasar klasifikasi taksonomi, mendefinisikan organisme secara spesifik dengan dua nama (binomial nomenclature).',
            thumbnailSrc: 'https://images.unsplash.com/photo-1609140608654-b4e8d1393864?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80'
        }
    ];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h3" component="h1" gutterBottom sx={{ mt: 3, mb: 1 }}>
                Jelajahi Taksonomi
            </Typography>
            
            <Typography variant="body1" gutterBottom sx={{ mb: 4 }}>
                Jelajahi beragam taksonomi fauna dari kingdom hingga species. Temukan dan pelajari keanekaragaman hayati yang ada di Indonesia.
            </Typography>
            
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h5" gutterBottom>Taksonomi Secara Hierarki</Typography>
                <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
                    Taksonomi adalah ilmu yang mempelajari klasifikasi organisme berdasarkan karakteristik dan hubungan evolusioner. 
                    Dimulai dari Kingdom (tingkat tertinggi) hingga Species (tingkat terendah).
                </Typography>
                
                <List>
                    {taxonomyRanks.map((item, index) => (
                        <React.Fragment key={item.rank}>
                            <ListItem disablePadding>
                                <ListItemButton component={Link} to={`/taxonomy/${item.rank}`}>
                                    <ListItemText
                                        primary={`${item.title} (${taxaCounts[item.rank] || 0})`}
                                        secondary={item.description}
                                    />
                                </ListItemButton>
                            </ListItem>
                            {index < taxonomyRanks.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>
            
            <Typography variant="h5" gutterBottom>
                Jelajahi Berdasarkan Tingkat Taksonomi
            </Typography>
            
            <Grid container spacing={3}>
                {taxonomyRanks.map((item) => (
                    <Grid item key={item.rank} xs={12} sm={6} md={4} lg={3}>
                        <TaxonomyRankCard
                            rank={item.rank}
                            title={item.title}
                            description={item.description}
                            count={taxaCounts[item.rank]}
                            thumbnailSrc={item.thumbnailSrc}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default TaxonomyNavigator; 