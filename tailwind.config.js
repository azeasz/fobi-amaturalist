/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      aspectRatio: {
        'square': '1',
        '16/9': '16 / 9',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        '200': '200',
        '300': '300',
        '400': '400',
        '500': '500',
        '600': '600',
        '700': '700',
        '800': '800',
        '900': '900',
        '1000': '1000',
        '2000': '2000',
        '10000': '10000',
        '100000': '100000',
      },
      '.fullscreen-mode': {
        '.image-gallery-slide': {
          height: '100vh !important',
        },
        '.image-gallery-image': {
          maxHeight: '90vh !important',
          width: 'auto !important',
          margin: '0 auto',
        }
      },
      '.fullscreen-gallery': {
        '.image-gallery-thumbnails-wrapper': {
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          padding: '1rem 0',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
  corePlugins: {
    aspectRatio: false, // Disable the core aspect-ratio plugin in favor of the @tailwindcss/aspect-ratio plugin
  }
}