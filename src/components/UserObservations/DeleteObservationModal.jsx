import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons';

const DeleteObservationModal = ({ show, onClose, onConfirm, isDeleting, observation }) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1e1e1e] rounded-lg shadow-lg max-w-md w-full border border-[#444] overflow-hidden">
        <div className="border-b border-[#333] px-6 py-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 text-xl mr-2" />
            <h3 className="text-lg font-semibold text-[#e0e0e0]">Konfirmasi Hapus Observasi</h3>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <p className="text-[#e0e0e0] mb-4">
            Apakah Anda yakin ingin menghapus observasi <span className="italic font-medium">"{observation?.scientific_name}"</span>?
          </p>
          <p className="text-[#aaa] text-sm mb-4">
            Tindakan ini tidak dapat dibatalkan dan semua data terkait observasi ini akan dihapus permanen.
          </p>
        </div>
        
        <div className="bg-[#2c2c2c] px-6 py-3 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-[#323232] text-[#e0e0e0] rounded hover:bg-[#3c3c3c] focus:outline-none disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none disabled:opacity-70 flex items-center"
          >
            {isDeleting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                <span>Menghapus...</span>
              </>
            ) : (
              <span>Hapus</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteObservationModal; 