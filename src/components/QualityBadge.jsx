const QualityBadge = ({ grade }) => {
    const getBadgeColor = () => {
        switch (grade) {
            case 'research grade':
                return 'bg-green-500';
            case 'needs ID':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <span className={`${getBadgeColor()} text-white px-2 py-1 rounded-full text-sm`}>
            {grade}
        </span>
    );
};

export default QualityBadge;