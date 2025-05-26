import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faMusic, faMapMarkerAlt, faUser, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const ObservationCard = ({ observation, dataType }) => {
    const formatDate = (dateString) => {
        return format(new Date(dateString), 'd MMMM yyyy', { locale: id });
    };

    const getSourceCount = () => {
        switch(dataType) {
            case 'birds':
                return {
                    fobi: observation.fobi_count,
                    platform: observation.burungnesia_count,
                    platformName: 'Burungnesia'
                };
            case 'butterflies':
                return {
                    fobi: observation.fobi_count,
                    platform: observation.kupunesia_count,
                    platformName: 'Kupunesia'
                };
            default:
                return {
                    fobi: observation.fobi_count,
                    platform: 0,
                    platformName: 'FOBI'
                };
        }
    };

    const sourceCount = getSourceCount();

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Media Preview */}
            <div className="relative h-48">
                {observation.images && observation.images.length > 0 ? (
                    <img
                        src={observation.images[0].url}
                        alt={observation.scientific_name || observation.nameLat}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <FontAwesomeIcon icon={faImage} className="text-gray-400 text-4xl" />
                    </div>
                )}
                {observation.audioUrl && (
                    <div className="absolute bottom-2 right-2">
                        <FontAwesomeIcon icon={faMusic} className="text-white bg-black bg-opacity-50 p-2 rounded" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Species Name */}
                <h3 className="text-lg font-semibold mb-2">
                    {observation.scientific_name || observation.nameLat}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                    {observation.genus || observation.family}
                </p>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={faUser} className="mr-2" />
                        {observation.observer_name}
                    </div>
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={faCalendar} className="mr-2" />
                        {formatDate(observation.created_at)}
                    </div>
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                        {observation.latitude.toFixed(3)}, {observation.longitude.toFixed(3)}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center text-sm">
                    <div className="flex gap-4">
                        <span className="text-blue-600">
                            FOBI: {sourceCount.fobi}
                        </span>
                        <span className="text-green-600">
                            {sourceCount.platformName}: {sourceCount.platform}
                        </span>
                    </div>
                    <div className={`px-2 py-1 rounded text-white ${
                        observation.grade === 'research' ? 'bg-green-500' :
                        observation.grade === 'needs_id' ? 'bg-yellow-500' :
                        'bg-gray-500'
                    }`}>
                        {observation.grade === 'research' ? 'Research Grade' :
                         observation.grade === 'needs_id' ? 'Needs ID' :
                         'Casual'}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ObservationList = ({ observations, dataType }) => {
    if (!observations || observations.length === 0) {
        return (
            <div className="text-center py-8 text-gray-600">
                Tidak ada data observasi yang ditemukan
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {observations.map((observation) => (
                <ObservationCard
                    key={observation.id}
                    observation={observation}
                    dataType={dataType}
                />
            ))}
        </div>
    );
};

export default ObservationList;