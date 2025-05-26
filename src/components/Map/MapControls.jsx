import React from 'react';
import { LayersControl, TileLayer, ScaleControl, useMap } from 'react-leaflet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUndo } from '@fortawesome/free-solid-svg-icons';
import { defaultMapConfig } from '../../utils/mapHelpers';

const ResetControl = ({ onReset }) => {
  const map = useMap();

  const handleReset = () => {
    // Reset map view ke default
    map.setView(
      defaultMapConfig.center,
      defaultMapConfig.zoom,
      { animate: true }
    );
    // Trigger reset callback
    if (onReset) onReset();
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '80px' }}>
      <div className="leaflet-control">
        <button
          onClick={handleReset}
          className="bg-gray-800 p-2 rounded-lg shadow-md hover:bg-gray-700 transition-colors"
          title="Reset peta"
        >
          <FontAwesomeIcon icon={faUndo} className="text-blue-400" />
        </button>
      </div>
    </div>
  );
};

export const MapControls = React.memo(({ onReset }) => {
  return (
    <>
      <LayersControl position="topleft">
        <LayersControl.BaseLayer checked name="Dark Mode">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution=""
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=""
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution=""
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Dark Satellite">
          <TileLayer
            url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}"
            attribution=""
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      <ScaleControl position="bottomright" className="text-white" />
      <ResetControl onReset={onReset} />
    </>
  );
});

MapControls.displayName = 'MapControls'; 