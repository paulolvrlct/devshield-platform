/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0A1628',
        cyan: '#00D4FF',
        'text-primary': '#E2E8F0',
        'text-secondary': '#94A3B8'
      }
    }
  },
  plugins: []
}
