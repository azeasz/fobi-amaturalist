import React, { useState, useEffect } from 'react';
import LocationPicker from './Observations/LocationPicker';
import Modal from './Observations/LPModal';
import LocationInput from './Observations/LocationInput';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { apiFetch } from '../utils/api';
import { toast, ToastContainer } from 'react-toastify';

function FobiUpload() {
    const { user, updateTotalObservations } = useUser(); // Tambahkan updateTotalObservations
    const navigate = useNavigate();

    const [faunaName, setFaunaName] = useState('');
    const [faunaId, setFaunaId] = useState('');
    const [formData, setFormData] = useState({
        latitude: '',
        longitude: '',
        tujuan_pengamatan: '',
        observer: '',
        additional_note: '',
        active: 0,
        tgl_pengamatan: '',
        start_time: '',
        end_time: '',
        completed: 0,
        count: '',
        notes: '',
        breeding: false,
        breeding_type_id: null,
        breeding_note: '',
        images: [],
        sounds: []
    });
 // State untuk loading dan error
 const [loading, setLoading] = useState(false);
 const [progress, setProgress] = useState(0);
 const [loadingMessage, setLoadingMessage] = useState('');
 const [isSearching, setIsSearching] = useState(false);
 const [error, setError] = useState('');
 
 // State untuk modal
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isFileModalOpen, setIsFileModalOpen] = useState(false);
 const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
 const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
 
 // State untuk data
 const [locationName, setLocationName] = useState('');
 const [birdList, setBirdList] = useState([]);
 const [editIndex, setEditIndex] = useState(null);

 const [suggestions, setSuggestions] = useState([]);
const [showSuggestions, setShowSuggestions] = useState(false);

 // Tambahkan state untuk modal konfirmasi kembali
 const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);

 // Tambahkan useEffect untuk menangkap event popstate (back/forward browser)
 useEffect(() => {
    // Handler untuk menangkap ketika tombol back browser ditekan
    const handleBeforeUnload = (e) => {
        // Jika ada data yang belum disimpan, tampilkan konfirmasi
        if (formData.tgl_pengamatan || locationName || birdList.length > 0) {
            e.preventDefault();
            e.returnValue = '';
            // Untuk browser modern, returnValue sudah cukup
            return '';
        }
    };

    // Handler untuk menangkap event popstate (back/forward browser)
    const handlePopState = (e) => {
        // Jika ada data yang belum disimpan, tampilkan konfirmasi
        if (formData.tgl_pengamatan || locationName || birdList.length > 0) {
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
}, [formData, locationName, birdList]);

 // Tambahkan useEffect untuk mengisi nama observer
 useEffect(() => {
    const fullname = localStorage.getItem('fullname');
    if (fullname) {
        setFormData(prev => ({
            ...prev,
            observer: fullname
        }));
    }
}, []);

 // Fungsi simulasi progress
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
            if (!token) {
                throw new Error('Token tidak ditemukan');
            }
            
            // Gunakan endpoint taxonomy/birds/search terlebih dahulu
            const response = await apiFetch(`/taxonomy/birds/search?q=${encodeURIComponent(name)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) throw new Error('Gagal mengambil data burung');
            
            const data = await response.json();
            if (data.success && data.data.length > 0) {
                // Urutkan hasil pencarian berdasarkan kecocokan dengan input pengguna
                const sortedResults = sortSearchResults(data.data, name);
                setSuggestions(sortedResults);
                setShowSuggestions(true);
            } else {
                // Fallback ke endpoint lama jika tidak ada hasil
                const fallbackResponse = await apiFetch(`/faunas?name=${encodeURIComponent(name)}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!fallbackResponse.ok) throw new Error('Gagal mengambil data burung');
                
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.success) {
                    // Urutkan hasil pencarian fallback
                    const sortedFallbackResults = sortSearchResults(fallbackData.data, name);
                    setSuggestions(sortedFallbackResults);
                    setShowSuggestions(true);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Gagal mengambil data fauna');
        } finally {
            setIsSearching(false);
        }
    } else {
        setSuggestions([]);
        setShowSuggestions(false);
    }
};

