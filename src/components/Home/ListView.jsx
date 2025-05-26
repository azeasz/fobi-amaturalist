import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faDove, faLocationDot, faQuestion, faCheck, faLink, faUsers } from '@fortawesome/free-solid-svg-icons';
import './ListView.css';
import { useNavigate } from 'react-router-dom';

const ListView = () => {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchObservations = async () => {
      try {
        setLoading(true);
        setError(null);

        const fetchPromises = [
          fetch(`${import.meta.env.VITE_API_URL}/general-observations`),
          fetch(`${import.meta.env.VITE_API_URL}/bird-observations`),
          fetch(`${import.meta.env.VITE_API_URL}/butterfly-observations`)
        ];

        const [generalResponse, birdResponse, butterflyResponse] = await Promise.all(
          fetchPromises.map(p => p.then(res => res.json()))
        );

        const combinedData = [
          ...(generalResponse?.data || []).map(item => ({
            ...item,
            type: 'general',
            name: item.cname_species || item.cname_genus || item.cname_family || item.cname_order || item.cname_tribe || item.family || item.genus || item.species || 'Tidak ada nama',
            details: `Family: ${item.family}\nGenus: ${item.genus}\nSpecies: ${item.species}`,
            fobi_count: item.fobi_count || 0,
          })),
          ...(birdResponse?.data || []).map(item => ({
            ...item,
            type: 'bird',
            name: item.nameId,
            details: `${item.nameLat}\n${item.family}`,
            fobi_count: item.fobi_count || 0,
            burungnesia_count: item.burungnesia_count || 0,
          })),
          ...(butterflyResponse?.data || []).map(item => ({
            ...item,
            type: 'butterfly',
            name: item.nameId,
            details: `${item.nameLat}\n${item.family}`,
            fobi_count: item.fobi_count || 0,
            kupunesia_count: item.kupunesia_count || 0,
          }))
        ];

        setObservations(combinedData);
      } catch (err) {
        setError(`Gagal mengambil data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchObservations();
  }, []);

  const getQualityLabel = (item) => {
    const qualityIndicators = [];

    if (item.has_media) {
      qualityIndicators.push(
        <FontAwesomeIcon
          key="media"
          icon={faImage}
          title="Has Media"
          className="text-gray-600"
        />
      );
    }
    if (item.is_wild) {
      qualityIndicators.push(
        <FontAwesomeIcon
          key="wild"
          icon={faDove}
          title="Wild"
          className="text-gray-600"
        />
      );
    }
    if (item.location_accurate) {
      qualityIndicators.push(
        <FontAwesomeIcon
          key="location"
          icon={faLocationDot}
          title="Location Accurate"
          className="text-gray-600"
        />
      );
    }
    if (item.needs_id) {
      qualityIndicators.push(
        <FontAwesomeIcon
          key="needs ID"
          icon={faQuestion}
          title="ID Kurang"
          className="text-gray-600"
        />
      );
    }
    if (item.type === 'general') {
      if (item.recent_evidence) {
        qualityIndicators.push(
          <FontAwesomeIcon
            key="recent"
            icon={faCheck}
            title="Recent Evidence"
            className="text-gray-600"
          />
        );
      }
      if (item.related_evidence) {
        qualityIndicators.push(
          <FontAwesomeIcon
            key="related"
            icon={faLink}
            title="Related Evidence"
            className="text-gray-600"
          />
        );
      }
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

  const getGradeClass = (grade) => {
    switch(grade.toLowerCase()) {
      case 'research grade':
        return 'bg-green-100 text-green-800';
      case 'low quality id':
        return 'bg-orange-100 text-orange-800';
      case 'needs id':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getGradeText = (grade) => {
    switch(grade.toLowerCase()) {
      case 'research grade':
        return 'ID Lengkap';
      case 'low quality id':
        return 'ID Kurang';
      case 'needs id':
        return 'Bantu Iden';
      case 'casual':
        return 'Casual';
      default:
        return grade;
    }
  };

  const handleRowClick = (item) => {
    let path;
    switch(item.type) {
      case 'bird':
        path = `/observations/BN${item.id}`;
        break;
      case 'butterfly':
        path = `/observations/KP${item.id}`;
        break;
      default:
        path = `/observations/${item.id}`;
    }
    navigate(path);
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
              <th>Jumlah observasi</th>
              <th>Tgl Observasi</th>
              <th>Informasi tambahan</th>
            </tr>
          </thead>
          <tbody>
            {observations.map((item, index) => (
              <tr
                key={index}
                onClick={() => handleRowClick(item)}
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
                  <strong>{item.name}</strong><br />
                  <span>{item.details}</span>
                </td>
                <td>{item.observer_name}</td>
                <td>
  <span className={`${getGradeClass(item.grade)} px-2 py-1 rounded-full text-xs`}>
    {getGradeText(item.grade)}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faUsers} className="text-gray-500" />
                    <span>Total Identifikasi: {item.identifications_count || 0}</span>
                    <span className="text-green-700">Cheklist FOBI: {item.fobi_count || 0}</span>
                    {item.type === 'bird' && (
                      <span className="text-blue-700">Cheklist Burungnesia: {item.burungnesia_count || 0}</span>
                    )}
                    {item.type === 'butterfly' && (
                      <span className="text-purple-700">Cheklist Kupunesia: {item.kupunesia_count || 0}</span>
                    )}
                  </div>
                </td>
                <td>{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                <td>{item.observation_details || item.notes || '-'}</td>
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
              onClick={() => handleRowClick(item)}
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
                    <h3 className="font-medium text-sm truncate">{item.name}</h3>
                    <p className="text-xs text-gray-600 truncate">{item.details}</p>
                  </div>
                  <span className={`grade ${getGradeClass(item.grade)} px-2 py-0.5 rounded-full text-xs flex-shrink-0`}>
                    {getGradeText(item.grade)}
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
                    <FontAwesomeIcon icon={faQuestion} className="text-gray-600 text-xs" title="ID Kurang" />
                  )}
                  {item.type === 'general' && item.recent_evidence && (
                    <FontAwesomeIcon icon={faCheck} className="text-gray-600 text-xs" title="Recent Evidence" />
                  )}
                  {item.type === 'general' && item.related_evidence && (
                    <FontAwesomeIcon icon={faLink} className="text-gray-600 text-xs" title="Related Evidence" />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUsers} className="text-gray-500" />
                      <span>Total Identifikasi: {item.identifications_count || 0}</span>
                    </span>
                    <span className="text-green-700">Cheklist FOBI: {item.fobi_count || 0}</span>
                    {item.type === 'bird' && (
                      <span className="text-blue-700">Cheklist Burungnesia: {item.burungnesia_count || 0}</span>
                    )}
                    {item.type === 'butterfly' && (
                      <span className="text-purple-700">Cheklist Kupunesia: {item.kupunesia_count || 0}</span>
                    )}
                  </div>
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

export default ListView;
