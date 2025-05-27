// Mengimpor utility untuk menangani rate limiting
import { withRateLimitRetry, setCooldown } from './rateLimiting';

// Fungsi helper untuk menangani response
const handleResponse = async (response) => {
  if (!response.ok) {
    // Penanganan status error yang berbeda
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    
    // Tangani error 429 (Too Many Requests) secara khusus
    if (response.status === 429) {
      // Set cooldown untuk endpoint ini
      const path = new URL(response.url).pathname;
      const endpoint = path.replace('/api', '');
      setCooldown(endpoint, 60000); // 1 menit cooldown
      
      const errorData = await response.json();
      const error = new Error(errorData.message || 'Terlalu banyak permintaan. Silakan coba lagi nanti.');
      error.status = 429;
      throw error;
    }
    
    // Tangani error 409 (Conflict) secara khusus
    if (response.status === 409) {
      const errorData = await response.json();
      const error = new Error(errorData.message || 'Terjadi konflik data');
      error.status = 409;
      error.data = errorData;
      error.response = { status: 409, data: errorData };
      throw error;
    }
    
    // Untuk error lainnya
    try {
      const errorData = await response.json();
      const error = new Error(errorData.message || 'Terjadi kesalahan');
      error.status = response.status;
      error.data = errorData;
      throw error;
    } catch (e) {
      // Jika tidak bisa parse JSON
      const error = new Error('Terjadi kesalahan pada server');
      error.status = response.status;
      throw error;
    }
  }
  return response;
};

// Fungsi utama untuk melakukan request API
export const apiFetch = async (endpoint, options = {}, customHeaders = {}) => {
  // Base URL berdasarkan environment
  const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
    ? 'https://amaturalist.com/api'  // Production URL
    : 'http://localhost:8000/api'; // Development URL
    
  const token = localStorage.getItem('jwt_token');

  const defaultHeaders = {
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...customHeaders
  };

  // Jika ada body dalam format FormData, jangan set Content-Type
  if (!(options?.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers
    }
  };

  // Gunakan withRateLimitRetry untuk menangani rate limiting
  return withRateLimitRetry(async () => {
    try {
      const response = await fetch(`${baseURL}${endpoint}`, config);
      return handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      // Pastikan error tidak menyebabkan logout jika bukan 401
      if (error.message.includes('Terlalu banyak permintaan') || 
          error.message.includes('Too many requests') ||
          error.status === 429) {
        // Re-throw error untuk ditangani oleh withRateLimitRetry
        throw error;
      }
      throw error;
    }
  }, {
    // Opsi untuk withRateLimitRetry
    maxRetries: 2,              // Maksimal 2 kali percobaan ulang
    initialDelay: 1000,         // Mulai dengan delay 1 detik
    maxDelay: 5000              // Maksimal delay 5 detik
  });
};