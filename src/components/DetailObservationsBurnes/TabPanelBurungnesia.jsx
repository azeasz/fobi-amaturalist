import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faImage, 
    faMap, 
    faClipboardCheck, 
    faCheckDouble,
    faMapMarkerAlt,
    faDove
} from '@fortawesome/free-solid-svg-icons';

import BurungnesiaMediaViewer from './BurungnesiaMediaViewer';
import BurungnesiaChecklistMap from './BurungnesiaChecklistMap';
import BurungnesiaIdentificationPanel from './BurungnesiaIdentificationPanel';
import BurungnesiaQualityAssessment from './BurungnesiaQualityAssessment';
import BurungnesiaLocationVerificationPanel from './BurungnesiaLocationVerificationPanel';
import BurungnesiaWildStatusPanel from './BurungnesiaWildStatusPanel';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

function TabPanelBurungnesia({ checklist, user }) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const tabs = [
        {
            name: 'Media',
            icon: faImage,
            component: <BurungnesiaMediaViewer checklist={checklist} />
        },
        {
            name: 'Peta',
            icon: faMap,
            component: <BurungnesiaChecklistMap checklist={checklist} />
        },
        {
            name: 'Identifikasi',
            icon: faClipboardCheck,
            component: (
                <BurungnesiaIdentificationPanel 
                    checklist={checklist}
                    identifications={checklist.identifications}
                    user={user}
                    onAgree={(id) => console.log('Agree with ID:', id)}
                    onWithdraw={(id) => console.log('Withdraw ID:', id)}
                    onAddIdentification={(data) => console.log('Add identification:', data)}
                />
            )
        },
        {
            name: 'Kualitas',
            icon: faCheckDouble,
            component: (
                <BurungnesiaQualityAssessment 
                    checklist={checklist}
                    qualityAssessment={checklist.quality_assessment}
                />
            )
        },
        {
            name: 'Verifikasi Lokasi',
            icon: faMapMarkerAlt,
            component: (
                <BurungnesiaLocationVerificationPanel
                    checklist={checklist}
                    verifications={checklist.location_verifications}
                    user={user}
                    onVerify={(data) => console.log('Verify location:', data)}
                />
            )
        },
        {
            name: 'Status Liar',
            icon: faDove,
            component: (
                <BurungnesiaWildStatusPanel
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
                <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                    {tabs.map((tab) => (
                        <Tab
                            key={tab.name}
                            className={({ selected }) =>
                                classNames(
                                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                    selected
                                        ? 'bg-white shadow text-blue-700'
                                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
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
                                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
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

export default TabPanelBurungnesia;