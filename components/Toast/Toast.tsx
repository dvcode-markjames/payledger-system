"use client";

import { CheckCircle2, XCircle, Info } from "lucide-react";
import type { ToastVariant } from "./ToastContext";

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ReactNode; border: string; iconColor: string }> = {
  success: { icon: <CheckCircle2 size={16} />, border: "border-in/40", iconColor: "text-in" },
  error: { icon: <XCircle size={16} />, border: "border-out/40", iconColor: "text-out" },
  info: { icon: <Info size={16} />, border: "border-ink-line", iconColor: "text-text-mid" },
};

export default function Toast({
  message,
  variant,
  leaving,
}: {
  message: string;
  variant: ToastVariant;
  leaving: boolean;
}) {
  const { icon, border, iconColor } = VARIANT_STYLES[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border ${border} bg-ink-card shadow-lg shadow-black/30 px-4 py-3 text-sm text-text-hi max-w-sm ${
        leaving ? "animate-toast-out" : "animate-toast-in"
      }`}
    >
      <span className={iconColor}>{icon}</span>
      <span>{message}</span>
    </div>
  );
}
