import type { Config } from 'tailwindcss';

/**
 * Coopercabana brand theme.
 *
 * The app was originally dark (zinc-950 page, zinc-900 cards, emerald
 * accents). To reskin it in one pass we remap the zinc scale to warm cream
 * neutrals and emerald to the brand's dusty sage-teal, so every existing
 * `bg-zinc-*` / `text-zinc-*` / `emerald-*` class re-skins automatically.
 *
 * Brand references:
 *   - cream shirt           #F2F0E6
 *   - sage stamp ink        #8DA399 / print #8CB4B4
 *   - complementary: deep ink green, terracotta (danger), ochre (warning)
 */

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#2b3b34',
        cream: '#f2f0e6',
        // Zinc scale remapped to warm cream neutrals.
        // Roles preserved: 950=page/inner bg, 900=card, 800=card border,
        // 700=input border/toggle track, 100-600=text hierarchy.
        zinc: {
          100: '#2b3b34',
          200: '#394b43',
          300: '#4e6057',
          400: '#6e7f76',
          500: '#8b9a91',
          600: '#a8b4ac',
          700: '#cfc9b6',
          800: '#e3dfd0',
          900: '#faf8f1',
          950: '#f2f0e6',
        },
        // Emerald scale remapped to Coopercabana teal-sage.
        // 500/600 are deep enough that cream text on them clears AA contrast.
        emerald: {
          400: '#5f8a77', // sage-teal — text accents on tints
          500: '#426b5b', // deep teal — buttons, toggles, active states
          600: '#375c4e', // darker teal — hover / pressed
        },
        // Complementary accents.
        red: {
          400: '#c9704f', // terracotta — unpaid / outstanding
        },
        amber: {
          400: '#c99b3f', // ochre — warnings / gap notes
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
