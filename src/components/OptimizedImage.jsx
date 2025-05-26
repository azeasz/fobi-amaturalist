import { useState, useEffect } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

const OptimizedImage = ({ src, alt, className }) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    setImageSrc(src);
    setError(false);
  }, [src]);

  const handleError = () => {
    setError(true);
    setImageSrc('/assets/default-image.jpg'); // Ganti dengan default image Anda
  };

  return (
    <LazyLoadImage
      src={imageSrc}
      alt={alt}
      effect="blur"
      className={className}
      onError={handleError}
      threshold={100}
    />
  );
};

export default OptimizedImage;
