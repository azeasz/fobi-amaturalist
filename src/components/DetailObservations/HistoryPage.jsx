import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag, faHistory } from '@fortawesome/free-solid-svg-icons';

function HistoryPage() {
    const { id } = useParams();
    const [identificationHistory, setIdentificationHistory] = useState([]);
    const [flags, setFlags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('identifications'); // atau 'flags'

    useEffect(() => {
        fetchHistory();
    }, [id]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            // Fetch identification history
            const identResponse = await apiFetch(`/observations/${id}/identification-history`);
            const identData = await identResponse.json();
            if (identData.success) {
                setIdentificationHistory(identData.data);
            }

            // Fetch flags
            const flagsResponse = await apiFetch(`/observations/${id}/flags`);
            const flagsData = await flagsResponse.json();
            if (flagsData.success) {
                setFlags(flagsData.data);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Memuat...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 mt-16">
            <div className="mb-6">
                <div className="flex space-x-4">
                    <button
                        className={`px-4 py-2 rounded-lg ${
                            activeTab === 'identifications'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200'
                        }`}
                        onClick={() => setActiveTab('identifications')}
                    >
                        <FontAwesomeIcon icon={faHistory} className="mr-2" />
                        Riwayat Identifikasi
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg ${
                            activeTab === 'flags'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200'
                        }`}
                        onClick={() => setActiveTab('flags')}
                    >
                        <FontAwesomeIcon icon={faFlag} className="mr-2" />
                        Flag
                    </button>
                </div>
            </div>

            {activeTab === 'identifications' ? (
                <div className="space-y-4">
                    {identificationHistory.map((history) => (
                        <div key={history.id} className="bg-white rounded-lg shadow p-4">
                            <div className="flex justify-between">
                                <div>
                                    <span className="font-medium">{history.action_type}</span>
                                    <p className="text-sm text-gray-600">
                                        {history.previous_name &&
                                            `${history.previous_name} → `}
                                        {history.scientific_name}
                                    </p>
                                    {history.reason && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            Alasan: {history.reason}
                                        </p>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {new Date(history.created_at).toLocaleDateString('id-ID')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {flags.map((flag) => (
                        <div key={flag.id} className="bg-white rounded-lg shadow p-4">
                            <div className="flex justify-between">
                                <div>
                                    <span className="font-medium">
                                        {flag.flag_type === 'identification' ? 'Masalah Identifikasi' :
                                         flag.flag_type === 'location' ? 'Masalah Lokasi' :
                                         flag.flag_type === 'media' ? 'Masalah Media' :
                                         flag.flag_type === 'date' ? 'Masalah Tanggal' :
                                         'Masalah Lainnya'}
                                    </span>
                                    <p className="text-sm text-gray-600 mt-1">{flag.reason}</p>
                                    <div className="text-xs text-gray-500 mt-2">
                                        Oleh: {flag.user_name}
                                    </div>
                                </div>
                                <div>
                                    {flag.is_resolved ? (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                            Selesai
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                            {flag.is_resolved && (
                                <div className="mt-2 pt-2 border-t">
                                    <p className="text-sm">
                                        <span className="font-medium">Resolusi:</span>
                                        {flag.resolution_notes}
                                    </p>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Diselesaikan oleh {flag.resolved_by_name}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default HistoryPage;
