import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          50: '#f0fdf4',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
      },
      boxShadow: {
        toolbar: '0 16px 50px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config
