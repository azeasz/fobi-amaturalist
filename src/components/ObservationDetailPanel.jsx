import React from 'react';
import TabPanelBurungnesia from './DetailObservationsBurnes/TabPanelBurungnesia';
import TabPanelKupunesia from './DetailObservationsKupnes/TabPanelKupunesia';

function ObservationDetailPanel({ checklist, user }) {
    // Fungsi untuk menentukan jenis observasi
    const getObservationType = () => {
        if (!checklist) return null;
        
        // Cek berdasarkan properti khusus atau tipe data
        if (checklist.observation_type === 'burungnesia' || checklist.bird_species) {
            return 'burungnesia';
        }
        
        if (checklist.observation_type === 'kupunesia' || checklist.butterfly_species) {
            return 'kupunesia';
        }
        
        return null;
    };

    // Render komponen berdasarkan jenis observasi
    const renderObservationPanel = () => {
        const observationType = getObservationType();

        switch (observationType) {
            case 'burungnesia':
                return (
                    <div className="bg-blue-50 rounded-lg shadow">
                        <div className="p-4 border-b border-blue-200">
                            <h2 className="text-xl font-semibold text-blue-800">
                                Detail Pengamatan Burung
                            </h2>
                            {checklist.species_name && (
                                <p className="mt-1 text-blue-600">
                                    {checklist.species_name}
                                    {checklist.species_name_latin && (
                                        <span className="italic ml-2">
                                            ({checklist.species_name_latin})
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                        <TabPanelBurungnesia 
                            checklist={checklist} 
                            user={user} 
                        />
                    </div>
                );

            case 'kupunesia':
                return (
                    <div className="bg-purple-50 rounded-lg shadow">
                        <div className="p-4 border-b border-purple-200">
                            <h2 className="text-xl font-semibold text-purple-800">
                                Detail Pengamatan Kupu-kupu
                            </h2>
                            {checklist.species_name && (
                                <p className="mt-1 text-purple-600">
                                    {checklist.species_name}
                                    {checklist.species_name_latin && (
                                        <span className="italic ml-2">
                                            ({checklist.species_name_latin})
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                        <TabPanelKupunesia 
                            checklist={checklist} 
                            user={user} 
                        />
                    </div>
                );

            default:
                return (
                    <div className="p-4 text-center text-gray-500">
                        Tipe observasi tidak dikenali atau data tidak tersedia
                    </div>
                );
        }
    };

    if (!checklist) {
        return (
            <div className="p-4 text-center text-gray-500">
                Data observasi tidak tersedia
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6">
            {renderObservationPanel()}
        </div>
    );
}

export default ObservationDetailPanel; 