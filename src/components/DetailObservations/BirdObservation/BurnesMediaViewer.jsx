import React, { useState, useRef, useEffect } from 'react';
import ImageGallery from 'react-image-gallery';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faExpand, faCompress, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'react-image-gallery/styles/css/image-gallery.css';

function BurnesMediaViewer({ checklist }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInteracted, setUserInteracted] = useState(false);

    const audioRef = useRef(null);
    const progressRef = useRef(null);
    const spectrogramRef = useRef(null);
    const swiperRef = useRef(null);
    const galleryRef = useRef(null);

    // Mengambil media dari checklist
    const images = checklist?.media?.images || [];
    const sounds = checklist?.media?.sounds || [];
    const spectrograms = checklist?.media?.spectrograms || [];

    // Menggabungkan semua media
    const allMedia = [
        ...images.map(img => ({
            ...img,
            type: 'image'
        })),
        ...sounds.map((sound, index) => ({
            ...sound,
            type: 'audio',
            spectrogram: spectrograms[index]?.url
        }))
    ];

    // Format waktu untuk audio player (00:00)
    const formatTime = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Fungsi untuk toggle fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            spectrogramRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Event handlers dan effects
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Reset audio state saat component unmount
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

    // Handle audio play/pause
    const handleAudioPlay = (e) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play()
                    .catch(error => {
                        console.error('Error playing audio:', error);
                    });
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Handle audio time update
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

    // Handle spectrogram click untuk mengubah posisi audio
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
                setCurrentTime(newTime);
                
                if (!userInteracted) {
                    const spectrogramWidth = swiper.virtualSize - swiper.size;
                    const newTranslate = -spectrogramWidth * clickPosition;
                    swiper.setTranslate(newTranslate);
                    swiper.updateProgress();
                }
            }
        }
    };

    // Handle audio metadata loaded
    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    // Prepare items untuk ImageGallery
    const items = allMedia.map(media => ({
        original: media.url || media.file_url,
        thumbnail: media.type === 'audio' ? 
            media.spectrogram : 
            media.url,
        thumbnailClass: media.type === 'audio' ? 'audio-thumbnail' : 'image-thumbnail',
        renderThumbInner: (item) => {
            if (media.type === 'audio') {
                return (
                    <div className="audio-thumb-container">
                        <img src={item.thumbnail} alt="Audio spectrogram" />
                        <div className="audio-icon-overlay">
                            <FontAwesomeIcon icon={faVolumeUp} />
                        </div>
                    </div>
                );
            }
            return <img src={item.thumbnail} alt="Media thumbnail" />;
        },
        renderItem: () => {
            if (media.type === 'audio') {
                return (
                    <div className="audio-player-container" onClick={(e) => e.stopPropagation()}>
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
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFullscreen();
                                }} 
                                className="fullscreen-button"
                            >
                                <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
                            </button>
                        </div>

                        <audio
                            ref={audioRef}
                            src={media.url}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={() => {
                                setIsPlaying(false);
                                setUserInteracted(false);
                            }}
                        />

                        <div className="spectrogram-container" ref={spectrogramRef}>
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
                                            src={media.spectrogram}
                                            alt="Audio spectrogram"
                                            className="spectrogram-image cursor-pointer"
                                            onClick={handleSpectrogramClick}
                                        />
                                    </div>
                                </SwiperSlide>
                            </Swiper>
                        </div>
                    </div>
                );
            } else {
                return (
                    <div className="image-container">
                        <img
                            src={media.url}
                            alt="Observation"
                            className="gallery-image"
                        />
                        <div className="license-overlay">CC BY-NC</div>
                    </div>
                );
            }
        }
    }));

    return (
        <div className="media-viewer-container">
            <ImageGallery
                ref={galleryRef}
                items={items}
                showPlayButton={false}
                showFullscreenButton={true}
                showNav={items.length > 1}
                showThumbnails={items.length > 1}
                showBullets={items.length > 1}
                additionalClass="custom-image-gallery"
                startIndex={currentIndex}
                onSlide={(index) => {
                    setCurrentIndex(index);
                    if (isPlaying) {
                        setIsPlaying(false);
                        audioRef.current?.pause();
                        setUserInteracted(false);
                    }
                    const currentMedia = items[index];
                    if (currentMedia && currentMedia.renderItem) {
                        const audioElement = document.querySelector(`audio[src="${currentMedia.original}"]`);
                        if (audioElement) {
                            audioRef.current = audioElement;
                            setDuration(audioElement.duration);
                            setCurrentTime(audioElement.currentTime);
                        }
                    }
                }}
            />
        </div>
    );
}

export default BurnesMediaViewer; 