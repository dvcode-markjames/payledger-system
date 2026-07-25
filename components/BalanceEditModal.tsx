"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function BalanceEditModal({
  label,
  currentBalance,
  onClose,
  onSave,
}: {
  label: string;
  currentBalance: number;
  onClose: () => void;
  onSave: (value: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(currentBalance));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    await onSave(num);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-30 px-4 pb-4 md:pb-0">
      <div className="bg-ink-card border border-ink-line rounded-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Edit {label} balance</h3>
          <button onClick={onClose} className="text-text-mid">
            <X size={18} />
          </button>
        </div>
        <label className="text-xs text-text-mid uppercase tracking-wide">Current balance (₱)</label>
        <input
          autoFocus
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 font-mono tabular text-lg outline-none focus:border-gcash"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full rounded-lg bg-gcash text-white font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save balance"}
        </button>
      </div>
    </div>
  );
}
