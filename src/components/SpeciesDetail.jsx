import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Popup } from 'react-leaflet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faBars, faTimes, faBell, faEnvelope, faUserCircle } from '@fortawesome/free-solid-svg-icons';

const SpeciesDetail = ({ species, user, totalObservations, approvedUsers, suggestions }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationName, setLocationName] = useState('Memuat lokasi...');
  const [rating, setRating] = useState(0);
  const [showAllUsers, setShowAllUsers] = useState(false);
  
  useEffect(() => {
    // Fetch lokasi
    const fetchLocation = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${species.latitude}&lon=${species.longitude}`
        );
        const data = await response.json();
        setLocationName(data.display_name || 'Lokasi tidak ditemukan');
      } catch (error) {
        console.error('Error fetching location:', error);
        setLocationName('Lokasi tidak ditemukan');
      }
    };

    fetchLocation();
  }, [species.latitude, species.longitude]);

  // Header Component
  const Header = () => (
    <header className="p-3 bg-gray-100 border-b-5 border-teal-600 fixed w-full z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="logo">
          <img src="/storage/icon/FOBI.png" alt="Fobi Logo" className="h-16 pb-1" />
        </div>
        
        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#" className="hover:text-teal-600">Jelajahi</a>
          <a href="#" className="hover:text-teal-600">Eksplorasi Saya</a>
          <a href="/bantu-identifikasi" className="hover:text-teal-600">Bantu Ident</a>
          <a href="#" className="hover:text-teal-600">Komunitas</a>
        </nav>

        {/* User Info */}
        <div className="flex items-center space-x-4">
          <FontAwesomeIcon icon={faUserCircle} className="text-2xl" />
          {user ? (
            <span>{user.uname}</span>
          ) : (
            <a href="/login" className="hover:text-teal-600">Login</a>
          )}
          <FontAwesomeIcon icon={faBell} className="hidden md:block" />
          <FontAwesomeIcon icon={faEnvelope} className="hidden md:block" />
          <div>
            <strong className="text-lg">{totalObservations}</strong>
            <br />
            <small>Observasi</small>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} />
        </button>
      </div>
    </header>
  );

  // Species Info Component
  const SpeciesInfo = () => (
    <div className="container mx-auto mt-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="text-xl font-bold">{species.nameLat}</h4>
          <small>{species.nameId}</small>
        </div>
        <div>
          <span className="bg-gray-500 text-white px-2 py-1 rounded">
            {user ? user.uname : 'Tamu'}
          </span>
          <span className="ml-2">{totalObservations} observasi</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <img 
            src="/storage/icon/blt.jpeg" 
            alt="Species Image"
            className="w-full md:w-1/2 rounded-lg"
          />
          <div className="w-full md:w-1/2 h-[500px]">
            <MapContainer 
              center={[species.latitude, species.longitude]} 
              zoom={8}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {/* Map logic here */}
            </MapContainer>
          </div>
        </div>

        <div className="flex justify-center mt-4 space-x-2">
          {/* Thumbnails */}
          {[1, 2, 3].map((i) => (
            <img 
              key={i}
              src="/storage/icon/blt.jpeg" 
              alt="Thumbnail" 
              className="w-12 h-12 object-cover rounded"
            />
          ))}
        </div>

        <div className="text-center mt-4">
          <p className="text-sm">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-500 mr-1" />
            {locationName}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <SpeciesInfo />
      
      {/* Sisanya bisa dikonversi dengan pola yang sama */}
    </div>
  );
};

export default SpeciesDetail;