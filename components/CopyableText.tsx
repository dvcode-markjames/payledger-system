"use client";

import { useState, type MouseEvent } from "react";
import { Copy, CopyCheck } from "lucide-react";
import { useToast } from "@/components/Toast";

/**
 * Renders a value that copies itself to the clipboard when clicked/tapped —
 * e.g. customer numbers, account numbers, reference numbers. Shows a small
 * copy icon that flips to a check for a moment after copying, plus a toast.
 * Falls back to a plain (non-interactive) span for empty/placeholder values.
 */
export default function CopyableText({
  value,
  className = "",
  iconSize = 13,
  label,
}: {
  value: string | null | undefined;
  className?: string;
  iconSize?: number;
  /** Optional human name used in the toast, e.g. "Customer number". */
  label?: string;
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const isEmpty = !value || value === "—";

  async function handleCopy(e: MouseEvent) {
    e.stopPropagation();
    if (isEmpty) return;
    try {
      await navigator.clipboard.writeText(value as string);
      setCopied(true);
      showToast(label ? `${label} copied` : "Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("Couldn't copy — copy it manually", "error");
    }
  }

  if (isEmpty) {
    return <span className={className}>{value ?? "—"}</span>;
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy"
      className={`inline-flex items-center gap-1 rounded-md px-1 py-0.5 -mx-1 transition-colors hover:bg-ink-line/60 active:bg-ink-line ${className}`}
    >
      <span>{value}</span>
      {copied ? (
        <CopyCheck size={iconSize} className="text-in shrink-0" />
      ) : (
        <Copy size={iconSize} className="text-text-low shrink-0" />
      )}
    </button>
  );
}
