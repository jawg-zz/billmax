import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc5fb",
          400: "#36a9f5",
          500: "#0c8ee7",
          600: "#0070c4",
          700: "#015a9f",
          800: "#064c83",
          900: "#0b406d",
        },
      },
    },
  },
  plugins: [],
}

export default config
