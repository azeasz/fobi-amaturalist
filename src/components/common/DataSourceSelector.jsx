import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDove, faLeaf, faBinoculars } from '@fortawesome/free-solid-svg-icons';

function DataSourceSelector({ selectedSource, onSourceChange, className = '' }) {
    const sources = [
        { id: 'fobi', label: 'FOBi', icon: faBinoculars },
        { id: 'burungnesia', label: 'Burungnesia', icon: faDove },
        { id: 'kupunesia', label: 'Kupunesia', icon: faLeaf }
    ];

    return (
        <div className={`flex gap-2 ${className}`}>
            {sources.map(source => (
                <button
                    key={source.id}
                    onClick={() => onSourceChange(source.id)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors
                        ${selectedSource === source.id 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    <FontAwesomeIcon icon={source.icon} className="mr-2" />
                    {source.label}
                </button>
            ))}
        </div>
    );
}

export default DataSourceSelector; 