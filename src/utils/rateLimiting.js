/**
 * Utilitas untuk menangani rate limiting dan retry dengan exponential backoff.
 */

/**
 * Menjalankan fungsi dengan retry dan exponential backoff jika terjadi error 429.
 * 
 * @param {Function} fn - Fungsi yang akan dijalankan
 * @param {Object} options - Opsi konfigurasi
 * @param {number} options.maxRetries - Jumlah maksimum percobaan ulang (default: 3)
 * @param {number} options.initialDelay - Waktu tunggu awal dalam milidetik (default: 1000)
 * @param {number} options.maxDelay - Waktu tunggu maksimum dalam milidetik (default: 10000)
 * @returns {Promise} - Hasil dari fungsi yang dijalankan
 */
export const withRateLimitRetry = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
  } = options;

  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      // Cek apakah error adalah 429 (Too Many Requests)
      const isTooManyRequests = 
        error.status === 429 ||
        error.message?.includes('Terlalu banyak permintaan') ||
        error.message?.includes('Too many requests');

      // Jika bukan error 429 atau sudah mencapai batas maksimum retry, lempar error
      if (!isTooManyRequests || retries >= maxRetries) {
        throw error;
      }

      // Tambah jumlah retry
      retries++;

      // Hitung waktu tunggu dengan exponential backoff
      delay = Math.min(delay * 2, maxDelay);

      // Log untuk debugging
      console.log(`Rate limit terlampaui. Mencoba kembali dalam ${delay}ms (percobaan ke-${retries})`);

      // Tunggu sebelum retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Mengecek apakah ada waktu cooldown tersimpan dan apakah sudah berlalu
 * 
 * @param {string} key - Kunci untuk mengidentifikasi operasi
 * @param {number} cooldownMs - Waktu cooldown dalam milidetik
 * @returns {boolean} - true jika masih dalam cooldown, false jika tidak
 */
export const isInCooldown = (key, cooldownMs = 60000) => {
  const cooldownData = localStorage.getItem(`cooldown_${key}`);
  if (!cooldownData) return false;

  const { timestamp } = JSON.parse(cooldownData);
  const now = Date.now();
  
  return now - timestamp < cooldownMs;
};

/**
 * Menyimpan waktu cooldown untuk operasi tertentu
 * 
 * @param {string} key - Kunci untuk mengidentifikasi operasi
 * @param {number} cooldownMs - Waktu cooldown dalam milidetik
 */
export const setCooldown = (key, cooldownMs = 60000) => {
  const cooldownData = JSON.stringify({
    timestamp: Date.now(),
    duration: cooldownMs
  });
  
  localStorage.setItem(`cooldown_${key}`, cooldownData);
};

/**
 * Mendapatkan sisa waktu cooldown dalam detik
 * 
 * @param {string} key - Kunci untuk mengidentifikasi operasi
 * @returns {number} - Sisa waktu cooldown dalam detik, 0 jika tidak dalam cooldown
 */
export const getRemainingCooldown = (key) => {
  const cooldownData = localStorage.getItem(`cooldown_${key}`);
  if (!cooldownData) return 0;

  const { timestamp, duration } = JSON.parse(cooldownData);
  const now = Date.now();
  const elapsed = now - timestamp;
  
  return Math.max(0, Math.ceil((duration - elapsed) / 1000));
}; 