import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faDove, faLocationDot, faQuestion, faCheck, faLink, faUsers } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../../utils/api';
import './ListView.css';
import { useNavigate } from 'react-router-dom';


const UserListView = () => {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserObservations = async () => {
      try {
        setLoading(true);
        const [generalResponse, birdResponse, butterflyResponse] = await Promise.all([
          apiFetch('/user-general-observations'),
          apiFetch('/user-bird-observations'),
          apiFetch('/user-butterfly-observations')
        ]);

        const generalData = await generalResponse.json();
        const birdData = await birdResponse.json();
        const butterflyData = await butterflyResponse.json();

        const combinedData = [
          ...generalData.data || [],
          ...birdData.data || [],
          ...butterflyData.data || []
        ];

        setObservations(combinedData);
      } catch (err) {
        console.error('Error:', err);
        setError('Gagal mengambil data observasi');
      } finally {
        setLoading(false);
      }
    };

    fetchUserObservations();
  }, []);

  const handleClick = (item) => {
    let path;
    switch(item.type) {
      case 'bird':
        path = `/burungnesia/observations/${item.id}`;
        break;
      case 'butterfly':
        path = `/kupunesia/observations/${item.id}`;
        break;
      default:
        path = `/observations/${item.id}`;
    }
    navigate(path);
  };

  const getGradeLabel = (grade) => {
    switch(grade) {
      case 'needs ID':
        return {
          text: 'Bantu Iden',
          className: 'bg-yellow-100 text-yellow-800 border border-yellow-300'
        };
      case 'low quality ID':
        return {
          text: 'ID Kurang',
          className: 'bg-orange-100 text-orange-800 border border-orange-300'
        };
      case 'research grade':
        return {
          text: 'ID Lengkap',
          className: 'bg-green-100 text-green-800 border border-green-300'
        };
      default:
        return {
          text: grade,
          className: 'bg-gray-100 text-gray-800 border border-gray-300'
        };
    }
  };


  const getQualityLabel = (item) => {
    const qualityIndicators = [];

    if (item.has_media) {
      qualityIndicators.push(
        <FontAwesomeIcon key="media" icon={faImage} title="Has Media" className="text-gray-600" />
      );
    }
    if (item.is_wild) {
      qualityIndicators.push(
        <FontAwesomeIcon key="wild" icon={faDove} title="Wild" className="text-gray-600" />
      );
    }
    if (item.location_accurate) {
      qualityIndicators.push(
        <FontAwesomeIcon key="location" icon={faLocationDot} title="Location Accurate" className="text-gray-600" />
      );
    }
    if (item.needs_id) {
      qualityIndicators.push(
        <FontAwesomeIcon key="needs_id" icon={faQuestion} title="Needs ID" className="text-gray-600" />
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`grade ${item.grade} px-2 py-1 rounded-full text-xs`}>
          {item.grade}
        </span>
        {qualityIndicators}
      </div>
    );
  };

  if (loading) return <div>Memuat data...</div>;
  if (error) return <div>{error}</div>;

  return (
    <>
      <div className="hidden md:block">
        <table className="list-view-table mt-12">
          <thead>
            <tr>
              <th>Verifikasi</th>
              <th>Nama</th>
              <th>Pengamat</th>
              <th>Kualitas</th>
              {/* <th>Jumlah observasi</th> */}
              <th>Tgl Observasi</th>
              <th>Informasi tambahan</th>
            </tr>
          </thead>
          <tbody>
            {observations.map((item, index) => (
              <tr
                key={index}
                onClick={() => handleClick(item)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td>
                  <img
                    src={item.images?.[0]?.url || '/default-image.jpg'}
                    alt={item.name}
                    className="thumbnail"
                  />
                </td>
                <td>
                  <strong>{item.nameId || item.scientific_name}</strong><br />
                  <span>{item.nameLat}<br/>{item.family}</span>
                </td>
                <td>{item.observer_name}</td>
                <td><span className={`grade ${getGradeLabel(item.grade).className} px-2 py-0.5 rounded-full text-xs flex-shrink-0`}>
                    {getGradeLabel(item.grade).text}
                  </span></td>
                {/* <td>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faUsers} className="text-gray-500" />
                    <span>{item.identifications_count || 0}</span>
                    <span className="text-green-700">{item.fobi_count || 0} FOBI</span>
                    {item.type === 'bird' && (
                      <span className="text-blue-700">{item.burungnesia_count || 0} Burungnesia</span>
                    )}
                    {item.type === 'butterfly' && (
                      <span className="text-purple-700">{item.kupunesia_count || 0} Kupunesia</span>
                    )}
                  </div>
                </td> */}
                <td>{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                <td>{item.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        <div className="space-y-2 px-2">
          {observations.map((item, index) => (
            <div
              key={index}
              onClick={() => handleClick(item)}
              className="bg-white rounded-lg shadow p-2 flex gap-3 cursor-pointer hover:shadow-md"
            >
              <div className="flex-shrink-0">
                <img
                  src={item.images?.[0]?.url || '/default-image.jpg'}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-medium text-sm truncate">{item.nameId || item.scientific_name}</h3>
                    <p className="text-xs text-gray-600 truncate">{item.nameLat}<br/>{item.family}</p>
                  </div>
                  <span className={`grade ${getGradeLabel(item.grade).className} px-2 py-0.5 rounded-full text-xs flex-shrink-0`}>
                    {getGradeLabel(item.grade).text}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-1">
                  Oleh: {item.observer_name}
                </p>

                <div className="flex flex-wrap gap-1 mb-1">
                  {item.has_media && (
                    <FontAwesomeIcon icon={faImage} className="text-gray-600 text-xs" title="Has Media" />
                  )}
                  {item.is_wild && (
                    <FontAwesomeIcon icon={faDove} className="text-gray-600 text-xs" title="Wild" />
                  )}
                  {item.location_accurate && (
                    <FontAwesomeIcon icon={faLocationDot} className="text-gray-600 text-xs" title="Location Accurate" />
                  )}
                  {item.needs_id && (
                    <FontAwesomeIcon icon={faQuestion} className="text-gray-600 text-xs" title="Needs ID" />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  {/* <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUsers} className="text-gray-500" />
                      <span>{item.identifications_count || 0}</span>
                    </span>
                    <span className="text-green-700">{item.fobi_count || 0} FOBI</span>
                    {item.type === 'bird' && (
                      <span className="text-blue-700">{item.burungnesia_count || 0} Burungnesia</span>
                    )}
                    {item.type === 'butterfly' && (
                      <span className="text-purple-700">{item.kupunesia_count || 0} Kupunesia</span>
                    )}
                  </div> */}
                  <span className="text-gray-500">
                    {new Date(item.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default UserListView;
