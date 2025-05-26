import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faFilter, faTimes, faSearch, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import CountUp from 'react-countup';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import PropTypes from 'prop-types';
import {
  calculateDistance,
  calculateCenterPoint,
  calculateZoomLevel
} from '../../utils/geoHelpers';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';

const StatsBar = ({ 
  stats, 
  onSearch, 
  setStats, 
  onMapReset, 
  onSpeciesSelect, 
  selectedSpecies,
  onFilterChange
}) => {
  const safeStats = {
    observasi: stats?.observasi || 0,
    burungnesia: stats?.burungnesia || 0,
    kupunesia: stats?.kupunesia || 0,
    fobi: stats?.fobi || 0,
    fotoAudio: stats?.fotoAudio || 0,
    spesies: stats?.spesies || 0,
    kontributor: stats?.kontributor || 0,
  };

  const [searchParams, setSearchParams] = useState({
    search: '',
    location: '',
    latitude: '',
    longitude: '',
    searchType: 'all'
  });

  const [filterParams, setFilterParams] = useState({
    start_date: '',
    end_date: '',
    grade: [],
    has_media: false,
    media_type: '',
    data_source: ['fobi', 'burungnesia', 'kupunesia']
  });

  const [showFilter, setShowFilter] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [speciesSuggestions, setSpeciesSuggestions] = useState([]);
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);

  const suggestionRef = useRef(null);
  const locationSuggestionRef = useRef(null);

  const [currentStatsPage, setCurrentStatsPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const suggestionContainerRef = useRef(null);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      setDirection(1);
      setCurrentStatsPage((prev) => 
        prev === mobileStats.totalPages - 1 ? 0 : prev + 1
      );
    },
    onSwipedRight: () => {
      setDirection(-1);
      setCurrentStatsPage((prev) => 
        prev === 0 ? mobileStats.totalPages - 1 : prev - 1
      );
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close species suggestions jika klik di luar dan bukan input species
      if (
        suggestionRef.current && 
        !suggestionRef.current.contains(event.target) &&
        !event.target.closest('input[placeholder="Spesies/ genus/ famili"]')
      ) {
        setSpeciesSuggestions([]);
      }
      // Close location suggestions jika klik di luar dan bukan input lokasi
      if (
        locationSuggestionRef.current && 
        !locationSuggestionRef.current.contains(event.target) &&
        !event.target.closest('input[placeholder="Lokasi"]')
      ) {
        setLocationSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchParams.location) {
        handleLocationSearch(searchParams.location);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchParams.location]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchParams.search && !searchParams.selectedId) {
        handleSpeciesSearch(searchParams.search);
      } else if (!searchParams.search) {
        setSpeciesSuggestions([]);
      }
    }, 300); // Delay 300ms untuk menghindari terlalu banyak request

    return () => clearTimeout(delayDebounceFn);
  }, [searchParams.search, searchParams.selectedId]);

  const handleLocationSearch = async (locationName) => {
    if (!locationName) {
        setLocationSuggestions([]);
        return;
    }

    setIsLoadingLocation(true);
    try {
        // Daftar pulau besar di Indonesia dan koordinatnya
        const majorIslands = {
            'jawa': {
                display_name: 'Pulau Jawa, Indonesia',
                lat: -7.6145,
                lon: 110.7124,
                radius: 500,
                boundingbox: [-8.7, -5.9, 105.0, 114.4],
                type: 'island'
            },
            'sumatera': {
                display_name: 'Pulau Sumatera, Indonesia',
                lat: -0.5897,
                lon: 101.3431,
                radius: 500,
                boundingbox: [-6.0, 6.0, 95.0, 106.0],
                type: 'island'
            },
            'kalimantan': {
                display_name: 'Pulau Kalimantan, Indonesia',
                lat: 0.9619,
                lon: 114.5548,
                radius: 800,
                boundingbox: [-4.0, 7.0, 108.0, 119.0],
                type: 'island'
            },
            'sulawesi': {
                display_name: 'Pulau Sulawesi, Indonesia',
                lat: -2.5489,
                lon: 120.7999,
                radius: 600,
                boundingbox: [-6.0, 2.0, 118.0, 125.0],
                type: 'island'
            },
            'papua': {
                display_name: 'Pulau Papua, Indonesia',
                lat: -4.2690,
                lon: 138.0804,
                radius: 1000,
                boundingbox: [-9.0, 0.0, 130.0, 141.0],
                type: 'island'
            },
            'bali': {
                display_name: 'Pulau Bali, Indonesia',
                lat: -8.3405,
                lon: 115.0920,
                radius: 100,
                boundingbox: [-8.9, -8.0, 114.4, 115.7],
                type: 'island'
            },
            'nusa tenggara': {
                display_name: 'Kepulauan Nusa Tenggara, Indonesia',
                lat: -8.6524,
                lon: 118.7278,
                radius: 500,
                boundingbox: [-10.0, -8.0, 115.0, 125.0],
                type: 'island'
            },
            'maluku': {
                display_name: 'Kepulauan Maluku, Indonesia',
                lat: -3.2385,
                lon: 130.1452,
                radius: 500,
                boundingbox: [-8.0, 2.0, 124.0, 135.0],
                type: 'island'
            }
        };

        // Dapatkan hasil dari Nominatim
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(locationName)}&` +
            `limit=5&` +
            `addressdetails=1&` +
            `bounded=1&` +
            `countrycodes=id`
        );
        const nominatimData = await response.json();

        // Proses hasil Nominatim
        const processedNominatim = nominatimData
            .filter(item => {
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);
                return !isNaN(lat) && !isNaN(lon) &&
                       lat >= -11.0 && lat <= 6.0 &&
                       lon >= 95.0 && lon <= 141.0;
            })
            .map(item => {
                const address = item.address;
                const parts = [];

                if (address.city || address.town || address.municipality) {
                    parts.push(address.city || address.town || address.municipality);
                }
                if (address.state || address.province) {
                    parts.push(address.state || address.province);
                }

                const bbox = item.boundingbox.map(coord => parseFloat(coord));
                const [south, north, west, east] = bbox;
                const width = calculateDistance(south, west, south, east);
                const height = calculateDistance(south, west, north, west);
                const radius = Math.max(width, height) / 2;

                // Normalisasi koordinat
                const normalizedLon = ((parseFloat(item.lon) + 180) % 360) - 180;

                return {
                    display_name: parts.join(', '),
                    lat: parseFloat(item.lat),
                    lon: normalizedLon,
                    boundingbox: bbox,
                    radius: radius,
                    type: address.city ? 'city' :
                          address.town ? 'town' :
                          address.municipality ? 'municipality' :
                          address.state ? 'state' :
                          'area'
                };
            });

        // Cek apakah pencarian cocok dengan pulau besar
        const searchLower = locationName.toLowerCase();
        const suggestions = [];

        // Tambahkan pulau besar jika ada yang cocok
        Object.entries(majorIslands).forEach(([key, islandData]) => {
            if (searchLower.includes(key)) {
                suggestions.push({
                    ...islandData,
                    type: 'island'
                });
            }
        });

        // Tambahkan hasil Nominatim
        suggestions.push(...processedNominatim);

        // Urutkan hasil: pulau dulu, baru hasil spesifik
        const sortedSuggestions = suggestions.sort((a, b) => {
            if (a.type === 'island' && b.type !== 'island') return -1;
            if (a.type !== 'island' && b.type === 'island') return 1;
            if (a.type === 'state' && b.type !== 'state') return -1;
            if (a.type !== 'state' && b.type === 'state') return 1;
            return 0;
        });

        setLocationSuggestions(sortedSuggestions);
    } catch (error) {
        console.error('Error searching location:', error);
        setLocationSuggestions([]);
    } finally {
        setIsLoadingLocation(false);
    }
};

  const handleLocationSelect = (location) => {
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);
    const bbox = location.boundingbox;

    // Validasi koordinat
    if (isNaN(lat) || isNaN(lon) || 
        lat < -90 || lat > 90 || 
        lon < -180 || lon > 180) {
        console.error('Invalid coordinates:', {lat, lon});
        return;
    }

    // Hitung zoom level berdasarkan radius dan bounding box
    const zoomLevel = calculateZoomLevel(location.radius, bbox);

    setSearchParams({
        ...searchParams,
        location: location.display_name,
        latitude: lat,
        longitude: lon,
        radius: location.radius,
        boundingbox: bbox,
        zoomLevel: zoomLevel
    });

    setLocationSuggestions([]);

    // Update filter dengan lokasi yang dipilih
    if (onFilterChange) {
        onFilterChange({
            latitude: lat,
            longitude: lon,
            radius: location.radius || 10 // Default radius 10km
        });
    }

    // Tetap gunakan fetchFilteredStats untuk backward compatibility
    fetchFilteredStats({
        latitude: lat,
        longitude: lon,
        radius: location.radius || 10
    });
  };

  const handleSearch = async () => {
    const formattedParams = {
      ...searchParams,
      ...filterParams
    };

    // Call original search handler
    onSearch(formattedParams);

    // Fetch and update stats
    const newStats = await fetchFilteredStats(formattedParams);
    if (newStats) {
      setStats(newStats);
    }

    setShowFilter(false);
  };

  const handleApplyFilter = () => {
    // Tutup filter dropdown
    setShowFilter(false);
    
    // Buat objek filter
    const filters = {
      grade: filterParams.grade,
      data_source: filterParams.data_source,
      has_media: filterParams.has_media,
      media_type: filterParams.media_type,
      start_date: filterParams.start_date,
      end_date: filterParams.end_date
    };
    
    // Log untuk debugging
    console.log('StatsBar: Menerapkan filter:', filters);
    
    // Gunakan onFilterChange jika tersedia
    if (onFilterChange) {
      onFilterChange(filters);
    }
    
    // Tetap gunakan fetchFilteredStats untuk backward compatibility
    fetchFilteredStats({
      ...searchParams,
      ...filters
    });
  };

  const handleResetFilter = () => {
    // Simpan timestamp reset filter ke localStorage
    localStorage.setItem('lastFilterResetTime', new Date().getTime().toString());
    
    // Reset semua filter
    const defaultFilters = {
      start_date: '',
      end_date: '',
      grade: [],
      has_media: false,
      media_type: '',
      data_source: ['fobi', 'burungnesia', 'kupunesia']
    };
    
    setFilterParams(defaultFilters);
    
    // Tutup filter dropdown
    setShowFilter(false);
    
    // Log untuk debugging
    console.log('StatsBar: Reset filter ke default:', defaultFilters);
    
    // Gunakan onFilterChange jika tersedia
    if (onFilterChange) {
      console.log('StatsBar: Memanggil onFilterChange dengan filter default');
      
      // Pastikan format filter sesuai dengan yang diharapkan oleh HomePage
      onFilterChange({
        grade: [],
        data_source: ['fobi', 'burungnesia', 'kupunesia'],
        has_media: false,
        media_type: null,
        start_date: null,
        end_date: null
      });
    }
    
    // Jika setStats tersedia, gunakan stats dari localStorage
    if (setStats) {
      const cachedStats = localStorage.getItem('cachedStats');
      if (cachedStats) {
        console.log('StatsBar: Menggunakan cachedStats dari localStorage setelah reset filter');
        setStats(JSON.parse(cachedStats));
      }
    }
  };

  const handleSpeciesSearch = async (query, pageNum = 1) => {
    if (!query) {
      setSpeciesSuggestions([]);
      return;
    }

    setIsLoadingSpecies(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/species-suggestions?` +
        `query=${encodeURIComponent(query)}&` +
        `page=${pageNum}&` +
        `per_page=100&` +
        `include_all_taxa=true`
      );
      const responseData = await response.json();

      if (!responseData.success) {
        console.error('Error from API:', responseData.message);
        setSpeciesSuggestions([]);
        return;
      }

      const newSuggestions = responseData.data || [];
      setSpeciesSuggestions(prev => 
        pageNum === 1 ? newSuggestions : [...prev, ...newSuggestions]
      );
      setHasMore(responseData.pagination.current_page < responseData.pagination.total_pages);
      setPage(responseData.pagination.current_page);
    } catch (error) {
      console.error('Error searching species:', error);
    } finally {
      setIsLoadingSpecies(false);
    }
  };

  const getTaxonomicRankOrder = () => {
    // Urutan dari yang paling umum ke spesifik
    const ranks = [
      'kingdom',
      'phylum',
      'class',
      'order', 
      'family',
      'genus',
      'species',
      'subspecies'
    ];
    
    // Buat object untuk mapping rank ke index untuk sorting
    return ranks.reduce((acc, rank, index) => {
      acc[rank] = index;
      return acc;
    }, {});
  };

  const handleSpeciesSelect = (suggestion) => {
    // Tutup dropdown
    setShowFilter(false);
    
    // Format display name dengan scientific name terlebih dahulu
    let displayName = suggestion.scientific_name;
    if (suggestion.common_name) {
      displayName += ` (${suggestion.common_name})`;
    } else if (suggestion.rank) {
      displayName += ` - ${suggestion.rank.charAt(0).toUpperCase() + suggestion.rank.slice(1)}`;
    }
    
    setSearchParams({
      ...searchParams,
      search: suggestion.scientific_name,
      display: displayName,
      searchType: suggestion.rank,
      selectedId: suggestion.id,
      species: {
        id: suggestion.id,
        rank: suggestion.rank,
        scientific_name: suggestion.scientific_name,
        display_name: displayName,
        common_name: suggestion.common_name,
        family: suggestion.full_data?.family
      }
    });
    setSpeciesSuggestions([]);

    // Update filter dengan species yang dipilih
    if (onFilterChange) {
      onFilterChange({
        taxa_id: suggestion.id
      });
    }
  };

  // Fungsi helper untuk format tampilan
  const formatDisplayName = (item) => {
    const rank = item.rank || getTaxonomicLevel(item);
    const scientificName = item[rank] || item.scientific_name;
    const commonName = item[`cname_${rank}`] || item.common_name;

    let displayName = scientificName;
    if (commonName) {
      displayName += ` (${commonName})`;
    }

    return displayName;
  };

  const getTaxonomicLevel = (item) => {
    // Check from most general to most specific
    const ranks = [
      'domain',
      'superkingdom',
      'kingdom', 'subkingdom',
      'superphylum', 'phylum', 'subphylum',
      'superclass', 'class', 'subclass', 'infraclass',
      'superorder', 'order', 'suborder', 'infraorder',
      'superfamily', 'family', 'subfamily',
      'supertribe', 'tribe', 'subtribe',
      'genus', 'subgenus',
      'species', 'subspecies', 'variety'
    ];

    for (const rank of ranks) {
      if (item[rank]) {
        return rank;
      }
    }
    return 'species'; // default fallback
  };

  const fetchFilteredStats = async (params) => {
    try {
      const token = localStorage.getItem('jwt_token');
      const queryParams = new URLSearchParams();

      // Add search params
      if (params.search) queryParams.append('search', params.search);
      if (params.location) queryParams.append('location', params.location);
      if (params.latitude) queryParams.append('latitude', params.latitude);
      if (params.longitude) queryParams.append('longitude', params.longitude);

      // Add filter params
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.grade?.length) queryParams.append('grade', params.grade.join(','));
      if (params.data_source?.length) queryParams.append('data_source', params.data_source.join(','));
      if (params.has_media) queryParams.append('has_media', params.has_media);
      if (params.media_type) queryParams.append('media_type', params.media_type);

      const [
        burungnesiaResponse,
        kupunesiaResponse,
        fobiResponse,
        totalSpeciesResponse,
        totalContributorsResponse
      ] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/burungnesia-count?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/kupunesia-count?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/fobi-count?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/total-species?${queryParams}`),
        fetch(`${import.meta.env.VITE_API_URL}/total-contributors?${queryParams}`)
      ]);

      const [
        burungnesiaData,
        kupunesiaData,
        fobiData,
        totalSpeciesData,
        totalContributorsData
      ] = await Promise.all([
        burungnesiaResponse.json(),
        kupunesiaResponse.json(),
        fobiResponse.json(),
        totalSpeciesResponse.json(),
        totalContributorsResponse.json()
      ]);

      return {
        burungnesia: burungnesiaData.burungnesiaCount,
        kupunesia: kupunesiaData.kupunesiaCount,
        fobi: fobiData.fobiCount,
        observasi: burungnesiaData.burungnesiaCount + kupunesiaData.kupunesiaCount + fobiData.fobiCount,
        spesies: totalSpeciesData.totalSpecies,
        kontributor: totalContributorsData.totalContributors
      };
    } catch (error) {
      console.error('Error fetching filtered stats:', error);
      return null;
    }
  };

  // Buat fungsi fetchStats yang di-debounce
  const debouncedFetchStats = useCallback(
    debounce(async () => {
      try {
        const [
          burungnesiaResponse,
          kupunesiaResponse,
          fobiResponse,
          totalSpeciesResponse,
          totalContributorsResponse
        ] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/burungnesia-count`),
          fetch(`${import.meta.env.VITE_API_URL}/kupunesia-count`),
          fetch(`${import.meta.env.VITE_API_URL}/fobi-count`),
          fetch(`${import.meta.env.VITE_API_URL}/total-species`),
          fetch(`${import.meta.env.VITE_API_URL}/total-contributors`)
        ]);

        const [
          burungnesiaData,
          kupunesiaData,
          fobiData,
          totalSpeciesData,
          totalContributorsData
        ] = await Promise.all([
          burungnesiaResponse.json(),
          kupunesiaResponse.json(),
          fobiResponse.json(),
          totalSpeciesResponse.json(),
          totalContributorsResponse.json()
        ]);

        return {
          burungnesia: burungnesiaData.burungnesiaCount,
          kupunesia: kupunesiaData.kupunesiaCount,
          fobi: fobiData.fobiCount,
          observasi: burungnesiaData.burungnesiaCount + kupunesiaData.kupunesiaCount + fobiData.fobiCount,
          spesies: totalSpeciesData.totalSpecies,
          kontributor: totalContributorsData.totalContributors
        };
      } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
      }
    }, 1000),
    []
  );

  // Update handleReset
  const handleReset = async () => {
    try {
      // Reset search params
      const defaultSearchParams = {
        search: '',
        location: '',
        latitude: '',
        longitude: '',
        searchType: 'all',
        selectedId: null,
        display: '',
        species: null
      };
      
      setSearchParams(defaultSearchParams);

      // Reset filter params
      const defaultFilterParams = {
        start_date: '',
        end_date: '',
        grade: [],
        has_media: false,
        media_type: '',
        data_source: ['fobi', 'burungnesia', 'kupunesia']
      };
      
      setFilterParams(defaultFilterParams);

      // Log untuk debugging
      console.log('StatsBar: Reset semua parameter ke default');
      
      // Update centralizedFilters jika onFilterChange tersedia
      if (onFilterChange) {
        onFilterChange({
          search: '',
          polygon: null,
          start_date: null,
          end_date: null,
          latitude: null,
          longitude: null,
          radius: 10,
          grade: [],
          data_source: ['fobi', 'burungnesia', 'kupunesia'],
          has_media: false,
          media_type: null
        });
      }

      // Fetch stats default
      const newStats = await debouncedFetchStats();
      if (newStats) {
        setStats(newStats);
      }

      // Reset map jika onMapReset tersedia
      if (onMapReset) {
        onMapReset();
      }

      setShowFilter(false);
    } catch (error) {
      console.error('Error resetting stats:', error);
    }
  };

  // Cleanup pada unmount
  useEffect(() => {
    return () => {
      debouncedFetchStats.cancel();
    };
  }, [debouncedFetchStats]);

  // Fungsi untuk mengecek apakah ada filter/search aktif
  const hasActiveFilters = () => {
    return Boolean(
      searchParams.search || 
      searchParams.location || 
      searchParams.selectedId ||
      filterParams.start_date || 
      filterParams.end_date || 
      filterParams.grade.length > 0 || 
      filterParams.has_media || 
      filterParams.media_type ||
      (filterParams.data_source.length !== 3) // Cek jika tidak semua sumber data dipilih
    );
  };

  // Memoize statsData untuk mencegah re-render yang tidak perlu
  const statsData = useMemo(() => {
    const baseStats = [
      { label: 'OBSERVASI', value: safeStats.observasi, duration: 0.5 },
      { label: 'BURUNGNESIA', value: safeStats.burungnesia, duration: 1.5 },
      { label: 'KUPUNESIA', value: safeStats.kupunesia, duration: 0.5 },
      { label: 'SPESIES', value: searchParams.selectedId ? 1 : safeStats.spesies, duration: 0.5 },
      { label: 'KONTRIBUTOR', value: safeStats.kontributor, duration: 0.5 },
    ];
    return baseStats;
  }, [safeStats, searchParams.selectedId]);

  // Memoize mobileStats untuk mencegah perhitungan ulang yang tidak perlu
  const mobileStats = useMemo(() => {
    const itemsPerPage = 3;
    const pages = Math.ceil(statsData.length / itemsPerPage);
    const start = currentStatsPage * itemsPerPage;
    const end = start + itemsPerPage;
    
    return {
      currentItems: statsData.slice(start, end),
      totalPages: pages
    };
  }, [statsData, currentStatsPage]);

  // Modifikasi fungsi groupSuggestionsByHierarchy
  const groupSuggestionsByHierarchy = (suggestions) => {
    const searchTerm = searchParams.search.toLowerCase();
    // Normalisasi search term: ganti tanda "-" dengan spasi dan sebaliknya
    const normalizedSearchTerm = searchTerm.replace(/-/g, ' ');
    const alternativeSearchTerm = searchTerm.replace(/\s+/g, '-');
    
    const grouped = {
      families: [], // Untuk menyimpan family suggestions
      taxa: {}      // Untuk menyimpan genus, species, subspecies
    };
    
    // Pertama, kumpulkan semua family yang cocok dengan search term
    const matchingFamilies = new Set();
    
    // Langkah 1: Identifikasi semua family yang cocok dengan search term
    suggestions.forEach(suggestion => {
      const familyName = (suggestion.scientific_name || suggestion.full_data?.family || '').toLowerCase();
      const commonName = (suggestion.common_name || suggestion.full_data?.cname_family || '').toLowerCase();
      
      // Cek apakah family match dengan search term (normal atau alternatif)
      if ((familyName.includes(normalizedSearchTerm) || familyName.includes(alternativeSearchTerm) || 
           commonName.includes(normalizedSearchTerm) || commonName.includes(alternativeSearchTerm)) && 
          (suggestion.rank === 'family' || suggestion.full_data?.taxon_rank === 'family' || suggestion.full_data?.family)) {
        const family = suggestion.scientific_name || suggestion.full_data?.family;
        if (family) {
          matchingFamilies.add(family);
        }
      }
      
      // Cek juga common name di level lain (genus, species, subspecies)
      if (suggestion.full_data) {
        // Cek genus common name
        const genusCommonName = (suggestion.full_data.cname_genus || '').toLowerCase();
        if (genusCommonName.includes(normalizedSearchTerm) || genusCommonName.includes(alternativeSearchTerm)) {
          const family = suggestion.full_data.family;
          if (family) {
            matchingFamilies.add(family);
          }
        }
        
        // Cek species common name
        const speciesCommonName = (suggestion.full_data.cname_species || '').toLowerCase();
        if (speciesCommonName.includes(normalizedSearchTerm) || speciesCommonName.includes(alternativeSearchTerm)) {
          const family = suggestion.full_data.family;
          if (family) {
            matchingFamilies.add(family);
          }
        }
        
        // Cek subspecies common name
        if (suggestion.rank === 'subspecies') {
          const subspeciesCommonName = (suggestion.common_name || '').toLowerCase();
          if (subspeciesCommonName.includes(normalizedSearchTerm) || subspeciesCommonName.includes(alternativeSearchTerm)) {
            const family = suggestion.full_data.family;
            if (family) {
              matchingFamilies.add(family);
            }
          }
        }
        
        // Cek juga di order dan class untuk kasus seperti "elang" dan "ikan"
        const orderCommonName = (suggestion.full_data.cname_order || '').toLowerCase();
        if (orderCommonName.includes(normalizedSearchTerm) || orderCommonName.includes(alternativeSearchTerm)) {
          const family = suggestion.full_data.family;
          if (family) {
            matchingFamilies.add(family);
          }
        }
        
        const classCommonName = (suggestion.full_data.cname_class || '').toLowerCase();
        if (classCommonName.includes(normalizedSearchTerm) || classCommonName.includes(alternativeSearchTerm)) {
          const family = suggestion.full_data.family;
          if (family) {
            matchingFamilies.add(family);
          }
        }
      }
    });
    
    // Langkah 2: Proses semua suggestion
    suggestions.forEach(suggestion => {
      // Tambahkan family ke hasil jika match dengan search term atau termasuk dalam matching families
      if (suggestion.rank === 'family' || suggestion.full_data?.taxon_rank === 'family') {
        const familyName = suggestion.scientific_name || suggestion.full_data?.family;
        const commonName = suggestion.common_name || suggestion.full_data?.cname_family;
        const familyNameLower = (familyName || '').toLowerCase();
        const commonNameLower = (commonName || '').toLowerCase();
        
        if (familyNameLower.includes(normalizedSearchTerm) || familyNameLower.includes(alternativeSearchTerm) || 
            commonNameLower.includes(normalizedSearchTerm) || commonNameLower.includes(alternativeSearchTerm)) {
          grouped.families.push({
            id: suggestion.id,
            rank: 'family',
            scientific_name: familyName,
            common_name: commonName,
            full_data: suggestion.full_data
          });
        }
      }

      if (!suggestion.full_data) return;

      const family = suggestion.full_data.family;
      const genus = suggestion.full_data.genus;
      const species = suggestion.full_data.species;
      
      // Cek apakah ada kecocokan dengan search term di berbagai level
      const genusLower = (genus || '').toLowerCase();
      const speciesLower = (species || '').toLowerCase();
      const genusCommonName = (suggestion.full_data.cname_genus || '').toLowerCase();
      const speciesCommonName = (suggestion.full_data.cname_species || '').toLowerCase();
      const orderCommonName = (suggestion.full_data.cname_order || '').toLowerCase();
      const classCommonName = (suggestion.full_data.cname_class || '').toLowerCase();
      
      // Jika family ini termasuk dalam matching families atau ada match di level lain,
      // tambahkan semua taksonomi terkait
      const shouldInclude = matchingFamilies.has(family) || 
                           (genusLower.includes(normalizedSearchTerm) || genusLower.includes(alternativeSearchTerm)) ||
                           (speciesLower.includes(normalizedSearchTerm) || speciesLower.includes(alternativeSearchTerm)) ||
                           (genusCommonName.includes(normalizedSearchTerm) || genusCommonName.includes(alternativeSearchTerm)) ||
                           (speciesCommonName.includes(normalizedSearchTerm) || speciesCommonName.includes(alternativeSearchTerm)) ||
                           (suggestion.common_name && (suggestion.common_name.toLowerCase().includes(normalizedSearchTerm) || 
                                                      suggestion.common_name.toLowerCase().includes(alternativeSearchTerm))) ||
                           (orderCommonName.includes(normalizedSearchTerm) || orderCommonName.includes(alternativeSearchTerm)) ||
                           (classCommonName.includes(normalizedSearchTerm) || classCommonName.includes(alternativeSearchTerm));
      
      if (shouldInclude) {
        // Tambahkan family jika belum ada
        if (family && !grouped.families.some(f => f.scientific_name === family)) {
          grouped.families.push({
            id: suggestion.full_data.id,
            rank: 'family',
            scientific_name: family,
            common_name: suggestion.full_data.cname_family,
            full_data: suggestion.full_data
          });
        }
        
        // Tambahkan genus
        if (genus) {
          if (!grouped.taxa[genus]) {
            grouped.taxa[genus] = {
              id: suggestion.full_data.id,
              genus: genus,
              cname_genus: suggestion.full_data.cname_genus,
              species: {}
            };
          }
          
          // Tambahkan species
          if (species) {
            if (!grouped.taxa[genus].species[species]) {
              grouped.taxa[genus].species[species] = {
                data: suggestion.full_data,
                subspecies: []
              };
            }
            
            // Tambahkan subspecies jika ini adalah subspecies
            if (suggestion.rank === 'subspecies') {
              // Cek apakah subspecies ini sudah ada
              const subspeciesExists = grouped.taxa[genus].species[species].subspecies.some(
                sub => sub.scientific_name === suggestion.scientific_name
              );
              
              if (!subspeciesExists) {
                grouped.taxa[genus].species[species].subspecies.push(suggestion);
              }
            }
          }
        }
      }
    });

    // Hapus duplikat family
    grouped.families = Array.from(new Set(grouped.families.map(f => f.scientific_name)))
      .map(name => grouped.families.find(f => f.scientific_name === name));
    
    return grouped;
  };

  // Tambahkan handler untuk infinite scroll
  const handleScroll = useCallback((e) => {
    const element = e.target;
    if (
      !loading &&
      hasMore &&
      element.scrollHeight - element.scrollTop <= element.clientHeight + 100
    ) {
      handleSpeciesSearch(searchParams.search, page + 1);
    }
  }, [loading, hasMore, page, searchParams.search]);

  // Tambahkan useEffect untuk event listener scroll
  useEffect(() => {
    const container = suggestionContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Tambahkan fungsi untuk menangani perubahan pada filter sumber data
  const handleDataSourceChange = (source, isChecked) => {
    // Update filter params
    const newSources = isChecked
      ? [...filterParams.data_source, source]
      : filterParams.data_source.filter(s => s !== source);
    
    // Pastikan minimal satu sumber data dipilih
    if (newSources.length > 0) {
      // Update state lokal
      setFilterParams({...filterParams, data_source: newSources});
      
      // Panggil onFilterChange untuk memperbarui centralizedFilters
      if (onFilterChange) {
        onFilterChange({
          data_source: newSources
        });
        
        // Tetap gunakan fetchFilteredStats untuk backward compatibility
        fetchFilteredStats({
          ...filterParams,
          data_source: newSources
        });
      }
    }
  };

  // Tambahkan fungsi untuk mengurutkan hasil pencarian berdasarkan relevansi
  const sortSuggestionsByRelevance = (suggestions, searchTerm) => {
    const normalizedSearchTerm = searchTerm.toLowerCase().replace(/-/g, ' ');
    const alternativeSearchTerm = searchTerm.toLowerCase().replace(/\s+/g, '-');
    
    return [...suggestions].sort((a, b) => {
      // Prioritaskan exact match pada common name
      const aCommonName = (a.common_name || '').toLowerCase();
      const bCommonName = (b.common_name || '').toLowerCase();
      
      // Exact match pada common name
      if (aCommonName === normalizedSearchTerm || aCommonName === alternativeSearchTerm) return -1;
      if (bCommonName === normalizedSearchTerm || bCommonName === alternativeSearchTerm) return 1;
      
      // Starts with pada common name
      if (aCommonName.startsWith(normalizedSearchTerm) || aCommonName.startsWith(alternativeSearchTerm)) return -1;
      if (bCommonName.startsWith(normalizedSearchTerm) || bCommonName.startsWith(alternativeSearchTerm)) return 1;
      
      // Contains pada common name
      const aContainsCommon = aCommonName.includes(normalizedSearchTerm) || aCommonName.includes(alternativeSearchTerm);
      const bContainsCommon = bCommonName.includes(normalizedSearchTerm) || bCommonName.includes(alternativeSearchTerm);
      if (aContainsCommon && !bContainsCommon) return -1;
      if (!aContainsCommon && bContainsCommon) return 1;
      
      // Prioritaskan species di atas family
      const aRankOrder = getRankOrder(a.rank);
      const bRankOrder = getRankOrder(b.rank);
      return aRankOrder - bRankOrder;
    });
  };
  
  // Helper function untuk mendapatkan urutan rank
  const getRankOrder = (rank) => {
    const rankOrder = {
      'species': 1,
      'subspecies': 2,
      'genus': 3,
      'family': 4,
      'order': 5,
      'class': 6
    };
    return rankOrder[rank] || 99;
  };

  return (
    <div className="flex flex-col items-center bg-[#121212] mt-10 md:mt-12 md:p-0 text-white w-full md:flex-row md:justify-between relative">
      <div className="hidden md:flex flex-col items-center w-full md:flex-row md:justify-start md:w-auto mt-2">
        <div className="relative w-full md:w-60 md:mr-2">
          <input
            type="text"
            placeholder="Spesies/ genus/ famili"
            value={searchParams.display || searchParams.search}
            onChange={(e) => {
              const value = e.target.value;
              setSearchParams({
                ...searchParams,
                search: value,
                display: value,
                selectedId: null
              });
            }}
            className="m-2 p-2 w-full md:w-60 border-none text-sm rounded bg-[#1e1e1e] text-white placeholder-gray-400"
          />
          <FontAwesomeIcon icon={faSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />

          {speciesSuggestions.length > 0 && !searchParams.selectedId && (
            <div 
              ref={suggestionRef}
              className="absolute z-50 w-[400px] bg-[#1e1e1e] mt-1 rounded shadow-lg max-h-[400px] overflow-y-auto"
              style={{
                left: '0',
                minWidth: 'max-content',
                maxWidth: '500px'
              }}
            >
              {/* Loading indicator di bagian atas */}
              {isLoadingSpecies && page === 1 && (
                <div className="p-3 text-center text-gray-300 border-b border-[#444]">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-500 mr-2"></div>
                  Mencari...
                </div>
              )}

              {/* Render suggestions */}
              {groupSuggestionsByHierarchy(sortSuggestionsByRelevance(speciesSuggestions, searchParams.search)).families.map((family, index) => (
                <div key={`family-${index}`}>
                  <div className="text-[10px] text-gray-400 px-3 pt-2">
                    Family
                  </div>
                  <div
                    className="p-3 bg-[#333] cursor-pointer text-gray-200 border-b border-[#444] hover:bg-[#333]"
                    onClick={() => handleSpeciesSelect({
                      id: family.id,
                      rank: 'family',
                      scientific_name: family.scientific_name,
                      common_name: family.common_name
                    })}
                  >
                    <div className="font-medium text-sm">
                      <i>{family.scientific_name}</i>
                      {family.common_name && <span className="text-gray-400"> ({family.common_name})</span>}
                    </div>
                  </div>
                </div>
              ))}

              {Object.entries(groupSuggestionsByHierarchy(sortSuggestionsByRelevance(speciesSuggestions, searchParams.search)).taxa).map(([genusName, genusData]) => (
                <React.Fragment key={genusName}>
                  {/* Genus Header */}
                  <div className="text-[10px] text-gray-400 px-3 pt-2">
                    Genus
                  </div>
                  <div
                    className="p-3 bg-[#333] cursor-pointer text-gray-200 border-b border-[#444] hover:bg-[#333]"
                    onClick={() => handleSpeciesSelect({
                      id: genusData.id,
                      rank: 'genus',
                      scientific_name: genusData.genus,
                      common_name: genusData.cname_genus
                    })}
                  >
                    <div className="font-medium text-sm">
                      <i>{genusData.genus}</i>
                      {genusData.cname_genus && <span className="text-gray-400"> ({genusData.cname_genus})</span>}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Family: {genusData.species[Object.keys(genusData.species)[0]]?.data?.family || ''}
                    </div>
                  </div>

                  {/* Species and their Subspecies */}
                  {Object.entries(genusData.species).map(([speciesName, speciesData]) => (
                    <React.Fragment key={speciesName}>
                      {/* Species */}
                      <div className="text-[10px] text-gray-400 px-3 pt-2">
                        Species
                      </div>
                      <div
                        className="p-3 pl-6 cursor-pointer text-gray-200 border-b border-[#444] hover:bg-[#333]"
                        onClick={() => handleSpeciesSelect({
                          id: speciesData.data.id,
                          rank: 'species',
                          scientific_name: speciesData.data.species,
                          common_name: speciesData.data.cname_species
                        })}
                      >
                        <div className="font-medium text-sm">
                          <i>{speciesData.data.species}</i>
                          {speciesData.data.cname_species && <span className="text-gray-400"> ({speciesData.data.cname_species})</span>}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Family: {speciesData.data.family}
                        </div>
                      </div>

                      {/* Subspecies */}
                      {speciesData.subspecies.map((subspecies, index) => (
                        <React.Fragment key={index}>
                          <div className="text-[10px] text-gray-400 px-3 pt-2">
                            Subspecies
                          </div>
                          <div
                            className="p-3 pl-9 cursor-pointer text-gray-200 border-b border-[#444] hover:bg-[#333]"
                            onClick={() => handleSpeciesSelect({
                              ...subspecies
                            })}
                          >
                            <div className="font-medium text-sm">
                              <i>{subspecies.scientific_name}</i>
                              {subspecies.common_name && <span className="text-gray-400"> ({subspecies.common_name})</span>}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              Family: {subspecies.full_data.family}
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}

              {/* Tampilkan pesan jika tidak ada hasil */}
              {speciesSuggestions.length === 0 && !isLoadingSpecies && (
                <div className="p-3 text-center text-gray-300">
                  Tidak ada hasil ditemukan
                </div>
              )}

              {/* Loading indicator untuk infinite scroll */}
              {isLoadingSpecies && page > 1 && (
                <div className="p-3 text-center text-gray-300 border-t border-[#444]">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-500 mr-2"></div>
                  Memuat lebih banyak...
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative w-full md:w-60 md:mr-5">
          <input
            type="text"
            placeholder="Lokasi"
            value={searchParams.location}
            onChange={(e) => setSearchParams({...searchParams, location: e.target.value})}
            className="m-2 p-2 w-full md:w-60 border-none text-sm rounded bg-[#1e1e1e] text-white placeholder-gray-400"
          />
          <FontAwesomeIcon
            icon={faMapMarkerAlt}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          />

          {locationSuggestions.length > 0 && (
            <div 
              ref={locationSuggestionRef} 
              className="absolute z-50 w-[400px] bg-[#1e1e1e] mt-1 rounded shadow-lg max-h-[300px] overflow-y-auto"
              style={{
                left: '0',
                minWidth: 'max-content',
                maxWidth: '500px'
              }}
            >
              {/* Loading indicator */}
              {isLoadingLocation && (
                <div className="p-3 text-center text-gray-300 border-b border-[#444]">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-500 mr-2"></div>
                  Mencari lokasi...
                </div>
              )}

              {/* Group locations by type */}
              {locationSuggestions.map((location, index) => (
                <React.Fragment key={index}>
                  {/* Location type header */}
                  <div className="text-[10px] text-gray-400 px-3 pt-2">
                    {location.type === 'island' ? 'Pulau' :
                     location.type === 'city' ? 'Kota' :
                     location.type === 'town' ? 'Kota/Kabupaten' :
                     location.type === 'municipality' ? 'Kota Madya' :
                     location.type === 'county' ? 'Kabupaten' : 'Area'}
                  </div>
                  <div
                    className="p-3 bg-[#333] cursor-pointer text-gray-200 border-b border-[#444] hover:bg-[#333]"
                    onClick={() => handleLocationSelect(location)}
                  >
                    <div className="font-medium text-sm">
                      {location.display_name}
                    </div>
                  </div>
                </React.Fragment>
              ))}

              {/* Empty state */}
              {locationSuggestions.length === 0 && !isLoadingLocation && (
                <div className="p-3 text-center text-gray-300">
                  Tidak ada lokasi ditemukan
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex space-x-2 mt-0 md:mt-0">
          <button
            onClick={handleSearch}
            className="bg-[#1a73e8] border-none p-2 px-4 cursor-pointer rounded hover:bg-[#0d47a1]"
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="bg-[#1a73e8] border-none p-2 px-4 cursor-pointer rounded hover:bg-[#0d47a1]"
          >
            <FontAwesomeIcon icon={showFilter ? faTimes : faFilter} />
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="filter-panel absolute top-full left-0 bg-[#121212] p-4 shadow-lg z-50 w-full md:w-80 rounded-b border border-[#333]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-200 font-bold">Filter</h3>
            <button
              onClick={handleResetFilter}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Reset
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-gray-200 mb-2 text-sm font-medium">Sumber Data</label>
            <div className="space-y-2">
              {['fobi', 'burungnesia', 'kupunesia'].map((source) => (
                <label key={source} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filterParams.data_source.includes(source)}
                    onChange={(e) => handleDataSourceChange(source, e.target.checked)}
                    className="mr-2 accent-blue-500"
                  />
                  <span className="text-sm text-gray-300 capitalize">{source}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-200 mb-2 text-sm font-medium">Tanggal Mulai</label>
            <input
              type="date"
              value={filterParams.start_date}
              onChange={(e) => setFilterParams({...filterParams, start_date: e.target.value})}
              className="w-full p-2 border rounded bg-[#1e1e1e] border-[#444] text-gray-200"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-200 mb-2 text-sm font-medium">Tanggal Akhir</label>
            <input
              type="date"
              value={filterParams.end_date}
              onChange={(e) => setFilterParams({...filterParams, end_date: e.target.value})}
              className="w-full p-2 border rounded bg-[#1e1e1e] border-[#444] text-gray-200"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-200 mb-2 text-sm font-medium">Grade</label>
            <div className="space-y-2">
              {[
                { value: 'research grade', label: 'ID Lengkap' },
                { value: 'needs id', label: 'Bantu Iden' },
                { value: 'low quality id', label: 'ID Kurang' },
                { value: 'casual', label: 'Casual' }
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filterParams.grade.includes(option.value)}
                    onChange={(e) => {
                      const newGrades = e.target.checked
                        ? [...filterParams.grade, option.value]
                        : filterParams.grade.filter(g => g !== option.value);
                      setFilterParams({...filterParams, grade: newGrades});
                    }}
                    className="mr-2 accent-blue-500"
                  />
                  <span className="text-sm text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-200 mb-2 text-sm font-medium">Tipe Media</label>
            <select
              value={filterParams.media_type}
              onChange={(e) => setFilterParams({...filterParams, media_type: e.target.value})}
              className="w-full p-2 border rounded bg-[#1e1e1e] border-[#444] text-gray-200"
            >
              <option value="">Semua Media</option>
              <option value="photo">Foto</option>
              <option value="audio">Audio</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                checked={filterParams.has_media}
                onChange={(e) => setFilterParams({...filterParams, has_media: e.target.checked})}
                className="mr-2 accent-blue-500"
              />
              Hanya tampilkan dengan media
            </label>
          </div>

          <button
            onClick={handleApplyFilter}
            className="w-full bg-[#1a73e8] text-white p-2 rounded hover:bg-[#0d47a1]"
          >
            Terapkan Filter
          </button>
        </div>
      )}

      {/* Tombol reset hanya muncul jika ada filter aktif */}
      {hasActiveFilters() && (
        <div className="absolute left-1/2 transform -translate-x-1/2 top-4 z-10">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-[#121212] text-white rounded-full shadow-md hover:bg-[#1e1e1e] transition-all duration-200 flex items-center space-x-2 text-sm font-medium border border-[#333]"
          >
            <FontAwesomeIcon icon={faTimes} className="text-sm" />
            <span>Reset Filter</span>
          </button>
        </div>
      )}

      <div className="flex flex-wrap justify-center mt-5 md:mt-2 md:justify-end w-full">
        {/* Mobile Stats View */}
        <div className="block md:hidden w-full px-4 overflow-hidden">
          <div 
            {...swipeHandlers}
            className="relative touch-pan-y"
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={currentStatsPage}
                className="flex justify-between items-center"
                initial={{ 
                  x: direction > 0 ? 300 : -300,
                  opacity: 0 
                }}
                animate={{ 
                  x: 0,
                  opacity: 1 
                }}
                exit={{ 
                  x: direction < 0 ? 300 : -300,
                  opacity: 0 
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
              >
                {mobileStats.currentItems.map((stat, index) => (
                  <div 
                    key={index} 
                    className="flex-1 text-center px-2"
                  >
                    <small className="text-sm font-bold text-[#1a73e8] block">
                      <CountUp 
                        end={stat.value} 
                        duration={stat.duration}
                        preserveValue={true}
                      />
                    </small>
                    <small className="block text-xs whitespace-nowrap text-gray-300">
                      {stat.label}
                    </small>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Stats View - tidak berubah */}
        <div className="hidden md:flex flex-wrap justify-center md:justify-end w-full">
          {statsData.map((stat, index) => (
            <div key={index} className="m-2 text-center w-1/3 md:w-auto">
              <small className="text-sm font-bold text-[#1a73e8]">
                <CountUp end={stat.value} duration={stat.duration} />
              </small>
              <small className="block text-xs text-gray-300">{stat.label}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

StatsBar.propTypes = {
  stats: PropTypes.shape({
    observasi: PropTypes.number,
    burungnesia: PropTypes.number,
    kupunesia: PropTypes.number,
    fobi: PropTypes.number,
    fotoAudio: PropTypes.number,
    spesies: PropTypes.number,
    kontributor: PropTypes.number,
  }).isRequired,
  onSearch: PropTypes.func.isRequired,
  setStats: PropTypes.func.isRequired,
  onMapReset: PropTypes.func,
  onSpeciesSelect: PropTypes.func,
  selectedSpecies: PropTypes.shape({
    id: PropTypes.string,
    rank: PropTypes.string,
    scientific_name: PropTypes.string,
    display_name: PropTypes.string,
    family: PropTypes.shape({
      id: PropTypes.string,
      rank: PropTypes.string,
      scientific_name: PropTypes.string,
      display_name: PropTypes.string,
    }),
  }),
  onFilterChange: PropTypes.func,
};

export default StatsBar;
