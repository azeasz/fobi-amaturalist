import React, { useState, useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faExpand, faCompress, faVolumeUp, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import 'swiper/css';
import 'swiper/css/free-mode';
import './MediaViewer.css';

function MediaViewer({ checklist }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);
    const [spectrogramWidth, setSpectrogramWidth] = useState(0);
    
    const audioRef = useRef(null);
    const progressRef = useRef(null);
    const swiperRef = useRef(null);
    const containerRef = useRef(null);
    const spectrogramContainerRef = useRef(null);

    // Persiapkan array media
    const allMedia = [];
    
    if (checklist?.media?.images?.length > 0) {
        allMedia.push(...checklist.media.images.map(img => ({
            type: 'image',
            url: img.images || img.url || img.file_path,
            thumbnail_url: img.thumbnail_url || img.images || img.url || img.file_path
        })));
    }
    
    if (checklist?.media?.sounds?.length > 0) {
        allMedia.push(...checklist.media.sounds.map(sound => ({
            type: 'audio',
            url: sound.url || sound.file_path,
            spectrogram_url: sound.spectrogram_url || sound.spectrogram
        })));
    }

    const formatTime = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAudioPlay = (e) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play()
                    .catch(error => console.error('Error playing audio:', error));
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current && swiperRef.current?.swiper) {
            const currentTime = audioRef.current.currentTime;
            const duration = audioRef.current.duration;

            if (isNaN(duration)) return;

            setCurrentTime(currentTime);

            if (progressRef.current) {
                const progress = (currentTime / duration) * 100;
                progressRef.current.style.transform = `scaleX(${progress / 100})`;
            }

            // Auto swipe spectrogram
            const swiper = swiperRef.current.swiper;
            const slideSize = swiper.size;
            const totalWidth = swiper.virtualSize - slideSize;
            const progress = currentTime / duration;

            requestAnimationFrame(() => {
                swiper.translateTo(-totalWidth * progress, 300, true);
            });
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

    const handleNext = () => {
        if (currentIndex < allMedia.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const currentMedia = allMedia[currentIndex];

    // Effect untuk mengatur auto-scroll spectrogram
    useEffect(() => {
        if (isPlaying && currentMedia?.type === 'audio' && !userInteracted) {
            const container = spectrogramContainerRef.current;
            if (!container) return;

            const scrollWidth = container.scrollWidth - container.clientWidth;
            const duration = audioRef.current?.duration || 0;
            
            if (duration <= 0) return;

            const scrollPosition = (currentTime / duration) * scrollWidth;
            
            container.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });
        }
    }, [isPlaying, currentTime, currentMedia, userInteracted]);

    // Reset scroll position when changing media
    useEffect(() => {
        if (spectrogramContainerRef.current) {
            spectrogramContainerRef.current.scrollLeft = 0;
        }
        setUserInteracted(false);
    }, [currentIndex]);

    // Tambahkan handler untuk scroll manual
    const handleSpectrogramScroll = () => {
        if (!userInteracted) {
            setUserInteracted(true);
        }
    };

    return (
        <div className="relative h-[500px] md:h-[400px] bg-[#121212] rounded-xl overflow-hidden">
            {/* Container utama dengan flexbox yang responsif */}
            <div className="h-full flex flex-col md:flex-row">
                {/* Main Media Display */}
                <div className="relative h-[300px] md:h-full flex-1">
                    {currentMedia?.type === 'image' ? (
                        // Image View
                        <div 
                            className="relative h-full flex items-center justify-center cursor-pointer group bg-[#1e1e1e]"
                            onClick={() => setLightboxOpen(true)}
                        >
                            <img
                                src={currentMedia.url}
                                alt="Observation"
                                className="max-h-full w-auto object-contain"
                            />
                            
                            {/* Navigation Buttons - selalu tampil di mobile */}
                            {allMedia.length > 1 && (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#333]/80 
                                            hover:bg-[#444] transition-colors md:opacity-0 md:group-hover:opacity-100"
                                        disabled={currentIndex === 0}
                                    >
                                        <FontAwesomeIcon icon={faChevronLeft} className="text-gray-200" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#333]/80 
                                            hover:bg-[#444] transition-colors md:opacity-0 md:group-hover:opacity-100"
                                        disabled={currentIndex === allMedia.length - 1}
                                    >
                                        <FontAwesomeIcon icon={faChevronRight} className="text-gray-200" />
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        // Audio View with Spectrogram
                        <div className="h-full flex flex-col p-4 md:p-6 bg-[#1e1e1e]">
                            {/* Audio Controls */}
                            <div className="flex items-center space-x-4 bg-[#2c2c2c] p-3 md:p-4 rounded-lg border border-[#444]">
                                <button 
                                    onClick={handleAudioPlay}
                                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-[#1a73e8] 
                                        hover:bg-[#0d47a1] transition-colors"
                                >
                                    <FontAwesomeIcon 
                                        icon={isPlaying ? faPause : faPlay} 
                                        className="text-white text-base md:text-lg" 
                                    />
                                </button>

                                <div className="flex-1">
                                    <div className="flex justify-between text-xs md:text-sm text-gray-300 mb-2">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                    
                                    <div 
                                        className="h-1.5 md:h-2 bg-[#444] rounded-full cursor-pointer"
                                        onClick={handleSpectrogramClick}
                                    >
                                        <div 
                                            className="h-full bg-[#1a73e8] rounded-full"
                                            style={{ width: `${(currentTime / duration) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Hidden Audio Element */}
                            <audio
                                ref={audioRef}
                                src={currentMedia?.url}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                                onEnded={() => {
                                    setIsPlaying(false);
                                    setUserInteracted(false);
                                }}
                                className="hidden"
                            />

                            {/* Spectrogram */}
                            <div className="spectrogram-wrapper relative mt-4 md:mt-6 flex-1">
                                <button
                                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                                        bg-black/50 hover:bg-black/70 text-white rounded-full p-3 md:p-4 z-10
                                        transition-opacity duration-300 group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAudioPlay(e);
                                    }}
                                >
                                    <FontAwesomeIcon
                                        icon={isPlaying ? faPause : faPlay}
                                        className="w-5 h-5 md:w-6 md:h-6"
                                    />
                                </button>

                                <Swiper
                                    ref={swiperRef}
                                    className="spectrogram-swiper h-full"
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
                                    <SwiperSlide className="h-full">
                                        <div className="spectrogram-container h-full">
                                            <img
                                                src={currentMedia?.spectrogram_url}
                                                alt="Spectrogram"
                                                className="h-full w-auto object-cover cursor-pointer"
                                                onClick={handleSpectrogramClick}
                                            />
                                            <div
                                                ref={progressRef}
                                                className="progress-overlay"
                                            />
                                        </div>
                                    </SwiperSlide>
                                </Swiper>
                            </div>
                        </div>
                    )}
                </div>

                {/* Thumbnails - horizontal scroll di mobile, vertikal di desktop */}
                {allMedia.length > 1 && (
                    <div className="h-[120px] md:h-full md:w-[200px] bg-[#2c2c2c] border-t md:border-t-0 md:border-l border-[#444] overflow-x-auto md:overflow-x-hidden md:overflow-y-auto">
                        <div className="flex flex-row md:flex-col gap-2 p-2 min-w-max md:min-w-0">
                            {allMedia.map((media, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`relative group ${idx === currentIndex ? 'ring-2 ring-[#1a73e8]' : 'hover:ring-2 hover:ring-[#4285f4]/70'}`}
                                >
                                    <div className="relative w-[140px] md:w-full">
                                        <div className="relative pt-[75%]">
                                            <img
                                                src={media.type === 'audio' ? media.spectrogram_url : media.thumbnail_url}
                                                alt={media.type === 'audio' ? 'Audio thumbnail' : 'Image thumbnail'}
                                                className={`absolute inset-0 w-full h-full object-cover bg-[#333]
                                                    ${idx === currentIndex ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                                            />
                                        </div>
                                    </div>
                                    {media.type === 'audio' && (
                                        <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-black/50 
                                            flex items-center justify-center">
                                            <FontAwesomeIcon icon={faPlay} className="text-white text-xs" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Lightbox for fullscreen images */}
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={allMedia.filter(m => m.type === 'image').map(img => ({ src: img.url }))}
                index={currentIndex}
                styles={{
                    container: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
                    captionContainer: { backgroundColor: "#1e1e1e" },
                    button: { color: "#fff" },
                }}
            />
        </div>
    );
}

// Update styles
const styles = `
.spectrogram-wrapper {
    width: 100%;
    position: relative;
    background: #1e1e1e;
    border-radius: 0.75rem;
    overflow: hidden;
    z-index: 1;
    display: flex;
    flex-direction: column;
}

.spectrogram-container {
    position: relative;
    width: 100%;
    z-index: 2;
    display: flex;
    align-items: center;
    background: #1e1e1e;
}

.spectrogram-image {
    width: auto;
    height: 100%;
    object-fit: contain;
    z-index: 1;
}

.progress-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(26, 115, 232, 0.2);
    transform-origin: left;
    transform: scaleX(0);
    transition: transform 0.1s linear;
    pointer-events: none;
    z-index: 3;
}

.swiper-slide {
    width: auto !important;
    height: 100%;
    display: flex;
    align-items: center;
}

.spectrogram-swiper {
    width: 100%;
    height: 100%;
    z-index: 2;
}

.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
    display: none;
}
`;

// Inject CSS
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default MediaViewer;