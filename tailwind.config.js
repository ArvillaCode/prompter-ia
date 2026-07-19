/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ADN visual de Upfunnel — paleta exacta, no sustituir.
        // upf-black = lienzo de página; upf-cyan = único acento
        // (CTAs, highlights, selección, estados activos); upf-white = texto
        // principal; upf-slate = texto secundario, bordes suaves.
        // La escala nativa de Tailwind NO se usa para acentos; slate puede
        // usarse solo como base de superficies neutras (slate-900 cards,
        // slate-800 inputs, slate-700 bordes) sin valor semántico.
        'upf-black': '#080C14',
        'upf-cyan': '#00E5FF',
        'upf-white': '#FFFFFF',
        'upf-slate': '#94A3B8',
      },
    },
  },
  plugins: [],
};
