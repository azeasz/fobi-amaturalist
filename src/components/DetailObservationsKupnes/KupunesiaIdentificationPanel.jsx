import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faThumbsUp, 
    faThumbsDown, 
    faMosquito,
    faLeaf,
    faMagnifyingGlass
} from '@fortawesome/free-solid-svg-icons';

function KupunesiaIdentificationPanel({
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
        wing_pattern: '',
        wing_color: '',
        wing_size: '',
        notes: '',
        confidence_level: 'high'
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const wingPatterns = [
        'Eyespots',
        'Stripes',
        'Bands',
        'Spots',
        'Marbling',
        'Plain'
    ];

    const wingColors = [
        'Black',
        'White',
        'Blue',
        'Red',
        'Yellow',
        'Orange',
        'Brown',
        'Green',
        'Purple',
        'Multicolored'
    ];

    const wingSizes = [
        'Very Small (<2cm)',
        'Small (2-4cm)',
        'Medium (4-6cm)',
        'Large (6-8cm)',
        'Very Large (>8cm)'
    ];

    const handleSearch = async (query) => {
        if (query.length < 2) return;
        
        try {
            const response = await fetch(`/api/butterflies/search?q=${query}`);
            const data = await response.json();
            setSearchResults(data.results);
        } catch (error) {
            console.error('Error searching butterflies:', error);
        }
    };

    const handleSubmitIdentification = async (e) => {
        e.preventDefault();
        await onAddIdentification({
            ...identificationForm,
            observation_id: checklist.id,
            observation_type: 'kupunesia'
        });
        setShowAddIdentification(false);
        setIdentificationForm({
            species_id: '',
            wing_pattern: '',
            wing_color: '',
            wing_size: '',
            notes: '',
            confidence_level: 'high'
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Identifikasi Kupu-kupu</h3>
                {!showAddIdentification && (
                    <button
                        onClick={() => setShowAddIdentification(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <FontAwesomeIcon icon={faButterfly} className="mr-2" />
                        Tambah Identifikasi
                    </button>
                )}
            </div>

            {showAddIdentification && (
                <form onSubmit={handleSubmitIdentification} className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-4">
                        {/* Pencarian Spesies */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-2" />
                                Cari Spesies Kupu-kupu
                            </label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    handleSearch(e.target.value);
                                }}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Ketik nama kupu-kupu..."
                            />
                            {searchResults.length > 0 && (
                                <div className="mt-2 bg-white border rounded-md shadow-sm max-h-48 overflow-y-auto">
                                    {searchResults.map((butterfly) => (
                                        <div
                                            key={butterfly.id}
                                            className="p-2 hover:bg-gray-50 cursor-pointer"
                                            onClick={() => {
                                                setIdentificationForm({
                                                    ...identificationForm,
                                                    species_id: butterfly.id
                                                });
                                                setSearchQuery(butterfly.nameLat);
                                                setSearchResults([]);
                                            }}
                                        >
                                            <div className="font-medium">{butterfly.nameLat}</div>
                                            <div className="text-sm text-gray-500">{butterfly.nameId}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pola Sayap */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                <FontAwesomeIcon icon={faWings} className="mr-2" />
                                Pola Sayap
                            </label>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {wingPatterns.map((pattern) => (
                                    <label key={pattern} className="inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={identificationForm.wing_pattern.includes(pattern)}
                                            onChange={(e) => {
                                                const patterns = e.target.checked
                                                    ? [...identificationForm.wing_pattern.split(',').filter(Boolean), pattern].join(',')
                                                    : identificationForm.wing_pattern
                                                        .split(',')
                                                        .filter(p => p !== pattern)
                                                        .join(',');
                                                setIdentificationForm({
                                                    ...identificationForm,
                                                    wing_pattern: patterns
                                                });
                                            }}
                                            className="form-checkbox"
                                        />
                                        <span className="ml-2 text-sm">{pattern}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Warna Sayap */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                <FontAwesomeIcon icon={faLeaf} className="mr-2" />
                                Warna Dominan
                            </label>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {wingColors.map((color) => (
                                    <label key={color} className="inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={identificationForm.wing_color.includes(color)}
                                            onChange={(e) => {
                                                const colors = e.target.checked
                                                    ? [...identificationForm.wing_color.split(',').filter(Boolean), color].join(',')
                                                    : identificationForm.wing_color
                                                        .split(',')
                                                        .filter(c => c !== color)
                                                        .join(',');
                                                setIdentificationForm({
                                                    ...identificationForm,
                                                    wing_color: colors
                                                });
                                            }}
                                            className="form-checkbox"
                                        />
                                        <span className="ml-2 text-sm">{color}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Ukuran Sayap */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Ukuran Sayap
                            </label>
                            <select
                                value={identificationForm.wing_size}
                                onChange={(e) => setIdentificationForm({
                                    ...identificationForm,
                                    wing_size: e.target.value
                                })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Pilih ukuran...</option>
                                {wingSizes.map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tingkat Keyakinan */}
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

                        {/* Catatan Tambahan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Catatan Tambahan
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

            {/* Daftar Identifikasi */}
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
                                    <p className="mt-2 font-medium">{identification.species_name}</p>
                                    
                                    {/* Detail Identifikasi */}
                                    <div className="mt-2 space-y-1">
                                        {identification.wing_pattern && (
                                            <p className="text-sm">
                                                <FontAwesomeIcon icon={faWings} className="mr-2 text-gray-500" />
                                                Pola: {identification.wing_pattern}
                                            </p>
                                        )}
                                        {identification.wing_color && (
                                            <p className="text-sm">
                                                <FontAwesomeIcon icon={faLeaf} className="mr-2 text-gray-500" />
                                                Warna: {identification.wing_color}
                                            </p>
                                        )}
                                        {identification.wing_size && (
                                            <p className="text-sm">
                                                <FontAwesomeIcon icon={faButterfly} className="mr-2 text-gray-500" />
                                                Ukuran: {identification.wing_size}
                                            </p>
                                        )}
                                    </div>
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

export default KupunesiaIdentificationPanel; 