import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // sesuaikan dengan port backend Anda
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    assetsInlineLimit: 4096, // Files smaller than 4kb will be inlined as base64
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-map': ['leaflet', 'react-leaflet'],
          
          // Feature chunks
          'species': [
            './src/components/SpeciesDetail/SpeciesDetail.jsx',
            './src/components/SpeciesDetail/SpeciesGallery.jsx'
          ],
          'genus': [
            './src/components/GenusGallery/GenusDetail.jsx',
            './src/components/GenusGallery/GenusGallery.jsx'
          ],
        },
        // Mengoptimalkan nama chunk
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          if (name.includes('vendor')) {
            return 'assets/vendor/[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
    // Meningkatkan batas peringatan ukuran chunk
    chunkSizeWarningLimit: 1000,
  },
})
