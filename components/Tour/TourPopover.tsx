"use client";

import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { TourStep } from "./TourContext";

type Placement = "top" | "bottom" | "left" | "right";

interface TourPopoverProps {
  step: TourStep | null;
  targetRect: DOMRect | null;
  index: number;
  total: number;
  isLocating: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

const POPOVER_WIDTH = 336; // px
const GAP = 14; // px space kept between the highlight box and the popover
const VIEWPORT_MARGIN = 16; // px minimum distance kept from any screen edge
const MOBILE_BREAKPOINT = 640; // px — below this we dock the popover to the bottom of the screen

/**
 * Floating popover shown alongside the highlighted element. Forwards its
 * ref so <TourProvider> can programmatically focus it (for accessibility)
 * and trap Tab navigation inside it while the tour is active.
 */
const TourPopover = forwardRef<HTMLDivElement, TourPopoverProps>(function TourPopover(
  { step, targetRect, index, total, isLocating, onNext, onPrev, onSkip, onFinish },
  ref
) {
  if (!step) return null;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  const { style, arrowPlacement, docked } = getPopoverLayout(targetRect, step.placement ?? "bottom");

  return (
    <div
      ref={ref}
      // Dialog semantics so assistive tech announces this as a modal panel.
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-popover-title"
      aria-describedby="tour-popover-description"
      tabIndex={-1}
      className={`fixed z-[9999] rounded-2xl border border-ink-line bg-ink-card shadow-2xl shadow-black/50 outline-none animate-tour-pop ${
        docked ? "w-auto" : "w-[336px]"
      } max-w-[calc(100vw-2rem)]`}
      style={style}
    >
      {/* Directional caret pointing back at the highlighted element (skipped in the mobile docked layout, and while the target isn't known yet) */}
      {targetRect && !docked && <PopoverArrow placement={arrowPlacement} />}

      <div className="p-5">
        {/* Header: icon + title + close/skip */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 shrink-0 rounded-lg bg-gcash/15 border border-gcash/30 flex items-center justify-center text-gcash">
              {step.icon ?? <Sparkles size={16} />}
            </span>
            <h2 id="tour-popover-title" className="font-display font-bold text-base text-text-hi truncate">
              {step.title}
            </h2>
          </div>
          <button
            onClick={onSkip}
            aria-label="Close tour"
            className="shrink-0 text-text-low hover:text-text-hi transition-colors rounded-md p-1 -mr-1 -mt-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body copy */}
        <p id="tour-popover-description" className="text-sm text-text-mid leading-relaxed mb-4">
          {isLocating ? "Getting things ready…" : step.description}
        </p>

        {/* Footer: step counter (e.g. "2 / 12") + Back / Skip / Next-or-Finish */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-mono tabular text-text-low" aria-live="polite">
            {index + 1} / {total}
          </span>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 text-sm text-text-mid hover:text-text-hi border border-ink-line rounded-lg px-3 py-1.5 transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            {!isLast && (
              <button
                onClick={onSkip}
                className="text-sm text-text-low hover:text-text-mid px-2 py-1.5 transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={isLast ? onFinish : onNext}
              className="flex items-center gap-1 text-sm bg-gcash text-white font-semibold rounded-lg px-3.5 py-1.5 hover:brightness-110 transition-all"
            >
              {isLast ? "Finish" : "Next"} {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>

        {/* Progress bar (visual companion to the "x / y" counter above) */}
        <div className="mt-3 h-1 rounded-full bg-ink overflow-hidden">
          <div
            className="h-full bg-gcash transition-all duration-300 ease-out rounded-full"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
});

export default TourPopover;

/** Small triangular caret drawn on the popover's edge, pointing back at the target. */
function PopoverArrow({ placement }: { placement: Placement }) {
  const base = "absolute w-3 h-3 bg-ink-card rotate-45 border-ink-line";
  switch (placement) {
    case "top":
      // Popover is above the target → caret on its bottom edge, pointing down.
      return <span className={`${base} border-b border-r left-1/2 -translate-x-1/2 -bottom-1.5`} aria-hidden="true" />;
    case "bottom":
      // Popover is below the target → caret on its top edge, pointing up.
      return <span className={`${base} border-t border-l left-1/2 -translate-x-1/2 -top-1.5`} aria-hidden="true" />;
    case "left":
      // Popover is left of the target → caret on its right edge, pointing right.
      return <span className={`${base} border-t border-r top-1/2 -translate-y-1/2 -right-1.5`} aria-hidden="true" />;
    case "right":
      // Popover is right of the target → caret on its left edge, pointing left.
      return <span className={`${base} border-b border-l top-1/2 -translate-y-1/2 -left-1.5`} aria-hidden="true" />;
    default:
      return null;
  }
}

/**
 * Computes the popover's fixed-position style for a given target rect and
 * preferred placement, automatically flipping to the opposite side if the
 * preferred side would overflow the viewport, and falling back to a
 * bottom-docked "sheet" layout on narrow (mobile) screens where floating
 * popovers next to small tap targets tend to feel cramped.
 */
function getPopoverLayout(
  targetRect: DOMRect | null,
  preferred: Placement
): { style: CSSProperties; arrowPlacement: Placement; docked: boolean } {
  if (typeof window === "undefined") {
    return { style: {}, arrowPlacement: preferred, docked: false };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Mobile: always dock to the bottom of the screen as a compact sheet,
  // regardless of where the target sits — this keeps the popover reachable
  // with a thumb and avoids overlapping small highlighted controls.
  if (vw < MOBILE_BREAKPOINT) {
    return {
      style: { left: VIEWPORT_MARGIN, right: VIEWPORT_MARGIN, bottom: VIEWPORT_MARGIN, top: "auto" },
      arrowPlacement: preferred,
      docked: true,
    };
  }

  // Still locating the target, or it couldn't be found — center the
  // popover on screen rather than anchoring to a (0,0) rect.
  if (!targetRect) {
    return {
      style: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
      arrowPlacement: preferred,
      docked: false,
    };
  }

  const ESTIMATED_HEIGHT = 200; // rough popover height, used only for flip decisions

  let placement = preferred;
  if (placement === "bottom" && targetRect.bottom + GAP + ESTIMATED_HEIGHT > vh) placement = "top";
  else if (placement === "top" && targetRect.top - GAP - ESTIMATED_HEIGHT < 0) placement = "bottom";
  else if (placement === "right" && targetRect.right + GAP + POPOVER_WIDTH > vw) placement = "left";
  else if (placement === "left" && targetRect.left - GAP - POPOVER_WIDTH < 0) placement = "right";

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

  let style: CSSProperties;
  switch (placement) {
    case "top":
      style = {
        left: clamp(targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2, VIEWPORT_MARGIN, vw - POPOVER_WIDTH - VIEWPORT_MARGIN),
        top: Math.max(targetRect.top - GAP, VIEWPORT_MARGIN),
        transform: "translateY(-100%)",
      };
      break;
    case "left":
      style = {
        left: Math.max(targetRect.left - GAP - POPOVER_WIDTH, VIEWPORT_MARGIN),
        top: clamp(targetRect.top + targetRect.height / 2, VIEWPORT_MARGIN, vh - VIEWPORT_MARGIN),
        transform: "translateY(-50%)",
      };
      break;
    case "right":
      style = {
        left: Math.min(targetRect.right + GAP, vw - POPOVER_WIDTH - VIEWPORT_MARGIN),
        top: clamp(targetRect.top + targetRect.height / 2, VIEWPORT_MARGIN, vh - VIEWPORT_MARGIN),
        transform: "translateY(-50%)",
      };
      break;
    case "bottom":
    default:
      style = {
        left: clamp(targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2, VIEWPORT_MARGIN, vw - POPOVER_WIDTH - VIEWPORT_MARGIN),
        top: Math.min(targetRect.bottom + GAP, vh - VIEWPORT_MARGIN),
      };
      break;
  }

  return { style, arrowPlacement: placement, docked: false };
}
