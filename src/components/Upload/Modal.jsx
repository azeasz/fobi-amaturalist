import React from 'react';

function Modal({ newFauna, setNewFauna, addFauna, fetchFaunaId, closeModal }) {
    return (
        <div className="modal">
            <div className="modal-content">
                <span onClick={closeModal} className="close">&times;</span>
                <h2>Tambah Jenis Burung</h2>
                <form onSubmit={(e) => { e.preventDefault(); addFauna(); }}>
                    <input
                        type="text"
                        value={newFauna.name}
                        onChange={(e) => setNewFauna({ ...newFauna, name: e.target.value })}
                        onBlur={() => fetchFaunaId()}
                        placeholder="Jenis burung"
                        required
                    />
                    <input
                        type="number"
                        value={newFauna.count}
                        onChange={(e) => setNewFauna({ ...newFauna, count: e.target.value })}
                        placeholder="Jumlah individu"
                        required
                    />
                    <input
                        type="text"
                        value={newFauna.notes}
                        onChange={(e) => setNewFauna({ ...newFauna, notes: e.target.value })}
                        placeholder="Catatan"
                    />
                    <label>
                        Apakah berbiak?
                        <input
                            type="checkbox"
                            checked={newFauna.breeding}
                            onChange={(e) => setNewFauna({ ...newFauna, breeding: e.target.checked })}
                        />
                    </label>
                    <button type="submit">Simpan</button>
                </form>
            </div>
        </div>
    );
}

export default Modal;