// Fungsi untuk mengurutkan hasil pencarian berdasarkan kecocokan
const sortSearchResults = (results, query) => {
    const lowerQuery = query.toLowerCase();
    
    return results.sort((a, b) => {
        // Prioritaskan hasil yang memiliki kecocokan di awal nama
        const aNameId = (a.nameId || '').toLowerCase();
        const bNameId = (b.nameId || '').toLowerCase();
        const aNameLat = (a.nameLat || '').toLowerCase();
        const bNameLat = (b.nameLat || '').toLowerCase();
        const aDisplayName = (a.displayName || '').toLowerCase();
        const bDisplayName = (b.displayName || '').toLowerCase();
        
        // Jika nama persis sama dengan query, prioritaskan tertinggi
        const aExactMatch = aNameId === lowerQuery || aDisplayName === lowerQuery;
        const bExactMatch = bNameId === lowerQuery || bDisplayName === lowerQuery;
        
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        
        // Periksa kecocokan di awal nama (exact match di awal)
        const aStartsWithQuery = 
            aNameId.startsWith(lowerQuery) || 
            aNameLat.startsWith(lowerQuery) || 
            aDisplayName.startsWith(lowerQuery);
            
        const bStartsWithQuery = 
            bNameId.startsWith(lowerQuery) || 
            bNameLat.startsWith(lowerQuery) || 
            bDisplayName.startsWith(lowerQuery);
            
        if (aStartsWithQuery && !bStartsWithQuery) return -1;
        if (!aStartsWithQuery && bStartsWithQuery) return 1;
        
        // Jika keduanya cocok di awal atau keduanya tidak cocok di awal,
        // periksa kecocokan di tengah nama (contains)
        const aContainsQuery = 
            aNameId.includes(lowerQuery) || 
            aNameLat.includes(lowerQuery) || 
            aDisplayName.includes(lowerQuery);
            
        const bContainsQuery = 
            bNameId.includes(lowerQuery) || 
            bNameLat.includes(lowerQuery) || 
            bDisplayName.includes(lowerQuery);
            
        if (aContainsQuery && !bContainsQuery) return -1;
        if (!aContainsQuery && bContainsQuery) return 1;
        
        // Jika keduanya memiliki kecocokan yang sama, urutkan berdasarkan panjang nama
        // (nama yang lebih pendek biasanya lebih relevan)
        const aNameLength = Math.min(
            aNameId.length || Infinity, 
            aNameLat.length || Infinity, 
            aDisplayName.length || Infinity
        );
        
        const bNameLength = Math.min(
            bNameId.length || Infinity, 
            bNameLat.length || Infinity, 
            bDisplayName.length || Infinity
        );
        
        return aNameLength - bNameLength;
    });
};

