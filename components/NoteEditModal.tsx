"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function NoteEditModal({
  currentNote,
  onClose,
  onSave,
}: {
  currentNote: string | null;
  onClose: () => void;
  onSave: (note: string) => Promise<void>;
}) {
  const [value, setValue] = useState(currentNote ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(value);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-30 px-4 pb-4 md:pb-0">
      <div className="bg-ink-card border border-ink-line rounded-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Edit note</h3>
          <button onClick={onClose} className="text-text-mid">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-text-mid mb-3">
          Only the note can be corrected here — amount, commission, and balance are locked
          once a transaction is saved.
        </p>
        <label className="text-xs text-text-mid uppercase tracking-wide">Note</label>
        <textarea
          autoFocus
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add or correct a note (optional)"
          className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 text-sm text-text-hi placeholder:text-text-low outline-none focus:border-gcash resize-none"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full rounded-lg bg-gcash text-white font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
}
