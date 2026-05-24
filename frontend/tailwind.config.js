/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ghn-orange': '#F26522',
        'ghn-orange-dark': '#D4531A',
        'ghn-orange-light': '#FFF0E8',
        'ghn-blue': '#1B5FAF',
        'ghn-blue-dark': '#144A8C',
        'ghn-blue-light': '#EBF3FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

