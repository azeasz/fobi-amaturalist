import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

function LocationVerificationPanel({
    checklist,
    verifications,
    user,
    onVerify,
    observationType
}) {
    const [showVerificationForm, setShowVerificationForm] = useState(false);
    const [verificationNote, setVerificationNote] = useState('');
    const [isAccurate, setIsAccurate] = useState(true);

    const handleSubmitVerification = (e) => {
        e.preventDefault();
        onVerify({
            observation_id: checklist.id,
            observation_type: observationType,
            is_accurate: isAccurate,
            notes: verificationNote
        });
        setShowVerificationForm(false);
        setVerificationNote('');
    };

    const userHasVerified = verifications.some(v => v.user_id === user?.id);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Verifikasi Lokasi</h3>
                {!userHasVerified && (
                    <button
                        onClick={() => setShowVerificationForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Verifikasi Lokasi
                    </button>
                )}
            </div>

            {showVerificationForm && (
                <form onSubmit={handleSubmitVerification} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status Akurasi</label>
                        <div className="mt-2 space-x-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="accuracy"
                                    checked={isAccurate}
                                    onChange={() => setIsAccurate(true)}
                                    className="form-radio"
                                />
                                <span className="ml-2">Akurat</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="accuracy"
                                    checked={!isAccurate}
                                    onChange={() => setIsAccurate(false)}
                                    className="form-radio"
                                />
                                <span className="ml-2">Tidak Akurat</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Catatan</label>
                        <textarea
                            value={verificationNote}
                            onChange={(e) => setVerificationNote(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            rows="3"
                        />
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={() => setShowVerificationForm(false)}
                            className="px-4 py-2 border rounded-md hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Kirim
                        </button>
                    </div>
                </form>
            )}

            {verifications.length === 0 ? (
                <p className="text-gray-500">Belum ada verifikasi lokasi</p>
            ) : (
                <div className="space-y-4">
                    {verifications.map((verification) => (
                        <div key={verification.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold">{verification.user_name}</p>
                                    <p className="text-sm text-gray-600">
                                        {new Date(verification.created_at).toLocaleDateString('id-ID')}
                                    </p>
                                </div>
                                <FontAwesomeIcon
                                    icon={verification.is_accurate ? faCheckCircle : faTimesCircle}
                                    className={verification.is_accurate ? 'text-green-500' : 'text-red-500'}
                                    size="lg"
                                />
                            </div>
                            {verification.notes && (
                                <p className="mt-2 text-gray-700">{verification.notes}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default LocationVerificationPanel; 