import { useState, useCallback, useEffect } from 'react';
import { getVisibleGridType } from '../utils/mapHelpers';

export const useMapZoom = (map) => {
  const [currentZoom, setCurrentZoom] = useState(map?.getZoom() || 5);

  const handleZoom = useCallback(() => {
    if (!map) return;
    
    const zoom = map.getZoom();
    setCurrentZoom(zoom);
    
    // Gunakan getVisibleGridType dari mapHelpers untuk konsistensi
    return getVisibleGridType(zoom);
  }, [map]);

  useEffect(() => {
    if (!map) return;

    map.on('zoom', handleZoom);
    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map, handleZoom]);

  return {
    currentZoom,
    handleZoom
  };
}; 