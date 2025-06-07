import React from 'react';

const UnderDevelopmentPage = ({ title = "Sedang Dalam Pengembangan", description = "Seperti benih yang sedang tumbuh, halaman ini masih dalam tahap pengembangan. Kami sedang menyiapkan fitur-fitur yang akan segera hadir." }) => {
  return (
    <div className="content min-h-screen bg-[#121212] p-8">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-3xl font-serif text-[#e0e0e0]">{title}</h1>
        
        <div className="relative p-8 bg-[#1e1e1e] rounded-lg shadow-md border border-[#444]">
          <div className="space-y-4">
            <img 
              src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/sprout.svg"
              alt="Tanaman yang sedang tumbuh" 
              className="w-32 h-32 mx-auto opacity-80 text-[#e0e0e0] filter invert"
            />                
            <h2 className="text-xl text-[#e0e0e0] font-medium">
              Sedang Dalam Pengembangan
            </h2>
            
            <p className="text-[#b0b0b0] leading-relaxed">
              {description}
            </p>
            
            <div className="flex items-center justify-center gap-2 text-[#b0b0b0] text-sm">
              <span className="block w-2 h-2 bg-[#1a73e8] rounded-full animate-pulse"></span>
              <span className="block w-2 h-2 bg-[#1a73e8] rounded-full animate-pulse delay-100"></span>
              <span className="block w-2 h-2 bg-[#1a73e8] rounded-full animate-pulse delay-200"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderDevelopmentPage; 