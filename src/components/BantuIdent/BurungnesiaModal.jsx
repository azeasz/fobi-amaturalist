import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faCalendar, faUser, faTag, faComment } from '@fortawesome/free-solid-svg-icons';

const BurungnesiaModal = ({ isOpen, onClose, observation }) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-[9999]"
                onClose={onClose}
            >
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                {observation && (
                                    <div className="space-y-6">
                                        {/* Header */}
                                        <div className="border-b pb-4">
                                            <h3 className="text-2xl font-bold text-gray-900">
                                                {observation.title || observation.scientific_name}
                                            </h3>
                                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                                                    {observation.observer_name}
                                                </div>
                                                <div className="flex items-center">
                                                    <FontAwesomeIcon icon={faCalendar} className="mr-2" />
                                                    {new Date(observation.created_at).toLocaleDateString('id-ID')}
                                                </div>
                                                <div className="flex items-center">
                                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                                                    {observation.location || 'Lokasi tidak tersedia'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Media dan Peta */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Media Viewer */}
                                            <div className="space-y-4">
                                                <h4 className="font-semibold text-lg">Media</h4>
                                                {observation.images && observation.images.length > 0 ? (
                                                    <div className="aspect-square rounded-lg overflow-hidden">
                                                        <img 
                                                            src={observation.images[0]} 
                                                            alt={observation.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                                        <p className="text-gray-500">Tidak ada media</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Peta */}
                                            <div className="space-y-4">
                                                <h4 className="font-semibold text-lg">Lokasi</h4>
                                                {observation.latitude && observation.longitude ? (
                                                    <div className="aspect-square bg-gray-100 rounded-lg">
                                                        {/* Implementasi peta di sini */}
                                                    </div>
                                                ) : (
                                                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                                        <p className="text-gray-500">Lokasi tidak tersedia</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Detail Taksonomi */}
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-lg">Detail Taksonomi</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="font-medium">Kingdom</p>
                                                    <p className="text-gray-600">{observation.kingdom || 'Tidak tersedia'}</p>
                                                </div>
                                                <div>
                                                    <p className="font-medium">Family</p>
                                                    <p className="text-gray-600">{observation.family || 'Tidak tersedia'}</p>
                                                </div>
                                                <div>
                                                    <p className="font-medium">Genus</p>
                                                    <p className="text-gray-600">{observation.genus || 'Tidak tersedia'}</p>
                                                </div>
                                                <div>
                                                    <p className="font-medium">Species</p>
                                                    <p className="text-gray-600">{observation.species || 'Tidak tersedia'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quality Grade */}
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-lg">Quality Grade</h4>
                                                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium
                                                    ${observation.quality_grade === 'research grade' ? 'bg-green-100 text-green-800' :
                                                      observation.quality_grade === 'needs ID' ? 'bg-yellow-100 text-yellow-800' :
                                                      'bg-gray-100 text-gray-800'}`}>
                                                    {observation.quality_grade === 'research grade' ? 'Research Grade' :
                                                     observation.quality_grade === 'needs ID' ? 'Needs ID' :
                                                     'Casual'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={onClose}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                            >
                                                Tutup
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default BurungnesiaModal; 