import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F8FC",
        shell: "#EEF1FB",
        ink: { DEFAULT: "#0B1C3F", soft: "#1C3166", muted: "#5B6480", faint: "#7F87A2" },
        navy: { DEFAULT: "#0B1C3F", 700: "#1C3166", 800: "#14295A", 900: "#0B1C3F" },
        peri: {
          DEFAULT: "#5B7CF0",
          dark: "#4361DB",
          light: "#7D96F3",
          tint: "#F1F4FE",
          soft: "#E3E9FD",
        },
        page: "#F7F8FC",
        surface: "#EEF1FB",
        muted: "#5B6480",
        subtle: "#7F87A2",
        line: { DEFAULT: "#E5E8F1", strong: "#D3D8E6" },
        gold: "#F5B417",
        star: "#F5B417",
        teal: { DEFAULT: "#2F9AA1", light: "#EDF8F8" },
        green: { DEFAULT: "#3F9B67", light: "#EEF8F2" },
        orchid: { DEFAULT: "#C95093", light: "#FCF1F7" },
        amber: { DEFAULT: "#D98F12", light: "#FEF7EA" },
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
      transitionTimingFunction: {
        snappy: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      boxShadow: {
        soft: "0 2px 10px -2px rgba(11, 28, 63, 0.08)",
        float: "0 18px 48px -16px rgba(11, 28, 63, 0.28)",
        device: "0 2px 4px rgba(11,28,63,0.05), 0 40px 80px -24px rgba(11,28,63,0.28)"
      }
    }
  },
  plugins: []
};

export default config;
