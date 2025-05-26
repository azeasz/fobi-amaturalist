export const formatGeneralData = (data) => {
    return data.map(item => ({
      id: item.id,
      type: 'general',
      title: item.scientific_name,
      description: `${item.class} - ${item.order}`,
      image: item.images?.[0]?.url || '/default-image.jpg',
      images: item.images || [],
      observer: item.observer_name,
      quality: {
        grade: item.grade,
        has_media: item.has_media,
        is_wild: item.is_wild,
        location_accurate: item.location_accurate,
        needs_id: item.needs_id,
        recent_evidence: item.recent_evidence,
        related_evidence: item.related_evidence
      },
      location: {
        latitude: item.latitude,
        longitude: item.longitude
      },
      date: item.tgl_pengamatan,
      count: item.count,
      notes: item.notes,
      fobi_count: item.fobi_count
    }));
  };
  
  export const formatBirdData = (data) => {
    return data.map(item => ({
      id: item.id,
      type: 'bird',
      title: item.nameId,
      description: `${item.nameLat} - ${item.family}`,
      image: item.images?.[0]?.url || '/default-image.jpg',
      images: item.images || [],
      audioUrl: item.sounds?.[0]?.url,
      spectrogram: item.sounds?.[0]?.spectrogram,
      observer: item.observer_name,
      quality: {
        grade: item.grade,
        has_media: item.has_media,
        is_wild: item.is_wild,
        location_accurate: item.location_accurate,
        needs_id: item.needs_id
      },
      location: {
        latitude: item.latitude,
        longitude: item.longitude
      },
      date: item.tgl_pengamatan,
      count: item.count,
      notes: item.notes,
      fobi_count: item.fobi_count,
      burungnesia_count: item.burungnesia_count
    }));
  };
  
  export const formatButterflyData = (data) => {
    return data.map(item => ({
      id: item.id,
      type: 'butterfly',
      title: item.nameId,
      description: `${item.nameLat} - ${item.family}`,
      image: item.images?.[0]?.url || '/default-image.jpg',
      images: item.images || [],
      observer: item.observer_name,
      quality: {
        grade: item.grade,
        has_media: item.has_media,
        is_wild: item.is_wild,
        location_accurate: item.location_accurate,
        needs_id: item.needs_id
      },
      location: {
        latitude: item.latitude,
        longitude: item.longitude
      },
      date: item.tgl_pengamatan,
      count: item.count,
      notes: item.notes,
      fobi_count: item.fobi_count,
      kupunesia_count: item.kupunesia_count
    }));
  };