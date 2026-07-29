"use client";

interface TourHighlightProps {
  /** Bounding box of the currently highlighted element, or null while locating/unknown. */
  targetRect: DOMRect | null;
  /** Extra breathing room (px) around the target. Should match the value passed to TourOverlay. */
  padding: number;
  /** While true (e.g. waiting for a route change to settle), hide the glow to avoid flashing in the wrong spot. */
  isLocating?: boolean;
}

/**
 * Draws a soft, pulsing glow around the element the current tour step is
 * highlighting. Purely decorative (`pointer-events-none`) — the actual
 * click-blocking of the dimmed page happens in <TourOverlay>.
 */
export default function TourHighlight({ targetRect, padding, isLocating }: TourHighlightProps) {
  if (!targetRect) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  const top = Math.max(targetRect.top - padding, 0);
  const left = Math.max(targetRect.left - padding, 0);
  const right = Math.min(targetRect.right + padding, vw);
  const bottom = Math.min(targetRect.bottom + padding, vh);

  return (
    <div
      aria-hidden="true"
      className={`fixed z-[9998] rounded-xl pointer-events-none ring-2 ring-gcash transition-all duration-300 ease-out ${
        isLocating ? "opacity-0" : "opacity-100 animate-tour-pulse"
      }`}
      style={{ top, left, width: right - left, height: bottom - top }}
    />
  );
}
