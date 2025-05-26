import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCheck, 
    faTimes, 
    faQuestionCircle,
    faImage,
    faCalendar,
    faMapMarkerAlt,
    faDove,
    faCrosshairs,
    faClipboardCheck,
    faCamera,
    faVolumeUp,
    faComment
} from '@fortawesome/free-solid-svg-icons';

function BurungnesiaQualityAssessment({ checklist, qualityAssessment }) {
    const criteria = [
        {
            key: 'has_photo',
            label: 'Memiliki Foto',
            icon: faCamera,
            description: 'Observasi memiliki foto burung'
        },
        {
            key: 'has_sound',
            label: 'Memiliki Suara',
            icon: faVolumeUp,
            description: 'Observasi memiliki rekaman suara burung'
        },
        {
            key: 'has_date',
            label: 'Memiliki Tanggal',
            icon: faCalendar,
            description: 'Tanggal pengamatan tercatat'
        },
        {
            key: 'has_location',
            label: 'Memiliki Lokasi',
            icon: faMapMarkerAlt,
            description: 'Lokasi pengamatan tercatat'
        },
        {
            key: 'is_wild',
            label: 'Status Liar',
            icon: faDove,
            description: 'Burung yang diamati adalah individu liar'
        },
        {
            key: 'location_accurate',
            label: 'Lokasi Akurat',
            icon: faCrosshairs,
            description: 'Lokasi pengamatan sesuai dengan habitat burung'
        },
        {
            key: 'species_identified',
            label: 'Teridentifikasi',
            icon: faClipboardCheck,
            description: 'Spesies burung telah teridentifikasi dengan benar'
        },
        {
            key: 'needs_verification',
            label: 'Perlu Verifikasi',
            icon: faQuestionCircle,
            description: 'Memerlukan verifikasi dari ahli burung'
        }
    ];

    const getQualityBadgeColor = (grade) => {
        switch (grade?.toLowerCase()) {
            case 'research grade':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'needs id':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'casual':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getQualityScore = () => {
        let score = 0;
        criteria.forEach(criterion => {
            if (qualityAssessment?.[criterion.key]) {
                score += 1;
            }
        });
        return Math.round((score / criteria.length) * 100);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Penilaian Kualitas Data Burung</h2>
                <div className="flex items-center space-x-4">
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold border ${getQualityBadgeColor(qualityAssessment?.grade)}`}>
                        {qualityAssessment?.grade || 'Belum dinilai'}
                    </div>
                    <div className="text-sm text-gray-600">
                        Skor: {getQualityScore()}%
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {criteria.map((criterion) => (
                    <div key={criterion.key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${qualityAssessment?.[criterion.key] ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <FontAwesomeIcon 
                                    icon={criterion.icon} 
                                    className={qualityAssessment?.[criterion.key] ? 'text-green-600' : 'text-gray-400'} 
                                />
                            </div>
                            <div>
                                <p className="font-medium">{criterion.label}</p>
                                <p className="text-sm text-gray-500">{criterion.description}</p>
                            </div>
                        </div>
                        <FontAwesomeIcon
                            icon={qualityAssessment?.[criterion.key] ? faCheck : faTimes}
                            className={`text-lg ${qualityAssessment?.[criterion.key] ? 'text-green-500' : 'text-red-500'}`}
                        />
                    </div>
                ))}
            </div>

            {qualityAssessment?.improvement_suggestions && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h3 className="font-semibold text-blue-800 mb-2">Saran Peningkatan Kualitas</h3>
                    <ul className="list-disc list-inside text-blue-700 space-y-1">
                        {qualityAssessment.improvement_suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                        ))}
                    </ul>
                </div>
            )}

            {qualityAssessment?.expert_notes && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                    <h3 className="font-semibold text-yellow-800 mb-2">Catatan Ahli Burung</h3>
                    <p className="text-yellow-700">{qualityAssessment.expert_notes}</p>
                </div>
            )}
        </div>
    );
}

export default BurungnesiaQualityAssessment; 