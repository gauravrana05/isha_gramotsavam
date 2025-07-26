/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/pages/**/*.{js,ts,jsx,tsx}", // Include pages (if any)
      "./src/app/**/*.{js,ts,jsx,tsx}", // Include App Router files
      "./src/components/**/*.{js,ts,jsx,tsx}", // Include components
      "./src/context/**/*.{js,ts,jsx,tsx}", // Include context (if components exist)
      "./src/lib/**/*.{js,ts,jsx,tsx}", // Include utilities (if applicable)
    ],
    theme: {
      extend: {
        fontFamily: {
          roboto: ["Roboto", "sans-serif"],
        },
      },
    },
    plugins: [],
  };