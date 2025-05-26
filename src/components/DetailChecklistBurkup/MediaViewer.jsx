import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { apiFetch } from '../../utils/api';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import MediaRating from './MediaRating';
import MediaComments from './MediaComments';

function MediaViewer({ checklistData, images = [], sounds = [], onRatingUpdate }) {
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [allSpeciesImages, setAllSpeciesImages] = useState([]);
    const [locationName, setLocationName] = useState('');
    const [activeTab, setActiveTab] = useState('image'); // 'image', 'rating', 'comments'
    const [source, setSource] = useState('');
    const [showComments, setShowComments] = useState(false);
    
    // Rating states
    const [rating, setRating] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    
    // Comments states
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    
    // Table comment states
    const [tableCommentForm, setTableCommentForm] = useState({
        faunaId: null, // ID fauna yang sedang menampilkan form
        comment: "", // Isi komentar
        isSubmitting: false // Status pengiriman
    });

    // Determine source based on checklist ID
    useEffect(() => {
        if (checklistData?.checklist?.id) {
            const id = checklistData.checklist.id.toString();
            if (id.startsWith('BN') || id.startsWith('BNAPP')) {
                setSource('burungnesia');
            } else if (id.startsWith('KP') || id.startsWith('KPAPP')) {
                setSource('kupunesia');
            }
        }
    }, [checklistData]);

    // Memoize groupedMedia untuk mencegah re-render yang tidak perlu
    const groupedMedia = React.useMemo(() => {
        return (checklistData?.fauna || []).reduce((acc, fauna) => {
            acc[fauna.id] = {
                fauna,
                images: images.filter(img => img.fauna_id === fauna.id),
                sounds: sounds.filter(sound => sound.fauna_id === fauna.id)
            };
            return acc;
        }, {});
    }, [checklistData?.fauna, images, sounds]);

    // Set allSpeciesImages hanya ketika groupedMedia berubah
    useEffect(() => {
        const allImages = Object.values(groupedMedia).reduce((acc, { fauna, images }) => {
            return [...acc, ...images.map(img => ({ ...img, fauna }))];
        }, []);
        setAllSpeciesImages(allImages);
    }, [groupedMedia]);

    // Fungsi untuk mendapatkan nama lokasi dari koordinat
    const getLocationName = React.useCallback(async (lat, lon) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'id'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const address = data.address;
                const relevantParts = [
                    address.village,
                    address.suburb,
                    address.city_district,
                    address.city,
                    address.state
                ].filter(Boolean);

                return relevantParts.join(', ');
            }
            throw new Error('Failed to fetch location');
        } catch (error) {
            console.error('Error fetching location name:', error);
            return 'Lokasi tidak tersedia';
        }
    }, []); // Empty dependency array karena fungsi tidak bergantung pada props atau state

    // Effect untuk mendapatkan nama lokasi
    useEffect(() => {
        const latitude = checklistData?.checklist?.latitude;
        const longitude = checklistData?.checklist?.longitude;

        if (!latitude || !longitude) return;

        let isMounted = true;

        const fetchLocation = async () => {
            const name = await getLocationName(latitude, longitude);
            if (isMounted) {
                setLocationName(name);
            }
        };

        fetchLocation();

        return () => {
            isMounted = false;
        };
    }, [checklistData?.checklist?.id, getLocationName]); // Menggunakan ID sebagai dependency
    
    // Effect untuk memuat rating dari localStorage ketika image modal ditampilkan
    useEffect(() => {
        if (selectedImage) {
            // Periksa localStorage untuk rating yang disimpan
            const storedRating = localStorage.getItem(`media_rating_${selectedImage.id}`);
            if (storedRating) {
                const parsedRating = parseInt(storedRating);
                if (!isNaN(parsedRating)) {
                    setUserRating(parsedRating);
                }
            } else {
                // Reset userRating jika tidak ada rating tersimpan
                setUserRating(0);
            }
        }
    }, [selectedImage]);

    // Effect untuk fetch rating dan comments ketika selectedImage berubah
    useEffect(() => {
        if (selectedImage && source && showImageModal) {
            fetchImageRating(selectedImage.id);
            fetchImageComments(selectedImage.id);
        }
    }, [selectedImage, source, showImageModal]);

    const fetchImageRating = async (imageId) => {
        try {
            // Cek dulu apakah ada nilai di localStorage
            const storedRating = localStorage.getItem(`media_rating_${imageId}`);
            if (storedRating) {
                const parsedRating = parseInt(storedRating);
                if (!isNaN(parsedRating)) {
                    setUserRating(parsedRating);
                }
            } else {
                // Reset userRating jika tidak ada di localStorage
                setUserRating(0);
            }
            
            const response = await apiFetch(`/media/${imageId}/rating?source=${source}`);
            const data = await response.json();
            
            if (data.success) {
                // Pastikan rating adalah angka
                const avgRating = data.data.average_rating || 0;
                const numericRating = typeof avgRating === 'number' ? avgRating : parseFloat(avgRating) || 0;
                
                setRating(numericRating);
                setTotalRatings(data.data.total_ratings || 0);
                
                // Jika tidak ada nilai di localStorage, gunakan nilai dari server
                if (!storedRating) {
                    if (data.data.user_rating) {
                        setUserRating(data.data.user_rating);
                        localStorage.setItem(`media_rating_${imageId}`, data.data.user_rating.toString());
                    } else {
                        // Reset user rating jika tidak ada rating dari server
                        setUserRating(0);
                        localStorage.removeItem(`media_rating_${imageId}`);
                    }
                }
                
                // Update selectedImage juga
                if (selectedImage && selectedImage.id === imageId) {
                    selectedImage.userRating = storedRating ? parseInt(storedRating) : (data.data.user_rating || 0);
                }
                
                // Perbarui allSpeciesImages
                setAllSpeciesImages(prev => 
                    prev.map(img => 
                        img.id === imageId 
                            ? { 
                                ...img, 
                                userRating: storedRating ? parseInt(storedRating) : (data.data.user_rating || 0) 
                              } 
                            : img
                    )
                );
            }
        } catch (error) {
            console.error('Error fetching ratings:', error);
        }
    };

    const fetchImageComments = async (imageId) => {
        try {
            setIsLoadingComments(true);
            const response = await apiFetch(`/media/${imageId}/comments?source=${source}`);
            const data = await response.json();
            
            if (data.success) {
                setComments(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const handleImageClick = (image, faunaImages) => {
        const globalIndex = allSpeciesImages.findIndex(img => img.id === image.id);
        setSelectedImage(allSpeciesImages[globalIndex]);
        setCurrentImageIndex(globalIndex);
        setShowImageModal(true);
        setComments([]);
        setShowComments(false);
    };

    const handlePrevImage = (e) => {
        e.stopPropagation();
        if (currentImageIndex > 0) {
            setCurrentImageIndex(prev => prev - 1);
            setSelectedImage(allSpeciesImages[currentImageIndex - 1]);
            setComments([]);
            setShowComments(false);
        }
    };

    const handleNextImage = (e) => {
        e.stopPropagation();
        if (currentImageIndex < allSpeciesImages.length - 1) {
            setCurrentImageIndex(prev => prev + 1);
            setSelectedImage(allSpeciesImages[currentImageIndex + 1]);
            setComments([]);
            setShowComments(false);
        }
    };

    // Tambahkan useEffect untuk memperbarui allSpeciesImages ketika rating berubah
    useEffect(() => {
        if (selectedImage && userRating !== undefined) {
            // Update the allSpeciesImages array with the new rating
            setAllSpeciesImages(prev => {
                // Check if we need to update (avoid unnecessary updates)
                const imageToUpdate = prev.find(img => img.id === selectedImage.id);
                if (imageToUpdate && imageToUpdate.userRating === userRating) {
                    return prev; // No change needed
                }
                
                // Update is needed
                return prev.map(img => 
                    img.id === selectedImage.id 
                        ? { ...img, userRating: userRating } 
                        : img
                );
            });
        }
    }, [userRating, selectedImage?.id]); // Use selectedImage.id instead of selectedImage object

    // Effect untuk memeriksa rating dari localStorage sekali saat komponen dimuat
    useEffect(() => {
        // Fungsi untuk memeriksa rating dari localStorage untuk semua gambar
        const checkStoredRatings = () => {
            const updatedImages = [...images];
            let hasUpdates = false;
            
            // Periksa jika ada rating di localStorage
            for (let i = 0; i < updatedImages.length; i++) {
                const image = updatedImages[i];
                const storedRating = localStorage.getItem(`media_rating_${image.id}`);
                if (storedRating) {
                    const parsedRating = parseInt(storedRating);
                    if (!isNaN(parsedRating) && image.userRating !== parsedRating) {
                        image.userRating = parsedRating;
                        hasUpdates = true;
                    }
                }
            }
            
            // Jika ada perubahan, panggil onRatingUpdate
            if (hasUpdates && typeof onRatingUpdate === 'function') {
                onRatingUpdate();
            }
        };
        
        // Jalankan pemeriksaan ketika komponen dimuat
        checkStoredRatings();
    }, [images]); // Hapus onRatingUpdate dari dependencies untuk mencegah loop

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            setIsSubmittingComment(true);
            const token = localStorage.getItem('jwt_token');
            
            if (!token) {
                throw new Error('Sesi telah berakhir, silakan login kembali');
            }

            const response = await apiFetch(`/media/${selectedImage.id}/comments?source=${source}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    comment: newComment
                })
            });

            if (response.ok) {
                // Refresh comments
                fetchImageComments(selectedImage.id);
                setNewComment('');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menambahkan komentar');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            alert(error.message || 'Gagal menambahkan komentar');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const renderStars = () => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <button
                    key={i}
                    type="button"
                    disabled={isSubmittingRating}
                    onClick={() => handleSubmitRating(i)}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none disabled:cursor-not-allowed"
                >
                    {(hoverRating || userRating) >= i ? (
                        <StarIcon className="w-5 h-5 text-yellow-400" />
                    ) : (
                        <StarOutline className="w-5 h-5 text-gray-400" />
                    )}
                </button>
            );
        }
        return stars;
    };

    const formatDate = (dateString) => {
        try {
            return format(parseISO(dateString), 'dd MMM yyyy, HH:mm', { locale: id });
        } catch (error) {
            return dateString;
        }
    };

    const handleSubmitTableComment = async (imageId) => {
        if (!tableCommentForm.comment.trim()) return;
        
        setTableCommentForm(prev => ({
            ...prev,
            isSubmitting: true
        }));
        
        try {
            const token = localStorage.getItem('jwt_token');
            
            if (!token) {
                throw new Error('Sesi telah berakhir, silakan login kembali');
            }
            
            const response = await apiFetch(`/media/${imageId}/comments?source=${source}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    comment: tableCommentForm.comment
                })
            });
            
            if (response.ok) {
                // Jika berhasil, reset form dan tampilkan pesan
                setTableCommentForm({
                    faunaId: null,
                    comment: "",
                    isSubmitting: false
                });
                alert('Komentar berhasil ditambahkan');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menambahkan komentar');
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            alert(error.message || 'Gagal menambahkan komentar');
        } finally {
            setTableCommentForm(prev => ({
                ...prev,
                isSubmitting: false
            }));
        }
    };
    
    const toggleCommentForm = (faunaId) => {
        setTableCommentForm(prev => ({
            faunaId: prev.faunaId === faunaId ? null : faunaId,
            comment: "",
            isSubmitting: false
        }));
    };

    // Perbarui useEffect untuk inisialisasi awal komponen
    useEffect(() => {
        // Effect untuk mengelompokkan gambar dan menginisialisasi state saat mount
        if (checklistData?.fauna && images.length > 0) {
            // Set semua gambar spesies untuk navigasi
            const allImages = [];
            checklistData.fauna.forEach(fauna => {
                const faunaImages = images.filter(img => img.fauna_id === fauna.id);
                allImages.push(...faunaImages.map(img => {
                    // Check for user rating in localStorage for each image
                    const storedRating = localStorage.getItem(`media_rating_${img.id}`);
                    if (storedRating) {
                        img.userRating = parseInt(storedRating);
                    }
                    return img;
                }));
            });
            setAllSpeciesImages(allImages);
        }
    }, [checklistData?.fauna, images]);

    // Perbarui kode di handleSubmitRating untuk memangil onRatingUpdate setelah berhasil memberikan rating
    const handleSubmitRating = async (selectedRating) => {
        if (!selectedImage) return;
        
        // Determine actual rating to submit
        const ratingToSubmit = selectedRating === userRating ? 0 : selectedRating;
        
        // Cache previous values in case we need to revert
        const previousUserRating = userRating;
        const previousRating = rating;
        const previousTotalRatings = totalRatings;
        
        // Update UI immediately for better user experience
        let newTotalRatings = totalRatings;
        let newAvgRating = rating;
        
        // Calculate new totals and averages for optimistic UI update
        if (previousUserRating === 0 && ratingToSubmit > 0) {
            // Adding a new rating
            newTotalRatings = totalRatings + 1;
            newAvgRating = ((rating * totalRatings) + ratingToSubmit) / newTotalRatings;
        } else if (previousUserRating > 0 && ratingToSubmit === 0) {
            // Removing a rating
            newTotalRatings = Math.max(0, totalRatings - 1);
            if (newTotalRatings > 0) {
                newAvgRating = ((rating * totalRatings) - previousUserRating) / newTotalRatings;
            } else {
                newAvgRating = 0;
            }
        } else if (previousUserRating > 0 && ratingToSubmit > 0) {
            // Changing an existing rating
            newAvgRating = ((rating * totalRatings) - previousUserRating + ratingToSubmit) / totalRatings;
        }
        
        // Update UI optimistically
        setUserRating(ratingToSubmit);
        setRating(newAvgRating);
        setTotalRatings(newTotalRatings);
        
        // Update the selected image
        if (selectedImage) {
            selectedImage.userRating = ratingToSubmit;
        }
        
        // Simpan rating di localStorage segera untuk konsistensi antar sesi
        if (ratingToSubmit > 0) {
            localStorage.setItem(`media_rating_${selectedImage.id}`, ratingToSubmit.toString());
        } else {
            localStorage.removeItem(`media_rating_${selectedImage.id}`);
        }
        
        try {
            setIsSubmittingRating(true);
            const token = localStorage.getItem('jwt_token');
            
            if (!token) {
                // Revert changes if not authenticated
                setUserRating(previousUserRating);
                setRating(previousRating);
                setTotalRatings(previousTotalRatings);
                
                // Kembalikan localStorage ke nilai sebelumnya
                if (previousUserRating > 0) {
                    localStorage.setItem(`media_rating_${selectedImage.id}`, previousUserRating.toString());
                } else {
                    localStorage.removeItem(`media_rating_${selectedImage.id}`);
                }
                
                throw new Error('Sesi telah berakhir, silakan login kembali');
            }

            const response = await apiFetch(`/media/${selectedImage.id}/rating?source=${source}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating: ratingToSubmit
                })
            });

            if (response.ok) {
                // Fetch data terbaru setelah delay kecil untuk memastikan server sync
                setTimeout(() => {
                    fetchImageRating(selectedImage.id);
                    
                    // Panggil callback onRatingUpdate jika tersedia
                    if (typeof onRatingUpdate === 'function') {
                        onRatingUpdate();
                    }
                }, 500);
            } else {
                // Revert changes if API call failed
                setUserRating(previousUserRating);
                setRating(previousRating);
                setTotalRatings(previousTotalRatings);
                
                // Kembalikan localStorage ke nilai sebelumnya
                if (previousUserRating > 0) {
                    localStorage.setItem(`media_rating_${selectedImage.id}`, previousUserRating.toString());
                } else {
                    localStorage.removeItem(`media_rating_${selectedImage.id}`);
                }
                
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memberikan rating');
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert(error.message || 'Gagal memberikan rating');
        } finally {
            setIsSubmittingRating(false);
        }
    };

    // Tambahkan kode untuk fungsi renderModalRating sebelum return
    // Perbarui juga tampilan rating di modal
    const renderModalRating = () => {
        // Use the userRating state for displaying the stars
        return (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-[#333]">
                <div className="flex items-center">
                    <div className="mr-3 text-sm text-[#b0b0b0]">Rating:</div>
                    <div className="flex">
                        {renderStars()}
                    </div>
                </div>
                <div className="flex items-center text-sm text-[#b0b0b0] ml-0 sm:ml-auto">
                    <div className="flex mr-2">
                        {[1, 2, 3, 4, 5].map(star => (
                            <StarIcon 
                                key={star}
                                className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-600'}`} 
                            />
                        ))}
                    </div>
                    {typeof rating === 'number' ? rating.toFixed(1) : '0.0'} ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
                </div>
            </div>
        );
    };

    // Jika tidak ada data fauna, tampilkan pesan
    if (!checklistData?.fauna?.length) {
        return (
            <div className="p-4 text-center text-[#b0b0b0]">
                Tidak ada data spesies yang tersedia
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="min-w-full bg-[#1e1e1e] border border-[#444]">
                    <thead className="bg-[#2c2c2c]">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-[#e0e0e0]">Spesies</th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-[#e0e0e0]">Jumlah</th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-[#e0e0e0]">Catatan</th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-[#e0e0e0]">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#444]">
                        {Object.values(groupedMedia).map(({ fauna, images: faunaImages, sounds: faunaSounds }) => (
                            <tr key={`fauna-${fauna.id}`} className="hover:bg-[#2c2c2c]">
                                <td className="px-4 py-2">
                                    <div className="space-y-3">
                                        {/* Species Info */}
                                        <div>
                                            <div className="font-medium text-[#e0e0e0]">{fauna.nama_lokal || 'Tidak ada nama'}</div>
                                            <div className="text-sm text-[#b0b0b0] italic">{fauna.nama_ilmiah}</div>
                                        </div>

                                        {/* Images */}
                                        {faunaImages?.length > 0 && (
                                            <div className="flex flex-col space-y-2">
                                            <div className="flex space-x-2">
                                                {faunaImages.map(image => (
                                                        <div key={`image-${image.id}`} className="relative">
                                                    <div
                                                        className="w-16 h-16 cursor-pointer border border-[#444] rounded overflow-hidden"
                                                        onClick={() => handleImageClick(image, faunaImages)}
                                                    >
                                                        <img
                                                            src={image.url}
                                                            alt="Thumbnail"
                                                            className="w-full h-full object-cover"
                                                        />
                                                            </div>
                                                            {/* Tampilkan indikator rating */}
                                                            {(image.userRating > 0 || localStorage.getItem(`media_rating_${image.id}`)) && (
                                                                <div className="absolute -bottom-1 -right-1 bg-[#1e1e1e] rounded-full p-0.5 border border-[#444]">
                                                                    <StarIcon className="w-4 h-4 text-yellow-400" />
                                                                </div>
                                                            )}
                                                    </div>
                                                ))}
                                                </div>
                                                {/* Tampilkan rating rata-rata jika ada */}
                                                {faunaImages.some(img => img.userRating > 0 || localStorage.getItem(`media_rating_${img.id}`)) && (
                                                    <div className="flex items-center space-x-1">
                                                        <StarIcon className="w-4 h-4 text-yellow-400" />
                                                        <span className="text-xs text-[#b0b0b0]">
                                                            Anda telah memberikan rating
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Sounds */}
                                        {faunaSounds?.length > 0 && (
                                            <div className="flex space-x-2">
                                                {faunaSounds.map(sound => (
                                                    <div key={`sound-${sound.id}`} className="space-y-1">
                                                        {sound.spectrogram && (
                                                            <img
                                                                src={sound.spectrogram}
                                                                alt="Spectrogram"
                                                                className="w-16 h-16 object-cover rounded border border-[#444]"
                                                            />
                                                        )}
                                                        <audio controls className="w-48 h-8 bg-[#2c2c2c]">
                                                            <source src={sound.url} type="audio/mpeg" />
                                                            Browser Anda tidak mendukung pemutaran audio.
                                                        </audio>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Comment Form (Conditionally Shown) */}
                                        {tableCommentForm.faunaId === fauna.id && faunaImages?.length > 0 && (
                                            <div className="mt-2 p-3 bg-[#2c2c2c] rounded border border-[#444]">
                                                <div className="mb-2 text-sm text-[#b0b0b0]">
                                                    Tambahkan komentar untuk gambar pertama:
                                                </div>
                                                <div className="flex space-x-2">
                                                    <textarea
                                                        value={tableCommentForm.comment}
                                                        onChange={(e) => setTableCommentForm(prev => ({
                                                            ...prev,
                                                            comment: e.target.value
                                                        }))}
                                                        className="flex-1 bg-[#1e1e1e] border border-[#444] rounded p-2 text-[#e0e0e0] text-sm min-h-[60px]"
                                                        placeholder="Komentar Anda..."
                                                    />
                                                    <div className="flex flex-col space-y-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSubmitTableComment(faunaImages[0].id)}
                                                            disabled={tableCommentForm.isSubmitting || !tableCommentForm.comment.trim()}
                                                            className={`px-3 py-2 rounded text-sm ${
                                                                tableCommentForm.isSubmitting || !tableCommentForm.comment.trim()
                                                                    ? 'bg-[#3c3c3c] text-[#b0b0b0] cursor-not-allowed'
                                                                    : 'bg-[#1a73e8] text-white hover:bg-[#1565c0]'
                                                            }`}
                                                        >
                                                            {tableCommentForm.isSubmitting ? 'Mengirim...' : 'Kirim'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCommentForm(null)}
                                                            className="px-3 py-2 rounded text-sm bg-[#3c3c3c] text-[#e0e0e0] hover:bg-[#4c4c4c]"
                                                        >
                                                            Batal
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-2 text-center text-sm text-[#e0e0e0]">{fauna.jumlah || 1}</td>
                                <td className="px-4 py-2 text-center text-sm text-[#e0e0e0]">{fauna.catatan || 'Tidak'}</td>
                                <td className="px-4 py-2 text-center">
                                    {faunaImages?.length > 0 && (
                                        <button
                                            onClick={() => toggleCommentForm(fauna.id)}
                                            className="px-3 py-1 text-sm bg-[#2c2c2c] text-[#e0e0e0] rounded hover:bg-[#3c3c3c]"
                                        >
                                            {tableCommentForm.faunaId === fauna.id ? 'Tutup' : 'Komentar'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Image Viewer */}
            {showImageModal && selectedImage && (
                <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center"
                     onClick={() => setShowImageModal(false)}>
                    {/* Navigation Arrows */}
                    <button
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#e0e0e0] hover:text-[#b0b0b0]"
                        onClick={handlePrevImage}
                        disabled={currentImageIndex === 0}
                    >
                        <ChevronLeftIcon className="w-8 h-8" />
                    </button>

                    <button
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#e0e0e0] hover:text-[#b0b0b0]"
                        onClick={handleNextImage}
                        disabled={currentImageIndex === allSpeciesImages.length - 1}
                    >
                        <ChevronRightIcon className="w-8 h-8" />
                    </button>

                    {/* Close Button */}
                    <button
                        className="absolute top-4 right-4 text-[#e0e0e0] hover:text-[#b0b0b0]"
                        onClick={() => setShowImageModal(false)}
                    >
                        <XMarkIcon className="w-8 h-8" />
                    </button>

                    {/* Main Content */}
                    <div className="w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Image Container */}
                        <div className="flex-1 flex items-center justify-center p-4">
                            <img
                                src={selectedImage.url}
                                alt="Foto pengamatan"
                                className="max-w-full max-h-[75vh] object-contain"
                            />
                        </div>

                        {/* Image Footer with Rating */}
                        <div className="bg-[#1e1e1e] bg-opacity-95 text-[#e0e0e0] p-4">
                            <div className="container mx-auto">
                                <div className="flex flex-col space-y-3">
                                    {/* Image Details Row */}
                                    <div className="flex items-start justify-between">
                                    {/* Image Details */}
                                    <div className="flex-1">
                                        <h3 className="font-medium">
                                            {selectedImage.fauna?.nama_lokal || 'Nama spesies'}
                                            <span className="ml-2 text-sm font-normal italic text-[#b0b0b0]">
                                                {selectedImage.fauna?.nama_ilmiah}
                                            </span>
                                        </h3>
                                        <div className="text-sm text-[#b0b0b0] flex items-center mt-1">
                                            <MapPinIcon className="w-4 h-4 mr-1" />
                                            {locationName || 'Memuat lokasi...'}
                                        </div>
                                    </div>

                                    {/* Counter */}
                                    <div className="text-sm text-[#b0b0b0]">
                                        {currentImageIndex + 1} / {allSpeciesImages.length}
                                        </div>
                                    </div>
                                    
                                    {/* Rating Row */}
                                    {renderModalRating()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MediaViewer;
