"use client";

import {
  motion,
  useReducedMotion,
  type Variants,
  type Transition,
} from "framer-motion";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  type ReactNode,
  type ElementType,
} from "react";
import type { MotionStyle } from "@/lib/cv-templates";

// ============================================================
// PHASE C — the motion system
// ============================================================
// This file is the ENTIRE animation vocabulary for the CV product:
// PageTransition, RevealOnView, StaggerGroup (+ CSS hover in
// globals.css). Nothing animates outside these primitives.
//
// Why that constraint matters: the reference site feels coherent
// because every movement shares timing and easing. A pile of
// individually-tuned animations reads as noise, however nice each
// one is on its own. One vocabulary = one voice.
//
// Timing comes from the template (calm / crisp / none), so motion
// is part of the design system rather than a global constant.
// ============================================================

type MotionTokens = {
  duration: number;
  ease: [number, number, number, number];
  /** px travelled on a reveal/enter. */
  rise: number;
  /** delay between staggered children, seconds. */
  stagger: number;
};

const TOKENS: Record<MotionStyle, MotionTokens> = {
  // Unhurried, long ease-out — settles rather than snaps.
  calm: { duration: 0.55, ease: [0.22, 1, 0.36, 1], rise: 18, stagger: 0.07 },
  // Shorter and tighter — reads as precise/technical.
  crisp: { duration: 0.34, ease: [0.16, 1, 0.3, 1], rise: 10, stagger: 0.045 },
  // Template opts out entirely.
  none: { duration: 0, ease: [0, 0, 1, 1], rise: 0, stagger: 0 },
};

const MotionCtx = createContext<MotionStyle>("calm");

/** Set once by the CV layout from the active template. */
export function CvMotionProvider({
  style,
  children,
}: {
  style: MotionStyle;
  children: ReactNode;
}) {
  return <MotionCtx.Provider value={style}>{children}</MotionCtx.Provider>;
}

/**
 * Resolved tokens for the current template, collapsed to zero when the
 * visitor prefers reduced motion. Every primitive routes through this,
 * so the accessibility guarantee can't be forgotten in one component.
 */
function useTokens(): { t: MotionTokens; still: boolean } {
  const style = useContext(MotionCtx);
  const reduced = useReducedMotion();
  const still = reduced || style === "none";
  return { t: still ? TOKENS.none : TOKENS[style], still };
}

function transition(t: MotionTokens, delay = 0): Transition {
  return { duration: t.duration, ease: t.ease, delay };
}

// motion.create() returns a NEW component type on every call. Calling it
// during render makes React see a different type each pass, so it
// unmounts and remounts the whole subtree — animations restart and state
// is lost. Create each tag once, at module scope.
const tagCache = new Map<string, ElementType>();

function motionTag(as: ElementType): ElementType {
  const key = typeof as === "string" ? as : (as as { displayName?: string })
    .displayName ?? "component";
  const cached = tagCache.get(key);
  if (cached) return cached;
  const made = motion.create(as as ElementType) as ElementType;
  tagCache.set(key, made);
  return made;
}

// ------------------------------------------------------------
// 1. PageTransition — route changes
// ------------------------------------------------------------
// Keyed on pathname so a new route remounts and plays its enter.
//
// Deliberately enter-only: App Router unmounts the outgoing route
// before AnimatePresence can finish an exit, so exit animations are
// unreliable here. A clean enter reads better than a janky exit.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t, still } = useTokens();

  if (still) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: t.rise * 0.6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition(t)}
    >
      {children}
    </motion.div>
  );
}

// ------------------------------------------------------------
// 2. RevealOnView — content entering the viewport
// ------------------------------------------------------------
// `whileInView` uses IntersectionObserver under the hood; `once`
// means it never re-animates on scroll-back, which is what makes it
// feel like a document rather than a slideshow.
export function RevealOnView({
  children,
  delay = 0,
  as = "div",
  className,
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const { t, still } = useTokens();
  const Tag = motionTag(as);

  if (still) {
    const Plain = as as ElementType;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: t.rise }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -60px 0px" }}
      transition={transition(t, delay)}
    >
      {children}
    </Tag>
  );
}

// ------------------------------------------------------------
// 3. StaggerGroup — sequenced children
// ------------------------------------------------------------
// Parent orchestrates; children animate via the shared variant, so
// the delay maths lives in one place instead of per-item `delay`
// props that drift out of sync when items are added.
export function StaggerGroup({
  children,
  className,
  as = "div",
  /** Play on mount (hero) vs. when scrolled into view (sections). */
  trigger = "mount",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  trigger?: "mount" | "view";
}) {
  const { t, still } = useTokens();
  const Tag = motionTag(as);

  if (still) {
    const Plain = as as ElementType;
    return <Plain className={className}>{children}</Plain>;
  }

  const parent: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: t.stagger, delayChildren: 0.05 } },
  };

  return (
    <Tag
      className={className}
      variants={parent}
      initial="hidden"
      {...(trigger === "mount"
        ? { animate: "show" }
        : { whileInView: "show", viewport: { once: true, amount: 0.2 } })}
    >
      {children}
    </Tag>
  );
}

/** A child of StaggerGroup. Inherits the parent's sequencing. */
export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const { t, still } = useTokens();
  const Tag = motionTag(as);

  if (still) {
    const Plain = as as ElementType;
    return <Plain className={className}>{children}</Plain>;
  }

  const child: Variants = {
    hidden: { opacity: 0, y: t.rise },
    show: { opacity: 1, y: 0, transition: transition(t) },
  };

  return (
    <Tag className={className} variants={child}>
      {children}
    </Tag>
  );
}

// ------------------------------------------------------------
// 4. Hover — intentionally CSS, not JS
// ------------------------------------------------------------
// Hover states live in globals.css (.cv-hover-lift, .cv-hover-zoom,
// .cv-underline). They're transform/opacity only, GPU-composited,
// need no hydration, and the existing global prefers-reduced-motion
// rule already disables them. Reaching for Framer Motion here would
// add JS for something CSS does better — the primitive is the class.
