import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';

const SpectrogramPlayer = ({ spectrogramUrl, audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current.duration);
      });

      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current.currentTime);
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleProgressClick = (e) => {
    if (audioRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full">
      <img
        src={spectrogramUrl}
        alt="Audio Spectrogram"
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center text-white hover:text-gray-200"
          >
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
          </button>
          <button
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center text-white hover:text-gray-200"
          >
            <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} />
          </button>
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-1 bg-gray-400 cursor-pointer"
          >
            <div
              className="h-full bg-white"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <span className="text-white text-xs">
            {formatTime(currentTime)}/{formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SpectrogramPlayer;