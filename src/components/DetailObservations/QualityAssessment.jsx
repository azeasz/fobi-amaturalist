import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faInfoCircle,
    faCalendar,
    faMapMarkerAlt,
    faCamera,
    faUsers,
    faPaw,
    faMapMarked,
    faClock,
    faLink,
    faThumbsUp,
    faThumbsDown,
    faFeatherPointed,
    faHammer
} from '@fortawesome/free-solid-svg-icons';

function QualityAssessment({
    checklist,
    qualityAssessment,
    identifications,
    handleQualityAssessmentChange,
    handleImprovementChange
}) {
    const getQualityGradeClass = (grade) => {
        switch(grade) {
            case 'research grade':
                return 'bg-green-200 text-green-800';
            case 'needs ID':
                return 'bg-yellow-200 text-yellow-800';
            case 'low quality ID':
                return 'bg-orange-200 text-orange-800';
            default:
                return 'bg-gray-200 text-gray-800';
        }
    };

    const criteriaItems = [
        { key: 'has_date', label: 'Tanggal ditentukan', icon: faCalendar, readonly: true },
        { key: 'has_location', label: 'Lokasi ditentukan', icon: faMapMarkerAlt, readonly: true },
        { key: 'has_media', label: 'Memiliki Foto atau Suara', icon: faCamera, readonly: true },
        {
            key: 'multiple_ids',
            label: 'Memiliki ID yang didukung dua atau lebih',
            icon: faUsers,
            readonly: true,
            // Menggunakan agreement_count dari checklist
            value: checklist?.agreement_count >= 2
        },
                {
            key: 'community_taxon',
            label: 'Takson komunitas di level spesies atau lebih rendah',
            icon: faFeatherPointed,
            readonly: true,
            value: qualityAssessment?.community_id_level &&
                   ['species', 'subspecies', 'variety', 'form', 'hybrid'].includes(
                       qualityAssessment.community_id_level.toLowerCase()
                   )
        },
        { key: 'is_wild', label: 'Organisme liar', icon: faPaw },
        { key: 'location_accurate', label: 'Lokasi akurat', icon: faMapMarked },
        { key: 'recent_evidence', label: 'Bukti terbaru dari organisme', icon: faClock },
        { key: 'related_evidence', label: 'Bukti terkait dengan satu subjek', icon: faLink }
    ];

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-5 mb-6">
            {/* <h2 className="text-xl font-semibold mb-4 flex items-center">
                Penilaian Kualitas Data
                <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="ml-2 text-gray-500 cursor-help"
                    title="Kriteria penilaian kualitas"
                />
            </h2>

            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Grade Kualitas: </span>
                    <span className={`px-3 py-1 rounded ${getQualityGradeClass(checklist?.quality_grade)}`}>
                        {checklist?.quality_grade === 'research grade' ? 'ID Lengkap' :
                         checklist?.quality_grade === 'needs ID' ? 'Bantu Iden' :
                         checklist?.quality_grade === 'low quality ID' ? 'ID Kurang' :
                         'Casual'}
                    </span>
                </div>

            </div>

            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                    Item berikut diperlukan untuk mencapai ID Lengkap:
                </p>
            </div>

            <table className="w-full">
                <tbody>
                    {criteriaItems.map(({ key, label, icon, readonly, value }) => (
                        <tr key={key}>
                            <td className="py-2">
                                <span className="flex items-center">
                                    <FontAwesomeIcon icon={icon} className="mr-2" />
                                    {label}
                                </span>
                            </td>
                            <td className="text-center">
                                {readonly ? (
                                    <input
                                        type="checkbox"
                                        checked={value !== undefined ? value : qualityAssessment[key]}
                                        disabled
                                        className="w-4 h-4"
                                    />
                                ) : (
                                    <div className="flex justify-center space-x-4">
                                        <button
                                            onClick={() => handleQualityAssessmentChange(key, true)}
                                            className={`p-1 rounded ${qualityAssessment[key] === true ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                                        >
                                            <FontAwesomeIcon icon={faThumbsUp} />
                                        </button>
                                        <button
                                            onClick={() => handleQualityAssessmentChange(key, false)}
                                            className={`p-1 rounded ${qualityAssessment[key] === false ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                                        >
                                            <FontAwesomeIcon icon={faThumbsDown} />
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table> */}

            <div className="mt-6 pt-4 border-t">
                <h3 className="font-semibold mb-2"> <FontAwesomeIcon icon={faHammer} /> Berdasarkan bukti, apakah Takson Komunitas masih dapat dikonfirmasi atau ditingkatkan?</h3>
                <div className="flex space-x-4">
                    <button
                        onClick={() => handleImprovementChange(true)}
                        className={`px-4 py-2 rounded ${
                            qualityAssessment.can_be_improved === true
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200'
                        }`}
                    >
                        Ya
                    </button>
                    <button
                        onClick={() => handleImprovementChange(false)}
                        className={`px-4 py-2 rounded ${
                            qualityAssessment.can_be_improved === false
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200'
                        }`}
                    >
                        Tidak, ini sudah sebaik yang seharusnya
                    </button>
                </div>
            </div>
        </div>
    );
}

export default QualityAssessment;
