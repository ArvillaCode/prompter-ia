/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ADN visual de Upfunnel — no sustituir por otros tonos.
        'upf-black': '#080C14',
        'upf-cyan': '#00E5FF',
        'upf-slate': '#94A3B8',
      },
    },
  },
  plugins: [],
};
