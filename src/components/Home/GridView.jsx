import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faInfo, faListDots, faImage, faDove, faLocationDot, faQuestion, faCheck, faLink, faPlay, faPause, faUsers, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import './GridView.css';
import { useNavigate, Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import defaultBirdLogo from '../../assets/icon/icon.png';
import defaultButterflyLogo from '../../assets/icon/kupnes.png';
import defaultFobiLogo from '../../assets/icon/FOBI.png';
import { debounce } from 'lodash';

// Fungsi untuk mendapatkan stats dari localStorage
const getStatsFromLocalStorage = () => {
  try {
    const savedStats = localStorage.getItem('currentStats');
    if (savedStats) {
      return JSON.parse(savedStats);
    }
  } catch (error) {
    console.error('Error reading stats from localStorage:', error);
  }
  
  // Default stats jika tidak ada di localStorage
  return {
    burungnesia: 0,
    kupunesia: 0,
    fobi: 0,
    observasi: 0,
    spesies: 0,
    kontributor: 0,
  };
};

const SpectrogramPlayer = ({ audioUrl, spectrogramUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', () => {
        const duration = audioRef.current.duration;
        const currentTime = audioRef.current.currentTime;
        const progress = (currentTime / duration) * 100;
        setProgress(progress);
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      <div className="relative flex-1 w-full h-full bg-gray-900 overflow-hidden">
        <img
          src={spectrogramUrl}
          alt="Spectrogram"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {audioUrl && (
          <>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-700">
              <div
                className="h-full bg-emerald-500 transition-width duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <FontAwesomeIcon
                icon={isPlaying ? faPause : faPlay}
                className="text-xs"
              />
            </button>
            <audio
              ref={audioRef}
              src={audioUrl}
              className="hidden"
              preload="metadata"
            />
          </>
        )}
      </div>
    </div>
  );
};

// Pindahkan fungsi getDefaultImage ke luar komponen
const getDefaultImage = (type) => {
  switch(type) {
    case 'bird':
      return defaultBirdLogo;
    case 'butterfly':
      return defaultButterflyLogo;
    default:
      return defaultFobiLogo;
  }
};

// Pindahkan fungsi getImageUrl ke luar komponen dan perbaiki logikanya
const getImageUrl = (item) => {
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    const imageUrl = typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url;
    if (imageUrl) return imageUrl;
  }
  return getDefaultImage(item.type);
};