const handleSelectFauna = (fauna) => {
    // Tentukan tampilan nama berdasarkan ketersediaan displayName
    let displayName = '';
    
    if (fauna.displayName) {
        displayName = fauna.displayName;
    } else if (fauna.nameId) {
        displayName = fauna.nameId;
    } else if (fauna.nameLat) {
        displayName = fauna.nameLat;
    }
    
    // Tidak perlu menambahkan informasi taksonomi di tampilan nama
    setFaunaName(displayName);
    setFaunaId(parseInt(fauna.id));
    setShowSuggestions(false);
};
const handleInputChange = (e) => {
     const { name, value, type, checked } = e.target;
     setFormData(prevFormData => ({
         ...prevFormData,
         [name]: type === 'checkbox' ? checked : value
     }));
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

 const handleFileChange = async (e) => {
     const { files } = e.target;
     setLoading(true);
     setLoadingMessage('Memproses file...');
     setProgress(0);

     const totalFiles = files.length;
     let processedFiles = 0;
     let newImages = [];
     let newSounds = [];

     for (const file of Array.from(files)) {
         if (file.type.startsWith('image/')) {
             newImages.push(file);
         } else if (file.type.startsWith('audio/')) {
             newSounds.push(file);
         }
         processedFiles++;
         setProgress((processedFiles / totalFiles) * 100);
     }

     setFormData(prevFormData => ({
         ...prevFormData,
         images: [...prevFormData.images, ...newImages],
         sounds: [...prevFormData.sounds, ...newSounds]
     }));

     setLoading(false);
    };

    const handleAddBird = () => {
        if (!faunaId || !formData.count) {
            setError('Silakan lengkapi data burung');
            return;
        }

        const newBird = {
            faunaId: parseInt(faunaId),
            faunaName,
            count: parseInt(formData.count),
            notes: formData.notes,
            breeding: formData.breeding || false,
            breeding_type_id: formData.breeding_type_id || null,
            breeding_note: formData.breeding_note || '',
            images: formData.images || [],
            sounds: formData.sounds || []
        };

        if (editIndex !== null) {
            setBirdList(prevList => {
                const newList = [...prevList];
                newList[editIndex] = newBird;
                return newList;
            });
            setEditIndex(null);
        } else {
            setBirdList(prevList => [...prevList, newBird]);
        }

        // Reset form
        setFaunaName('');
        setFaunaId('');
        setFormData(prevData => ({
            ...prevData,
            count: '',
            notes: '',
            breeding: false,
            breeding_type_id: null,
            breeding_note: '',
            images: [],
            sounds: []
        }));
        setIsModalOpen(false);
    };

    const handleEditBird = async (index) => {
        try {
        const bird = birdList[index];
        setFaunaName(bird.faunaName);
            setFaunaId(bird.faunaId);
            
            setFormData(prevData => ({
                ...prevData,
                count: bird.count,
                notes: bird.notes,
                breeding: bird.breeding,
                breeding_type_id: bird.breeding_type_id,
                breeding_note: bird.breeding_note,
                images: [...(bird.images || [])],
                sounds: [...(bird.sounds || [])]
            }));
            
        setEditIndex(index);
        setIsModalOpen(true);
        } catch (error) {
            console.error("Error in edit bird:", error);
            setError("Terjadi kesalahan saat mengedit data burung.");
        }
    };

    const handleDeleteBird = (index) => {
        const newList = birdList.filter((_, i) => i !== index);
        setBirdList(newList);
    };

    const handleOpenModal = () => {
        // Reset form fields untuk tambah jenis baru
        setFaunaName('');
        setFaunaId('');
        setEditIndex(null);
        // Reset form data modal tambah
        setFormData(prev => ({
            ...prev,
            count: '',
            notes: '',
            breeding: false,
            breeding_note: '',
            breeding_type_id: null,
            images: [],
            sounds: []
        }));
        setIsModalOpen(true);
    };

    const handleFileModalOpen = (index) => {
        setEditIndex(index);
        setIsFileModalOpen(true);
    };

    const handleFileModalClose = () => {
        setIsFileModalOpen(false);
        setEditIndex(null);
    };

    const handleFileSave = async () => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                throw new Error('Token tidak ditemukan');
            }
            
            setLoading(true);
            setLoadingMessage('Menyimpan file dan membuat spektrogram...');
            setProgress(0);
            
            const fileData = new FormData();
            
            // Proses upload file
            formData.images.forEach((image) => {
                fileData.append('images[]', image);
            });
            formData.sounds.forEach((sound) => {
                fileData.append('sounds[]', sound);
            });
    
            let spectrogramUrl = null;
    
            if (formData.sounds.length > 0) {
                const response = await apiFetch('/generate-spectrogram', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: fileData
                });
    
                if (response.status === 401) {
                    navigate('/login', { replace: true });
                    return;
                }
    
                if (!response.ok) {
                    throw new Error('Gagal membuat spektrogram');
                }
    
                const data = await response.json();
                spectrogramUrl = data.spectrogramUrl;
            }
    
            // Set progress ke 100% setelah berhasil
            setProgress(100);
    
            // Update bird list
            const updatedBirdList = birdList.map((bird, index) =>
                index === editIndex ? {
                    ...bird,
                    images: [...bird.images, ...formData.images],
                    sounds: [...bird.sounds, ...formData.sounds],
                    spectrogramUrl: spectrogramUrl || bird.spectrogramUrl
                } : bird
            );
            setBirdList(updatedBirdList);
    
            // Reset form data
            setFormData(prevFormData => ({
                ...prevFormData,
                images: [],
                sounds: []
            }));
    
            // Tunggu sebentar untuk menampilkan 100%
            await new Promise(resolve => setTimeout(resolve, 500));
    
        } catch (error) {
            console.error('Error:', error);
            setError(error.message);
            if (error.message.includes('Token')) {
                navigate('/login', { replace: true });
            }
        } finally {
            // Pastikan loading dan progress dibersihkan
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
                handleFileModalClose();
            }, 500);
        }
    };
    
    const handleRemoveMediaFromList = (birdIndex, mediaType, mediaIndex) => {
        setBirdList(prevList => {
            const updatedList = [...prevList];
            updatedList[birdIndex] = {
                ...updatedList[birdIndex],
                [mediaType]: updatedList[birdIndex][mediaType].filter((_, i) => i !== mediaIndex)
            };
            return updatedList;
        });
    };

    const handleConfirmSubmit = (e) => {
        e.preventDefault();
        setIsConfirmModalOpen(true);
    };

    const handleSubmit = async () => {
        setError('');
        setIsConfirmModalOpen(false);
        
        // Validasi tanggal pengamatan wajib diisi
        if (!formData.tgl_pengamatan) {
            setError('Silakan isi tanggal pengamatan terlebih dahulu');
            return;
        }
        
        setLoading(true);
        setProgress(0);
        
        try {
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return 90;
                    return prev + 10;
                });
            }, 500);
    
            // Validasi fauna list
            const validatedBirdList = await Promise.all(birdList.map(async (bird) => {
                try {
                    const response = await apiFetch(`/faunas?name=${encodeURIComponent(bird.faunaName)}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                        }
                    });
                    
                    if (!response.ok) throw new Error('Gagal memvalidasi data fauna');
                    
                    const data = await response.json();
                    if (!data.success || !data.data.length) {
                        throw new Error(`Fauna "${bird.faunaName}" tidak ditemukan`);
                    }
    
                    const matchedFauna = data.data.find(f => f.nameId === bird.faunaName);
                    if (!matchedFauna) {
                        throw new Error(`Data fauna "${bird.faunaName}" tidak valid`);
                    }
    
                    return {
                        ...bird,
                        faunaId: parseInt(matchedFauna.id)
                    };
                } catch (error) {
                    throw new Error(`Error validasi fauna "${bird.faunaName}": ${error.message}`);
                }
            }));
    
            const formDataToSend = new FormData();
            Object.keys(formData).forEach(key => {
                if (key !== 'images' && key !== 'sounds') {
                    formDataToSend.append(key, formData[key]);
                }
            });
    
            validatedBirdList.forEach((bird, index) => {
                formDataToSend.append(`fauna_id[${index}]`, bird.faunaId);
                formDataToSend.append(`count[${index}]`, bird.count);
                formDataToSend.append(`notes[${index}]`, bird.notes);
                formDataToSend.append(`breeding[${index}]`, bird.breeding ? 1 : 0);
                formDataToSend.append(`breeding_note[${index}]`, bird.breeding_note);
                
                // Hanya tambahkan breeding_type_id jika breeding true dan breeding_type_id tidak null
                if (bird.breeding && bird.breeding_type_id !== null) {
                    formDataToSend.append(`breeding_type_id[${index}]`, bird.breeding_type_id);
                }
                
                bird.images.forEach((image) => {
                    formDataToSend.append(`images[${index}][]`, image);
                });
                bird.sounds.forEach((sound) => {
                    formDataToSend.append(`sounds[${index}][]`, sound);
                });
            });
    
            const response = await apiFetch('/checklist-fauna', {
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
                // Update total observasi setelah upload berhasil
                await updateTotalObservations();
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                toast.success('Data berhasil diunggah!');
                // Reset form
                setFormData({
                    latitude: '',
                    longitude: '',
                    tujuan_pengamatan: '',
                    observer: '',
                    additional_note: '',
                    active: 0,
                    tgl_pengamatan: '',
                    start_time: '',
                    end_time: '',
                    completed: 0,
                    count: '',
                    notes: '',
                    breeding: false,
                    breeding_type_id: null,
                    breeding_note: '',
                    images: [],
                    sounds: []
                });
                setBirdList([]);

                // Redirect ke halaman profil atau daftar observasi
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

    const handleRemoveMedia = (mediaType, index) => {
        setFormData(prevFormData => ({
            ...prevFormData,
            [mediaType]: prevFormData[mediaType].filter((_, i) => i !== index)
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
                <div className="p-4 mt-0 md:mt-0">
{loading && (
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50">
                        <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-xl w-96 border border-[#444]">
                            <h3 className="text-lg font-semibold mb-4 text-white">{loadingMessage}</h3>
                            <div className="w-full bg-[#2c2c2c] rounded-full h-4 mb-2">
                                <div
                                    className="bg-[#1a73e8] h-4 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-center text-white">{Math.round(progress)}%</p>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-[#3a0f0f] border border-red-700 text-red-300 px-4 py-3 rounded relative mb-4">
                        <span className="block sm:inline">{error}</span>
                        <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                            <svg onClick={() => setError('')} className="fill-current h-6 w-6 text-red-400" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <title>Close</title>
                                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                            </svg>
                        </span>
                    </div>
                )}
<form onSubmit={handleConfirmSubmit} className="space-y-6">
    <h2 className="text-xl font-semibold text-white">Checklist Burungnesia</h2>
    
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

    {/* Waktu Pengamatan */}
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
                onChange={handleInputChange} 
                value={formData.tgl_pengamatan} 
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
                onChange={handleInputChange} 
                value={formData.start_time} 
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
                onChange={handleInputChange} 
                value={formData.end_time} 
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
                placeholder="Nama Pengamat" 
                required 
                className="border border-[#444] p-2 w-full rounded bg-[#2c2c2c] text-white placeholder-gray-400" 
                onChange={handleInputChange} 
                value={formData.observer} 
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
                placeholder="Catatan Tambahan" 
                className="border border-[#444] p-2 w-full rounded bg-[#2c2c2c] text-white placeholder-gray-400" 
                onChange={handleInputChange} 
                value={formData.additional_note} 
                rows="3"
            />
        </div>
    </div>

    {/* Status Pengamatan */}
    <div className="bg-[#1e1e1e] p-4 rounded-lg border border-[#444]">
        <h3 className="text-lg font-medium mb-3 text-white">Status Pengamatan</h3>
        <div className="flex space-x-6">
            {/* <div className="flex items-center">
                <input 
                    type="checkbox" 
                    name="active" 
                    id="active"
                    className="w-4 h-4 mr-2 accent-[#1a73e8]" 
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
            <div className="flex items-center">
                <input 
                    type="checkbox" 
                    name="completed" 
                    id="completed"
                    className="w-4 h-4 mr-2 accent-[#1a73e8]" 
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

    {/* Tombol Aksi */}
    <div className="flex space-x-4">
        <button 
            type="button" 
            onClick={() => setIsModalOpen(true)} 
            className="bg-[#1a73e8] hover:bg-[#0d47a1] text-white px-4 py-2 rounded-lg flex items-center"
        >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tambah Jenis
        </button>
        <button 
            type="submit" 
            className="bg-[#1a73e8] hover:bg-[#0d47a1] text-white px-6 py-2 rounded-lg"
        >
            Upload Data
        </button>
    </div>
</form>
                <Modal
                    isOpen={isLocationModalOpen}
                    onClose={() => setIsLocationModalOpen(false)}
                >
                    <LocationPicker 
                        onSave={handleLocationSave} 
                        onClose={() => setIsLocationModalOpen(false)}
                        initialPosition={formData.latitude && formData.longitude ? [parseFloat(formData.latitude), parseFloat(formData.longitude)] : null}
                        initialLocationName={locationName}
                    />
                </Modal>
                {error && <p className="text-red-500 mt-4">{error}</p>}

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
                <p><strong className="text-white">Jumlah Total Spesies:</strong> {birdList.length}</p>
            </div>
            <div>
                <h3 className="text-lg font-semibold mt-4 text-white">Detail Burung:</h3>
                <div className="max-h-40 overflow-y-auto mt-2 pr-2">
                    {birdList.map((bird, index) => (
                        <div key={index} className="mt-2 border-t border-[#444] pt-2">
                            <p><strong className="text-white">Nama:</strong> <span className="text-gray-300">{bird.faunaName}</span></p>
                            <p><strong className="text-white">Jumlah:</strong> <span className="text-gray-300">{bird.count}</span></p>
                            <p><strong className="text-white">Catatan:</strong> <span className="text-gray-300">{bird.notes}</span></p>
                            <p><strong className="text-white">Berbiak:</strong> <span className="text-gray-300">{bird.breeding ? 'Ya' : 'Tidak'}</span></p>
                            {bird.breeding && bird.breeding_type_id && (
                                <p><strong className="text-white">Tipe Breeding:</strong> <span className="text-gray-300">
                                    {bird.breeding_type_id === 1 ? 'Menarik pasangan' :
                                     bird.breeding_type_id === 2 ? 'Kawin' :
                                     bird.breeding_type_id === 3 ? 'Mengumpulkan material sarang' :
                                     bird.breeding_type_id === 4 ? 'Membangun sarang' :
                                     bird.breeding_type_id === 5 ? 'Mengeram' :
                                     bird.breeding_type_id === 6 ? 'Memberi makan anakan' :
                                     bird.breeding_type_id === 7 ? 'Memberi makan induk dalam sarang' :
                                     bird.breeding_type_id === 8 ? 'Memberi makan anakan di luar sarang' : ''}
                                </span></p>
                            )}
                            {bird.breeding && bird.breeding_note && (
                                <p><strong className="text-white">Catatan Breeding:</strong> <span className="text-gray-300">{bird.breeding_note}</span></p>
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
{birdList.length > 0 && (
    <div className="mt-8">
        <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-md border border-[#444]">
            <h2 className="text-xl font-semibold mb-6 text-white">Daftar Burung</h2>
            {/* Desktop View - Tabel */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-[#444]">
                    <thead className="bg-[#2c2c2c]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Media</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Jumlah</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Berbiak</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Catatan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[#1e1e1e] divide-y divide-[#444]">
                        {birdList.map((bird, birdIndex) => (
                            <tr key={birdIndex} className="hover:bg-[#2c2c2c] transition-colors">
                                <td className="px-6 py-4">
{/* Tampilan Media */}
<div className="space-y-4">
    {/* Tampilan Gambar */}
    {bird.images && bird.images.length > 0 && (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bird.images.map((image, imageIndex) => (
                    <div key={imageIndex} className="relative group aspect-square max-w-[300px] w-full mx-auto">
                        <img 
                            src={URL.createObjectURL(image)} 
                            alt="Foto Burung" 
                            className="w-full h-full object-cover rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg" />
                        <button 
                            onClick={() => handleRemoveMediaFromList(birdIndex, 'images', imageIndex)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )}
    
    {/* Tampilan Audio */}
    {bird.sounds && bird.sounds.length > 0 && (
        <div>
            <div className="space-y-3">
                {bird.sounds.map((sound, soundIndex) => (
                    <div key={soundIndex} className="relative group bg-[#2c2c2c] p-3 rounded-lg">
                        <audio 
                            src={URL.createObjectURL(sound)} 
                            controls 
                            className="w-full h-12 rounded shadow-sm focus:outline-none"
                            controlsList="nodownload noplaybackrate"
                        />
                        <button 
                            onClick={() => handleRemoveMediaFromList(birdIndex, 'sounds', soundIndex)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )}
</div>                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-white">{bird.faunaName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-[#1a73e8] bg-opacity-20 text-[#4d94ff]">
                                        {bird.count}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-300">
                                    {bird.breeding ? 
                                        <div>
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-800 text-green-300">
                                                Ya
                                    </span>
                                            {bird.breeding_type_id && (
                                                <div className="mt-1 text-xs">
                                                    <strong>Tipe Breeding:</strong> {
                                                        bird.breeding_type_id === 1 ? 'Menarik pasangan' :
                                                        bird.breeding_type_id === 2 ? 'Kawin' :
                                                        bird.breeding_type_id === 3 ? 'Mengumpulkan material sarang' :
                                                        bird.breeding_type_id === 4 ? 'Membangun sarang' :
                                                        bird.breeding_type_id === 5 ? 'Mengeram' :
                                                        bird.breeding_type_id === 6 ? 'Memberi makan anakan' :
                                                        bird.breeding_type_id === 7 ? 'Memberi makan induk dalam sarang' :
                                                        bird.breeding_type_id === 8 ? 'Memberi makan anakan di luar sarang' : ''
                                                    }
                                                </div>
                                            )}
                                            {bird.breeding_note && (
                                                <div className="mt-1 text-xs">
                                                    <strong>Catatan Breeding:</strong> {bird.breeding_note}
                                                </div>
                                            )}
                                        </div>
                                        : 
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-800 text-gray-300">
                                            Tidak
                                        </span>
                                    }
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-300">
                                    {bird.notes}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <button 
                                            onClick={() => handleEditBird(birdIndex)} 
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8]"
                                        >
                                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteBird(birdIndex)} 
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-800 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        >
                                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Hapus
                                        </button>
                                        <button 
                                            onClick={() => handleFileModalOpen(birdIndex)} 
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8]"
                                        >
                                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Tambah Media
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
                {birdList.map((bird, index) => (
                    <div key={index} className="bg-[#2c2c2c] rounded-lg p-4 space-y-3">
                        {/* Media Grid */}
                        {bird.images && bird.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                                {bird.images.map((image, imgIndex) => (
                                    <div key={imgIndex} className="relative group aspect-square">
                                        <img 
                                            src={URL.createObjectURL(image)} 
                                            alt="Foto Burung" 
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button 
                                            onClick={() => handleRemoveMediaFromList(index, 'images', imgIndex)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Audio Player */}
                        {bird.sounds && bird.sounds.length > 0 && (
                            <div className="space-y-2">
                                {bird.sounds.map((sound, soundIndex) => (
                                    <div key={soundIndex} className="relative group">
                                        <audio 
                                            src={URL.createObjectURL(sound)} 
                                            controls 
                                            className="w-full rounded shadow-sm focus:outline-none"
                                            controlsList="nodownload noplaybackrate"
                                        />
                                        <button 
                                            onClick={() => handleRemoveMediaFromList(index, 'sounds', soundIndex)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Info Burung */}
                        <div className="space-y-2">
                            <div className="font-medium text-sm text-white">
                                {bird.faunaName}
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-300">Jumlah:</span>
                                <span className="px-2 py-1 text-sm font-semibold rounded-full bg-[#1a73e8] bg-opacity-20 text-[#4d94ff]">
                                    {bird.count}
                                </span>
                            </div>
                            {bird.breeding && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-300">Status:</span>
                                    <span className="px-2 py-1 text-sm font-semibold rounded-full bg-green-900 bg-opacity-30 text-green-400">
                                        Berbiak
                                    </span>
                                </div>
                            )}
                            {bird.notes && (
                                <div className="text-sm text-gray-300">
                                    <span className="font-medium">Catatan:</span>
                                    <p className="mt-1">{bird.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Tombol Aksi */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <button 
                                onClick={() => handleEditBird(index)}
                                className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium rounded text-white bg-[#1a73e8] hover:bg-[#0d47a1]"
                            >
                                Edit
                            </button>
                            <button 
                                onClick={() => handleDeleteBird(index)}
                                className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium rounded text-white bg-red-800 hover:bg-red-700"
                            >
                                Hapus
                            </button>
                            <button 
                                onClick={() => handleFileModalOpen(index)}
                                className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium rounded text-white bg-[#1a73e8] hover:bg-[#0d47a1]"
                            >
                                Tambah Media
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
)}
{isFileModalOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
        <div className="bg-[#1e1e1e] p-4 md:p-6 rounded shadow-lg w-full max-w-lg border border-[#444]">
            <h2 className="text-xl font-semibold mb-4 text-white">Tambah Foto/Audio</h2>
            <input 
                type="file" 
                name="media" 
                onChange={handleFileChange} 
                className="border border-[#444] p-2 w-full mb-2 bg-[#2c2c2c] text-white" 
                multiple 
            />
            {/* Preview Media */}
            {formData.images.length > 0 && (
                <div className="mb-4">
                    <h3 className="font-semibold mb-2 text-white">Foto:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {formData.images.map((image, index) => (
                            <div key={index} className="relative group">
                                <img 
                                    src={URL.createObjectURL(image)} 
                                    alt={`Preview ${index}`} 
                                    className="w-full h-20 object-cover rounded"
                                />
                                <button 
                                    onClick={() => handleRemoveMedia('images', index)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {formData.sounds.length > 0 && (
                <div className="mb-4">
                    <h3 className="font-semibold mb-2 text-white">Audio:</h3>
                    <div className="space-y-2">
                        {formData.sounds.map((sound, index) => (
                            <div key={index} className="relative group">
                                <audio 
                                    src={URL.createObjectURL(sound)} 
                                    controls 
                                    className="w-full"
                                />
                                <button 
                                    onClick={() => handleRemoveMedia('sounds', index)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between gap-2">
                <button 
                    onClick={handleFileSave} 
                    className="bg-[#1a73e8] text-white p-2 rounded hover:bg-[#0d47a1]"
                >
                    Simpan
                </button>
                <button 
                    onClick={handleFileModalClose} 
                    className="bg-red-800 text-white p-2 rounded hover:bg-red-700"
                >
                    Batal
                </button>
            </div>
        </div>
    </div>
)}
{isModalOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 px-4 py-6">
        <div className="bg-[#1e1e1e] p-6 rounded shadow-lg w-96 relative border border-[#444] max-h-[90vh] overflow-y-auto">
            {/* Loading indicator di kanan atas modal */}
            {isSearching && (
                <div className="absolute top-2 right-2 z-[700]">
                    <div className="bg-[#2c2c2c] p-2 rounded-lg shadow-md flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#e0e0e0] border-t-transparent"></div>
                        <span className="text-sm text-white">Mencari...</span>
                    </div>
                </div>
            )}
            
            <h2 className="text-xl font-semibold mb-4 text-white">Tambah Jenis Burung</h2>
            <div className="relative"> 
                <input 
                    type="text" 
                    id="fauna_name" 
                    placeholder="Jenis burung" 
                    required 
                    className="border border-[#444] p-2 w-full mb-2 bg-[#2c2c2c] text-white placeholder-gray-400" 
                    value={faunaName} 
                    onChange={(e) => handleFaunaNameChange(e.target.value)} 
                    autoComplete="off" // Tambahkan ini untuk mencegah autocomplete browser
                />
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full bg-[#2c2c2c] border border-[#444] rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((fauna) => (
                            <div
                                key={`${fauna.id}_${fauna.taxa_id || ''}`}
                                className="px-4 py-2 hover:bg-[#1a73e8] hover:bg-opacity-10 cursor-pointer flex flex-col"
                                onClick={() => handleSelectFauna(fauna)}
                            >
                                <div className="flex items-center">
                                    <span className="font-medium text-white">{fauna.nameId}</span>
                                    {fauna.taxon_rank && (
                                        <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 ml-2 rounded-full">
                                            {fauna.taxon_rank.toLowerCase()}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm text-gray-300 italic">{fauna.nameLat}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <input type="hidden" name="fauna_id" id="fauna_id" value={faunaId} />
            {!faunaId && faunaName && editIndex === null && (
                <p className="text-red-400 text-sm mb-2">
                    Silakan pilih nama burung dari daftar yang tersedia
                </p>
            )}
            
            <input 
                type="number" 
                name="count" 
                placeholder="Jumlah individu" 
                required 
                min="1"
                className="border border-[#444] p-2 w-full mb-2 bg-[#2c2c2c] text-white placeholder-gray-400" 
                value={formData.count} 
                onChange={handleInputChange} 
            />
            <input 
                type="text" 
                name="notes" 
                placeholder="Catatan" 
                className="border border-[#444] p-2 w-full mb-2 bg-[#2c2c2c] text-white placeholder-gray-400" 
                value={formData.notes} 
                onChange={handleInputChange} 
            />
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                <input 
                    type="checkbox" 
                    name="breeding" 
                        id="breeding" 
                        checked={formData.breeding || false}
                        onChange={(e) => {
                            setFormData(prev => ({
                                ...prev,
                                breeding: e.target.checked,
                                // Reset breeding_type_id jika tidak checked
                                breeding_type_id: e.target.checked ? prev.breeding_type_id : null
                            }));
                        }}
                        className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                    />
                    <label htmlFor="breeding" className="text-gray-300">Sedang berbiak?</label>
                </div>

                {formData.breeding && (
                    <div className="mt-3 bg-[#2c2c2c] p-3 rounded-lg">
                        <p className="text-sm font-medium text-gray-300 mb-2">Pilih tipe breeding:</p>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="breeding_type_1"
                                    checked={formData.breeding_type_id === 1}
                                    onChange={() => setFormData(prev => ({...prev, breeding_type_id: 1}))}
                                    className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                />
                                <label htmlFor="breeding_type_1" className="text-gray-300">Menarik pasangan</label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="breeding_type_2"
                                    checked={formData.breeding_type_id === 2}
                                    onChange={() => setFormData(prev => ({...prev, breeding_type_id: 2}))}
                                    className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                />
                                <label htmlFor="breeding_type_2" className="text-gray-300">Kawin</label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="breeding_type_3"
                                    checked={formData.breeding_type_id === 3}
                                    onChange={() => setFormData(prev => ({...prev, breeding_type_id: 3}))}
                                    className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                />
                                <label htmlFor="breeding_type_3" className="text-gray-300">Mengumpulkan material sarang</label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="breeding_type_4"
                                    checked={formData.breeding_type_id === 4}
                                    onChange={() => setFormData(prev => ({...prev, breeding_type_id: 4}))}
                                    className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                />
                                <label htmlFor="breeding_type_4" className="text-gray-300">Membangun sarang</label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="breeding_type_5"
                                    checked={formData.breeding_type_id === 5}
                                    onChange={() => setFormData(prev => ({...prev, breeding_type_id: 5}))}
                                    className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                />
                                <label htmlFor="breeding_type_5" className="text-gray-300">Mengeram</label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="breeding_type_6"
                                    checked={formData.breeding_type_id === 6}
                                    onChange={() => setFormData(prev => ({...prev, breeding_type_id: 6}))}
                                    className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                />
                                <label htmlFor="breeding_type_6" className="text-gray-300">Memberi makan anakan</label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="breeding_type_7"
                                    checked={formData.breeding_type_id === 7}
                                    onChange={() => setFormData(prev => ({...prev, breeding_type_id: 7}))}
                                    className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                />
                                <label htmlFor="breeding_type_7" className="text-gray-300">Memberi makan induk dalam sarang</label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="breeding_type_8"
                                    checked={formData.breeding_type_id === 8}
                                    onChange={() => setFormData(prev => ({...prev, breeding_type_id: 8}))}
                                    className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8] accent-[#1a73e8]"
                                />
                                <label htmlFor="breeding_type_8" className="text-gray-300">Memberi makan anakan di luar sarang</label>
                            </div>
                        </div>
                        
                        <div className="mt-3">
                            <label htmlFor="breeding_note" className="block text-sm text-gray-300 mb-1">
                                Catatan Breeding
                            </label>
                            <textarea 
                                id="breeding_note"
                                name="breeding_note"
                                className="w-full border border-[#444] p-2 rounded bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" 
                                rows="2"
                                value={formData.breeding_note || ''}
                    onChange={handleInputChange} 
                                placeholder="Catatan terkait breeding..."
                />
            </div>
                    </div>
                )}
            </div>
            
            <div className="flex justify-between">
                <button 
                    onClick={handleAddBird} 
                    className="bg-[#1a73e8] text-white p-2 rounded hover:bg-[#0d47a1]"
                >
                    Simpan
                </button>
                <button 
                    onClick={() => {
                        setIsModalOpen(false);
                        // Reset form ketika tombol batal diklik
                        setFaunaName('');
                        setFaunaId('');
                        setEditIndex(null);
                        setFormData(prev => ({
                            ...prev,
                            count: '',
                            notes: '',
                            breeding: false,
                            breeding_note: '',
                            breeding_type_id: null,
                            images: [],
                            sounds: []
                        }));
                    }} 
                    className="bg-red-800 text-white p-2 rounded hover:bg-red-700"
                >
                    Batal
                </button>
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
        </div>
    );
}

export default FobiUpload;