import React from 'react';

const TAXONOMY_LEVELS = [
  { key: 'kingdom', label: 'Kingdom' },
  { key: 'superphylum', label: 'Superphylum' },
  { key: 'phylum', label: 'Phylum' },
  { key: 'subphylum', label: 'Subphylum' },
  { key: 'superclass', label: 'Superclass' },
  { key: 'class', label: 'Class' },
  { key: 'subclass', label: 'Subclass' },
  { key: 'superorder', label: 'Superorder' },
  { key: 'order', label: 'Order' },
  { key: 'suborder', label: 'Suborder' },
  { key: 'superfamily', label: 'Superfamily' },
  { key: 'family', label: 'Family' },
  { key: 'subfamily', label: 'Subfamily' },
  { key: 'tribe', label: 'Tribe' },
  { key: 'subtribe', label: 'Subtribe' },
  { key: 'genus', label: 'Genus' },
  { key: 'subgenus', label: 'Subgenus' },
  { key: 'species', label: 'Species' },
  { key: 'subspecies', label: 'Subspecies' },
  { key: 'variety', label: 'Variety' },
  { key: 'subvariety', label: 'Subvariety' },
  { key: 'form', label: 'Form' },
  { key: 'subform', label: 'Subform' }
];

const TaxonomySuggestion = ({ taxon, onSelect }) => {
  // Find highest available level
  const getHighestLevel = (taxon) => {
    for (const {key, label} of TAXONOMY_LEVELS) {
      if (taxon[key]) {
        return {
          level: key,
          value: taxon[key],
          label: label
        };
      }
    }
    return null;
  };

  // Get all available levels
  const getAvailableLevels = (taxon) => {
    return TAXONOMY_LEVELS.filter(({key}) => taxon[key])
      .map(({key, label}) => ({
        level: key,
        value: taxon[key],
        label: label
      }));
  };

  const availableLevels = getAvailableLevels(taxon);
  
  return (
    <div className="p-2 hover:bg-gray-100 cursor-pointer border-b">
      <div className="flex justify-between">
        <div>
          {availableLevels.map(({level, value, label}) => (
            <div
              key={level}
              onClick={() => onSelect({
                ...taxon,
                selected_level: level,
                selected_value: value
              })}
              className={`${level === 'species' ? 'italic' : ''} hover:text-blue-600`}
            >
              <span>{value}</span>
              {taxon.common_name && level === 'species' && 
                <span className="ml-2">| {taxon.common_name}</span>
              }
              <span className="text-sm text-gray-500 ml-2">({label})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaxonomySuggestion;