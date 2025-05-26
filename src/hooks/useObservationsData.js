import { useState, useEffect, useCallback } from 'react';

const CACHE_DURATION = 5 * 60 * 1000; // 5 menit dalam milliseconds
const ITEMS_PER_PAGE = 50; // Jumlah item yang dimuat per halaman

const cache = {
  data: new Map(),
  timestamp: new Map()
};

const useObservationsData = (searchParams, filterParams) => {
  const [data, setData] = useState({
    observations: [],
    loading: true,
    error: null,
    hasMore: true,
    page: 1
  });

  // Fungsi untuk mengecek cache
  const checkCache = useCallback((key) => {
    const cachedData = cache.data.get(key);
    const timestamp = cache.timestamp.get(key);
    
    if (cachedData && timestamp) {
      const isExpired = Date.now() - timestamp > CACHE_DURATION;
      if (!isExpired) {
        return cachedData;
      }
    }
    return null;
  }, []);

  // Fungsi untuk menyimpan cache
  const setCache = useCallback((key, data) => {
    cache.data.set(key, data);
    cache.timestamp.set(key, Date.now());
  }, []);

  // Fungsi untuk membuat query string
  const createQueryString = useCallback((params, page = 1) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page);
    queryParams.append('per_page', ITEMS_PER_PAGE);

    if (params.search) queryParams.append('search', params.search);
    if (params.location) queryParams.append('location', params.location);
    if (params.latitude && params.longitude) {
      queryParams.append('latitude', params.latitude);
      queryParams.append('longitude', params.longitude);
      queryParams.append('radius', params.radius || filterParams.radius);
    }

    if (filterParams.has_media) queryParams.append('has_media', filterParams.has_media);
    if (filterParams.media_type) queryParams.append('media_type', filterParams.media_type);
    if (Array.isArray(filterParams.grade) && filterParams.grade.length > 0) {
      filterParams.grade.forEach(grade => {
        queryParams.append('grade[]', grade.toLowerCase());
      });
    }

    return queryParams.toString();
  }, [filterParams]);

  // Fungsi untuk fetch data dengan retry mechanism
  const fetchWithRetry = useCallback(async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
  }, []);

  // Fungsi utama untuk fetch data
  const fetchData = useCallback(async (page = 1, append = false) => {
    try {
      const queryString = createQueryString(searchParams, page);
      const baseUrl = import.meta.env.VITE_API_URL;
      const selectedSources = filterParams?.data_source || ['fobi', 'burungnesia', 'kupunesia'];

      const cacheKey = `${queryString}-${selectedSources.join(',')}`;
      const cachedData = checkCache(cacheKey);

      if (cachedData) {
        setData(prev => ({
          ...prev,
          observations: append ? [...prev.observations, ...cachedData] : cachedData,
          loading: false
        }));
        return;
      }

      const fetchPromises = selectedSources.map(source => {
        const endpoint = source === 'fobi' ? 'general-observations' :
                        source === 'burungnesia' ? 'bird-observations' :
                        'butterfly-observations';
        
        return fetchWithRetry(`${baseUrl}/${endpoint}?${queryString}`)
          .catch(err => {
            console.error(`Error fetching ${source}:`, err);
            return { data: [] };
          });
      });

      const responses = await Promise.allSettled(fetchPromises);
      let allObservations = [];

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          const formattedData = formatData(response.value.data, selectedSources[index]);
          allObservations = [...allObservations, ...formattedData];
        }
      });

      // Sort by created_at
      allObservations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setCache(cacheKey, allObservations);

      setData(prev => ({
        observations: append ? [...prev.observations, ...allObservations] : allObservations,
        loading: false,
        error: null,
        hasMore: allObservations.length >= ITEMS_PER_PAGE,
        page
      }));

    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Gagal memuat data'
      }));
    }
  }, [searchParams, filterParams, createQueryString, checkCache, setCache, fetchWithRetry]);

  // Load more data
  const loadMore = useCallback(() => {
    if (!data.loading && data.hasMore) {
      setData(prev => ({ ...prev, loading: true }));
      fetchData(data.page + 1, true);
    }
  }, [data.loading, data.hasMore, data.page, fetchData]);

  // Initial fetch
  useEffect(() => {
    setData(prev => ({ ...prev, loading: true }));
    fetchData(1, false);
  }, [searchParams, filterParams, fetchData]);

  return {
    ...data,
    loadMore
  };
};

export default useObservationsData; 