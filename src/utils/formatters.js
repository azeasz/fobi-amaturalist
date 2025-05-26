export const getGradeDisplay = (grade) => {
    switch(grade.toLowerCase()) {
      case 'research grade':
        return 'ID Lengkap';
      case 'needs id':
        return 'Bantu Iden';
      case 'low quality id':
        return 'ID Kurang';
      default:
        return 'Casual';
    }
  };
  
  export const getGradeColor = (grade) => {
    switch(grade.toLowerCase()) {
      case 'research grade':
        return 'bg-green-500/70';
      case 'needs id':
        return 'bg-yellow-500/70';
      case 'low quality id':
        return 'bg-orange-500/70';
      default:
        return 'bg-gray-500/70';
    }
  };
  
  export const getDefaultImage = (source) => {
    switch(source) {
      case 'burungnesia':
        return '/assets/icon/default-bird.png';
      case 'kupunesia':
        return '/assets/icon/default-butterfly.png';
      default:
        return '/assets/icon/default-observation.png';
    }
  };
  
  export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };