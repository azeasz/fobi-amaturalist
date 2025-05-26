export const normalizeObservationData = (data, source = 'fobi') => {
    switch(source) {
        case 'burungnesia':
            return {
                ...data,
                scientific_name: data.nameLat,
                common_name: data.nameId,
                taxa_id: data.fauna_id, // untuk kompatibilitas dengan komponen yang ada
                quality_grade: calculateQualityGrade(data.identifications),
                media: normalizeMedia(data.media, source)
            };
            
        case 'kupunesia':
            return {
                ...data,
                scientific_name: data.nameLat,
                common_name: data.nameId,
                taxa_id: data.fauna_id,
                quality_grade: calculateQualityGrade(data.identifications),
                media: normalizeMedia(data.media, source)
            };
            
        default: // fobi
            return data;
    }
};

export const normalizeIdentificationData = (identification, source = 'fobi') => {
    switch(source) {
        case 'burungnesia':
        case 'kupunesia':
            return {
                ...identification,
                scientific_name: identification.nameLat,
                common_name: identification.nameId,
                taxa_id: identification.fauna_id,
                identifier: {
                    name: identification.identifier_name,
                    joined_date: identification.identifier_joined_date,
                    identification_count: identification.identifier_identification_count
                }
            };
            
        default:
            return identification;
    }
};

const calculateQualityGrade = (identifications) => {
    const agreementCount = identifications?.reduce((sum, ident) => 
        sum + (ident.agreement_count || 0), 0) || 0;

    if (agreementCount >= 2) return 'research grade';
    if (agreementCount === 1) return 'low quality ID';
    return 'needs ID';
};

const normalizeMedia = (media, source) => {
    return media.map(item => ({
        ...item,
        url: item.url,
        type: item.media_type || item.type,
        spectrogram_url: item.spectrogram_url || null
    }));
}; 