import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationPicker from './Observations/LocationPicker';
import Modal from './Observations/LPModal';
import LocationInput from './Observations/LocationInput';
import { useUser } from '../context/UserContext';
import Header from './Header';
import { apiFetch } from '../utils/api';
import { toast, ToastContainer } from 'react-toastify';

function KupunesiaUpload() {
    const [faunaName, setFaunaName] = useState('');
    const [faunaId, setFaunaId] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [formData, setFormData] = useState({
        latitude: '',
        longitude: '',
        tujuan_pengamatan: 0,
        observer: '',
        additional_note: '',
        active: 0,
        tgl_pengamatan: '',
        start_time: '',
        end_time: '',
        completed: 0,
        count: '',
        notes: '',
        breeding: 0,
        breeding_type_id: null,
        breeding_note: '',
        images: []
    });

    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [locationName, setLocationName] = useState('');
    const [butterflyList, setButterflyList] = useState([]);
    const [editIndex, setEditIndex] = useState(null);
    const [selectedButterflyIndex, setSelectedButterflyIndex] = useState(null);
    const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);

    const { user, setUser, updateTotalObservations } = useUser(); // Tambahkan ini di bagian atas file
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        const storedUser = {
            id: localStorage.getItem('user_id'),
            uname: localStorage.getItem('username'),
            totalObservations: localStorage.getItem('totalObservations'),
        };

        if (!token || !storedUser.id) {
            navigate('/login', { replace: true });
            return;
        }

        if (!user) {
            setUser(storedUser);
        }
    }, []);

    useEffect(() => {
        const fullname = localStorage.getItem('fullname');
        if (fullname) {
            setFormData(prev => ({
                ...prev,
                observer: fullname
            }));
        }
    }, []);

    useEffect(() => {
        // Handler untuk menangkap ketika tombol back browser ditekan
        const handleBeforeUnload = (e) => {
            // Jika ada data yang belum disimpan, tampilkan konfirmasi
            if (formData.tgl_pengamatan || locationName || butterflyList.length > 0) {
                e.preventDefault();
                e.returnValue = '';
                // Untuk browser modern, returnValue sudah cukup
                return '';
            }
        };

        // Handler untuk menangkap event popstate (back/forward browser)
        const handlePopState = (e) => {
            // Jika ada data yang belum disimpan, tampilkan konfirmasi
            if (formData.tgl_pengamatan || locationName || butterflyList.length > 0) {
                // Mencegah browser kembali
                e.preventDefault();
                // Tampilkan modal konfirmasi
                setShowBackConfirmModal(true);
                // Pushing new state untuk memastikan user tetap di halaman ini
                window.history.pushState(null, '', window.location.pathname);
            }
        };

        // Tambahkan event listener untuk beforeunload
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Tambahkan dummy history state terlebih dahulu
        window.history.pushState(null, '', window.location.pathname);
        
        // Tambahkan event listener untuk popstate
        window.addEventListener('popstate', handlePopState);

        // Cleanup function
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [formData, locationName, butterflyList]);

    const simulateProgress = (duration = 1000, message = 'Memproses...') => {
        setLoading(true);
        setLoadingMessage(message);
        setProgress(0);
        
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 10;
            });
        }, duration / 10);

        return () => clearInterval(interval);
    };

    const handleFaunaNameChange = async (name) => {
        setFaunaName(name);
        setFaunaId('');
        
        if (name.length > 2) {
            setIsSearching(true);
            try {
                const token = localStorage.getItem('jwt_token');
                if (!token || !user) {
                    throw new Error('Silakan login terlebih dahulu');
                }

                    const response = await fetch(`${import.meta.env.VITE_API_URL}/kupunesia/faunas?name=${encodeURIComponent(name)}`, {
                        headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.status === 401) {
                    navigate('/login', { replace: true });
                    return;
                }
                
                if (!response.ok) throw new Error('Gagal mengambil data kupu-kupu');
                
                const data = await response.json();
                if (data.success) {
                    setSuggestions(data.data);
                    setShowSuggestions(true);
                }
            } catch (error) {
                console.error('Error:', error);
                setError(error.message);
                if (error.response?.status === 401) {
                    navigate('/login', { replace: true });
                }
            } finally {
                setIsSearching(false);
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectFauna = (fauna) => {
        setFaunaName(`${fauna.nameId} (${fauna.nameLat})`);
        setFaunaId(parseInt(fauna.id));
        setShowSuggestions(false);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData(prevData => ({
            ...prevData,
            images: [...prevData.images, ...files]
        }));
    };

    const handleRemoveMedia = (type, imgIndex, butterflyIndex) => {
        if (!butterflyList[butterflyIndex] || !butterflyList[butterflyIndex].images) {
            return; // Guard clause untuk mencegah error jika data tidak valid
        }

        setButterflyList(prevList => {
            const newList = [...prevList];
            if (newList[butterflyIndex] && Array.isArray(newList[butterflyIndex].images)) {
                const butterfly = {...newList[butterflyIndex]};
                butterfly.images = butterfly.images.filter((_, i) => i !== imgIndex);
                newList[butterflyIndex] = butterfly;
            }
            return newList;
        });
    };

    const handleLocationSave = (lat, lng, name) => {
        setFormData(prevFormData => ({
            ...prevFormData,
            latitude: lat,
            longitude: lng
        }));
        setLocationName(name);
        setIsLocationModalOpen(false);
    };
    const handleAddButterfly = () => {
        if (!faunaId || !formData.count) {
            setError('Silakan lengkapi data kupu-kupu');
            return;
        }

        const newButterfly = {
            faunaId: parseInt(faunaId),
            faunaName,
            count: formData.count,
            notes: formData.notes,
            breeding: formData.breeding,
            breeding_type_id: formData.breeding_type_id,
            breeding_note: formData.breeding_note,
            images: formData.images || [] // Pastikan images selalu array
        };

        if (editIndex !== null) {
            setButterflyList(prevList => {
                const newList = [...prevList];
                newList[editIndex] = newButterfly;
                return newList;
            });
            setEditIndex(null);
        } else {
            setButterflyList(prevList => [...prevList, newButterfly]);
        }

        // Reset form
        setFaunaName('');
        setFaunaId('');
        setFormData(prevData => ({
            ...prevData,
            count: '',
            notes: '',
            breeding: 0,
            breeding_type_id: null,
            breeding_note: '',
            images: []
        }));
        setIsModalOpen(false);
    };

    const handleEditButterfly = (index) => {
        const butterfly = butterflyList[index];
        setFaunaName(butterfly.faunaName);
        setFaunaId(butterfly.faunaId);
        setFormData(prevData => ({
            ...prevData,
            count: butterfly.count,
            notes: butterfly.notes,
            breeding: butterfly.breeding || 0,
            breeding_type_id: butterfly.breeding_type_id || null,
            breeding_note: butterfly.breeding_note || '',
            images: butterfly.images
        }));
        setEditIndex(index);
        setIsModalOpen(true);
    };

    const handleDeleteButterfly = (index) => {
        setButterflyList(prevList => prevList.filter((_, i) => i !== index));
    };

    const handleFileModalOpen = (index) => {
        setSelectedButterflyIndex(index);
        setIsFileModalOpen(true);
    };
    
    const handleFileModalClose = () => {
        setIsFileModalOpen(false);
        setSelectedButterflyIndex(null);
        setFormData(prev => ({
            ...prev,
            images: []
        }));
    };
    
    const handleFileSave = () => {
        if (selectedButterflyIndex !== null) {
            setButterflyList(prevList => {
                const newList = [...prevList];
                newList[selectedButterflyIndex] = {
                    ...newList[selectedButterflyIndex],
                    images: [
                        ...newList[selectedButterflyIndex].images,
                        ...formData.images
                    ]
                };
                return newList;
            });
        }
        handleFileModalClose();
    };

    const handleSubmit = async () => {
        if (!formData.latitude || !formData.longitude) {
            setError('Silakan pilih lokasi pengamatan');
            return;
        }

        if (butterflyList.length === 0) {
            setError('Silakan tambahkan minimal satu kupu-kupu');
            return;
        }
        
        // Validasi tanggal pengamatan wajib diisi
        if (!formData.tgl_pengamatan) {
            setError('Silakan isi tanggal pengamatan terlebih dahulu');
            return;
        }

        setError('');
        setIsConfirmModalOpen(false);
        setLoading(true);
        setProgress(0);

        try {
            const progressInterval = setInterval(() => {
                setProgress(prev => prev >= 90 ? 90 : prev + 10);
            }, 500);

            const formDataToSend = new FormData();
            Object.keys(formData).forEach(key => {
                if (key !== 'images') {
                    formDataToSend.append(key, formData[key]);
                }
            });

            butterflyList.forEach((butterfly, index) => {
                formDataToSend.append(`fauna_id[${index}]`, butterfly.faunaId);
                formDataToSend.append(`count[${index}]`, butterfly.count);
                formDataToSend.append(`notes[${index}]`, butterfly.notes);
                
                butterfly.images.forEach((image) => {
                    formDataToSend.append(`images[${index}][]`, image);
                });
            });

            const response = await apiFetch('/kupunesia/checklist-fauna', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: formDataToSend
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gagal mengunggah data');
            }

            const data = await response.json();
            setProgress(100);
            clearInterval(progressInterval);

            if (data.success) {
                // Update total observasi
                await updateTotalObservations();
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                toast.success('Data berhasil diunggah!');
                
                // Reset form
                setFormData({
                    latitude: '',
                    longitude: '',
                    tujuan_pengamatan: 0,
                    observer: '',
                    additional_note: '',
                    active: 0,
                    tgl_pengamatan: '',
                    start_time: '',
                    end_time: '',
                    completed: 0,
                    count: '',
                    notes: '',
                    breeding: 0,
                    breeding_type_id: null,
                    breeding_note: '',
                    images: []
                });
                setButterflyList([]);
                setLocationName('');

                // Redirect ke halaman profil setelah berhasil
                navigate(`/profile/${user.id}/observasi`);
            }
        } catch (error) {
            console.error('Error:', error);
            setError(error.message);
            toast.error(error.message);
        } finally {
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
            }, 500);
        }
    };

    const handleRemoveFormImage = (imgIndex) => {
        setFormData(prevData => ({
            ...prevData,
            images: prevData.images.filter((_, i) => i !== imgIndex)
        }));
    };

    // Fungsi untuk kembali secara aman
    const handleSafeGoBack = () => {
        // Hapus event listener sebelum navigasi
        window.removeEventListener('popstate', () => {});
        window.removeEventListener('beforeunload', () => {});
        // Tutup modal
        setShowBackConfirmModal(false);
        // Navigasi ke halaman PilihObservasi
        navigate('/pilih-observasi');
    };

    return (
        <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
            <Header userData={{
                uname: localStorage.getItem('username'),
                totalObservations: localStorage.getItem('totalObservations')
            }} />
            
            <div className="container mx-auto px-4 py-8 mt-10">
                <h2 className="text-xl font-bold mb-6 text-white">Cheklist Kupunesia</h2>

                
                {error && (
                    <div className="bg-[#3a0f0f] border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-[#1e1e1e] p-4 rounded-lg text-center border border-[#444]">
                            <div className="mb-2 text-white">Mengunggah data... {progress}%</div>
                            <div className="w-64 h-2 bg-[#2c2c2c] rounded">
                                <div 
                                    className="h-full bg-[#1a73e8] rounded" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Form Lokasi */}
        {/* Lokasi */}
        <div className="bg-[#1e1e1e] p-4 rounded-lg border border-[#444]">
            <h3 className="text-lg font-medium mb-3 text-white">Lokasi Pengamatan</h3>
            <LocationInput
                locationName={locationName}
                latitude={formData.latitude}
                longitude={formData.longitude}
                onTrigger={(currentLocation) => {
                    setIsLocationModalOpen(true);
                }}
            />
        </div>

                <Modal 
                    isOpen={isLocationModalOpen} 
                    onClose={() => setIsLocationModalOpen(false)}
                    className="bg-[#1e1e1e] text-white border border-[#444] shadow-xl"
                >
                    <LocationPicker 
                        onSave={handleLocationSave} 
                        onClose={() => setIsLocationModalOpen(false)}
                        initialPosition={formData.latitude && formData.longitude ? [parseFloat(formData.latitude), parseFloat(formData.longitude)] : null}
                        initialLocationName={locationName}
                    />
                </Modal>
                

    {/* Form Pengamatan */}
    <div className="space-y-6 mt-6">
        {/* Data Waktu Pengamatan */}
        <div className="bg-[#1e1e1e] p-4 rounded-lg border border-[#444]">
            <h3 className="text-lg font-medium mb-3 text-white">Waktu Pengamatan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label htmlFor="tgl_pengamatan" className="block text-sm text-gray-300">
                        Tanggal Pengamatan
                    </label>
                    <input 
                        id="tgl_pengamatan"
                        type="date" 
                        name="tgl_pengamatan"
                        className="w-full border border-[#444] p-2 rounded bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
                        value={formData.tgl_pengamatan}
                        onChange={handleInputChange}
                        placeholder="Tanggal Pengamatan"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="start_time" className="block text-sm text-gray-300">
                        Waktu Mulai
                    </label>
                    <input 
                        id="start_time"
                        type="time" 
                        name="start_time"
                        className="w-full border border-[#444] p-2 rounded bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
                        value={formData.start_time}
                        onChange={handleInputChange}
                        placeholder="Waktu Mulai"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="end_time" className="block text-sm text-gray-300">
                        Waktu Selesai
                    </label>
                    <input 
                        id="end_time"
                        type="time" 
                        name="end_time"
                        className="w-full border border-[#444] p-2 rounded bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
                        value={formData.end_time}
                        onChange={handleInputChange}
                        placeholder="Waktu Selesai"
                    />
                </div>
            </div>
        </div>

        {/* Data Pengamat */}
        <div className="bg-[#1e1e1e] p-4 rounded-lg border border-[#444]">
            <h3 className="text-lg font-medium mb-3 text-white">Data Pengamat</h3>
            <div className="grid grid-cols-1 gap-4">
                <input 
                    type="text" 
                    name="observer"
                    className="border border-[#444] p-2 rounded bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
                    value={formData.observer}
                    onChange={handleInputChange}
                    placeholder="Nama Pengamat"
                />
                <select 
                    name="tujuan_pengamatan"
                    className="border border-[#444] p-2 rounded bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8] text-sm md:text-base w-full"
                    value={formData.tujuan_pengamatan}
                    onChange={handleInputChange}
                    required
                >
                    <option value="" className="text-sm">Pilih Tujuan Pengamatan</option>
                    <option value="1" className="text-sm py-1">
                        Terencana/Terjadwal (Survey, Inventarisasi, Pengamatan Rutin, dll)
                    </option>
                    <option value="2" className="text-sm py-1">
                        Insidental/tidak ditujukan untuk pengamatan
                    </option>
                </select>
                <textarea 
                    name="additional_note"
                    className="border border-[#444] p-2 rounded bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
                    value={formData.additional_note}
                    onChange={handleInputChange}
                    placeholder="Catatan Tambahan"
                    rows="3"
                />
            </div>
        </div>

        {/* Status Pengamatan */}
        <div className="bg-[#1e1e1e] p-4 rounded-lg border border-[#444]">
            <h3 className="text-lg font-medium mb-3 text-white">Status Pengamatan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <div className="flex items-center space-x-2 bg-[#2c2c2c] p-3 rounded-lg">
                    <input 
                        type="checkbox" 
                        name="active"
                        id="active"
                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                        checked={formData.active === 1}
                        onChange={(e) => {
                            setFormData(prev => ({
                                ...prev,
                                active: e.target.checked ? 1 : 0
                            }));
                        }}
                    />
                    <label htmlFor="active" className="text-gray-300">Aktifitas</label>
                </div> */}
                <div className="flex items-center space-x-2 bg-[#2c2c2c] p-3 rounded-lg">
                    <input 
                        type="checkbox" 
                        name="completed"
                        id="completed"
                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                        checked={formData.completed === 1}
                        onChange={(e) => {
                            setFormData(prev => ({
                                ...prev,
                                completed: e.target.checked ? 1 : 0
                            }));
                        }}
                    />
                    <label htmlFor="completed" className="text-gray-300">Checklist Lengkap</label>
                </div>
            </div>
        </div>
    </div>


                {/* Daftar Kupu-kupu */}
                <div className="mb-4 mt-8">
                    <button 
                        type="button" 
                        onClick={() => setIsModalOpen(true)} 
                        className="bg-[#1a73e8] hover:bg-[#1565c0] text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Tambah Jenis
                    </button>

                    {butterflyList.length > 0 && (
                        <div className="mt-8">
                            <div className="bg-[#1e1e1e] p-4 md:p-6 rounded-lg border border-[#444] shadow-md">
                                <h2 className="text-xl font-semibold mb-6 text-white">Daftar Kupu-kupu</h2>
                                
                                {/* Desktop View - Tabel */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-[#444]">
                                        <thead className="bg-[#2c2c2c]">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Media</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nama</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Jumlah</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Catatan</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Aktivitas</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-[#1e1e1e] divide-y divide-[#444]">
                                        {butterflyList.map((butterfly, index) => (
                                            <tr key={index} className="hover:bg-[#2a2a2a] transition-colors">
                                                <td className="px-6 py-4">
                                                    {/* Tampilan Media */}
                                                    <div className="space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-3 gap-3">
                                                        {butterfly.images.map((image, imgIndex) => (
                                                            <div key={imgIndex} className="relative group aspect-square max-w-[300px] w-full mx-auto">
                                                                <img 
                                                                    src={URL.createObjectURL(image)} 
                                                                    alt="Foto Kupu-kupu" 
                                                                    className="w-full h-full object-cover rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                                                                />
                                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 rounded-lg" />
                                                                <button 
                                                                    onClick={() => handleRemoveMedia('images', imgIndex, index)}
                                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-white">{butterfly.faunaName}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-[#1a3d71] text-blue-300">
                                                        {butterfly.count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-300">
                                                    <div className="max-w-xs overflow-hidden text-ellipsis">
                                                        {butterfly.notes}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-300">
                                                    {butterfly.breeding === 1 ? 
                                                        <div>
                                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-800 text-green-300">
                                                                Ya
                                                            </span>
                                                            {butterfly.breeding_type_id && (
                                                                <div className="mt-1 text-xs">
                                                                    <strong>Tipe Aktivitas:</strong> {
                                                                        butterfly.breeding_type_id === 1 ? 'Berjemur' :
                                                                        butterfly.breeding_type_id === 2 ? 'Mengisap nektar' :
                                                                        butterfly.breeding_type_id === 3 ? 'Melumpur' :
                                                                        butterfly.breeding_type_id === 4 ? 'Istirahat' :
                                                                        butterfly.breeding_type_id === 5 ? 'Mengisap buah busuk' :
                                                                        butterfly.breeding_type_id === 6 ? 'Kawin' :
                                                                        butterfly.breeding_type_id === 7 ? 'Meletakan telur' :
                                                                        butterfly.breeding_type_id === 16 ? 'Terbang' :
                                                                        butterfly.breeding_type_id === 17 ? 'Menghisap kotoran' : ''
                                                                    }
                                                                </div>
                                                            )}
                                                            {butterfly.breeding_note && (
                                                                <div className="mt-1 text-xs">
                                                                    <strong>Catatan:</strong> {butterfly.breeding_note}
                                                                </div>
                                                            )}
                                                        </div>
                                                        : 
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-800 text-gray-300">
                                                            Tidak
                                                        </span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <button 
                                                            onClick={() => handleEditButterfly(index)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-[#1a73e8] hover:bg-[#1565c0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteButterfly(index)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-[#d13434] hover:bg-[#b02a2a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                                        >
                                                            Hapus
                                                        </button>
                                                        <button 
                                                            onClick={() => handleFileModalOpen(index)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-[#17a34a] hover:bg-[#158540] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                                        >
                                                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                            </svg>
                                                            Tambah Foto
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile View - Cards */}
                                <div className="md:hidden space-y-4">
                                    {butterflyList.map((butterfly, index) => (
                                        <div key={index} className="bg-[#2c2c2c] rounded-lg p-4 space-y-3 border border-[#444]">
                                            {/* Gambar Grid */}
                                            {butterfly.images.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {butterfly.images.map((image, imgIndex) => (
                                                        <div key={imgIndex} className="relative group aspect-square">
                                                            <img 
                                                                src={URL.createObjectURL(image)} 
                                                                alt="Foto Kupu-kupu" 
                                                                className="w-full h-full object-cover rounded-lg"
                                                            />
                                                            <button 
                                                                onClick={() => handleRemoveMedia('images', imgIndex, index)}
                                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Info Kupu-kupu */}
                                            <div className="space-y-2">
                                                <div className="font-medium text-sm text-white">
                                                    {butterfly.faunaName}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm text-gray-300">Jumlah:</span>
                                                    <span className="px-2 py-1 text-sm font-semibold rounded-full bg-[#1a3d71] text-blue-300">
                                                        {butterfly.count}
                                                    </span>
                                                </div>
                                                {butterfly.notes && (
                                                    <div className="text-sm text-gray-300">
                                                        <span className="font-medium">Catatan:</span>
                                                        <p className="mt-1">{butterfly.notes}</p>
                                                    </div>
                                                )}
                                                <div className="text-sm text-gray-300">
                                                    <span className="font-medium">Aktivitas:</span>
                                                    {butterfly.breeding === 1 ? (
                                                        <div className="mt-1">
                                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-800 text-green-300">Ya</span>
                                                            {butterfly.breeding_type_id && (
                                                                <p className="mt-1 text-xs">
                                                                    <strong>Tipe:</strong> {
                                                                        butterfly.breeding_type_id === 1 ? 'Berjemur' :
                                                                        butterfly.breeding_type_id === 2 ? 'Mengisap nektar' :
                                                                        butterfly.breeding_type_id === 3 ? 'Melumpur' :
                                                                        butterfly.breeding_type_id === 4 ? 'Istirahat' :
                                                                        butterfly.breeding_type_id === 5 ? 'Mengisap buah busuk' :
                                                                        butterfly.breeding_type_id === 6 ? 'Kawin' :
                                                                        butterfly.breeding_type_id === 7 ? 'Meletakan telur' :
                                                                        butterfly.breeding_type_id === 16 ? 'Terbang' :
                                                                        butterfly.breeding_type_id === 17 ? 'Menghisap kotoran' : ''
                                                                    }
                                                                </p>
                                                            )}
                                                            {butterfly.breeding_note && (
                                                                <p className="mt-1 text-xs">
                                                                    <strong>Catatan aktivitas:</strong> {butterfly.breeding_note}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-800 text-gray-300">Tidak</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Tombol Aksi */}
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                <button 
                                                    onClick={() => handleEditButterfly(index)}
                                                    className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium rounded text-white bg-[#1a73e8] hover:bg-[#1565c0] transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteButterfly(index)}
                                                    className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium rounded text-white bg-[#d13434] hover:bg-[#b02a2a] transition-colors"
                                                >
                                                    Hapus
                                                </button>
                                                <button 
                                                    onClick={() => handleFileModalOpen(index)}
                                                    className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium rounded text-white bg-[#17a34a] hover:bg-[#158540] transition-colors"
                                                >
                                                    Tambah Foto
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Tambah/Edit Kupu-kupu */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                        <div className="bg-[#1e1e1e] rounded shadow-lg w-96 max-w-full relative border border-[#444] max-h-[90vh] flex flex-col">
                            {isSearching && (
                                <div className="absolute top-2 right-2 z-[700]">
                                    <div className="bg-[#2c2c2c] p-2 rounded-lg shadow-md flex items-center space-x-2 border border-[#444]">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#e0e0e0] border-t-transparent"></div>
                                        <span className="text-sm text-white">Mencari...</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="p-6">
                                <h2 className="text-xl font-semibold mb-4 text-white">
                                    {editIndex !== null ? 'Edit Kupu-kupu' : 'Tambah Kupu-kupu'}
                                </h2>
                            </div>
                            
                            <div className="overflow-y-auto px-6 flex-1">
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        id="fauna_name" 
                                        placeholder="Jenis kupu-kupu" 
                                        required 
                                        className="border border-[#444] p-2 w-full mb-2 bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8] rounded" 
                                        value={faunaName} 
                                        onChange={(e) => handleFaunaNameChange(e.target.value)} 
                                        autoComplete="off"
                                    />
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute z-50 w-full bg-[#2c2c2c] border border-[#444] rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {suggestions.map((fauna) => (
                                                <div
                                                    key={fauna.id}
                                                    className="px-4 py-2 hover:bg-[#383838] cursor-pointer text-white"
                                                    onClick={() => handleSelectFauna(fauna)}
                                                >
                                                    <span className="font-medium">{fauna.nameId}</span>
                                                    <span className="text-sm text-gray-400 ml-2">({fauna.nameLat})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <input 
                                    type="number" 
                                    name="count"
                                    min="1"
                                    placeholder="Jumlah individu"
                                    required 
                                    className="border border-[#444] p-2 w-full mb-2 bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8] rounded" 
                                    value={formData.count}
                                    onChange={handleInputChange}
                                />
                                
                                <textarea 
                                    name="notes"
                                    placeholder="Catatan" 
                                    className="border border-[#444] p-2 w-full mb-2 bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8] rounded" 
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                />

                                <div className="space-y-2 mb-2">
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="checkbox" 
                                            name="breeding" 
                                            id="breeding" 
                                            checked={formData.breeding === 1}
                                            onChange={(e) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    breeding: e.target.checked ? 1 : 0,
                                                    // Reset breeding_type_id jika tidak checked
                                                    breeding_type_id: e.target.checked ? prev.breeding_type_id : null
                                                }));
                                            }}
                                            className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                        />
                                        <label htmlFor="breeding" className="text-gray-300">Sedang beraktivitas?</label>
                                    </div>

                                    {formData.breeding === 1 && (
                                        <div className="mt-3 bg-[#2c2c2c] p-3 rounded-lg">
                                            <p className="text-sm font-medium text-gray-300 mb-2">Pilih tipe aktivitas:</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="breeding_type_1"
                                                        checked={formData.breeding_type_id === 1}
                                                        onChange={() => setFormData(prev => ({...prev, breeding_type_id: 1}))}
                                                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                                    />
                                                    <label htmlFor="breeding_type_1" className="text-gray-300">Berjemur</label>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="breeding_type_2"
                                                        checked={formData.breeding_type_id === 2}
                                                        onChange={() => setFormData(prev => ({...prev, breeding_type_id: 2}))}
                                                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                                    />
                                                    <label htmlFor="breeding_type_2" className="text-gray-300">Mengisap nektar</label>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="breeding_type_3"
                                                        checked={formData.breeding_type_id === 3}
                                                        onChange={() => setFormData(prev => ({...prev, breeding_type_id: 3}))}
                                                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                                    />
                                                    <label htmlFor="breeding_type_3" className="text-gray-300">Melumpur</label>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="breeding_type_4"
                                                        checked={formData.breeding_type_id === 4}
                                                        onChange={() => setFormData(prev => ({...prev, breeding_type_id: 4}))}
                                                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                                    />
                                                    <label htmlFor="breeding_type_4" className="text-gray-300">Istirahat</label>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="breeding_type_5"
                                                        checked={formData.breeding_type_id === 5}
                                                        onChange={() => setFormData(prev => ({...prev, breeding_type_id: 5}))}
                                                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                                    />
                                                    <label htmlFor="breeding_type_5" className="text-gray-300">Mengisap buah busuk</label>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="breeding_type_6"
                                                        checked={formData.breeding_type_id === 6}
                                                        onChange={() => setFormData(prev => ({...prev, breeding_type_id: 6}))}
                                                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                                    />
                                                    <label htmlFor="breeding_type_6" className="text-gray-300">Kawin</label>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="breeding_type_7"
                                                        checked={formData.breeding_type_id === 7}
                                                        onChange={() => setFormData(prev => ({...prev, breeding_type_id: 7}))}
                                                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                                    />
                                                    <label htmlFor="breeding_type_7" className="text-gray-300">Meletakan telur</label>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="breeding_type_16"
                                                        checked={formData.breeding_type_id === 16}
                                                        onChange={() => setFormData(prev => ({...prev, breeding_type_id: 16}))}
                                                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                                    />
                                                    <label htmlFor="breeding_type_16" className="text-gray-300">Terbang</label>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="breeding_type_17"
                                                        checked={formData.breeding_type_id === 17}
                                                        onChange={() => setFormData(prev => ({...prev, breeding_type_id: 17}))}
                                                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                                    />
                                                    <label htmlFor="breeding_type_17" className="text-gray-300">Menghisap kotoran</label>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-3">
                                                <label htmlFor="breeding_note" className="block text-sm text-gray-300 mb-1">
                                                    Catatan Aktivitas
                                                </label>
                                                <textarea 
                                                    id="breeding_note"
                                                    name="breeding_note"
                                                    className="w-full border border-[#444] p-2 rounded bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" 
                                                    rows="2"
                                                    value={formData.breeding_note || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="Catatan terkait aktivitas..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-2 bg-[#2c2c2c] p-3 rounded border border-[#444]">
                                    <label className="block mb-2 text-sm text-gray-300">Upload Foto:</label>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        multiple 
                                        onChange={handleFileChange}
                                        className="text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#1a73e8] file:text-white hover:file:bg-[#1565c0]"
                                    />
                                </div>

                                {formData.images.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="font-semibold mb-2 text-gray-300">Preview Foto:</h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {formData.images.map((image, index) => (
                                                <div key={index} className="relative group">
                                                    <img 
                                                        src={URL.createObjectURL(image)} 
                                                        alt={`Preview ${index}`} 
                                                        className="w-full h-20 object-cover rounded"
                                                    />
                                                    <button 
                                                        onClick={() => handleRemoveFormImage(index)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between p-6 pt-4 border-t border-[#444] mt-auto">
                                <button 
                                    onClick={handleAddButterfly}
                                    className="bg-[#1a73e8] text-white p-2 rounded hover:bg-[#1565c0] transition-colors"
                                >
                                    {editIndex !== null ? 'Simpan Perubahan' : 'Tambah'}
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditIndex(null);
                                        setFaunaName('');
                                        setFaunaId('');
                                        setFormData(prev => ({
                                            ...prev,
                                            count: '',
                                            notes: '',
                                            breeding: 0,
                                            breeding_type_id: null,
                                            breeding_note: '',
                                            images: []
                                        }));
                                    }}
                                    className="bg-[#d13434] text-white p-2 rounded hover:bg-[#b02a2a] transition-colors"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

    {/* Form Modal Foto */}
    {isFileModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
            <div className="bg-[#1e1e1e] p-4 md:p-6 rounded shadow-lg w-full max-w-lg border border-[#444]">
                <h2 className="text-xl font-semibold mb-4 text-white">Tambah Foto</h2>
                <div className="bg-[#2c2c2c] p-3 rounded border border-[#444] mb-4">
                    <label className="block mb-2 text-sm text-gray-300">Upload Foto:</label>
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange} 
                        className="text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#1a73e8] file:text-white hover:file:bg-[#1565c0]" 
                        multiple 
                    />
                </div>
                
                {/* Preview Foto */}
                {formData.images.length > 0 && (
                    <div className="mb-4">
                        <h3 className="font-semibold mb-2 text-gray-300">Preview Foto:</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {formData.images.map((image, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <img 
                                        src={URL.createObjectURL(image)} 
                                        alt="Preview" 
                                        className="w-full h-full object-cover rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 rounded-lg" />
                                    <button 
                                        onClick={() => handleRemoveFormImage(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between gap-2">
                    <button 
                        onClick={handleFileSave} 
                        className="bg-[#1a73e8] text-white p-2 rounded hover:bg-[#1565c0] transition-colors"
                    >
                        Simpan
                    </button>
                    <button 
                        onClick={handleFileModalClose} 
                        className="bg-[#d13434] text-white p-2 rounded hover:bg-[#b02a2a] transition-colors"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </div>
    )}

                {/* Tombol Submit */}
                {butterflyList.length > 0 && (
                    <div className="mt-4">
                        <button 
                            onClick={() => setIsConfirmModalOpen(true)}
                            className="bg-[#1a73e8] text-white px-4 py-2 rounded hover:bg-[#1565c0] transition-colors"
                        >
                            Upload Data
                        </button>
                    </div>
                )}

                {/* Modal Konfirmasi */}
                {isConfirmModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
                        <div className="bg-[#1e1e1e] p-6 rounded shadow-lg w-96 border border-[#444]">
                            <h2 className="text-xl font-semibold mb-4 text-white">Apakah data sudah benar?</h2>
                            <div className="text-gray-300">
                                <p><strong className="text-white">Tujuan Pengamatan:</strong> {formData.tujuan_pengamatan === '1' ? 'Terencana/Terjadwal' : formData.tujuan_pengamatan === '2' ? 'Insidental' : '-'}</p>
                                <p><strong className="text-white">Observer:</strong> {formData.observer}</p>
                                <p><strong className="text-white">Catatan Tambahan:</strong> {formData.additional_note}</p>
                                <p><strong className="text-white">Latitude:</strong> {formData.latitude}</p>
                                <p><strong className="text-white">Longitude:</strong> {formData.longitude}</p>
                                <p><strong className="text-white">Jumlah Total Spesies:</strong> {butterflyList.length}</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mt-4 text-white">Detail Kupu-kupu:</h3>
                                <div className="max-h-40 overflow-y-auto mt-2 pr-2">
                                    {butterflyList.map((butterfly, index) => (
                                        <div key={index} className="mt-2 border-t border-[#444] pt-2">
                                            <p><strong className="text-white">Nama:</strong> <span className="text-gray-300">{butterfly.faunaName}</span></p>
                                            <p><strong className="text-white">Jumlah:</strong> <span className="text-gray-300">{butterfly.count}</span></p>
                                            <p><strong className="text-white">Catatan:</strong> <span className="text-gray-300">{butterfly.notes}</span></p>
                                            <p><strong className="text-white">Aktivitas:</strong> <span className="text-gray-300">{butterfly.breeding === 1 ? 'Ya' : 'Tidak'}</span></p>
                                            {butterfly.breeding === 1 && butterfly.breeding_type_id && (
                                                <p><strong className="text-white">Tipe Aktivitas:</strong> <span className="text-gray-300">
                                                    {butterfly.breeding_type_id === 1 ? 'Berjemur' :
                                                     butterfly.breeding_type_id === 2 ? 'Mengisap nektar' :
                                                     butterfly.breeding_type_id === 3 ? 'Melumpur' :
                                                     butterfly.breeding_type_id === 4 ? 'Istirahat' :
                                                     butterfly.breeding_type_id === 5 ? 'Mengisap buah busuk' :
                                                     butterfly.breeding_type_id === 6 ? 'Kawin' :
                                                     butterfly.breeding_type_id === 7 ? 'Meletakan telur' :
                                                     butterfly.breeding_type_id === 16 ? 'Terbang' :
                                                     butterfly.breeding_type_id === 17 ? 'Menghisap kotoran' : ''}
                                                </span></p>
                                            )}
                                            {butterfly.breeding === 1 && butterfly.breeding_note && (
                                                <p><strong className="text-white">Catatan Aktivitas:</strong> <span className="text-gray-300">{butterfly.breeding_note}</span></p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between mt-4">
                                <button onClick={handleSubmit} className="bg-[#1a73e8] text-white p-2 rounded hover:bg-[#0d47a1]">Ya, Kirim</button>
                                <button onClick={() => setIsConfirmModalOpen(false)} className="bg-red-800 text-white p-2 rounded hover:bg-red-700">Batal</button>
                            </div>
                        </div>
                    </div>
                )}

                {showBackConfirmModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
                        <div className="bg-[#1e1e1e] p-6 rounded shadow-lg w-96 border border-[#444]">
                            <h2 className="text-xl font-semibold mb-4 text-white">Peringatan</h2>
                            <div className="text-gray-300">
                                <p>Anda memiliki data yang belum disimpan. Apakah Anda yakin ingin keluar?</p>
                                <p className="mt-2 text-yellow-400">Data yang belum disimpan akan hilang.</p>
                            </div>
                            <div className="flex justify-between mt-6">
                                <button onClick={handleSafeGoBack} className="bg-red-800 text-white p-2 rounded hover:bg-red-700">
                                    Ya, Keluar
                                </button>
                                <button onClick={() => setShowBackConfirmModal(false)} className="bg-[#1a73e8] text-white p-2 rounded hover:bg-[#0d47a1]">
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default KupunesiaUpload;