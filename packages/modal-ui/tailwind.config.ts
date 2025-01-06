/* eslint-disable import/no-extraneous-dependencies */
import tailwindCssVariables from "@mertasan/tailwindcss-variables";
import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,css,md,mdx,html,json,scss}"],
  prefix: "w3a--",
  darkMode: "class",
  theme: {
    extend: {
      fontSize: {
        xxs: "0.625rem",
      },
      screens: {
        smb: "380px",
        xs: "440px",
        mb: "570px",
        tab: "840px",
      },
      containers: {
        smb: "380px",
        xs: "440px",
        mb: "570px",
        tab: "840px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
    fontFamily: {
      header: ["Inter"],
      body: ["Inter"],
    },
    colors: {
      transparent: colors.transparent,
      app: {
        onPrimary: "var(--app-on-primary)",
        primary: {
          900: "var(--app-primary-900)",
          800: "var(--app-primary-800)",
          700: "var(--app-primary-700)",
          600: "var(--app-primary-600)",
          500: "var(--app-primary-500)",
          400: "var(--app-primary-400)",
          300: "var(--app-primary-300)",
          200: "var(--app-primary-200)",
          100: "var(--app-primary-100)",
          50: "var(--app-primary-50)",
        },
        gray: {
          900: "var(--app-gray-900)",
          800: "var(--app-gray-800)",
          700: "var(--app-gray-700)",
          600: "var(--app-gray-600)",
          500: "var(--app-gray-500)",
          400: "var(--app-gray-400)",
          300: "var(--app-gray-300)",
          200: "var(--app-gray-200)",
          100: "var(--app-gray-100)",
          50: "var(--app-gray-50)",
        },
        blue: {
          900: "var(--app-blue-900)",
          800: "var(--app-blue-800)",
          700: "var(--app-blue-700)",
          600: "var(--app-blue-600)",
          500: "var(--app-blue-500)",
          400: "var(--app-blue-400)",
          300: "var(--app-blue-300)",
          200: "var(--app-blue-200)",
          100: "var(--app-blue-100)",
          50: "var(--app-blue-50)",
        },
        red: {
          900: "var(--app-red-900)",
          800: "var(--app-red-800)",
          700: "var(--app-red-700)",
          600: "var(--app-red-600)",
          500: "var(--app-red-500)",
          400: "var(--app-red-400)",
          300: "var(--app-red-300)",
          200: "var(--app-red-200)",
          100: "var(--app-red-100)",
          50: "var(--app-red-50)",
        },
        green: {
          900: "var(--app-green-900)",
          800: "var(--app-green-800)",
          700: "var(--app-green-700)",
          600: "var(--app-green-600)",
          500: "var(--app-green-500)",
          400: "var(--app-green-400)",
          300: "var(--app-green-300)",
          200: "var(--app-green-200)",
          100: "var(--app-green-100)",
          50: "var(--app-green-50)",
        },
        yellow: {
          900: "var(--app-yellow-900)",
          800: "var(--app-yellow-800)",
          700: "var(--app-yellow-700)",
          600: "var(--app-yellow-600)",
          500: "var(--app-yellow-500)",
          400: "var(--app-yellow-400)",
          300: "var(--app-yellow-300)",
          200: "var(--app-yellow-200)",
          100: "var(--app-yellow-100)",
          50: "var(--app-yellow-50)",
        },
        light: {
          "surface-main": "var(--app-gray-100)",
          surface1: "var(--app-white)",
          surface2: "var(--app-gray-50)",
          surface3: "var(--app-gray-100)",
          surface4: "var(--app-gray-200)",
        },
        dark: {
          "surface-main": "var(--app-gray-900)",
          surface1: "var(--app-black)",
          surface2: "var(--app-gray-900)",
          surface3: "var(--app-gray-800)",
          surface4: "var(--app-gray-700)",
        },
        success: "var(--app-success)",
        warning: "var(--app-warning)",
        error: "var(--app-error)",
        info: "var(--app-info)",
        white: "var(--app-white)",
        black: "var(--app-black)",
      },
    },
    variables: {
      ".w3a-parent-container": {
        DEFAULT: {
          app: {
            "on-primary": "#ffffff",
            primary: {
              900: "#233876",
              800: "#1e429f",
              700: "#1a56db",
              600: "#0346ff",
              500: "#3f83f8",
              400: "#76a9fa",
              300: "#a4cafe",
              200: "#c3ddfd",
              100: "#e1effe",
              50: "#ebf5ff",
            },
            gray: {
              900: "#111928",
              800: "#1f2a37",
              700: "#374151",
              600: "#4b5563",
              500: "#6b7280",
              400: "#9ca3af",
              300: "#d1d5db",
              200: "#e5e7eb",
              100: "#f3f4f6",
              50: "#f9fafb",
            },
            blue: {
              900: "#233876",
              800: "#1e429f",
              700: "#1a56db",
              600: "#0346ff",
              500: "#3f83f8",
              400: "#76a9fa",
              300: "#a4cafe",
              200: "#c3ddfd",
              100: "#e1effe",
              50: "#ebf5ff",
            },
            red: {
              900: "#771d1d",
              800: "#9b1c1c",
              700: "#c81e1e",
              600: "#e02424",
              500: "#f05252",
              400: "#f98080",
              300: "#f8b4b4",
              200: "#fbd5d5",
              100: "#fde8e8",
              50: "#fdf2f2",
            },
            green: {
              900: "#014737",
              800: "#03543f",
              700: "#046c4e",
              600: "#057a55",
              500: "#0e9f6e",
              400: "#31c48d",
              300: "#84e1bc",
              200: "#bcf0da",
              100: "#def7ec",
              50: "#f3faf7",
            },
            yellow: {
              900: "#633112",
              800: "#723b13",
              700: "#8e4b10",
              600: "#9f580a",
              500: "#c27803",
              400: "#e3a008",
              300: "#faca15",
              200: "#fce96a",
              100: "#fdf6b2",
              50: "#fdfdea",
            },
            success: "#30cca4",
            warning: "#fbc94a",
            error: "#fb4a61",
            info: "#d4d4d4",
            white: "#ffffff",
            black: "#000000",
          },
        },
      },
    },
  },
  plugins: [tailwindCssVariables],
};

export default config;
