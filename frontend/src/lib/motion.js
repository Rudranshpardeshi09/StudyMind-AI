import { useReducedMotion } from "framer-motion";

export const EASE_DRAW = [0.65, 0, 0.35, 1];
export const EASE_OUT = [0.22, 1, 0.36, 1];

export const springPress = { type: "spring", stiffness: 520, damping: 30 };
export const springLayout = { type: "spring", stiffness: 300, damping: 30 };
export const springPop = { type: "spring", stiffness: 420, damping: 18 };

export const press = {
  rest: { x: 0, y: 0, boxShadow: "var(--hs)" },
  hover: { x: -1, y: -1, boxShadow: "var(--hs-hover)", transition: springPress },
  tap: { x: 3, y: 3, boxShadow: "var(--hs-press)", transition: springPress },
};

export const pageEnter = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

export const riseIn = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
};

export const clipReveal = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)", y: 12 },
  show: {
    clipPath: "inset(0% 0% 0% 0%)",
    y: 0,
    transition: { duration: 0.7, ease: EASE_DRAW },
  },
};

export const drawPath = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (delay = 0) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1.2, ease: EASE_DRAW, delay },
      opacity: { duration: 0.01, delay },
    },
  }),
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: springPress },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.12 } },
};

export const cardHover = {
  rest: { y: 0, boxShadow: "var(--hs)" },
  hover: { y: -2, boxShadow: "var(--hs-lg)", transition: springLayout },
};

export const stickerWobble = {
  rest: { rotate: 0 },
  hover: { rotate: [0, -3, 3, -2, 0], transition: { duration: 0.5 } },
};

const STATIC_VARIANT = { hidden: {}, show: {} };

export function useReducedMotionSafe() {
  const reduced = useReducedMotion() ?? false;
  return {
    reduced,
    variants: (variant) => (reduced ? STATIC_VARIANT : variant),
    initial: reduced ? false : "hidden",
    transition: (transition) => (reduced ? { duration: 0.12 } : transition),
  };
}
