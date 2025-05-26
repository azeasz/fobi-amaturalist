import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../../utils/api';

function CuratorVerification({ checklistId, onVerificationComplete, isCurator }) {
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleVerification = async (isApproved) => {
        try {
            setIsSubmitting(true);
            const response = await apiFetch(`/observations/${checklistId}/curator-verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({
                    is_approved: isApproved,
                    comment: comment
                })
            });

            const data = await response.json();
            if (data.success) {
                onVerificationComplete(data.data);
                setComment('');
            }
        } catch (error) {
            console.error('Error submitting curator verification:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isCurator) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FontAwesomeIcon icon={faShieldAlt} className="mr-2" />
                Verifikasi Kurator
            </h2>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Komentar (opsional)
                </label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-2 border rounded"
                    rows={4}
                    placeholder="Tambahkan komentar verifikasi..."
                />
            </div>

            <div className="flex space-x-4">
                <button
                    onClick={() => handleVerification(true)}
                    disabled={isSubmitting}
                    className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    Setujui
                </button>
                <button
                    onClick={() => handleVerification(false)}
                    disabled={isSubmitting}
                    className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                    <FontAwesomeIcon icon={faTimes} className="mr-2" />
                    Tolak
                </button>
            </div>
        </div>
    );
}

export default CuratorVerification;
