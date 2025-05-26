import React from 'react';
import BaseObservationDetail from '../BaseObservationDetail';
import BirdIdentificationPanel from './BirdIdentificationPanel';
import BirdQualityAssessment from './BirdQualityAssessment';
import { apiFetch } from '../../../utils/api';

function BirdObservationDetail({ id, isModal, onClose }) {
    const fetchBirdObservation = async (observationId) => {
        try {
            const response = await apiFetch(`/burungnesia/observations/${observationId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'X-Source': 'burungnesia'
                }
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message);
            }

            // Normalize data
            const checklist = data.data.checklist;
            return {
                checklist: {
                    ...checklist,
                    media: {
                        images: data.data.medias.filter(m => m.type === 'image'),
                        sounds: data.data.medias.filter(m => m.type === 'audio'),
                        spectrograms: data.data.medias.filter(m => m.type === 'spectrogram')
                    }
                },
                identifications: data.data.identifications
            };
        } catch (error) {
            console.error('Error fetching bird observation:', error);
            throw error;
        }
    };

    const handleIdentificationSubmit = async (formData) => {
        try {
            const response = await apiFetch(`/burungnesia/observations/${id}/identifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'X-Source': 'burungnesia'
                },
                body: formData
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message);
            }

            return data.data;
        } catch (error) {
            console.error('Error submitting bird identification:', error);
            throw error;
        }
    };

    return (
        <BaseObservationDetail
            id={id}
            isModal={isModal}
            onClose={onClose}
            TabPanelComponent={BirdIdentificationPanel}
            QualityAssessmentComponent={BirdQualityAssessment}
            fetchObservation={fetchBirdObservation}
            handleIdentificationSubmit={handleIdentificationSubmit}
            channelName="burungnesia-checklist"
            sourceLabel="Burungnesia"
        />
    );
}

export default BirdObservationDetail; 