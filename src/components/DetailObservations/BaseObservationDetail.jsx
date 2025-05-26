import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import Pusher from 'pusher-js';
import MediaViewer from './MediaViewer';
import ChecklistMap from './ChecklistMap';
import QualityAssessment from './QualityAssessment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faFlag } from '@fortawesome/free-solid-svg-icons';
import DataSourceSelector from '../common/DataSourceSelector';
import ObservationFilters from '../common/ObservationFilters';
import BurnesMediaViewer from './BirdObservation/BurnesMediaViewer';
import KupunesMediaViewer from './ButterflyObservation/KupunesMediaViewer';

function BaseObservationDetail({ 
    id: propId, 
    isModal = false, 
    onClose = null,
    TabPanelComponent,
    QualityAssessmentComponent,
    fetchObservation,
    handleIdentificationSubmit,
    channelName,
    sourceLabel,
    source,
    onSourceChange
}) {
    const { id: paramId } = useParams();
    const id = isModal ? propId : paramId;
    const { user } = useUser();

    const [checklist, setChecklist] = useState(null);
    const [identifications, setIdentifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [locationName, setLocationName] = useState('Memuat lokasi...');
    const [showFlagModal, setShowFlagModal] = useState(false);

    useEffect(() => {
        setChecklist(null);
        setIdentifications([]);
        setLoading(true);
        setError('');
        
        loadData();

        // Inisialisasi Pusher
        const pusher = new Pusher('2d50c7dd083d072bcc27', {
            cluster: 'ap1',
        });

        const channel = pusher.subscribe(channelName);

        channel.bind('IdentificationUpdated', function(data) {
            setIdentifications(prev => prev.map(ident =>
                ident.id === data.identificationId ? 
                { ...ident, agreement_count: data.agreementCount, user_agreed: data.userAgreed } 
                : ident
            ));
        });

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
        };
    }, [id]);

    const loadData = async () => {
        try {
            const data = await fetchObservation(id);
            setChecklist(data.checklist);
            setIdentifications(data.identifications);
        } catch (error) {
            setError('Terjadi kesalahan saat memuat data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Memuat...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!checklist) return <div>Data tidak ditemukan</div>;

    return (
        <div className={`${isModal ? '' : 'container mx-auto mt-10'} px-4 py-8`}>
            <div className="mb-6">
                <DataSourceSelector 
                    selectedSource={source}
                    onSourceChange={onSourceChange}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold mb-2">
                                    {checklist.scientific_name}
                                </h1>
                                <div className="text-gray-600">
                                    Observer: {checklist.observer_name} pada{' '}
                                    {new Date(checklist.created_at).toLocaleDateString('id-ID')}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className={`px-4 py-2 rounded-full text-sm font-semibold
                                    ${checklist?.quality_grade === 'ID Lengkap' ? 'bg-green-100 text-green-800' :
                                      checklist?.quality_grade === 'ID Kurang' ? 'bg-yellow-100 text-orange-800' :
                                      checklist?.quality_grade === 'Bantu Iden' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'}`}>
                                    {checklist?.quality_grade || 'Bantu Iden'}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Sumber: {sourceLabel}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            {sourceLabel === 'Burungnesia' ? (
                                <BurnesMediaViewer checklist={checklist} />
                            ) : (
                                <KupunesMediaViewer checklist={checklist} />
                            )}
                        </div>

                        <div>
                            <ChecklistMap checklist={checklist} />
                            <div className="text-sm text-gray-500 mt-4 text-center">
                                <p><FontAwesomeIcon icon={faMapMarkerAlt} /> {locationName}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <TabPanelComponent
                            checklist={checklist}
                            identifications={identifications}
                            setIdentifications={setIdentifications}
                            onIdentificationSubmit={handleIdentificationSubmit}
                            user={user}
                        />

                        <QualityAssessmentComponent
                            checklist={checklist}
                        />
                    </div>

                    <button
                        onClick={() => setShowFlagModal(true)}
                        className="mt-4 inline-flex items-center px-3 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                    >
                        <FontAwesomeIcon icon={faFlag} className="mr-2" />
                        Tandai Masalah
                    </button>
                </div>

                <div className="lg:col-span-1">
                    <ObservationFilters 
                        onFilterChange={filters => {
                            console.log('Filters changed:', filters);
                            // Implement filter logic here
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default BaseObservationDetail; 