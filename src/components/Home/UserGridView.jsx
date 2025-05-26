import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faInfo, faListDots, faImage, faDove, faLocationDot, faQuestion, faCheck, faLink, faPlay, faPause, faUsers } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../../utils/api';
import 'swiper/css';
import './GridView.css';

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
      <div className="relative flex-1 w-full h-32 bg-gray-900 overflow-hidden">
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
              onClick={togglePlay}
              className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="text-sm" />
            </button>
            <audio ref={audioRef} src={audioUrl} className="hidden" preload="metadata" />
          </>
        )}
      </div>
    </div>
  );
};

const getGradeDisplay = (grade) => {
  switch(grade.toLowerCase()) {
    case 'research grade':
      return 'ID Lengkap';
    case 'low quality id':
      return 'ID Kurang';
    case 'needs id':
      return 'Bantu Iden';
    case 'casual':
      return 'Casual';
    default:
      return grade;
  }
};

const Card = ({ item }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    let path;
    switch(item.type) {
      case 'bird':
        path = `/burungnesia/observations/${item.id}`;
        break;
      case 'butterfly':
        path = `/kupunesia/observations/${item.id}`;
        break;
      default:
        path = `/observations/${item.id}`;
    }
    navigate(path);
  };

  return (
    <div className="card relative" onClick={handleClick}>
      <div className="h-48 overflow-hidden bg-gray-900">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {item.spectrogram && (
          <SpectrogramPlayer
            spectrogramUrl={item.spectrogram}
            audioUrl={item.audioUrl}
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold">{item.title}</h3>
        <p className="text-sm text-gray-600">{item.description}</p>
        <div className="mt-2">
          <span className={`inline-block px-2 py-1 rounded text-xs ${
            item.quality.grade.toLowerCase() === 'research grade' ? 'bg-green-100 text-green-800' :
            item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-100 text-orange-800' :
            item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {getGradeDisplay(item.quality.grade)}
          </span>
        </div>
      </div>
    </div>
  );
};

const UserGridView = () => {
  const [visibleIndex, setVisibleIndex] = useState(null);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleMobileClick = (item) => {
    let path;
    switch(item.type) {
      case 'bird':
        path = `/burungnesia/observations/${item.id}`;
        break;
      case 'butterfly':
        path = `/kupunesia/observations/${item.id}`;
        break;
      default:
        path = `/observations/${item.id}`;
    }
    navigate(path);
  };

  useEffect(() => {
    const fetchUserObservations = async () => {
      try {
        setLoading(true);
        setError(null);

        const [generalResponse, birdResponse, butterflyResponse] = await Promise.all([
          apiFetch('/user-general-observations'),
          apiFetch('/user-bird-observations'),
          apiFetch('/user-butterfly-observations')
        ]);

        const generalData = await generalResponse.json();
        const birdData = await birdResponse.json();
        const butterflyData = await butterflyResponse.json();

        const combinedData = [
          ...formatGeneralData(generalData.data || []),
          ...formatBirdData(birdData.data || []),
          ...formatButterflyData(butterflyData.data || [])
        ];

        setObservations(combinedData);
      } catch (err) {
        console.error('Error fetching user observations:', err);
        setError('Gagal mengambil data observasi');
      } finally {
        setLoading(false);
      }
    };

    fetchUserObservations();
  }, []);

  // Format functions sama dengan GridView
  const formatGeneralData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: item?.id || '',
      taxa_id: item?.taxa_id || '',
      image: item?.images?.[0]?.url || '/default-image.jpg',
      title: item?.scientific_name || 'Tidak ada nama',
      description: `Class: ${item?.class || '-'}
Order: ${item?.order || '-'}
Family: ${item?.family || '-'}
Genus: ${item?.genus || '-'}
Species: ${item?.species || '-'}
Details: ${item?.observation_details || '-'}`,
      quality: {
        grade: item?.grade || 'casual',
        has_media: Boolean(item?.has_media),
        is_wild: Boolean(item?.is_wild),
        location_accurate: Boolean(item?.location_accurate)
      },
      type: 'general',
      spectrogram: item?.spectrogram || null,
      audioUrl: item?.audioUrl || null
    }));
  };

  const formatBirdData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: item?.id || '',
      fauna_id: item?.fauna_id || '',
      image: item?.images?.[0]?.url || '/default-bird.jpg',
      title: item?.nameId || 'Tidak ada nama',
      description: `${item?.nameLat || '-'}\n${item?.family || '-'}\nGrade: ${item?.grade || '-'}\n${item?.notes || '-'}`,
      quality: {
        grade: item?.grade || 'casual',
        has_media: Boolean(item?.has_media),
        is_wild: Boolean(item?.is_wild),
        location_accurate: Boolean(item?.location_accurate)
      },
      type: 'bird',
      spectrogram: item?.spectrogram || null,
      audioUrl: item?.audioUrl || null
    }));
  };

  const formatButterflyData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: item?.id || '',
      fauna_id: item?.fauna_id || '',
      image: item?.images?.[0]?.url || '/default-butterfly.jpg',
      title: item?.nameId || 'Tidak ada nama',
      description: `${item?.nameLat || '-'}\n${item?.family || '-'}\nGrade: ${item?.grade || '-'}\n${item?.notes || '-'}`,
      quality: {
        grade: item?.grade || 'casual',
        has_media: Boolean(item?.has_media),
        is_wild: Boolean(item?.is_wild),
        location_accurate: Boolean(item?.location_accurate)
      },
      type: 'butterfly',
      spectrogram: item?.spectrogram || null,
      audioUrl: item?.audioUrl || null
    }));
  };

  if (loading) return <div className="text-center p-4">Memuat data observasi...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;
  if (observations.length === 0) return <div className="text-center p-4">Belum ada observasi</div>;

  return (
    <>
      <div className="hidden md:grid grid-cols-5 gap-4">
        {observations.map((item, index) => (
          <Card key={index} item={item} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 md:hidden mx-1">
        {observations.map((item, index) => (
          <div
            key={index}
            className="card relative"
            onClick={() => handleMobileClick(item)}
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-24 object-cover"
            />
            <span className="observer absolute w-full bottom-0 left-0 bg-black bg-opacity-50 text-white p-1 text-xs">
              {item.title}
            </span>
            <span className={`absolute top-0 left-0 text-xs px-2 py-1 text-white ${
              item.quality.grade.toLowerCase() === 'research grade' ? 'bg-green-500' :
              item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-500' :
              item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-500' :
              'bg-gray-500'
            }`}>
              {getGradeDisplay(item.quality.grade)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

export default UserGridView;
