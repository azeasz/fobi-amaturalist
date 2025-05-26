import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp, faThumbsDown } from '@fortawesome/free-solid-svg-icons';

function IdentificationPanel({
    checklist,
    identifications,
    user,
    onAgree,
    onWithdraw,
    observationType
}) {
    const [showAddIdentification, setShowAddIdentification] = useState(false);

    const handleAgree = (identificationId) => {
        onAgree(identificationId, observationType);
    };

    const handleWithdraw = (identificationId) => {
        onWithdraw(identificationId, observationType);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Identifikasi Komunitas</h3>
                <button
                    onClick={() => setShowAddIdentification(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Tambah Identifikasi
                </button>
            </div>

            {identifications.length === 0 ? (
                <p className="text-gray-500">Belum ada identifikasi</p>
            ) : (
                <div className="space-y-4">
                    {identifications.map((identification) => (
                        <div key={identification.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">{identification.identifier_name}</p>
                                    <p className="text-sm text-gray-600">
                                        {new Date(identification.created_at).toLocaleDateString('id-ID')}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleAgree(identification.id)}
                                        className={`p-2 rounded-full ${
                                            identification.user_agreed
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faThumbsUp} />
                                    </button>
                                    {user?.id === identification.user_id && (
                                        <button
                                            onClick={() => handleWithdraw(identification.id)}
                                            className="p-2 rounded-full bg-red-100 text-red-600"
                                        >
                                            <FontAwesomeIcon icon={faThumbsDown} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="mt-2">{identification.notes}</p>
                            <div className="mt-2 text-sm text-gray-500">
                                {identification.agreement_count} setuju
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default IdentificationPanel; 