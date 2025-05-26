import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

export const useMarkerVisibility = (map, markers) => {
  const [visibleMarkers, setVisibleMarkers] = useState([]);
  const [shouldShowMarkers, setShouldShowMarkers] = useState(false);

  useEffect(() => {
    if (!map || !markers) return;

    const updateVisibility = debounce(() => {
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      
      if (zoom >= 12) {
        // Gunakan Spatial Index untuk optimasi pencarian marker
        const visibleBounds = {
          minLat: bounds._southWest.lat,
          maxLat: bounds._northEast.lat,
          minLng: bounds._southWest.lng,
          maxLng: bounds._northEast.lng
        };

        const filtered = markers.filter(marker => {
          const lat = parseFloat(marker.latitude);
          const lng = parseFloat(marker.longitude);
          return (
            lat >= visibleBounds.minLat &&
            lat <= visibleBounds.maxLat &&
            lng >= visibleBounds.minLng &&
            lng <= visibleBounds.maxLng
          );
        });

        setVisibleMarkers(filtered);
        setShouldShowMarkers(true);
      } else {
        setVisibleMarkers([]);
        setShouldShowMarkers(false);
      }
    }, 100);

    map.on('zoomend moveend', updateVisibility);
    updateVisibility();

    return () => {
      map.off('zoomend moveend', updateVisibility);
      updateVisibility.cancel();
    };
  }, [map, markers]);

  return { visibleMarkers, shouldShowMarkers };
}; 