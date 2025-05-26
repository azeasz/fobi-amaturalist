import React, { useState } from 'react';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import './KupunesMediaViewer.css';

function KupunesMediaViewer({ checklist }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Mengambil media dari checklist
    const images = checklist?.media?.images || [];

    // Prepare items untuk ImageGallery
    const items = images.map(media => ({
        original: media.url,
        thumbnail: media.url,
        renderItem: () => (
            <div className="image-container">
                <img
                    src={media.url}
                    alt="Observation"
                    className="gallery-image"
                />
                <div className="license-overlay">CC BY-NC</div>
            </div>
        )
    }));

    return (
        <div className="media-viewer-container">
            <ImageGallery
                items={items}
                showPlayButton={false}
                showFullscreenButton={true}
                showNav={items.length > 1}
                showThumbnails={items.length > 1}
                showBullets={items.length > 1}
                additionalClass="custom-image-gallery"
                startIndex={currentIndex}
                onSlide={setCurrentIndex}
            />
        </div>
    );
}

export default KupunesMediaViewer; 