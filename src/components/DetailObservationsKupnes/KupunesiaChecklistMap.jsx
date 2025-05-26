import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function KupunesiaChecklistMap({ checklist }) {
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

            // Custom marker icon for butterflies
            const butterflyIcon = L.icon({
                iconUrl: '/butterfly-marker-icon.png', // Custom butterfly icon
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            // Add marker
            markerRef.current = L.marker(
                [checklist.latitude, checklist.longitude],
                { icon: butterflyIcon }
            ).addTo(mapInstanceRef.current);

            // Add circle for habitat range if available
            if (checklist.habitat_radius) {
                L.circle([checklist.latitude, checklist.longitude], {
                    radius: checklist.habitat_radius,
                    fillColor: '#3388ff',
                    fillOpacity: 0.2,
                    color: '#3388ff',
                    opacity: 0.5
                }).addTo(mapInstanceRef.current);
            }

            // Add popup with butterfly-specific info
            const popupContent = `
                <div class="butterfly-popup">
                    <h4 class="font-medium">Lokasi Pengamatan Kupu-kupu</h4>
                    <p>Spesies: ${checklist.faunas?.[0]?.nameLat || 'Tidak diketahui'}</p>
                    <p>Nama Lokal: ${checklist.faunas?.[0]?.nameId || 'Tidak diketahui'}</p>
                    <p>Family: ${checklist.faunas?.[0]?.family || 'Tidak tercatat'}</p>
                    <p>Fase: ${checklist.life_stage || 'Tidak tercatat'}</p>
                    <p>Habitat: ${checklist.habitat_type || 'Tidak tercatat'}</p>
                    <p>Lat: ${checklist.latitude}</p>
                    <p>Long: ${checklist.longitude}</p>
                    ${checklist.nectar_plant ? `<p>Tanaman Nektar: ${checklist.nectar_plant}</p>` : ''}
                </div>
            `;

            markerRef.current.bindPopup(popupContent).openPopup();

            // Add host plants locations if available
            if (checklist.host_plants && checklist.host_plants.length > 0) {
                const hostPlantIcon = L.icon({
                    iconUrl: '/plant-marker-icon.png',
                    iconSize: [24, 24],
                    iconAnchor: [12, 24],
                    popupAnchor: [0, -24]
                });

                checklist.host_plants.forEach(plant => {
                    if (plant.latitude && plant.longitude) {
                        L.marker([plant.latitude, plant.longitude], { icon: hostPlantIcon })
                            .addTo(mapInstanceRef.current)
                            .bindPopup(`
                                <div>
                                    <h4>Tanaman Inang</h4>
                                    <p>${plant.name}</p>
                                </div>
                            `);
                    }
                });
            }
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
        <div className="space-y-4">
            <div 
                ref={mapRef} 
                className="w-full h-[400px] rounded-lg overflow-hidden shadow-md"
            />
            
            {/* Legend */}
            <div className="bg-white p-3 rounded-lg shadow-sm">
                <h4 className="font-medium mb-2">Keterangan Peta</h4>
                <div className="space-y-2">
                    <div className="flex items-center">
                        <img src="/butterfly-marker-icon.png" alt="Butterfly marker" className="w-6 h-6 mr-2" />
                        <span className="text-sm">Lokasi Pengamatan Kupu-kupu</span>
                    </div>
                    {checklist.habitat_radius && (
                        <div className="flex items-center">
                            <div className="w-6 h-6 mr-2 rounded-full bg-blue-200 border-2 border-blue-400"></div>
                            <span className="text-sm">Area Habitat</span>
                        </div>
                    )}
                    {checklist.host_plants?.length > 0 && (
                        <div className="flex items-center">
                            <img src="/plant-marker-icon.png" alt="Plant marker" className="w-6 h-6 mr-2" />
                            <span className="text-sm">Lokasi Tanaman Inang</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default KupunesiaChecklistMap;
