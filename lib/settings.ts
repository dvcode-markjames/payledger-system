import { SupabaseClient } from "@supabase/supabase-js";
import { AppSettings, DEFAULT_SETTINGS } from "./types";

export async function fetchSettings(supabase: SupabaseClient): Promise<AppSettings> {
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error || !data) return DEFAULT_SETTINGS;

  const map = Object.fromEntries(data.map((row) => [row.key, row.value]));
  return {
    gcash_tiers: map.gcash_tiers ?? DEFAULT_SETTINGS.gcash_tiers,
    maya_tiers: map.maya_tiers ?? DEFAULT_SETTINGS.maya_tiers,
    // Falls back to the old shared "maya_fixed_fee" key for accounts that
    // saved settings before Load/Bank Transfer fees were split apart.
    maya_load_fixed_fee: map.maya_load_fixed_fee ?? map.maya_fixed_fee ?? DEFAULT_SETTINGS.maya_load_fixed_fee,
    maya_banktransfer_fixed_fee:
      map.maya_banktransfer_fixed_fee ?? map.maya_fixed_fee ?? DEFAULT_SETTINGS.maya_banktransfer_fixed_fee,
    maya_load_tiers: map.maya_load_tiers ?? DEFAULT_SETTINGS.maya_load_tiers,
    maya_banktransfer_tiers: map.maya_banktransfer_tiers ?? DEFAULT_SETTINGS.maya_banktransfer_tiers,
    dito_load_fixed_fee: map.dito_load_fixed_fee ?? DEFAULT_SETTINGS.dito_load_fixed_fee,
    dito_load_tiers: map.dito_load_tiers ?? DEFAULT_SETTINGS.dito_load_tiers,
  };
}

export async function saveSetting(supabase: SupabaseClient, key: keyof AppSettings, value: unknown) {
  const { error } = await supabase.from("app_settings").upsert({ key, value });
  if (error) throw error;
}
