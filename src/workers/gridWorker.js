// Pindahkan semua helper functions ke dalam worker
const GRID_SIZES = {
  tiny: 0.005,         // Zoom level >= 14
  verySmall: 0.01,     // Zoom level 12-13
  small: 0.02,         // Zoom level 10-11
  mediumSmall: 0.035,  // Zoom level 9
  medium: 0.05,        // Zoom level 8
  mediumLarge: 0.1,    // Zoom level 7
  large: 0.2,          // Zoom level 6
  veryLarge: 0.3,      // Zoom level 5
  extremelyLarge: 0.5  // Zoom level < 5
};

const toRad = (value) => {
  return value * Math.PI / 180;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const generateGrid = (markers, gridSize) => {
  if (!markers || !Array.isArray(markers) || markers.length === 0) {
    return [];
  }

  const grid = {};
  const validMarkers = markers.filter(marker => {
    const lat = parseFloat(marker.latitude);
    const lng = parseFloat(marker.longitude);
    return !isNaN(lat) && !isNaN(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  });

  validMarkers.forEach(marker => {
    const lat = parseFloat(marker.latitude);
    const lng = parseFloat(marker.longitude);
    const latKey = Math.floor(lat / gridSize) * gridSize;
    const lngKey = Math.floor(lng / gridSize) * gridSize;
    const gridKey = `${latKey}_${lngKey}`;

    if (!grid[gridKey]) {
      grid[gridKey] = {
        bounds: [
          [latKey, lngKey],
          [latKey + gridSize, lngKey + gridSize]
        ],
        count: 0,
        data: [],
        source: marker.source
      };
    }

    grid[gridKey].data.push({
      id: marker.id,
      checklist_id: marker.checklist_id || marker.id,
      source: marker.source,
      latitude: marker.latitude,
      longitude: marker.longitude,
      created_at: marker.created_at
    });

    grid[gridKey].count++;
    
    if (marker.source.includes('fobi')) {
      grid[gridKey].source = 'fobi';
    }
  });

  return Object.values(grid).filter(tile => {
    if (!tile.bounds || !Array.isArray(tile.bounds)) return false;
    const [[south, west], [north, east]] = tile.bounds;
    return !isNaN(south) && !isNaN(west) && !isNaN(north) && !isNaN(east);
  });
};

// Worker message handler
self.onmessage = async (e) => {
  const { markers, gridSize, bounds } = e.data;
  
  try {
    const processedGrid = generateGrid(markers, gridSize);
    self.postMessage(processedGrid);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
}; 