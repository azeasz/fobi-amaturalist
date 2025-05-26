import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { apiFetch } from '../../utils/api';

function MediaRating({ source, imageId }) {
    const [rating, setRating] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { id: checklistId } = useParams();

    useEffect(() => {
        if (imageId) {
            fetchRatings();
        }
    }, [imageId]);

    const fetchRatings = async () => {
        try {
            setIsLoading(true);
            const response = await apiFetch(`/media/${imageId}/rating?source=${source}`);
            const data = await response.json();
            
            if (data.success) {
                setRating(data.data.average_rating || 0);
                setUserRating(data.data.user_rating || 0);
                setTotalRatings(data.data.total_ratings || 0);
            }
        } catch (error) {
            console.error('Error fetching ratings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitRating = async (selectedRating) => {
        if (selectedRating === userRating) {
            // Jika rating yang sama diklik lagi, batalkan rating
            selectedRating = 0;
        }

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('jwt_token');
            
            if (!token) {
                throw new Error('Sesi telah berakhir, silakan login kembali');
            }

            const response = await apiFetch(`/media/${imageId}/rating?source=${source}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating: selectedRating
                })
            });

            if (response.ok) {
                // Refresh ratings
                fetchRatings();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memberikan rating');
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert(error.message || 'Gagal memberikan rating');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStars = () => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <button
                    key={i}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSubmitRating(i)}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none disabled:cursor-not-allowed"
                >
                    {(hoverRating || userRating) >= i ? (
                        <StarIcon className="w-6 h-6 text-yellow-400" />
                    ) : (
                        <StarOutline className="w-6 h-6 text-gray-400" />
                    )}
                </button>
            );
        }
        return stars;
    };

    const renderRatingText = () => {
        if (userRating === 0) {
            return "Berikan rating";
        }
        
        const ratingTexts = [
            "",
            "Sangat Buruk",
            "Buruk",
            "Biasa",
            "Bagus",
            "Sangat Bagus"
        ];
        
        return ratingTexts[userRating];
    };

    if (isLoading) {
        return (
            <div className="py-4 text-center text-[#b0b0b0]">
                Memuat rating...
            </div>
        );
    }

    return (
        <div className="bg-[#1e1e1e] rounded-lg p-4 border border-[#444]">
            <h3 className="text-lg font-semibold mb-2 text-[#e0e0e0]">Rating Gambar</h3>
            
            <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                    {renderStars()}
                </div>
                <span className="text-sm text-[#b0b0b0]">
                    {renderRatingText()}
                </span>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="flex">
                    {[1, 2, 3, 4, 5].map(star => (
                        <StarIcon 
                            key={star}
                            className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-600'}`} 
                        />
                    ))}
                </div>
                <span className="text-sm text-[#b0b0b0]">
                    {rating.toFixed(1)} ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
                </span>
            </div>
        </div>
    );
}

export default MediaRating; 