/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        // Standardized spacing scale
        'content-xs': '1rem',     // 16px - replaces p-4
        'content-sm': '1.25rem',  // 20px - replaces p-5
        'content-md': '1.5rem',   // 24px - replaces p-6
        'content-lg': '2rem',     // 32px - replaces p-8
      },
      borderRadius: {
        // Standardized border radius values
        'card': '2rem',       // 32px - main card radius
        'card-lg': '2.5rem',  // 40px - large card radius
        'card-xl': '3rem',    // 48px - extra large cards
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        quicksand: ['Quicksand', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}
