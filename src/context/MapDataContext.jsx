import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { apiFetch } from '../utils/api';


export const MapDataContext = createContext();

export const MapDataProvider = ({ children }) => {
  const [gridData, setGridData] = useState({
    small: [],
    medium: [],
    large: [],
    extraLarge: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkers = async () => {
      const cachedData = sessionStorage.getItem('gridData');
      if (cachedData) {
        setGridData(JSON.parse(cachedData));
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch('/markers');
        const checklists = response.data;
        const smallGrid = generateGrid(checklists, 0.02);
        const mediumGrid = generateGrid(checklists, 0.05);
        const largeGrid = generateGrid(checklists, 0.2);
        const extraLargeGrid = generateGrid(checklists, 0.5);

        const newGridData = {
          small: smallGrid,
          medium: mediumGrid,
          large: largeGrid,
          extraLarge: extraLargeGrid
        };

        setGridData(newGridData);
        sessionStorage.setItem('gridData', JSON.stringify(newGridData));
      } catch (error) {
        console.error('Error fetching markers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkers();
  }, []);

  const generateGrid = (checklists, gridSize) => {
    const grid = {};
    checklists.forEach(({ latitude, longitude, source, id, created_at }) => {
      const lat = Math.floor(latitude / gridSize) * gridSize;
      const lng = Math.floor(longitude / gridSize) * gridSize;
      const key = `${lat},${lng}`;

      if (!grid[key]) {
        grid[key] = { count: 0, source, data: [] };
      }
      grid[key].count++;
      grid[key].data.push({ id, latitude, longitude, source, created_at });
    });

    return Object.keys(grid).map(key => {
      const [lat, lng] = key.split(',').map(Number);
      return {
        bounds: [
          [lat, lng],
          [lat + gridSize, lng + gridSize]
        ],
        count: grid[key].count,
        source: grid[key].source,
        data: grid[key].data
      };
    });
  };

  return (
    <MapDataContext.Provider value={{ gridData, loading }}>
      {children}
    </MapDataContext.Provider>
  );
};