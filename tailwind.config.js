/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6C5CE7",
          dark: "#4e44c4",
          light: "#a29bfe",
        },
      },
      boxShadow: {
        soft: "0 10px 25px -10px rgba(0,0,0,0.15)",
      },
    },
  },
  plugins: [],
};
