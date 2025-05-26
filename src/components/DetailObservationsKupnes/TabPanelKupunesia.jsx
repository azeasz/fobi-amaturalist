import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faImage, 
    faMap, 
    faClipboardCheck, 
    faCheckDouble,
    faMapMarkerAlt,
    faPaw
} from '@fortawesome/free-solid-svg-icons';

import KupunesiaMediaViewer from './KupunesiaMediaViewer';
import KupunesiaChecklistMap from './KupunesiaChecklistMap';
import KupunesiaMediaViewer from './KupunesiaMediaViewer';
import KupunesiaChecklistMap from './KupunesiaChecklistMap';
import KupunesiaIdentificationPanel from './KupunesiaIdentificationPanel';
import KupunesiaQualityAssessment from './KupunesiaQualityAssessment';
import KupunesiaLocationVerificationPanel from './KupunesiaLocationVerificationPanel';
import KupunesiaWildStatusPanel from './KupunesiaWildStatusPanel';
import { apiFetch } from '../../utils/api';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

function TabPanelKupunesia({ checklist, user }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedTaxon, setSelectedTaxon] = useState(null);
    const [identificationForm, setIdentificationForm] = useState({
        comment: '',
        photo: null
    });

    // Fungsi pencarian
    const handleSearch = async (query) => {
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }
        
        try {
            const response = await apiFetch(`/kupunesia/fauna/search?q=${query}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            
            const data = await response.json();
            if (data.success) {
                setSearchResults(data.data);
            }
        } catch (error) {
            console.error('Error searching:', error);
            setSearchResults([]);
        }
    };

    // Komponen pencarian dan hasil
    const SearchPanel = () => (
        <div className="mb-4">
            <input
                type="text"
                placeholder="Cari spesies..."
                className="w-full p-2 border rounded"
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                }}
            />
            {searchResults.length > 0 && (
                <div className="mt-2 border rounded max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                        <div
                            key={result.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                                setSelectedTaxon(result);
                                setSearchResults([]);
                                setSearchQuery('');
                            }}
                        >
                            <div className="font-semibold">
                                {result.scientific_name || result.nameLat}
                            </div>
                            <div className="text-sm text-gray-600">
                                {result.cname_species || result.nameId}
                            </div>
                            <div className="text-xs text-gray-500">
                                Sumber: {result.source}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {selectedTaxon && (
                <div className="mt-2 p-2 bg-purple-100 rounded">
                    <div className="font-semibold">
                        Takson Terpilih: {selectedTaxon.scientific_name || selectedTaxon.nameLat}
                    </div>
                    <div className="text-sm">
                        {selectedTaxon.cname_species || selectedTaxon.nameId}
                    </div>
                </div>
            )}
        </div>
    );

    const tabs = [
        {
            name: 'Media',
            icon: faImage,
            component: <KupunesiaMediaViewer checklist={checklist} />
        },
        {
            name: 'Peta',
            icon: faMap,
            component: <KupunesiaChecklistMap checklist={checklist} />
        },
        {
            name: 'Identifikasi',
            icon: faClipboardCheck,
            component: (
                <div>
                    <SearchPanel />
                    <KupunesiaIdentificationPanel 
                        checklist={checklist}
                        identifications={checklist.identifications}
                        user={user}
                        selectedTaxon={selectedTaxon}
                        onAgree={(id) => console.log('Agree with ID:', id)}
                        onWithdraw={(id) => console.log('Withdraw ID:', id)}
                        onAddIdentification={(data) => {
                            if (!selectedTaxon) {
                                alert('Silakan pilih takson terlebih dahulu');
                                return;
                            }
                            console.log('Add identification:', {
                                ...data,
                                kupnes_fauna_id: selectedTaxon.id
                            });
                        }}
                    />
                </div>
            )
        },
        {
            name: 'Kualitas',
            icon: faCheckDouble,
            component: (
                <KupunesiaQualityAssessment 
                    checklist={checklist}
                    qualityAssessment={checklist.quality_assessment}
                />
            )
        },
        {
            name: 'Verifikasi Lokasi',
            icon: faMapMarkerAlt,
            component: (
                <KupunesiaLocationVerificationPanel
                    checklist={checklist}
                    verifications={checklist.location_verifications}
                    user={user}
                    onVerify={(data) => console.log('Verify location:', data)}
                />
            )
        },
        {
            name: 'Status Liar',
            icon: faPaw,
            component: (
                <KupunesiaWildStatusPanel
                    checklist={checklist}
                    votes={checklist.wild_status_votes}
                    user={user}
                    onVote={(data) => console.log('Vote wild status:', data)}
                />
            )
        }
    ];

    return (
        <div className="w-full px-2 py-4 sm:px-0">
            <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
                <Tab.List className="flex space-x-1 rounded-xl bg-purple-900/20 p-1">
                    {tabs.map((tab) => (
                        <Tab
                            key={tab.name}
                            className={({ selected }) =>
                                classNames(
                                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-purple-400 focus:outline-none focus:ring-2',
                                    selected
                                        ? 'bg-white shadow text-purple-700'
                                        : 'text-purple-100 hover:bg-white/[0.12] hover:text-white'
                                )
                            }
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <FontAwesomeIcon icon={tab.icon} />
                                <span className="hidden sm:block">{tab.name}</span>
                            </div>
                        </Tab>
                    ))}
                </Tab.List>
                <Tab.Panels className="mt-2">
                    {tabs.map((tab, idx) => (
                        <Tab.Panel
                            key={idx}
                            className={classNames(
                                'rounded-xl bg-white p-3',
                                'ring-white ring-opacity-60 ring-offset-2 ring-offset-purple-400 focus:outline-none focus:ring-2'
                            )}
                        >
                            {tab.component}
                        </Tab.Panel>
                    ))}
                </Tab.Panels>
            </Tab.Group>
        </div>
    );
}

export default TabPanelKupunesia;
