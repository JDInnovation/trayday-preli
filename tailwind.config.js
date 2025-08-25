/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f16",
        elev: "#121826",
        muted: "#1a2030",
        text: "#e7ebf3",
        sub: "#a9b3c7",
        brand: "#60a5fa",
        ok: "#22c55e",
        warn: "#f59e0b",
        danger: "#ef4444",
        line: "#1f2937"
      }
    }
  },
  plugins: []
};
