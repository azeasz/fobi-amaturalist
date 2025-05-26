import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faFeather, faBug, faEye, faUsers } from '@fortawesome/free-solid-svg-icons';

export const StatsBar = ({ stats }) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-[#5f8b8b] text-white p-2 flex justify-center items-center gap-4 z-[1001] text-sm">
      <div className="flex items-center gap-1">
        <span className="font-bold">{stats.observasi || 0}</span>
        <span>OBSERVASI</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-bold">{stats.burungnesia || 0}</span>
        <span>BURUNGNESIA</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-bold">{stats.kupunesia || 0}</span>
        <span>KUPUNESIA</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-bold">{stats.fobi || 0}</span>
        <span>FOBI</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-bold">{stats.spesies || 0}</span>
        <span>SPESIES</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-bold">{stats.kontributor || 0}</span>
        <span>KONTRIBUTOR</span>
      </div>
    </div>
  );
}; 