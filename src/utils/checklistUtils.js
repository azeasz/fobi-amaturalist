import { apiFetch } from './api';

// Fungsi untuk mengambil detail checklist
export const fetchChecklistDetail = async (id) => {
  try {
    const response = await apiFetch(`/observations/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      }
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Gagal memuat data checklist');
    }

    return {
      checklist: {
        ...data.data.checklist,
        quality_grade: data.data.checklist.grade,
        iucn_status: data.data.checklist.iucn_status,
        agreement_count: data.data.checklist.agreement_count
      },
      identifications: data.data.identifications.map(identification => ({
        ...identification,
        agreement_count: identification.agreement_count || 0,
        user_agreed: identification.user_agreed || false
      })),
      locationVerifications: data.data.location_verifications,
      wildStatusVotes: data.data.wild_status_votes
    };
  } catch (error) {
    console.error('Error fetching checklist detail:', error);
    throw new Error('Terjadi kesalahan saat memuat data');
  }
};

// Fungsi untuk mencari taxa
export const searchTaxa = async (query) => {
  if (query.length < 3) return [];

  try {
    const response = await apiFetch(`/taxa/search?q=${query}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      }
    });

    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error searching taxa:', error);
    return [];
  }
};

// Fungsi untuk menangani identifikasi
export const handleIdentification = async (id, identificationId, action, payload = {}) => {
  try {
    const endpoint = `/observations/${id}/identifications/${identificationId}/${action}`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      }
    };

    if (payload instanceof FormData) {
      options.body = payload;
    } else if (Object.keys(payload).length > 0) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }

    const response = await apiFetch(endpoint, options);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Terjadi kesalahan');
    }

    return data.data;
  } catch (error) {
    console.error(`Error handling identification ${action}:`, error);
    throw error;
  }
};

// Fungsi untuk mendapatkan nama lokasi
export const getLocationName = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    return data.display_name;
  } catch (error) {
    console.error('Error fetching location name:', error);
    return 'Gagal memuat nama lokasi';
  }
};

// Fungsi untuk memperbarui status improvement
export const updateImprovementStatus = async (id, canImprove) => {
  try {
    const response = await apiFetch(`/observations/${id}/improvement-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
      body: JSON.stringify({ can_be_improved: canImprove })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Gagal memperbarui status improvement');
    }

    return data.data;
  } catch (error) {
    console.error('Error updating improvement status:', error);
    throw error;
  }
};