const ObservationCard = ({ observation, onClick }) => {
    const getGradeDisplay = (grade) => {
        switch(grade.toLowerCase()) {
            case 'needs id':
                return 'Bantu Iden';
            case 'low quality id':
                return 'ID Kurang';
            default:
                return 'Casual';
        }
    };

    return (
        <div className="card bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer" 
             onClick={onClick}>
            <div className="h-48 bg-gray-200">
                <img 
                    src={observation.images?.[0]?.url || '/default-image.jpg'} 
                    alt="" 
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-600">{observation.observer}</span>
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${
                        observation.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-500' :
                        observation.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-500' :
                        'bg-gray-500'
                    }`}>
                        {getGradeDisplay(observation.quality.grade)}
                    </span>
                </div>

                <h5 className="font-medium text-lg mb-2">{observation.title}</h5>

                <div className="flex items-center justify-between mt-4">
                    <div className="quality-indicators flex gap-2 text-gray-600">
                        {observation.quality.has_media && 
                            <FontAwesomeIcon icon={faImage} title="Has Media" />}
                        {observation.quality.is_wild && 
                            <FontAwesomeIcon icon={faDove} title="Wild" />}
                        {observation.quality.location_accurate && 
                            <FontAwesomeIcon icon={faLocationDot} title="Location Accurate" />}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <FontAwesomeIcon icon={faUsers} />
                        <span>{observation.identifications_count || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};