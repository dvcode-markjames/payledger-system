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
  onSave: (value: number, reason: string) => Promise<void>;
}) {
  const [value, setValue] = useState(String(currentBalance));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const num = parseFloat(value);
  const unchanged = !isNaN(num) && num === currentBalance;
  const canSave = !isNaN(num) && num >= 0 && reason.trim().length > 0 && !unchanged;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    await onSave(num, reason.trim());
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
        <p className="text-xs text-text-mid mb-3">
          This is a manual correction, not a transaction — it's recorded in History as a
          balance adjustment so there's always a paper trail for the difference.
        </p>
        <label className="text-xs text-text-mid uppercase tracking-wide">Current balance (₱)</label>
        <input
          autoFocus
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 font-mono tabular text-lg outline-none focus:border-gcash"
        />
        <label className="mt-3 block text-xs text-text-mid uppercase tracking-wide">
          Reason (required)
        </label>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this changing? e.g. recount, float withdrawal, correcting a typo"
          className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 text-sm text-text-hi placeholder:text-text-low outline-none focus:border-gcash resize-none"
        />
        {unchanged && (
          <p className="mt-1.5 text-xs text-text-low">Enter a different amount to save a change.</p>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="mt-4 w-full rounded-lg bg-gcash text-white font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save balance"}
        </button>
      </div>
    </div>
  );
}
