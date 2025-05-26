import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faPaw } from '@fortawesome/free-solid-svg-icons';

function WildStatusPanel({
    checklist,
    votes,
    user,
    onVote,
    observationType
}) {
    const [showVoteForm, setShowVoteForm] = useState(false);
    const [isWild, setIsWild] = useState(true);
    const [voteNote, setVoteNote] = useState('');

    const handleSubmitVote = (e) => {
        e.preventDefault();
        onVote({
            observation_id: checklist.id,
            observation_type: observationType,
            is_wild: isWild,
            notes: voteNote
        });
        setShowVoteForm(false);
        setVoteNote('');
    };

    const userHasVoted = votes.some(v => v.user_id === user?.id);
    const wildVotes = votes.filter(v => v.is_wild).length;
    const captiveVotes = votes.filter(v => !v.is_wild).length;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Status Liar/Budidaya</h3>
                {!userHasVoted && (
                    <button
                        onClick={() => setShowVoteForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Tambah Vote
                    </button>
                )}
            </div>

            <div className="flex justify-around p-4 bg-gray-50 rounded-lg mb-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{wildVotes}</div>
                    <div className="text-sm text-gray-600">Liar</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{captiveVotes}</div>
                    <div className="text-sm text-gray-600">Budidaya</div>
                </div>
            </div>

            {showVoteForm && (
                <form onSubmit={handleSubmitVote} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <div className="mt-2 space-x-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="wild_status"
                                    checked={isWild}
                                    onChange={() => setIsWild(true)}
                                    className="form-radio"
                                />
                                <span className="ml-2">Liar</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="wild_status"
                                    checked={!isWild}
                                    onChange={() => setIsWild(false)}
                                    className="form-radio"
                                />
                                <span className="ml-2">Budidaya</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Catatan</label>
                        <textarea
                            value={voteNote}
                            onChange={(e) => setVoteNote(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            rows="3"
                        />
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
                            Kirim
                        </button>
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
                                </div>
                                <FontAwesomeIcon
                                    icon={vote.is_wild ? faLeaf : faPaw}
                                    className={vote.is_wild ? 'text-green-500' : 'text-blue-500'}
                                    size="lg"
                                />
                            </div>
                            {vote.notes && (
                                <p className="mt-2 text-gray-700">{vote.notes}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default WildStatusPanel; 