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
                    {commonName && <span className="text-gray-300 text-sm ml-2 not-italic">({commonName})</span>}
                </a>
            );
        }
        return (
            <span 
                className={`${level === 'family' ? 'italic' : ''} cursor-help`}
                title={`Halaman taksonomi untuk ${name} sedang dalam pengembangan`}
            >
                {cleanScientificName(name)}
                {commonName && <span className="text-gray-300 text-sm ml-2 not-italic">({commonName})</span>}
            </span>
        );
    };

    const taxonomyLevels = [
        'species', 'genus', 'family', 'order', 'class', 
        'phylum', 'kingdom', 'superkingdom', 'domain',
        'subkingdom', 'superphylum', 'division', 'superdivision',
        'subclass', 'infraclass', 'suborder', 'superorder',
        'infraorder', 'superfamily', 'subfamily', 'tribe',
        'subtribe', 'subgenus', 'form', 'variety'
    ];

    for (const level of taxonomyLevels) {
        if (checklist?.[level]) {
            return createTaxaLink(level, checklist[level], checklist?.taxa_id);
        }
    }

    return 'Belum teridentifikasi';
};

export default TaxonomyHeader; 