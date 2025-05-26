import React, { useEffect, useState, useMemo } from 'react';
import { Marker, Popup, Rectangle } from 'react-leaflet';
import { redCircleIcon } from '../utils/mapHelpers';
import { generateGrid, getGridType, GRID_SIZES, isTileInBounds } from '../utils/gridHelpers';
import { Sidebar } from './Map/Sidebar';

const SpeciesMapOverlay = ({ species, bounds, zoomLevel, setStats }) => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarData, setSidebarData] = useState({
    selectedGrid: null,
    species: [],
    currentPage: 1,
    loading: false,
    error: null,
    isOpen: false
  });

  useEffect(() => {
    const fetchMarkers = async () => {
      if (!species?.id) return;
      
      setLoading(true);
      try {
        const [fobiResponse, markersResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/fobi-markers-by-taxa?taxa_id=${species.id}`),
          fetch(`${import.meta.env.VITE_API_URL}/markers-by-taxa?taxa_id=${species.id}`)
        ]);

        const [fobiMarkers, otherMarkers] = await Promise.all([
          fobiResponse.json(),
          markersResponse.json()
        ]);

        setMarkers([...fobiMarkers, ...otherMarkers]);
      } catch (error) {
        console.error('Error fetching species markers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkers();
  }, [species]);

  // Effect untuk update stats ketika grid diklik
  useEffect(() => {
    if (!setStats || !sidebarData.selectedGrid) return;

    const gridData = sidebarData.selectedGrid.data || [];
    const token = localStorage.getItem('jwt_token');
    
    const fetchStats = async () => {
      try {
        // Siapkan data untuk request
        const checklistIds = gridData.map(item => {
          const id = String(item.id || '');
          if (item.source?.includes('burungnesia')) return `brn_${id}`;
          if (item.source?.includes('kupunesia')) return `kpn_${id}`;
          if (item.source?.includes('fobi')) return `fob_${id}`;
          return null;
        }).filter(Boolean);

        // Fetch semua stats secara parallel
        const [
          burungnesiaRes,
          kupunesiaRes,
          fobiRes,
          speciesRes,
          contributorsRes
        ] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/burungnesia-count`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${import.meta.env.VITE_API_URL}/kupunesia-count`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${import.meta.env.VITE_API_URL}/fobi-count`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${import.meta.env.VITE_API_URL}/total-species?species_id=${species.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${import.meta.env.VITE_API_URL}/grid-contributors`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ checklistIds })
          })
        ]);

        const [
          burungnesiaData,
          kupunesiaData,
          fobiData,
          speciesData,
          contributorsData
        ] = await Promise.all([
          burungnesiaRes.json(),
          kupunesiaRes.json(),
          fobiRes.json(),
          speciesRes.json(),
          contributorsRes.json()
        ]);

        // Update stats dengan data yang baru
        setStats({
          burungnesia: burungnesiaData.burungnesiaCount,
          kupunesia: kupunesiaData.kupunesiaCount,
          fobi: fobiData.fobiCount,
          observasi: gridData.length,
          spesies: speciesData.totalSpecies,
          kontributor: contributorsData.status === 'success' ? 
            contributorsData.totalContributors : gridData.length
        });

      } catch (error) {
        console.error('Error fetching grid stats:', error);
        
        // Fallback ke perhitungan manual jika API gagal
        const counts = gridData.reduce((acc, item) => {
          if (item.source?.includes('burungnesia')) acc.burungnesia++;
          if (item.source?.includes('kupunesia')) acc.kupunesia++;
          if (item.source?.includes('fobi')) acc.fobi++;
          return acc;
        }, { burungnesia: 0, kupunesia: 0, fobi: 0 });

        setStats({
          ...counts,
          observasi: gridData.length,
          spesies: 1, // Karena ini species-specific view
          kontributor: gridData.length // Fallback ke jumlah observasi
        });
      }
    };

    fetchStats();
  }, [sidebarData.selectedGrid, species, setStats]);

  const gridType = getGridType(zoomLevel);
  const gridSize = GRID_SIZES[gridType];
  
  const grid = useMemo(() => {
    if (!bounds || !markers.length) return [];
    return generateGrid(markers, gridSize);
  }, [bounds, markers, gridSize]);

  const visibleGrid = useMemo(() => {
    return grid.filter(tile => isTileInBounds(tile.bounds, bounds));
  }, [grid, bounds]);

  const handleGridClick = (tile) => {
    setSidebarData({
      selectedGrid: tile,
      species: [species],
      currentPage: 1,
      loading: false,
      error: null,
      isOpen: true
    });
  };

  const handleLoadMore = () => {
    setSidebarData(prev => ({
      ...prev,
      currentPage: prev.currentPage + 1
    }));
  };

  const handleCloseSidebar = () => {
    setSidebarData(prev => ({
      ...prev,
      selectedGrid: null,
      isOpen: false
    }));
    setStats(null);
  };

  if (loading || !markers.length) return null;

  const getGridStyle = (count) => {
    const baseOpacity = 0.1;
    const opacityIncrement = 0.05;
    const maxOpacity = 0.4;
    
    return {
      color: '#ff0000',
      weight: 1,
      fillColor: '#ff0000',
      fillOpacity: Math.min(baseOpacity + (count * opacityIncrement), maxOpacity)
    };
  };

  return (
    <div className="flex h-full w-full">
      <div className="relative flex-1">
        {zoomLevel < 12 ? (
          // Tampilkan grid
          visibleGrid.map((tile, index) => (
            <Rectangle
              key={`${tile.bounds[0][0]}_${tile.bounds[0][1]}_${index}`}
              bounds={tile.bounds}
              pathOptions={getGridStyle(tile.count)}
              eventHandlers={{
                click: () => handleGridClick(tile)
              }}
            >
              <Popup>
                <div>
                  <p>Jumlah observasi: {tile.count}</p>
                  <p>Klik untuk melihat detail</p>
                </div>
              </Popup>
            </Rectangle>
          ))
        ) : (
          // Tampilkan marker individual
          markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              icon={redCircleIcon}
            >
              <Popup>
                <div>
                  <p>ID: {marker.id}</p>
                  <p>Source: {marker.source}</p>
                  <p>Date: {new Date(marker.created_at).toLocaleDateString()}</p>
                </div>
              </Popup>
            </Marker>
          ))
        )}
      </div>

      {/* Sidebar dengan styling yang konsisten */}
      {sidebarData.isOpen && (
        <div className="w-400 h-full">
          <Sidebar
            data={sidebarData}
            setStats={setStats}
            onClose={handleCloseSidebar}
            onLoadMore={handleLoadMore}
          />
        </div>
      )}
    </div>
  );
};

export default SpeciesMapOverlay;