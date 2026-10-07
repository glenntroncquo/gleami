import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F8FC",
        shell: "#EEF1FB",
        ink: { DEFAULT: "#0B1C3F", soft: "#1C3166" },
        navy: { 800: "#14295A", 900: "#0B1C3F" },
        muted: "#5B6480",
        subtle: "#7F87A2",
        line: { DEFAULT: "#E5E8F1", strong: "#D3D8E6" },
        gold: "#F5B417",
        rose: {
          50: "#F1F4FE",
          100: "#E3E9FD",
          200: "#C7D3FB",
          300: "#A3B6F8",
          400: "#7D96F3",
          500: "#5B7CF0",
          600: "#4361DB",
          700: "#344DB5"
        },
        sage: {
          50: "#EEF8F2",
          100: "#D9F0E2",
          200: "#B3E0C5",
          300: "#86CCA3",
          400: "#5DB582",
          500: "#3F9B67",
          600: "#317D52",
          700: "#276343"
        },
        sand: {
          50: "#FEF7EA",
          100: "#FDEBC9",
          200: "#FAD68F",
          300: "#F6BF55",
          400: "#F0A92B",
          500: "#D98F12",
          600: "#B4730C",
          700: "#8C590E"
        },
        sky: {
          50: "#EDF8F8",
          100: "#D6EFF0",
          200: "#ADDFE1",
          300: "#7FCACE",
          400: "#52B3B9",
          500: "#2F9AA1",
          600: "#237D84",
          700: "#1D646A"
        },
        lilac: {
          50: "#FCF1F7",
          100: "#F8E1EE",
          200: "#F0C2DC",
          300: "#E59BC4",
          400: "#D873AA",
          500: "#C95093",
          600: "#AC3C7A",
          700: "#8C3163"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      },
      letterSpacing: {
        tightest: "-0.035em"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(11,28,63,0.04), 0 8px 24px -12px rgba(11,28,63,0.12)",
        float: "0 2px 6px rgba(11,28,63,0.05), 0 24px 48px -16px rgba(11,28,63,0.25)",
        device: "0 2px 4px rgba(11,28,63,0.05), 0 40px 80px -24px rgba(11,28,63,0.28)"
      }
    }
  },
  plugins: []
};

export default config;
