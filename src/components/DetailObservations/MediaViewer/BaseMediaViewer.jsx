import React, { useState, useRef, useEffect } from 'react';
import ImageGallery from 'react-image-gallery';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faExpand, faCompress, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'react-image-gallery/styles/css/image-gallery.css';
import './MediaViewer.css';

function BaseMediaViewer({ media, onMediaChange }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const audioRef = useRef(null);
    const progressRef = useRef(null);
    const spectrogramRef = useRef(null);
    const swiperRef = useRef(null);
    const galleryRef = useRef(null);

    // Utility functions
    const formatTime = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            spectrogramRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Event handlers
    const handleAudioPlay = (e) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(error => {
                    console.error('Error playing audio:', error);
                });
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const time = audioRef.current.currentTime;
            const dur = audioRef.current.duration;
            
            if (isNaN(dur)) return;
            
            setCurrentTime(time);
            
            if (progressRef.current) {
                const progress = (time / dur) * 100;
                progressRef.current.style.transform = `scaleX(${progress / 100})`;
            }
        }
    };

    const handleSpectrogramClick = (e) => {
        e.stopPropagation();
        if (audioRef.current && swiperRef.current?.swiper) {
            const swiper = swiperRef.current.swiper;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            const clickPosition = x / width;
            
            const newTime = audioRef.current.duration * clickPosition;
            if (!isNaN(newTime)) {
                audioRef.current.currentTime = newTime;
                setUserInteracted(true);
            }
        }
    };

    // Effects
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, []);

    // Auto-scroll effect untuk spectrogram
    useEffect(() => {
        if (isPlaying && !userInteracted && swiperRef.current?.swiper) {
            const updateSpectrogramScroll = () => {
                const swiper = swiperRef.current.swiper;
                if (!swiper) return;

                const spectrogramWidth = swiper.virtualSize - swiper.size;
                const progress = currentTime / duration;
                const newTranslate = -spectrogramWidth * progress;

                requestAnimationFrame(() => {
                    swiper.setTranslate(newTranslate);
                    swiper.updateProgress();
                });
            };

            const intervalId = setInterval(updateSpectrogramScroll, 50);
            return () => clearInterval(intervalId);
        }
    }, [isPlaying, currentTime, duration, userInteracted]);

    // Render methods
    const renderAudioPlayer = (mediaItem) => {
        return (
            <div className="audio-player-container" onClick={(e) => e.stopPropagation()}>
                {/* Audio controls */}
                <div className="audio-controls">
                    <button onClick={handleAudioPlay} className="play-button">
                        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
                    </button>
                    <div className="audio-progress">
                        <div className="time-display">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                        <div className="progress-bar" onClick={handleSpectrogramClick}>
                            <div className="progress-bar-fill" ref={progressRef} />
                        </div>
                    </div>
                    <button onClick={toggleFullscreen} className="fullscreen-button">
                        <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
                    </button>
                </div>

                {/* Audio element */}
                <audio
                    ref={audioRef}
                    src={mediaItem.url}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={(e) => setDuration(e.target.duration)}
                    onEnded={() => {
                        setIsPlaying(false);
                        setUserInteracted(false);
                    }}
                />

                {/* Spectrogram */}
                {mediaItem.spectrogram_url && (
                    <div className="spectrogram-container" ref={spectrogramRef}>
                        <Swiper
                            ref={swiperRef}
                            className="spectrogram-swiper"
                            modules={[FreeMode]}
                            freeMode={{
                                enabled: true,
                                momentum: true
                            }}
                            slidesPerView="auto"
                            resistance={true}
                            resistanceRatio={0}
                            touchRatio={1.5}
                            onTouchStart={() => setUserInteracted(true)}
                        >
                            <SwiperSlide>
                                <div className="spectrogram-content">
                                    <div className="frequency-labels">
                                        <span>20 kHz</span>
                                        <span>15 kHz</span>
                                        <span>10 kHz</span>
                                        <span>5 kHz</span>
                                        <span>0 kHz</span>
                                    </div>
                                    <img
                                        src={mediaItem.spectrogram_url}
                                        alt="Audio spectrogram"
                                        className="spectrogram-image cursor-pointer"
                                        onClick={handleSpectrogramClick}
                                    />
                                </div>
                            </SwiperSlide>
                        </Swiper>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="media-viewer-container">
            {media && media.length > 0 ? (
                <ImageGallery
                    ref={galleryRef}
                    items={media.map(item => ({
                        original: item.url,
                        thumbnail: item.thumbnail_url || item.url,
                        renderItem: () => 
                            item.type === 'audio' 
                                ? renderAudioPlayer(item)
                                : (
                                    <div className="image-container">
                                        <img
                                            src={item.url}
                                            alt="Observation"
                                            className="gallery-image"
                                        />
                                        <div className="license-overlay">CC BY-NC</div>
                                    </div>
                                )
                    }))}
                    showPlayButton={false}
                    showFullscreenButton={true}
                    showNav={media.length > 1}
                    showThumbnails={media.length > 1}
                    showBullets={media.length > 1}
                    startIndex={currentIndex}
                    onSlide={(index) => {
                        setCurrentIndex(index);
                        if (isPlaying) {
                            setIsPlaying(false);
                            audioRef.current?.pause();
                            setUserInteracted(false);
                        }
                        onMediaChange?.(index);
                    }}
                />
            ) : (
                <div className="no-media">
                    <p>Tidak ada media</p>
                </div>
            )}
        </div>
    );
}

export default BaseMediaViewer; 