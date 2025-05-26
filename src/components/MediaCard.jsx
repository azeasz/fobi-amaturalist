import React, { useState, useRef, useEffect } from 'react';
import LocationPicker from './Observations/LocationPicker';
import Modal from './Observations/LPModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDna,
    faCalendar,
    faLocationDot,
    faTree,
    faNoteSticky,
    faMusic,
    faPlay,
    faPause,
    faChevronLeft,
    faChevronRight,
    faInfo
} from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import 'swiper/css/free-mode';
import './MediaCard.css';
import SpectrogramModal from './SpectrogramModal';
import QualityBadge from './QualityBadge';
import PropTypes from 'prop-types';
import { apiFetch } from '../utils/api';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';


function MediaCard({ observation, isSelected, onSelect, onUpdate, onDelete, bulkFormData, qualityGrade, uploadSessionId }) {
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [audioTime, setAudioTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [error, setError] = useState(null);
    const [isSpectrogramModalOpen, setIsSpectrogramModalOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const audioRef = useRef(null);
    const spectrogramRef = useRef(null);
    const progressRef = useRef(null);
    const audioUrlRef = useRef(null);
    const spectrogramContainerRef = useRef(null);
    const [spectrogramWidth, setSpectrogramWidth] = useState(0);
    const swiperRef = useRef(null);

    const [formData, setFormData] = useState({
        ...observation,
        scientific_name: observation.scientific_name || '',
        date: observation.date || '',
        latitude: observation.latitude || '',
        longitude: observation.longitude || '',
        locationName: observation.locationName || '',
        habitat: observation.habitat || '',
        description: observation.description || '',
        type_sound: observation.type_sound || '',
        kingdom: observation.kingdom || '',
        phylum: observation.phylum || '',
        class: observation.class || '',
        order: observation.order || '',
        family: observation.family || '',
        genus: observation.genus || '',
        species: observation.species || '',
        common_name: observation.common_name || '',
        taxon_rank: observation.taxon_rank || ''
    });

    useEffect(() => {
        if (isSelected && bulkFormData) {
            setFormData(prev => ({
                ...prev,
                ...Object.fromEntries(
                    Object.entries(bulkFormData).map(([key, value]) => [key, value || prev[key] || ''])
                )
            }));
        }
    }, [bulkFormData, isSelected]);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            upload_session_id: uploadSessionId
        }));
    }, [uploadSessionId]);

    const getAudioUrl = () => {
        if (!observation?.file) return '';
        return URL.createObjectURL(observation.file);
    };

    const [audioUrl, setAudioUrl] = useState('');

    useEffect(() => {
        const url = getAudioUrl();
        setAudioUrl(url);

        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [observation.file]);

    useEffect(() => {
        if (!audioRef.current) return;

        const audio = audioRef.current;

        const handlePlay = () => {
            setIsPlaying(true);
            setError(null);
        };

        const handlePause = () => setIsPlaying(false);

        const handleEnded = () => {
            setIsPlaying(false);
            if (progressRef.current) {
                progressRef.current.style.width = '0%';
            }
            if (swiperRef.current?.swiper) {
                swiperRef.current.swiper.setTranslate(0);
            }
        };

        const handleWaiting = () => setIsBuffering(true);

        const handleCanPlay = () => setIsBuffering(false);

        const handleError = (e) => {
            console.error('Audio error:', e);
            setError('Terjadi kesalahan saat memutar audio');
            setIsPlaying(false);
            setIsBuffering(false);
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
        };
    }, []);

    useEffect(() => {
        if (spectrogramRef.current) {
            const updateWidth = () => {
                setSpectrogramWidth(spectrogramRef.current.scrollWidth);
            };
            updateWidth();
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }
    }, [observation.spectrogramUrl]);

    useEffect(() => {
        if (audioRef.current && swiperRef.current?.swiper) {
            const audio = audioRef.current;
            const swiper = swiperRef.current.swiper;

            const handleTimeUpdate = () => {
                const progress = audio.currentTime / audio.duration;
                const slideSize = swiper.size;
                const totalWidth = swiper.virtualSize - slideSize;

                swiper.translateTo(-totalWidth * progress, 300, true);
            };

            audio.addEventListener('timeupdate', handleTimeUpdate);
            return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
        }
    }, []);
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            const duration = audioRef.current.duration;

            if (isNaN(duration)) return;

            setAudioTime(currentTime);

            if (progressRef.current) {
                const progress = (currentTime / duration) * 100;
                progressRef.current.style.transform = `scaleX(${progress / 100})`;
            }

            if (swiperRef.current?.swiper) {
                const swiper = swiperRef.current.swiper;
                const slideSize = swiper.size;
                const totalWidth = swiper.virtualSize - slideSize;
                const progress = currentTime / duration;

                requestAnimationFrame(() => {
                    swiper.translateTo(-totalWidth * progress, 300, true);
                });
            }
        }
    };

    const handleLoadedMetadata = () => {
        try {
            if (audioRef.current) {
                const duration = audioRef.current.duration;
                if (!isNaN(duration)) {
                    setAudioDuration(duration);
                }
            }
        } catch (error) {
            console.error('Error loading metadata:', error);
        }
    };

    const handleSpectrogramClick = (e) => {
        if (audioRef.current && swiperRef.current?.swiper) {
            const swiper = swiperRef.current.swiper;
            const rect = swiper.el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            const clickPosition = x / width;

            const newTime = audioRef.current.duration * clickPosition;
            if (!isNaN(newTime)) {
                audioRef.current.currentTime = newTime;

                const totalWidth = swiper.virtualSize - swiper.size;
                swiper.setTranslate(-totalWidth * clickPosition);

                if (!isPlaying) {
                    audioRef.current.play()
                        .catch(error => {
                            console.error('Error playing audio:', error);
                            setError('Gagal memutar audio');
                        });
                }
            }
        }
    };

    const handleLocationSave = (lat, lng, name) => {
        const updatedData = {
            ...formData,
            latitude: lat,
            longitude: lng,
            locationName: name
        };

        setFormData(updatedData);
        onUpdate(updatedData);
        setIsLocationModalOpen(false);
    };

    const handleOpenLocationModal = () => {
        setIsLocationModalOpen(true);
    };

    useEffect(() => {
        console.log('Current formData:', formData);
    }, [formData.latitude, formData.longitude, formData.locationName]);

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [page, setPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const suggestionsRef = useRef(null);

    const timeoutRef = useRef(null);
    const abortControllerRef = useRef(null);

    const handleInputChange = async (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value,
            displayName: name === 'scientific_name' ? value : prev.displayName
        }));

        if (name === 'scientific_name') {
            // Jika inputnya "Unknown", atur taxon_rank ke UNKNOWN
            if (value.toLowerCase() === 'unknown') {
                setFormData(prev => ({
                    ...prev,
                    scientific_name: 'Unknown',
                    taxon_rank: 'UNKNOWN',
                    displayName: 'Unknown'
                }));
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            if (!value) {
                setFormData(prev => ({
                    ...prev,
                    scientific_name: '',
                    species: '',
                    common_name: '',
                    kingdom: '',
                    phylum: '',
                    class: '',
                    order: '',
                    family: '',
                    genus: '',
                    taxon_rank: '',
                    displayName: ''
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
                        
                        setIsLoadingMore(true);
                        setSuggestions([]); // Reset suggestions while loading

                        const response = await apiFetch(
                            `/taxonomy/search?q=${encodeURIComponent(value)}&page=${1}&per_page=20`,
                            {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                signal: abortControllerRef.current.signal
                            }
                        );

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const data = await response.json();

                        if (data.success) {
                            // Ambil lebih banyak data untuk ditampilkan (20 item)
                            setSuggestions(data.data);
                            setShowSuggestions(true);
                            
                            // Pastikan pagination info ada
                            const totalPages = data.pagination?.total_pages || 1;
                            console.log('Total pages:', totalPages);
                            setHasMore(totalPages > 1);
                            setPage(1);
                        } else {
                            setSuggestions([]);
                            setShowSuggestions(false);
                            setHasMore(false);
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.error('Error fetching suggestions:', error);
                            setSuggestions([]);
                            setShowSuggestions(false);
                            setHasMore(false);
                        }
                    } finally {
                        setIsLoadingMore(false);
                    }
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setHasMore(false);
                }
            }, 300);
        }
    };

    const loadMoreSuggestions = async () => {
        if (!hasMore || isLoadingMore) return;

        try {
            setIsLoadingMore(true);
            const nextPage = page + 1;
            const value = formData.scientific_name;

            console.log('Loading more suggestions, page:', nextPage);

            const response = await apiFetch(`/taxonomy/search?q=${encodeURIComponent(value)}&page=${nextPage}&per_page=20`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                // Mengambil semua data dari respons
                const newSuggestions = data.data;
                console.log('Received new suggestions:', newSuggestions.length);
                
                // Buat Map untuk mencatat ID dan scientific_name yang sudah ada, lebih efisien untuk pencarian
                const existingIdsMap = new Map();
                const existingNamesMap = new Map();
                
                suggestions.forEach(item => {
                    // Catat ID yang sudah ada
                    if (item.id) existingIdsMap.set(item.id, true);
                    if (item.full_data?.id) existingIdsMap.set(item.full_data.id, true);
                    
                    // Catat scientific_name+rank yang sudah ada untuk menghindari duplikasi seperti Lepidoptera
                    const nameRankKey = `${item.scientific_name}-${item.rank}`;
                    existingNamesMap.set(nameRankKey, true);
                });
                
                // Filter saran baru untuk menghilangkan duplikasi berdasarkan ID dan scientific_name+rank
                const uniqueNewSuggestions = newSuggestions.filter(item => {
                    // Cek duplikasi ID
                    if (item.id && existingIdsMap.has(item.id)) return false;
                    if (item.full_data?.id && existingIdsMap.has(item.full_data.id)) return false;
                    
                    // Cek duplikasi scientific_name+rank
                    const nameRankKey = `${item.scientific_name}-${item.rank}`;
                    if (existingNamesMap.has(nameRankKey)) return false;
                    
                    return true;
                });
                
                console.log('Unique new suggestions:', uniqueNewSuggestions.length);
                
                if (uniqueNewSuggestions.length > 0) {
                    setSuggestions(prev => [...prev, ...uniqueNewSuggestions]);
                    setPage(nextPage);
                    
                    // Pastikan pagination info ada dan diproses dengan benar
                    const totalPages = data.pagination?.total_pages || nextPage;
                    console.log('Total pages:', totalPages, 'Current page:', nextPage);
                    setHasMore(totalPages > nextPage);
                } else {
                    // Jika tidak ada item baru yang ditemukan
                    console.log('No new unique suggestions found');
                    setHasMore(false);
                }
            } else {
                // Jika API mengembalikan status error
                console.log('API returned error status');
                setHasMore(false);
                if (data.message) {
                    console.warn('API warning:', data.message);
                }
            }
        } catch (error) {
            console.error('Error loading more suggestions:', error);
            setHasMore(false);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleSuggestionsScroll = (e) => {
        const element = e.target;
        // Deteksi ketika scroll hampir di dasar (dengan margin 30px)
        if (element.scrollHeight - element.scrollTop - element.clientHeight < 30) {
            loadMoreSuggestions();
        }
    };

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

    const displayName = extractScientificName(formData.scientific_name);

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
                
                if (taxon.full_data.phylum) {
                    ranks.push(`Phylum: ${taxon.full_data.phylum}`);
                }
                
                if (taxon.full_data.kingdom) {
                    ranks.push(`Kingdom: ${taxon.full_data.kingdom}`);
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

    const handleSuggestionClick = (suggestion) => {
        const updatedData = {
            ...formData,
            taxon_id: suggestion.full_data.id,
            species: suggestion.full_data.species || '',
            subspecies: suggestion.full_data.subspecies || '',
            variety: suggestion.full_data.variety || '',
            form: suggestion.full_data.form || '',
            common_name: suggestion.full_data.cname_species || suggestion.common_name || '',
            scientific_name: suggestion.scientific_name || '',
            kingdom: suggestion.full_data.kingdom || '',
            phylum: suggestion.full_data.phylum || '',
            class: suggestion.full_data.class || '',
            order: suggestion.full_data.order || '',
            family: suggestion.full_data.family || '',
            genus: suggestion.full_data.genus || '',
            taxon_rank: suggestion.rank || suggestion.full_data.taxon_rank || '',
            displayName: extractScientificName(suggestion.scientific_name || suggestion.full_data.species || ''),
            cname_kingdom: suggestion.full_data.cname_kingdom || '',
            cname_phylum: suggestion.full_data.cname_phylum || '',
            cname_class: suggestion.full_data.cname_class || '',
            cname_order: suggestion.full_data.cname_order || '',
            cname_family: suggestion.full_data.cname_family || '',
            cname_genus: suggestion.full_data.cname_genus || '',
            cname_species: suggestion.full_data.cname_species || suggestion.common_name || '',
        };

        // Log untuk debugging
        console.log("Suggestion selected:", suggestion);
        console.log("Updated formData with taxon_rank:", updatedData);

        setFormData(updatedData);
        onUpdate(updatedData);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleInputBlur = () => {
        setTimeout(() => {
            setShowSuggestions(false);
        }, 200);
    };

    const handleSave = () => {
        if (!observation.locationName) {
            toast.error('Lokasi harus diisi!', {
                position: "top-right",
                autoClose: 3000,
                theme: "colored"
            });
            return;
        }

        // Jika scientific_name kosong, atur ke "Unknown" dengan rank UNKNOWN
        const updatedFormData = { ...formData };
        if (!updatedFormData.scientific_name) {
            updatedFormData.scientific_name = "Unknown";
            updatedFormData.taxon_rank = "UNKNOWN";
            updatedFormData.displayName = "Unknown";
        }

        onUpdate({
            ...updatedFormData,
            upload_session_id: uploadSessionId
        });
        setIsEditing(false);
    };

    const handleSpectrogramModalOpen = () => {
        setIsSpectrogramModalOpen(true);
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play()
                    .then(() => {
                        setIsPlaying(true);
                        setError(null);
                    })
                    .catch(error => {
                        console.error('Error playing audio:', error);
                        setError('Gagal memutar audio');
                    });
            }
        }
    };

    useEffect(() => {
        if (onUpdate) {
            onUpdate({
                ...formData,
                common_name: formData.common_name || '',
                species: formData.species || '',
                scientific_name: formData.scientific_name || '',
                taxon_rank: formData.taxon_rank || '',
                upload_session_id: uploadSessionId
            });
        }
    }, [formData, uploadSessionId]);

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

    const handleUpdate = (data) => {
        // Hapus validasi untuk scientific_name karena bisa "Unknown" atau kosong
        if (!data.date || !observation.locationName || !data.habitat) {
            toast.error('Mohon lengkapi semua field yang wajib diisi!', {
                position: "top-right",
                autoClose: 3000,
                theme: "colored"
            });
            return;
        }

        // Jika scientific_name kosong, atur ke "Unknown"
        if (!data.scientific_name) {
            data.scientific_name = "Unknown";
            data.taxon_rank = "UNKNOWN";
            data.displayName = "Unknown";
        }

        onUpdate(id, {
            ...data,
            scientific_name: data.scientific_name,
            common_name: data.common_name,
            class: data.class,
            order: data.order,
            family: data.family,
            genus: data.genus,
            species: data.species,
            kingdom: data.kingdom, // Tambahkan kingdom ke data yang diupdate
            taxon_rank: data.taxon_rank,
            description: data.description,
            habitat: data.habitat,
            type_sound: data.type_sound
        });
    };

    const formatCoordinate = (coord) => {
        if (typeof coord === 'number') {
            return coord.toFixed(6);
        }
        return '';
    };

    const analyzeAudio = async (audioUrl) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);
            analyser.getFloatFrequencyData(dataArray);

            const nyquistFrequency = audioContext.sampleRate / 2;
            const binSize = nyquistFrequency / bufferLength;

            let maxFreq = 0;
            for (let i = 0; i < bufferLength; i++) {
                const amplitude = dataArray[i];
                const frequency = i * binSize;

                if (amplitude > -100 && frequency > maxFreq) {
                    maxFreq = frequency;
                }
            }

            maxFreq = Math.ceil(maxFreq / 1000) * 1000;

            const labels = [];
            const steps = [1, 0.5, 0.25, 0];

            steps.forEach(step => {
                const freq = maxFreq * step;
                if (freq === 0) {
                    labels.push('0 Hz');
                } else if (freq >= 1000) {
                    labels.push(`${Math.round(freq/1000)} kHz`);
                } else {
                    labels.push(`${Math.round(freq)} Hz`);
                }
            });

            return labels;
        } catch (error) {
            console.error('Error analyzing audio:', error);
            return ['20 kHz', '10 kHz', '5 kHz', '0 Hz'];
        }
    };

    const [frequencyLabels, setFrequencyLabels] = useState(['20 kHz', '10 kHz', '5 kHz', '0 Hz']);

    useEffect(() => {
        if (observation.audioUrl) {
            analyzeAudio(observation.audioUrl)
                .then(labels => {
                    setFrequencyLabels(labels);
                })
                .catch(error => {
                    console.error('Error setting frequency labels:', error);
                });
        }
    }, [observation.audioUrl]);

    return (
        <div className={`relative border rounded-lg p-4 ${isSelected ? 'border-blue-500' : 'border-[#444]'} bg-[#1e1e1e] text-[#e0e0e0]`}>
            <div className="absolute top-2 left-2 z-10">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(observation.id)}
                    className="w-5 h-5 bg-[#2c2c2c] border-[#444] text-[#1a73e8]"
                />
            </div>

            <div className="relative">
                {observation.type === 'mixed' ? (
                    <div className="combined-media-container">
                        {observation.audioFiles.length > 0 && (
                            <div className="audio-section mb-4">
                                <h3 className="text-sm font-medium mb-2 text-[#e0e0e0]">Audio Files ({observation.audioFiles.length})</h3>
                                {observation.audioFiles.map((file, index) => (
                                    <div key={index} className="audio-container mb-2 bg-[#2c2c2c] rounded-lg">
                                        <audio
                                            ref={index === 0 ? audioRef : null}
                                            src={URL.createObjectURL(file)}
                                            preload="auto"
                                            onTimeUpdate={handleTimeUpdate}
                                            onLoadedMetadata={handleLoadedMetadata}
                                            className="w-full"
                                            controls
                                        />
                                        {observation.spectrogramUrls[index] && (
                                            <img
                                                src={observation.spectrogramUrls[index]}
                                                alt={`Spectrogram ${index + 1}`}
                                                className="w-full h-24 object-cover mt-2"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {observation.imageFiles.length > 0 && (
                            <div className="image-section">
                                <h3 className="text-sm font-medium mb-2">Images ({observation.imageFiles.length})</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {observation.imageFiles.map((file, index) => (
                                        <img
                                            key={index}
                                            src={URL.createObjectURL(file)}
                                            alt={`Combined image ${index + 1}`}
                                            className="w-full h-40 object-cover rounded-lg"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    observation.type === 'audio' ? (
                        <div className="audio-container">
                            {audioUrl && (
                                <audio
                                    ref={audioRef}
                                    src={audioUrl}
                                    preload="auto"
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                >
                                    Your browser does not support the audio element.
                                </audio>
                            )}

                            <div className="spectrogram-wrapper relative">
                                {observation.spectrogramUrl ? (
                                    <>
                                        <button
                                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                                                      bg-black/50 hover:bg-black/70 text-white rounded-full p-4 z-10
                                                      transition-opacity duration-300 group-hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePlay();
                                            }}
                                        >
                                            <FontAwesomeIcon
                                                icon={isPlaying ? faPause : faPlay}
                                                className="w-6 h-6"
                                            />
                                        </button>

                                        <Swiper
                                            ref={swiperRef}
                                            className="spectrogram-swiper"
                                            modules={[FreeMode]}
                                            freeMode={{
                                                enabled: true,
                                                momentum: true,
                                                momentumRatio: 0.8,
                                                momentumVelocityRatio: 0.6
                                            }}
                                            slidesPerView="auto"
                                            resistance={true}
                                            resistanceRatio={0}
                                            touchRatio={1.5}
                                            speed={300}
                                            cssMode={false}
                                        >
                                            <SwiperSlide>
                                                <div className="spectrogram-container z-2">
                                                    <img
                                                        src={observation.spectrogramUrl}
                                                        alt="Spectrogram"
                                                        className="spectrogram-image cursor-pointer z-2"
                                                        onClick={(e) => {
                                                            handleSpectrogramClick(e);
                                                            handleSpectrogramModalOpen();
                                                        }}
                                                    />
                                                    <div
                                                        ref={progressRef}
                                                        className="progress-overlay"
                                                    />
                                                </div>
                                            </SwiperSlide>
                                        </Swiper>
                                    </>
                                ) : (
                                    <div className="spectrogram-loading bg-[#2c2c2c] text-[#e0e0e0]">
                                        <div className="loading-spinner border-t-[#1a73e8]" />
                                        <span>Generating spectrogram...</span>
                                    </div>
                                )}
                            </div>

                            <div className="audio-controls flex items-center justify-between px-4 py-2 bg-[#2c2c2c] rounded-b-lg">
                                <button
                                    className="play-pause-btn flex items-center space-x-2 text-[#e0e0e0]"
                                    onClick={togglePlay}
                                >
                                    <FontAwesomeIcon
                                        icon={isPlaying ? faPause : faPlay}
                                        className="w-4 h-4"
                                    />
                                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                                </button>

                                <div className="time-info text-sm text-[#e0e0e0]">
                                    <span>{formatTime(audioTime)} / {formatTime(audioDuration)}</span>
                                </div>

                                <span className="format-info text-sm text-[#e0e0e0]">
                                    {observation?.file?.type?.split('/')[1]?.toUpperCase() || 'AUDIO'}
                                </span>
                            </div>

                            {error && <div className="error-message text-red-500 text-sm mt-2">{error}</div>}
                            {isBuffering && (
                                <div className="buffering-message text-gray-300 text-sm mt-2">
                                    <div className="loading-spinner border-t-[#1a73e8]" />
                                    <span>Buffering...</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        observation.isCombined ? (
                            <div className="relative">
                                <div className="aspect-w-16 aspect-h-9">
                                    {observation.files.map((file, index) => (
                                        <img
                                            key={index}
                                            src={URL.createObjectURL(file)}
                                            alt={`Combined image ${index + 1}`}
                                            className={`object-cover w-full h-full rounded-lg ${
                                                index === currentSlide ? 'block' : 'hidden'
                                            }`}
                                        />
                                    ))}
                                </div>

                                {observation.files.length > 1 && (
                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
                                        {observation.files.map((_, index) => (
                                            <button
                                                key={index}
                                                className={`w-2 h-2 rounded-full ${
                                                    index === currentSlide ? 'bg-blue-500' : 'bg-gray-300'
                                                }`}
                                                onClick={() => setCurrentSlide(index)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <img
                                src={URL.createObjectURL(observation.file)}
                                alt="Observation"
                                className="object-cover w-full h-full rounded-lg"
                            />
                        )
                    )
                )}
            </div>

            <div className="form-container mt-4">
                <div className="form-group space-y-4">
                    <div className="relative">
                        <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                            <FontAwesomeIcon icon={faDna} className="text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                name="scientific_name"
                                placeholder="Nama Spesies"
                                className="w-full focus:outline-none text-[#e0e0e0] bg-transparent"
                                value={formData.displayName || formData.scientific_name}
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                            />
                            <span className="text-red-500 text-sm">*</span>
                        </div>

                        {showSuggestions && suggestions.length > 0 && (
                            <div
                                className="absolute z-50 w-full mt-1 bg-[#2c2c2c] border border-[#444] rounded-lg shadow-lg overflow-y-auto"
                                ref={suggestionsRef}
                                onScroll={handleSuggestionsScroll}
                                style={{
                                    maxHeight: '350px',
                                    minHeight: '100px'
                                }}
                            >
                                {renderTaxonSuggestions(suggestions)}
                                
                                {isLoadingMore && (
                                    <div className="p-2 text-center text-gray-400">
                                        <div className="inline-block w-4 h-4 border-2 border-t-[#1a73e8] border-r-[#1a73e8] border-b-[#1a73e8] border-l-transparent rounded-full animate-spin mr-2"></div>
                                        Memuat data...
                                    </div>
                                )}
                                
                                {hasMore && !isLoadingMore && (
                                    <div 
                                        className="p-2 text-center text-[#1a73e8] cursor-pointer hover:bg-[#3c3c3c]"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            loadMoreSuggestions();
                                        }}
                                    >
                                        Lihat lebih banyak
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {formData.kingdom && (
                        <div className="mt-2 text-sm text-gray-300">
                            <div className="grid grid-cols-1 gap-1 border border-[#444] p-3 rounded-lg bg-[#2c2c2c]">
                                <div className="font-medium text-[#e0e0e0] border-b border-[#444] pb-1 mb-1">
                                    <FontAwesomeIcon icon={faInfo} className="w-4 h-4 mr-2" />
                                </div>
                                
                                {formData.kingdom && (
                                    <div className="flex justify-between">
                                        <span>Kingdom:</span> 
                                        <span className="text-[#e0e0e0]">{formData.kingdom}
                                            {formData.cname_kingdom && <span className="text-gray-400"> ({formData.cname_kingdom})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.phylum && (
                                    <div className="flex justify-between">
                                        <span>Phylum:</span> 
                                        <span className="text-[#e0e0e0]">{formData.phylum}
                                            {formData.cname_phylum && <span className="text-gray-400"> ({formData.cname_phylum})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.class && (
                                    <div className="flex justify-between">
                                        <span>Class:</span> 
                                        <span className="text-[#e0e0e0]">{formData.class}
                                            {formData.cname_class && <span className="text-gray-400"> ({formData.cname_class})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.order && (
                                    <div className="flex justify-between">
                                        <span>Order:</span> 
                                        <span className="text-[#e0e0e0]">{formData.order}
                                            {formData.cname_order && <span className="text-gray-400"> ({formData.cname_order})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.family && (
                                    <div className="flex justify-between">
                                        <span>Family:</span> 
                                        <span className="text-[#e0e0e0]">{formData.family}
                                            {formData.cname_family && <span className="text-gray-400"> ({formData.cname_family})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.genus && (
                                    <div className="flex justify-between">
                                        <span>Genus:</span> 
                                        <span className="text-[#e0e0e0] italic">{formData.genus}
                                            {formData.cname_genus && <span className="text-gray-400 not-italic"> ({formData.cname_genus})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.species && (
                                    <div className="flex justify-between">
                                        <span>Species:</span> 
                                        <span className="text-[#e0e0e0] italic">{extractScientificName(formData.species)}
                                            {formData.common_name && <span className="text-gray-400 not-italic"> ({formData.common_name})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.subspecies && (
                                    <div className="flex justify-between">
                                        <span>Subspecies:</span> 
                                        <span className="text-[#e0e0e0] italic">{formData.subspecies}</span>
                                    </div>
                                )}
                                
                                {formData.variety && (
                                    <div className="flex justify-between">
                                        <span>Variety:</span> 
                                        <span className="text-[#e0e0e0] italic">{formData.variety}</span>
                                    </div>
                                )}
                                
                                {formData.form && (
                                    <div className="flex justify-between">
                                        <span>Form:</span> 
                                        <span className="text-[#e0e0e0] italic">{formData.form}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                        <FontAwesomeIcon icon={faCalendar} className="text-gray-400 w-5 h-5" />
                        <input
                            type="date"
                            name="date"
                            className="w-full focus:outline-none text-[#e0e0e0] bg-transparent"
                            value={formData.date}
                            onChange={handleInputChange}
                        />
                        <span className="text-red-500 text-sm">*</span>
                    </div>

                    <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                        <FontAwesomeIcon icon={faLocationDot} className="text-gray-400 w-5 h-5" />
                        <button
                            onClick={handleOpenLocationModal}
                            className="w-full text-left text-[#e0e0e0]"
                        >
                            {formData.locationName || formData.latitude && formData.longitude ? (
                                <div>
                                    <div className="text-[#e0e0e0]">
                                        {formData.locationName || `${formData.latitude}, ${formData.longitude}`}
                                    </div>
                                    {formData.latitude && formData.longitude && (
                                        <div className="text-xs text-gray-400">
                                            {`${formatCoordinate(formData.latitude)}, ${formatCoordinate(formData.longitude)}`}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <span className="text-gray-400">Pilih lokasi</span>
                            )}
                        </button>
                        <span className="text-red-500 text-sm">*</span>
                    </div>

                    <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                        <FontAwesomeIcon icon={faTree} className="text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            name="habitat"
                            placeholder="Habitat"
                            className="w-full focus:outline-none text-[#e0e0e0] bg-transparent"
                            value={formData.habitat}
                            onChange={handleInputChange}
                        />
                        {/* <span className="text-red-500 text-sm">*</span> */}
                    </div>

                    <div className="flex space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                        <FontAwesomeIcon icon={faNoteSticky} className="text-gray-400 w-5 h-5 mt-1" />
                        <textarea
                            name="description"
                            placeholder="Keterangan"
                            rows="3"
                            className="w-full focus:outline-none text-[#e0e0e0] bg-transparent resize-none"
                            value={formData.description}
                            onChange={handleInputChange}
                        />
                    </div>

                    {observation.type === 'audio' && (
                        <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                            <FontAwesomeIcon icon={faMusic} className="text-gray-400 w-5 h-5" />
                            <select
                                name="type_sound"
                                className="w-full focus:outline-none text-[#e0e0e0] bg-transparent"
                                value={formData.type_sound}
                                onChange={handleInputChange}
                            >
                                <option value="" className="bg-[#2c2c2c]">Pilih tipe suara</option>
                                <option value="song" className="bg-[#2c2c2c]">Song</option>
                                <option value="call" className="bg-[#2c2c2c]">Call</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="mt-4 text-xs text-gray-400">
                    <span className="text-red-500">*</span> Wajib diisi
                </div>

                <div className="action-buttons mt-4">
                    <button
                        onClick={onDelete}
                        className="px-4 py-2 bg-[#d13434] text-white rounded hover:bg-[#b02a2a] transition-colors"
                    >
                        Hapus
                    </button>
                </div>
            </div>

            <input
                type="hidden"
                name="upload_session_id"
                value={uploadSessionId}
            />

            <Modal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            >
                <LocationPicker
                    onSave={handleLocationSave}
                    onClose={() => setIsLocationModalOpen(false)}
                    initialPosition={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                    initialLocationName={formData.locationName}
                />
            </Modal>
        </div>
    );
}

const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

MediaCard.propTypes = {
    uploadSessionId: PropTypes.string.isRequired
};

export default MediaCard;
