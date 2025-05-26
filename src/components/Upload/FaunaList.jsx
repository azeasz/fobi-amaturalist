import React from 'react';

function FaunaList({ faunas }) {
    return (
        <div>
            <h2>Daftar Burung</h2>
            <ul>
                {faunas.map((fauna, index) => (
                    <li key={index}>
                        {fauna.id} - {fauna.name} - {fauna.count} - {fauna.breeding ? 'Ya' : 'Tidak'}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default FaunaList;