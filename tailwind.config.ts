import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FAF8F5',
          100: '#F5EFE6',
          200: '#ECE4D8',
          300: '#DECFC0',
          800: '#4A3E3D',
          900: '#2C2224',
        },
        rose: {
          light: '#F7E7E9',
          DEFAULT: '#C97D8A',
          hover: '#B56B78',
          deep: '#853E4D',
        },
        wine: {
          light: '#8F3D4A',
          DEFAULT: '#722F37',
          dark: '#4A1C23',
          deep: '#2D0E14',
        },
        gold: {
          light: '#F5E8C7',
          DEFAULT: '#D4AF37',
          dark: '#A6831E',
        },
        twilight: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          800: '#182232',
          900: '#0F1622',
          950: '#0A0E17',
        }
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'book': '0 8px 24px -4px rgba(74, 28, 35, 0.12), 0 2px 6px -1px rgba(74, 28, 35, 0.08)',
        'book-hover': '0 16px 32px -4px rgba(74, 28, 35, 0.18), 0 4px 12px -1px rgba(74, 28, 35, 0.12)',
        'glow-gold': '0 0 20px -3px rgba(212, 175, 55, 0.35)',
        'glow-rose': '0 0 20px -3px rgba(201, 125, 138, 0.35)',
      },
      borderRadius: {
        'book': '14px',
      }
    },
  },
  plugins: [],
};

export default config;
