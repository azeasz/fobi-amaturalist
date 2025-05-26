import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';

function BurungnesiaMediaViewer({ checklist }) {
    const [thumbsSwiper, setThumbsSwiper] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const medias = checklist?.medias || [];
    const hasAudio = checklist?.audio_url && checklist?.spectrogram_url;

    const handleFullscreen = (index) => {
        setActiveIndex(index);
        setIsFullscreen(true);
    };

    return (
        <div className="relative">
            {/* Main Media Viewer */}
            <Swiper
                spaceBetween={10}
                navigation={true}
                pagination={{ clickable: true }}
                thumbs={{ swiper: thumbsSwiper }}
                modules={[Navigation, Pagination, Thumbs]}
                className="rounded-lg overflow-hidden"
                onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
            >
                {medias?.map((media, index) => (
                    <SwiperSlide key={index}>
                        <div className="relative pt-[75%]">
                            <img
                                src={media.url}
                                alt={`Media ${index + 1}`}
                                className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                                onClick={() => handleFullscreen(index)}
                            />
                        </div>
                    </SwiperSlide>
                ))}
                {checklist?.audio_url && (
                    <SwiperSlide>
                        <div className="space-y-4 p-4">
                            <audio
                                controls
                                className="w-full"
                                src={checklist.audio_url}
                            />
                            {checklist.spectrogram_url && (
                                <img
                                    src={checklist.spectrogram_url}
                                    alt="Spectrogram"
                                    className="w-full h-32 object-cover"
                                />
                            )}
                        </div>
                    </SwiperSlide>
                )}
            </Swiper>

            {/* Thumbnails */}
            {medias.length > 1 && (
                <Swiper
                    onSwiper={setThumbsSwiper}
                    spaceBetween={10}
                    slidesPerView={4}
                    freeMode={true}
                    watchSlidesProgress={true}
                    modules={[Navigation, Thumbs]}
                    className="mt-4"
                >
                    {medias.map((media, index) => (
                        <SwiperSlide key={index}>
                            <div className="relative pt-[75%]">
                                <img
                                    src={media.url}
                                    alt={`Thumbnail ${index + 1}`}
                                    className="absolute inset-0 w-full h-full object-cover cursor-pointer rounded"
                                />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            )}

            {/* Fullscreen Modal */}
            {isFullscreen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
                    <button
                        className="absolute top-4 right-4 text-white text-2xl"
                        onClick={() => setIsFullscreen(false)}
                    >
                        ×
                    </button>
                    <Swiper
                        initialSlide={activeIndex}
                        spaceBetween={10}
                        navigation={true}
                        modules={[Navigation]}
                        className="w-full h-full"
                    >
                        {medias.map((media, index) => (
                            <SwiperSlide key={index}>
                                <div className="flex items-center justify-center h-full">
                                    <img
                                        src={media.url}
                                        alt={`Media ${index + 1}`}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            )}
        </div>
    );
}

export default BurungnesiaMediaViewer;