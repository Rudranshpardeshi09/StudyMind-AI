export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "Cambria", "serif"],
        sans: ["\"Inter Tight\"", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "\"Segoe UI\"", "sans-serif"],
        mono: ["\"JetBrains Mono\"", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        sketch: ["Kalam", "\"Comic Sans MS\"", "ui-rounded", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "hsl(var(--canvas))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        ink: {
          DEFAULT: "hsl(var(--ink))",
          foreground: "hsl(var(--ink-foreground))",
        },
        bone: "hsl(var(--bone))",
        cherry: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        citron: {
          DEFAULT: "hsl(var(--citron))",
          foreground: "hsl(var(--citron-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          sunk: "hsl(var(--surface-sunk))",
          raised: "hsl(var(--surface-raised))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          soft: "hsl(var(--primary-soft))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          soft: "hsl(var(--destructive-soft))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          soft: "hsl(var(--info-soft))",
        },
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
        },
        input: "hsl(var(--input))",
        control: "hsl(var(--control-outline))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        hero: "var(--radius-hero)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        "hs-sm": "var(--hs-sm)",
        "hs-md": "var(--hs-md)",
        hs: "var(--hs)",
        "hs-hover": "var(--hs-hover)",
        "hs-lg": "var(--hs-lg)",
        "hs-xl": "var(--hs-xl)",
        "hs-sheet": "var(--hs-sheet)",
        "hs-press": "var(--hs-press)",
        "hs-up": "0 -2px 0 0 hsl(var(--border-strong))",
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.2rem" }],
        base: ["0.9375rem", { lineHeight: "1.45rem" }],
        lg: ["1.0625rem", { lineHeight: "1.6rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["2rem", { lineHeight: "2.4rem" }],
        "display-sm": ["clamp(2rem, 1.4rem + 2.6vw, 2.75rem)", { lineHeight: "1", letterSpacing: "-0.02em" }],
        display: ["clamp(2.75rem, 1.8rem + 4vw, 4.5rem)", { lineHeight: "0.95", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(3.25rem, 1.8rem + 6.4vw, 6rem)", { lineHeight: "0.95", letterSpacing: "-0.025em" }],
        numeral: ["clamp(6rem, 3rem + 10vw, 12rem)", { lineHeight: "0.8", letterSpacing: "-0.04em" }],
        eyebrow: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      maxWidth: {
        shell: "1280px",
      },
      transitionTimingFunction: {
        snap: "cubic-bezier(0.2, 0.9, 0.3, 1.2)",
        draw: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translate3d(0,0,0)" },
          "100%": { transform: "translate3d(-50%,0,0)" },
        },
        float: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(0,-8px,0)" },
        },
        wobble: {
          "0%, 100%": { transform: "rotate(var(--wobble-base, 0deg))" },
          "25%": { transform: "rotate(calc(var(--wobble-base, 0deg) - 3deg))" },
          "75%": { transform: "rotate(calc(var(--wobble-base, 0deg) + 3deg))" },
        },
        draw: {
          "0%": { strokeDashoffset: "1" },
          "100%": { strokeDashoffset: "0" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        squiggle: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-24px)" },
        },
        "spin-3d": {
          "0%": { transform: "rotateX(-24deg) rotateY(0deg)" },
          "100%": { transform: "rotateX(-24deg) rotateY(360deg)" },
        },
        orbit: {
          "0%": { offsetDistance: "0%" },
          "100%": { offsetDistance: "100%" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
        "slide-up": "slide-up 0.22s ease-out",
        marquee: "marquee var(--marquee-duration, 30s) linear infinite",
        float: "float 6s ease-in-out infinite",
        wobble: "wobble 0.5s ease-in-out",
        draw: "draw 1.2s cubic-bezier(0.65, 0, 0.35, 1) forwards",
        shimmer: "shimmer 1.6s infinite",
        squiggle: "squiggle 0.9s linear infinite",
        "spin-3d": "spin-3d var(--spin-duration, 28s) linear infinite",
        blink: "blink 1s steps(1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
