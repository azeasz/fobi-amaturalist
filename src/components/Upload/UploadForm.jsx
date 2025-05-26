import React, { useState } from 'react';
import axios from 'axios';
import FaunaList from './FaunaList';
import Modal from './Modal';

function UploadForm() {
    const [faunas, setFaunas] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newFauna, setNewFauna] = useState({
        name: '',
        id: null,
        count: 0,
        notes: '',
        breeding: false
    });

    const showModal = () => setModalVisible(true);
    const closeModal = () => setModalVisible(false);

    const addFauna = () => {
        setFaunas([...faunas, { ...newFauna }]);
        setNewFauna({ name: '', id: null, count: 0, notes: '', breeding: false });
        closeModal();
    };

    const fetchFaunaId = () => {
        if (newFauna.name.length > 2) {
            axios.get(`${import.meta.env.VITE_API_URL}/faunas`, {
                params: { name: newFauna.name }
            })
            .then(response => {
                setNewFauna(prevState => ({ ...prevState, id: response.data.fauna_id }));
            })
            .catch(error => {
                console.error(error);
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Inisialisasi FormData
        const formData = new FormData();

        // Menambahkan data ke FormData
        formData.append('name', newFauna.name);
        formData.append('id', newFauna.id);
        formData.append('count', newFauna.count);
        formData.append('notes', newFauna.notes);
        formData.append('breeding', newFauna.breeding);
        formData.append('faunas', JSON.stringify(faunas));

        // Mengirim data dengan API
        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/checklist-fauna`, formData);
            console.log('Data berhasil diupload:', response.data);
        } catch (error) {
            console.error('Error mengupload data:', error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Upload Fobi Data</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-xl font-semibold">Checklist</h2>
                <input type="text" name="latitude" placeholder="Latitude" required className="w-full p-2 border border-gray-300 rounded" />
                <input type="text" name="longitude" placeholder="Longitude" required className="w-full p-2 border border-gray-300 rounded" />
                <input type="number" name="tujuan_pengamatan" placeholder="Tujuan Pengamatan" required className="w-full p-2 border border-gray-300 rounded" />
                <input type="text" name="observer" placeholder="Observer" required className="w-full p-2 border border-gray-300 rounded" />
                <input type="text" name="additional_note" placeholder="Additional Note" className="w-full p-2 border border-gray-300 rounded" />
                <input type="number" name="active" placeholder="Active" className="w-full p-2 border border-gray-300 rounded" />
                <input type="date" name="tgl_pengamatan" placeholder="Tanggal Pengamatan" className="w-full p-2 border border-gray-300 rounded" />
                <input type="time" name="start_time" placeholder="Start Time" className="w-full p-2 border border-gray-300 rounded" />
                <input type="time" name="end_time" placeholder="End Time" className="w-full p-2 border border-gray-300 rounded" />
                <input type="number" name="completed" placeholder="Completed" className="w-full p-2 border border-gray-300 rounded" />
                <FaunaList faunas={faunas} />
                <button type="button" onClick={showModal} className="bg-blue-500 text-white px-4 py-2 rounded">Tambah Jenis</button>
                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Upload Data</button>
            </form>

            {modalVisible && (
                <Modal
                    newFauna={newFauna}
                    setNewFauna={setNewFauna}
                    addFauna={addFauna}
                    fetchFaunaId={fetchFaunaId}
                    closeModal={closeModal}
                />
            )}
        </div>
    );
}

export default UploadForm;