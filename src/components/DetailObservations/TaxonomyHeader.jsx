import React from 'react';

const cleanScientificName = (name) => {
    if (!name) return '';
    return name.split(' ').filter(part => {
        return !(/\d/.test(part) || /[\(\)]/.test(part));
    }).join(' ');
};

const TaxonomyHeader = ({ checklist }) => {
    const getCommonName = (level) => {
        const commonNameField = `cname_${level}`;
        return checklist?.[commonNameField];
    };

    const createTaxaLink = (level, name, id) => {
        if (!name) return null;
        const commonName = getCommonName(level);
        
        if (['genus', 'species'].includes(level) && id) {
            return (
                <a 
                    href={`/${level}/${id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-[#1a73e8] hover:underline transition-colors"
                >
                    <span className="italic">{cleanScientificName(name)}</span>
                    {commonName && <span className="text-gray-300 text-sm ml-2 not-italic hidden">({commonName})</span>}
                    {/* hide common name for now */}
                </a>
            );
        }
        return (
            <span 
                className={`${['family', 'genus', 'species', 'subspecies', 'variety', 'form', 'subform'].includes(level) ? 'italic' : ''} cursor-help`}
                title={`Halaman taksonomi untuk ${name} sedang dalam pengembangan`}
            >
                {cleanScientificName(name)}
                {commonName && <span className="text-gray-300 text-sm ml-2 not-italic hidden">({commonName})</span>}
                {/* hide common name for now */}
            </span>
        );
    };

    // Fungsi untuk mendapatkan taksonomi dengan prioritas
    const getBestTaxonomyLevel = () => {
        // Daftar level taksonomi dari yang paling spesifik ke paling umum
        const taxonomyLevels = [
            'subform',
            'form',
            'variety',
            'subspecies',
            'species',
            'subgenus',
            'genus',
            'subtribe',
            'tribe',
            'supertribe',
            'subfamily',
            'family',
            'superfamily',
            'infraorder',
            'suborder',
            'order',
            'superorder',
            'infraclass',
            'subclass',
            'class',
            'superclass',
            'subdivision',
            'division',
            'superdivision',
            'subphylum',
            'phylum',
            'superphylum',
            'subkingdom',
            'kingdom',
            'superkingdom',
            'domain'
        ];

        // Kasus khusus untuk division/phylum
        // Jika phylum kosong tapi division ada, gunakan division sebagai phylum
        if (!checklist?.phylum && checklist?.division) {
            return {
                level: 'phylum',
                name: checklist.division,
                id: checklist?.taxa_id
            };
        }

        // Periksa semua level taksonomi
        for (const level of taxonomyLevels) {
            if (checklist?.[level]) {
                return {
                    level,
                    name: checklist[level],
                    id: checklist?.taxa_id
                };
            }
        }

        return null;
    };

    const bestTaxonomy = getBestTaxonomyLevel();
    
    if (bestTaxonomy) {
        return createTaxaLink(bestTaxonomy.level, bestTaxonomy.name, bestTaxonomy.id);
    }

    return 'Belum teridentifikasi';
};

export default TaxonomyHeader; 