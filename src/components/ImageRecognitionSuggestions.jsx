import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDna,
  faInfoCircle,
  faCheckCircle,
  faSpinner,
  faExclamationCircle,
  faImage,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { getImagePredictionWithTaxonomyInfo } from '../services/imageRecognitionApi';
import { toast } from 'react-toastify';

const ImageRecognitionSuggestions = ({ imageFile, onSelectSuggestion, isVisible = true }) => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  // Fungsi untuk menangani analisis gambar
  useEffect(() => {
    const analyzeImage = async () => {
      if (!imageFile || !isVisible) return;

      setLoading(true);
      setError(null);
      setPredictions([]);

      try {
        const result = await getImagePredictionWithTaxonomyInfo(imageFile);
        
        if (result.success && result.results) {
          setPredictions(result.results);
        } else {
          setError(result.message || 'Tidak ada hasil prediksi yang ditemukan');
          console.error('Prediction error:', result.message);
        }
      } catch (err) {
        console.error('Error analyzing image:', err);
        setError(err.message || 'Terjadi kesalahan saat menganalisis gambar');
      } finally {
        setLoading(false);
      }
    };

    analyzeImage();
  }, [imageFile, isVisible]);

  // Fungsi untuk memformat persentase kepercayaan prediksi
  const formatConfidence = (confidence) => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Fungsi untuk menangani klik pada saran
  const handleSuggestionClick = (prediction) => {
    setSelectedPrediction(prediction);
    if (onSelectSuggestion) {
      onSelectSuggestion({
        scientific_name: prediction.scientific_name,
        common_name: prediction.taxonomyData?.vernacularName || '',
        kingdom: prediction.kingdom || '',
        phylum: prediction.phylum || '',
        class: prediction.class || '',
        order: prediction.order || '',
        family: prediction.family || '',
        genus: prediction.genus || '',
        species: prediction.species || '',
        taxon_rank: prediction.rank || 'species',
        gbif_id: prediction.gbif_id
      });
    }
  };

  // Jika tidak ada file gambar, jangan tampilkan apapun
  if (!imageFile || !isVisible) return null;

  return (
    <div className="w-full bg-[#1e1e1e] rounded-lg border border-[#444] p-4 my-4">
      <h3 className="text-xl font-medium text-[#e0e0e0] mb-4 flex items-center">
        <FontAwesomeIcon icon={faDna} className="mr-2 text-blue-400" />
        Hasil Analisis AI
      </h3>

      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-blue-400 mb-4" />
          <p className="text-[#e0e0e0]">Sedang menganalisis gambar...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-6 bg-[#2c2c2c] rounded-lg text-center">
          <FontAwesomeIcon icon={faExclamationCircle} className="text-3xl text-red-400 mb-3" />
          <p className="text-[#e0e0e0] max-w-md">{error}</p>
          <p className="text-[#a0a0a0] text-sm mt-2">
            Coba gunakan gambar dengan resolusi lebih tinggi atau sudut pandang yang berbeda.
          </p>
        </div>
      )}

      {!loading && !error && predictions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 bg-[#2c2c2c] rounded-lg text-center">
          <FontAwesomeIcon icon={faExclamationCircle} className="text-3xl text-yellow-400 mb-3" />
          <p className="text-[#e0e0e0]">Tidak dapat mengenali spesies dalam gambar</p>
          <p className="text-[#a0a0a0] text-sm mt-2">
            Coba gunakan gambar dengan resolusi lebih tinggi atau sudut pandang yang berbeda.
          </p>
        </div>
      )}

      {!loading && predictions.length > 0 && (
        <>
          <p className="text-sm text-[#a0a0a0] mb-4">
            <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
            Klik pada saran untuk menggunakan data tersebut
          </p>

          <div className="space-y-3">
            {predictions.map((prediction, index) => (
              <div
                key={`${prediction.scientific_name}-${index}`}
                className={`flex items-center cursor-pointer p-3 rounded-lg transition-colors ${
                  selectedPrediction?.scientific_name === prediction.scientific_name
                    ? 'bg-blue-900/30 border border-blue-400'
                    : 'border border-[#444] hover:border-[#666] bg-[#2c2c2c]'
                }`}
                onClick={() => handleSuggestionClick(prediction)}
              >
                <div className="flex-shrink-0 w-14 h-14 mr-4">
                  {prediction.images && prediction.images.length > 0 ? (
                    <img
                      src={prediction.images[0]}
                      alt={prediction.scientific_name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/100?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#3c3c3c] rounded-lg">
                      <FontAwesomeIcon icon={faImage} className="text-[#777]" />
                    </div>
                  )}
                </div>

                <div className="flex-grow mr-4">
                  <div className={`${prediction.rank === 'species' ? 'italic' : ''} text-[#e0e0e0] font-medium`}>
                    {prediction.scientific_name}
                  </div>
                  {prediction.taxonomyData?.vernacularName && (
                    <div className="text-sm text-[#a0a0a0]">{prediction.taxonomyData.vernacularName}</div>
                  )}
                  {prediction.taxonomyData && (
                    <div className="text-xs text-[#888] mt-1">
                      {prediction.taxonomyData.family && `${prediction.taxonomyData.family} | `}
                      {prediction.rank.charAt(0).toUpperCase() + prediction.rank.slice(1)}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  <div className="font-medium text-blue-400">{formatConfidence(prediction.confidence)}</div>
                  <div className="text-xs text-[#888]">keyakinan</div>
                </div>

                {selectedPrediction?.scientific_name === prediction.scientific_name && (
                  <FontAwesomeIcon icon={faCheckCircle} className="ml-3 text-blue-400" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-[#a0a0a0] text-xs">
              Data taksonomi dari <a href="https://www.gbif.org/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">GBIF</a>
            </div>
            <button 
              className="text-[#a0a0a0] text-xs hover:text-[#e0e0e0] flex items-center"
              onClick={() => {
                setPredictions([]);
                setSelectedPrediction(null);
                setError('Hasil analisis telah disembunyikan');
              }}
            >
              <FontAwesomeIcon icon={faTimes} className="mr-1" />
              Sembunyikan
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ImageRecognitionSuggestions; 