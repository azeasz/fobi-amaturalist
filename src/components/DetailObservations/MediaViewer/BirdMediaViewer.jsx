import React from 'react';
import BaseMediaViewer from './BaseMediaViewer';

function BirdMediaViewer({ checklist, onMediaChange }) {
    // Transform media data dari format FOBi/Burungnesia ke format yang dibutuhkan BaseMediaViewer
    const transformMedia = () => {
        const mediaItems = [];
        
        // Handle images
        if (checklist?.media?.filter(m => m.type === 'image')?.length > 0) {
            mediaItems.push(...checklist.media
                .filter(m => m.type === 'image')
                .map(image => ({
                    type: 'image',
                    url: image.url || image.file_url,
                    thumbnail_url: image.thumbnail_url || image.url || image.file_url
                }))
            );
        }

        // Handle sounds
        if (checklist?.sounds?.length > 0) {
            mediaItems.push(...checklist.sounds.map(sound => ({
                type: 'audio',
                url: sound.sound_url || sound.url,
                spectrogram_url: sound.spectrogram_url,
                thumbnail_url: sound.spectrogram_url // Gunakan spectrogram sebagai thumbnail
            })));
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

export default BirdMediaViewer; 