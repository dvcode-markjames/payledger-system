"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getManilaTodayRangeUTC } from "@/lib/manilaDate";
import { Transaction } from "@/lib/types";
import AppShell from "@/components/AppShell";
import { ArrowDownCircle, ArrowUpCircle, Coins, RefreshCw, Wallet } from "lucide-react";
import Link from "next/link";

interface PlatformTotals {
  cashIn: number;
  cashOut: number;
  commission: number;
  count: number;
}

const EMPTY: PlatformTotals = { cashIn: 0, cashOut: 0, commission: 0, count: 0 };

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [gcashBal, setGcashBal] = useState<number>(0);
  const [mayaBal, setMayaBal] = useState<number>(0);
  const [gcash, setGcash] = useState<PlatformTotals>(EMPTY);
  const [maya, setMaya] = useState<PlatformTotals>(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const { startISO, endISO } = getManilaTodayRangeUTC();

    const [{ data: balances }, { data: txs }] = await Promise.all([
      supabase.from("balances").select("*"),
      supabase
        .from("transactions")
        .select("*")
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .order("created_at", { ascending: false }),
    ]);

    setGcashBal(balances?.find((b) => b.platform === "gcash")?.amount ?? 0);
    setMayaBal(balances?.find((b) => b.platform === "maya")?.amount ?? 0);

    const totals: Record<"gcash" | "maya", PlatformTotals> = {
      gcash: { ...EMPTY },
      maya: { ...EMPTY },
    };

    (txs as Transaction[] | null)?.forEach((t) => {
      const bucket = totals[t.platform];
      bucket.commission += Number(t.commission);
      bucket.count += 1;
      if (t.type === "cash_in" || t.type === "maya_cash_in") bucket.cashIn += Number(t.amount);
      else if (t.type === "cash_out" || t.type === "maya_cash_out") bucket.cashOut += Number(t.amount);
      else if (t.type === "load" || t.type === "bank_transfer") bucket.cashOut += Number(t.amount);
    });

    setGcash(totals.gcash);
    setMaya(totals.maya);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const totalCommission = gcash.commission + maya.commission;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl">Today's Tally</h1>
            <p className="text-text-mid text-sm">Resets daily at midnight, Asia/Manila</p>
          </div>
          <button
            onClick={load}
            className="w-9 h-9 rounded-lg border border-ink-line flex items-center justify-center text-text-mid hover:text-text-hi"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Receipt-stub summary */}
        <div className="bg-ink-card border border-ink-line rounded-xl receipt-edge overflow-hidden mb-6">
          <div className="grid grid-cols-2 divide-x divide-ink-line">
            <PlatformStub
              name="GCash"
              color="text-gcash"
              bg="bg-gcash/10"
              balance={gcashBal}
              totals={gcash}
            />
            <PlatformStub
              name="Maya"
              color="text-maya"
              bg="bg-maya/10"
              balance={mayaBal}
              totals={maya}
            />
          </div>
          <div className="px-5 py-4 border-t border-dashed border-ink-line flex items-center justify-between">
            <span className="text-sm text-text-mid flex items-center gap-2">
              <Coins size={15} /> Total commission earned today
            </span>
            <span className="font-mono tabular font-semibold text-lg text-in">
              ₱{totalCommission.toFixed(2)}
            </span>
          </div>
        </div>

        <Link
          href="/log"
          className="block w-full text-center rounded-xl bg-gcash text-white font-semibold py-3.5 mb-3"
        >
          + Add transaction
        </Link>
        <Link
          href="/history"
          className="block w-full text-center rounded-xl border border-ink-line text-text-mid font-medium py-3"
        >
          View full history
        </Link>
      </div>
    </AppShell>
  );
}

function PlatformStub({
  name,
  color,
  bg,
  balance,
  totals,
}: {
  name: string;
  color: string;
  bg: string;
  balance: number;
  totals: PlatformTotals;
}) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${bg} ring-1 ring-inset ring-current ${color}`} />
        <span className={`font-display font-bold ${color}`}>{name}</span>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-1.5 text-text-low text-[11px] uppercase tracking-wide">
          <Wallet size={12} /> Balance
        </div>
        <div className="font-mono tabular text-xl font-semibold mt-0.5">
          ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <Row icon={<ArrowDownCircle size={13} className="text-in" />} label="Cash in" value={totals.cashIn} />
        <Row icon={<ArrowUpCircle size={13} className="text-out" />} label="Cash out" value={totals.cashOut} />
        <div className="divider-dashed pt-2 flex items-center justify-between text-text-mid">
          <span>Commission</span>
          <span className="font-mono tabular">₱{totals.commission.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-text-low text-xs">
          <span>Transactions</span>
          <span className="font-mono tabular">{totals.count}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-text-mid">
        {icon}
        {label}
      </span>
      <span className="font-mono tabular">₱{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    </div>
  );
}
