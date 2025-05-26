import React, { useState } from 'react';
import MediaUploadForm from '../components/MediaUpload/MediaUploadForm';
import { useNavigate } from 'react-router-dom';

function MediaUploadPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (formData) => {
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/observations/media`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Gagal mengupload data');
            }

            const data = await response.json();
            if (data.success) {
                navigate('/observations'); // Redirect ke halaman observasi
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4">
            <div className="py-6">
                <h1 className="text-2xl font-bold mb-6">Upload Media Observasi</h1>
                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <MediaUploadForm 
                    onSubmit={handleSubmit}
                    isLoading={loading}
                />
            </div>
        </div>
    );
}

export default MediaUploadPage;