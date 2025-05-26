import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCheck, 
    faTimes, 
    faQuestionCircle,
    faImage,
    faCalendar,
    faMapMarkerAlt,
    faLeaf,
    faCrosshairs,
    faClipboardCheck
} from '@fortawesome/free-solid-svg-icons';

function QualityAssessment({ checklist, qualityAssessment }) {
    const criteria = [
        {
            key: 'has_media',
            label: 'Memiliki Media',
            icon: faImage,
            description: 'Observasi memiliki foto atau suara'
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
            icon: faLeaf,
            description: 'Spesimen adalah individu liar'
        },
        {
            key: 'location_accurate',
            label: 'Lokasi Akurat',
            icon: faCrosshairs,
            description: 'Lokasi pengamatan akurat'
        },
        {
            key: 'needs_id',
            label: 'Perlu Identifikasi',
            icon: faQuestionCircle,
            description: 'Memerlukan bantuan identifikasi'
        }
    ];

    const getQualityBadgeColor = (grade) => {
        switch (grade) {
            case 'research grade':
                return 'bg-green-100 text-green-800';
            case 'needs ID':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Penilaian Kualitas Data</h2>
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getQualityBadgeColor(qualityAssessment?.grade)}`}>
                    {qualityAssessment?.grade || 'Belum dinilai'}
                </div>
            </div>

            <div className="space-y-4">
                {criteria.map((criterion) => (
                    <div key={criterion.key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <FontAwesomeIcon icon={criterion.icon} className="text-gray-500" />
                            <div>
                                <p className="font-medium">{criterion.label}</p>
                                <p className="text-sm text-gray-500">{criterion.description}</p>
                            </div>
                        </div>
                        <FontAwesomeIcon
                            icon={qualityAssessment?.[criterion.key] ? faCheck : faTimes}
                            className={qualityAssessment?.[criterion.key] ? 'text-green-500' : 'text-red-500'}
                        />
                    </div>
                ))}
            </div>

            {qualityAssessment?.can_be_improved && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 mb-2">Saran Peningkatan</h3>
                    <p className="text-yellow-700">{qualityAssessment.can_be_improved}</p>
                </div>
            )}
        </div>
    );
}

export default QualityAssessment;