import React, { useState, useRef } from 'react';
import ImageGallery from 'react-image-gallery';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import 'react-image-gallery/styles/css/image-gallery.css';
import './KupunesiaMediaViewer.css';

function KupunesiaMediaViewer({ checklist }) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const galleryRef = useRef(null);

    const allMedia = checklist?.medias || [];

    // Toggle fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            galleryRef.current?.fullScreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const items = allMedia.map(media => ({
        original: media.url,
        thumbnail: media.url,
        thumbnailClass: 'image-thumbnail',
        renderItem: () => (
            <div className="image-container">
                <img
                    src={media.url}
                    alt="Observation"
                    className="gallery-image"
                />
                <div className="license-overlay">CC BY-NC</div>
            </div>
        ),
        renderThumbInner: (item) => (
            <img src={item.thumbnail} alt="Media thumbnail" />
        ),
    }));

    // Jika tidak ada media, tampilkan placeholder
    if (!allMedia || allMedia.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <p className="text-gray-500">Tidak ada media tersedia</p>
            </div>
        );
    }

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
                }}
                renderFullscreenButton={(onClick, isFullscreen) => (
                    <button
                        className="fullscreen-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFullscreen();
                        }}
                    >
                        <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
                    </button>
                )}
            />
        </div>
    );
}

export default KupunesiaMediaViewer;