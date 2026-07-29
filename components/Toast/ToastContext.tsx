"use client";

import { createContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastContextValue {
  /** Shows a toast that pops up, then disappears on its own after a few seconds. */
  showToast: (message: string, variant?: ToastVariant) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
