import { useState, useCallback } from 'react';
import { debounce } from 'lodash';

export const useSearch = (callback, delay = 500) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');

  const debouncedSearch = useCallback(
    debounce((search, loc) => {
      callback({ search, location: loc });
    }, delay),
    [callback]
  );

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    debouncedSearch(value, location);
  };

  const handleLocationChange = (value) => {
    setLocation(value);
    debouncedSearch(searchTerm, value);
  };

  return {
    searchTerm,
    location,
    handleSearchChange,
    handleLocationChange
  };
};