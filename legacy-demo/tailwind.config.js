/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F8F6F1",
        surface: "#FFFFFF",
        muted: "#F1ECE4",
        ink: "#2B2926",
        secondary: "#5F5A53",
        tertiary: "#8C857B",
        accent: "#C96A3D",
        "accent-hover": "#B85B31",
        success: "#6F907C",
        warning: "#B69042",
        danger: "#B45A42"
      },
      boxShadow: {
        soft: "0 12px 40px rgba(43, 41, 38, 0.06)"
      },
      maxWidth: {
        content: "1120px"
      },
      borderRadius: {
        panel: "16px"
      }
    }
  },
  plugins: []
};
