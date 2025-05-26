   // ExplorePage.jsx
   import React from 'react';

   const ExplorePage = () => {
     return (
       <div className="bg-[#121212] min-h-screen text-[#e0e0e0] p-6">
         <div className="max-w-7xl mx-auto">
           <h1 className="text-3xl font-bold mb-6 text-white border-b border-[#444] pb-4">Eksplorasi Saya</h1>
           <div className="bg-[#1e1e1e] rounded-lg p-6 shadow-md border border-[#444]">
             <p className="text-lg mb-4">Halaman ini akan menampilkan eksplorasi dan penemuan Anda.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
               {/* Placeholder untuk konten eksplorasi */}
               {[1, 2, 3, 4, 5, 6].map((item) => (
                 <div key={item} className="bg-[#2c2c2c] rounded-lg p-4 border border-[#444] hover:border-[#1a73e8] transition-colors">
                   <div className="h-40 bg-[#3c3c3c] rounded-md mb-4 animate-pulse"></div>
                   <div className="h-6 bg-[#3c3c3c] rounded w-3/4 mb-2 animate-pulse"></div>
                   <div className="h-4 bg-[#3c3c3c] rounded w-1/2 animate-pulse"></div>
                 </div>
               ))}
             </div>
           </div>
         </div>
       </div>
     );
   };

   export default ExplorePage;