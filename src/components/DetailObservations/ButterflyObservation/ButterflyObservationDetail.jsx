import React from 'react';
import BaseObservationDetail from '../BaseObservationDetail';
import ButterflyIdentificationPanel from './ButterflyIdentificationPanel';
import ButterflyQualityAssessment from './ButterflyQualityAssessment';
import { apiFetch } from '../../../utils/api';

function ButterflyObservationDetail({ id, isModal, onClose }) {
    const fetchButterflyObservation = async (observationId) => {
        try {
            const response = await apiFetch(`/kupunesia/observations/${observationId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'X-Source': 'kupunesia'
                }
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message);
            }

            // Normalize data dengan field baru dan format yang sama dengan ChecklistDetail
            const checklist = data.data.checklist;
            return {
                checklist: {
                    ...checklist,
                    media: {
                        images: data.data.medias.map(m => ({
                            ...m,
                            url: m.url // Pastikan URL foto tersedia
                        }))
                    },
                    scientific_name: checklist.scientific_name,
                    common_name: checklist.common_name,
                    family: checklist.family,
                    genus: checklist.genus,
                    species: checklist.species,
                    iucn_status: checklist.iucn_status,
                    quality_grade: checklist.quality_grade,
                    community_id_level: checklist.community_id_level,
                    needs_id: checklist.needs_id,
                    is_wild: checklist.is_wild,
                    location_accurate: checklist.location_accurate
                },
                identifications: data.data.identifications.map(id => ({
                    ...id,
                    identification_level: id.identification_level || 'species',
                    photo_path: id.photo_path, // Pastikan photo_path tersedia dari backend
                    identifier_name: id.identifier_name,
                    scientific_name: id.scientific_name,
                    common_name: id.common_name,
                    agreement_count: id.agreement_count,
                    user_agreed: id.user_agreed,
                    is_withdrawn: id.is_withdrawn,
                    comment: id.comment
                }))
            };
        } catch (error) {
            console.error('Error fetching butterfly observation:', error);
            throw error;
        }
    };

    const handleIdentificationSubmit = async (formData) => {
        try {
            // Pastikan formData memiliki file foto jika ada
            const response = await apiFetch(`/kupunesia/observations/${id}/identifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'X-Source': 'kupunesia'
                },
                body: formData // FormData akan otomatis menangani multipart/form-data
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message);
            }

            return data.data;
        } catch (error) {
            console.error('Error submitting butterfly identification:', error);
            throw error;
        }
    };

    return (
        <BaseObservationDetail
            id={id}
            isModal={isModal}
            onClose={onClose}
            TabPanelComponent={ButterflyIdentificationPanel}
            QualityAssessmentComponent={ButterflyQualityAssessment}
            fetchObservation={fetchButterflyObservation}
            handleIdentificationSubmit={handleIdentificationSubmit}
            channelName="kupunesia-checklist"
            sourceLabel="Kupunesia"
            onGradeUpdate={(newGrade) => {
                setChecklist(prev => ({
                    ...prev,
                    quality_grade: newGrade
                }));
            }}
        />
    );
}

export default ButterflyObservationDetail; 