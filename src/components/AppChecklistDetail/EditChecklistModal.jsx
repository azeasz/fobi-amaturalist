import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';
import { TrashIcon } from '@heroicons/react/24/outline';

function EditChecklistModal({ checklist, fauna, onClose, onSuccess, source }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        tgl_pengamatan: checklist?.tgl_pengamatan || '',
        start_time: checklist?.start_time || '',
        end_time: checklist?.end_time || '',
        latitude: checklist?.latitude || '',
        longitude: checklist?.longitude || '',
        additional_note: checklist?.additional_note || '',
        fauna: fauna?.map(f => ({
            ...f,
            isDeleted: false,
            jumlah: f.jumlah || f.count || 0,
            catatan: f.catatan || f.notes || ''
        })) || []
    });

    const handleFaunaChange = (index, field, value) => {
        const newFauna = [...formData.fauna];
        newFauna[index][field] = value;
        setFormData({...formData, fauna: newFauna});
    };

    const handleDeleteFauna = (index) => {
        const newFauna = [...formData.fauna];
        newFauna[index].isDeleted = !newFauna[index].isDeleted;
        setFormData({...formData, fauna: newFauna});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const endpoint = source === 'burungnesia'
                ? `/burungnesia/checklists/${checklist.id.substring(2)}`
                : `/kupunesia/checklists/${checklist.id}`;

            const response = await apiFetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tgl_pengamatan: formData.tgl_pengamatan,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    additional_note: formData.additional_note,
                    fauna: formData.fauna.filter(f => !f.isDeleted).map(f => ({
                        id: f.id,
                        [source === 'kupunesia' ? 'count' : 'jumlah']: parseInt(f.jumlah) || 0,
                        [source === 'kupunesia' ? 'notes' : 'catatan']: f.catatan || '',
                        breeding: f.breeding || false,
                        breeding_note: f.breeding_note || '',
                        breeding_type_id: f.breeding_type_id || null
                    }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memperbarui checklist');
            }

            onSuccess();
        } catch (error) {
            console.error('Error updating checklist:', error);
            alert(error.message || 'Gagal memperbarui checklist');
        } finally {
            setIsSubmitting(false);
        }
    };

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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[#e0e0e0]">
                                    Waktu Selesai
                                </label>
                                <input
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-[#444] shadow-sm bg-[#2c2c2c] text-[#e0e0e0]"
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-[#e0e0e0]">
                                    Catatan Tambahan
                                </label>
                                <textarea
                                    value={formData.additional_note}
                                    onChange={(e) => setFormData({...formData, additional_note: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-[#444] shadow-sm bg-[#2c2c2c] text-[#e0e0e0]"
                                    rows="3"
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
                                                    disabled={f.isDeleted}
                                                />
                                                <textarea
                                                    value={f.catatan}
                                                    onChange={(e) => handleFaunaChange(index, 'catatan', e.target.value)}
                                                    className="block w-full rounded-md border-[#444] shadow-sm bg-[#2c2c2c] text-[#e0e0e0]"
                                                    placeholder="Catatan"
                                                    rows="2"
                                                    disabled={f.isDeleted}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteFauna(index)}
                                            className={`p-2 ${f.isDeleted ? 'text-green-400' : 'text-red-400'} hover:bg-[#2c2c2c] rounded-full`}
                                        >
                                            {f.isDeleted ? (
                                                <span>Batalkan</span>
                                            ) : (
                                                <TrashIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                </form>
            </div>
        </div>
    );
}

export default EditChecklistModal;
