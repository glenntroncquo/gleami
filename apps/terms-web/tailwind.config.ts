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
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.035em",
      },
    },
  },
  plugins: [],
};

export default config;
