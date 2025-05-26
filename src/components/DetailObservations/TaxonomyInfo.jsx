import React from 'react';

const cleanScientificName = (name) => {
    if (!name) return '';
    return name.split(' ').filter(part => {
        return !(/\d/.test(part) || /[\(\)]/.test(part));
    }).join(' ');
};

const TaxonomyInfo = ({ checklist }) => {
    const taxonomyLevels = [
        { key: 'family', label: 'Family' }
        // { key: 'order', label: 'Ordo' },
        // { key: 'class', label: 'Kelas' },
        // { key: 'phylum', label: 'Filum' },
        // { key: 'kingdom', label: 'Kingdom' },
        // { key: 'subkingdom', label: 'Subkingdom' },
        // { key: 'superkingdom', label: 'Superkingdom' },
        // { key: 'superphylum', label: 'Superfilum' },
        // { key: 'division', label: 'Divisi' },
        // { key: 'superdivision', label: 'Superdivisi' },
        // { key: 'subclass', label: 'Subkelas' },
        // { key: 'infraclass', label: 'Infrakelas' },
        // { key: 'suborder', label: 'Subordo' },
        // { key: 'superorder', label: 'Superordo' },
        // { key: 'infraorder', label: 'Infraordo' },
        // { key: 'superfamily', label: 'Superfamili' },
        // { key: 'subfamily', label: 'Subfamili' },
        // { key: 'tribe', label: 'Tribe' }
    ];

    const renderTaxonInfo = (key, label, value, commonName) => {
        if (['genus', 'species'].includes(key) && checklist?.taxa_id) {
            return (
                <div key={key}>
                    <span>{label}: </span>
                    <a 
                        href={`/${key}/${checklist.taxa_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#1a73e8] hover:underline transition-colors"
                    >
                        <span className="italic">{cleanScientificName(value)}</span>
                        {commonName && <span className="ml-2">({commonName})</span>}
                    </a>
                </div>
            );
        }

        return (
            <div key={key}>
                <span>{label}: </span>
                <span 
                    className="italic cursor-help" 
                    title="Halaman taksonomi sedang dalam pengembangan"
                >
                    {cleanScientificName(value)}
                    {commonName && <span className="ml-2">({commonName})</span>}
                </span>
            </div>
        );
    };

    return (
        <>
            {taxonomyLevels.map(({ key, label }) => 
                checklist?.[key] && renderTaxonInfo(
                    key,
                    label,
                    checklist[key],
                    checklist[`cname_${key}`]
                )
            )}
        </>
    );
};

export default TaxonomyInfo; 