const MediaSlider = ({ images, spectrogram, audioUrl, type, isEager }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const mediaItems = [];

  // Cek dan tambahkan gambar jika ada
  if (images && Array.isArray(images) && images.length > 0) {
    images.forEach(img => {
      let imageUrl;
      if (typeof img === 'string') {
        imageUrl = img;
      } else if (img && typeof img === 'object') {
        imageUrl = img.url;
      }
      
      if (imageUrl) {
        mediaItems.push({ type: 'image', url: imageUrl });
      }
    });
  }

  // Tambahkan spectrogram jika ada
  if (spectrogram) {
    mediaItems.push({ type: 'spectrogram', url: spectrogram, audioUrl });
  }

  // Tambahkan default image hanya jika tidak ada gambar dan spectrogram
  if (mediaItems.length === 0) {
    mediaItems.push({ 
      type: 'image', 
      url: getDefaultImage(type)
    });
  }

  const safeActiveIndex = Math.min(activeIndex, mediaItems.length - 1);

  return (
    <div className="relative">
      <div className="h-48 overflow-hidden bg-gray-900">
        {mediaItems[safeActiveIndex]?.type === 'spectrogram' ? (
          <SpectrogramPlayer
            spectrogramUrl={mediaItems[safeActiveIndex].url}
            audioUrl={mediaItems[safeActiveIndex].audioUrl}
          />
        ) : (
          <div className="w-full h-full bg-gray-100">
            <img
              src={mediaItems[safeActiveIndex]?.url}
              alt=""
              className={`w-full h-full ${
                mediaItems[safeActiveIndex]?.url?.includes('/assets/icon/') 
                  ? 'object-contain p-4' 
                  : 'object-cover'
              }`}
              loading={isEager ? "eager" : "lazy"}
              onError={(e) => {
                e.target.src = getDefaultImage(type);
              }}
            />
          </div>
        )}
      </div>

      {mediaItems.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
          <div className="flex gap-1 px-2 py-1 rounded-full bg-black/30">
            {mediaItems.map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === safeActiveIndex ? 'bg-white' : 'bg-gray-400 hover:bg-gray-300'
                }`}
                onClick={() => setActiveIndex(idx)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Modifikasi fungsi getGradeDisplay untuk menampilkan label sesuai sumber
const getGradeDisplay = (grade, type) => {
  if (grade.toLowerCase() === 'research grade') return 'ID Lengkap';
  if (grade.toLowerCase() === 'confirmed id') return 'ID Terkonfirmasi';
  if (grade.toLowerCase() === 'needs id') return 'Bantu Iden';
  if (grade.toLowerCase() === 'low quality id') return 'ID Kurang';
  
  // Ubah label casual sesuai sumber
  switch(type) {
    case 'bird':
      return 'Checklist Burungnesia';
    case 'butterfly':
      return 'Checklist Kupunesia';
    default:
      return 'Checklist FOBI';
  }
};

const Card = ({ item, isEager }) => {
  const handleClick = (item) => {
    let path;
    const source = item.type || 'fobi';
    let prefix = '';
    let baseId = item.id || '';
    
    // Tentukan prefix berdasarkan tipe
    if (source === 'bird') {
      prefix = 'BN';
    } else if (source === 'butterfly') {
      prefix = 'KP';
    }
    
    // Tentukan URL berdasarkan sumber data
    if (source === 'general') {
      // Untuk data FOBI general
      path = `/observations/${baseId}?source=fobi`;
    } else if (item.source?.includes('fobi')) {
      // Untuk checklist dari sumber FOBI
      path = `/detail-checklist/${prefix}${baseId}`;
    } else {
      // Untuk data non-FOBI (burungnesia dan kupunesia biasa)
      path = `/app-checklist/${prefix}${baseId}`;
    }
    
    window.open(path, '_blank');
  };

  // Helper function untuk mendapatkan total count berdasarkan tipe
  const getTotalCount = () => {
    // Untuk FOBI
    if (item.type === 'general') {
      return {
        count: item.fobi_count || 0,
        label: 'FOBI',
        color: 'text-green-700'
      };
    }
    // Untuk Burungnesia
    else if (item.type === 'bird') {
      return [
        {
          count: item.fobi_count || 0,
          label: 'FOBI',
          color: 'text-green-700'
        },
        {
          count: item.burungnesia_count || 0,
          label: 'Burungnesia',
          color: 'text-blue-700'
        }
      ];
    }
    // Untuk Kupunesia
    else if (item.type === 'butterfly') {
      return [
        {
          count: item.fobi_count || 0,
          label: 'FOBI',
          color: 'text-green-700'
        },
        {
          count: item.kupunesia_count || 0,
          label: 'Kupunesia',
          color: 'text-purple-700'
        }
      ];
    }
    return null;
  };

  const totalCount = getTotalCount();

  return (
    <div className="card relative">
      <MediaSlider
        images={item.images || [item.image]}
        spectrogram={item.spectrogram}
        audioUrl={item.audioUrl}
        type={item.type}
        isEager={isEager}
      />

      <div className="card-body p-4 cursor-pointer hover:bg-[#2c2c2c]" onClick={() => handleClick(item)}>
        <div className="flex items-center justify-between mb-2">
          <Link 
            to={`/profile/${item.observer_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-gray-300 hover:text-blue-400 transition-colors"
          >
            {item.observer}
          </Link>
          <span className={`px-2 py-1 rounded-full text-xs text-white ${
            item.quality.grade.toLowerCase() === 'research grade' ? 'bg-blue-700/70' :
            item.quality.grade.toLowerCase() === 'confirmed id' ? 'bg-green-700/70' :
            item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-700/70' :
            item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-700/70' :
            'bg-gray-700/70'
          }`}>
            {getGradeDisplay(item.quality.grade, item.type)}
          </span>
        </div>
        <h5 className="font-medium text-lg mb-2 text-white">{item.title}</h5>
        <p className="text-sm text-gray-300 whitespace-pre-line">{item.description}</p>
      </div>

      <div className="card-footer p-4 bg-[#1e1e1e] cursor-pointer hover:bg-[#2c2c2c]" onClick={() => handleClick(item)}>
        <div className="flex items-center justify-between">
          <div className="quality-indicators flex gap-2 text-gray-400">
            {item.quality.has_media && <FontAwesomeIcon icon={faImage} title="Has Media" />}
            {item.quality.is_wild && <FontAwesomeIcon icon={faDove} title="Wild" />}
            {item.quality.location_accurate && <FontAwesomeIcon icon={faLocationDot} title="Location Accurate" />}
            {item.quality.needs_id && <FontAwesomeIcon icon={faQuestion} title="Needs ID" />}
            {item.type === 'general' && item.quality.recent_evidence && (
              <FontAwesomeIcon icon={faCheck} title="Recent Evidence" />
            )}
            {item.type === 'general' && item.quality.related_evidence && (
              <FontAwesomeIcon icon={faLink} title="Related Evidence" />
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* ID Count */}
            <div className="flex items-center gap-1 text-gray-600">
              <FontAwesomeIcon icon={faUsers} />
              <span>Total identifikasi: {item.identifications_count || 0}</span>
            </div>

            {/* Total Checklist Count */}
            {totalCount && (Array.isArray(totalCount) ? (
              <div className="flex items-center gap-2">
                {totalCount.map((count, idx) => (
                  <div key={idx} className={`flex items-center gap-1 ${count.color} font-medium`}>
                    <span>{count.count} {count.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`flex items-center gap-1 ${totalCount.color} font-medium`}>
                <span>{totalCount.count} {totalCount.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Pindahkan defaultFilterParams ke atas sebelum komponen
const defaultFilterParams = {
  start_date: '',
  end_date: '',
  grade: [],
  has_media: false,
  media_type: '',
  radius: 10,
  data_source: ['fobi', 'burungnesia', 'kupunesia']
};

// Tambahkan fungsi helper
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

// Tambahkan fungsi helper untuk format lokasi
const formatLocation = (lat, long) => {
  if (!lat || !long) return '-';
  return `${parseFloat(lat).toFixed(6)}, ${parseFloat(long).toFixed(6)}`;
};

// Komponen untuk header sort yang bisa digunakan di desktop dan mobile
const SortableHeader = ({ title, sortKey, currentSort, onSort, className = "" }) => {
  const getSortIcon = () => {
    if (currentSort.key !== sortKey) return faSort;
    return currentSort.direction === 'asc' ? faSortUp : faSortDown;
  };

  return (
    <div 
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-2 cursor-pointer ${className}`}
    >
      <span>{title}</span>
      <FontAwesomeIcon 
        icon={getSortIcon()} 
        className={`text-xs ${
          currentSort.key === sortKey 
            ? 'text-blue-400' 
            : 'text-gray-500'
        }`}
      />
    </div>
  );
};

// Langkah 1: Tambahkan ListView Desktop Component
const ListViewDesktop = ({ observations, handleClick }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: 
        prevConfig.key === key 
          ? prevConfig.direction === 'asc' 
            ? 'desc' 
            : 'asc'
          : 'desc'
    }));
  };

  const sortedObservations = [...observations].sort((a, b) => {
    if (!a[sortConfig.key] || !b[sortConfig.key]) return 0;
    const dateA = new Date(a[sortConfig.key]);
    const dateB = new Date(b[sortConfig.key]);
    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="hidden md:block w-full max-w-[95%] mx-auto mt-14 px-2 md:px-4 overflow-x-auto">
      <div className="min-w-[1000px]">
        <table className="w-full border-collapse bg-[#1e1e1e] rounded-lg shadow-md">
          <thead className="bg-[#2c2c2c]">
            <tr className="text-left border-b border-[#444]">
              <th className="p-8 font-medium text-sm text-gray-300">Verifikasi</th>
              <th className="p-4 font-medium text-sm text-gray-300">Nama</th>
              <th className="p-4 font-medium text-sm text-gray-300">Pengamat</th>
              <th className="p-4 font-medium text-sm text-gray-300">Lokasi</th>
              {/* <th className="p-4 font-medium text-sm text-gray-300">Jumlah observasi</th> */}
              <th className="p-4 font-medium text-sm text-gray-300">
                <SortableHeader
                  title="Tgl Observasi"
                  sortKey="observation_date"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
              </th>
              <th className="p-4 font-medium text-sm text-gray-300">
                <SortableHeader
                  title="Tgl Upload"
                  sortKey="created_at"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
              </th>
              <th className="p-4 font-medium text-sm text-gray-300">Informasi tambahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444]">
            {sortedObservations
              .map((item, index) => {
                const imagesCount = Array.isArray(item.images) 
                  ? item.images.length 
                  : (item.image ? 1 : 0);
                
                const firstImageUrl = Array.isArray(item.images) 
                  ? (item.images[0]?.url || item.images[0]) 
                  : (item.image || getDefaultImage(item.type));

                return (
                  <tr 
                    key={index}
                    onClick={() => handleClick(item)}
                    className="hover:bg-[#2c2c2c] transition-colors duration-150 cursor-pointer"
                  >
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.quality.grade.toLowerCase() === 'research grade' ? 'bg-green-900/70 text-green-300' :
                        item.quality.grade.toLowerCase() === 'confirmed id' ? 'bg-blue-900/70 text-blue-300' :
                        item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-900/70 text-yellow-300' :
                        item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-900/70 text-orange-300' :
                        'bg-gray-700/70 text-gray-300'
                      }`}>
                        {getGradeDisplay(item.quality.grade, item.type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#121212] border border-[#444]">
                            <img 
                              src={firstImageUrl}
                              alt=""
                              className={`w-full h-full ${
                                firstImageUrl.includes('/assets/icon/') 
                                  ? 'object-contain p-2' 
                                  : 'object-cover'
                              }`}
                              loading={index < 10 ? "eager" : "lazy"}
                              onError={(e) => {
                                e.target.src = getDefaultImage(item.type);
                              }}
                            />
                          </div>
                          {imagesCount > 1 && (
                            <div className="absolute -top-2 -right-2 bg-[#1a73e8] text-white text-xs px-2 py-1 rounded-full">
                              {imagesCount}
                            </div>
                          )}
                          {item.spectrogram && (
                            <div className="absolute -bottom-1 -right-1 bg-[#1a73e8] text-white p-1.5 rounded-full shadow-md">
                              <FontAwesomeIcon icon={faPlay} className="text-xs" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white">{item.title}</div>
                          <div className="text-sm text-gray-400 italic mt-0.5">
                            {extractScientificName(item.species) || item.nameLat || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Link 
                        to={`/profile/${item.observer_id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          window.open(`/profile/${item.observer_id}`, '_blank');
                        }}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                      >
                        {item.observer}
                      </Link>
                    </td>
                    <td className="p-4 text-sm text-gray-300">{item.location || '-'}</td>
                    {/* <td className="p-4">
                      <div className="space-y-1">
                        {item.type === 'bird' && (
                          <>
                            <div className="text-sm text-green-600">{item.fobi_count || 0} FOBI</div>
                            <div className="text-sm text-blue-600">{item.burungnesia_count || 0} Burungnesia</div>
                          </>
                        )}
                        {item.type === 'butterfly' && (
                          <>
                            <div className="text-sm text-green-600">{item.fobi_count || 0} FOBI</div>
                            <div className="text-sm text-purple-600">{item.kupunesia_count || 0} Kupunesia</div>
                          </>
                        )}
                        {item.type === 'general' && (
                          <div className="text-sm text-green-600">{item.fobi_count || 0} FOBI</div>
                        )}
                      </div>
                    </td> */}
                    <td className="p-4 text-sm whitespace-nowrap">
                      {item.observation_date 
                        ? new Date(item.observation_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '-'
                      }
                    </td>
                    <td className="p-4 text-sm whitespace-nowrap text-gray-300">
                      {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 items-center text-gray-400">
                        {item.quality.has_media && (
                          <span className="tooltip-container" title="Has Media">
                            <FontAwesomeIcon icon={faImage} />
                          </span>
                        )}
                        {item.quality.is_wild && (
                          <span className="tooltip-container" title="Wild">
                            <FontAwesomeIcon icon={faDove} />
                          </span>
                        )}
                        {item.quality.location_accurate && (
                          <span className="tooltip-container" title="Location Accurate">
                            <FontAwesomeIcon icon={faLocationDot} />
                          </span>
                        )}
                        {item.quality.needs_id && (
                          <span className="tooltip-container" title="Needs ID">
                            <FontAwesomeIcon icon={faQuestion} />
                          </span>
                        )}
                        {item.type === 'general' && item.quality.recent_evidence && (
                          <span className="tooltip-container" title="Recent Evidence">
                            <FontAwesomeIcon icon={faCheck} />
                          </span>
                        )}
                        {item.type === 'general' && item.quality.related_evidence && (
                          <span className="tooltip-container" title="Related Evidence">
                            <FontAwesomeIcon icon={faLink} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Tambahkan komponen ListViewMobile
const ListViewMobile = ({ observations, handleClick }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: 
        prevConfig.key === key 
          ? prevConfig.direction === 'asc' 
            ? 'desc' 
            : 'asc'
          : 'desc'
    }));
  };

  const sortedObservations = [...observations].sort((a, b) => {
    if (!a[sortConfig.key] || !b[sortConfig.key]) return 0;
    const dateA = new Date(a[sortConfig.key]);
    const dateB = new Date(b[sortConfig.key]);
    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="md:hidden px-2">
      {/* Sort Controls */}
      <div className="flex gap-4 mb-4 p-3 bg-[#1e1e1e] rounded-lg shadow-md">
        <SortableHeader
          title="Tgl Observasi"
          sortKey="observation_date"
          currentSort={sortConfig}
          onSort={handleSort}
          className="text-sm text-gray-300"
        />
        <SortableHeader
          title="Tgl Upload"
          sortKey="created_at"
          currentSort={sortConfig}
          onSort={handleSort}
          className="text-sm text-gray-300"
        />
      </div>

      {/* Cards */}
      {sortedObservations
        .map((item, index) => (
          <div 
            key={index}
            onClick={() => handleClick(item)}
            className="bg-[#1e1e1e] rounded-lg shadow-md mb-3 overflow-hidden"
          >
            <div className="flex items-start p-3 gap-3">
              {/* Thumbnail dan Badges */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#121212] border border-[#444]">
                  <img 
                    src={item.images?.[0]?.url || item.image || getDefaultImage(item.type)}
                    alt={item.title} 
                    className={`w-full h-full ${
                      (item.images?.[0]?.url || item.image || '').includes('/assets/icon/') 
                        ? 'object-contain p-2' 
                        : 'object-cover'
                    }`}
                    loading={index < 10 ? "eager" : "lazy"}
                    onError={(e) => {
                      e.target.src = getDefaultImage(item.type);
                    }}
                  />
                </div>
                {item.images?.length > 1 && (
                  <div className="absolute -top-1 -right-1 bg-[#1a73e8] text-white text-xs px-1.5 rounded-full">
                    {item.images.length}
                  </div>
                )}
                {item.spectrogram && (
                  <div className="absolute -bottom-1 -right-1 bg-[#1a73e8] text-white p-1 rounded-full shadow-md">
                    <FontAwesomeIcon icon={faPlay} className="text-xs" />
                  </div>
                )}
              </div>

              {/* Informasi Utama */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-white truncate">{item.title}</h3>
                    <p className="text-sm text-gray-400 italic mt-0.5">
                      {extractScientificName(item.species) || item.nameLat || '-'}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                    item.quality.grade.toLowerCase() === 'research grade' ? 'bg-green-900/70 text-green-300' :
                    item.quality.grade.toLowerCase() === 'confirmed id' ? 'bg-blue-900/70 text-blue-300' :
                    item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-900/70 text-yellow-300' :
                    item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-900/70 text-orange-300' :
                    'bg-gray-700/70 text-gray-300'
                  }`}>
                    {getGradeDisplay(item.quality.grade, item.type)}
                  </span>
                </div>

                {/* Observer dan Lokasi */}
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Link 
                    to={`/profile/${item.observer_id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      window.open(`/profile/${item.observer_id}`, '_blank');
                    }}
                    className="text-blue-400"
                  >
                    {item.observer}
                  </Link>
                  {item.location && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-400 truncate">{item.location}</span>
                    </>
                  )}
                </div>

                {/* Tanggal */}
                <div className="px-3 pb-3 text-xs text-gray-300">
                  <div className="flex justify-between items-center">
                    <span>
                      Observasi: {item.observation_date 
                        ? new Date(item.observation_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '-'
                      }
                    </span>
                    <span>
                      Upload: {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Jumlah Observasi */}
                <div className="mt-2 flex gap-2 text-xs">
                  {item.type === 'bird' && (
                    <>
                      <span className="text-green-400">{item.fobi_count || 0} FOBI</span>
                      <span className="text-blue-400">{item.burungnesia_count || 0} Burungnesia</span>
                    </>
                  )}
                  {item.type === 'butterfly' && (
                    <>
                      <span className="text-green-400">{item.fobi_count || 0} FOBI</span>
                      <span className="text-purple-400">{item.kupunesia_count || 0} Kupunesia</span>
                    </>
                  )}
                  {item.type === 'general' && (
                    <span className="text-green-400">{item.fobi_count || 0} FOBI</span>
                  )}
                </div>

                {/* Icons */}
                <div className="mt-2 flex gap-2 text-gray-400">
                  {item.quality.has_media && (
                    <FontAwesomeIcon icon={faImage} title="Has Media" />
                  )}
                  {item.quality.is_wild && (
                    <FontAwesomeIcon icon={faDove} title="Wild" />
                  )}
                  {item.quality.location_accurate && (
                    <FontAwesomeIcon icon={faLocationDot} title="Location Accurate" />
                  )}
                  {item.quality.needs_id && (
                    <FontAwesomeIcon icon={faQuestion} title="Needs ID" />
                  )}
                  {item.type === 'general' && item.quality.recent_evidence && (
                    <FontAwesomeIcon icon={faCheck} title="Recent Evidence" />
                  )}
                  {item.type === 'general' && item.quality.related_evidence && (
                    <FontAwesomeIcon icon={faLink} title="Related Evidence" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

// Langkah 2: Modifikasi GridView Component untuk menangani view mode
const GridView = ({ searchParams, filterParams = defaultFilterParams, view = 'grid', setStats, activePolygon, centralizedFilters }) => {
  const [visibleIndex, setVisibleIndex] = useState(null);
  const cardRefs = useRef([]);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const navigate = useNavigate();
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const modalRef = useRef(null);
  const isMobile = window.innerWidth <= 768;
  
  // Tambahkan ref untuk menandai apakah ini adalah load pertama setelah view change
  const isInitialLoad = useRef(true);
  
  // Tambahkan ref untuk menyimpan stats terakhir
  const lastStats = useRef(null);
  
  // Tambahkan flag untuk mencegah pembaruan stats saat infinite scroll
  const isInfiniteScrolling = useRef(false);
  
  // Tambahkan ref untuk menyimpan stats awal untuk halaman ini
  const initialPageStats = useRef(null);
  
  // Tambahkan ref untuk melacak halaman sebelumnya
  const prevCurrentPage = useRef(currentPage);
  
  // Update prevCurrentPage setiap kali currentPage berubah
  useEffect(() => {
    prevCurrentPage.current = currentPage;
  }, [currentPage]);
  
  // Inisialisasi stats dari localStorage saat komponen mount
  useEffect(() => {
    // Ambil stats dari localStorage
    try {
      const savedStats = getStatsFromLocalStorage();
      console.log('GridView: Inisialisasi dengan stats dari localStorage:', savedStats);
      
      // Simpan stats ke ref
      lastStats.current = savedStats;
      initialPageStats.current = savedStats;
      
      // Set stats jika fungsi setStats tersedia
      if (setStats) {
        setStats(savedStats);
      }
    } catch (e) {
      console.error('Error initializing stats from localStorage:', e);
    }
    
    // Cleanup function
    return () => {
      console.log('GridView: Cleanup - menyimpan stats terakhir');
      if (initialPageStats.current) {
        localStorage.setItem('currentStats', JSON.stringify(initialPageStats.current));
      }
    };
  }, [setStats]);
  
  // Cek apakah perlu skip fetch stats saat pertama kali load
  useEffect(() => {
    // Cek flag dari localStorage
    const skipInitialFetch = localStorage.getItem('skipInitialStatsFetch') === 'true';
    
    if (skipInitialFetch) {
      console.log('GridView: Melewati fetch stats awal karena baru beralih dari view lain');
      isInitialLoad.current = true;
    } else {
      isInitialLoad.current = false;
    }
    
    return () => {
      // Reset flag saat komponen unmount
      isInitialLoad.current = false;
      // Reset flag skipFetchStats saat komponen unmount
      localStorage.setItem('skipFetchStats', 'false');
    };
  }, [setStats]);

  const { ref, inView } = useInView({
    threshold: 0,
  });

  const toggleDescription = (index) => {
    setVisibleIndex(visibleIndex === index ? null : index);
  };

  const handleClickOutside = (event) => {
    if (cardRefs.current.every(ref => ref && !ref.contains(event.target))) {
      setVisibleIndex(null);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setVisibleIndex(null);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Tambahkan useCallback untuk fungsi reset
  const resetGridView = useCallback(() => {
    setCurrentPage(1);
    setObservations([]);
    setHasMore(true);
    setLoadingMore(false);
  }, []);

  // Modifikasi useEffect untuk fetch data dengan dukungan centralizedFilters
  useEffect(() => {
    const fetchObservationsAndStats = async () => {
      try {
        // Reset state saat parameter pencarian berubah
        if (currentPage === 1) {
          setLoading(true);
          setObservations([]); // Reset observations
          // Reset flag infinite scrolling saat memulai pencarian baru
          isInfiniteScrolling.current = false;
          // Reset stats awal untuk halaman baru
          initialPageStats.current = null;
        }
        setError(null);

        const queryParams = new URLSearchParams();
        queryParams.append('page', currentPage);
        queryParams.append('per_page', 30);

        // Gunakan centralizedFilters jika tersedia
        if (centralizedFilters) {
          // Tambahkan filter dari centralizedFilters
          if (centralizedFilters.search) queryParams.append('search', centralizedFilters.search);
          if (centralizedFilters.start_date) queryParams.append('start_date', centralizedFilters.start_date);
          if (centralizedFilters.end_date) queryParams.append('end_date', centralizedFilters.end_date);
          if (centralizedFilters.latitude) queryParams.append('latitude', centralizedFilters.latitude);
          if (centralizedFilters.longitude) queryParams.append('longitude', centralizedFilters.longitude);
          if (centralizedFilters.radius) queryParams.append('radius', centralizedFilters.radius);
          if (centralizedFilters.polygon) queryParams.append('polygon', centralizedFilters.polygon);
          
          if (centralizedFilters.grade && centralizedFilters.grade.length > 0) {
            centralizedFilters.grade.forEach(g => queryParams.append('grade[]', g));
          }
          
          if (centralizedFilters.data_source && centralizedFilters.data_source.length > 0) {
            centralizedFilters.data_source.forEach(ds => queryParams.append('data_source[]', ds));
          }
          
          if (centralizedFilters.has_media) queryParams.append('has_media', centralizedFilters.has_media);
          if (centralizedFilters.media_type) queryParams.append('media_type', centralizedFilters.media_type);
        }

        // Tambahkan parameter dari searchParams jika tidak ada di centralizedFilters
        if (searchParams) {
          // Penanganan khusus untuk parameter species
          if (searchParams.species) {
            // Jika species adalah object, gunakan properti yang relevan
            if (typeof searchParams.species === 'object') {
              // Gunakan scientific_name atau name jika tersedia
              if (searchParams.species.scientific_name) {
                queryParams.append('search', searchParams.species.scientific_name);
                queryParams.append('searchType', 'species');
              } else if (searchParams.species.name) {
                queryParams.append('search', searchParams.species.name);
                queryParams.append('searchType', 'species');
              }
              // Jangan tambahkan parameter species sebagai object
            } 
            // Jika species adalah string, gunakan langsung
            else if (typeof searchParams.species === 'string') {
              queryParams.append('search', searchParams.species);
              queryParams.append('searchType', 'species');
            }
          } 
          // Penanganan parameter search biasa
          else if (searchParams.query && !centralizedFilters?.search) {
            queryParams.append('search', searchParams.query);
          }

          // Tambahkan parameter lain dari searchParams
          Object.entries(searchParams).forEach(([key, value]) => {
            // Hanya tambahkan jika belum ada di queryParams dan value tidak kosong
            // Skip parameter species karena sudah ditangani khusus
            if (value && !queryParams.has(key) && key !== 'species' && key !== 'query') {
              // Khusus untuk pencarian lokasi
              if (key === 'location' && !centralizedFilters?.location) {
                queryParams.append('location', value);
              }
              // Parameter lainnya
              else if (key !== 'query' && key !== 'location' && key !== 'data_source') {
                queryParams.append(key, value);
              }
            }
          });
        }

        // Tambahkan parameter dari filterParams jika tidak ada di centralizedFilters
        if (filterParams) {
          Object.entries(filterParams).forEach(([key, value]) => {
            // Hanya tambahkan jika belum ada di queryParams dan value tidak kosong
            // Skip parameter data_source karena sudah ditangani khusus
            if (!queryParams.has(key) && value && key !== 'data_source') {
              if (Array.isArray(value)) {
                // Jika belum ada di centralizedFilters
                if (!centralizedFilters?.[key] || centralizedFilters[key].length === 0) {
                  value.forEach(v => queryParams.append(`${key}[]`, v));
                }
              } else if (value) {
                queryParams.append(key, value);
              }
            }
          });
        }

        // Tambahkan polygon dari activePolygon jika ada dan tidak ada di centralizedFilters
        if (activePolygon && !centralizedFilters?.polygon) {
          const polygonString = formatPolygonForApi(activePolygon);
          if (polygonString) {
            queryParams.append('polygon', polygonString);
          }
        }

        // Pastikan data_source[] selalu ada
        if (!queryParams.has('data_source[]')) {
          const dataSources = centralizedFilters?.data_source || filterParams?.data_source || ['fobi', 'burungnesia', 'kupunesia'];
          if (Array.isArray(dataSources) && dataSources.length > 0) {
            dataSources.forEach(source => {
              queryParams.append('data_source[]', source);
            });
          } else {
            // Default data sources
            ['fobi', 'burungnesia', 'kupunesia'].forEach(source => {
              queryParams.append('data_source[]', source);
            });
          }
        }

        const queryString = queryParams.toString();
        console.log('Query params being sent:', queryString);

        const baseUrl = `${import.meta.env.VITE_API_URL}`;
        const fetchPromises = [];

        // Sesuaikan dengan data_source yang dipilih
        const selectedSources = centralizedFilters?.data_source || filterParams?.data_source || ['fobi', 'burungnesia', 'kupunesia'];

        // Buat array untuk menyimpan ID yang sudah diproses untuk menghindari duplikasi
        const processedIds = new Set();

        if (selectedSources.includes('fobi')) {
          fetchPromises.push(
            fetch(`${baseUrl}/general-observations${queryString ? `?${queryString}` : ''}`)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
              })
              .catch(err => {
                console.error('Error fetching general:', err);
                return { data: [] };
              })
          );
        }

        if (selectedSources.includes('burungnesia')) {
          fetchPromises.push(
            fetch(`${baseUrl}/bird-observations${queryString ? `?${queryString}` : ''}`)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
              })
              .catch(err => {
                console.error('Error fetching birds:', err);
                return { data: [] };
              })
          );
        }

        if (selectedSources.includes('kupunesia')) {
          fetchPromises.push(
            fetch(`${baseUrl}/butterfly-observations${queryString ? `?${queryString}` : ''}`)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
              })
              .catch(err => {
                console.error('Error fetching butterflies:', err);
                return { data: [] };
              })
          );
        }

        const responses = await Promise.all(fetchPromises);
        
        let newObservations = [];
        let totalCount = 0;
        
        // Indeks untuk melacak sumber data
        let sourceIndex = 0;
        
        for (const response of responses) {
          if (response?.data) {
            const data = response.data;
            let formattedData;
            
            if (selectedSources[sourceIndex] === 'fobi') {
              formattedData = formatGeneralData(data);
            } else if (selectedSources[sourceIndex] === 'burungnesia') {
              formattedData = formatBirdData(data);
            } else if (selectedSources[sourceIndex] === 'kupunesia') {
              formattedData = formatButterflyData(data);
            }
            
            // Tambahkan hanya data yang belum ada (berdasarkan ID)
            for (const item of formattedData) {
              if (!processedIds.has(item.id)) {
                processedIds.add(item.id);
                newObservations.push(item);
              }
            }
            
            // Tambahkan total dari setiap response
            if (response.meta?.total) {
              totalCount += response.meta.total;
            }
          }
          
          // Increment sourceIndex
          sourceIndex++;
        }

        // Update total items dan hasMore
        setTotalItems(totalCount);
        setHasMore(observations.length + newObservations.length < totalCount);

        // Update observations dengan menggabungkan data baru
        setObservations(prevObservations => {
          if (currentPage === 1) {
            return newObservations;
          }
          
          // Gabungkan dengan menghindari duplikasi
          const combinedObservations = [...prevObservations];
          for (const item of newObservations) {
            if (!prevObservations.some(prevItem => prevItem.id === item.id)) {
              combinedObservations.push(item);
            }
          }
          
          return combinedObservations;
        });

        // PERBAIKAN: Jangan fetch stats sama sekali, gunakan stats dari localStorage
        if (!isInfiniteScrolling.current) {
          try {
            // Gunakan stats dari localStorage
            const savedStats = getStatsFromLocalStorage();
            
            if (setStats && savedStats) {
              console.log('GridView: Menggunakan stats dari localStorage:', savedStats);
              setStats(savedStats);
              // Simpan stats ini sebagai stats awal untuk halaman ini
              initialPageStats.current = savedStats;
            }
          } catch (statsError) {
            console.error('Error getting stats from localStorage:', statsError);
          }
        } else {
          console.log('GridView: Melewati update stats karena sedang melakukan infinite scroll');
          
          // Gunakan stats awal yang sudah disimpan untuk halaman ini
          if (initialPageStats.current && setStats) {
            console.log('GridView: Mengembalikan stats awal saat infinite scroll:', initialPageStats.current);
            setStats(initialPageStats.current);
          }
        }
        
        // Setelah load pertama, set flag menjadi false
        isInitialLoad.current = false;
        
        // Reset flag infinite scrolling setelah selesai
        if (isInfiniteScrolling.current) {
          setTimeout(() => {
            // Hanya reset flag jika halaman saat ini bukan halaman berikutnya yang akan dimuat
            if (currentPage === prevCurrentPage.current + 1) {
              isInfiniteScrolling.current = false;
              console.log('GridView: Reset flag isInfiniteScrolling = false');
              
              // Kembalikan stats awal jika ada
              if (initialPageStats.current && setStats) {
                console.log('GridView: Mengembalikan stats awal setelah infinite scroll:', initialPageStats.current);
                setStats(initialPageStats.current);
              }
            } else {
              console.log('GridView: Mempertahankan flag isInfiniteScrolling = true karena masih ada halaman yang dimuat');
            }
          }, 2000); // Tambahkan waktu tunda yang lebih lama (2 detik)
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Gagal memuat data');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    // Gunakan debounce untuk fetchObservationsAndStats
    const debouncedFetch = debounce(() => {
      fetchObservationsAndStats();
    }, 500);

    debouncedFetch();
    
    // Cleanup
    return () => {
      debouncedFetch.cancel();
    };
  }, [searchParams, filterParams, currentPage, centralizedFilters, activePolygon, setStats]);

  // Fungsi untuk memformat polygon untuk API
  const formatPolygonForApi = (polygon) => {
    if (!polygon) return null;
    
    if (polygon.type === 'Polygon') {
      // Format: lng1,lat1|lng2,lat2|lng3,lat3...
      return polygon.coordinates[0]
        .map(coord => `${coord[0]},${coord[1]}`)
        .join('|');
    } else if (polygon.type === 'Circle') {
      // Untuk circle, kita perlu mengkonversi ke polygon
      // Ini adalah pendekatan sederhana, bisa dioptimalkan
      const { center, radius } = polygon;
      const points = [];
      const numPoints = 32; // Jumlah titik untuk membuat lingkaran
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const lng = center[0] + (radius / 111320 * Math.cos(angle)) / Math.cos(center[1] * Math.PI / 180);
        const lat = center[1] + (radius / 111320 * Math.sin(angle));
        points.push(`${lng},${lat}`);
      }
      
      // Tutup polygon dengan menambahkan titik pertama di akhir
      points.push(points[0]);
      
      return points.join('|');
    }
    
    return null;
  };

  // Tambahkan effect untuk reset saat parameter pencarian berubah
  useEffect(() => {
    resetGridView();
  }, [searchParams, filterParams, centralizedFilters, resetGridView]);

  // Modifikasi loadMore untuk memastikan flag isInfiniteScrolling tetap true
  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      console.log('GridView: Memulai loadMore, mengatur flag isInfiniteScrolling = true');
      setLoadingMore(true);
      // Set flag bahwa kita sedang melakukan infinite scroll dan pastikan tetap true
      isInfiniteScrolling.current = true;
      
      // Simpan stats saat ini sebelum melakukan infinite scroll
      if (!initialPageStats.current && setStats) {
        const savedStats = getStatsFromLocalStorage();
        console.log('GridView: Menyimpan stats awal sebelum infinite scroll:', savedStats);
        initialPageStats.current = savedStats;
      }
      
      // Tambahkan timeout untuk memastikan flag tetap true selama proses loading
      const keepFlagTimeout = setTimeout(() => {
        if (loadingMore) {
          console.log('GridView: Memastikan flag isInfiniteScrolling tetap true selama loading');
          isInfiniteScrolling.current = true;
        }
      }, 1000);
      
      setCurrentPage(prevPage => prevPage + 1);
      
      // Cleanup timeout
      return () => clearTimeout(keepFlagTimeout);
    }
  }, [loading, loadingMore, hasMore, setStats]);

  // Modifikasi effect untuk infinite scroll
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore) {
      console.log('GridView: Infinite scroll terdeteksi, memuat data tambahan');
      loadMore();
    }
  }, [inView, hasMore, loading, loadingMore, loadMore]);

  // Fungsi helper untuk memformat data dengan pengecekan null/undefined
  const formatGeneralData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
      // Tentukan judul berdasarkan rank dan ketersediaan cname
      let title = 'Belum teridentifikasi';
      
      // Cek rank untuk menentukan judul yang tepat
      if (item?.rank) {
        // Jika ada cname, gunakan cname
        if (item[`cname_${item.rank}`]) {
          title = item[`cname_${item.rank}`];
        } 
        // Jika tidak ada cname, gunakan nama ilmiah sesuai rank
        else if (item[item.rank]) {
          if (item.rank === 'family') {
            title = `Family: ${item[item.rank]}`;
          } else if (item.rank === 'genus') {
            title = `Genus: ${item[item.rank]}`;
          } else if (item.rank === 'species') {
            title = item[item.rank];
          } else {
            title = `${item.rank.charAt(0).toUpperCase() + item.rank.slice(1)}: ${item[item.rank]}`;
          }
        }
      } 
      // Jika tidak ada rank, coba cari dari cname yang tersedia
      else {
        title = item?.cname_species || 
                item?.cname_genus || 
                item?.cname_family || 
                item?.cname_order || 
                item?.species || 
                item?.genus || 
                item?.family || 
                item?.order || 
                item?.class || 
                item?.phylum || 
                item?.kingdom || 
                item?.superkingdom || 
                item?.tribe || 
                item?.variety || 
                item?.subspecies || 
                item?.subgenus || 
                item?.subfamily || 
                item?.suborder || 
                item?.subclass || 
                item?.subphylum || 
                item?.subkingdom || 
                item?.form || 
                item?.variety || 
                item?.division || 
                item?.domain || 
                'Belum teridentifikasi';
      }
      
      return {
        id: `${item?.id || ''}`,
        taxa_id: item?.taxa_id || '',
        media_id: item?.media_id || '',
        image: item?.images?.[0]?.url || null,
        title: title,
        description: `Family: ${item?.family || '-'}
        Genus: ${item?.genus || '-'}
        Species: ${extractScientificName(item?.species) || '-'} 
        `,
        observer: item?.observer_name || 'Anonymous',
        observer_id: item?.observer_id || '',
        quality: {
          grade: item?.grade || 'casual',
          has_media: Boolean(item?.has_media),
          is_wild: Boolean(item?.is_wild),
          location_accurate: Boolean(item?.location_accurate),
          recent_evidence: Boolean(item?.recent_evidence),
          related_evidence: Boolean(item?.related_evidence),
          needs_id: Boolean(item?.needs_id),
          community_id_level: item?.community_id_level || null
        },
        observation_date: item?.observation_date || '',
        created_at: item?.created_at || new Date(0).toISOString(),
        updated_at: item?.updated_at || '',
        type: 'general',
        source: item?.source || 'fobi',
        spectrogram: item?.spectrogram || null,
        identifications_count: item?.total_identifications || 0,
        fobi_count: item?.fobi_count || 0,
        location: formatLocation(item?.latitude, item?.longitude),
        locationData: {
          latitude: parseFloat(item?.latitude),
          longitude: parseFloat(item?.longitude)
        },
        rank: item?.rank || '',
        species: item?.species || '',
        genus: item?.genus || '',
        family: item?.family || '',
      };
    });
  };

  const formatBirdData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: `${item?.id || ''}`,
      fauna_id: item?.fauna_id || '',
      image: item?.images?.[0]?.url || null,
      title: item?.nameId || 'Belum teridentifikasi',
      description: `${item?.nameLat || '-'}\n${item?.family || '-'}\nGrade: ${item?.grade || '-'}\n${item?.notes || '-'}`,
      observer: item?.observer_name || 'Anonymous',
      observer_id: item?.observer_id || '',
      count: `${item?.count || 0} Individu`,
      breeding: item?.breeding ? 'Breeding' : 'Non-breeding',
      breeding_note: item?.breeding_note || '-',
      quality: {
        grade: item?.grade || 'casual',
        has_media: Boolean(item?.has_media),
        is_wild: Boolean(item?.is_wild),
        location_accurate: Boolean(item?.location_accurate),
        needs_id: Boolean(item?.needs_id),
        community_level: item?.community_id_level || null
      },
      type: 'bird',
      source: item?.source || 'burungnesia',
      spectrogram: item?.spectrogram || null,
      identifications_count: item?.total_identifications || 0,
      burungnesia_count: item?.burungnesia_count || 0,
      fobi_count: item?.fobi_count || 0,
      created_at: item?.created_at || new Date(0).toISOString(),
      observation_date: item?.observation_date || '',
      location: formatLocation(item?.latitude, item?.longitude),
      locationData: {
        latitude: parseFloat(item?.latitude),
        longitude: parseFloat(item?.longitude)
      },
    }));
  };

  const formatButterflyData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: `${item?.id || ''}`,
      fauna_id: item?.fauna_id || '',
      image: item?.images?.[0]?.url || null,
      title: item?.nameId || 'Belum teridentifikasi',
      description: `${item?.nameLat || '-'}\n${item?.family || '-'}\nGrade: ${item?.grade || '-'}\n${item?.notes || '-'}`,
      observer: item?.observer_name || 'Anonymous',
      observer_id: item?.observer_id || '',
      count: `${item?.count || 0} Individu`,
      breeding: item?.breeding ? 'Breeding' : 'Non-breeding',
      breeding_note: item?.breeding_note || '-',
      quality: {
        grade: item?.grade || 'casual',
        has_media: Boolean(item?.has_media),
        is_wild: Boolean(item?.is_wild),
        location_accurate: Boolean(item?.location_accurate),
        needs_id: Boolean(item?.needs_id),
        community_level: item?.community_id_level || null
      },
      type: 'butterfly',
      source: item?.source || 'kupunesia',
      spectrogram: item?.spectrogram || null,
      identifications_count: item?.total_identifications || 0,
      kupunesia_count: item?.kupunesia_count || 0,
      fobi_count: item?.fobi_count || 0,
      created_at: item?.created_at || new Date(0).toISOString(),
      observation_date: item?.observation_date || '',
      location: formatLocation(item?.latitude, item?.longitude),
      locationData: {
        latitude: parseFloat(item?.latitude),
        longitude: parseFloat(item?.longitude)
      },
    }));
  };

  const handleMobileClick = (item) => {
    let path;
    const source = item.type || 'fobi';
    let prefix = '';
    let baseId = item.id || '';
    
    // Tentukan prefix berdasarkan tipe
    if (source === 'bird') {
      prefix = 'BN';
    } else if (source === 'butterfly') {
      prefix = 'KP';
    }
    
    // Tentukan URL berdasarkan sumber data
    if (source === 'general') {
      // Untuk data FOBI general
      path = `/observations/${baseId}?source=fobi`;
    } else if (item.source?.includes('fobi')) {
      // Untuk checklist dari sumber FOBI
      path = `/detail-checklist/${prefix}${baseId}`;
    } else {
      // Untuk data non-FOBI (burungnesia dan kupunesia biasa)
      path = `/app-checklist/${prefix}${baseId}`;
    }
    
    window.open(path, '_blank');
  };

  // Fungsi untuk membuka di tab baru
  const handleRowClick = (item) => {
    let path;
    const source = item.type || 'fobi';
    let prefix = '';
    let baseId = item.id || '';
    
    // Tentukan prefix berdasarkan tipe
    if (source === 'bird') {
      prefix = 'BN';
    } else if (source === 'butterfly') {
      prefix = 'KP';
    }
    
    // Tentukan URL berdasarkan sumber data
    if (source === 'general') {
      // Untuk data FOBI general
      path = `/observations/${baseId}?source=fobi`;
    } else if (item.source?.includes('fobi')) {
      // Untuk checklist dari sumber FOBI
      path = `/detail-checklist/${prefix}${baseId}`;
    } else {
      // Untuk data non-FOBI (burungnesia dan kupunesia biasa)
      path = `/app-checklist/${prefix}${baseId}`;
    }
    
    window.open(path, '_blank');
  };

  // Modifikasi tampilan loading dan error
  if (loading && currentPage === 1) {
  return (
      <div className="flex items-center justify-center h-[calc(100vh-300px)] text-gray-300">
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className="w-8 h-8 border-4 border-gray-700 border-t-[#1a73e8] rounded-full animate-spin"></div>
          <span>Memuat data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-300px)] text-gray-300">
        <div className="flex flex-col items-center gap-3">
          <span className="text-red-400">{error}</span>
          <button 
            onClick={() => {
              setError(null);
              resetGridView();
            }}
            className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#0d47a1] transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // Tampilan saat tidak ada data
  if (!loading && observations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-300px)] text-gray-300">
        <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
          <span>Tidak ada data yang ditemukan</span>
          <span className="text-sm text-gray-400">
            Coba ubah filter atau kata kunci pencarian Anda
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop View */}
      {view === 'grid' ? (
        <div className="hidden md:grid gap-3 px-4 mx-auto mb-16
          md:grid-cols-3 md:max-w-4xl 
          lg:grid-cols-4 lg:max-w-6xl 
          xl:grid-cols-5 xl:max-w-7xl
          2xl:grid-cols-6 2xl:max-w-[90rem]">
          {observations.map((item, index) => (
            <Card 
              key={index} 
              item={item} 
              isEager={index < 10}
            />
          ))}
        </div>
      ) : (
        <ListViewDesktop 
          observations={observations}
          handleClick={handleRowClick}
        />
      )}

      {/* Mobile View */}
      <div className="md:hidden">
        {view === 'grid' ? (
          <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3">
            {observations.map((item, index) => (
              <div key={index} className="card relative rounded-md overflow-hidden">
                <div
                  className="cursor-pointer aspect-square relative"
                  onClick={() => handleMobileClick(item)}
                >
                  {item.spectrogram ? (
                    <div className="w-full h-full">
                      <SpectrogramPlayer
                        spectrogramUrl={item.spectrogram}
                        audioUrl={item.audioUrl}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-[#121212]">
                      <img 
                        src={item.images?.[0]?.url || item.image || getDefaultImage(item.type)}
                        alt={item.title} 
                        className={`w-full h-full ${
                          (item.images?.[0]?.url || item.image || '').includes('/assets/icon/') 
                            ? 'object-contain p-4' 
                            : 'object-cover'
                        }`}
                        loading={index < 10 ? "eager" : "lazy"}
                        onError={(e) => {
                          e.target.src = getDefaultImage(item.type);
                        }}
                      />
                    </div>
                  )}
                  <div className="absolute top-1 left-1 right-1">
                    <span className="text-[10px] line-clamp-2 text-white font-medium drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                      {item.title}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-1 left-1">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full text-white ${
                    item.quality.grade.toLowerCase() === 'research grade' ? 'bg-green-500/70' :
                    item.quality.grade.toLowerCase() === 'confirmed id' ? 'bg-blue-500/70' :
                    item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-500/70' :
                    item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-500/70' :
                    item.type === 'bird' ? 'bg-blue-500/70' :
                    item.type === 'butterfly' ? 'bg-purple-500/70' :
                    'bg-green-500/70'
                  }`}>
                    {getGradeDisplay(item.quality.grade, item.type)}
                  </span>
                </div>

                <button
                  onClick={() => toggleDescription(index)}
                  className="absolute bottom-1 right-1 bg-black/50 hover:bg-black/70 text-white w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                >
                  <FontAwesomeIcon icon={faInfo} className="text-[8px]" />
                </button>

                {visibleIndex === index && (
                  <div className="absolute inset-0 bg-black/90 text-white p-3 text-xs overflow-y-auto">
                    <div className="space-y-2">
                      <p className="font-medium">{item.title}</p>
                      <p className="whitespace-pre-line text-gray-300">{item.description}</p>
                      <p className="text-gray-300">Observer: {item.observer}</p>
                      {item.breeding && <p className="text-gray-300">{item.breeding}</p>}
                      {item.count && <p className="text-gray-300">{item.count}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <ListViewMobile 
            observations={observations}
            handleClick={handleRowClick}
          />
        )}
      </div>

      {/* Info jumlah data untuk debug
      <div className="text-center text-sm text-gray-600 mt-4">
        Menampilkan {observations.length} dari {totalItems} data
      </div> */}

      {/* Loading More Indicator */}
      {hasMore && (
        <div className="mt-4 flex justify-center" ref={ref}>
          {loadingMore ? (
            <div className="flex items-center space-x-2 text-gray-300">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-[#1a73e8] rounded-full animate-spin"></div>
              <span>Memuat...</span>
            </div>
          ) : (
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-[#1e1e1e] hover:bg-[#2c2c2c] rounded-lg text-sm text-gray-300 transition-colors border border-[#444]"
            >
              Muat {Math.min(30, totalItems - observations.length)} Data Lainnya
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default GridView;
