import { useState, useEffect, useCallback, useRef } from 'react';
import localforage from 'localforage';
import { throttle } from 'lodash';

// Menambahkan lebih banyak level grid size untuk transisi yang lebih halus
const GRID_SIZES = {
  extremelyLarge: 0.4,
  veryLarge: 0.3,
  large: 0.2,
  mediumLarge: 0.15,
  medium: 0.1,
  mediumSmall: 0.05,
  small: 0.02,
  verySmall: 0.01,
  tiny: 0.005
};

const THROTTLE_DELAY = 1000; // Naikkan ke 1 detik

// Fungsi yang lebih halus untuk menentukan ukuran grid berdasarkan zoom level
const getGridSizeFromZoom = (zoom) => {
  // Level zoom yang lebih granular untuk transisi yang lebih halus
  if (zoom >= 14) return GRID_SIZES.tiny;
  if (zoom >= 12) return GRID_SIZES.verySmall;
  if (zoom >= 10) return GRID_SIZES.small;
  if (zoom >= 9) return GRID_SIZES.mediumSmall;
  if (zoom >= 8) return GRID_SIZES.medium;
  if (zoom >= 7) return GRID_SIZES.mediumLarge;
  if (zoom >= 6) return GRID_SIZES.large;
  if (zoom >= 5) return GRID_SIZES.veryLarge;
  return GRID_SIZES.extremelyLarge;
};

// Fungsi untuk validasi bounds
const isValidBounds = (bounds) => {
  if (!bounds || typeof bounds.toBBoxString !== 'function') return false;
  const bbox = bounds.toBBoxString().split(',').map(Number);
  return bbox.length === 4 && 
         bbox.every(coord => !isNaN(coord)) &&
         bbox[1] >= -90 && bbox[1] <= 90 && // south
         bbox[3] >= -90 && bbox[3] <= 90 && // north
         bbox[0] >= -180 && bbox[0] <= 180 && // west
         bbox[2] >= -180 && bbox[2] <= 180;  // east
};

export const useGridData = () => {
  const [gridData, setGridData] = useState({ tiles: [] });
  const gridWorker = useRef(null);
  const previousParams = useRef(null);
  const processingRef = useRef(false);

  useEffect(() => {
    gridWorker.current = new Worker(new URL('../workers/gridWorker.js', import.meta.url));
    
    // Cleanup worker on unmount
    return () => {
      if (gridWorker.current) {
        gridWorker.current.terminate();
        gridWorker.current = null;
      }
    };
  }, []);

  const updateGridData = useCallback(async (markers, zoomLevel, bounds) => {
    if (!markers || !bounds || !gridWorker.current || processingRef.current) return;
    
    // Validasi bounds
    if (!isValidBounds(bounds)) {
      console.error('Invalid bounds:', bounds);
      return;
    }

    const newParams = {
      zoom: zoomLevel,
      bounds: bounds.toBBoxString(),
      markersLength: markers.length
    };

    // Cek apakah parameter berubah
    if (JSON.stringify(newParams) === JSON.stringify(previousParams.current)) {
      return;
    }

    processingRef.current = true;
    previousParams.current = newParams;

    try {
      gridWorker.current.onmessage = async (e) => {
        const processedGrid = e.data;
        setGridData({ tiles: processedGrid });
        processingRef.current = false;
      };

      gridWorker.current.onerror = (error) => {
        console.error('Grid worker error:', error);
        processingRef.current = false;
      };

      const gridSize = getGridSizeFromZoom(zoomLevel);
      
      // Filter markers yang valid
      const validMarkers = markers.filter(marker => {
        const lat = parseFloat(marker.latitude);
        const lng = parseFloat(marker.longitude);
        return !isNaN(lat) && !isNaN(lng) && 
               lat >= -90 && lat <= 90 && 
               lng >= -180 && lng <= 180;
      });

      gridWorker.current.postMessage({
        markers: validMarkers,
        gridSize,
        bounds
      });
    } catch (error) {
      console.error('Error processing grid:', error);
      processingRef.current = false;
    }
  }, []);

  return { gridData, updateGridData };
}; 