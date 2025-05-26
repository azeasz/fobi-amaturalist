import React, { useState } from 'react';
import MediaCard from './MediaCard';
import LocationModal from './Observations/LPModal';
import { apiFetch } from '../utils/api';
function MediaGrid() {
    const [mediaItems, setMediaItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileDrop = async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || e.target.files);
        
        setLoading(true);
        setProgress(0);

        const newMediaItems = await Promise.all(files.map(async (file) => {
            const isAudio = file.type.startsWith('audio/');
            let spectrogramUrl = null;

            if (isAudio) {
                const formData = new FormData();
                formData.append('audio', file);

                try {
                    const response = await apiFetch('/generate-spectrogram', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                        },
                        body: formData
                    });

                    if (response.ok) {
                        const data = await response.json();
                        spectrogramUrl = data.spectrogramUrl;
                    }
                } catch (error) {
                    console.error('Error generating spectrogram:', error);
                }
            }

            return {
                id: Date.now() + Math.random(),
                file,
                preview: isAudio ? null : URL.createObjectURL(file),
                type: file.type,
                spectrogramUrl,
                metadata: {
                    latitude: null,
                    longitude: null,
                    locationName: '',
                    date: null,
                    time: null,
                    notes: ''
                }
            };
        }));

        setMediaItems(prev => [...prev, ...newMediaItems]);
        setLoading(false);
    };

    // ... (kode lainnya sama seperti sebelumnya)

    return (
        <div>
            {/* Upload Area */}
            <div 
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed p-8 text-center rounded-lg mb-8"
            >
                <input
                    type="file"
                    multiple
                    accept="image/*,audio/*"
                    onChange={handleFileDrop}
                    className="hidden"
                    id="fileInput"
                />
                <label 
                    htmlFor="fileInput"
                    className="cursor-pointer text-blue-500 hover:text-blue-700"
                >
                    Klik untuk upload atau seret file ke sini
                </label>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mediaItems.map(item => (
                    <MediaCard
                        key={item.id}
                        item={item}
                        isSelected={selectedItems.includes(item.id)}
                        onSelect={() => handleItemSelect(item.id)}
                        onUpdate={(updates) => handleItemUpdate(item.id, updates)}
                    />
                ))}
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 z-50">
                    <div className="container mx-auto flex justify-between items-center">
                        <span>{selectedItems.length} item dipilih</span>
                        <div className="space-x-2">
                            <button 
                                onClick={() => handleBulkEdit('location')}
                                className="bg-blue-500 text-white px-4 py-2 rounded"
                            >
                                Set Lokasi
                            </button>
                            <button 
                                onClick={() => handleBulkEdit('delete')}
                                className="bg-red-500 text-white px-4 py-2 rounded"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Location Modal */}
            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSave={handleLocationSave}
            />
        </div>
    );
}

export default MediaGrid;