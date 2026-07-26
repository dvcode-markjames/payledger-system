"use client";

import { Tier } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

export default function TierEditor({
  tiers,
  onChange,
}: {
  tiers: Tier[];
  onChange: (tiers: Tier[]) => void;
}) {
  function update(index: number, field: keyof Tier, value: number) {
    const next = tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    onChange(next);
  }

  function remove(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  function add() {
    const last = tiers[tiers.length - 1];
    onChange([...tiers, { min: (last?.max ?? 0) + 1, max: (last?.max ?? 0) + 500, fee: 0 }]);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_1.5rem] gap-1.5 text-[10px] uppercase tracking-wide text-text-low px-1">
        <span>Min ₱</span>
        <span>Max ₱</span>
        <span>Fee ₱</span>
        <span></span>
      </div>
      {tiers.map((t, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_1.5rem] gap-1.5 items-center">
          <input
            type="number"
            value={t.min}
            onChange={(e) => update(i, "min", parseFloat(e.target.value) || 0)}
            className="min-w-0 w-full rounded-lg bg-ink border border-ink-line px-2 py-2 text-xs sm:text-sm font-mono tabular"
          />
          <input
            type="number"
            value={t.max}
            onChange={(e) => update(i, "max", parseFloat(e.target.value) || 0)}
            className="min-w-0 w-full rounded-lg bg-ink border border-ink-line px-2 py-2 text-xs sm:text-sm font-mono tabular"
          />
          <input
            type="number"
            value={t.fee}
            onChange={(e) => update(i, "fee", parseFloat(e.target.value) || 0)}
            className="min-w-0 w-full rounded-lg bg-ink border border-ink-line px-2 py-2 text-xs sm:text-sm font-mono tabular"
          />
          <button onClick={() => remove(i)} className="text-text-low hover:text-out p-0 flex justify-center">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-gcash mt-1"
      >
        <Plus size={14} /> Add bracket
      </button>
      <p className="text-xs text-text-low pt-1">
        The highest bracket's max amount (₱{tiers[tiers.length - 1]?.max ?? 0}) is used as the commission
        "block size" for larger amounts. E.g. a ₱1230 transaction is charged as one full block plus whatever
        bracket the ₱230 remainder falls into.
      </p>
    </div>
  );
}
