import { createElement } from "react";
import { Sparkles, Wallet, PlusCircle, History, Search, Download, Settings, Coins } from "lucide-react";
import type { TourStep } from "./TourContext";

/**
 * The default, app-wide onboarding tour for PayLedger.
 *
 * Order was chosen to mirror how a brand-new user would naturally learn the
 * app: see today's numbers → log a transaction → find it again in history →
 * understand where the commission math comes from. Each step's `route`
 * tells <TourProvider> which page to navigate to before highlighting it, so
 * the same tour can span the whole app, not just a single screen.
 *
 * Targets use `[data-tour="..."]` attributes (added to the relevant
 * elements in each page/component) rather than `id`s, because several of
 * them — like the sidebar nav links — render twice in the DOM (once for
 * desktop, once for the mobile bottom bar). The tour automatically picks
 * whichever copy is actually visible at the current viewport width.
 *
 * To add a page to the tour later: add a `data-tour="your-id"` attribute to
 * the element you want to introduce, then append a new step object below.
 * No other code changes are required — TourProvider, TourOverlay,
 * TourPopover, and TourHighlight are all fully generic.
 */
export const defaultTourSteps: TourStep[] = [
  {
    id: "welcome",
    target: '[data-tour="app-logo"]',
    route: "/",
    placement: "bottom",
    title: "Welcome to PayLedger",
    description:
      "Let's take a quick 2-minute tour of how to track your GCash and Maya cash-in / cash-out business. You can skip anytime.",
    icon: createElement(Sparkles, { size: 16 }),
  },
  {
    id: "dashboard-summary",
    target: '[data-tour="dashboard-summary"]',
    route: "/",
    placement: "bottom",
    title: "Today's Tally",
    description:
      "This card shows live GCash and Maya balances plus totals, resetting daily at midnight (Asia/Manila). Use the date picker up top to look back at any past day.",
    icon: createElement(Wallet, { size: 16 }),
  },
  {
    id: "add-transaction",
    target: '[data-tour="add-transaction"]',
    route: "/",
    placement: "top",
    title: "Log a transaction",
    description: "Tap here whenever a customer cashes in or out. We'll walk through that 3-step flow next.",
    icon: createElement(PlusCircle, { size: 16 }),
  },
  {
    id: "nav-log",
    target: '[data-tour="nav-log"]',
    route: "/",
    placement: "right",
    title: "The Log tab",
    description: "Every transaction starts here. Let's open it and see the form up close.",
    icon: createElement(PlusCircle, { size: 16 }),
  },
  {
    id: "log-platform",
    target: '[data-tour="log-platform"]',
    route: "/log",
    placement: "bottom",
    title: "Choose a platform",
    description:
      "Start by picking GCash or Maya — the available transaction types and commission rules adjust automatically.",
    icon: createElement(Wallet, { size: 16 }),
  },
  {
    id: "log-amount",
    target: '[data-tour="log-amount"]',
    route: "/log",
    placement: "top",
    title: "Enter the amount",
    description: "Commission is calculated automatically as you type, based on your tier settings — no manual math needed.",
    icon: createElement(Coins, { size: 16 }),
  },
  {
    id: "nav-history",
    target: '[data-tour="nav-history"]',
    route: "/log",
    placement: "right",
    title: "The History tab",
    description: "Every completed transaction lands here. Let's look at how to search and export it.",
    icon: createElement(History, { size: 16 }),
  },
  {
    id: "history-filters",
    target: '[data-tour="history-filters"]',
    route: "/history",
    placement: "bottom",
    title: "Search & filter",
    description:
      "Filter by platform, type, or date range, or search by reference number, note, or customer number to find any transaction fast.",
    icon: createElement(Search, { size: 16 }),
  },
  {
    id: "history-export",
    target: '[data-tour="history-export"]',
    route: "/history",
    placement: "left",
    title: "Export anytime",
    description: "Download the filtered list as an Excel file, or print a clean summary for record-keeping.",
    icon: createElement(Download, { size: 16 }),
  },
  {
    id: "nav-settings",
    target: '[data-tour="nav-settings"]',
    route: "/history",
    placement: "right",
    title: "The Settings tab",
    description: "Commission tiers and fixed fees live here — fully editable, nothing hard-coded.",
    icon: createElement(Settings, { size: 16 }),
  },
  {
    id: "settings-tiers",
    target: '[data-tour="settings-tiers"]',
    route: "/settings",
    placement: "right",
    title: "Commission tiers",
    description:
      "Edit any bracket or fixed fee and it applies to the very next transaction — no code changes, no redeploys.",
    icon: createElement(Coins, { size: 16 }),
  },
  {
    id: "settings-retake",
    target: '[data-tour="retake-tour"]',
    route: "/settings",
    placement: "top",
    title: "You're all set!",
    description: "That's the full tour. You can replay it anytime from this button if you ever need a refresher.",
    icon: createElement(Sparkles, { size: 16 }),
  },
];
