import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

export const useObservations = (searchParams, filterParams) => {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fungsi untuk membangun query params
  const buildQueryParams = useCallback((params) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.location) queryParams.append('location', params.location);
    if (params.latitude && params.longitude) {
      queryParams.append('latitude', params.latitude);
      queryParams.append('longitude', params.longitude);
      queryParams.append('radius', params.radius || filterParams.radius);
    }
    
    // Filter params
    if (filterParams.has_media) queryParams.append('has_media', filterParams.has_media);
    if (filterParams.media_type) queryParams.append('media_type', filterParams.media_type);
    if (filterParams.data_source?.length) {
      filterParams.data_source.forEach(source => {
        queryParams.append('data_source[]', source);
      });
    }
    if (filterParams.grade?.length) {
      filterParams.grade.forEach(grade => {
        queryParams.append('grade[]', grade.toLowerCase());
      });
    }
    
    queryParams.append('page', page);
    
    return queryParams;
  }, [filterParams]);

  // Debounced fetch function
  const debouncedFetch = useCallback(
    debounce(async (params) => {
      try {
        setLoading(true);
        const queryString = buildQueryParams(params).toString();
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/observations${queryString ? `?${queryString}` : ''}`
        );
        const data = await response.json();

        if (data.success) {
          setObservations(prev => page === 1 ? data.data : [...prev, ...data.data]);
          setHasMore(data.meta.current_page < data.meta.last_page);
        } else {
          setError('Gagal memuat data');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }, 300),
    [page, buildQueryParams]
  );

  // Reset page when search params or filters change
  useEffect(() => {
    setPage(1);
    setObservations([]);
  }, [searchParams, filterParams]);

  // Fetch data when dependencies change
  useEffect(() => {
    debouncedFetch(searchParams);
    return () => debouncedFetch.cancel();
  }, [searchParams, filterParams, page, debouncedFetch]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(p => p + 1);
    }
  }, [loading, hasMore]);

  return {
    observations,
    loading,
    error,
    hasMore,
    loadMore
  };
};