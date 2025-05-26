import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faLeaf, 
    faMosquito, 
    faInfoCircle,
    faHome,
    faSearch
} from '@fortawesome/free-solid-svg-icons';

function KupunesiaWildStatusPanel({
    checklist,
    votes,
    user,
    onVote
}) {
    const [showVoteForm, setShowVoteForm] = useState(false);
    const [voteForm, setVoteForm] = useState({
        is_wild: true,
        behavior_notes: '',
        physical_traits: '',
        environment_notes: '',
        breeding_evidence: '',
        wing_condition: '',
        confidence_level: 'high'
    });

    const behaviorIndicators = [
        'Terbang bebas',
        'Mencari nektar',
        'Bertelur pada tanaman inang',
        'Interaksi dengan kupu-kupu lain',
        'Perilaku kawin',
        'Perilaku teritorial'
    ];

    const physicalTraits = [
        'Sayap utuh dan simetris',
        'Warna sayap cerah/alami',
        'Ukuran tubuh normal',
        'Tidak ada tanda penangkaran',
        'Pola sayap alami'
    ];

    const wingConditions = [
        { value: 'perfect', label: 'Sempurna' },
        { value: 'slightly_worn', label: 'Sedikit Aus' },
        { value: 'worn', label: 'Aus' },
        { value: 'damaged', label: 'Rusak' }
    ];

    const breedingEvidence = [
        'Telur pada tanaman inang',
        'Ulat pada tanaman inang',
        'Kepompong alami',
        'Kupu-kupu baru menetas'
    ];

    const handleSubmitVote = async (e) => {
        e.preventDefault();
        await onVote({
            observation_id: checklist.id,
            observation_type: 'kupunesia',
            ...voteForm
        });
        setShowVoteForm(false);
        setVoteForm({
            is_wild: true,
            behavior_notes: '',
            physical_traits: '',
            environment_notes: '',
            breeding_evidence: '',
            wing_condition: '',
            confidence_level: 'high'
        });
    };

    const userHasVoted = votes.some(v => v.user_id === user?.id);
    const wildVotes = votes.filter(v => v.is_wild).length;
    const captiveVotes = votes.filter(v => !v.is_wild).length;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Status Liar/Budidaya Kupu-kupu</h3>
                {!userHasVoted && (
                    <button
                        onClick={() => setShowVoteForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <FontAwesomeIcon icon={faButterfly} className="mr-2" />
                        Tambah Vote
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{wildVotes}</div>
                    <div className="flex items-center justify-center text-green-600">
                        <FontAwesomeIcon icon={faLeaf} className="mr-2" />
                        <span>Liar</span>
                    </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{captiveVotes}</div>
                    <div className="flex items-center justify-center text-blue-600">
                        <FontAwesomeIcon icon={faCage} className="mr-2" />
                        <span>Budidaya</span>
                    </div>
                </div>
            </div>

            {showVoteForm && (
                <form onSubmit={handleSubmitVote} className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-4">
                        {/* Status Kupu-kupu */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Status Kupu-kupu
                            </label>
                            <div className="mt-2 space-x-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="wild_status"
                                        checked={voteForm.is_wild}
                                        onChange={() => setVerificationForm({
                                            ...voteForm,
                                            is_wild: true
                                        })}
                                        className="form-radio"
                                    />
                                    <span className="ml-2">Liar</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="wild_status"
                                        checked={!voteForm.is_wild}
                                        onChange={() => setVerificationForm({
                                            ...voteForm,
                                            is_wild: false
                                        })}
                                        className="form-radio"
                                    />
                                    <span className="ml-2">Budidaya</span>
                                </label>
                            </div>
                        </div>

                        {/* Kondisi Sayap */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Kondisi Sayap
                            </label>
                            <select
                                value={voteForm.wing_condition}
                                onChange={(e) => setVoteForm({
                                    ...voteForm,
                                    wing_condition: e.target.value
                                })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Pilih kondisi sayap...</option>
                                {wingConditions.map(condition => (
                                    <option key={condition.value} value={condition.value}>
                                        {condition.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Indikator Perilaku */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Indikator Perilaku
                            </label>
                            <div className="space-y-2">
                                {behaviorIndicators.map((indicator) => (
                                    <label key={indicator} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={voteForm.behavior_notes.includes(indicator)}
                                            onChange={(e) => {
                                                const behaviors = e.target.checked
                                                    ? `${voteForm.behavior_notes}${voteForm.behavior_notes ? ', ' : ''}${indicator}`
                                                    : voteForm.behavior_notes.replace(`, ${indicator}`, '').replace(indicator, '');
                                                setVoteForm({
                                                    ...voteForm,
                                                    behavior_notes: behaviors
                                                });
                                            }}
                                            className="form-checkbox"
                                        />
                                        <span className="ml-2 text-sm">{indicator}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Ciri Fisik */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ciri Fisik
                            </label>
                            <div className="space-y-2">
                                {physicalTraits.map((trait) => (
                                    <label key={trait} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={voteForm.physical_traits.includes(trait)}
                                            onChange={(e) => {
                                                const traits = e.target.checked
                                                    ? `${voteForm.physical_traits}${voteForm.physical_traits ? ', ' : ''}${trait}`
                                                    : voteForm.physical_traits.replace(`, ${trait}`, '').replace(trait, '');
                                                setVoteForm({
                                                    ...voteForm,
                                                    physical_traits: traits
                                                });
                                            }}
                                            className="form-checkbox"
                                        />
                                        <span className="ml-2 text-sm">{trait}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Bukti Perkembangbiakan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bukti Perkembangbiakan
                            </label>
                            <div className="space-y-2">
                                {breedingEvidence.map((evidence) => (
                                    <label key={evidence} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={voteForm.breeding_evidence.includes(evidence)}
                                            onChange={(e) => {
                                                const evidences = e.target.checked
                                                    ? `${voteForm.breeding_evidence}${voteForm.breeding_evidence ? ', ' : ''}${evidence}`
                                                    : voteForm.breeding_evidence.replace(`, ${evidence}`, '').replace(evidence, '');
                                                setVoteForm({
                                                    ...voteForm,
                                                    breeding_evidence: evidences
                                                });
                                            }}
                                            className="form-checkbox"
                                        />
                                        <span className="ml-2 text-sm">{evidence}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Catatan Lingkungan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Catatan Lingkungan
                            </label>
                            <textarea
                                value={voteForm.environment_notes}
                                onChange={(e) => setVoteForm({
                                    ...voteForm,
                                    environment_notes: e.target.value
                                })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                rows="3"
                                placeholder="Deskripsikan kondisi lingkungan sekitar..."
                            />
                        </div>

                        {/* Tingkat Keyakinan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Tingkat Keyakinan
                            </label>
                            <select
                                value={voteForm.confidence_level}
                                onChange={(e) => setVoteForm({
                                    ...voteForm,
                                    confidence_level: e.target.value
                                })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="high">Sangat Yakin</option>
                                <option value="medium">Cukup Yakin</option>
                                <option value="low">Kurang Yakin</option>
                            </select>
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setShowVoteForm(false)}
                                className="px-4 py-2 border rounded-md hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Kirim Vote
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Daftar Vote */}
            {votes.length === 0 ? (
                <p className="text-gray-500">Belum ada vote status liar/budidaya</p>
            ) : (
                <div className="space-y-4">
                    {votes.map((vote) => (
                        <div key={vote.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold">{vote.user_name}</p>
                                    <p className="text-sm text-gray-600">
                                        {new Date(vote.created_at).toLocaleDateString('id-ID')}
                                    </p>
                                    <div className="mt-2 space-y-2">
                                        <p className="text-sm flex items-center">
                                            <FontAwesomeIcon icon={faButterfly} className="mr-2 text-gray-500" />
                                            Status: {vote.is_wild ? 'Liar' : 'Budidaya'}
                                        </p>
                                        {vote.wing_condition && (
                                            <p className="text-sm flex items-center">
                                                <FontAwesomeIcon icon={faWings} className="mr-2 text-gray-500" />
                                                Kondisi Sayap: {wingConditions.find(c => c.value === vote.wing_condition)?.label}
                                            </p>
                                        )}
                                        {vote.behavior_notes && (
                                            <p className="text-sm flex items-start">
                                                <FontAwesomeIcon icon={faSearch} className="mr-2 mt-1 text-gray-500" />
                                                <span>Perilaku: {vote.behavior_notes}</span>
                                            </p>
                                        )}
                                        {vote.physical_traits && (
                                            <p className="text-sm flex items-start">
                                                <FontAwesomeIcon icon={faButterfly} className="mr-2 mt-1 text-gray-500" />
                                                <span>Ciri Fisik: {vote.physical_traits}</span>
                                            </p>
                                        )}
                                        {vote.breeding_evidence && (
                                            <p className="text-sm flex items-start">
                                                <FontAwesomeIcon icon={faLeaf} className="mr-2 mt-1 text-gray-500" />
                                                <span>Bukti Perkembangbiakan: {vote.breeding_evidence}</span>
                                            </p>
                                        )}
                                        {vote.environment_notes && (
                                            <p className="text-sm flex items-start">
                                                <FontAwesomeIcon icon={faHome} className="mr-2 mt-1 text-gray-500" />
                                                <span>Lingkungan: {vote.environment_notes}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <FontAwesomeIcon
                                    icon={vote.is_wild ? faLeaf : faCage}
                                    className={vote.is_wild ? 'text-green-500' : 'text-blue-500'}
                                    size="lg"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default KupunesiaWildStatusPanel; 