"use client";

import { useContext } from "react";
import { TourContext } from "./TourContext";
import type { TourContextValue } from "./TourContext";

/**
 * Access the active tour's state and controls.
 *
 * Must be called from a component rendered underneath <TourProvider>.
 *
 * Example:
 *   const { startTour } = useTour();
 *   <button onClick={() => startTour()}>Take Tour Again</button>
 */
export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour() must be used inside a <TourProvider>. Did you forget to wrap your app?");
  }
  return ctx;
}
