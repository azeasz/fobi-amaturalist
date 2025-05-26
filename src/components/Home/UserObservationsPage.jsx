import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThLarge, faThList, faSitemap, faMap } from '@fortawesome/free-solid-svg-icons';
import UserGridView from './UserGridView';
import UserListView from './UserListView';
import MapView from './MapView';
import TreeView from './TreeView';
import { apiFetch } from '../../utils/api';

const UserObservationsPage = () => {
  const [view, setView] = useState('grid');
  const [observations, setObservations] = useState([]);

  const fetchUserObservations = async () => {
    try {
      const response = await apiFetch('/user-observations');
      const data = await response.json();
      setObservations(data.data);
    } catch (error) {
      console.error('Error fetching user observations:', error);
    }
  };

  useEffect(() => {
    fetchUserObservations();
  }, []);

  return (
    <div className="container mt-14 overflow-hidden">
      <div className="relative">
        <div className="flex justify-center md:justify-end md:absolute md:right-4 md:top-30 space-x-1 bg-none p-1 cursor-pointer z-500 text-white">
          <button onClick={() => setView('map')} className="p-2 bg-[#679995] hover:bg-gray-300 shadow-inner">
            <FontAwesomeIcon icon={faMap} className="text-shadow-md" />
          </button>
          <button onClick={() => setView('grid')} className="p-2 bg-[#679995] hover:bg-gray-300 shadow-inner">
            <FontAwesomeIcon icon={faThLarge} className="text-shadow-md" />
          </button>
          <button onClick={() => setView('list')} className="p-2 bg-[#679995] hover:bg-gray-300 shadow-inner">
            <FontAwesomeIcon icon={faThList} className="text-shadow-md" />
          </button>
          <button onClick={() => setView('tree')} className="p-2 bg-[#679995] hover:bg-gray-300 shadow-inner">
            <FontAwesomeIcon icon={faSitemap} className="text-shadow-md" />
          </button>
        </div>
      </div>
      <div className="mt-0">
        {view === 'grid' && <UserGridView data={observations} />}
        {view === 'list' && <UserListView data={observations} />}
        {view === 'map' && <MapView mapMarkers={observations} />}
        {view === 'tree' && <TreeView data={observations} />}
      </div>
    </div>
  );
};

export default UserObservationsPage;