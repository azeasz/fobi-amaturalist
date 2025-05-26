import React, { useState } from 'react';
import SearchFilter from './SearchFilter';
import ObservationList from './ObservationList';
import LoadingState from './LoadingState';

const Home = () => {
    const [observations, setObservations] = useState([]);
    const [dataType, setDataType] = useState('general');
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async (results) => {
        setIsLoading(true);
        try {
            setObservations(results.data);
        } catch (error) {
            console.error('Error handling search results:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex gap-4 mb-4">
                    <button
                        className={`px-4 py-2 rounded ${
                            dataType === 'general' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}
                        onClick={() => setDataType('general')}
                    >
                        Semua Taxa
                    </button>
                    <button
                        className={`px-4 py-2 rounded ${
                            dataType === 'birds' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}
                        onClick={() => setDataType('birds')}
                    >
                        Burung
                    </button>
                    <button
                        className={`px-4 py-2 rounded ${
                            dataType === 'butterflies' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}
                        onClick={() => setDataType('butterflies')}
                    >
                        Kupu-kupu
                    </button>
                </div>
                <SearchFilter onSearch={handleSearch} dataType={dataType} />
            </div>
            {isLoading ? (
                <LoadingState />
            ) : (
                <ObservationList observations={observations} dataType={dataType} />
            )}
        </div>
    );
};

export default Home;