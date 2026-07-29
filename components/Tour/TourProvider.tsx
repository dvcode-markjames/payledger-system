"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { TourContext } from "./TourContext";
import type { TourStep, TourContextValue } from "./TourContext";
import { defaultTourSteps } from "./tourSteps";
import TourOverlay from "./TourOverlay";
import TourHighlight from "./TourHighlight";
import TourPopover from "./TourPopover";

/** localStorage key used to remember that the user has already seen (or skipped) the tour. */
const STORAGE_KEY = "payledger:tour-completed";
/** How long we're willing to wait for a step's target element to appear (e.g. after a route change) before giving up. */
const ELEMENT_WAIT_TIMEOUT_MS = 4000;
/** Poll interval while waiting for a target element to mount. */
const ELEMENT_POLL_INTERVAL_MS = 80;
/** Default padding (px) around the highlighted element, used when a step doesn't specify one. */
const DEFAULT_PADDING = 8;

interface TourProviderProps {
  /** Ordered list of tour steps. Defaults to the app-wide PayLedger tour. */
  steps?: TourStep[];
  children: ReactNode;
  /** Routes on which the tour should never auto-start on first load (e.g. the login screen). */
  excludeAutoStartPaths?: string[];
}

/**
 * Returns true if an element is actually visible on screen right now
 * (as opposed to existing in the DOM but hidden via `display: none`,
 * `visibility: hidden`, or zero size — e.g. the desktop sidebar nav link
 * while viewing on a narrow, mobile-nav viewport).
 */
function isElementVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  return true;
}

/** Finds the first currently-visible element matching a selector (there may be more than one, e.g. desktop vs. mobile nav). */
function findVisibleTarget(selector: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(selector);
  for (const el of Array.from(candidates)) {
    if (isElementVisible(el)) return el;
  }
  return null;
}

