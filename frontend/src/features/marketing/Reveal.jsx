import { motion } from "framer-motion";

import { pageEnter, riseIn, useReducedMotionSafe } from "@/lib/motion";

export function Reveal({ as = "div", className, children, amount = 0.2, stagger = false, ...props }) {
  const m = useReducedMotionSafe();
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      className={className}
      variants={m.variants(stagger ? pageEnter : riseIn)}
      initial={m.initial}
      whileInView="show"
      viewport={{ once: true, amount }}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function RevealItem({ as = "div", className, children, variants = riseIn, ...props }) {
  const m = useReducedMotionSafe();
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp className={className} variants={m.variants(variants)} {...props}>
      {children}
    </Comp>
  );
}
