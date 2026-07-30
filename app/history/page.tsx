"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction, Platform, TxType, TX_LABELS, PLATFORM_LABELS, PLATFORM_STYLES, balanceSign } from "@/lib/types";
import { formatManilaTime } from "@/lib/manilaDate";
import AppShell from "@/components/AppShell";
import NoteEditModal from "@/components/NoteEditModal";
import { useToast } from "@/components/Toast";
import { Search, Download, Printer, ArrowDownCircle, ArrowUpCircle, Pencil } from "lucide-react";

export default function HistoryPage() {
  const supabase = createClient();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [type, setType] = useState<TxType | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    setTransactions((data as Transaction[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (platform !== "all" && t.platform !== platform) return false;
      if (type !== "all" && t.type !== type) return false;
      if (from && new Date(t.created_at) < new Date(from)) return false;
      if (to && new Date(t.created_at) > new Date(to + "T23:59:59")) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${t.reference_no ?? ""} ${t.note ?? ""} ${t.customer_mobile ?? ""} ${t.account_name ?? ""} ${
          t.account_number ?? ""
        } ${t.amount}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, platform, type, from, to, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, t) => {
        acc.amount += balanceSign(t) * Number(t.amount);
        acc.commission += Number(t.commission);
        acc.providerFee += Number(t.provider_fee ?? 0);
        return acc;
      },
      { amount: 0, commission: 0, providerFee: 0 }
    );
  }, [filtered]);

  async function handleExport() {
    const XLSX = await import("xlsx");
    const rows = filtered.map((t) => ({
      Date: formatManilaTime(t.created_at),
      Platform: t.platform.toUpperCase(),
      Type: TX_LABELS[t.type],
      Amount: t.amount,
      Commission: t.commission,
      "Provider fee": t.provider_fee,
      "Commission netted in": t.commission_included ? "Yes" : "No",
      "Net total": t.net_total,
      "Balance before": t.balance_before,
      "Balance after": t.balance_after,
      "Customer number": t.customer_mobile ?? "",
      "Account name": t.account_name ?? "",
      "Account number": t.account_number ?? "",
      Reference: t.reference_no ?? "",
      Note: t.note ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `payledger-history-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function handlePrint() {
    window.print();
  }

  async function handleNoteSave(transactionId: string, note: string) {
    const { data, error } = await supabase.rpc("update_transaction_note", {
      p_transaction_id: transactionId,
      p_note: note,
    });
    if (error) {
      showToast(error.message, "error");
      return;
    }
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? (data as Transaction) : t))
    );
    showToast("Note saved");
  }

  const editingNoteTx = transactions.find((t) => t.id === editingNoteId) ?? null;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-display font-bold text-2xl">History</h1>
            <p className="text-text-mid text-sm">{filtered.length} transactions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              data-tour="history-export"
              className="flex items-center gap-1.5 text-sm border border-ink-line rounded-lg px-3 py-2 text-text-mid hover:text-text-hi"
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-sm border border-ink-line rounded-lg px-3 py-2 text-text-mid hover:text-text-hi"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div data-tour="history-filters" className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="col-span-2 md:col-span-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-low" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref / note / number"
              className="w-full pl-8 pr-2 py-2 rounded-lg bg-ink-card border border-ink-line text-sm outline-none focus:border-gcash"
            />
          </div>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform | "all")}
            className="rounded-lg bg-ink-card border border-ink-line text-sm px-2 py-2"
          >
            <option value="all">All platforms</option>
            <option value="gcash">GCash</option>
            <option value="maya">Maya</option>
            <option value="dito">DITO</option>
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TxType | "all")}
            className="rounded-lg bg-ink-card border border-ink-line text-sm px-2 py-2"
          >
            <option value="all">All types</option>
            {Object.entries(TX_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-1/2 rounded-lg bg-ink-card border border-ink-line text-xs px-1.5 py-2"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-1/2 rounded-lg bg-ink-card border border-ink-line text-xs px-1.5 py-2"
            />
          </div>
        </div>

        <div id="print-area">
          <div className="hidden print:block mb-4 font-display font-bold text-lg">PayLedger — Transaction History</div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto border border-ink-line rounded-xl print:border-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-low text-xs uppercase tracking-wide border-b border-ink-line">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right min-w-[130px]">Amount</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Provider fee</th>
                  <th className="px-4 py-3 text-right">Net total</th>
                  <th className="px-4 py-3">Commission mode</th>
                  <th className="px-4 py-3">Customer # / Account</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3 print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-ink-line/60 last:border-0">
                    <td className="px-4 py-3 font-mono tabular text-xs text-text-mid whitespace-nowrap">
                      {formatManilaTime(t.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={PLATFORM_STYLES[t.platform].text}>
                        {t.platform.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-mid">{TX_LABELS[t.type]}</td>
                    <td className="px-4 py-3 text-right font-mono tabular whitespace-nowrap">
                      <span className={`mr-1 ${balanceSign(t) > 0 ? "text-in" : "text-out"}`}>
                        {balanceSign(t) > 0 ? "+" : "−"}
                      </span>
                      ₱{Number(t.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-in">₱{Number(t.commission).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular text-out">
                      {t.provider_fee ? `₱${Number(t.provider_fee).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular">₱{Number(t.net_total).toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded-md border whitespace-nowrap ${
                          t.commission_included
                            ? "border-gcash/40 text-gcash bg-gcash/10"
                            : "border-ink-line text-text-low"
                        }`}
                      >
                        {t.commission_included ? "Netted in" : "Separate"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-low">
                      {t.account_name || t.account_number ? (
                        <div className="leading-tight">
                          <div>{t.account_name ?? "—"}</div>
                          <div className="font-mono tabular text-xs">{t.account_number ?? "—"}</div>
                        </div>
                      ) : (
                        <span className="font-mono tabular">{t.customer_mobile ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-low">{t.reference_no ?? "—"}</td>
                    <td className="px-4 py-3 text-text-low">
                      {t.note ?? "—"}
                      {t.note_edited_at && (
                        <span className="ml-1.5 text-[10px] text-text-low/70">(edited)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 print:hidden">
                      <button
                        onClick={() => setEditingNoteId(t.id)}
                        title="Edit note"
                        className="text-text-low hover:text-text-hi"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-text-low">
                      No transactions match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-ink-line font-semibold">
                  <td className="px-4 py-3" colSpan={3}>
                    Totals
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono tabular ${
                      totals.amount < 0 ? "text-out" : ""
                    }`}
                  >
                    {totals.amount < 0 ? "−" : ""}₱{Math.abs(totals.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular text-in">₱{totals.commission.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular text-out">₱{totals.providerFee.toFixed(2)}</td>
                  <td colSpan={6} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((t) => (
              <div key={t.id} className="bg-ink-card border border-ink-line rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-display font-semibold text-sm ${PLATFORM_STYLES[t.platform].text}`}>
                    {t.platform.toUpperCase()}
                  </span>
                  <span className="text-xs text-text-low font-mono tabular">{formatManilaTime(t.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm mb-2">
                  {(t.type === "balance_adjustment" ? Number(t.net_total) >= 0 : t.type.includes("in")) ? (
                    <ArrowDownCircle size={14} className="text-in" />
                  ) : (
                    <ArrowUpCircle size={14} className="text-out" />
                  )}
                  {TX_LABELS[t.type]}
                  <span
                    className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border ${
                      t.commission_included
                        ? "border-gcash/40 text-gcash bg-gcash/10"
                        : "border-ink-line text-text-low"
                    }`}
                  >
                    {t.commission_included ? "Fee netted in" : "Fee separate"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-text-low">Amount</div>
                    <div className="font-mono tabular">
                      <span className={`mr-1 ${balanceSign(t) > 0 ? "text-in" : "text-out"}`}>
                        {balanceSign(t) > 0 ? "+" : "−"}
                      </span>
                      ₱{Number(t.amount).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-low">Commission</div>
                    <div className="font-mono tabular text-in">₱{Number(t.commission).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-text-low">Net</div>
                    <div className="font-mono tabular">₱{Number(t.net_total).toFixed(2)}</div>
                  </div>
                </div>
                {t.provider_fee > 0 && (
                  <div className="mt-1.5 text-xs text-text-low">
                    {PLATFORM_LABELS[t.platform]} fee (not our commission):{" "}
                    <span className="font-mono tabular text-out">₱{Number(t.provider_fee).toFixed(2)}</span>
                  </div>
                )}
                {(t.customer_mobile || t.account_name || t.account_number || t.reference_no || t.note) && (
                  <div className="mt-2 pt-2 border-t border-dashed border-ink-line text-xs text-text-low space-x-3">
                    {t.customer_mobile && <span className="font-mono tabular">#: {t.customer_mobile}</span>}
                    {(t.account_name || t.account_number) && (
                      <span>
                        {t.account_name ?? "—"}{" "}
                        <span className="font-mono tabular">({t.account_number ?? "—"})</span>
                      </span>
                    )}
                    {t.reference_no && <span>Ref: {t.reference_no}</span>}
                    {t.note && (
                      <span>
                        {t.note}
                        {t.note_edited_at && <span className="text-text-low/70"> (edited)</span>}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setEditingNoteId(t.id)}
                  className="mt-2 flex items-center gap-1 text-[11px] text-text-low hover:text-text-hi print:hidden"
                >
                  <Pencil size={11} /> {t.note ? "Edit note" : "Add note"}
                </button>
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <p className="text-center text-text-low py-10 text-sm">No transactions match these filters.</p>
            )}
          </div>
        </div>
      </div>

      {editingNoteTx && (
        <NoteEditModal
          currentNote={editingNoteTx.note}
          onClose={() => setEditingNoteId(null)}
          onSave={(note) => handleNoteSave(editingNoteTx.id, note)}
        />
      )}
    </AppShell>
  );
}
