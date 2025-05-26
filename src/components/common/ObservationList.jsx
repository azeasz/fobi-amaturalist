import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faVideo, faVolumeUp, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

function ObservationList({ observations, source = 'fobi' }) {
    const getObservationUrl = (observation) => {
        switch (source) {
            case 'burungnesia':
                return `/burungnesia/observations/${observation.id}`;
            case 'kupunesia':
                return `/kupunesia/observations/${observation.id}`;
            default:
                return `/observations/${observation.id}`;
        }
    };

    const getMediaIcon = (mediaType) => {
        switch (mediaType) {
            case 'image':
                return faImage;
            case 'video':
                return faVideo;
            case 'audio':
                return faVolumeUp;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            {observations.map(observation => (
                <Link 
                    key={observation.id}
                    to={getObservationUrl(observation)}
                    className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                    <div className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold">
                                    {observation.scientific_name || observation.nameLat}
                                </h3>
                                <p className="text-gray-600">
                                    {observation.common_name || observation.nameId}
                                </p>
                            </div>
                            <div className="flex space-x-2">
                                {observation.media?.map((media, index) => (
                                    <FontAwesomeIcon 
                                        key={index}
                                        icon={getMediaIcon(media.type)}
                                        className="text-gray-500"
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mt-2 text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                                <FontAwesomeIcon icon={faMapMarkerAlt} />
                                <span>{observation.location_name || 'Lokasi tidak tersedia'}</span>
                            </div>
                            <div className="mt-1">
                                Diamati oleh {observation.observer_name} pada{' '}
                                {new Date(observation.created_at).toLocaleDateString('id-ID')}
                            </div>
                        </div>

                        <div className="mt-2 flex space-x-4 text-sm">
                            <span>{observation.identifications_count || 0} identifikasi</span>
                            <span>{observation.agreements_count || 0} persetujuan</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}

export default ObservationList; 