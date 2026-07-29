"use client";

interface TourOverlayProps {
  /** Bounding box of the currently highlighted element, or null while locating/unknown. */
  targetRect: DOMRect | null;
  /** Extra breathing room (px) around the target that should stay undimmed. */
  padding: number;
}

/**
 * Darkens the entire page except for a rectangular "spotlight" around the
 * element the current tour step is highlighting.
 *
 * Implementation note: rather than fighting with `clip-path` polygons to
 * punch a hole in a single full-screen div, we render four separate dark
 * panels (top / bottom / left / right) that together frame the spotlight
 * rectangle. This has two nice side effects for free:
 *   1. The spotlight area itself is left completely empty of any overlay
 *      element, so the highlighted control remains fully clickable.
 *   2. Each panel is a real DOM element, so clicks on the dimmed areas are
 *      naturally blocked (captured by the panel) without extra JS.
 */
export default function TourOverlay({ targetRect, padding }: TourOverlayProps) {
  // While we don't yet know where the target is (e.g. mid page-navigation),
  // just show a plain full-screen dim so the page underneath isn't usable
  // and there's no flash of an un-highlighted, fully-lit page.
  if (!targetRect) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[9997] bg-black/70 backdrop-blur-[1px] animate-tour-fade"
      />
    );
  }

  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  // The "hole" — the undimmed rectangle around the target — clamped so it
  // never extends past the viewport edges.
  const holeTop = Math.max(targetRect.top - padding, 0);
  const holeLeft = Math.max(targetRect.left - padding, 0);
  const holeRight = Math.min(targetRect.right + padding, vw);
  const holeBottom = Math.min(targetRect.bottom + padding, vh);

  const panelBase =
    "fixed bg-black/70 backdrop-blur-[1px] transition-all duration-300 ease-out z-[9997]";

  return (
    <div aria-hidden="true">
      {/* Panel above the hole */}
      <div className={panelBase} style={{ top: 0, left: 0, right: 0, height: holeTop }} />
      {/* Panel below the hole */}
      <div className={panelBase} style={{ top: holeBottom, left: 0, right: 0, bottom: 0 }} />
      {/* Panel to the left of the hole (same vertical span as the hole) */}
      <div
        className={panelBase}
        style={{ top: holeTop, left: 0, width: holeLeft, height: holeBottom - holeTop }}
      />
      {/* Panel to the right of the hole (same vertical span as the hole) */}
      <div
        className={panelBase}
        style={{ top: holeTop, left: holeRight, right: 0, height: holeBottom - holeTop }}
      />
    </div>
  );
}
