import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import MediaViewer from './BurungnesiaMediaViewer';
import ChecklistMap from './BurungnesiaChecklistMap';
import QualityAssessment from './BurungnesiaQualityAssessment';
import TabPanel from './TabPanelBurungnesia';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faFlag, faTimes } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../../utils/api';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

function BurungnesiaChecklistDetail({ id: propId, isModal = false, onClose = null }) {
    const { id: paramId } = useParams();
    const id = isModal ? propId : paramId;
    const [checklist, setChecklist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useUser();
    const [locationName, setLocationName] = useState('Memuat lokasi...');
    const [activeTab, setActiveTab] = useState('identification');

    useEffect(() => {
        fetchChecklistDetail();
    }, [id]);

    const fetchChecklistDetail = async () => {
        try {
            setLoading(true);
            const response = await apiFetch(`/burungnesia/observations/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setChecklist(data.data.checklist);
                // Tambahan logika untuk menangani data lainnya
            } else {
                setError('Gagal memuat data checklist');
            }
        } catch (error) {
            console.error('Error fetching checklist detail:', error);
            setError('Terjadi kesalahan saat memuat data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-gray-600">Memuat...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-600">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className={`${isModal ? '' : 'container mx-auto mt-10'} px-4 py-8`}>
            {isModal && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">
                            {checklist?.faunas?.[0]?.nameLat || 'Nama tidak tersedia'}
                        </h1>
                        <div className="text-gray-600">
                            Nama Lokal: {checklist?.faunas?.[0]?.nameId || '-'}
                        </div>
                        <div className="text-gray-600">
                            Observer: {checklist?.observer_name || 'Pengamat tidak diketahui'} pada{' '}
                            {checklist?.created_at ? new Date(checklist.created_at).toLocaleDateString('id-ID') : 'Tanggal tidak tersedia'}
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold
                        ${checklist?.quality_grade === 'research grade' ? 'bg-green-100 text-green-800' :
                          checklist?.quality_grade === 'needs ID' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {checklist?.quality_grade || 'Belum terverifikasi'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">Media</h2>
                        <MediaViewer checklist={checklist} />
                    </div>
                </div>

                <div>
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">Lokasi Pengamatan</h2>
                        <ChecklistMap checklist={checklist} />
                        <div className="text-sm text-gray-500 mt-2">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                            {locationName}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <TabPanel
                        id={id}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        checklist={checklist}
                        user={user}
                    />
                </div>

                <div>
                    <QualityAssessment checklist={checklist} />
                </div>
            </div>
        </div>
    );
}

export default BurungnesiaChecklistDetail;