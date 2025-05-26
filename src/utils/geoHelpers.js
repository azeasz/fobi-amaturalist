// Fungsi untuk mengkonversi derajat ke radian
export const toRad = (value) => {
  return value * Math.PI / 180;
};

// Fungsi untuk menghitung jarak antara dua titik koordinat (dalam kilometer)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

// Fungsi untuk menghitung titik tengah dari bounding box
export const calculateCenterPoint = (south, north, west, east) => {
  const lat = (south + north) / 2;
  const lng = (west + east) / 2;
  return { lat, lng };
};

// Fungsi untuk menghitung zoom level berdasarkan radius dan bounding box
export const calculateZoomLevel = (radius, boundingbox) => {
  if (boundingbox) {
    const [south, north, west, east] = boundingbox.map(coord => parseFloat(coord));
    const width = calculateDistance(south, west, south, east);
    const height = calculateDistance(south, west, north, west);
    const size = Math.max(width, height);
    
    if (size > 1000) return 5;  // Country level
    if (size > 500) return 6;   // Large region
    if (size > 200) return 7;   // Province level
    if (size > 100) return 8;   // Region level
    if (size > 50) return 9;    // Large city
    if (size > 20) return 10;   // County level
    if (size > 10) return 11;   // City level
    return 12;                  // District level
  }
  
  // Fallback ke perhitungan berdasarkan radius jika tidak ada bounding box
  if (radius >= 100) return 7;
  if (radius >= 50) return 8;
  if (radius >= 10) return 10;
  if (radius >= 5) return 11;
  return 12;
}; 