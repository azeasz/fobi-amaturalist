import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

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
        <Box sx={{ height: 400 }}>
            <MapContainer
                center={[-2.5489, 118.0149]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
            >
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
                            <div>
                                <p>Lokasi: {location.location}</p>
                                <p>Tanggal: {new Date(location.observation_date).toLocaleDateString('id-ID')}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </Box>
    );
};

export default DistributionMap;
