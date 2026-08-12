/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          500: '#1d6fe0',
          600: '#155bc0',
          700: '#0f479b',
        },
      },
    },
  },
  plugins: [],
};
