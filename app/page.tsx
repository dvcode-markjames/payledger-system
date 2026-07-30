"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { getManilaTodayRangeUTC } from "@/lib/manilaDate";
import { Transaction } from "@/lib/types";
import AppShell from "@/components/AppShell";
import { ArrowDownCircle, ArrowUpCircle, Coins, RefreshCw, Wallet, CalendarDays } from "lucide-react";
import Link from "next/link";

interface PlatformTotals {
  cashIn: number;
  cashOut: number;
  commission: number;
  providerFee: number;
  count: number;
}

const EMPTY: PlatformTotals = { cashIn: 0, cashOut: 0, commission: 0, providerFee: 0, count: 0 };

// Converts a "YYYY-MM-DD" Manila calendar date into a reference Date whose
// getManilaTodayRangeUTC() bounds land on that same Manila day.
function manilaDateStringToReference(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function todayManilaDateString(): string {
  const { startISO } = getManilaTodayRangeUTC();
  return isoToManilaDateInput(startISO);
}

function isoToManilaDateInput(iso: string): string {
  // startISO already marks Manila midnight; format as YYYY-MM-DD in Manila tz.
  const d = new Date(iso);
  const manila = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const y = manila.getUTCFullYear();
  const m = String(manila.getUTCMonth() + 1).padStart(2, "0");
  const day = String(manila.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => todayManilaDateString());
  const [gcashBal, setGcashBal] = useState<number>(0);
  const [mayaBal, setMayaBal] = useState<number>(0);
  const [ditoBal, setDitoBal] = useState<number>(0);
  const [gcash, setGcash] = useState<PlatformTotals>(EMPTY);
  const [maya, setMaya] = useState<PlatformTotals>(EMPTY);
  const [dito, setDito] = useState<PlatformTotals>(EMPTY);

  const isToday = selectedDate === todayManilaDateString();

  const load = useCallback(async () => {
    setLoading(true);
    const reference = manilaDateStringToReference(selectedDate);
    const { startISO, endISO } = getManilaTodayRangeUTC(reference);

    const [{ data: balances }, { data: txs }] = await Promise.all([
      supabase.from("balances").select("*"),
      supabase
        .from("transactions")
        .select("*")
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .order("created_at", { ascending: false }),
    ]);

    const totals: Record<"gcash" | "maya" | "dito", PlatformTotals> = {
      gcash: { ...EMPTY },
      maya: { ...EMPTY },
      dito: { ...EMPTY },
    };

    (txs as Transaction[] | null)?.forEach((t) => {
      const bucket = totals[t.platform];
      bucket.commission += Number(t.commission);
      bucket.providerFee += Number(t.provider_fee ?? 0);
      bucket.count += 1;
      if (t.type === "cash_in" || t.type === "maya_cash_in") bucket.cashIn += Number(t.amount);
      else if (t.type === "cash_out" || t.type === "maya_cash_out") bucket.cashOut += Number(t.amount);
      else if (t.type === "load" || t.type === "bank_transfer" || t.type === "dito_load") bucket.cashOut += Number(t.amount);
    });

    setGcash(totals.gcash);
    setMaya(totals.maya);
    setDito(totals.dito);

    if (isToday) {
      // Live balances reflect right now.
      setGcashBal(balances?.find((b) => b.platform === "gcash")?.amount ?? 0);
      setMayaBal(balances?.find((b) => b.platform === "maya")?.amount ?? 0);
      setDitoBal(balances?.find((b) => b.platform === "dito")?.amount ?? 0);
    } else {
      // For a past day, show the balance as it stood at end-of-day: the
      // balance_after of the last completed transaction on or before that day.
      const txsAsc = (txs as Transaction[] | null) ?? [];
      const lastOfDay = (platform: "gcash" | "maya" | "dito") =>
        [...txsAsc].reverse().find((t) => t.platform === platform && t.balance_after !== null);

      const gLast = lastOfDay("gcash");
      const mLast = lastOfDay("maya");
      const dLast = lastOfDay("dito");

      const [gPrev, mPrev, dPrev] = await Promise.all([
        gLast
          ? Promise.resolve(null)
          : supabase
              .from("transactions")
              .select("balance_after")
              .eq("platform", "gcash")
              .lt("created_at", endISO)
              .not("balance_after", "is", null)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
        mLast
          ? Promise.resolve(null)
          : supabase
              .from("transactions")
              .select("balance_after")
              .eq("platform", "maya")
              .lt("created_at", endISO)
              .not("balance_after", "is", null)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
        dLast
          ? Promise.resolve(null)
          : supabase
              .from("transactions")
              .select("balance_after")
              .eq("platform", "dito")
              .lt("created_at", endISO)
              .not("balance_after", "is", null)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
      ]);

      setGcashBal(gLast ? Number(gLast.balance_after) : Number(gPrev?.data?.balance_after ?? 0));
      setMayaBal(mLast ? Number(mLast.balance_after) : Number(mPrev?.data?.balance_after ?? 0));
      setDitoBal(dLast ? Number(dLast.balance_after) : Number(dPrev?.data?.balance_after ?? 0));
    }

    setLoading(false);
  }, [supabase, selectedDate, isToday]);

  useEffect(() => {
    load();
  }, [load]);

  const totalCommission = gcash.commission + maya.commission + dito.commission;
  const totalProviderFee = gcash.providerFee + maya.providerFee + dito.providerFee;
  const selectedLabel = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }, [selectedDate]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-2xl">{isToday ? "Today's Tally" : `${selectedLabel} Tally`}</h1>
            <p className="text-text-mid text-sm">
              {isToday ? "Resets daily at midnight, Asia/Manila" : "Viewing a past day (Asia/Manila)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <CalendarDays size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-low" />
              <input
                type="date"
                value={selectedDate}
                max={todayManilaDateString()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg bg-ink-card border border-ink-line text-sm pl-8 pr-2 py-2 text-text-mid"
              />
            </div>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayManilaDateString())}
                className="text-sm border border-ink-line rounded-lg px-3 py-2 text-text-mid hover:text-text-hi"
              >
                Today
              </button>
            )}
            <button
              onClick={load}
              className="w-9 h-9 rounded-lg border border-ink-line flex items-center justify-center text-text-mid hover:text-text-hi shrink-0"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Receipt-stub summary */}
        <div
          data-tour="dashboard-summary"
          className="bg-ink-card border border-ink-line rounded-xl receipt-edge overflow-hidden mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-ink-line">
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
            <PlatformStub
              name="DITO"
              color="text-dito"
              bg="bg-dito/10"
              balance={ditoBal}
              totals={dito}
            />
          </div>
          <div className="px-5 py-4 border-t border-dashed border-ink-line flex items-center justify-between">
            <span className="text-sm text-text-mid flex items-center gap-2">
              <Coins size={15} /> Total commission earned {isToday ? "today" : "that day"}
            </span>
            <span className="font-mono tabular font-semibold text-lg text-in">
              ₱{totalCommission.toFixed(2)}
            </span>
          </div>
          {totalProviderFee > 0 && (
            <div className="px-5 py-4 border-t border-dashed border-ink-line flex items-center justify-between">
              <span className="text-sm text-text-mid flex items-center gap-2">
                <Coins size={15} /> Provider fees paid {isToday ? "today" : "that day"}
              </span>
              <span className="font-mono tabular font-semibold text-lg text-out">
                ₱{totalProviderFee.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <Link
          href="/log"
          data-tour="add-transaction"
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
        {totals.providerFee > 0 && (
          <div className="flex items-center justify-between text-text-low text-xs">
            <span>Provider fee</span>
            <span className="font-mono tabular">₱{totals.providerFee.toFixed(2)}</span>
          </div>
        )}
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
