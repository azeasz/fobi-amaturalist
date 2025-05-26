import localforage from 'localforage';

// Setup cache storage
const geocodeCache = localforage.createInstance({
  name: 'geocodeCache'
});

// Fungsi untuk mendapatkan nama lokasi dari koordinat
export const getLocationName = async (latitude, longitude) => {
  try {
    // Generate cache key
    const cacheKey = `${latitude},${longitude}`;
    
    // Cek cache dulu
    const cachedLocation = await geocodeCache.getItem(cacheKey);
    if (cachedLocation) {
      return cachedLocation;
    }

    // Jika tidak ada di cache, gunakan Nominatim dengan rate limiting
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          'User-Agent': 'FOBI-WebApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    // Format lokasi - ambil hanya nama tempat dan wilayah administratif
    let locationName = '';
    if (data.address) {
      const parts = [];
      // Prioritaskan nama tempat yang lebih spesifik
      if (data.address.village) parts.push(data.address.village);
      else if (data.address.suburb) parts.push(data.address.suburb);
      else if (data.address.town) parts.push(data.address.town);
      else if (data.address.city) parts.push(data.address.city);
      
      // Tambahkan state/provinsi
      if (data.address.state) parts.push(data.address.state);
      
      locationName = parts.join(', ');
    }

    // Simpan ke cache
    await geocodeCache.setItem(cacheKey, locationName);

    return locationName || `${latitude}, ${longitude}`;
  } catch (error) {
    console.warn('Error getting location name:', error);
    return `${latitude}, ${longitude}`;
  }
};

// Queue untuk rate limiting
const queue = [];
let processing = false;

// Fungsi untuk memproses queue dengan rate limiting
const processQueue = async () => {
  if (processing || queue.length === 0) return;
  
  processing = true;
  const task = queue.shift();
  
  try {
    const result = await getLocationName(task.latitude, task.longitude);
    task.resolve(result);
  } catch (error) {
    task.reject(error);
  }
  
  // Rate limiting - tunggu 1 detik sebelum request berikutnya
  setTimeout(() => {
    processing = false;
    processQueue();
  }, 1000);
};

// Fungsi untuk menambahkan request ke queue
export const queueLocationName = (latitude, longitude) => {
  return new Promise((resolve, reject) => {
    queue.push({ latitude, longitude, resolve, reject });
    processQueue();
  });
}; 