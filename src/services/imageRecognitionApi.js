import { apiFetch } from '../utils/api';

/**
 * Mengirimkan gambar ke API lokal untuk diproses oleh model AI
 * @param {File} imageFile - File gambar yang akan diproses
 * @returns {Promise} Promise berisi hasil prediksi
 */
export const predictImage = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await apiFetch('/image-recognition/predict', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Gagal menganalisis gambar');
    }

    return response.json();
  } catch (error) {
    console.error('Error predicting image:', error);
    throw error;
  }
};

/**
 * Mendapatkan informasi detail taksonomi dari GBIF berdasarkan nama spesies
 * @param {string} scientificName - Nama ilmiah spesies
 * @returns {Promise} Promise berisi data taksonomi
 */
export const fetchGbifSpeciesInfo = async (scientificName) => {
  try {
    // Pertama coba match dengan nama ilmiah yang tepat
    const matchResponse = await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}`);
    
    if (!matchResponse.ok) {
      throw new Error(`HTTP error! status: ${matchResponse.status}`);
    }
    
    const matchData = await matchResponse.json();
    
    // Jika tidak ditemukan kecocokan atau kecocokan tidak sempurna
    if (matchData.matchType === 'NONE' || !matchData.usageKey) {
      // Coba pencarian untuk mendapatkan beberapa kemungkinan
      const searchResponse = await fetch(`https://api.gbif.org/v1/species/search?q=${encodeURIComponent(scientificName)}&limit=5`);
      
      if (!searchResponse.ok) {
        throw new Error(`HTTP error! status: ${searchResponse.status}`);
      }
      
      const searchData = await searchResponse.json();
      return {
        exact: false,
        results: searchData.results || []
      };
    }
    
    // Jika ada kecocokan yang tepat, dapatkan informasi lebih detail
    const taxonKey = matchData.usageKey;
    const detailResponse = await fetch(`https://api.gbif.org/v1/species/${taxonKey}`);
    
    if (!detailResponse.ok) {
      throw new Error(`HTTP error! status: ${detailResponse.status}`);
    }
    
    const detailData = await detailResponse.json();
    
    return {
      exact: true,
      result: {
        ...detailData,
        matchType: matchData.matchType
      }
    };
  } catch (error) {
    console.error('Error fetching GBIF species info:', error);
    throw error;
  }
};

/**
 * Mendapatkan gambar spesies dari GBIF Media API
 * @param {number} taxonKey - ID Takson GBIF
 * @returns {Promise} Promise berisi URL gambar
 */
export const fetchGbifSpeciesImages = async (taxonKey) => {
  try {
    if (!taxonKey) return [];
    
    const response = await fetch(`https://api.gbif.org/v1/species/${taxonKey}/media?limit=5`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching GBIF species images:', error);
    return [];
  }
};

/**
 * Mendapatkan data distribusi spesies dari GBIF
 * @param {number} taxonKey - ID Takson GBIF
 * @returns {Promise} Promise berisi data distribusi
 */
export const fetchGbifDistribution = async (taxonKey) => {
  try {
    if (!taxonKey) return [];
    
    const response = await fetch(`https://api.gbif.org/v1/species/${taxonKey}/distributions`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching GBIF distribution:', error);
    return [];
  }
};

/**
 * Mendapatkan semua informasi spesies dari takson ID
 * @param {number} taxonKey - ID Takson GBIF 
 * @returns {Promise} Promise berisi semua data yang dibutuhkan
 */
export const fetchCompleteSpeciesInfo = async (taxonKey) => {
  try {
    if (!taxonKey) return null;
    
    const [detailResponse, imagesResponse, distributionResponse] = await Promise.all([
      fetch(`https://api.gbif.org/v1/species/${taxonKey}`),
      fetch(`https://api.gbif.org/v1/species/${taxonKey}/media?limit=5`),
      fetch(`https://api.gbif.org/v1/species/${taxonKey}/distributions`)
    ]);
    
    if (!detailResponse.ok || !imagesResponse.ok || !distributionResponse.ok) {
      throw new Error('Gagal mendapatkan informasi lengkap spesies');
    }
    
    const [details, images, distribution] = await Promise.all([
      detailResponse.json(),
      imagesResponse.json(),
      distributionResponse.json()
    ]);
    
    return {
      details,
      images: images.results || [],
      distribution: distribution || []
    };
  } catch (error) {
    console.error('Error fetching complete species info:', error);
    return null;
  }
};

/**
 * Mengambil prediksi dan mengkonversi data untuk digunakan di aplikasi
 * @param {File} imageFile - File gambar untuk dianalisis
 * @returns {Promise} Promise berisi hasil prediksi dengan struktur yang sesuai
 */
export const getImagePredictionWithTaxonomyInfo = async (imageFile) => {
  try {
    // 1. Prediksi gambar menggunakan model lokal
    const predictions = await predictImage(imageFile);
    
    if (!predictions || !predictions.results || predictions.results.length === 0) {
      return { success: false, message: 'Tidak ada prediksi yang ditemukan' };
    }
    
    // 2. Ambil data dari GBIF untuk semua prediksi teratas (maksimal 5)
    const topPredictions = predictions.results.slice(0, 5);
    
    const predictionResults = await Promise.all(
      topPredictions.map(async (prediction) => {
        try {
          const gbifData = await fetchGbifSpeciesInfo(prediction.scientific_name);
          let taxonKey = null;
          let resultData = null;
          
          if (gbifData.exact && gbifData.result) {
            taxonKey = gbifData.result.key || gbifData.result.usageKey;
            resultData = gbifData.result;
          } else if (gbifData.results && gbifData.results.length > 0) {
            // Ambil hasil pertama jika tidak ada kecocokan yang tepat
            taxonKey = gbifData.results[0].key || gbifData.results[0].usageKey;
            resultData = gbifData.results[0];
          }
          
          // Jika tidak ada taxon key, kembalikan data dasar
          if (!taxonKey) {
            return {
              success: true,
              scientific_name: prediction.scientific_name,
              confidence: prediction.confidence,
              rank: 'unknown',
              gbif_id: null,
              images: [],
              taxonomyData: null
            };
          }
          
          // Dapatkan gambar jika ada taxon key
          const images = await fetchGbifSpeciesImages(taxonKey);
          
          return {
            success: true,
            scientific_name: prediction.scientific_name,
            confidence: prediction.confidence,
            rank: resultData.rank || 'unknown',
            gbif_id: taxonKey,
            kingdom: resultData.kingdom,
            phylum: resultData.phylum,
            class: resultData.class,
            order: resultData.order,
            family: resultData.family,
            genus: resultData.genus,
            species: resultData.species,
            images: images.map(img => img.identifier),
            taxonomyData: resultData
          };
        } catch (error) {
          console.error(`Error fetching data for ${prediction.scientific_name}:`, error);
          return {
            success: true,
            scientific_name: prediction.scientific_name,
            confidence: prediction.confidence,
            rank: 'unknown',
            gbif_id: null,
            images: [],
            error: true
          };
        }
      })
    );
    
    return { success: true, results: predictionResults };
  } catch (error) {
    console.error('Error in image prediction process:', error);
    return { success: false, message: error.message || 'Terjadi kesalahan saat memproses gambar' };
  }
}; 