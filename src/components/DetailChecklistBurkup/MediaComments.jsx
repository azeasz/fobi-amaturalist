import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { apiFetch } from '../../utils/api';

function MediaComments({ source, imageId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { id: checklistId } = useParams();

    // Fetch comments
    useEffect(() => {
        if (imageId) {
            fetchComments();
        }
    }, [imageId]);

    const fetchComments = async () => {
        try {
            setIsLoading(true);
            const response = await apiFetch(`/media/${imageId}/comments?source=${source}`);
            const data = await response.json();
            if (data.success) {
                setComments(data.data);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            setIsSubmitting(true);
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
                    comment: newComment
                })
            });

            if (response.ok) {
                // Refresh comments
                fetchComments();
                setNewComment('');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menambahkan komentar');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            alert(error.message || 'Gagal menambahkan komentar');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        try {
            return format(parseISO(dateString), 'dd MMM yyyy, HH:mm', { locale: id });
        } catch (error) {
            return dateString;
        }
    };

    return (
        <div className="mt-4 bg-[#1e1e1e] rounded-lg p-4 border border-[#444]">
            <h3 className="text-lg font-semibold mb-4 text-[#e0e0e0]">Komentar</h3>
            
            {isLoading ? (
                <div className="text-center text-[#b0b0b0] py-4">Memuat komentar...</div>
            ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                    {comments.length === 0 ? (
                        <div className="text-center text-[#b0b0b0] py-4">Belum ada komentar</div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="bg-[#2c2c2c] p-3 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div className="font-medium text-[#e0e0e0]">{comment.username}</div>
                                    <div className="text-xs text-[#b0b0b0]">{formatDate(comment.created_at)}</div>
                                </div>
                                <div className="mt-2 text-[#e0e0e0]">{comment.comment}</div>
                            </div>
                        ))
                    )}
                </div>
            )}
            
            <form onSubmit={handleSubmitComment} className="mt-4">
                <div className="flex items-start gap-2">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 bg-[#2c2c2c] border border-[#444] rounded-lg p-2 text-[#e0e0e0] min-h-[80px]"
                        placeholder="Tambahkan komentar..."
                        required
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting || !newComment.trim()}
                        className={`px-4 py-2 rounded-lg ${
                            isSubmitting || !newComment.trim()
                                ? 'bg-[#3c3c3c] text-[#b0b0b0] cursor-not-allowed'
                                : 'bg-[#1a73e8] text-white hover:bg-[#1565c0]'
                        }`}
                    >
                        {isSubmitting ? 'Mengirim...' : 'Kirim'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default MediaComments; 