const forms = require("@tailwindcss/forms");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "../shared/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f9f9ff",
        surface: "#f9f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f3f9",
        "surface-container": "#ededf3",
        "surface-container-high": "#e7e8ee",
        "surface-container-highest": "#e2e2e8",
        "surface-variant": "#e2e2e8",
        "on-surface": "#191c20",
        "on-surface-variant": "#424750",
        outline: "#727781",
        "outline-variant": "#c2c6d2",
        primary: "#034785",
        brand: {
          700: "#356D9D",
          900: "#034785",
        },
        secondary: "#4f5f79",
        "secondary-container": "#d0e0ff",
        "secondary-fixed": "#d4e3ff",
        "secondary-fixed-dim": "#b6c7e6",
        "on-primary": "#ffffff",
        "on-primary-container": "#88b7fc",
        "on-primary-fixed": "#001c3a",
        "on-primary-fixed-variant": "#034785",
        "primary-fixed": "#d4e3ff",
        "primary-fixed-dim": "#a6c8ff",
        "primary-container": "#034785",
        "inverse-primary": "#a6c8ff",
        "inverse-surface": "#2e3035",
        "inverse-on-surface": "#f0f0f6",
        "surface-dim": "#d9dadf",
        success: "#16A34A",
        warning: "#F59E0B",
        pending: "#B4D22D",
        danger: "#FC2621",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(15, 23, 42, 0.08)",
        card: "0 22px 60px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [forms],
};
