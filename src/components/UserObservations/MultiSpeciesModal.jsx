import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEdit, faSpinner, faMapMarkerAlt, faCalendar, faLayerGroup, faList, faExclamationTriangle, faFeather, faMosquito } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import defaultPlaceholder from '../../assets/icon/FOBI.png';
import defaultPlaceholderKupunesia from '../../assets/icon/kupnes.png';
import defaultPlaceholderBurungnesia from '../../assets/icon/icon.png';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const MultiSpeciesModal = ({ show, onClose, observation, onEdit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);
  const [locationCache, setLocationCache] = useState({});
  const [activeSpeciesIndex, setActiveSpeciesIndex] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  
  // Fungsi untuk format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'd MMMM yyyy', { locale: id });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
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
      
      // Cek apakah ID memiliki format khusus
      let fetchId = id;
      if (observation && observation.source) {
        if (observation.source === 'burungnesia') {
          fetchId = `BN${id}`;
        } else if (observation.source === 'kupunesia') {
          fetchId = `KN${id}`;
        }
      }
      
      const token = localStorage.getItem('jwt_token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/user-observations/${fetchId}`, {
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
          formatted_date: formatDate(data.date || data.tgl_pengamatan || data.observation_date)
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
  
  // Fungsi untuk mendapatkan label dan warna sumber data
  const getSourceInfo = (source) => {
    if (source === 'burungnesia') {
      return { 
        label: 'Burungnesia', 
        color: 'bg-pink-800', 
        icon: faFeather 
      };
    } else if (source === 'kupunesia') {
      return { 
        label: 'Kupunesia', 
        color: 'bg-purple-800', 
        icon: faMosquito 
      };
    }
    return { label: 'Unknown', color: 'bg-gray-800', icon: faList };
  };
  
  if (!show) return null;
  
  // Cek jika data telah dimuat dan memiliki daftar fauna
  const speciesList = details?.faunas || [];
  const currentSpecies = speciesList.length > activeSpeciesIndex ? speciesList[activeSpeciesIndex] : null;
  const currentFauna = currentSpecies?.fauna || null;
  
  // Cek jika ada media untuk spesies yang aktif
  const speciesMedia = currentSpecies ? details?.medias?.filter(media => 
    media.fauna_id === currentSpecies.fauna_id
  ) || [] : [];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e1e] rounded-lg shadow-lg w-full max-w-5xl border border-[#444] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-[#333] px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-[#e0e0e0]">
              {loading ? 'Memuat...' : details ? `Checklist ${details.source === 'burungnesia' ? 'Burung' : 'Kupu-kupu'}` : 'Detail Checklist'}
            </h3>
            {details && details.source && (
              <span className={`ml-3 px-2 py-1 text-xs font-semibold rounded-full text-white whitespace-nowrap ${getSourceInfo(details.source).color}`}>
                <FontAwesomeIcon icon={getSourceInfo(details.source).icon} className="mr-1" />
                {getSourceInfo(details.source).label}
              </span>
            )}
            {details && (
              <span className="ml-3 px-2 py-1 text-xs font-semibold rounded-full text-white bg-gray-700/70 whitespace-nowrap">
                Checklist
              </span>
            )}
          </div>
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
            <div className="flex flex-col">
              {/* Informasi Checklist */}
              <div className="p-4 border-b border-[#333]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8] mt-1" />
                    <div>
                      <h5 className="font-medium text-[#e0e0e0]">Lokasi</h5>
                      <p className="text-[#aaa]">{details.location_name}</p>
                      <p className="text-xs text-[#aaa] mt-1">
                        Lat: {details.latitude}, Long: {details.longitude}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <FontAwesomeIcon icon={faCalendar} className="text-[#1a73e8] mt-1" />
                    <div>
                      <h5 className="font-medium">Tanggal Pengamatan</h5>
                      <p className="text-[#aaa]">{details.observation_date ? formatDate(details.observation_date) : (details.date ? formatDate(details.date) : formatDate(details.created_at))}</p>
                    </div>
                  </div>
                  
                  {details.additional_note && (
                    <div className="flex items-start gap-2">
                      <FontAwesomeIcon icon={faLayerGroup} className="text-[#1a73e8] mt-1" />
                      <div>
                        <h5 className="font-medium text-[#e0e0e0]">Catatan Tambahan</h5>
                        <p className="text-[#aaa]">{details.additional_note}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Daftar Spesies */}
              <div className="flex flex-col md:flex-row">
                {/* Sidebar Spesies */}
                <div className="w-full md:w-64 border-r border-[#333] p-4 overflow-y-auto max-h-[400px] md:max-h-none">
                  <h4 className="text-[#e0e0e0] font-medium mb-3">Daftar Spesies ({speciesList.length})</h4>
                  
                  {speciesList.length === 0 ? (
                    <p className="text-[#aaa] italic">Belum ada spesies terdaftar dalam checklist ini.</p>
                  ) : (
                    <ul className="space-y-2">
                      {speciesList.map((species, index) => (
                        <li 
                          key={`species-${index}`} 
                          className={`p-2 rounded cursor-pointer ${
                            index === activeSpeciesIndex 
                              ? 'bg-[#1a73e8] bg-opacity-20 border-l-4 border-[#1a73e8]' 
                              : 'hover:bg-[#2c2c2c]'
                          }`}
                          onClick={() => {
                            setActiveSpeciesIndex(index);
                            setActiveMediaIndex(0);
                          }}
                        >
                          <p className="text-[#e0e0e0] italic font-medium">{species.fauna?.nameLat || 'Unknown Species'}</p>
                          {species.count && (
                            <p className="text-xs text-[#aaa]">Jumlah: {species.count}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                {/* Detail Spesies */}
                <div className="flex-1 p-4">
                  {currentFauna ? (
                    <>
                      <h4 className="text-lg text-[#e0e0e0] italic font-medium mb-4">{currentFauna.nameLat}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {currentFauna.nameId && (
                          <div>
                            <h5 className="text-[#aaa] text-xs uppercase font-semibold mb-1">Nama Lokal</h5>
                            <p className="text-[#e0e0e0]">{currentFauna.nameId}</p>
                          </div>
                        )}
                        
                        {currentFauna.family && (
                          <div>
                            <h5 className="text-[#aaa] text-xs uppercase font-semibold mb-1">Family</h5>
                            <p className="text-[#e0e0e0]">{currentFauna.family}</p>
                          </div>
                        )}
                        
                        {currentSpecies.count && (
                          <div>
                            <h5 className="text-[#aaa] text-xs uppercase font-semibold mb-1">Jumlah</h5>
                            <p className="text-[#e0e0e0]">{currentSpecies.count}</p>
                          </div>
                        )}
                        
                        {currentSpecies.notes && (
                          <div>
                            <h5 className="text-[#aaa] text-xs uppercase font-semibold mb-1">Catatan</h5>
                            <p className="text-[#e0e0e0]">{currentSpecies.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Media Galeri */}
                      <div className="mt-4">
                        <h5 className="text-[#aaa] text-xs uppercase font-semibold mb-3">Media</h5>
                        
                        {speciesMedia.length > 0 ? (
                          <>
                            <div className="h-[200px] bg-[#2c2c2c] rounded-lg flex items-center justify-center overflow-hidden mb-4">
                              <img 
                                src={speciesMedia[activeMediaIndex]?.images || speciesMedia[activeMediaIndex]?.full_url}
                                alt={currentFauna.nameLat}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  if (details.source === 'kupunesia') {
                                    e.target.src = defaultPlaceholderKupunesia;
                                  } else if (details.source === 'burungnesia') {
                                    e.target.src = defaultPlaceholderBurungnesia;
                                  } else {
                                    e.target.src = defaultPlaceholder;
                                  }
                                }}
                              />
                            </div>
                            
                            {/* Thumbnails */}
                            {speciesMedia.length > 1 && (
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                {speciesMedia.map((media, index) => (
                                  <div
                                    key={`media-thumb-${index}`}
                                    className={`w-16 h-16 flex-shrink-0 rounded overflow-hidden cursor-pointer border-2 ${
                                      index === activeMediaIndex ? 'border-[#1a73e8]' : 'border-transparent'
                                    }`}
                                    onClick={() => setActiveMediaIndex(index)}
                                  >
                                    <img 
                                      src={media.images || media.full_url}
                                      alt={`Thumbnail ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        if (details.source === 'kupunesia') {
                                          e.target.src = defaultPlaceholderKupunesia;
                                        } else if (details.source === 'burungnesia') {
                                          e.target.src = defaultPlaceholderBurungnesia;
                                        } else {
                                          e.target.src = defaultPlaceholder;
                                        }
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="h-[200px] bg-[#2c2c2c] rounded-lg flex items-center justify-center">
                            <div className="text-center text-[#aaa]">
                              <img 
                                src={details.source === 'kupunesia' ? defaultPlaceholderKupunesia : defaultPlaceholderBurungnesia}
                                alt="No Media"
                                className="w-16 h-16 object-contain mx-auto mb-2 opacity-60"
                              />
                              <p>Tidak ada media tersedia untuk spesies ini</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-center text-[#aaa]">
                      {speciesList.length === 0 ? (
                        <p>Belum ada spesies terdaftar dalam checklist ini.</p>
                      ) : (
                        <p>Pilih spesies dari daftar untuk melihat detailnya.</p>
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
          <div className="flex items-center">
            <span className="text-yellow-500 mr-2">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </span>
            <span className="text-gray-400 text-sm">
              Fitur edit untuk observasi {details?.source === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'} sedang dinonaktifkan sementara
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiSpeciesModal; 