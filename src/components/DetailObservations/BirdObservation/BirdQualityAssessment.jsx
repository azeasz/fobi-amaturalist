import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

function BirdQualityAssessment({ checklist }) {
    const assessments = [
        {
            id: 'has_photo',
            label: 'Memiliki Foto',
            value: checklist.media && checklist.media.length > 0,
            description: 'Observasi dilengkapi dengan foto burung'
        },
        {
            id: 'has_location',
            label: 'Memiliki Lokasi',
            value: !!checklist.location_name,
            description: 'Lokasi pengamatan tercatat'
        },
        {
            id: 'has_date',
            label: 'Memiliki Tanggal',
            value: !!checklist.observation_date,
            description: 'Tanggal pengamatan tercatat'
        },
        {
            id: 'has_identification',
            label: 'Memiliki Identifikasi',
            value: checklist.identifications && checklist.identifications.length > 0,
            description: 'Setidaknya satu identifikasi telah diberikan'
        },
        {
            id: 'has_agreement',
            label: 'Memiliki Persetujuan',
            value: checklist.identifications && checklist.identifications.some(id => id.agreement_count > 0),
            description: 'Setidaknya satu identifikasi telah disetujui'
        }
    ];

    const score = assessments.filter(a => a.value).length;
    const maxScore = assessments.length;
    const percentage = (score / maxScore) * 100;

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Kualitas Observasi</h3>
            
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Skor: {score}/{maxScore}</span>
                    <span className="text-sm font-medium">{percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>

            <div className="space-y-3">
                {assessments.map(assessment => (
                    <div key={assessment.id} className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5">
                            <FontAwesomeIcon 
                                icon={assessment.value ? faCheckCircle : faTimesCircle}
                                className={assessment.value ? 'text-green-500' : 'text-red-500'}
                            />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium">{assessment.label}</p>
                            <p className="text-xs text-gray-500">{assessment.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BirdQualityAssessment; 