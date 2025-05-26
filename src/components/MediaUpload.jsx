import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import LocationPicker from './Observations/LocationPicker';
import Modal from './Observations/LPModal';
import LocationInput from './Observations/LocationInput';
import MediaCard from './MediaCard';
import BulkEditModal from './BulkEditModal';
import Header from './Header';
import { apiFetch } from '../utils/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPencil, faUpload, faObjectGroup, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import exifr from 'exifr';
import { v4 as uuidv4 } from 'uuid';

function MediaUpload() {
    const [observations, setObservations] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [locationName, setLocationName] = useState('');
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        tujuan_pengamatan: 1,
        observer: '',
        scientific_name: '',
        date: '',
        latitude: '',
        longitude: '',
        locationName: '',
        habitat: '',
        description: '',
        type_sound: '',
        kingdom: '',
        phylum: '',
        class: '',
        order: '',
        family: '',
        genus: '',
        species: '',
        common_name: '',
        taxon_rank: ''
    });
    const [bulkFormData, setBulkFormData] = useState(null);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [qualityAssessments, setQualityAssessments] = useState({});
    const [showQualityModal, setShowQualityModal] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadSessionId, setUploadSessionId] = useState(null);
    const [isSelectAll, setIsSelectAll] = useState(false);
    const [combinedObservations, setCombinedObservations] = useState([]);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [showCombineConfirm, setShowCombineConfirm] = useState(false);

    const { user, setUser, updateTotalObservations } = useUser();
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
        const initializeUploadSession = async () => {
            try {
                const response = await apiFetch('/generate-upload-session', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUploadSessionId(data.upload_session_id);
                    localStorage.setItem('currentUploadSession', data.upload_session_id);
                }
            } catch (error) {
                console.error('Error initializing upload session:', error);
                setError('Gagal membuat sesi upload');
            }
        };

        // Cek session yang ada atau buat baru
        const savedSession = localStorage.getItem('currentUploadSession');
        if (savedSession) {
            setUploadSessionId(savedSession);
        } else {
            initializeUploadSession();
        }

        return () => {
            localStorage.removeItem('currentUploadSession');
        };
    }, []);

    const extractExifData = async (file) => {
        try {
            if (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic')) {
                // Gunakan opsi yang lebih spesifik untuk GPS
                const exifData = await exifr.parse(file, {
                    pick: [
                        'DateTimeOriginal',
                        'GPSLatitude',
                        'GPSLongitude',
                        'GPSLatitudeRef',
                        'GPSLongitudeRef',
                        'Make',
                        'Model',
                        'Software'
                    ],
                    gps: true // Aktifkan parsing GPS
                });

                // Validasi data GPS
                const hasValidGPS = exifData?.latitude && exifData?.longitude &&
                                  !isNaN(exifData.latitude) && !isNaN(exifData.longitude);

                let locationName = '';
                if (hasValidGPS) {
                    try {
                        // Gunakan Nominatim untuk reverse geocoding
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${exifData.latitude}&lon=${exifData.longitude}&format=json`,
                            {
                                headers: {
                    'Accept-Language': 'id'
                                }
                            }
                        );
                        const data = await response.json();
        
        // Format location name consistently
        const address = data.address;
        const parts = [];
        
        if (address.city || address.town || address.municipality) {
            parts.push(address.city || address.town || address.municipality);
                    }
        if (address.county || address.regency) {
            parts.push(address.county || address.regency);
                }
        if (address.state) parts.push(address.state);
        if (address.country) parts.push(address.country);

        locationName = parts.join(', ') || 'Lokasi tidak ditemukan';
    } catch (error) {
        console.warn('Error fetching location name:', error);
        locationName = `${exifData.latitude}, ${exifData.longitude}`;
    }
}
                // Validasi tanggal
                let formattedDate = '';
                if (exifData?.DateTimeOriginal) {
                    const date = new Date(exifData.DateTimeOriginal);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toISOString().split('T')[0];
                    }
                }

                return {
                    date: formattedDate,
                    latitude: hasValidGPS ? exifData.latitude : '',
                    longitude: hasValidGPS ? exifData.longitude : '',
                    locationName: locationName,
                    deviceInfo: {
                        make: exifData?.Make || '',
                        model: exifData?.Model || '',
                        software: exifData?.Software || ''
                    }
                };
            }
            return null;
        } catch (error) {
            console.warn('Error extracting EXIF data:', error);
            return null;
        }
    };

    const handleFiles = async (files) => {
        setLoading(true);
        setProgress(0);
        setLoadingMessage('Memproses file...');

        try {
            const newObservations = [];
            let processedFiles = 0;
            const totalFiles = Array.from(files).length;

            // Tambahkan delay kecil untuk memastikan state progress terupdate
            await new Promise(resolve => setTimeout(resolve, 100));

            for (const file of Array.from(files)) {
                // Ekstrak ekstensi file untuk deteksi yang lebih baik
                const fileName = file.name.toLowerCase();
                const fileExt = fileName.split('.').pop();
                
                // Deteksi tipe berdasarkan ekstensi dan MIME type
                const isAudioExt = ['mp3', 'wav', 'aac', 'm4a', 'mpeg', 'mp4'].includes(fileExt);
                const isWhatsAppAudio = 
                    fileName.includes('whatsapp audio') || 
                    fileName.includes('ptt-') || 
                    (fileName.match(/audio.*\d{4}-\d{2}-\d{2}.*\d{2}\.\d{2}\.\d{2}/) && fileExt === 'aac');
                
                const isImage = file.type.startsWith('image/') || fileName.endsWith('.heic');
                const isAudio = file.type.startsWith('audio/') || isAudioExt || isWhatsAppAudio;

                console.log('File type detection:', {
                    name: fileName,
                    ext: fileExt,
                    mime: file.type,
                    isAudio,
                    isImage,
                    isWhatsAppAudio
                });
                
                if (isImage || isAudio) {
                    const exifData = await extractExifData(file);

                    const observation = {
                        id: uuidv4(),
                        file,
                        type: isImage ? 'image' : 'audio',
                        scientific_name: '',
                        date: exifData?.date || '',
                        latitude: exifData?.latitude || '',
                        longitude: exifData?.longitude || '',
                        locationName: exifData?.locationName || '',
                        habitat: '',
                        description: '',
                        type_sound: '',
                        kingdom: '',
                        phylum: '',
                        class: '',
                        order: '',
                        family: '',
                        genus: '',
                        species: '',
                        common_name: '',
                        taxon_rank: '',
                        deviceInfo: exifData?.deviceInfo || {},
                        spectrogramUrl: null
                    };

                    if (isAudio) {
                        const formData = new FormData();
                        formData.append('media', file);

                        try {
                            const response = await apiFetch('/observations/generate-spectrogram', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                                },
                                body: formData
                            });

                            if (response.ok) {
                                const data = await response.json();
                                observation.spectrogramUrl = data.spectrogramUrl;
                            }
                        } catch (error) {
                            console.error('Error generating spectrogram:', error);
                        }
                    }

                    newObservations.push(observation);
                }

                processedFiles++;
                const currentProgress = (processedFiles / totalFiles) * 100;
                setProgress(currentProgress);
                setLoadingMessage(`Memproses file ${processedFiles} dari ${totalFiles}...`);

                // Tambahkan delay kecil antara setiap file
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            setProgress(100);
            setLoadingMessage('Selesai memproses file!');

            setObservations(prev => {
                const updatedObservations = [...prev, ...newObservations];
                const exifCount = newObservations.filter(obs => obs.date || obs.latitude).length;
                if (exifCount > 0) {
                    setTimeout(() => {
                        toast.info(`Berhasil mengekstrak metadata dari ${exifCount} file`, {
                            toastId: 'exif-success',
                        });
                    }, 0);
                }
                return updatedObservations;
            });

        } catch (error) {
            setError('Gagal memproses file');
            console.error(error);
            toast.error('Gagal memproses file', {
                toastId: 'process-error',
            });
        } finally {
            // Tambahkan delay sebelum menutup loading
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
                setLoadingMessage('');
            }, 500);
        }
    };

    const handleLocationSave = async (lat, lng, name) => {
        // Jika nama lokasi tidak diberikan, coba dapatkan dari reverse geocoding
        let locationName = name;
        if (!locationName) {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                    {
                        headers: {
                            'Accept-Language': 'id'
                        }
                    }
                );
                const data = await response.json();
                locationName = data.display_name;
            } catch (error) {
                console.warn('Error fetching location name:', error);
                locationName = `${lat}, ${lng}`;
            }
        }

        setObservations(prev =>
            prev.map(obs =>
                selectedCards.includes(obs.id)
                    ? { ...obs, latitude: lat, longitude: lng, locationName: locationName }
                    : obs
            )
        );
        setLocationName(locationName);
        setIsLocationModalOpen(false);
    };

    const handleBulkEdit = (data) => {
        setBulkFormData(data);
        setObservations(prev =>
            prev.map(obs =>
                selectedCards.includes(obs.id)
                    ? {
                        ...obs,
                        ...data,
                        displayName: data.species || data.scientific_name,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        locationName: data.locationName
                    }
                    : obs
            )
        );
        setIsBulkEditOpen(false);
    };

    const handleCardSelect = (id) => {
        setSelectedCards(prev => {
            const newSelection = prev.includes(id)
                ? prev.filter(cardId => cardId !== id)
                : [...prev, id];

            // Update isSelectAll
            setIsSelectAll(newSelection.length === observations.length);

            // Jika card dipilih dan belum ada bulk form data, set dari card yang dipilih
            if (!prev.includes(id) && newSelection.length === 1) {
                const selectedObs = observations.find(obs => obs.id === id);
                if (selectedObs) {
                    setBulkFormData({
                        scientific_name: selectedObs.scientific_name || '',
                        species: selectedObs.species || '',
                        kingdom: selectedObs.kingdom || '',
                        phylum: selectedObs.phylum || '',
                        class: selectedObs.class || '',
                        order: selectedObs.order || '',
                        family: selectedObs.family || '',
                        genus: selectedObs.genus || '',
                        taxon_rank: selectedObs.taxon_rank || '',
                        displayName: selectedObs.displayName || selectedObs.species || selectedObs.scientific_name || '',
                        habitat: selectedObs.habitat || '',
                        description: selectedObs.description || '',
                        type_sound: selectedObs.type_sound || ''
                    });
                }
            }

            return newSelection;
        });
    };

    const handleObservationUpdate = (id, data) => {
        setObservations(prev =>
            prev.map(obs =>
                obs.id === id ? { ...obs, ...data } : obs
            )
        );
    };

    const handleObservationDelete = (id) => {
        setObservations(prev => prev.filter(obs => obs.id !== id));
        setSelectedCards(prev => prev.filter(cardId => cardId !== id));
    };

    const handleConfirmSubmit = () => {
        setIsConfirmModalOpen(true);
    };

// Fungsi validasi taksonomi
const validateTaxonomy = (observation) => {
    // Cek jika species sudah diisi
    if (observation.species?.trim()) {
        return; // Langsung return jika species sudah diisi
    }

    // Jika scientific_name adalah "Unknown", terima sebagai valid
    if (observation.scientific_name?.trim() === "Unknown") {
        return; // Valid untuk Unknown
    }

    // Jika species kosong, cek tingkat taksa lainnya
    const taxaLevels = ['genus', 'family', 'order', 'class', 'kingdom'];
    const hasAnyTaxa = taxaLevels.some(level => observation[level]?.trim());

    if (!hasAnyTaxa) {
        throw new Error(
            'Taksa tidak tersedia. Silakan gunakan taksa yang lebih tinggi (Genus/Family/Order/Class/Kingdom) atau gunakan "Unknown"'
        );
    }
};

// Fungsi validasi media
const validateMedia = (file) => {
    const maxSize = 150 * 1024 * 1024; // 150MB
    const supportedFormats = {
        audio: ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/aac', 'audio/x-m4a', 'audio/mp4', 'audio/x-aac', 'audio/webm'],
        photo: ['image/jpeg', 'image/png', 'image/jpg', 'image/heic']
    };

    // Validasi ukuran file
    if (file.size > maxSize) {
        throw new Error(`File ${file.name} melebihi batas maksimal 150MB`);
    }

    // Ekstrak ekstensi file
    const fileName = file.name.toLowerCase();
    const fileExt = fileName.split('.').pop();
    
    // Deteksi tipe berdasarkan ekstensi jika MIME type tidak terdeteksi dengan benar
    const isAudioExt = ['mp3', 'wav', 'aac', 'm4a', 'mpeg', 'mp4'].includes(fileExt);
    const isPhotoExt = ['jpg', 'jpeg', 'png', 'heic'].includes(fileExt);
    
    // Deteksi khusus untuk file WhatsApp
    const isWhatsAppAudio = 
        fileName.includes('whatsapp audio') || 
        fileName.includes('ptt-') || 
        (fileName.match(/audio.*\d{4}-\d{2}-\d{2}.*\d{2}\.\d{2}\.\d{2}/) && fileExt === 'aac');
    
    // Deteksi tipe berdasarkan MIME type dan nama file
    const isAudio = file.type.startsWith('audio/') || isAudioExt || isWhatsAppAudio;
    const isPhoto = file.type.startsWith('image/') || isPhotoExt;
    
    // Penanganan khusus untuk file HEIC
    const isHeic = fileName.endsWith('.heic') || file.type === 'image/heic';
    
    // Penanganan khusus untuk file AAC
    const isAac = fileName.endsWith('.aac') || file.type === 'audio/aac' || file.type === 'audio/x-aac' || isWhatsAppAudio;
    
    // Log untuk debugging
    console.log('File validation:', {
        name: file.name,
        type: file.type,
        extension: fileExt,
        isAudio,
        isPhoto,
        isHeic,
        isAac,
        isWhatsAppAudio
    });
    
    // Jika file adalah WhatsApp Audio, selalu izinkan
    if (isWhatsAppAudio) {
        return; // File WhatsApp Audio valid
    }
    
    if (!isAudio && !isPhoto && !isHeic && !isAac) {
        throw new Error(`Format file ${file.name} tidak didukung. Hanya file foto dan audio yang diperbolehkan`);
    }
    
    // Izinkan file berdasarkan ekstensi, meskipun MIME type mungkin tidak terdeteksi
    if (isAudioExt || isPhotoExt || isHeic || isAac) {
        return; // File valid berdasarkan ekstensi
    }
    
    // Jika kita sampai di sini, cek berdasarkan MIME type
    const validFormats = isAudio ? supportedFormats.audio : supportedFormats.photo;
    
    if (!validFormats.includes(file.type)) {
        let formatInfo = '';
        if (isAudio || isAudioExt) {
            formatInfo = 'MP3/WAV/AAC/M4A';
        } else {
            formatInfo = 'JPG/PNG/HEIC';
        }
        
        throw new Error(
            `Format file ${file.name} tidak didukung. Gunakan ${formatInfo}`
        );
    }
    
    // Validasi keamanan: Periksa ekstensi file yang berbahaya
    const dangerousExtensions = ['.sh', '.exe', '.cmd', '.bat', '.php', '.js', '.pl', '.py', '.rb'];
    
    if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
        throw new Error(`File ${file.name} tidak diperbolehkan karena alasan keamanan`);
    }
};

// Fungsi validasi data umum
const validateGeneralData = (observation) => {
    if (!observation.latitude || !observation.longitude) {
        throw new Error('Lokasi observasi harus ditentukan');
    }

    if (!observation.date) {
        throw new Error('Tanggal observasi harus diisi');
    }
};


    const handleSubmit = async () => {
        setLoading(true);
        setLoadingMessage('Mengunggah observasi...');

        try {
            for (const observation of observations) {
                // Validasi dasar sebelum upload
                // Jika scientific_name adalah "Unknown", skip validasi taksa lain
                if (observation.scientific_name?.trim() !== "Unknown" && 
                    !observation.species?.trim() && 
                    !observation.genus?.trim() && 
                    !observation.family?.trim() && 
                    !observation.order?.trim() && 
                    !observation.class?.trim() &&
                    !observation.kingdom?.trim()) {
                    throw new Error('Mohon isi minimal satu tingkat taksa atau gunakan "Unknown"');
                }

                // Validasi media
                if (observation.isCombined) {
                    observation.files.forEach(file => {
                        validateMedia(file);
                    });
                } else {
                    validateMedia(observation.file);
                }

                // Validasi data wajib
                if (!observation.date) {
                    throw new Error('Tanggal observasi harus diisi');
                }
                if (!observation.latitude || !observation.longitude) {
                    throw new Error('Lokasi observasi harus ditentukan');
                }
                if (observation.type === 'audio' && !observation.type_sound?.trim()) {
                    throw new Error('Tipe suara harus diisi untuk rekaman audio');
                }

                const formData = new FormData();

                // Tambahkan data dasar
                formData.append('upload_session_id', uploadSessionId);

                // Handle file tunggal atau kombinasi
                if (observation.isCombined) {
                    // Untuk observasi yang digabungkan
                    observation.files.forEach((file, index) => {
                        formData.append('media[]', file);
                    });
                    formData.append('is_combined', 'true');

                    // Tambahkan informasi tipe untuk setiap file
                    const mediaTypes = observation.files.map(file => {
                        return file.type.startsWith('audio/') ? 'audio' : 'photo';
                    });
                    formData.append('media_types', JSON.stringify(mediaTypes));

                    // Tambahkan spectrogram URLs jika ada
                    if (observation.spectrogramUrls && observation.spectrogramUrls.length > 0) {
                        formData.append('spectrogram_urls', JSON.stringify(observation.spectrogramUrls));
                    }
                } else {
                    // Untuk observasi tunggal
                    formData.append('media', observation.file);
                    formData.append('is_combined', 'false');
                    formData.append('type', observation.type === 'audio' ? 'audio' : 'photo');
                    if (observation.type === 'audio' && observation.spectrogramUrl) {
                        formData.append('spectrogram_url', observation.spectrogramUrl);
                    }
                }

                // Tambahkan data EXIF
                if (observation.date) formData.append('date', observation.date);
                if (observation.latitude && observation.longitude) {
                    formData.append('latitude', observation.latitude);
                    formData.append('longitude', observation.longitude);
                }
                if (observation.deviceInfo) {
                    formData.append('device_info', JSON.stringify(observation.deviceInfo));
                }

                // Tambahkan data taksonomi dan deskriptif
                formData.append('scientific_name', observation.scientific_name || '');
                formData.append('class', observation.class || '');
                formData.append('order', observation.order || '');
                formData.append('family', observation.family || '');
                formData.append('genus', observation.genus || '');
                formData.append('species', observation.species || '');
                formData.append('description', observation.description || '');
                formData.append('habitat', observation.habitat || '');
                formData.append('type_sound', observation.type_sound || '');
                formData.append('locationName', observation.locationName || '');

                // Log untuk debugging
                console.log('Submitting observation:', {
                    isCombined: observation.isCombined,
                    filesCount: observation.isCombined ? observation.files.length : 1,
                    type: observation.type,
                    scientific_name: observation.scientific_name,
                    hasSpectrogram: !!observation.spectrogramUrl || observation.spectrogramUrls?.length > 0
                });

                const response = await apiFetch('/observations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    // Log error untuk debugging
                    console.error('Error response:', errorData);

                    // Jika ada species yang diisi tapi tidak valid
                    if (observation.species?.trim() && 
                        (errorData.error?.toLowerCase().includes('taxa') || 
                         errorData.error?.toLowerCase().includes('taksa') ||
                         errorData.message?.toLowerCase().includes('taxa') ||
                         errorData.message?.toLowerCase().includes('taksa'))) {
                        throw new Error(
                            'Taksa tidak tersedia. Silakan gunakan taksa yang lebih tinggi (Genus/Family/Order/Class)'
                        );
                    }
                    
                    // Throw error message dari backend
                    throw new Error(errorData.error || errorData.message || 'Terjadi kesalahan saat menyimpan data');
                }

                const responseData = await response.json();
                console.log('Upload success:', responseData);
            }

            toast.success('Berhasil mengunggah semua observasi');
            setShowSuccessPopup(true);

            // Update total observasi
            if (user && user.id) {
                await updateTotalObservations();
            }

        } catch (error) {
            // Log error untuk debugging
            console.error('Caught error:', error);
        
            // Tampilkan pesan error yang sesuai
            toast.error(error.message, {
                position: "top-right",
                autoClose: false,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: "colored",
                onClick: () => toast.dismiss(),
                style: {
                    backgroundColor: '#EF4444',
                    fontSize: '14px',
                }
            });
            
            // Hentikan proses upload jika terjadi error
            throw error;
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }        
    };
    const fetchTaxonomyInfo = async (scientificName) => {
        try {
            setIsLoading(true);
            const response = await apiFetch(`/taxonomy?scientific_name=${encodeURIComponent(scientificName)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Gagal mendapatkan informasi taksonomi');
            }

            const data = await response.json();

            if (data.success) {
                setFormData(prev => ({
                    ...prev,
                    ...data.data
                }));
            }
        } catch (error) {
            console.error('Error fetching taxonomy:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const QualityAssessmentModal = ({ isOpen, onClose, assessments }) => {
        if (!isOpen) return null;

        const getGradeColor = (grade) => {
            switch (grade.toLowerCase()) {
                case 'research grade':
                    return 'bg-green-900 text-green-300';
                case 'needs id':
                    return 'bg-yellow-900 text-yellow-300';
                default:
                    return 'bg-[#2c2c2c] text-gray-300';
            }
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
                <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-[#444]">
                    <h2 className="text-xl font-semibold mb-4 text-white">Hasil Penilaian Kualitas</h2>

                    {Object.entries(assessments).map(([obsId, assessment]) => (
                        <div key={obsId} className="mb-4 p-4 border border-[#444] rounded bg-[#2c2c2c]">
                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${getGradeColor(assessment.grade)}`}>
                                {assessment.grade}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center">
                                    <span className={assessment.has_date ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.has_date ? '✓' : '✗'} Tanggal
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.has_location ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.has_location ? '✓' : '✗'} Lokasi
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.has_media ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.has_media ? '✓' : '✗'} Media
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.is_wild ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.is_wild ? '✓' : '✗'} Liar
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.location_accurate ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.location_accurate ? '✓' : '✗'} Lokasi Akurat
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.recent_evidence ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.recent_evidence ? '✓' : '✗'} Bukti Terbaru
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={onClose}
                            className="bg-[#1a73e8] text-white px-4 py-2 rounded hover:bg-[#1565c0] transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const handleSelectAll = () => {
        if (isSelectAll) {
            setSelectedCards([]);
        } else {
            setSelectedCards(observations.map(obs => obs.id));
        }
        setIsSelectAll(!isSelectAll);
    };

    const handleDeleteAll = () => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedCards.length} item yang dipilih?`)) {
            setObservations(prev => prev.filter(obs => !selectedCards.includes(obs.id)));
            setSelectedCards([]);
            setIsSelectAll(false);
        }
    };

    const handleCombine = () => {
        if (selectedCards.length < 2) {
            toast.error('Pilih minimal 2 observasi untuk digabungkan');
            return;
        }
        // Tampilkan modal konfirmasi
        setShowCombineConfirm(true);
    };

    const executeCombine = () => {
        // Ambil observasi yang dipilih
        const selectedObs = observations.filter(obs => selectedCards.includes(obs.id));

        // Cek tipe file dengan lebih akurat
        const checkFileType = (obs) => {
            // Cek ekstensi file
            const fileName = obs.file.name.toLowerCase();
            const fileExt = fileName.split('.').pop();
            const isAudioExt = ['mp3', 'wav', 'aac', 'm4a', 'mpeg', 'mp4'].includes(fileExt);
            const isWhatsAppAudio = 
                fileName.includes('whatsapp audio') || 
                fileName.includes('ptt-') || 
                (fileName.match(/audio.*\d{4}-\d{2}-\d{2}.*\d{2}\.\d{2}\.\d{2}/) && fileExt === 'aac');
            
            // Gabungan pengecekan MIME type dan ekstensi
            return (obs.type === 'audio' || isAudioExt || isWhatsAppAudio) ? 'audio' : 'image';
        };

        // Hitung jumlah audio dan gambar dengan lebih akurat
        const audioCount = selectedObs.filter(obs => checkFileType(obs) === 'audio').length;
        const imageCount = selectedObs.filter(obs => checkFileType(obs) === 'image').length;

        // Validasi kombinasi yang diizinkan
        if (audioCount === 0 && imageCount === 0) {
            toast.error('Tidak ada media yang valid untuk digabungkan');
            return;
        }

        // Gunakan data dari observasi pertama
        const firstObs = selectedObs[0];
        const combinedObs = {
            ...firstObs,
            id: uuidv4(),
            files: [], // Akan diisi dengan file-file yang digabung
            isCombined: true,
            combinedOrder: selectedObs.map((_, index) => index),
            type: 'mixed', // Tipe baru untuk kombinasi audio dan gambar
            audioFiles: [], // Khusus untuk file audio
            imageFiles: [], // Khusus untuk file gambar
            spectrogramUrls: [] // Untuk spectrogram dari file audio
        };

        // Pisahkan file berdasarkan tipenya dengan pengecekan yang lebih akurat
        selectedObs.forEach(obs => {
            const fileType = checkFileType(obs);
            
            if (fileType === 'audio') {
                combinedObs.audioFiles.push(obs.file);
                if (obs.spectrogramUrl) {
                    combinedObs.spectrogramUrls.push(obs.spectrogramUrl);
                }
            } else if (fileType === 'image') {
                combinedObs.imageFiles.push(obs.file);
            }
        });

        // Gabungkan semua file ke array files untuk kompatibilitas
        combinedObs.files = [...combinedObs.audioFiles, ...combinedObs.imageFiles];

        // Hapus observasi yang digabungkan
        setObservations(prev => prev.filter(obs => !selectedCards.includes(obs.id)));

        // Tambahkan observasi gabungan
        setObservations(prev => [...prev, combinedObs]);

        setSelectedCards([]);
        setIsSelectAll(false);
        setShowCombineConfirm(false);

        toast.success(
            `Berhasil menggabungkan ${audioCount} audio dan ${imageCount} gambar`,
            {
                position: "top-right",
                autoClose: 3000,
                theme: "colored"
            }
        );
    };

    useEffect(() => {
        if (error) {
            toast.error(error, {
                position: "top-right",
                autoClose: false, // Menghilangkan timeout
                hideProgressBar: true, // Menghilangkan progress bar
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: "colored",
                onClick: () => toast.dismiss(), // Close ketika klik di area manapun
                style: {
                    backgroundColor: '#EF4444',
                    fontSize: '14px',
                }
            });
        }
    }, [error]);
    
    const SuccessPopup = () => (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-sm w-full mx-4 border border-[#444]">
                <div className="text-center">
                    <div className="mb-4">
                        <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="text-green-500 text-4xl"
                        />
                    </div>
                    <h3 className="text-lg font-medium mb-4 text-white">Data Berhasil Diunggah!</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                setShowSuccessPopup(false);
                                window.location.reload();
                            }}
                            className="w-full py-2 px-4 bg-[#17a34a] text-white rounded-lg hover:bg-[#158540] transition-colors"
                        >
                            Upload Lagi
                        </button>
                        <button
                            onClick={() => {
                                if (user && user.id) {
                                    window.location.href = `/profile/${user.id}/observasi`;
                                }
                            }}
                            className="w-full py-2 px-4 border border-[#17a34a] text-[#17a34a] rounded-lg hover:bg-[#17a34a] hover:text-white transition-colors"
                        >
                            Lihat Observasi Saya
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
            <Header userData={{
                uname: localStorage.getItem('username'),
                totalObservations: localStorage.getItem('totalObservations')
            }} />

            <div className="container mx-auto px-4 py-0 mt-2">
                {/* File Drop Zone */}
                <div
                    className="border-2 border-dashed border-[#444] rounded-lg mb-6 mt-20 bg-[#1e1e1e] relative overflow-hidden transition-all duration-300 hover:border-[#1a73e8]"
                    onDrop={(e) => {
                        e.preventDefault();
                        handleFiles(e.dataTransfer.files);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-[#1a73e8]');
                        e.currentTarget.classList.add('bg-[#1a365d]');
                        e.currentTarget.classList.add('bg-opacity-10');
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-[#1a73e8]');
                        e.currentTarget.classList.remove('bg-[#1a365d]');
                        e.currentTarget.classList.remove('bg-opacity-10');
                    }}
                >
                    <div className="p-8 md:p-20 lg:p-32 text-center flex flex-col items-center justify-center">
                        <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/jpg,image/heic,.heic,audio/mp3,audio/wav,audio/mpeg,audio/aac,audio/x-m4a,audio/mp4,.mp3,.wav,.aac,.m4a,.mp4"
                            onChange={(e) => handleFiles(e.target.files)}
                            className="hidden"
                            id="fileInput"
                        />
                        <svg className="w-16 h-16 mb-4 text-[#1a73e8] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <label
                            htmlFor="fileInput"
                            className="cursor-pointer text-[#1a73e8] text-lg mb-2 hover:text-[#4285f4] transition-colors font-medium"
                        >
                            Klik untuk memilih file
                        </label>
                        <p className="text-gray-400 text-sm">atau seret file ke sini</p>
                        <p className="mt-4 text-xs text-gray-500 max-w-md mx-auto">
                            Format yang didukung: JPG, PNG, HEIC (foto) dan MP3, WAV, AAC, M4A (audio)
                        </p>
                    </div>
                </div>

                {/* Bulk Actions Floating Buttons */}
                {observations.length > 0 && (
                    <div className="fixed bottom-4 left-4 md:bottom-6 md:left-6 flex flex-col gap-2" style={{ zIndex: 49 }}>
                        {/* Select All Button */}
                        <div className="group relative">
                            <button
                                onClick={handleSelectAll}
                                className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 bg-[#4287f5] text-white rounded-full shadow-lg hover:bg-[#3a76d6] transition-colors flex items-center justify-center"
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelectAll}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-[#1a73e8] rounded border-[#444] focus:ring-[#1a73e8] bg-[#2c2c2c] md:mr-2"
                                />
                                <span className="hidden md:inline text-sm text-gray-300">
                                    Pilih Semua ({observations.length})
                                </span>
                            </button>
                            <div className="invisible group-hover:visible absolute left-12 top-1/2 -translate-y-1/2 w-48 bg-[#2c2c2c] text-white text-xs rounded p-2 z-50 border border-[#444] md:hidden">
                                Pilih semua observasi
                            </div>
                        </div>

                        {/* Edit Button */}
                        {selectedCards.length > 0 && (
                            <div className="group relative">
                                <button
                                    onClick={() => setIsBulkEditOpen(true)}
                                    className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 bg-[#673ab7] text-white rounded-full shadow-lg hover:bg-[#5e35b1] transition-colors flex items-center justify-center"
                                >
                                    <FontAwesomeIcon icon={faPencil} className="md:mr-2" />
                                    <span className="hidden md:inline text-sm">
                                        Edit ({selectedCards.length})
                                    </span>
                                </button>
                                <div className="invisible group-hover:visible absolute left-12 top-1/2 -translate-y-1/2 w-48 bg-[#2c2c2c] text-white text-xs rounded p-2 z-50 border border-[#444] md:hidden">
                                    Edit {selectedCards.length} item sekaligus
                                </div>
                            </div>
                        )}

                        {/* Delete Button */}
                        {selectedCards.length > 0 && (
                            <div className="group relative">
                                <button
                                    onClick={handleDeleteAll}
                                    className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 bg-[#d13434] text-white rounded-full shadow-lg hover:bg-[#b02a2a] transition-colors flex items-center justify-center"
                                >
                                    <FontAwesomeIcon icon={faTrash} className="md:mr-2" />
                                    <span className="hidden md:inline text-sm">
                                        Hapus ({selectedCards.length})
                                    </span>
                                </button>
                                <div className="invisible group-hover:visible absolute left-12 top-1/2 -translate-y-1/2 w-48 bg-[#2c2c2c] text-white text-xs rounded p-2 z-50 border border-[#444] md:hidden">
                                    Hapus {selectedCards.length} item
                                </div>
                            </div>
                        )}

                        {/* Combine Button */}
                        {selectedCards.length >= 2 && (
                            <div className="group relative">
                                <button
                                    onClick={handleCombine}
                                    className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 bg-[#1a73e8] text-white rounded-full shadow-lg hover:bg-[#1565c0] transition-colors flex items-center justify-center"
                                >
                                    <FontAwesomeIcon icon={faObjectGroup} className="md:mr-2" />
                                    <span className="hidden md:inline text-sm">
                                        Gabung ({selectedCards.length})
                                    </span>
                                </button>
                                <div className="invisible group-hover:visible absolute left-12 top-1/2 -translate-y-1/2 w-48 bg-[#2c2c2c] text-white text-xs rounded p-2 z-50 border border-[#444] md:hidden">
                                    Gabung {selectedCards.length} item
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Media Cards Grid - responsive updates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {observations.map(obs => (
                        <MediaCard
                            key={obs.id}
                            observation={obs}
                            isSelected={selectedCards.includes(obs.id)}
                            onSelect={() => handleCardSelect(obs.id)}
                            onUpdate={(data) => handleObservationUpdate(obs.id, data)}
                            onDelete={() => handleObservationDelete(obs.id)}
                            bulkFormData={bulkFormData}
                            uploadProgress={uploadProgress[obs.id] || 0}
                            uploadSessionId={uploadSessionId}
                        />
                    ))}
                </div>

                {/* Upload Button - mobile friendly updates */}
                {observations.length > 0 && (
                    <button
                        onClick={handleConfirmSubmit}
                        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 inline-flex items-center justify-center space-x-2 px-4 py-3 md:px-6 md:py-3 bg-[#17a34a] text-white rounded-full shadow-lg hover:bg-[#158540] transition-colors"
                        style={{ zIndex: 49 }} // Ensure it's below modals but above content
                    >
                        <FontAwesomeIcon icon={faUpload} />
                        <span className="hidden md:inline">Upload {observations.length} Observasi</span>
                        <span className="md:hidden">Upload {observations.length}</span>
                    </button>
                )}

                {/* Info Panel - mobile friendly updates */}
                <div className="bg-[#1a365d] bg-opacity-30 p-3 md:p-4 rounded-lg mb-4 border border-[#2c5282] text-sm md:text-base">
                    <h3 className="font-medium text-blue-300 mb-2">Panduan Penggunaan:</h3>
                    <ul className="list-disc list-inside text-xs md:text-sm text-blue-200 space-y-1">
                        <li>Seret atau pilih file foto/audio untuk diunggah</li>
                        <li>Pilih satu atau beberapa file untuk mengedit data sekaligus</li>
                        <li>Pastikan mengisi nama spesies dengan benar (contoh: Gallus gallus)</li>
                        <li>Untuk file audio, pilih tipe suara yang sesuai</li>
                        <li>Lokasi dapat diatur untuk satu atau beberapa file sekaligus</li>
                    </ul>
                </div>

                {/* Modals */}
                <Modal
                    isOpen={isLocationModalOpen}
                    onClose={() => setIsLocationModalOpen(false)}
                    className="bg-[#1e1e1e] text-white border border-[#444] shadow-xl"
                >
                    <LocationPicker
                        onSave={handleLocationSave}
                        onClose={() => setIsLocationModalOpen(false)}
                    />
                </Modal>

                <BulkEditModal
                    isOpen={isBulkEditOpen}
                    onClose={() => setIsBulkEditOpen(false)}
                    onSave={handleBulkEdit}
                    selectedItems={selectedCards.map(id => observations.find(obs => obs.id === id))}
                />

                {/* Confirm Modal */}
                {isConfirmModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-md w-full mx-4 border border-[#444]">
                            <h2 className="text-xl font-semibold mb-4 text-white">Konfirmasi Upload</h2>
                            <p className="text-gray-300 mb-6">
                                Apakah Anda yakin ingin mengupload {observations.length} observasi ini?
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setIsConfirmModalOpen(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-white border border-[#444] rounded transition-colors hover:bg-[#2c2c2c]"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-[#17a34a] text-white rounded-lg hover:bg-[#158540] transition-colors"
                                >
                                    Ya, Upload
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-[#1e1e1e] p-6 rounded-lg text-center border border-[#444]">
                            <div className="mb-4 text-lg font-medium text-white">{loadingMessage}</div>
                            <div className="w-80 h-3 bg-[#2c2c2c] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#1a73e8] rounded-full transition-all duration-300 ease-out"
                                    style={{
                                        width: `${progress}%`,
                                        transition: 'width 0.3s ease-out'
                                    }}
                                />
                            </div>
                            <div className="mt-2 text-sm text-gray-300">
                                {Math.round(progress)}%
                            </div>
                        </div>
                    </div>
                )}

                {/* Quality Assessment Modal */}
                <QualityAssessmentModal
                    isOpen={showQualityModal}
                    onClose={() => {
                        setShowQualityModal(false);
                        // Reset form setelah menutup modal
                        setObservations([]);
                        setSelectedCards([]);
                        setFormData({
                            tujuan_pengamatan: 1,
                            observer: '',
                            scientific_name: '',
                            date: '',
                            latitude: '',
                            longitude: '',
                            locationName: '',
                            habitat: '',
                            description: '',
                            type_sound: '',
                            kingdom: '',
                            phylum: '',
                            class: '',
                            order: '',
                            family: '',
                            genus: '',
                            species: '',
                            common_name: '',
                            taxon_rank: ''
                        });
                    }}
                    assessments={qualityAssessments}
                />

                {/* Tambahkan ToastContainer */}
                <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    limit={3}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="colored"
                />

                {showSuccessPopup && <SuccessPopup />}

                {/* Combine Confirmation Modal */}
                {showCombineConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-md w-full mx-4 border border-[#444]">
                            <div className="text-center mb-6">
                                <FontAwesomeIcon 
                                    icon={faObjectGroup} 
                                    className="text-[#1a73e8] text-4xl mb-4"
                                />
                                <h3 className="text-lg font-medium text-white mb-2">
                                    Konfirmasi Penggabungan Media
                                </h3>
                                <p className="text-gray-300 text-sm mb-2">
                                    Anda akan menggabungkan {selectedCards.length} media menjadi satu observasi.
                                </p>
                                <div className="bg-[#2c2c2c] p-4 rounded-lg mb-4">
                                    <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ Peringatan</p>
                                    <p className="text-gray-400 text-sm">
                                        Setelah media digabungkan, Anda tidak dapat memisahkannya kembali. 
                                        Jika ingin memisahkan, Anda harus menghapus observasi gabungan dan mengunggah ulang medianya secara terpisah.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowCombineConfirm(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-white border border-[#444] rounded transition-colors hover:bg-[#2c2c2c]"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={executeCombine}
                                    className="px-4 py-2 bg-[#1a73e8] text-white rounded hover:bg-[#1565c0] transition-colors"
                                >
                                    Gabungkan
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MediaUpload;
