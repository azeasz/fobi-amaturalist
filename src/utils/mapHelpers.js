import L from 'leaflet';
import burungnesiaLogo from '../assets/icon/icon.png';
import kupunesiaLogo from '../assets/icon/kupnes.png';
import taxaLogo from '../assets/icon/FOBI.png';

export const defaultMapConfig = {
  center: [-2.5489, 118.0149],
  zoom: 5,
  scrollWheelZoom: window.innerWidth > 768,
  style: { zIndex: 40 }
};

export const redCircleIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color:red; width:10px; height:10px; border-radius:50%;'></div>",
  iconSize: [10, 10]
});

export const getSourceLogo = (source) => {
  if (source?.includes('burungnesia')) return burungnesiaLogo;
  if (source?.includes('kupunesia')) return kupunesiaLogo;
  if (source?.includes('taxa') || source?.includes('fobi')) return taxaLogo;
  return burungnesiaLogo;
};

export const getColor = (count, source) => {
  // Gradasi warna biru dari gelap ke terang tanpa efek glow untuk performa lebih baik
  if (count > 100) {
    return {
      fillColor: '#ffffff', // Warna putih di tengah
      color: '#1a73e8',    // Warna border biru
      weight: 1,           // Ketebalan border dikurangi
      fillOpacity: 0.85,   // Opacity fill
      opacity: 0.9         // Opacity border
    };
  } else if (count > 50) {
    return {
      fillColor: '#a4cdff', // Biru sangat terang
      color: '#1a73e8',
      weight: 0.8,
      fillOpacity: 0.8,
      opacity: 0.8
    };
  } else if (count > 20) {
    return {
      fillColor: '#4d94ff', // Biru terang
      color: '#1a73e8',
      weight: 0.7,
      fillOpacity: 0.75,
      opacity: 0.7
    };
  } else if (count > 10) {
    return {
      fillColor: '#0066ff', // Biru medium
      color: '#1a73e8', 
      weight: 0.6,
      fillOpacity: 0.7,
      opacity: 0.6
    };
  } else if (count > 5) {
    return {
      fillColor: '#004dc4', // Biru gelap
      color: '#003380',
      weight: 0.5,
      fillOpacity: 0.6,
      opacity: 0.5
    };
  } else if (count > 2) {
    return {
      fillColor: '#003380', // Biru sangat gelap
      color: '#001f4d',
      weight: 0.5,
      fillOpacity: 0.5,
      opacity: 0.4
    };
  } else {
    return {
      fillColor: '#2436ff', // Biru hampir hitam
      color: '#2436ff',
      weight: 0.5,
      fillOpacity: 0.4,
      opacity: 0.4
    };
  }
};

export const getVisibleGridType = (zoom) => {
  // Pastikan zoom level valid
  const safeZoom = Math.max(0, Math.min(20, parseFloat(zoom) || 0));
  
  // Level zoom yang lebih granular untuk transisi yang lebih halus
  if (safeZoom >= 14) return 'tiny';
  if (safeZoom >= 12) return 'verySmall';
  if (safeZoom >= 10) return 'small';
  if (safeZoom >= 9) return 'mediumSmall';
  if (safeZoom >= 8) return 'medium';
  if (safeZoom >= 7) return 'mediumLarge';
  if (safeZoom >= 6) return 'large';
  if (safeZoom >= 5) return 'veryLarge';
  return 'extremelyLarge';
};

// Tambahkan fungsi helper untuk validasi bounds
export const validateBounds = (bounds) => {
  if (!bounds || typeof bounds !== 'object') return false;
  
  const { _southWest, _northEast } = bounds;
  if (!_southWest || !_northEast) return false;
  
  const { lat: south, lng: west } = _southWest;
  const { lat: north, lng: east } = _northEast;
  
  return !isNaN(south) && !isNaN(north) && !isNaN(west) && !isNaN(east) &&
         south >= -90 && south <= 90 && north >= -90 && north <= 90 &&
         west >= -180 && west <= 180 && east >= -180 && east <= 180;
};

// Tambahkan fungsi untuk normalisasi koordinat
export const normalizeCoordinate = (coord, isLongitude = false) => {
  if (isLongitude) {
    return ((coord + 180) % 360) - 180;
  }
  return Math.max(-90, Math.min(90, coord));
}; 