export default function TourProvider({
  steps = defaultTourSteps,
  children,
  excludeAutoStartPaths = ["/login"],
}: TourProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false); // guards createPortal against SSR

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const hasAutoStartedRef = useRef(false);
  const cancelLocateRef = useRef<() => void>(() => {});

  const currentStep = isActive ? steps[currentIndex] ?? null : null;
  const totalSteps = steps.length;

  // Portals require `document`, which doesn't exist during SSR — only
  // render into the portal once we're safely on the client.
  useEffect(() => setPortalMounted(true), []);

  // ─────────────────────────── Completion persistence ───────────────────────────

  const isTourCompleted = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      // localStorage can throw in private-browsing / locked-down environments — fail open.
      return false;
    }
  }, []);

  const markCompleted = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore — nothing we can do if storage is unavailable */
    }
  }, []);

  // ─────────────────────────── Locating the target element ───────────────────────────

  /**
   * Repeatedly polls for a step's target element (it may not exist yet,
   * e.g. right after a client-side route change), scrolls it into view if
   * it's outside the viewport, then measures it for the overlay/highlight/
   * popover to position themselves against.
   */
  const locateStep = useCallback((step: TourStep) => {
    cancelLocateRef.current(); // cancel any previous, still-running locate loop
    setIsLocating(true);
    setTargetRect(null);

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const finish = (rect: DOMRect | null) => {
      if (cancelled) return;
      setTargetRect(rect);
      setIsLocating(false);
    };

    const attempt = () => {
      if (cancelled) return;
      const el = findVisibleTarget(step.target);
      if (!el) return; // keep polling

      clearInterval(intervalId);
      clearTimeout(timeoutId);

      const rect = el.getBoundingClientRect();
      const fullyVisible =
        rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;

      if (fullyVisible) {
        finish(rect);
      } else {
        // Auto-scroll the target into view, then re-measure once the
        // smooth scroll has had time to settle.
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        window.setTimeout(() => finish(el.getBoundingClientRect()), 450);
      }
    };

    const intervalId = setInterval(attempt, ELEMENT_POLL_INTERVAL_MS);
    attempt(); // try immediately too, no need to wait for the first tick

    timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      // Give up gracefully rather than hanging forever — the popover will
      // fall back to a centered layout and the description still shows.
      if (!cancelled) setIsLocating(false);
    }, ELEMENT_WAIT_TIMEOUT_MS);

    cancelLocateRef.current = () => {
      cancelled = true;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  // Drives navigation + locating whenever the active step changes. If the
  // step lives on a different route, push there first; the effect will
  // re-run once `pathname` updates to match, and only then start locating.
  useEffect(() => {
    if (!isActive || !currentStep) return;

    if (currentStep.route && currentStep.route !== pathname) {
      router.push(currentStep.route);
      return;
    }

    locateStep(currentStep);
    return () => cancelLocateRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentIndex, pathname]);

  // Keep the highlight/popover glued to the target while the page scrolls
  // or the viewport resizes (e.g. rotating a phone, resizing a window).
  useEffect(() => {
    if (!isActive || !currentStep) return;

    let raf = 0;
    const handleReflow = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = findVisibleTarget(currentStep.target);
        if (el) setTargetRect(el.getBoundingClientRect());
      });
    };

    window.addEventListener("resize", handleReflow);
    window.addEventListener("scroll", handleReflow, true); // capture phase catches scroll in any nested container
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("scroll", handleReflow, true);
    };
  }, [isActive, currentStep]);

  // ─────────────────────────── Navigation controls ───────────────────────────

  const startTour = useCallback((fromIndex = 0) => {
    setCurrentIndex(Math.min(Math.max(fromIndex, 0), steps.length - 1));
    setIsActive(true);
  }, [steps.length]);

  const closeTour = useCallback(() => {
    cancelLocateRef.current();
    setIsActive(false);
    setTargetRect(null);
    setIsLocating(false);
  }, []);

  const finishTour = useCallback(() => {
    markCompleted();
    closeTour();
  }, [markCompleted, closeTour]);

  const skipTour = useCallback(() => {
    markCompleted();
    closeTour();
  }, [markCompleted, closeTour]);

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= steps.length) return;
      setCurrentIndex(index);
    },
    [steps.length]
  );

  const nextStep = useCallback(() => {
    const step = steps[currentIndex];
    Promise.resolve(step?.beforeNext?.()).then(() => {
      setCurrentIndex((i) => {
        if (i >= steps.length - 1) {
          // Finishing needs to happen after this state update settles;
          // schedule it on the next tick.
          queueMicrotask(finishTour);
          return i;
        }
        return i + 1;
      });
    });
  }, [currentIndex, steps, finishTour]);

  const previousStep = useCallback(() => {
    const step = steps[currentIndex];
    Promise.resolve(step?.beforePrev?.()).then(() => {
      setCurrentIndex((i) => Math.max(0, i - 1));
    });
  }, [currentIndex, steps]);

  // ─────────────────────────── Auto-start on first visit ───────────────────────────

  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    if (excludeAutoStartPaths.includes(pathname)) return;
    if (isTourCompleted()) return;

    hasAutoStartedRef.current = true;
    // Small delay so the page has a moment to render before we dim it.
    const t = setTimeout(() => startTour(0), 600);
    return () => clearTimeout(t);
  }, [pathname, excludeAutoStartPaths, isTourCompleted, startTour]);

  // ─────────────────────────── Keyboard navigation (Esc / arrows / Tab trap) ───────────────────────────

  useEffect(() => {
    if (!isActive) return;

    function trapTab(e: KeyboardEvent) {
      const container = popoverRef.current;
      if (!container) return;
      const focusables = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          skipTour();
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          nextStep();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          previousStep();
          break;
        case "Tab":
          trapTab(e);
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, nextStep, previousStep, skipTour]);

  // ─────────────────────────── Focus management (a11y) ───────────────────────────

  // Remember what had focus before the tour opened, and restore it on close.
  useEffect(() => {
    if (isActive) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus?.();
      previouslyFocusedRef.current = null;
    }
  }, [isActive]);

  // Move focus into the popover every time a new step is shown, so screen
  // readers announce the updated dialog content.
  useEffect(() => {
    if (isActive && !isLocating && popoverRef.current) {
      popoverRef.current.focus();
    }
  }, [isActive, currentIndex, isLocating]);

  // ─────────────────────────── Public context value ───────────────────────────

  const value: TourContextValue = useMemo(
    () => ({
      steps,
      isActive,
      currentIndex,
      currentStep,
      totalSteps,
      isLocating,
      startTour,
      nextStep,
      previousStep,
      goToStep,
      finishTour,
      skipTour,
      isTourCompleted,
    }),
    [
      steps,
      isActive,
      currentIndex,
      currentStep,
      totalSteps,
      isLocating,
      startTour,
      nextStep,
      previousStep,
      goToStep,
      finishTour,
      skipTour,
      isTourCompleted,
    ]
  );

  return (
    <TourContext.Provider value={value}>
      {children}

      {portalMounted &&
        isActive &&
        createPortal(
          <>
            <TourOverlay targetRect={targetRect} padding={currentStep?.padding ?? DEFAULT_PADDING} />
            <TourHighlight
              targetRect={targetRect}
              padding={currentStep?.padding ?? DEFAULT_PADDING}
              isLocating={isLocating}
            />
            <TourPopover
              ref={popoverRef}
              step={currentStep}
              targetRect={targetRect}
              index={currentIndex}
              total={totalSteps}
              isLocating={isLocating}
              onNext={nextStep}
              onPrev={previousStep}
              onSkip={skipTour}
              onFinish={finishTour}
            />
          </>,
          document.body
        )}
    </TourContext.Provider>
  );
}
