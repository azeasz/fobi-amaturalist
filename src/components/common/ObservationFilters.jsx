import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

function ObservationFilters({ onFilterChange, initialFilters = {} }) {
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        hasMedia: false,
        mediaType: '',
        sortBy: 'newest',
        ...initialFilters
    });

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Filter Observasi</h3>
            
            <div className="space-y-4">
                {/* Tanggal */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rentang Tanggal
                    </label>
                    <div className="flex gap-2">
                        <DatePicker
                            selected={filters.startDate}
                            onChange={date => handleFilterChange('startDate', date)}
                            className="p-2 border rounded"
                            placeholderText="Dari tanggal"
                            dateFormat="dd/MM/yyyy"
                        />
                        <DatePicker
                            selected={filters.endDate}
                            onChange={date => handleFilterChange('endDate', date)}
                            className="p-2 border rounded"
                            placeholderText="Sampai tanggal"
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>
                </div>

                {/* Media */}
                <div>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={filters.hasMedia}
                            onChange={e => handleFilterChange('hasMedia', e.target.checked)}
                            className="rounded text-blue-500"
                        />
                        <span className="text-sm text-gray-700">Memiliki Media</span>
                    </label>
                </div>

                {/* Tipe Media */}
                {filters.hasMedia && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipe Media
                        </label>
                        <select
                            value={filters.mediaType}
                            onChange={e => handleFilterChange('mediaType', e.target.value)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="">Semua</option>
                            <option value="image">Gambar</option>
                            <option value="video">Video</option>
                            <option value="audio">Audio</option>
                        </select>
                    </div>
                )}

                {/* Pengurutan */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Urutkan
                    </label>
                    <select
                        value={filters.sortBy}
                        onChange={e => handleFilterChange('sortBy', e.target.value)}
                        className="w-full p-2 border rounded"
                    >
                        <option value="newest">Terbaru</option>
                        <option value="oldest">Terlama</option>
                        <option value="most_identifications">Identifikasi Terbanyak</option>
                        <option value="most_agreements">Persetujuan Terbanyak</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

export default ObservationFilters; 