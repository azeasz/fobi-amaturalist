import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faLeaf, 
    faLink, 
    faDove, 
    faInfoCircle,
    faFeather,
    faHome
} from '@fortawesome/free-solid-svg-icons';

function BurungnesiaWildStatusPanel({
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
        confidence_level: 'high'
    });

    const behaviorIndicators = [
        'Mencari makan secara alami',
        'Interaksi dengan burung liar lain',
        'Perilaku teritorial',
        'Membuat sarang',
        'Migrasi/pergerakan alami'
    ];

    const physicalIndicators = [
        'Bulu lengkap dan alami',
        'Tidak ada cincin atau tag',
        'Tidak ada tanda-tanda pemeliharaan',
        'Ukuran dan bentuk tubuh normal'
    ];

    const handleSubmitVote = async (e) => {
        e.preventDefault();
        await onVote({
            observation_id: checklist.id,
            observation_type: 'burungnesia',
            ...voteForm
        });
        setShowVoteForm(false);
        setVoteForm({
            is_wild: true,
            behavior_notes: '',
            physical_traits: '',
            environment_notes: '',
            confidence_level: 'high'
        });
    };

    const userHasVoted = votes.some(v => v.user_id === user?.id);
    const wildVotes = votes.filter(v => v.is_wild).length;
    const captiveVotes = votes.filter(v => !v.is_wild).length;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Status Liar/Budidaya Burung</h3>
                {!userHasVoted && (
                    <button
                        onClick={() => setShowVoteForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <FontAwesomeIcon icon={faBird} className="mr-2" />
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Status Burung
                            </label>
                            <div className="mt-2 space-x-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="wild_status"
                                        checked={voteForm.is_wild}
                                        onChange={() => setVoteForm({
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
                                        onChange={() => setVoteForm({
                                            ...voteForm,
                                            is_wild: false
                                        })}
                                        className="form-radio"
                                    />
                                    <span className="ml-2">Budidaya</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Indikator Perilaku
                            </label>
                            <div className="mt-2 space-y-2">
                                {behaviorIndicators.map((indicator, index) => (
                                    <label key={index} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            onChange={(e) => {
                                                const notes = e.target.checked
                                                    ? `${voteForm.behavior_notes}${voteForm.behavior_notes ? ', ' : ''}${indicator}`
                                                    : voteForm.behavior_notes.replace(`, ${indicator}`, '').replace(indicator, '');
                                                setVoteForm({
                                                    ...voteForm,
                                                    behavior_notes: notes
                                                });
                                            }}
                                        />
                                        <span className="ml-2 text-sm">{indicator}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Ciri Fisik
                            </label>
                            <div className="mt-2 space-y-2">
                                {physicalIndicators.map((indicator, index) => (
                                    <label key={index} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            onChange={(e) => {
                                                const traits = e.target.checked
                                                    ? `${voteForm.physical_traits}${voteForm.physical_traits ? ', ' : ''}${indicator}`
                                                    : voteForm.physical_traits.replace(`, ${indicator}`, '').replace(indicator, '');
                                                setVoteForm({
                                                    ...voteForm,
                                                    physical_traits: traits
                                                });
                                            }}
                                        />
                                        <span className="ml-2 text-sm">{indicator}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

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
                                            <FontAwesomeIcon icon={faDove} className="mr-2 text-gray-500" />
                                            Status: {vote.is_wild ? 'Liar' : 'Budidaya'}
                                        </p>
                                        {vote.behavior_notes && (
                                            <p className="text-sm flex items-start">
                                                <FontAwesomeIcon icon={faFeather} className="mr-2 mt-1 text-gray-500" />
                                                <span>Perilaku: {vote.behavior_notes}</span>
                                            </p>
                                        )}
                                        {vote.physical_traits && (
                                            <p className="text-sm flex items-start">
                                                <FontAwesomeIcon icon={faDove} className="mr-2 mt-1 text-gray-500" />
                                                <span>Ciri Fisik: {vote.physical_traits}</span>
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
                                    icon={vote.is_wild ? faLeaf : faLink}
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

export default BurungnesiaWildStatusPanel; 