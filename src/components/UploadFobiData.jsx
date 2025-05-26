import React, { useState, useEffect } from 'react';
import { Inertia } from '@inertiajs/inertia';

const UploadFobiData = () => {
    const [formData, setFormData] = useState({
        user_id: localStorage.getItem('user_id') || '',
        fobi_user_id: localStorage.getItem('user_id') || '',
        burungnesia_user_id: localStorage.getItem('burungnesia_user_id') || '',
        latitude: '',
        longitude: '',
        tujuan_pengamatan: '',
        fauna_id: '',
        count: '',
        notes: '',
        breeding: false,
        observer: '',
        breeding_note: '',
        breeding_type_id: '',
        completed: '',
        start_time: '',
        end_time: '',
        active: '',
        additional_note: '',
        tgl_pengamatan: '',
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Submitting form with data:', formData);

        if (!formData.fobi_user_id || !formData.burungnesia_user_id) {
            alert('User ID atau Burungnesia User ID tidak ditemukan.');
            return;
        }

        Inertia.post(`${import.meta.env.VITE_API_URL}/checklist-fauna`, formData, {
            onSuccess: () => alert('Data berhasil disimpan!'),
            onError: () => alert('Terjadi kesalahan saat menyimpan data.'),
        });
    };

    useEffect(() => {
        const userId = localStorage.getItem('user_id');
        const burungnesiaUserId = localStorage.getItem('burungnesia_user_id');

        if (!userId || !burungnesiaUserId) {
            console.warn('User ID atau Burungnesia User ID tidak ditemukan di localStorage');
        }
    }, []);

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 border rounded-md shadow-md mt-32">
            <input type="hidden" name="user_id" value={formData.user_id} />
            <input type="hidden" name="fobi_user_id" value={formData.fobi_user_id} />
            <input type="text" name="burungnesia_user_id" value={formData.burungnesia_user_id} onChange={handleChange} placeholder="Burungnesia User ID" required />
            <input type="text" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="Latitude" required />
            <input type="text" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="Longitude" required />
            <input type="text" name="tujuan_pengamatan" value={formData.tujuan_pengamatan} onChange={handleChange} placeholder="Tujuan Pengamatan" required />
            <input type="text" name="fauna_id" value={formData.fauna_id} onChange={handleChange} placeholder="Fauna ID" required />
            <input type="text" name="count" value={formData.count} onChange={handleChange} placeholder="Count" required />
            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes"></textarea>
            <input type="checkbox" name="breeding" checked={formData.breeding} onChange={handleChange} /> Breeding
            <input type="text" name="observer" value={formData.observer} onChange={handleChange} placeholder="Observer" />
            <input type="text" name="breeding_note" value={formData.breeding_note} onChange={handleChange} placeholder="Breeding Note" />
            <input type="text" name="breeding_type_id" value={formData.breeding_type_id} onChange={handleChange} placeholder="Breeding Type ID" />
            <input type="text" name="completed" value={formData.completed} onChange={handleChange} placeholder="Completed" />
            <input type="date" name="start_time" value={formData.start_time} onChange={handleChange} placeholder="Start Time" />
            <input type="date" name="end_time" value={formData.end_time} onChange={handleChange} placeholder="End Time" />
            <input type="text" name="active" value={formData.active} onChange={handleChange} placeholder="Active" />
            <textarea name="additional_note" value={formData.additional_note} onChange={handleChange} placeholder="Additional Note"></textarea>
            <input type="date" name="tgl_pengamatan" value={formData.tgl_pengamatan} onChange={handleChange} placeholder="Tanggal Pengamatan" />
            <button type="submit">Submit</button>
        </form>
    );
};

export default UploadFobiData;