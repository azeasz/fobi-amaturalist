import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getVisibleGridType } from '../../utils/mapHelpers';

export const ZoomHandler = ({ 
  gridData, 
  setVisibleGrid, 
  setSelectedGridData, 
  isMobile 
}) => {
  const map = useMap();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let infoControl = null;
    let markerUpdateTimeout = null;

    // Fungsi untuk menangani perubahan level zoom
    const handleZoomLevelChange = () => {
      const zoomLevel = map.getZoom();
      // Gunakan getVisibleGridType dari mapHelpers untuk konsistensi
      setVisibleGrid(getVisibleGridType(zoomLevel));
    };

    // Tambahkan InfoControl untuk kredits
    const InfoControl = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-control-info');
        container.innerHTML = `
          <div class="info-control-container">
            <button class="info-button" title="Map Credits">
              <i class="custom-info-icon">ℹ️</i>
            </button>
            <div class="tooltip-container ${showTooltip ? 'show' : ''}">
              <p><strong>Map Credits:</strong></p>
              <span>© <a href="https://leafletjs.com" target="_blank">Leaflet</a></span>
              <span>© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors</span>
              <span>© <a href="https://carto.com/attributions" target="_blank">CARTO</a></span>
            </div>
          </div>
        `;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        // Tampilkan tooltip saat hover atau klik
        const infoButton = container.querySelector('.info-button');
        const tooltipContainer = container.querySelector('.tooltip-container');
        
        infoButton.addEventListener('mouseenter', () => {
          setShowTooltip(true);
        });

        infoButton.addEventListener('mouseleave', () => {
          // Jika tidak dalam keadaan diklik, sembunyikan tooltip
          if (!tooltipContainer.classList.contains('clicked')) {
            setShowTooltip(false);
          }
        });
        
        infoButton.addEventListener('click', () => {
          const newState = !showTooltip;
          setShowTooltip(newState);
          if (newState) {
            tooltipContainer.classList.add('clicked');
          } else {
            tooltipContainer.classList.remove('clicked');
          }
        });

        // Tutup tooltip jika klik di luar
        document.addEventListener('click', (e) => {
          if (!container.contains(e.target)) {
            setShowTooltip(false);
            tooltipContainer.classList.remove('clicked');
          }
        });

        return container;
      }
    });

    infoControl = new InfoControl();
    map.addControl(infoControl);

    // Event listeners
    map.on('zoomend', handleZoomLevelChange);

    // Selalu aktifkan scroll wheel zoom (tidak perlu control/meta)
    if (!isMobile) {
      map.scrollWheelZoom.enable();
    }

    return () => {
      if (infoControl) {
        map.removeControl(infoControl);
      }
      map.off('zoomend', handleZoomLevelChange);
    };
  }, [map, setVisibleGrid, showTooltip, isMobile]);

  return null;
}; 