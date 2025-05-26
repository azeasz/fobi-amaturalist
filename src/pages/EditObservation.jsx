import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSave, faTimes, faArrowLeft, faMapMarkerAlt, faImage, faTrash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import Header from '../components/Header';
import defaultPlaceholder from '../assets/icon/FOBI.png';
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
          const locationName = await getLocationName(data.latitude, data.longitude);
          
          setFormData({
            ...data,
            location_name: locationName,
            observation_date: formatDateForInput(data.date || data.observation_date)
          });
          
          setPosition([data.latitude, data.longitude]);
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
    if (formData.latitude && formData.longitude) {
      setPosition([parseFloat(formData.latitude), parseFloat(formData.longitude)]);
    }
  }, [formData.latitude, formData.longitude]);

  // Update lat/lng when position changes
  useEffect(() => {
    if (position) {
      setFormData(prev => ({
        ...prev,
        latitude: position[0],
        longitude: position[1]
      }));
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

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      // Create form data
      const submitData = new FormData();
      
      // Add basic fields
      Object.keys(formData).forEach(key => {
        if (key === 'observation_details') {
          submitData.append(key, JSON.stringify(formData[key]));
        } else {
          submitData.append(key, formData[key]);
        }
      });

      // Add media to delete
      mediaToDelete.forEach((mediaId, index) => {
        submitData.append(`media_to_delete[${index}]`, mediaId);
      });

      // Add new media files
      newMedias.forEach((file, index) => {
        submitData.append(`new_media[${index}]`, file);
      });

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
        // Navigate back to list
        navigate('/my-observations');
      } else {
        setError(response.data.message || 'Gagal menyimpan perubahan');
      }
    } catch (err) {
      console.error('Error saving observation:', err);
      setError('Gagal menyimpan perubahan. Silakan coba lagi nanti.');
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    navigate('/my-observations');
  };

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
              <p>{error}</p>
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
                      <label className="block text-sm font-medium mb-1">Nama Ilmiah <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="scientific_name"
                        value={formData.scientific_name}
                        onChange={handleInputChange}
                        required
                        className="w-full p-2 border border-[#444] rounded focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Genus</label>
                        <input
                          type="text"
                          name="genus"
                          value={formData.genus}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-[#444] rounded focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Spesies</label>
                        <input
                          type="text"
                          name="species"
                          value={formData.species}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-[#444] rounded focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                        />
                      </div>
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

              {/* Taxonomy */}
              <div className="bg-[#1e1e1e] p-4 rounded-lg shadow-md border border-[#333]">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-[#333]">Taksonomi</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Kingdom</label>
                    <input
                      type="text"
                      name="kingdom"
                      value={formData.kingdom}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-[#444] rounded focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Phylum</label>
                    <input
                      type="text"
                      name="phylum"
                      value={formData.phylum}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-[#444] rounded focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Class</label>
                    <input
                      type="text"
                      name="class"
                      value={formData.class}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-[#444] rounded focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Order</label>
                    <input
                      type="text"
                      name="order"
                      value={formData.order}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-[#444] rounded focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Family</label>
                    <input
                      type="text"
                      name="family"
                      value={formData.family}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-[#444] rounded focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                    />
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
                                e.target.src = defaultPlaceholder;
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