export const formatDate = (dateString) => {
  if (!dateString) return 'No Date';
  
  try {
    const date = new Date(dateString);
    
    // Cek apakah tanggal valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Format: DD/MM/YYYY
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}; 