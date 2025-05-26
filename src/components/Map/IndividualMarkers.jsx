import React from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { formatDate } from '../../utils/dateHelpers';

const IndividualMarkers = React.memo(({ 
  markers, 
  bounds,
  visibleGrid,
  minZoom = 12 // Zoom level minimum untuk menampilkan marker
}) => {
  // Jika bukan grid level terakhir, tidak perlu menampilkan marker
  if (visibleGrid !== 'small') return null;

  // Filter marker yang berada dalam bounds yang terlihat
  const filteredMarkers = markers.filter(marker => {
    const lat = parseFloat(marker.latitude);
    const lng = parseFloat(marker.longitude);
    return (
      lat >= bounds._southWest.lat &&
      lat <= bounds._northEast.lat &&
      lng >= bounds._southWest.lng &&
      lng <= bounds._northEast.lng
    );
  });

  return filteredMarkers.map((marker, index) => {
    // Tentukan warna berdasarkan source
    let color = '#3388ff'; // default blue
    if (marker.source?.includes('burungnesia')) {
      color = '#ff3333'; // red
    } else if (marker.source?.includes('kupunesia')) {
      color = '#33ff33'; // green
    } else if (marker.source?.includes('taxa')) {
      color = '#ffff33'; // yellow
    }

    return (
      <CircleMarker
        key={`marker-${index}`}
        center={[marker.latitude, marker.longitude]}
        radius={6}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: 0.7
        }}
      >
        <Popup>
          <div>
            <p>ID: {marker.id}</p>
            <p>Source: {marker.source}</p>
            <p>Date: {formatDate(marker.created_at)}</p>
          </div>
        </Popup>
      </CircleMarker>
    );
  });
});

IndividualMarkers.displayName = 'IndividualMarkers';
export default IndividualMarkers; 