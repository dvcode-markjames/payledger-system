"use client";

import { createContext } from "react";
import type { ReactNode } from "react";

/**
 * A single step in the product tour.
 *
 * `target` is a CSS selector (id, class, or — preferred — a `data-tour`
 * attribute, e.g. `[data-tour="add-transaction"]`). Using `data-tour`
 * attributes instead of `id`s lets the same logical element exist twice in
 * the DOM (e.g. a desktop sidebar link and a mobile bottom-nav link) without
 * colliding — the tour automatically targets whichever copy is actually
 * visible on screen.
 */
export interface TourStep {
  /** Stable, unique identifier for the step (used as the React key). */
  id: string;
  /** CSS selector for the element to highlight. */
  target: string;
  /** Short, bold headline shown in the popover. */
  title: string;
  /** One or two sentences explaining the highlighted feature. */
  description: string;
  /** Optional icon rendered in the popover header (any lucide-react icon element). */
  icon?: ReactNode;
  /** Which side of the target the popover should prefer. Defaults to "bottom". */
  placement?: "top" | "bottom" | "left" | "right";
  /** Extra space (px) between the highlight box and the target's edges. Defaults to 8. */
  padding?: number;
  /**
   * The app route (Next.js pathname) this step's target lives on. If the
   * tour is on a different route when this step becomes active, the
   * provider will automatically navigate there before highlighting it.
   * Omit for steps whose target exists on every page (e.g. nav items).
   */
  route?: string;
  /** Optional async hook run right before advancing past this step. */
  beforeNext?: () => void | Promise<void>;
  /** Optional async hook run right before going back from this step. */
  beforePrev?: () => void | Promise<void>;
}

/** Public API exposed by <TourProvider> via the useTour() hook. */
export interface TourContextValue {
  /** The full ordered list of steps for this tour. */
  steps: TourStep[];
  /** Whether the tour overlay/popover is currently visible. */
  isActive: boolean;
  /** Index of the currently active step (0-based). */
  currentIndex: number;
  /** The active TourStep object, or null when the tour is closed. */
  currentStep: TourStep | null;
  /** Total number of steps. */
  totalSteps: number;
  /** True while the tour is waiting for a step's target element to appear (e.g. after a route change). */
  isLocating: boolean;
  /** Begin the tour, optionally starting from a specific step index. */
  startTour: (fromIndex?: number) => void;
  /** Advance to the next step, or finish the tour if this is the last step. */
  nextStep: () => void;
  /** Go back to the previous step (no-op on the first step). */
  previousStep: () => void;
  /** Jump directly to an arbitrary step index. */
  goToStep: (index: number) => void;
  /** Mark the tour as complete and close it. */
  finishTour: () => void;
  /** Close the tour without necessarily having finished it (still marks as seen). */
  skipTour: () => void;
  /** Whether the user has already completed (or skipped) the tour before, per localStorage. */
  isTourCompleted: () => boolean;
}

// The context itself. Left undefined by default so useTour() can detect
// and warn about accidental usage outside of a <TourProvider>.
export const TourContext = createContext<TourContextValue | undefined>(undefined);
