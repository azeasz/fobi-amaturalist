import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

function SpectrogramModal({ isOpen, onClose, spectrogramUrl, progressRef, handleSpectrogramClick, audioDuration }) {
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        if (progressRef.current) {
            const transform = progressRef.current.style.transform;
            const progress = parseFloat(transform.replace('scaleX(', '').replace(')', ''));
            setCurrentTime(progress * audioDuration);
        }
    }, [progressRef.current?.style.transform, audioDuration]);

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="modal-spectrogram-overlay">
            <div className="modal-spectrogram-backdrop" onClick={onClose} />
            <div className="modal-spectrogram-container">
                <button className="modal-close-button" onClick={onClose}>×</button>
                

                <div className="spectrogram-content-wrapper">
                    <img
                        src={spectrogramUrl}
                        alt="Spectrogram Full"
                        className="spectrogram-image-modal"
                        onClick={handleSpectrogramClick}
                    />
                    <div 
                        className="modal-progress-overlay"
                        style={{
                            width: progressRef.current ? 
                                `${parseFloat(progressRef.current.style.transform.replace('scaleX(', '').replace(')', '')) * 100}%` : '0%'
                        }}
                    />
                </div>

                <div className="time-labels-modal">
                    <span>0:00</span>
                    <span>{formatTime(audioDuration)}</span>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default SpectrogramModal;