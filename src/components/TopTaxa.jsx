import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import defaultBirdLogo from '../assets/icon/icon.png';
import defaultButterflyLogo from '../assets/icon/kupnes.png';
import defaultFobiLogo from '../assets/icon/FOBI.png';

function TopTaxa({ observationTaxa, identificationTaxa }) {
    const [showSpectrogram, setShowSpectrogram] = useState({});
    const audioRefs = useRef({});

    const SpectrogramPlayer = ({ audioUrl, spectrogramUrl, taxaId }) => {
        const [isPlaying, setIsPlaying] = useState(false);
        const [progress, setProgress] = useState(0);
        
        const togglePlay = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const audioElement = audioRefs.current[taxaId];
            if (audioElement) {
                if (isPlaying) {
                    audioElement.pause();
                } else {
                    audioElement.play();
                }
                setIsPlaying(!isPlaying);
            }
        };

        // Effect untuk menangani event audio
        useEffect(() => {
            const audioElement = audioRefs.current[taxaId];
            
            if (audioElement) {
                const handleTimeUpdate = () => {
                    const duration = audioElement.duration;
                    const currentTime = audioElement.currentTime;
                    const progress = (currentTime / duration) * 100;
                    setProgress(progress);
                };

                const handleEnded = () => {
                    setIsPlaying(false);
                    setProgress(0);
                };

                audioElement.addEventListener('timeupdate', handleTimeUpdate);
                audioElement.addEventListener('ended', handleEnded);

                return () => {
                    audioElement.removeEventListener('timeupdate', handleTimeUpdate);
                    audioElement.removeEventListener('ended', handleEnded);
                };
            }
        }, [taxaId]);

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
                                onClick={togglePlay}
                                className="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 hover:scale-110 active:scale-95 transition-all duration-200"
                                aria-label={isPlaying ? 'Pause' : 'Play'}
                            >
                                <FontAwesomeIcon
                                    icon={isPlaying ? faPause : faPlay}
                                    className="text-xs"
                                />
                            </button>
                            <audio
                                ref={(el) => { if (el) audioRefs.current[taxaId] = el; }}
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

    // Helper function untuk mendapatkan default image
    const getDefaultImage = (source) => {
        switch(source) {
            case 'burungnesia':
                return defaultBirdLogo;
            case 'kupunesia':
                return defaultButterflyLogo;
            default:
                return defaultFobiLogo;
        }
    };

    const TaxaCard = ({ taxa }) => {
        // Helper function untuk menentukan prefix dan source
        const getObservationLink = (taxa) => {
            if (taxa.type === 'observation' || taxa.type === 'identification') {
                switch (taxa.source) {
                    case 'burungnesia':
                        return `/observations/BN${taxa.checklist_id}?source=burungnesia`;
                    case 'kupunesia':
                        return `/observations/KP${taxa.checklist_id}?source=kupunesia`;
                    default:
                        return `/observations/${taxa.checklist_id}?source=fobi`;
                }
            }
            return `/taxa/${taxa.id}`;
        };

        // Ambil media untuk ditampilkan
        const photoMedia = taxa.media?.find(m => m.type === 'photo');
        const audioMedia = taxa.media?.find(m => m.type === 'audio');
        
        // Hitung jumlah media
        const photoCount = taxa.media?.filter(m => m.type === 'photo').length || 0;
        const hasAudio = !!audioMedia;
        
        // Tentukan apakah perlu menampilkan spectrogram atau foto
        const showSpectrogramView = showSpectrogram[taxa.id] && audioMedia?.spectrogram_url;

        return (
            <div className="card relative flex flex-col h-full bg-[#242424] rounded-lg overflow-hidden">
                <div className="h-48 overflow-hidden bg-gray-900 relative flex-shrink-0">
                    {/* Media Display */}
                    {showSpectrogramView ? (
                        <SpectrogramPlayer
                            spectrogramUrl={audioMedia.spectrogram_url}
                            audioUrl={audioMedia.url}
                            taxaId={taxa.id}
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-100">
                            <img
                                src={photoMedia?.url || getDefaultImage(taxa.source)}
                                alt={taxa.scientific_name}
                                className={`w-full h-full ${
                                    !photoMedia ? 'object-contain p-4' : 'object-cover'
                                } group-hover:scale-105 transition-transform duration-500`}
                                loading="lazy"
                                onError={(e) => {
                                    e.target.src = getDefaultImage(taxa.source);
                                }}
                            />
                        </div>
                    )}

                    {/* Indikator jumlah foto */}
                    {photoCount > 1 && (
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-20">
                            <FontAwesomeIcon icon={faImage} className="text-xs" />
                            <span>{photoCount}</span>
                        </div>
                    )}

                    {/* Toggle Button untuk Spectrogram/Foto */}
                    {audioMedia?.spectrogram_url && photoMedia && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowSpectrogram(prev => ({
                                    ...prev,
                                    [taxa.id]: !prev[taxa.id]
                                }));
                            }}
                            className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full hover:bg-black/70 transition-colors z-10"
                        >
                            {showSpectrogramView ? 'Foto' : 'Audio'}
                        </button>
                    )}
                    
                    {/* Audio indicator jika ada audio */}
                    {hasAudio && !showSpectrogramView && (
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white p-1.5 rounded-full">
                            <FontAwesomeIcon icon={faPlay} className="text-xs" />
                        </div>
                    )}
                </div>

                <Link 
                    to={getObservationLink(taxa)}
                    className="card-body p-4 cursor-pointer hover:bg-[#2c2c2c] flex-grow"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300 truncate max-w-[70%]">
                            {taxa.observer || 'Anonymous'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs text-white ${
                            taxa.source === 'burungnesia' ? 'bg-pink-700/70' :
                            taxa.source === 'kupunesia' ? 'bg-purple-700/70' :
                            'bg-blue-700/70'
                        }`}>
                            {taxa.source === 'burungnesia' ? 'Burungnesia' :
                             taxa.source === 'kupunesia' ? 'Kupunesia' : 'Amaturalist'}
                        </span>
                    </div>
                    <h5 className="font-medium text-lg mb-2 text-white line-clamp-1">
                        {taxa.title || taxa.scientific_name}
                    </h5>
                    <p className="text-sm text-gray-300 whitespace-pre-line line-clamp-2">
                        Family: {taxa.family || '-'}<br/>
                        Genus: {taxa.genus || '-'}<br/>
                        Species: {taxa.species || '-'}
                    </p>
                </Link>

                <div className="card-footer p-4 bg-[#1e1e1e] cursor-pointer hover:bg-[#2c2c2c] flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                            <div className={`flex items-center gap-1 ${
                                taxa.source === 'burungnesia' ? 'text-pink-700' :
                                taxa.source === 'kupunesia' ? 'text-purple-700' :
                                'text-blue-700'
                            } font-medium`}>
                                <span>{taxa.count} {taxa.type === 'observation' ? 'observasi' : 'identifikasi'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Observasi Section */}
            <div className="bg-[#1e1e1e] rounded-lg shadow-sm p-6 py-16 border border-[#444]">
                <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">
                    5 Taksa teratas observasi saya
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {observationTaxa.map((taxa, index) => (
                        <TaxaCard
                            key={`obs-${taxa.id}-${index}`}
                            taxa={{...taxa, type: 'observation'}}
                        />
                    ))}
                    {observationTaxa.length === 0 && (
                        <div className="col-span-full text-center text-[#999] py-4">
                            Belum ada observasi
                        </div>
                    )}
                </div>
            </div>

            {/* Identifikasi Section */}
            <div className="bg-[#1e1e1e] rounded-lg shadow-sm p-6 py-16 border border-[#444]">
                <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">
                    5 Taksa teratas identifikasi saya
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {identificationTaxa.map((taxa, index) => (
                        <TaxaCard
                            key={`id-${taxa.id}-${index}`}
                            taxa={{...taxa, type: 'identification'}}
                        />
                    ))}
                    {identificationTaxa.length === 0 && (
                        <div className="col-span-full text-center text-[#999] py-4">
                            Belum ada identifikasi
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TopTaxa;
