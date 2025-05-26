import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function BurungnesiaChecklistMap({ checklist }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (!checklist?.latitude || !checklist?.longitude) return;

        // Initialize map if it doesn't exist
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current).setView(
                [checklist.latitude, checklist.longitude],
                13
            );

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapInstanceRef.current);

            // Custom marker icon for birds
            const birdIcon = L.icon({
                iconUrl: '/bird-marker-icon.png', // Custom bird icon
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            // Add marker
            markerRef.current = L.marker(
                [checklist.latitude, checklist.longitude],
                { icon: birdIcon }
            ).addTo(mapInstanceRef.current);

            // Add popup with bird-specific info
            markerRef.current.bindPopup(`
                <div class="bird-popup">
                    <h4 class="font-medium">Lokasi Pengamatan Burung</h4>
                    <p>Spesies: ${checklist.faunas?.[0]?.nameLat || 'Tidak diketahui'}</p>
                    <p>Nama Lokal: ${checklist.faunas?.[0]?.nameId || 'Tidak diketahui'}</p>
                    <p>Family: ${checklist.faunas?.[0]?.family || 'Tidak tercatat'}</p>
                    <p>Lat: ${checklist.latitude}</p>
                    <p>Long: ${checklist.longitude}</p>
                </div>
            `).openPopup();
        }

        // Update marker position if coordinates change
        if (markerRef.current) {
            markerRef.current.setLatLng([checklist.latitude, checklist.longitude]);
            mapInstanceRef.current.setView([checklist.latitude, checklist.longitude], 13);
        }

        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [checklist]);

    return (
        <div 
            ref={mapRef} 
            className="w-full h-[400px] rounded-lg overflow-hidden shadow-md"
        />
    );
}

export default BurungnesiaChecklistMap;