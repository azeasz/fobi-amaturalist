import { useState, useCallback } from 'react';
import { debounce } from 'lodash';

export const useFilter = (callback, delay = 500) => {
  const [filters, setFilters] = useState({
    dateStart: null,
    dateEnd: null,
    hasPhoto: false,
    hasAudio: false,
    dataSource: 'all'
  });

  const debouncedFilter = useCallback(
    debounce((newFilters) => {
      callback(newFilters);
    }, delay),
    [callback]
  );

  const updateFilters = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    debouncedFilter(updatedFilters);
  };

  return {
    filters,
    updateFilters
  };
};