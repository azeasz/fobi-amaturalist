import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import * as turf from '@turf/turf';
import { apiFetch } from '../../utils/api';
import PropTypes from 'prop-types';
import L from 'leaflet';
import './DrawingTools.css'; // Menambahkan CSS custom untuk styling

const DrawingTools = ({ onShapeDrawn, onShapeDeleted, setStats, onDrawingStateChange, activePolygon }) => {
  const map = useMap();
  const drawnLayerRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Fungsi untuk mengembalikan layer dari data GeoJSON
  const createLayerFromGeoJSON = (shapeData) => {
    if (!shapeData) return null;
    
    let layer = null;
    
    if (shapeData.type === 'Circle') {
      // Buat circle dari data dengan styling tema gelap
      const center = L.latLng(shapeData.center[1], shapeData.center[0]);
      layer = L.circle(center, { 
        radius: shapeData.radius,
        color: '#1a73e8',
        fillColor: '#1a73e8',
        fillOpacity: 0.3,
        weight: 2
      });
    } else if (shapeData.type === 'Polygon') {
      // Buat polygon dari data dengan styling tema gelap
      const latLngs = shapeData.coordinates[0].map(coord => L.latLng(coord[1], coord[0]));
      layer = L.polygon(latLngs, {
        color: '#1a73e8',
        fillColor: '#1a73e8',
        fillOpacity: 0.3,
        weight: 2
      });
    }
    
    return layer;
  };

  // Effect untuk inisialisasi drawing tools
  useEffect(() => {
    if (!map) return;

    // Tambahkan class untuk tema gelap ke map container
    const mapContainer = map.getContainer();
    mapContainer.classList.add('dark-theme-map');

    // Kustomisasi style untuk drawing tools
    const customTheme = {
      drawingText: {
        color: '#e0e0e0',
        fontWeight: 'bold'
      },
      layerStyles: {
        tempLine: {
          color: '#1a73e8',
          weight: 2
        },
        hintLine: {
          color: '#4285f4',
          dashArray: [5, 5],
          weight: 2
        }
      }
    };

    // Inisialisasi Geoman controls dengan opsi tambahan
    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawRectangle: true,
      drawPolygon: true,
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
      customOptions: {
        styles: customTheme
      }
    });

    // Setel tema kustom untuk drawing tools
    map.pm.setPathOptions({
      color: '#1a73e8',
      fillColor: '#1a73e8',
      fillOpacity: 0.3,
    });

    // Event handlers untuk drawing mode
    map.on('pm:drawstart', () => {
      if (onDrawingStateChange) {
        onDrawingStateChange(true);
      }
    });

    map.on('pm:drawend', () => {
      if (onDrawingStateChange) {
        onDrawingStateChange(false);
      }
    });

    // Event handlers untuk drawing
    map.on('pm:create', handleShapeCreated);
    map.on('pm:remove', handleShapeDeleted);

    return () => {
      map.pm.removeControls();
      map.off('pm:create', handleShapeCreated);
      map.off('pm:remove', handleShapeDeleted);
      map.off('pm:drawstart');
      map.off('pm:drawend');
      
      // Hapus layer yang sudah dibuat jika ada
      if (drawnLayerRef.current && map.hasLayer(drawnLayerRef.current)) {
        map.removeLayer(drawnLayerRef.current);
      }
      
      // Hapus class dark theme
      mapContainer.classList.remove('dark-theme-map');
    };
  }, [map, onShapeDrawn, onShapeDeleted, onDrawingStateChange]);

  // Effect untuk menginisialisasi polygon dari activePolygon
  useEffect(() => {
    if (!map || !activePolygon || isInitializedRef.current) return;
    
    // Buat layer dari data polygon yang disimpan
    const layer = createLayerFromGeoJSON(activePolygon);
    
    if (layer) {
      // Hapus layer sebelumnya jika ada
      if (drawnLayerRef.current && map.hasLayer(drawnLayerRef.current)) {
        map.removeLayer(drawnLayerRef.current);
      }
      
      // Tambahkan layer baru ke peta
      layer.addTo(map);
      drawnLayerRef.current = layer;
      
      // Zoom ke polygon
      map.fitBounds(layer.getBounds());
      
      // Tandai bahwa polygon sudah diinisialisasi
      isInitializedRef.current = true;
      
      // Panggil callback untuk memberi tahu komponen induk tentang shape yang digambar
      if (onShapeDrawn) {
        // Gunakan setTimeout untuk menghindari terlalu banyak permintaan API bersamaan
        setTimeout(() => {
          onShapeDrawn(layer, activePolygon);
        }, 500);
      }
    }
  }, [map, activePolygon, onShapeDrawn]);

  const handleShapeCreated = async (e) => {
    console.log('PM Create event:', e);
    const layer = e.layer;
    const shape = e.shape; // Gunakan shape dari event
    
    // Ubah style layer yang baru dibuat agar sesuai dengan tema gelap
    layer.setStyle({
      color: '#1a73e8',
      fillColor: '#1a73e8',
      fillOpacity: 0.3,
      weight: 2
    });
    
    let shapeData = {};
    
    if (shape === 'Circle') {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      shapeData = {
        type: 'Circle',
        center: [center.lng, center.lat],
        radius: radius
      };
    } else if (shape === 'Rectangle' || shape === 'Polygon') {
      const latLngs = layer.getLatLngs()[0];
      const coordinates = latLngs.map(latLng => [latLng.lng, latLng.lat]);
      // Pastikan polygon tertutup (koordinat pertama dan terakhir sama)
      if (coordinates.length > 0 && 
          (coordinates[0][0] !== coordinates[coordinates.length-1][0] || 
           coordinates[0][1] !== coordinates[coordinates.length-1][1])) {
        coordinates.push([...coordinates[0]]);
      }
      shapeData = {
        type: 'Polygon',
        coordinates: [coordinates]
      };
    }
    
    console.log('Shape data created:', shapeData);
    
    // Simpan layer yang dibuat
    drawnLayerRef.current = layer;
    isInitializedRef.current = true;
    
    // Panggil callback untuk memberi tahu komponen induk tentang shape yang digambar
    if (onShapeDrawn && Object.keys(shapeData).length > 0) {
      onShapeDrawn(layer, shapeData);
    }
  };
  
  const fetchDefaultStats = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const cachedStats = localStorage.getItem('cachedStats');

      if (cachedStats) {
        setStats(JSON.parse(cachedStats));
        return;
      }

      const [
        burungnesiaResponse,
        kupunesiaResponse,
        fobiResponse,
        totalSpeciesResponse,
        totalContributorsResponse
      ] = await Promise.all([
        apiFetch('/burungnesia-count', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        apiFetch('/kupunesia-count', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        apiFetch('/fobi-count', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        apiFetch('/total-species'),
        apiFetch('/total-contributors')
      ]);

      const burungnesiaData = await burungnesiaResponse.json();
      const kupunesiaData = await kupunesiaResponse.json();
      const fobiData = await fobiResponse.json();
      const totalSpeciesData = await totalSpeciesResponse.json();
      const totalContributorsData = await totalContributorsResponse.json();

      const newStats = {
        burungnesia: burungnesiaData.burungnesiaCount,
        kupunesia: kupunesiaData.kupunesiaCount,
        fobi: fobiData.fobiCount,
        observasi: burungnesiaData.burungnesiaCount + kupunesiaData.kupunesiaCount + fobiData.fobiCount,
        spesies: totalSpeciesData.totalSpecies,
        kontributor: totalContributorsData.totalContributors,
        fotoAudio: 0
      };

      setStats(newStats);
      localStorage.setItem('cachedStats', JSON.stringify(newStats));
    } catch (error) {
      console.error('Error fetching default stats:', error);
    }
  };
  
  const handleShapeDeleted = () => {
    // Reset referensi layer
    drawnLayerRef.current = null;
    isInitializedRef.current = false;
    
    // Reset stats ketika shape dihapus dengan menggunakan fetchDefaultStats
    if (setStats) {
      fetchDefaultStats();
    }
    
    if (onShapeDeleted) {
      onShapeDeleted();
    }
  };

  return null;
};

DrawingTools.propTypes = {
  onShapeDrawn: PropTypes.func,
  onShapeDeleted: PropTypes.func,
  setStats: PropTypes.func,
  onDrawingStateChange: PropTypes.func,
  activePolygon: PropTypes.object
};

export default DrawingTools; 