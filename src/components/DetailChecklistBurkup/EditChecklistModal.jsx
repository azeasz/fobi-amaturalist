import React, { useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

const EditChecklistModal = ({ isOpen, onClose, formData, setFormData, handleSubmit, handleFaunaChange, handleDeleteFauna }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#444] text-[#e0e0e0]">
                <h2 className="text-xl font-bold mb-4 text-[#e0e0e0]">Edit Checklist</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[#e0e0e0]">
                                    Tanggal Pengamatan
                                </label>
                                <input
                                    type="date"
                                    value={formData.tgl_pengamatan}
                                    onChange={(e) => setFormData({...formData, tgl_pengamatan: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-[#444] shadow-sm bg-[#2c2c2c] text-[#e0e0e0]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#e0e0e0]">
                                    Waktu Mulai
                                </label>
                                <input
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-[#444] shadow-sm bg-[#2c2c2c] text-[#e0e0e0]"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium text-[#e0e0e0]">Daftar Fauna</h3>
                            {formData.fauna.map((f, index) => (
                                <div key={f.id} className={`p-4 border border-[#444] rounded ${f.isDeleted ? 'bg-[#1a1a1a]' : 'bg-[#2c2c2c]'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-medium text-[#e0e0e0]">{f.nama_lokal}</p>
                                            <p className="text-sm text-[#b0b0b0] italic">{f.nama_ilmiah}</p>
                                            <div className="mt-2 space-y-2">
                                                <input
                                                    type="number"
                                                    value={f.jumlah}
                                                    onChange={(e) => handleFaunaChange(index, 'jumlah', e.target.value)}
                                                    className="block w-full rounded-md border-[#444] shadow-sm bg-[#2c2c2c] text-[#e0e0e0]"
                                                    placeholder="Jumlah"
                                                />
                                                <textarea
                                                    value={f.catatan}
                                                    onChange={(e) => handleFaunaChange(index, 'catatan', e.target.value)}
                                                    className="block w-full rounded-md border-[#444] shadow-sm bg-[#2c2c2c] text-[#e0e0e0]"
                                                    placeholder="Catatan"
                                                    rows="2"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteFauna(index)}
                                            className="p-2 text-red-400 hover:bg-[#2c2c2c] rounded-full"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-[#e0e0e0] hover:bg-[#2c2c2c] rounded-md border border-[#444]"
                                disabled={isSubmitting}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-4 py-2 text-white rounded-md ${
                                    isSubmitting
                                        ? 'bg-[#3c3c3c] text-[#b0b0b0] cursor-not-allowed'
                                        : 'bg-[#1a73e8] hover:bg-[#1565c0]'
                                }`}
                            >
                                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditChecklistModal; 