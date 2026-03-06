/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                "primary": "#46ec13",
                "primary-dark": "#36b80f",
                "primary-hover": "#3bdd0b",
                "background-light": "#f6f8f6",
                "background-dark": "#142210",
                "surface-dark": "#1f3319",
                "surface-darker": "#0f1a0c",
                "surface-border": "#2c4823",
                "text-secondary": "#9fc992",
                "text-muted": "#9fc992",
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"],
                "body": ["Noto Sans", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "1rem",
                lg: "2rem",
                xl: "3rem",
                full: "9999px",
            },
        },
    },
    plugins: [],
}
