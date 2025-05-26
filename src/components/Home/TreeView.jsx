import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronRight, 
  faChevronDown,
  faImage,
  faMusic,
  faLocationDot,
  faCalendarAlt,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import './TreeView.css';

const TreeView = () => {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchTreeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ambil parameter pencarian dari URL
        const species = searchParams.get('species') || '';
        const location = searchParams.get('location') || '';
        const mediaType = searchParams.get('media_type') || '';
        const grade = searchParams.get('grade') || '';
        const dataSource = searchParams.get('data_source') || '';

        const queryString = new URLSearchParams({
          species,
          location,
          media_type: mediaType,
          grade,
          data_source: dataSource
        }).toString();

        const fetchPromises = [
          fetch(`http://localhost:8000/api/general-observations/taxonomy?${queryString}`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error fetching general taxonomy:', err);
              return { data: [] };
            }),
          fetch(`http://localhost:8000/api/bird-observations/taxonomy?${queryString}`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error fetching bird taxonomy:', err);
              return { data: [] };
            }),
          fetch(`http://localhost:8000/api/butterfly-observations/taxonomy?${queryString}`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error fetching butterfly taxonomy:', err);
              return { data: [] };
            })
        ];

        const [generalTaxonomy, birdTaxonomy, butterflyTaxonomy] = await Promise.all(fetchPromises);

        // Gabungkan dan format data taksonomi
        let combinedTaxonomy = [];
        if (!dataSource || dataSource === 'fobi') {
          combinedTaxonomy = [...formatTaxonomyData(generalTaxonomy.data, 'general')];
        }
        if (!dataSource || dataSource === 'burungnesia') {
          combinedTaxonomy = [...combinedTaxonomy, ...formatTaxonomyData(birdTaxonomy.data, 'bird')];
        }
        if (!dataSource || dataSource === 'kupunesia') {
          combinedTaxonomy = [...combinedTaxonomy, ...formatTaxonomyData(butterflyTaxonomy.data, 'butterfly')];
        }

        setTreeData(combinedTaxonomy);
      } catch (err) {
        console.error('Error utama:', err);
        setError(`Gagal mengambil data taksonomi: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTreeData();
  }, [searchParams]);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderTreeNode = (node, level = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="tree-node" style={{ marginLeft: `${level * 20}px` }}>
        <div 
          className="node-content"
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren && (
            <FontAwesomeIcon 
              icon={isExpanded ? faChevronDown : faChevronRight}
              className="mr-2"
            />
          )}
          <span className="node-label">
            {node.name}
            {node.count > 0 && (
              <span className="count-badge">({node.count})</span>
            )}
          </span>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="children">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-4">Memuat data taksonomi...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="tree-view-container p-4">
      <div className="tree-header mb-4">
        <h2 className="text-xl font-semibold">Taksonomi</h2>
        <p className="text-sm text-gray-600">
          Klik pada panah untuk memperluas/menyembunyikan kategori
        </p>
      </div>
      
      {treeData.length === 0 ? (
        <div className="empty-state">
          Tidak ada data taksonomi yang ditemukan
        </div>
      ) : (
        <div className="tree-content">
          {treeData.map(node => renderTreeNode(node))}
        </div>
      )}
    </div>
  );
};

export default TreeView;