"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { ToastContext } from "./ToastContext";
import type { ToastVariant } from "./ToastContext";
import Toast from "./Toast";

/** How long a toast stays fully visible before it starts fading out. */
const VISIBLE_MS = 2600;
/** Must match the "toast-out" animation duration in tailwind.config.ts. */
const EXIT_MS = 180;

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  leaving: boolean;
}

let nextId = 0;

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [portalMounted, setPortalMounted] = useState(false);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>[]>>(new Map());

  useEffect(() => setPortalMounted(true), []);

  // Clear any pending timers on unmount so they don't fire after the fact.
  useEffect(() => {
    return () => {
      timers.current.forEach((ts) => ts.forEach(clearTimeout));
      timers.current.clear();
    };
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    timers.current.delete(id);
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, variant, leaving: false }]);

      const startLeave = setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      }, VISIBLE_MS);

      const finalize = setTimeout(() => removeToast(id), VISIBLE_MS + EXIT_MS);

      timers.current.set(id, [startLeave, finalize]);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {portalMounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-20 md:bottom-6 z-50 flex flex-col items-center gap-2 px-4"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <Toast key={t.id} message={t.message} variant={t.variant} leaving={t.leaving} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
