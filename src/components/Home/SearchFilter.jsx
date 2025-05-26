import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';

const SearchFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    species: searchParams.get('species') || '',
    location: searchParams.get('location') || '',
    media_type: searchParams.get('media_type') || '',
    grade: searchParams.get('grade') || '',
    data_source: searchParams.get('data_source') || ''
  });

  // Sync filters dengan URL params
  useEffect(() => {
    const newFilters = {
      species: searchParams.get('species') || '',
      location: searchParams.get('location') || '',
      media_type: searchParams.get('media_type') || '',
      grade: searchParams.get('grade') || '',
      data_source: searchParams.get('data_source') || ''
    };
    setFilters(newFilters);
  }, [searchParams]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));

    // Update URL params langsung untuk species
    if (name === 'species') {
      const newParams = new URLSearchParams(searchParams);
      if (value) {
        newParams.set(name, value);
      } else {
        newParams.delete(name);
      }
      setSearchParams(newParams);
    }
  };

  const applyFilters = () => {
    console.log('Applying filters:', filters); // Debug log
    const newParams = new URLSearchParams();
    
    // Hanya tambahkan parameter yang memiliki nilai
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
        console.log(`Setting ${key} to ${value}`); // Debug log
      }
    });

    // Update URL params
    setSearchParams(newParams);
    setShowFilters(false);
  };

  const clearFilters = () => {
    console.log('Clearing all filters'); // Debug log
    setFilters({
      species: '',
      location: '',
      media_type: '',
      grade: '',
      data_source: ''
    });
    setSearchParams({});
    setShowFilters(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      {/* Search Bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            name="species"
            value={filters.species}
            onChange={handleFilterChange}
            onKeyPress={handleKeyPress}
            placeholder="Cari spesies..."
            className="w-full p-2 border rounded-lg pl-10"
          />
          <FontAwesomeIcon 
            icon={faSearch} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-[#679995] text-white rounded-lg flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faFilter} />
          Filter
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lokasi
              </label>
              <input
                type="text"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                onKeyPress={handleKeyPress}
                placeholder="Masukkan lokasi"
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipe Media
              </label>
              <select
                name="media_type"
                value={filters.media_type}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Semua Media</option>
                <option value="photo">Foto</option>
                <option value="audio">Audio</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade
              </label>
              <select
                name="grade"
                value={filters.grade}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Semua Grade</option>
                <option value="research grade">Research Grade</option>
                <option value="needs id">Needs ID</option>
                <option value="casual">Casual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sumber Data
              </label>
              <select
                name="data_source"
                value={filters.data_source}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Semua Sumber</option>
                <option value="fobi">FOBI</option>
                <option value="burungnesia">Burungnesia</option>
                <option value="kupunesia">Kupunesia</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 border rounded-lg flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faTimes} />
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-[#679995] text-white rounded-lg"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilter;