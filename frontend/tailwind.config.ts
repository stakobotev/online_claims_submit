import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf3f3',
          100: '#fbe6e6',
          200: '#f5c2c2',
          300: '#ec9999',
          400: '#d96565',
          500: '#b43232',
          600: '#9a2828',
          700: '#7d1f1f',
          800: '#5f1a1a',
          900: '#3b0e0e',
        },
        accent: {
          DEFAULT: '#ffcf43',
          dark: '#aa8a2d',
        },
        navy: {
          DEFAULT: '#004ca0',
          dark: '#00244b',
        },
        ink: {
          DEFAULT: '#0c1416',
          muted: '#3a616b',
        },
      },
      fontFamily: {
        sans: ['"Open Sans"', 'system-ui', 'sans-serif'],
        display: ['Mulish', '"Open Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
