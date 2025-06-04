import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSave, faTimes, faArrowLeft, faMapMarkerAlt, faImage, faTrash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import Header from '../components/Header';
import defaultPlaceholder from '../assets/icon/FOBI.png';
import defaultPlaceholderKupunesia from '../assets/icon/kupnes.png';
import defaultPlaceholderBurungnesia from '../assets/icon/icon.png';
import { format, parse } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;

// Definisikan custom marker icon
const customIcon = new L.Icon({
    iconUrl: 'https://cdn.mapmarker.io/api/v1/pin?size=50&background=%231a73e8&icon=fa-location-dot&color=%23FFFFFF',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50],
    className: 'custom-marker-icon'
});

// Style untuk marker
const markerStyle = `
  .custom-marker-icon {
    background: none !important;
    border: none !important;
    box-shadow: none !important;
  }
`;

// Map marker component
const LocationMarker = ({ position, setPosition }) => {
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? (
    <Marker position={position} icon={customIcon} />
  ) : null;
};

const EditObservation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [observation, setObservation] = useState(null);
  const [position, setPosition] = useState(null);
  const [formData, setFormData] = useState({
    scientific_name: '',
    taxon_id: '',
    kingdom: '',
    phylum: '',
    class: '',
    order: '',
    family: '',
    genus: '',
    species: '',
    latitude: '',
    longitude: '',
    observation_date: '',
    observation_details: {}
  });
  const [medias, setMedias] = useState([]);
  const [newMedias, setNewMedias] = useState([]);
  const [mediaToDelete, setMediaToDelete] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [userData, setUserData] = useState(null);
  const [locationCache, setLocationCache] = useState({});
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Get user data
  useEffect(() => {
    const user = {
      id: localStorage.getItem('user_id'),
      name: localStorage.getItem('username'),
      email: localStorage.getItem('email'),
      profile_picture: localStorage.getItem('profile_picture'),
    };
    setUserData(user);
  }, []);

  // Fungsi untuk format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'd MMMM yyyy', { locale: id });
  };

  // Fungsi untuk format tanggal ke format ISO untuk input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'yyyy-MM-dd');
  };

  // Fungsi untuk mendapatkan nama lokasi dari koordinat
  const getLocationName = async (latitude, longitude) => {
    // Cek cache terlebih dahulu
    const cacheKey = `${latitude},${longitude}`;
    if (locationCache[cacheKey]) {
      return locationCache[cacheKey];
    }

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FOBI-App'
          }
        }
      );

      let locationName = '';
      const address = response.data.address;

      if (address) {
        const components = [];
        
        // Urutkan komponen alamat dari yang paling spesifik ke umum
        if (address.village || address.suburb) components.push(address.village || address.suburb);
        if (address.city || address.town || address.municipality) 
          components.push(address.city || address.town || address.municipality);
        if (address.state) components.push(address.state);
        if (address.country) components.push(address.country);

        locationName = components.join(', ');
      } else {
        locationName = response.data.display_name;
      }

      // Simpan ke cache
      setLocationCache(prev => ({
        ...prev,
        [cacheKey]: locationName
      }));

      return locationName;
    } catch (error) {
      console.error('Error fetching location name:', error);
      return `${latitude}, ${longitude}`;
    }
  };

  // Fetch observation data
  useEffect(() => {
    const fetchObservation = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('jwt_token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/user-observations/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (response.data.success) {
          const data = response.data.data;
          console.log('Data observasi dari server:', data);
          
          // Pastikan latitude dan longitude valid
          let lat = 0;
          let lng = 0;
          
          if (data.latitude !== undefined && data.latitude !== null) {
            lat = parseFloat(data.latitude);
            if (isNaN(lat)) lat = 0;
          }
          
          if (data.longitude !== undefined && data.longitude !== null) {
            lng = parseFloat(data.longitude);
            if (isNaN(lng)) lng = 0;
          }
          
          const locationName = await getLocationName(lat, lng);
          
          // Pastikan field wajib selalu ada dan dalam format yang benar
          const formattedData = {
            scientific_name: data.scientific_name || '',
            latitude: lat,
            longitude: lng,
            taxon_id: data.taxon_id || data.taxa_id || '',
            kingdom: data.kingdom || '',
            phylum: data.phylum || '',
            class: data.class || '',
            order: data.order || '',
            family: data.family || '',
            genus: data.genus || '',
            species: data.species || '',
            observation_details: data.observation_details || data.additional_note || {},
            location_name: locationName,
            observation_date: formatDateForInput(data.date || data.observation_date || data.tgl_pengamatan)
          };
          
          console.log('Data yang diformat dengan taksonomi:', formattedData);
          setFormData(formattedData);
          
          // Set position setelah formData diatur
          if (!isNaN(lat) && !isNaN(lng)) {
            setPosition([lat, lng]);
          }
          
          setMedias(data.medias || []);
        } else {
          setError(response.data.message || 'Gagal memuat data observasi');
        }
      } catch (err) {
        console.error('Error fetching observation:', err);
        setError('Gagal terhubung ke server. Silakan coba lagi nanti.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchObservation();
    }
  }, [id]);

  // Update position when lat/lng changes
  useEffect(() => {
    if (formData.latitude !== undefined && formData.longitude !== undefined) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition([lat, lng]);
      }
    }
  }, [formData.latitude, formData.longitude]);

  // Update lat/lng when position changes
  useEffect(() => {
    if (position && position.length === 2) {
      const [lat, lng] = position;
      if (!isNaN(lat) && !isNaN(lng)) {
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
      }
    }
  }, [position]);

  // Generate preview URLs for new media
  useEffect(() => {
    const previews = newMedias.map(file => URL.createObjectURL(file));
    setPreviewUrls(previews);

    // Cleanup
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [newMedias]);

  // Fungsi untuk mendapatkan nama ilmiah dari nama lengkap
  const extractScientificName = (fullName) => {
    if (!fullName) return '';

    const parts = fullName.split(' ');
    const scientificNameParts = parts.filter(part => {
      if (part.includes('(') || part.includes(')')) return false;
      if (/\d/.test(part)) return false;
      if (parts.indexOf(part) > 1 && /^[A-Z]/.test(part)) return false;
      return true;
    });

    return scientificNameParts.join(' ');
  };

  // Handle input change with autocomplete for scientific_name
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Jika yang diubah adalah scientific_name, reset semua data taksonomi
    if (name === 'scientific_name') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // Reset semua data taksonomi ke string kosong
        taxon_id: '',
        kingdom: '',
        phylum: '',
        class: '',
        order: '',
        family: '',
        genus: '',
        species: ''
      }));
    } else {
      // Untuk field lain, update seperti biasa
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Autocomplete for scientific_name
    if (name === 'scientific_name') {
      // Jika inputnya "Unknown", atur taxon_rank ke UNKNOWN
      if (value.toLowerCase() === 'unknown') {
        setFormData(prev => ({
          ...prev,
          scientific_name: 'Unknown',
          taxon_id: '',
          kingdom: '',
          phylum: '',
          class: '',
          order: '',
          family: '',
          genus: '',
          species: ''
        }));
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (!value) {
        setFormData(prev => ({
          ...prev,
          scientific_name: '',
          taxon_id: '',
          kingdom: '',
          phylum: '',
          class: '',
          order: '',
          family: '',
          genus: '',
          species: ''
        }));
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        if (value.length > 2) {
          try {
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            
            setIsLoadingSuggestions(true);
            setSuggestions([]);

            const token = localStorage.getItem('jwt_token');
            const response = await axios.get(
              `${import.meta.env.VITE_API_URL}/taxonomy/search?q=${encodeURIComponent(value)}&page=1&per_page=20`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                signal: abortControllerRef.current.signal
              }
            );

            if (response.data.success) {
              setSuggestions(response.data.data);
              setShowSuggestions(true);
            } else {
              setSuggestions([]);
              setShowSuggestions(false);
            }
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error('Error fetching suggestions:', error);
              setSuggestions([]);
              setShowSuggestions(false);
            }
          } finally {
            setIsLoadingSuggestions(false);
          }
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 300);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    console.log("Suggestion selected:", suggestion);
    
    // Extract all taxonomy data from the suggestion
    const updatedData = {
      ...formData,
      scientific_name: suggestion.scientific_name || '',
      // Selalu atur semua field taksonomi ke string kosong terlebih dahulu
      taxon_id: '',
      kingdom: '',
      phylum: '',
      class: '',
      order: '',
      family: '',
      genus: '',
      species: ''
    };
    
    // Kemudian hanya isi field yang ada di data taksa baru
    if (suggestion.full_data?.id) {
      updatedData.taxon_id = String(suggestion.full_data.id);
    }
    
    if (suggestion.full_data?.kingdom) {
      updatedData.kingdom = suggestion.full_data.kingdom;
    }
    
    if (suggestion.full_data?.phylum) {
      updatedData.phylum = suggestion.full_data.phylum;
    }
    
    if (suggestion.full_data?.class) {
      updatedData.class = suggestion.full_data.class;
    }
    
    if (suggestion.full_data?.order) {
      updatedData.order = suggestion.full_data.order;
    }
    
    if (suggestion.full_data?.family) {
      updatedData.family = suggestion.full_data.family;
    }
    
    if (suggestion.full_data?.genus) {
      updatedData.genus = suggestion.full_data.genus;
    }
    
    if (suggestion.full_data?.species) {
      updatedData.species = suggestion.full_data.species;
    }

    console.log("Updated formData with taxonomy:", updatedData);
    setFormData(updatedData);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle input blur
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Render taxonomy suggestions
  const renderTaxonSuggestions = (searchResults) => {
    // Gunakan Map untuk melacak item yang sudah dirender berdasarkan scientific_name dan rank
    const renderedItemsMap = new Map();
    
    // Filter duplikasi sebelum rendering
    const uniqueResults = searchResults.filter(taxon => {
      // Buat kunci unik berdasarkan scientific_name dan rank
      const key = `${taxon.scientific_name}-${taxon.rank}`;
      
      if (renderedItemsMap.has(key)) {
        return false; // Item duplikat, lewati
      }
      
      renderedItemsMap.set(key, true);
      return true;
    });
    
    return uniqueResults.map((taxon, index) => {
      // Gunakan ID taxa jika tersedia, jika tidak gunakan kombinasi rank-scientific_name-index
      const uniqueKey = taxon.full_data?.id || `${taxon.rank}-${taxon.scientific_name}-${index}`;
      
      let familyContext = '';
      if (taxon.full_data) {
        const ranks = [];
        
        if (taxon.full_data.family) {
          ranks.push(`Family: ${taxon.full_data.family}${taxon.full_data.cname_family ? ` (${taxon.full_data.cname_family})` : ''}`);
        }
        
        if (taxon.full_data.order) {
          ranks.push(`Order: ${taxon.full_data.order}${taxon.full_data.cname_order ? ` (${taxon.full_data.cname_order})` : ''}`);
        }
        
        if (taxon.full_data.class) {
          ranks.push(`Class: ${taxon.full_data.class}${taxon.full_data.cname_class ? ` (${taxon.full_data.cname_class})` : ''}`);
        }
        
        familyContext = ranks.join(' | ');
      }
      
      return (
        <div
          key={uniqueKey}
          onClick={() => handleSuggestionClick(taxon)}
          className="p-2 hover:bg-[#3c3c3c] cursor-pointer border-b border-[#444]"
        >
          <div className={`${taxon.rank === 'species' ? 'italic' : ''} text-[#e0e0e0] font-medium`}>
            {taxon.scientific_name}
            {taxon.common_name && <span className="not-italic"> | {taxon.common_name}</span>}
            <span className="text-gray-400 text-sm not-italic"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
          </div>
          
          {familyContext && (
            <div className="text-sm text-gray-400 ml-2 mt-1">
              {familyContext}
            </div>
          )}
        </div>
      );
    });
  };

  // Handle observation details changes
  const handleDetailsChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      observation_details: {
        ...prev.observation_details,
        [key]: value
      }
    }));
  };

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewMedias(prev => [...prev, ...filesArray]);
    }
  };

  // Remove new media
  const handleRemoveNewMedia = (index) => {
    setNewMedias(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle media to delete
  const handleToggleDeleteMedia = (mediaId) => {
    if (mediaToDelete.includes(mediaId)) {
      setMediaToDelete(prev => prev.filter(id => id !== mediaId));
    } else {
      setMediaToDelete(prev => [...prev, mediaId]);
    }
  };

  // Improve handleSubmit to correctly send taxonomy data
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      // Log data form untuk debugging
      console.log('Form data sebelum validasi:', formData);
      console.log('taxon_id type:', typeof formData.taxon_id, 'value:', formData.taxon_id);

      // Validasi data wajib
      if (!formData.scientific_name || formData.latitude === undefined || formData.longitude === undefined) {
        setError('Nama ilmiah dan lokasi (latitude/longitude) harus diisi');
        setSaving(false);
        return;
      }

      // Jika ada file media baru atau media yang akan dihapus, gunakan FormData
      if (newMedias.length > 0 || mediaToDelete.length > 0) {
        // Create form data untuk mengirim file
        const submitData = new FormData();
        
        // Pastikan field wajib selalu ada dan dalam format yang benar
        submitData.append('scientific_name', String(formData.scientific_name).trim());
        
        // Pastikan latitude dan longitude adalah string dari angka yang valid
        const lat = parseFloat(String(formData.latitude));
        const lng = parseFloat(String(formData.longitude));
        
        if (isNaN(lat) || isNaN(lng)) {
          console.error('Latitude atau longitude tidak valid:', {
            latitude: formData.latitude,
            longitude: formData.longitude,
            parsedLatitude: lat,
            parsedLongitude: lng
          });
          setError('Latitude atau longitude tidak valid. Pastikan nilai koordinat berupa angka.');
          setSaving(false);
          return;
        }
        
        submitData.append('latitude', String(lat));
        submitData.append('longitude', String(lng));
        
        // Add taxonomy data - pastikan semua nilai dikonversi ke string
        // Selalu kirim taxon_id, bahkan jika kosong
        submitData.append('taxon_id', String(formData.taxon_id || ''));
        
        // Selalu kirim semua field taksonomi, bahkan jika kosong
        submitData.append('kingdom', String(formData.kingdom || ''));
        submitData.append('phylum', String(formData.phylum || ''));
        submitData.append('class', String(formData.class || ''));
        submitData.append('order', String(formData.order || ''));
        submitData.append('family', String(formData.family || ''));
        submitData.append('genus', String(formData.genus || ''));
        submitData.append('species', String(formData.species || ''));
        
        if (formData.observation_date) submitData.append('observation_date', formData.observation_date);
        
        // Observation details
        if (formData.observation_details && Object.keys(formData.observation_details).length > 0) {
          submitData.append('observation_details', JSON.stringify(formData.observation_details));
        }

        // Add media to delete
        mediaToDelete.forEach((mediaId, index) => {
          submitData.append(`media_to_delete[${index}]`, mediaId);
        });

        // Add new media files
        newMedias.forEach((file, index) => {
          submitData.append(`new_media[${index}]`, file);
        });

        // Debug: log form data yang akan dikirim
        console.log('Form data yang akan dikirim:');
        for (let pair of submitData.entries()) {
          console.log(pair[0] + ': ' + pair[1]);
        }

        // Send to API
        const token = localStorage.getItem('jwt_token');
        const response = await axios.put(
          `${import.meta.env.VITE_API_URL}/user-observations/${id}`,
          submitData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        if (response.data.success) {
          toast.success('Observasi berhasil diperbarui');
          // Navigate back to list
          navigate('/my-observations');
        } else {
          setError(response.data.message || 'Gagal menyimpan perubahan');
        }
      } else {
        // Jika tidak ada file, gunakan JSON biasa
        const jsonData = {
          scientific_name: String(formData.scientific_name).trim(),
          latitude: parseFloat(String(formData.latitude)),
          longitude: parseFloat(String(formData.longitude)),
          // Selalu kirim semua field taksonomi, bahkan jika kosong
          taxon_id: String(formData.taxon_id || ''),
          kingdom: String(formData.kingdom || ''),
          phylum: String(formData.phylum || ''),
          class: String(formData.class || ''),
          order: String(formData.order || ''),
          family: String(formData.family || ''),
          genus: String(formData.genus || ''),
          species: String(formData.species || '')
        };
        
        // Pastikan nilai latitude dan longitude adalah angka yang valid
        if (isNaN(jsonData.latitude) || isNaN(jsonData.longitude)) {
          console.error('Latitude atau longitude tidak valid:', {
            latitude: formData.latitude,
            longitude: formData.longitude,
            parsedLatitude: jsonData.latitude,
            parsedLongitude: jsonData.longitude
          });
          setError('Latitude atau longitude tidak valid. Pastikan nilai koordinat berupa angka.');
          setSaving(false);
          return;
        }
        
        if (formData.observation_date) jsonData.observation_date = formData.observation_date;
        
        // Observation details
        if (formData.observation_details && Object.keys(formData.observation_details).length > 0) {
          jsonData.observation_details = formData.observation_details;
        }
        
        console.log('JSON data yang akan dikirim:', jsonData);
        
        // Send to API
        const token = localStorage.getItem('jwt_token');
        const response = await axios.put(
          `${import.meta.env.VITE_API_URL}/user-observations/${id}`,
          jsonData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.success) {
          toast.success('Observasi berhasil diperbarui');
          // Navigate back to list
          navigate('/my-observations');
        } else {
          setError(response.data.message || 'Gagal menyimpan perubahan');
        }
      }
    } catch (err) {
      console.error('Error saving observation:', err);
      
      // Log detail error untuk debugging
      if (err.response) {
        console.error('Error response status:', err.response.status);
        console.error('Error response headers:', err.response.headers);
        console.error('Error response data:', err.response.data);
        
        // Handle validation errors
        if (err.response.status === 422 && err.response.data.errors) {
          console.error('Validation errors:', err.response.data.errors);
          const errorMessages = Object.values(err.response.data.errors).flat().join('\n');
          setError(`Validasi gagal:\n${errorMessages}`);
        } 
        // Handle SQL errors related to unknown columns
        else if (err.response.data.message && err.response.data.message.includes('Unknown column')) {
          console.error('SQL Error - Unknown column:', err.response.data.message);
          
          // Extract column name from error message
          const match = err.response.data.message.match(/Unknown column '([^']+)'/);
          const columnName = match ? match[1] : 'unknown';
          
          // Retry without the problematic field
          console.log(`Retrying without the problematic field: ${columnName}`);
          
          // Create a new form data without the problematic field
          const cleanedFormData = { ...formData };
          delete cleanedFormData[columnName];
          
          // Set the cleaned form data and retry submission
          setFormData(cleanedFormData);
          setTimeout(() => {
            // Retry submission after a short delay
            handleSubmit(e);
          }, 500);
          
          return; // Exit early to avoid setting generic error message
        } else {
          setError(err.response.data.message || 'Gagal menyimpan perubahan');
        }
      } else {
        setError('Gagal terhubung ke server');
      }
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    navigate('/my-observations');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <>
      <style>{markerStyle}</style>
      <div className="min-h-screen bg-[#121212] text-[#e0e0e0] pb-8">
        <Header userData={userData} />

        <div className="container mx-auto px-4 py-8 mt-16">
          <div className="mb-6 flex items-center">
            <button
              onClick={() => navigate('/my-observations')}
              className="mr-4 text-[#aaa] hover:text-[#e0e0e0]"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <h1 className="text-2xl font-bold text-[#e0e0e0]">Edit Observasi</h1>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-[#1a73e8]" />
              <span className="ml-3 text-xl">Memuat data observasi...</span>
            </div>
          ) : error ? (
            <div className="bg-[#3a0f0f] border border-red-700 text-red-300 p-4 rounded-lg mb-6">
              <div className="flex items-center mb-2">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                <span className="font-bold">Error</span>
              </div>
              {error.includes('\n') ? (
                <div>
                  {error.split('\n').map((line, index) => (
                    <p key={index} className="mb-1">{line}</p>
                  ))}
                </div>
              ) : (
                <p>{error}</p>
              )}
              <button
                onClick={() => navigate('/my-observations')}
                className="mt-4 px-4 py-2 bg-[#323232] text-[#e0e0e0] rounded hover:bg-[#3c3c3c]"
              >
                Kembali ke Daftar Observasi
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-[#1e1e1e] p-4 rounded-lg shadow-md border border-[#333]">
                  <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-[#333]">Informasi Dasar</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="scientific_name" className="block text-sm font-medium mb-2">
                        Nama Ilmiah <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="scientific_name"
                          name="scientific_name"
                          value={formData.scientific_name}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder="Masukkan nama ilmiah"
                          className="w-full p-3 bg-[#2c2c2c] border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent text-[#e0e0e0]"
                          required
                        />
                        
                        {/* Hidden input fields untuk data taksonomi */}
                        <input type="hidden" name="taxon_id" value={formData.taxon_id ? String(formData.taxon_id) : ''} />
                        <input type="hidden" name="kingdom" value={formData.kingdom || ''} />
                        <input type="hidden" name="phylum" value={formData.phylum || ''} />
                        <input type="hidden" name="class" value={formData.class || ''} />
                        <input type="hidden" name="order" value={formData.order || ''} />
                        <input type="hidden" name="family" value={formData.family || ''} />
                        <input type="hidden" name="genus" value={formData.genus || ''} />
                        <input type="hidden" name="species" value={formData.species || ''} />
                        
                        {/* Suggestions dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-[#2c2c2c] border border-[#444] rounded-lg shadow-lg overflow-y-auto max-h-60">
                            {renderTaxonSuggestions(suggestions)}
                          </div>
                        )}
                        
                        {isLoadingSuggestions && (
                          <div className="absolute right-3 top-3">
                            <FontAwesomeIcon icon={faSpinner} spin className="text-[#aaa]" />
                          </div>
                        )}
                      </div>
                      
                      {/* Display taxonomy info if available */}
                      {(formData.kingdom || formData.family || formData.genus) && (
                        <div className="mt-2 p-3 bg-[#2c2c2c] border border-[#444] rounded-lg text-sm">
                          <h4 className="font-medium mb-2 text-[#e0e0e0]">Informasi Taksonomi:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[#aaa]">
                            {formData.kingdom && <div><span className="font-medium">Kingdom:</span> {formData.kingdom}</div>}
                            {formData.phylum && <div><span className="font-medium">Phylum:</span> {formData.phylum}</div>}
                            {formData.class && <div><span className="font-medium">Class:</span> {formData.class}</div>}
                            {formData.order && <div><span className="font-medium">Order:</span> {formData.order}</div>}
                            {formData.family && <div><span className="font-medium">Family:</span> {formData.family}</div>}
                            {formData.genus && <div><span className="font-medium">Genus:</span> <span className="italic">{formData.genus}</span></div>}
                            {formData.species && <div><span className="font-medium">Species:</span> <span className="italic">{formData.species}</span></div>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Tanggal Observasi</label>
                      <input
                        type="date"
                        name="observation_date"
                        value={formData.observation_date}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-[#444] rounded focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-[#1e1e1e] p-4 rounded-lg shadow-md border border-[#333]">
                  <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-[#333]">Lokasi</h2>
                  
                  <div className="space-y-4">
                    <div className="mb-4">
                      <label className="block text-[#e0e0e0] mb-2">Lokasi</label>
                      <input
                        type="text"
                        value={formData.location_name || ''}
                        readOnly
                        className="w-full p-2 bg-[#2c2c2c] border border-[#444] rounded-lg text-[#e0e0e0] mb-2"
                      />
                      <div className="text-sm text-[#aaa]">
                        Lat: {position[0]}, Long: {position[1]}
                      </div>
                    </div>
                    
                    <div className="h-[200px] rounded-lg overflow-hidden">
                      <MapContainer
                        center={position || [-2.5489, 118.0149]}
                        zoom={5}
                        style={{ height: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                        <LocationMarker position={position} setPosition={setPosition} />
                      </MapContainer>
                    </div>
                    
                    <div className="text-sm text-[#aaa]">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />
                      <span>Klik pada peta untuk mengubah lokasi</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Gallery */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-[#e0e0e0]">Media</h3>
                
                {/* Existing Media */}
                {medias.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                    {medias.map((media) => (
                      <div 
                        key={media.id} 
                        className={`relative group rounded-lg overflow-hidden border-2 ${
                          mediaToDelete.includes(media.id) ? 'border-red-500' : 'border-[#444]'
                        }`}
                      >
                        {media.media_type === 'video' ? (
                          <div className="aspect-w-16 aspect-h-9 bg-[#2c2c2c]">
                            <video 
                              src={media.full_url} 
                              className="w-full h-full object-cover"
                              controls
                            />
                          </div>
                        ) : media.media_type === 'audio' ? (
                          <div className="aspect-w-16 aspect-h-9 bg-[#2c2c2c] p-4 flex items-center justify-center">
                            <audio 
                              src={media.full_url} 
                              className="w-full" 
                              controls
                            />
                          </div>
                        ) : (
                          <div className="aspect-w-1 aspect-h-1">
                            <img
                              src={media.full_url}
                              alt={media.scientific_name || 'Media'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = media.source === 'kupunesia' ? defaultPlaceholderKupunesia : media.source === 'burungnesia' ? defaultPlaceholderBurungnesia : defaultPlaceholder;
                                console.error('Error loading media:', media.full_url);
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Delete Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleDeleteMedia(media.id)}
                          className={`absolute top-2 right-2 p-2 rounded-full ${
                            mediaToDelete.includes(media.id)
                              ? 'bg-red-500 text-white'
                              : 'bg-[#2c2c2c] text-[#e0e0e0] opacity-0 group-hover:opacity-100'
                          } transition-opacity`}
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* New Media Previews */}
                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                    {previewUrls.map((url, index) => (
                      <div key={`new-media-${index}`} className="relative group rounded-lg overflow-hidden border-2 border-[#1a73e8]">
                        <div className="aspect-w-1 aspect-h-1">
                          <img
                            src={url}
                            alt={`New media ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewMedia(index)}
                          className="absolute top-2 right-2 p-2 rounded-full bg-[#2c2c2c] text-[#e0e0e0] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Upload Button */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded cursor-pointer hover:bg-[#1565c0] transition-colors">
                    <FontAwesomeIcon icon={faImage} />
                    <span>Tambah Media</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {mediaToDelete.length > 0 && (
                    <p className="text-red-400">
                      {mediaToDelete.length} media akan dihapus
                    </p>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-6 py-2 bg-[#3c3c3c] text-[#e0e0e0] rounded-lg hover:bg-[#4c4c4c] transition-colors disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faTimes} className="mr-2" />
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0] transition-colors disabled:opacity-50 flex items-center"
                >
                  {saving ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} className="mr-2" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default EditObservation; 