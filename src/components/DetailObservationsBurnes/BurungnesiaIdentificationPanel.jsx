import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp, faThumbsDown, faDove } from '@fortawesome/free-solid-svg-icons';

function BurungnesiaIdentificationPanel({
    checklist,
    identifications,
    user,
    onAgree,
    onWithdraw,
    onAddIdentification
}) {
    const [showAddIdentification, setShowAddIdentification] = useState(false);
    const [identificationForm, setIdentificationForm] = useState({
        species_id: '',
        notes: '',
        confidence_level: 'high'
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const handleSearch = async (query) => {
        if (query.length < 2) return;
        
        try {
            const response = await fetch(`/api/birds/search?q=${query}`);
            const data = await response.json();
            setSearchResults(data.results);
        } catch (error) {
            console.error('Error searching birds:', error);
        }
    };

    const handleSubmitIdentification = async (e) => {
        e.preventDefault();
        await onAddIdentification({
            ...identificationForm,
            observation_id: checklist.id,
            observation_type: 'burungnesia'
        });
        setShowAddIdentification(false);
        setIdentificationForm({ species_id: '', notes: '', confidence_level: 'high' });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Identifikasi Burung</h3>
                {!showAddIdentification && (
                    <button
                        onClick={() => setShowAddIdentification(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <FontAwesomeIcon icon={faDove} className="mr-2" />
                        Tambah Identifikasi
                    </button>
                )}
            </div>

            {showAddIdentification && (
                <form onSubmit={handleSubmitIdentification} className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Cari Spesies Burung
                            </label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    handleSearch(e.target.value);
                                }}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Ketik nama burung..."
                            />
                            {searchResults.length > 0 && (
                                <div className="mt-2 bg-white border rounded-md shadow-sm">
                                    {searchResults.map((bird) => (
                                        <div
                                            key={bird.id}
                                            className="p-2 hover:bg-gray-50 cursor-pointer"
                                            onClick={() => {
                                                setIdentificationForm({
                                                    ...identificationForm,
                                                    species_id: bird.id
                                                });
                                                setSearchQuery(bird.nameLat);
                                                setSearchResults([]);
                                            }}
                                        >
                                            <div className="font-medium">{bird.nameLat}</div>
                                            <div className="text-sm text-gray-500">{bird.nameId}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Tingkat Keyakinan
                            </label>
                            <select
                                value={identificationForm.confidence_level}
                                onChange={(e) => setIdentificationForm({
                                    ...identificationForm,
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
                                Catatan
                            </label>
                            <textarea
                                value={identificationForm.notes}
                                onChange={(e) => setIdentificationForm({
                                    ...identificationForm,
                                    notes: e.target.value
                                })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                rows="3"
                                placeholder="Tambahkan catatan identifikasi..."
                            />
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setShowAddIdentification(false)}
                                className="px-4 py-2 border rounded-md hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Simpan Identifikasi
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {identifications.length === 0 ? (
                <p className="text-gray-500">Belum ada identifikasi untuk pengamatan ini</p>
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
                                    <p className="mt-2">{identification.species_name}</p>
                                    <p className="text-sm text-gray-600">
                                        Tingkat Keyakinan: {identification.confidence_level}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => onAgree(identification.id)}
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
                                            onClick={() => onWithdraw(identification.id)}
                                            className="p-2 rounded-full bg-red-100 text-red-600"
                                        >
                                            <FontAwesomeIcon icon={faThumbsDown} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {identification.notes && (
                                <p className="mt-2 text-gray-700">{identification.notes}</p>
                            )}
                            <div className="mt-2 text-sm text-gray-500">
                                {identification.agreement_count} orang setuju
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default BurungnesiaIdentificationPanel; 