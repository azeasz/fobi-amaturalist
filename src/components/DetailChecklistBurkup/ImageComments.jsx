import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { apiFetch } from '../../utils/api';
import { StarIcon } from '@heroicons/react/24/solid';

function ImageComments({ images = [], onRatingUpdate }) {
    const { id: checklistId } = useParams();
    const [source, setSource] = useState('');
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [imageData, setImageData] = useState([]);
    const [newComments, setNewComments] = useState({});
    const [isSubmitting, setIsSubmitting] = useState({});

    // Determine source based on checklist ID
    useEffect(() => {
        if (checklistId) {
            if (checklistId.startsWith('BN') || checklistId.startsWith('BNAPP')) {
                setSource('burungnesia');
            } else if (checklistId.startsWith('KP') || checklistId.startsWith('KPAPP')) {
                setSource('kupunesia');
            }
        }
    }, [checklistId]);

    // Tambahkan effect untuk merespon perubahan prop onRatingUpdate
    useEffect(() => {
        if (source && images.length > 0) {
            fetchAllImageData();
        }
    }, [onRatingUpdate]);

    // Fetch comments and ratings for all images
    useEffect(() => {
        if (source && images.length > 0) {
            fetchAllImageData();
        }
    }, [source, images]);

    const fetchAllImageData = async () => {
        setIsLoading(true);
        try {
            const promises = images.map(image => fetchImageData(image.id));
            const results = await Promise.all(promises);
            const filteredResults = results.filter(data => data !== null);
            
            // Urutkan hasil agar gambar dengan rating tampil di atas
            const sortedResults = [...filteredResults].sort((a, b) => {
                if (a.userRating && !b.userRating) return -1;
                if (!a.userRating && b.userRating) return 1;
                return 0;
            });
            
            setImageData(sortedResults);
            
            // Initialize newComments object for all images
            const commentState = {};
            filteredResults.forEach(data => {
                commentState[data.imageId] = '';
            });
            setNewComments(commentState);
        } catch (error) {
            console.error('Error fetching image data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchImageData = async (imageId) => {
        try {
            // Cek terlebih dahulu nilai dari localStorage untuk user rating
            const storedRating = localStorage.getItem(`media_rating_${imageId}`);
            let userRating = 0;
            if (storedRating) {
                const parsedRating = parseInt(storedRating);
                if (!isNaN(parsedRating)) {
                    userRating = parsedRating;
                }
            }
            
            // Fetch comments
            const commentsResponse = await apiFetch(`/media/${imageId}/comments?source=${source}`);
            const commentsData = await commentsResponse.json();
            
            // Fetch ratings
            const ratingsResponse = await apiFetch(`/media/${imageId}/rating?source=${source}`);
            const ratingsData = await ratingsResponse.json();
            
            if (commentsData.success && ratingsData.success) {
                const imageInfo = images.find(img => img.id === imageId);
                const avgRating = ratingsData.data?.average_rating || 0;
                
                // Jika ada rating pengguna dari API dan tidak ada di localStorage, simpan ke localStorage
                if (ratingsData.data?.user_rating !== undefined && !storedRating) {
                    localStorage.setItem(`media_rating_${imageId}`, ratingsData.data.user_rating.toString());
                    userRating = ratingsData.data.user_rating;
                }
                
                return {
                    imageId,
                    imageUrl: imageInfo?.url || '',
                    comments: commentsData.data || [],
                    rating: typeof avgRating === 'number' ? avgRating : parseFloat(avgRating) || 0,
                    totalRatings: ratingsData.data?.total_ratings || 0,
                    userRating: userRating
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching data for image ${imageId}:`, error);
            return null;
        }
    };

    const handleCommentChange = (imageId, text) => {
        setNewComments(prev => ({
            ...prev,
            [imageId]: text
        }));
    };

    const handleSubmitComment = async (e, imageId) => {
        e.preventDefault();
        
        const commentText = newComments[imageId];
        if (!commentText || !commentText.trim()) return;
        
        setIsSubmitting(prev => ({
            ...prev,
            [imageId]: true
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
                    comment: commentText
                })
            });

            if (response.ok) {
                // Clear the comment input
                setNewComments(prev => ({
                    ...prev,
                    [imageId]: ''
                }));
                
                // Refresh image data for this particular image
                const updatedData = await fetchImageData(imageId);
                if (updatedData) {
                    setImageData(prev => prev.map(data => 
                        data.imageId === imageId ? updatedData : data
                    ));
                    // Notify parent component if onRatingUpdate is provided
                    if (typeof onRatingUpdate === 'function') {
                        onRatingUpdate();
                    }
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menambahkan komentar');
            }
        } catch (error) {
            console.error(`Error submitting comment for image ${imageId}:`, error);
            alert(error.message || 'Gagal menambahkan komentar');
        } finally {
            setIsSubmitting(prev => ({
                ...prev,
                [imageId]: false
            }));
        }
    };

    const formatDate = (dateString) => {
        try {
            return format(parseISO(dateString), 'dd MMM yyyy, HH:mm', { locale: id });
        } catch (error) {
            return dateString;
        }
    };

    if (isLoading) {
        return (
            <div className="bg-[#1e1e1e] rounded-lg p-6 border border-[#444]">
                <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Komentar & Rating</h2>
                <div className="text-center py-6 text-[#b0b0b0]">
                    Memuat data...
                </div>
            </div>
        );
    }

    if (imageData.length === 0) {
        return (
            <div className="bg-[#1e1e1e] rounded-lg p-6 border border-[#444]">
                <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Komentar & Rating</h2>
                <div className="text-center py-6 text-[#b0b0b0]">
                    Belum ada komentar atau rating untuk media
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1e1e1e] rounded-lg p-6 border border-[#444]">
            <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Komentar & Rating</h2>
            
            <div className="space-y-6">
                {imageData.map(data => (
                    <div key={data.imageId} className="border border-[#444] rounded-lg overflow-hidden">
                        {/* Image Header */}
                        <div className="flex items-center bg-[#2c2c2c] p-4">
                            <div className="w-16 h-16 rounded overflow-hidden mr-4">
                                <img 
                                    src={data.imageUrl} 
                                    alt="Media" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <StarIcon 
                                            key={star}
                                            className={`w-5 h-5 ${star <= Math.round(data.rating) ? 'text-yellow-400' : 'text-gray-600'}`} 
                                        />
                                    ))}
                                    <span className="ml-2 text-sm text-[#b0b0b0]">
                                        {typeof data.rating === 'number' ? data.rating.toFixed(1) : '0.0'} ({data.totalRatings} {data.totalRatings === 1 ? 'rating' : 'ratings'})
                                    </span>
                                </div>
                                {data.userRating > 0 && (
                                    <div className="text-sm text-[#b0b0b0] mt-1 flex items-center">
                                        <span className="mr-2">Rating Anda:</span>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <StarIcon 
                                                key={star}
                                                className={`w-4 h-4 ${star <= data.userRating ? 'text-yellow-400' : 'text-gray-600'}`} 
                                            />
                                        ))}
                                    </div>
                                )}
                                {data.comments.length > 0 && (
                                    <div className="text-sm text-[#b0b0b0] mt-1">
                                        {data.comments.length} komentar
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Comments */}
                        <div className="p-4 space-y-3">
                            {/* Comment Form */}
                            <form onSubmit={(e) => handleSubmitComment(e, data.imageId)} className="mb-4">
                                <div className="flex items-start gap-2">
                                    <textarea 
                                        value={newComments[data.imageId] || ''}
                                        onChange={(e) => handleCommentChange(data.imageId, e.target.value)}
                                        placeholder="Tambahkan komentar..."
                                        className="flex-1 bg-[#2c2c2c] border border-[#444] rounded p-2 text-[#e0e0e0] text-sm min-h-[60px]"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSubmitting[data.imageId] || !newComments[data.imageId]?.trim()}
                                        className={`px-3 py-2 rounded text-sm ${
                                            isSubmitting[data.imageId] || !newComments[data.imageId]?.trim()
                                                ? 'bg-[#3c3c3c] text-[#b0b0b0] cursor-not-allowed'
                                                : 'bg-[#1a73e8] text-white hover:bg-[#1565c0]'
                                        }`}
                                    >
                                        {isSubmitting[data.imageId] ? 'Mengirim...' : 'Kirim'}
                                    </button>
                                </div>
                            </form>
                            
                            {/* Comments List */}
                            <div className="max-h-60 overflow-y-auto space-y-3">
                                {data.comments.length === 0 ? (
                                    <div className="text-center text-[#b0b0b0] py-2">
                                        Belum ada komentar
                                    </div>
                                ) : (
                                    data.comments.map(comment => (
                                        <div key={comment.id} className="bg-[#252525] p-3 rounded">
                                            <div className="flex justify-between items-start">
                                                <div className="font-medium text-[#e0e0e0]">{comment.username}</div>
                                                <div className="text-xs text-[#b0b0b0]">{formatDate(comment.created_at)}</div>
                                            </div>
                                            <div className="mt-2 text-[#e0e0e0]">{comment.comment}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ImageComments; 