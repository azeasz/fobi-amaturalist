import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { openDB } from 'idb';
import * as turf from '@turf/turf';

const DB_NAME = 'markersDB';
const STORE_NAME = 'markers';
const CACHE_VERSION = 1;
const CACHE_TIME = 24 * 60 * 60 * 1000; // 24 jam dalam milliseconds

// Inisialisasi IndexedDB
const initDB = async () => {
  return openDB(DB_NAME, CACHE_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME);
        store.createIndex('timestamp', 'timestamp');
      }
    },
  });
};

export const useMarkers = () => {
  const [mapMarkers, setMapMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);

  // Fungsi untuk mengambil data dari cache
  const getFromCache = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      
      const cachedData = await store.get('markersData');
      
      if (cachedData && 
          cachedData.timestamp && 
          Date.now() - cachedData.timestamp < CACHE_TIME) {
        return cachedData.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  };

  // Fungsi untuk mengambil data dari API
  const fetchFromAPI = async () => {
    const [markersResponse, fobiMarkersResponse] = await Promise.all([
      apiFetch('/markers'),
      apiFetch('/fobi-markers')
    ]);

    const markersData = await markersResponse.json();
    const fobiMarkersData = await fobiMarkersResponse.json();

    return [
      ...markersData.map(marker => ({
        ...marker,
        source: marker.source || 'burungnesia'
      })),
      ...fobiMarkersData.map(marker => ({
        ...marker,
        source: 'fobi'
      }))
    ];
  };

  // Fungsi untuk menyimpan data ke cache dengan metadata
  const saveToCache = async (data) => {
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const timestamp = Date.now();
      await store.put({
        data,
        timestamp,
        lastChecked: timestamp
      }, 'markersData');
      
      await tx.done;
      setLastUpdate(timestamp);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  // Fungsi untuk memperbarui lastChecked di cache
  const updateLastChecked = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const cachedData = await store.get('markersData');
      if (cachedData) {
        await store.put({
          ...cachedData,
          lastChecked: Date.now()
        }, 'markersData');
      }
      
      await tx.done;
    } catch (error) {
      console.error('Error updating lastChecked:', error);
    }
  };

  // Fungsi untuk memeriksa pembaruan data
  const checkForUpdates = async () => {
    try {
      const newData = await fetchFromAPI();
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const cachedData = await store.get('markersData');

      // Bandingkan jumlah data dan timestamp terakhir
      if (!cachedData || 
          newData.length !== cachedData.data.length || 
          Date.now() - cachedData.timestamp > CACHE_TIME) {
        await saveToCache(newData);
        setMapMarkers(newData);
        return true;
      }

      await updateLastChecked();
      return false;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  };

  // Effect untuk inisialisasi dan pemeriksaan berkala
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Coba ambil dari cache dulu
        const cachedData = await getFromCache();
        if (cachedData) {
          setMapMarkers(cachedData);
          setLoading(false);
          
          // Periksa pembaruan di background
          checkForUpdates();
        } else {
          // Jika tidak ada cache, fetch dari API
          const newData = await fetchFromAPI();
          await saveToCache(newData);
          setMapMarkers(newData);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        setLoading(false);
      }
    };

    initializeData();

    // Set interval untuk memeriksa pembaruan setiap 5 menit
    const updateInterval = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000);

    return () => clearInterval(updateInterval);
  }, []);

  // Fungsi untuk memperbarui data secara manual
  const refreshMarkers = useCallback(async () => {
    setLoading(true);
    try {
      const newData = await fetchFromAPI();
      await saveToCache(newData);
      setMapMarkers(newData);
    } catch (error) {
      console.error('Error refreshing markers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterMarkers = (markers, filterParams, searchParams, shape) => {
    if (!markers || markers.length === 0) return [];

    let filteredMarkers = markers.filter(marker => {
      // Filter berdasarkan sumber data
      if (filterParams?.data_source?.length > 0) {
        const sourceMatch = filterParams.data_source.some(source => {
          if (source === 'burungnesia') {
            return marker.source === 'burungnesia';
          }
          if (source === 'kupunesia') {
            return marker.source === 'kupunesia';
          }
          if (source === 'fobi') {
            return marker.source === 'fobi';
          }
          return false;
        });
        if (!sourceMatch) return false;
      }

      // Filter berdasarkan lokasi jika ada parameter pencarian
      if (searchParams?.latitude && searchParams?.longitude && filterParams?.radius) {
        const distance = calculateDistance(
          searchParams.latitude,
          searchParams.longitude,
          marker.latitude,
          marker.longitude
        );
        if (distance > filterParams.radius) return false;
      }

      return true;
    });

    // Filter berdasarkan shape jika ada
    if (shape) {
      return filteredMarkers.filter(marker => {
        try {
          const point = [parseFloat(marker.longitude), parseFloat(marker.latitude)];
          
          if (shape.type === 'Polygon') {
            // Pastikan coordinates ada dan valid
            if (!shape.coordinates || !shape.coordinates[0] || !Array.isArray(shape.coordinates[0])) {
              return true; // Skip filter jika format tidak valid
            }
            return turf.booleanPointInPolygon(point, {
              type: 'Polygon',
              coordinates: shape.coordinates
            });
          } 
          else if (shape.type === 'Circle') {
            // Untuk circle, gunakan perhitungan jarak
            if (!shape.center || !shape.radius) {
              return true; // Skip filter jika format tidak valid
            }
            const distance = turf.distance(
              point,
              shape.center,
              { units: 'meters' }
            );
            return distance <= shape.radius;
          }
          return true;
        } catch (error) {
          console.error('Error filtering marker with shape:', error);
          return true; // Jika error, tampilkan marker
        }
      });
    }
    
    return filteredMarkers;
  };

  // Fungsi helper untuk menghitung jarak
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius bumi dalam kilometer
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const toRad = (value) => {
    return value * Math.PI / 180;
  };

  return {
    mapMarkers,
    loading,
    filterMarkers,
    refreshMarkers,
    lastUpdate,
    currentShape,
    setCurrentShape
  };
}; 