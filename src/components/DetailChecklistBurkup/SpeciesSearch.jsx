import React, { useState, useEffect } from 'react';

function SpeciesSearch({ checklistId, onSpeciesAdd, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSpecies, setSelectedSpecies] = useState(null);
    const [formData, setFormData] = useState({
        count: 1,
        notes: '',
        breeding: false,
        breeding_note: '',
        breeding_type_id: null
    });

    useEffect(() => {
        const searchSpecies = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const source = checklistId.startsWith('BN') ? 'burungnesia' : 'kupunesia';
                const apiUrl = import.meta.env.VITE_API_URL;

                const response = await fetch(`${apiUrl}/observations/search-species?source=${source}&query=${encodeURIComponent(query.trim())}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API Error Response:', errorText);
                    throw new Error('Gagal mencari spesies');
                }

                const data = await response.json();
                console.log('Search Response:', data);

                if (data.success) {
                    setResults(data.data || []);
                } else {
                    throw new Error(data.message || 'Gagal mencari spesies');
                }
            } catch (error) {
                console.error('Error searching species:', error);
                setError(error.message);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(searchSpecies, 300);
        return () => clearTimeout(debounce);
    }, [query, checklistId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSpecies) return;

        try {
            const source = checklistId.startsWith('BN') ? 'burungnesia' : 'kupunesia';
            const apiUrl = import.meta.env.VITE_API_URL;
            
            const response = await fetch(`${apiUrl}/observations/${checklistId}/species?source=${source}`, {
                method: 'POST',
                body: JSON.stringify({
                    fauna_id: selectedSpecies.id,
                    ...formData
                })
            });

            const data = await response.json();
            if (data.success) {
                onSpeciesAdd();
                onClose();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error adding species:', error);
            alert('Gagal menambahkan spesies');
        }
    };

    return (
        <div className="p-4">
            <div className="mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari spesies..."
                    className="w-full p-2 border rounded"
                />
            </div>

            {loading && (
                <div className="text-center py-2">Mencari...</div>
            )}

            {error && (
                <div className="text-red-600 py-2">{error}</div>
            )}

            {!loading && !error && (
                <div className="mb-4 max-h-60 overflow-y-auto">
                    {results.length === 0 && query.trim() !== '' ? (
                        <div className="text-gray-500 py-2">Tidak ada hasil ditemukan</div>
                    ) : (
                        results.map(species => (
                            <div
                                key={species.id}
                                onClick={() => setSelectedSpecies(species)}
                                className={`p-2 cursor-pointer hover:bg-gray-100 ${
                                    selectedSpecies?.id === species.id ? 'bg-blue-50' : ''
                                }`}
                            >
                                <div>{species.nameId}</div>
                                <div className="text-sm text-gray-600">{species.nameLat}</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {selectedSpecies && (
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Jumlah</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.count}
                                onChange={(e) => setFormData({...formData, count: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Catatan</label>
                            <input
                                type="text"
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.breeding}
                                    onChange={(e) => setFormData({...formData, breeding: e.target.checked})}
                                    className="rounded border-gray-300"
                                />
                                <span className="ml-2">Breeding</span>
                            </label>
                        </div>
                        {formData.breeding && (
                            <div>
                                <label className="block text-sm font-medium">Catatan Breeding</label>
                                <input
                                    type="text"
                                    value={formData.breeding_note}
                                    onChange={(e) => setFormData({...formData, breeding_note: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                />
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Tambah Spesies
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}

export default SpeciesSearch;
