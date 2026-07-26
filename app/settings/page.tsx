"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchSettings, saveSetting } from "@/lib/settings";
import { AppSettings, DEFAULT_SETTINGS } from "@/lib/types";
import AppShell from "@/components/AppShell";
import TierEditor from "@/components/TierEditor";
import { Check } from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSettings(await fetchSettings(supabase));
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveAll() {
    setSaving(true);
    setErrorMsg(null);
    try {
      await Promise.all([
        saveSetting(supabase, "gcash_tiers", settings.gcash_tiers),
        saveSetting(supabase, "maya_tiers", settings.maya_tiers),
        saveSetting(supabase, "maya_load_fixed_fee", settings.maya_load_fixed_fee),
        saveSetting(supabase, "maya_banktransfer_fixed_fee", settings.maya_banktransfer_fixed_fee),
        saveSetting(supabase, "maya_load_tiers", settings.maya_load_tiers),
        saveSetting(supabase, "maya_banktransfer_tiers", settings.maya_banktransfer_tiers),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err: any) {
      setErrorMsg(`Couldn't save settings: ${err?.message ?? "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 pb-10">
        <h1 className="font-display font-bold text-2xl mb-1">Commission settings</h1>
        <p className="text-text-mid text-sm mb-6">
          Nothing here is hard-coded — edit any bracket or fee and it applies to the next transaction.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 items-start">
          <section className="bg-ink-card border border-ink-line rounded-xl p-4">
            <h2 className="font-display font-semibold text-gcash mb-3">GCash — Cash In / Cash Out</h2>
            <TierEditor
              tiers={settings.gcash_tiers}
              onChange={(gcash_tiers) => setSettings((s) => ({ ...s, gcash_tiers }))}
            />
          </section>

          <div className="space-y-4">
            <section className="bg-ink-card border border-ink-line rounded-xl p-4">
              <h2 className="font-display font-semibold text-maya mb-3">Maya — Maya-to-Maya Cash In / Cash Out</h2>
              <TierEditor
                tiers={settings.maya_tiers}
                onChange={(maya_tiers) => setSettings((s) => ({ ...s, maya_tiers }))}
              />
            </section>

            <section className="bg-ink-card border border-ink-line rounded-xl p-4 space-y-4">
              <h2 className="font-display font-semibold text-maya mb-1">Maya — Load & Bank Transfer</h2>

              <div className="border-b border-ink-line pb-4 space-y-2">
                <label className="text-xs text-text-mid uppercase tracking-wide mb-1.5 block">Load</label>
                <div>
                  <label className="text-[11px] text-text-low">Maya's fixed fee per transaction (₱)</label>
                  <input
                    type="number"
                    value={settings.maya_load_fixed_fee}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, maya_load_fixed_fee: parseFloat(e.target.value) || 0 }))
                    }
                    className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 font-mono tabular"
                  />
                </div>
                <label className="text-[11px] text-text-low mb-1.5 block">Our added commission — Load</label>
                <TierEditor
                  tiers={settings.maya_load_tiers}
                  onChange={(maya_load_tiers) => setSettings((s) => ({ ...s, maya_load_tiers }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-text-mid uppercase tracking-wide mb-1.5 block">Bank transfer</label>
                <div>
                  <label className="text-[11px] text-text-low">Maya's fixed fee per transaction (₱)</label>
                  <input
                    type="number"
                    value={settings.maya_banktransfer_fixed_fee}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, maya_banktransfer_fixed_fee: parseFloat(e.target.value) || 0 }))
                    }
                    className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 font-mono tabular"
                  />
                </div>
                <label className="text-[11px] text-text-low mb-1.5 block">
                  Our added commission — Bank transfer
                </label>
                <TierEditor
                  tiers={settings.maya_banktransfer_tiers}
                  onChange={(maya_banktransfer_tiers) => setSettings((s) => ({ ...s, maya_banktransfer_tiers }))}
                />
              </div>
            </section>
          </div>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full rounded-xl bg-gcash text-white font-semibold py-3.5 disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
        >
          {saved ? (
            <>
              <Check size={18} /> Saved
            </>
          ) : saving ? (
            "Saving…"
          ) : (
            "Save all settings"
          )}
        </button>
      </div>
    </AppShell>
  );
}
