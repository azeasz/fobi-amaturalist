import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCheckCircle, 
    faTimesCircle, 
    faMapMarkerAlt, 
    faDove, 
    faTree,
    faInfoCircle 
} from '@fortawesome/free-solid-svg-icons';

function BurungnesiaLocationVerificationPanel({
    checklist,
    verifications,
    user,
    onVerify
}) {
    const [showVerificationForm, setShowVerificationForm] = useState(false);
    const [verificationForm, setVerificationForm] = useState({
        is_accurate: true,
        habitat_suitable: true,
        notes: '',
        habitat_type: '',
        confidence_level: 'high'
    });

    const habitatTypes = [
        { value: 'forest', label: 'Hutan' },
        { value: 'wetland', label: 'Lahan Basah' },
        { value: 'coastal', label: 'Pesisir' },
        { value: 'urban', label: 'Perkotaan' },
        { value: 'agricultural', label: 'Pertanian' },
        { value: 'grassland', label: 'Padang Rumput' },
        { value: 'mountain', label: 'Pegunungan' }
    ];

    const handleSubmitVerification = async (e) => {
        e.preventDefault();
        await onVerify({
            observation_id: checklist.id,
            observation_type: 'burungnesia',
            ...verificationForm
        });
        setShowVerificationForm(false);
        setVerificationForm({
            is_accurate: true,
            habitat_suitable: true,
            notes: '',
            habitat_type: '',
            confidence_level: 'high'
        });
    };

    const userHasVerified = verifications.some(v => v.user_id === user?.id);

    const getVerificationStatusColor = (verification) => {
        if (verification.is_accurate && verification.habitat_suitable) {
            return 'text-green-500';
        } else if (!verification.is_accurate && !verification.habitat_suitable) {
            return 'text-red-500';
        }
        return 'text-yellow-500';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Verifikasi Lokasi & Habitat Burung</h3>
                {!userHasVerified && (
                    <button
                        onClick={() => setShowVerificationForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                        Verifikasi Lokasi
                    </button>
                )}
            </div>

            {showVerificationForm && (
                <form onSubmit={handleSubmitVerification} className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Akurasi Lokasi
                            </label>
                            <div className="mt-2 space-x-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="accuracy"
                                        checked={verificationForm.is_accurate}
                                        onChange={() => setVerificationForm({
                                            ...verificationForm,
                                            is_accurate: true
                                        })}
                                        className="form-radio"
                                    />
                                    <span className="ml-2">Akurat</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="accuracy"
                                        checked={!verificationForm.is_accurate}
                                        onChange={() => setVerificationForm({
                                            ...verificationForm,
                                            is_accurate: false
                                        })}
                                        className="form-radio"
                                    />
                                    <span className="ml-2">Tidak Akurat</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Kesesuaian Habitat
                            </label>
                            <div className="mt-2 space-x-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="habitat"
                                        checked={verificationForm.habitat_suitable}
                                        onChange={() => setVerificationForm({
                                            ...verificationForm,
                                            habitat_suitable: true
                                        })}
                                        className="form-radio"
                                    />
                                    <span className="ml-2">Sesuai</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="habitat"
                                        checked={!verificationForm.habitat_suitable}
                                        onChange={() => setVerificationForm({
                                            ...verificationForm,
                                            habitat_suitable: false
                                        })}
                                        className="form-radio"
                                    />
                                    <span className="ml-2">Tidak Sesuai</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Tipe Habitat
                            </label>
                            <select
                                value={verificationForm.habitat_type}
                                onChange={(e) => setVerificationForm({
                                    ...verificationForm,
                                    habitat_type: e.target.value
                                })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Pilih tipe habitat</option>
                                {habitatTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Tingkat Keyakinan
                            </label>
                            <select
                                value={verificationForm.confidence_level}
                                onChange={(e) => setVerificationForm({
                                    ...verificationForm,
                                    confidence_level: e.target.value
                                })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="high">Sangat Yakin</option>
                                <option value="medium">Cukup Yakin</option>
                                <option value="low">Kurang Yakin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Catatan Verifikasi
                            </label>
                            <textarea
                                value={verificationForm.notes}
                                onChange={(e) => setVerificationForm({
                                    ...verificationForm,
                                    notes: e.target.value
                                })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                rows="3"
                                placeholder="Tambahkan catatan tentang lokasi dan habitat..."
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
                                Kirim Verifikasi
                            </button>
                        </div>
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
                                    <div className="mt-2">
                                        <p className="text-sm">
                                            <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                                            Lokasi: {verification.is_accurate ? 'Akurat' : 'Tidak Akurat'}
                                        </p>
                                        <p className="text-sm">
                                            <FontAwesomeIcon icon={faTree} className="mr-2" />
                                            Habitat: {verification.habitat_suitable ? 'Sesuai' : 'Tidak Sesuai'}
                                        </p>
                                        <p className="text-sm">
                                            <FontAwesomeIcon icon={faDove} className="mr-2" />
                                            Tipe Habitat: {habitatTypes.find(t => t.value === verification.habitat_type)?.label || '-'}
                                        </p>
                                    </div>
                                </div>
                                <FontAwesomeIcon
                                    icon={verification.is_accurate && verification.habitat_suitable ? faCheckCircle : faTimesCircle}
                                    className={getVerificationStatusColor(verification)}
                                    size="lg"
                                />
                            </div>
                            {verification.notes && (
                                <div className="mt-2 p-2 bg-gray-50 rounded">
                                    <p className="text-sm text-gray-700">
                                        <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                                        {verification.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default BurungnesiaLocationVerificationPanel; 