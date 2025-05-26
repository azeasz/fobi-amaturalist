import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag, faHistory, faFilter, faSearch, faCalendar, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { useUser } from '../../context/UserContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

function AdminHistoryPage() {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState('identifications');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        actionType: '',
        flagType: '',
        isResolved: '',
        search: '',
        page: 1,
        perPage: 10
    });
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchData();
    }, [activeTab, filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const endpoint = user?.level >= 3
                ? `/admin/${activeTab === 'identifications' ? 'identification-history' : 'flags'}`
                : `/user/${activeTab === 'identifications' ? 'identification-history' : 'flags'}`;

            let queryParams = new URLSearchParams({
                page: filters.page.toString(),
                per_page: filters.perPage.toString()
            });

            if (filters.startDate) queryParams.append('start_date', filters.startDate.toISOString().split('T')[0]);
            if (filters.endDate) queryParams.append('end_date', filters.endDate.toISOString().split('T')[0]);
            if (filters.actionType) queryParams.append('action_type', filters.actionType);
            if (filters.flagType) queryParams.append('flag_type', filters.flagType);
            if (filters.isResolved) queryParams.append('is_resolved', filters.isResolved);
            if (filters.search) queryParams.append('search', filters.search);

            const response = await apiFetch(`${endpoint}?${queryParams.toString()}`);
            const result = await response.json();

            if (result.success) {
                setData(result.data.data);
                setTotalPages(Math.ceil(result.data.total / filters.perPage));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };
    const renderFilters = () => (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                    <DatePicker
                        selected={filters.startDate}
                        onChange={date => setFilters({...filters, startDate: date})}
                        className="w-full p-2 border rounded"
                        dateFormat="dd/MM/yyyy"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
                    <DatePicker
                        selected={filters.endDate}
                        onChange={date => setFilters({...filters, endDate: date})}
                        className="w-full p-2 border rounded"
                        dateFormat="dd/MM/yyyy"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {activeTab === 'identifications' ? 'Tipe Aksi' : 'Status'}
                    </label>
                    <select
                        className="w-full p-2 border rounded"
                        value={activeTab === 'identifications' ? filters.actionType : filters.isResolved}
                        onChange={e => setFilters({
                            ...filters,
                            [activeTab === 'identifications' ? 'actionType' : 'isResolved']: e.target.value
                        })}
                    >
                        {activeTab === 'identifications' ? (
                            <>
                                <option value="">Semua</option>
                                <option value="initial">Initial</option>
                                <option value="suggestion">Suggestion</option>
                                <option value="change">Change</option>
                                <option value="withdraw">Withdraw</option>
                            </>
                        ) : (
                            <>
                                <option value="">Semua</option>
                                <option value="true">Selesai</option>
                                <option value="false">Pending</option>
                            </>
                        )}
                    </select>
                </div>
            </div>
        </div>
    );

    const renderIdentificationHistory = () => (
        <div className="space-y-4">
            {data.map((history) => (
                <Link
                    key={history.id}
                    to={`/observations/${history.checklist_id}`}
                    className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow duration-200"
                >
                    <div className="flex justify-between items-start">
                        <div className="flex-grow">
                            <div className="flex items-center">
                                <span className="font-medium">
                                    {history.action_type === 'initial' ? 'Identifikasi Awal' :
                                     history.action_type === 'suggestion' ? 'Saran Identifikasi' :
                                     history.action_type === 'change' ? 'Perubahan Identifikasi' :
                                     'Penarikan Identifikasi'}
                                </span>
                                <FontAwesomeIcon
                                    icon={faExternalLinkAlt}
                                    className="ml-2 text-gray-400 text-sm"
                                />
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                {history.previous_name &&
                                    <span className="line-through mr-2">{history.previous_name}</span>
                                }
                                <span className="font-medium">{history.scientific_name}</span>
                            </p>
                            {history.reason && (
                                <p className="text-sm text-gray-500 mt-1">
                                    Alasan: {history.reason}
                                </p>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                                Oleh: {history.user_name}
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 whitespace-nowrap ml-4">
                            {new Date(history.created_at).toLocaleDateString('id-ID')}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );

    const renderFlags = () => (
        <div className="space-y-4">
            {data.map((flag) => (
                <Link
                    key={flag.id}
                    to={`/observations/${flag.checklist_id}`}
                    className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow duration-200"
                >
                    <div className="flex justify-between items-start">
                        <div className="flex-grow">
                            <div className="flex items-center">
                                <span className="font-medium">
                                    {flag.flag_type === 'identification' ? 'Masalah Identifikasi' :
                                     flag.flag_type === 'location' ? 'Masalah Lokasi' :
                                     flag.flag_type === 'media' ? 'Masalah Media' :
                                     flag.flag_type === 'date' ? 'Masalah Tanggal' :
                                     'Masalah Lainnya'}
                                </span>
                                <FontAwesomeIcon
                                    icon={faExternalLinkAlt}
                                    className="ml-2 text-gray-400 text-sm"
                                />
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{flag.reason}</p>
                            <div className="text-xs text-gray-500 mt-2">
                                Oleh: {flag.user_name}
                            </div>
                            {flag.is_resolved && (
                                <div className="mt-2 pt-2 border-t">
                                    <p className="text-sm">
                                        <span className="font-medium">Resolusi:</span> {flag.resolution_notes}
                                    </p>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Diselesaikan oleh {flag.resolved_by_name}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end ml-4">
                            <div className="text-sm text-gray-500 whitespace-nowrap">
                                {new Date(flag.created_at).toLocaleDateString('id-ID')}
                            </div>
                            <span className={`mt-2 px-2 py-1 text-xs rounded-full ${
                                flag.is_resolved
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {flag.is_resolved ? 'Selesai' : 'Pending'}
                            </span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 mt-16">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-4">
                    {user?.level >= 3 ? 'Riwayat Sistem' : 'Riwayat Saya'}
                </h1>
                <div className="flex space-x-4">
                    <button
                        className={`px-4 py-2 rounded-lg ${
                            activeTab === 'identifications'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200'
                        }`}
                        onClick={() => {
                            setActiveTab('identifications');
                            setFilters({...filters, page: 1});
                        }}
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
                        onClick={() => {
                            setActiveTab('flags');
                            setFilters({...filters, page: 1});
                        }}
                    >
                        <FontAwesomeIcon icon={faFlag} className="mr-2" />
                        Flag
                    </button>
                </div>
            </div>

            {renderFilters()}

            {loading ? (
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'identifications' ? renderIdentificationHistory() : renderFlags()}

                    {/* Pagination */}
                    <div className="mt-6 flex justify-center space-x-2">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => setFilters({...filters, page: i + 1})}
                                className={`px-3 py-1 rounded ${
                                    filters.page === i + 1
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default AdminHistoryPage;
