const BASE_URL = 'http://localhost:8000/api';

// Fungsi untuk mengirim identifikasi baru
export const submitIdentification = async (checklistId, formData) => {
  try {
    const response = await fetch(`${BASE_URL}/observations/${checklistId}/identifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Gagal menambahkan identifikasi');
    }

    return response.json();
  } catch (error) {
    console.error('Error submitting identification:', error);
    throw error;
  }
};

// Fungsi untuk menyetujui identifikasi
export const agreeWithIdentification = async (checklistId, identificationId) => {
  try {
    const response = await fetch(`${BASE_URL}/observations/${checklistId}/identifications/${identificationId}/agree`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Gagal menyetujui identifikasi');
    }

    return response.json();
  } catch (error) {
    console.error('Error agreeing with identification:', error);
    throw error;
  }
};

// Fungsi untuk membatalkan persetujuan
export const cancelAgreement = async (checklistId, identificationId) => {
  try {
    const response = await fetch(`${BASE_URL}/observations/${checklistId}/identifications/${identificationId}/cancel-agreement`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Gagal membatalkan persetujuan');
    }

    return response.json();
  } catch (error) {
    console.error('Error canceling agreement:', error);
    throw error;
  }
};

// Fungsi untuk menolak identifikasi
export const disagreeWithIdentification = async (checklistId, identificationId, data) => {
  try {
    const formData = new FormData();
    if (data.comment) formData.append('comment', data.comment);
    if (data.taxon_id) formData.append('taxon_id', data.taxon_id);
    if (data.identification_level) formData.append('identification_level', data.identification_level);
    if (data.photo) formData.append('photo', data.photo);

    const response = await fetch(`${BASE_URL}/observations/${checklistId}/identifications/${identificationId}/disagree`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Gagal menolak identifikasi');
    }

    return response.json();
  } catch (error) {
    console.error('Error disagreeing with identification:', error);
    throw error;
  }
};