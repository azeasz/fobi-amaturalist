import React from 'react';

const LoadingState = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-200" />
                    <div className="p-4">
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                        <div className="space-y-3">
                            <div className="h-4 bg-gray-200 rounded" />
                            <div className="h-4 bg-gray-200 rounded" />
                            <div className="h-4 bg-gray-200 rounded w-5/6" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LoadingState;