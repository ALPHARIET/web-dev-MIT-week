import type { Config } from "tailwindcss";

const netral = {
  50: "#efeeea",
  100: "#e8e7e3",
  200: "#e2e2df",
  300: "#cdcdc8",
  400: "#94948e",
  500: "#66665f",
  600: "#4f4f49",
  700: "#383834",
  800: "#1f1f1d",
  900: "#070607",
  950: "#070607",
};

const ember = {
  50: "#efeeea",
  100: "#f5f28e",
  200: "#cdcdc8",
  300: "#b5b5af",
  400: "#fc5000",
  500: "#fc5000",
  600: "#070607",
  700: "#070607",
  800: "#070607",
  900: "#070607",
  950: "#070607",
};

const merah = {
  50: "#fc5000",
  100: "#fc5000",
  200: "#fc5000",
  300: "#fc5000",
  400: "#fc5000",
  500: "#070607",
  600: "#070607",
  700: "#070607",
  800: "#070607",
  900: "#070607",
  950: "#070607"
};

const sulfur = {
  50: "#f5f28e",
  100: "#f5f28e",
  200: "#f5f28e",
  300: "#f5f28e",
  400: "#f5f28e",
  500: "#070607",
  600: "#070607",
  700: "#070607",
  800: "#070607",
  900: "#070607",
  950: "#070607"
};

const tanpaBayangan = "0 0 #0000";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Impact", "sans-serif"],
      },
      fontWeight: {
        normal: "500",
        medium: "500",
        semibold: "500",
        bold: "500",
        extrabold: "500",
      },
      borderRadius: {
        md: "16px",
        lg: "20px",
        xl: "clamp(24px, 4vw, 40px)",
        "2xl": "clamp(28px, 4vw, 40px)",
      },
      boxShadow: {
        sm: tanpaBayangan,
        DEFAULT: tanpaBayangan,
        md: tanpaBayangan,
        lg: tanpaBayangan,
        xl: tanpaBayangan,
        "2xl": tanpaBayangan,
        inner: tanpaBayangan,
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        white: "#f7f6f2",
        limestone: "#f7f6f2",
        pumice: "#e2e2df",
        obsidian: "#070607",
        chalk: "#ffffff",
        ember: "#fc5000",
        sulfur: "#f5f28e",
        plasma: "#524ae9",
        gray: netral,
        emerald: netral,
        blue: ember,
        indigo: ember,
        sky: ember,
        purple: ember,
        amber: sulfur,
        orange: sulfur,
        red: merah,
        rose: merah,
        kewaspadaan: {
          tinggi: {
            DEFAULT: "#dc2626",
            light: "#fef2f2",
            border: "#fca5a5",
            dark: "#991b1b",
          },
          sedang: {
            DEFAULT: "#ea580c",
            light: "#fff7ed",
            border: "#fdba74",
            dark: "#9a3412",
          },
          tidak_ditemukan: {
            DEFAULT: "#4b5563",
            light: "#f9fafb",
            border: "#d1d5db",
            dark: "#1f2937",
          },
        },
        waspada: {
          tinggi: {
            DEFAULT: "#dc2626",
            light: "#fef2f2",
            border: "#fca5a5",
            dark: "#991b1b",
          },
          sedang: {
            DEFAULT: "#ea580c",
            light: "#fff7ed",
            border: "#fdba74",
            dark: "#9a3412",
          },
          tidak_ditemukan: {
            DEFAULT: "#4b5563",
            light: "#f9fafb",
            border: "#d1d5db",
            dark: "#1f2937",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
