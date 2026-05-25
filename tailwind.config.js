/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from "tailwindcss-animate"
export default {
  // Enable class-based dark mode
  darkMode: ['class'],

  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },

    extend: {
      colors: {
        // ── Brand: Braka Nusa Core ──────────────────────────────
        // Lime green accent — premium, not neon
        brand: {
          DEFAULT:     '#84cc16', // lime-500
          50:          '#f7fee7',
          100:         '#ecfccb',
          200:         '#d9f99d',
          300:         '#bef264',
          400:         '#a3e635',
          500:         '#84cc16',
          600:         '#65a30d',
          700:         '#4d7c0f',
          800:         '#3f6212',
          900:         '#365314',
          950:         '#1a2e05',
          foreground:  '#1a2e05',
        },

        // ── shadcn/ui CSS variable references ──────────────────
        border:          'hsl(var(--border))',
        input:           'hsl(var(--input))',
        ring:            'hsl(var(--ring))',
        background:      'hsl(var(--background))',
        foreground:      'hsl(var(--foreground))',
        primary: {
          DEFAULT:     'hsl(var(--primary))',
          foreground:  'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:     'hsl(var(--secondary))',
          foreground:  'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:     'hsl(var(--destructive))',
          foreground:  'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:     'hsl(var(--muted))',
          foreground:  'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:     'hsl(var(--accent))',
          foreground:  'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:     'hsl(var(--popover))',
          foreground:  'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:     'hsl(var(--card))',
          foreground:  'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT:     'hsl(var(--sidebar-background))',
          foreground:  'hsl(var(--sidebar-foreground))',
          border:      'hsl(var(--sidebar-border))',
          accent:      'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
        },
      },

      borderRadius: {
        lg:  'var(--radius)',
        md:  'calc(var(--radius) - 2px)',
        sm:  'calc(var(--radius) - 4px)',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.2s ease-out',
      },
    },
  },

  plugins: [
    tailwindcssAnimate,
  ],
}
