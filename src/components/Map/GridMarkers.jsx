import React, { useMemo } from 'react';
import { Circle, Rectangle, Popup } from 'react-leaflet';
import { getColor } from '../../utils/mapHelpers';
import { formatDate } from '../../utils/dateHelpers';

// Fungsi helper untuk validasi koordinat
const isValidLatLng = (lat, lng) => {
  return typeof lat === 'number' && 
         typeof lng === 'number' && 
         !isNaN(lat) && 
         !isNaN(lng) && 
         lat >= -90 && 
         lat <= 90 && 
         lng >= -180 && 
         lng <= 180;
};

// Komponen untuk marker individual
const SmallGridMarkers = React.memo(({ markers, bounds }) => {
  if (!markers || markers.length === 0 || !bounds) return null;

  const visibleMarkers = useMemo(() => {
    return markers.filter(marker => {
      if (!marker || !marker.latitude || !marker.longitude) return false;
      
      const lat = parseFloat(marker.latitude);
      const lng = parseFloat(marker.longitude);
      
      if (!isValidLatLng(lat, lng)) return false;

      try {
        return bounds.contains([lat, lng]);
      } catch (error) {
        console.error('Invalid coordinates:', { lat, lng });
        return false;
      }
    });
  }, [markers, bounds]);

  return visibleMarkers.map((marker) => {
    const lat = parseFloat(marker.latitude);
    const lng = parseFloat(marker.longitude);

    if (!isValidLatLng(lat, lng)) return null;

    return (
      <Circle
        key={`marker-${marker.source}-${marker.id}`}
        center={[lat, lng]}
        radius={50} // Radius dalam meter
        pathOptions={{
          color: marker.source === 'burungnesia' ? '#1a73e8' : '#2c5ae9',
          fillColor: marker.source === 'burungnesia' ? '#1a73e8' : '#2c5ae9',
          fillOpacity: 0.8,
          weight: 1
        }}
      >
        <Popup>
          <div className="marker-popup">
            <p><strong>ID:</strong> {marker.id}</p>
            <p><strong>Source:</strong> {marker.source}</p>
            {marker.created_at && (
              <p><strong>Date:</strong> {formatDate(marker.created_at)}</p>
            )}
          </div>
        </Popup>
      </Circle>
    );
  }).filter(Boolean);
});

// Komponen untuk grid rectangles dengan optimasi tile-based
const GridRectangles = React.memo(({ grid, onGridClick, bounds, zoomLevel }) => {
  if (!grid || grid.length === 0 || !bounds) return null;

  // Hanya tampilkan grid jika zoom level sesuai
  const shouldShowGrid = zoomLevel < 15; // Sesuaikan dengan kebutuhan

  const visibleGrid = useMemo(() => {
    if (!shouldShowGrid) return [];
    
    return grid.filter(gridItem => {
      if (!gridItem || !gridItem.bounds) return false;
      
      try {
        const [[south, west], [north, east]] = gridItem.bounds;
        
        if (!isValidLatLng(south, west) || !isValidLatLng(north, east)) {
          return false;
        }

        return bounds.intersects([[south, west], [north, east]]);
      } catch (error) {
        console.error('Invalid grid bounds:', gridItem);
        return false;
      }
    });
  }, [grid, bounds, shouldShowGrid]);

  return visibleGrid.map((gridItem, index) => {
    try {
      const [[south, west], [north, east]] = gridItem.bounds;
      
      // Skip invalid bounds
      if (!isValidLatLng(south, west) || !isValidLatLng(north, east)) {
        return null;
      }

      const firstItem = gridItem.data?.[0];
      const date = firstItem?.created_at;
      
      const prefixedId = firstItem ? 
        (firstItem.source === 'burungnesia' ? `brn_${firstItem.id}` :
         firstItem.source === 'kupunesia' ? `kpn_${firstItem.id}` :
         firstItem.id) : null;

      const gridStyleOptions = getColor(gridItem.count, gridItem.source);
      
      return (
        <Rectangle
          key={`grid-${index}-${south}-${west}`}
          bounds={[[south, west], [north, east]]}
          pathOptions={gridStyleOptions}
          eventHandlers={{
            click: () => {
              if (onGridClick && gridItem.data?.length > 0) {
                onGridClick({
                  ...gridItem,
                  id: prefixedId,
                  checklist_id: prefixedId || firstItem.checklist_id,
                  source: firstItem.source || gridItem.source
                });
              }
            }
          }}
        >
          {/* <Popup>
            <div>
              <p><strong>Total:</strong> {gridItem.count}</p>
              <p><strong>Source:</strong> {gridItem.source}</p>
              {date && <p><strong>Latest:</strong> {formatDate(date)}</p>}
            </div>
          </Popup> */}
        </Rectangle>
      );
    } catch (error) {
      console.error('Error rendering grid rectangle:', error);
      return null;
    }
  }).filter(Boolean); // Hapus null values
});

// Update MapView untuk menggunakan kedua komponen
const MapOverlay = React.memo(({ 
  grid, 
  markers, 
  bounds, 
  zoomLevel, 
  onGridClick,
  filterParams,
  searchParams
}) => {
  const showMarkers = zoomLevel >= 15;

  // Filter markers berdasarkan filterParams
  const filteredMarkers = useMemo(() => {
    if (!markers) return [];
    
    return markers.filter(marker => {
      
      // Filter berdasarkan sumber data
      if (filterParams?.data_source?.length > 0) {
        const sourceMatch = filterParams.data_source.some(source => {
          if (source === 'burungnesia') {
            return marker.source === 'burungnesia';
          }
          if (source === 'kupunesia') {
            return marker.source === 'kupunesia';
          }
          if (source === 'fobi') {
            return marker.source === 'fobi';
          }
          return false;
        });
        if (!sourceMatch) return false;
      }

      // Filter berdasarkan lokasi jika ada parameter pencarian
      if (searchParams?.latitude && searchParams?.longitude && filterParams?.radius) {
        const distance = calculateDistance(
          searchParams.latitude,
          searchParams.longitude,
          marker.latitude,
          marker.longitude
        );
        if (distance > filterParams.radius) return false;
      }

      return true;
    });
  }, [markers, filterParams, searchParams]);

  return (
    <>
      <GridRectangles 
        grid={grid} 
        onGridClick={onGridClick}
        bounds={bounds}
        zoomLevel={zoomLevel}
      />
      {showMarkers && (
        <SmallGridMarkers 
          markers={filteredMarkers}
          bounds={bounds}
        />
      )}
    </>
  );
});

// Helper function untuk menghitung jarak
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRad = (value) => {
  return value * Math.PI / 180;
};

// Tambahkan displayNames
SmallGridMarkers.displayName = 'SmallGridMarkers';
GridRectangles.displayName = 'GridRectangles';
MapOverlay.displayName = 'MapOverlay';

// Hanya export MapOverlay
export { MapOverlay }; 