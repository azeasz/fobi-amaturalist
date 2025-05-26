import React from 'react';
import BaseMediaViewer from './BaseMediaViewer';

function ButterflyMediaViewer({ checklist, onMediaChange }) {
    // Transform media data dari format Kupunesia ke format yang dibutuhkan BaseMediaViewer
    const transformMedia = () => {
        const mediaItems = [];
        
        // Handle images
        if (checklist?.media?.length > 0) {
            mediaItems.push(...checklist.media
                .filter(m => m.type === 'image' || !m.type) // Kupunesia mungkin tidak memiliki type
                .map(image => ({
                    type: 'image',
                    url: image.url || image.file_url,
                    thumbnail_url: image.thumbnail_url || image.url || image.file_url
                }))
            );
        }

        return mediaItems;
    };

    return (
        <BaseMediaViewer 
            media={transformMedia()}
            onMediaChange={onMediaChange}
        />
    );
}

export default ButterflyMediaViewer; 