import React from 'react';
import ChecklistMapBurkup from './ChecklistMapBurkup';

function LocationDetail({ latitude, longitude, locationName }) {
    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Lokasi</h2>
            <div className="mb-4">
                <ChecklistMapBurkup
                    latitude={latitude}
                    longitude={longitude}
                    locationName={locationName}
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                    {locationName}
                </p>
            </div>
        </div>
    );
}

export default LocationDetail;
