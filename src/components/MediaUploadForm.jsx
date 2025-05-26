import React, { useState } from 'react';
import MediaGrid from './MediaGrid';
import LocationPicker from './Observations/LocationPicker';

function MediaUploadForm({ onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        observer: '',
        tujuan_pengamatan: '',
        additional_note: '',
        active: 0,
        completed: 0,
        latitude: '',
        longitude: '',
        locationName: '',
        mediaItems: []
    });

    const handleMediaChange = (items) => {
        setFormData(prev => ({
            ...prev,
            mediaItems: items
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const submitData = new FormData();
        
        // Tambahkan data form
        Object.keys(formData).forEach(key => {
            if (key !== 'mediaItems') {
                submitData.append(key, formData[key]);
            }
        });

        // Tambahkan media items
        formData.mediaItems.forEach((item, index) => {
            submitData.append(`media[${index}]`, item.file);
            submitData.append(`metadata[${index}]`, JSON.stringify(item.metadata));
        });

        onSubmit(submitData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Data Pengamat */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">Data Pengamat</h2>
                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Pengamat
                        </label>
                        <input 
                            type="text"
                            name="observer"
                            value={formData.observer}
                            onChange={handleInputChange}
                            className="w-full border rounded-md px-3 py-2"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tujuan Pengamatan
                        </label>
                        <select 
                            name="tujuan_pengamatan"
                            value={formData.tujuan_pengamatan}
                            onChange={handleInputChange}
                            className="w-full border rounded-md px-3 py-2"
                            required
                        >
                            <option value="">Pilih Tujuan</option>
                            <option value="1">Terencana/Terjadwal</option>
                            <option value="2">Insidental</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Catatan Tambahan
                        </label>
                        <textarea
                            name="additional_note"
                            value={formData.additional_note}
                            onChange={handleInputChange}
                            rows="3"
                            className="w-full border rounded-md px-3 py-2"
                        />
                    </div>
                </div>
            </div>

            {/* Lokasi */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">Lokasi</h2>
                <LocationPicker 
                    onLocationSelect={(lat, lng, name) => {
                        setFormData(prev => ({
                            ...prev,
                            latitude: lat,
                            longitude: lng,
                            locationName: name
                        }));
                    }}
                />
            </div>

            {/* Media Upload */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">Media</h2>
                <MediaGrid 
                    onChange={handleMediaChange}
                    items={formData.mediaItems}
                />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading}
                    className={`
                        px-6 py-2 rounded-md text-white
                        ${isLoading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'}
                    `}
                >
                    {isLoading ? 'Mengupload...' : 'Upload Data'}
                </button>
            </div>
        </form>
    );
}

export default MediaUploadForm;