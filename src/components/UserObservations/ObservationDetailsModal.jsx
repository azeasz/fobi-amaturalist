import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEdit, faSpinner, faMapMarkerAlt, faCalendar, faLayerGroup, faMicroscope, faBug, faLeaf, faPaw, faSitemap } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import defaultPlaceholder from '../../assets/icon/FOBI.png';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const ObservationDetailsModal = ({ show, onClose, observation, onEdit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [locationCache, setLocationCache] = useState({});
  
  // Fungsi untuk format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'd MMMM yyyy', { locale: id });
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
  
  useEffect(() => {
    if (show && observation?.id) {
      fetchObservationDetails(observation.id);
    }
  }, [show, observation]);
  
  const fetchObservationDetails = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('jwt_token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/user-observations/${id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.data.success) {
        const data = response.data.data;
        // Tambahkan nama lokasi dan format tanggal
        const locationName = await getLocationName(data.latitude, data.longitude);
        const formattedData = {
          ...data,
          location_name: locationName,
          formatted_date: formatDate(data.date || data.observation_date)
        };
        setDetails(formattedData);
      } else {
        setError(response.data.message || 'Gagal memuat detail observasi');
      }
    } catch (err) {
      console.error('Error fetching observation details:', err);
      setError('Gagal terhubung ke server. Silakan coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e1e] rounded-lg shadow-lg w-full max-w-4xl border border-[#444] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-[#333] px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[#e0e0e0] italic">
            {loading ? 'Memuat...' : details?.scientific_name || observation?.scientific_name}
          </h3>
          <button 
            onClick={onClose}
            className="text-[#aaa] hover:text-[#e0e0e0] focus:outline-none"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <FontAwesomeIcon icon={faSpinner} spin size="lg" className="text-[#1a73e8]" />
              <span className="ml-2 text-[#e0e0e0]">Memuat detail...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">
              <p>{error}</p>
              <button 
                onClick={() => fetchObservationDetails(observation.id)}
                className="mt-2 px-4 py-2 bg-[#323232] text-[#e0e0e0] rounded hover:bg-[#3c3c3c]"
              >
                Coba Lagi
              </button>
            </div>
          ) : details ? (
            <div className="flex flex-col md:flex-row">
              {/* Left side - Media Gallery */}
              <div className="w-full md:w-1/2 p-4 border-r border-[#333]">
                {details?.medias && details.medias.length > 0 ? (
                  <>
                    <div className="h-[300px] bg-[#2c2c2c] rounded-lg flex items-center justify-center overflow-hidden mb-4">
                      {details.medias[activeMediaIndex]?.media_type === 'video' ? (
                        <video 
                          src={details.medias[activeMediaIndex].full_url} 
                          controls 
                          className="max-w-full max-h-full"
                        />
                      ) : details.medias[activeMediaIndex]?.media_type === 'audio' ? (
                        <div className="w-full p-4">
                          <audio 
                            src={details.medias[activeMediaIndex].full_url} 
                            controls 
                            className="w-full"
                          />
                          {details.medias[activeMediaIndex].spectrogram && (
                            <img 
                              src={details.medias[activeMediaIndex].spectrogram} 
                              alt="Audio Spectrogram" 
                              className="mt-4 w-full"
                            />
                          )}
                        </div>
                      ) : (
                        <img 
                          src={details.medias[activeMediaIndex].full_url}
                          alt={details.scientific_name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = defaultPlaceholder;
                            console.error('Error loading image:', details.medias[activeMediaIndex].full_url);
                          }}
                        />
                      )}
                    </div>
                    
                    {/* Thumbnails */}
                    {details.medias.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {details.medias.map((media, index) => (
                          <div
                            key={`media-thumb-${index}`}
                            className={`w-20 h-20 flex-shrink-0 rounded overflow-hidden cursor-pointer border-2 ${
                              index === activeMediaIndex ? 'border-[#1a73e8]' : 'border-transparent'
                            }`}
                            onClick={() => setActiveMediaIndex(index)}
                          >
                            {media.media_type === 'video' ? (
                              <div className="relative bg-[#2c2c2c] w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-[#e0e0e0]" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : media.media_type === 'audio' ? (
                              <div className="relative bg-[#2c2c2c] w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-[#e0e0e0]" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : (
                              <img 
                                src={media.full_url}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = defaultPlaceholder;
                                  console.error('Error loading thumbnail:', media.full_url);
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-[300px] bg-[#2c2c2c] rounded-lg flex items-center justify-center">
                    <div className="text-center text-[#aaa]">
                      <img 
                        src={defaultPlaceholder}
                        alt="No Media"
                        className="w-16 h-16 object-contain mx-auto mb-2 opacity-60"
                      />
                      <p>Tidak ada media tersedia</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right side - Info Tabs */}
              <div className="w-full md:w-1/2 p-4">
                {/* Tabs */}
                <div className="border-b border-[#333] mb-4">
                  <div className="flex">
                    <button
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === 'info' 
                          ? 'text-[#1a73e8] border-b-2 border-[#1a73e8]' 
                          : 'text-[#aaa] hover:text-[#e0e0e0]'
                      }`}
                      onClick={() => setActiveTab('info')}
                    >
                      Informasi
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === 'taxonomy' 
                          ? 'text-[#1a73e8] border-b-2 border-[#1a73e8]' 
                          : 'text-[#aaa] hover:text-[#e0e0e0]'
                      }`}
                      onClick={() => setActiveTab('taxonomy')}
                    >
                      Taksonomi
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === 'details' 
                          ? 'text-[#1a73e8] border-b-2 border-[#1a73e8]' 
                          : 'text-[#aaa] hover:text-[#e0e0e0]'
                      }`}
                      onClick={() => setActiveTab('details')}
                    >
                      Detail
                    </button>
                  </div>
                </div>
                
                {/* Tab Content */}
                <div className="text-[#e0e0e0]">
                  {activeTab === 'info' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xl font-semibold italic">{details.scientific_name}</h4>
                        {(details.genus && details.species) && (
                          <p className="text-[#aaa] italic">{details.genus} {details.species}</p>
                        )}
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8] mt-1" />
                        <div>
                          <h5 className="font-medium">Lokasi</h5>
                          <p className="text-[#aaa]">{details.location_name}</p>
                          <p className="text-xs text-[#aaa] mt-1">
                            Lat: {details.latitude}, Long: {details.longitude}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <FontAwesomeIcon icon={faCalendar} className="text-[#1a73e8] mt-1" />
                        <div>
                          <h5 className="font-medium">Tanggal Observasi</h5>
                          <p className="text-[#aaa]">{details.formatted_date}</p>
                        </div>
                      </div>
                      
                      {details.observation_details && (
                        <div className="flex items-start gap-2">
                          <FontAwesomeIcon icon={faLayerGroup} className="text-[#1a73e8] mt-1" />
                          <div>
                            <h5 className="font-medium">Detail Observasi</h5>
                            <div className="text-[#aaa] text-sm mt-1">
                              {Object.entries(details.observation_details).map(([key, value]) => (
                                <div key={key} className="mb-1">
                                  <span className="font-medium">{key}: </span>
                                  <span>{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'taxonomy' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {details.kingdom && (
                          <div className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faSitemap} className="text-[#1a73e8] mt-1" />
                            <div>
                              <h5 className="font-medium">Kingdom</h5>
                              <p className="text-[#aaa]">{details.kingdom}</p>
                            </div>
                          </div>
                        )}
                        
                        {details.phylum && (
                          <div className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faLayerGroup} className="text-[#1a73e8] mt-1" />
                            <div>
                              <h5 className="font-medium">Phylum</h5>
                              <p className="text-[#aaa]">{details.phylum}</p>
                            </div>
                          </div>
                        )}
                        
                        {details.class && (
                          <div className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faPaw} className="text-[#1a73e8] mt-1" />
                            <div>
                              <h5 className="font-medium">Class</h5>
                              <p className="text-[#aaa]">{details.class}</p>
                            </div>
                          </div>
                        )}
                        
                        {details.order && (
                          <div className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faLeaf} className="text-[#1a73e8] mt-1" />
                            <div>
                              <h5 className="font-medium">Order</h5>
                              <p className="text-[#aaa]">{details.order}</p>
                            </div>
                          </div>
                        )}
                        
                        {details.family && (
                          <div className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faSitemap} className="text-[#1a73e8] mt-1" />
                            <div>
                              <h5 className="font-medium">Family</h5>
                              <p className="text-[#aaa]">{details.family}</p>
                            </div>
                          </div>
                        )}
                        
                        {details.genus && (
                          <div className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faBug} className="text-[#1a73e8] mt-1" />
                            <div>
                              <h5 className="font-medium">Genus</h5>
                              <p className="text-[#aaa] italic">{details.genus}</p>
                            </div>
                          </div>
                        )}
                        
                        {details.species && (
                          <div className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faMicroscope} className="text-[#1a73e8] mt-1" />
                            <div>
                              <h5 className="font-medium">Species</h5>
                              <p className="text-[#aaa] italic">{details.species}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'details' && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium">ID Observasi</h5>
                        <p className="text-[#aaa]">{details.id}</p>
                      </div>
                      
                      <div>
                        <h5 className="font-medium">Dibuat pada</h5>
                        <p className="text-[#aaa]">{new Date(details.created_at).toLocaleString('id-ID')}</p>
                      </div>
                      
                      {details.updated_at && (
                        <div>
                          <h5 className="font-medium">Terakhir diperbarui</h5>
                          <p className="text-[#aaa]">{new Date(details.updated_at).toLocaleString('id-ID')}</p>
                        </div>
                      )}
                      
                      {details.status !== undefined && (
                        <div>
                          <h5 className="font-medium">Status</h5>
                          <p className="text-[#aaa]">
                            {details.status === 1 ? 'Aktif' : 'Non-aktif'}
                          </p>
                        </div>
                      )}
                      
                      {details.iucn_status && (
                        <div>
                          <h5 className="font-medium">Status IUCN</h5>
                          <p className="text-[#aaa]">{details.iucn_status}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#aaa]">
              Tidak ada data yang tersedia.
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-[#333] px-6 py-3 flex justify-end">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded hover:bg-[#1565c0] transition-colors"
          >
            <FontAwesomeIcon icon={faEdit} />
            <span>Edit Observasi</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ObservationDetailsModal; 