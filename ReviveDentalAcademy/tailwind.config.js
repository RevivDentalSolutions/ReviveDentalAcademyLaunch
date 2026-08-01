/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1F252D',
        brand: {
          mint: '#99F6E4', // Soft teal/mint
          teal: '#2DD4BF', // Stronger teal for buttons
          dark: '#0F766E',
        },
        charcoal: {
          DEFAULT: '#1F252D',
          light: '#252D37',
          dark: '#161B21',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        serif: ['Poppins', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
