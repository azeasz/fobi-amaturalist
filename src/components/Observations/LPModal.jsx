import React from 'react';

function Modal({ isOpen, onClose, children }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[9999] overflow-y-auto mt-5">
            <div className="bg-[#1e1e1e] p-6 rounded shadow-lg w-11/12 max-w-4xl mx-auto my-10 relative border border-[#444] text-[#e0e0e0]">
                {children}
                <button 
                    onClick={onClose} 
                    className="absolute -top-2 -right-2 bg-[#2c2c2c] text-white rounded-full p-2 shadow-md hover:bg-[#3c3c3c] border border-[#444]"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

export default Modal;