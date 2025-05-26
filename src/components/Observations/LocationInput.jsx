import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

function LocationInput({ locationName, latitude, longitude, onTrigger }) {
    const handleClick = () => {
        onTrigger({
            latitude: latitude || null,
            longitude: longitude || null,
            locationName: locationName || ''
        });
    };

    return (
        <button
            onClick={handleClick}
            className="w-full border border-[#444] p-3 rounded-lg bg-[#2c2c2c] hover:border-[#1a73e8] transition-colors flex items-center justify-between text-left"
        >
            <div className="flex-1">
                <div className="text-[#e0e0e0]">{locationName || 'Pilih lokasi'}</div>
                <div className="text-xs text-gray-400">
                    {latitude && longitude ? `Lat: ${latitude}, Lng: ${longitude}` : 'Lat: -, Lng: -'}
                </div>
            </div>
            <FontAwesomeIcon 
                icon={faMapMarkerAlt} 
                className="text-[#1a73e8] ml-3 h-5 w-5" 
            />
        </button>
    );
}

export default LocationInput;