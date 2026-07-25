import { SupabaseClient } from "@supabase/supabase-js";
import { AppSettings, DEFAULT_SETTINGS } from "./types";

export async function fetchSettings(supabase: SupabaseClient): Promise<AppSettings> {
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error || !data) return DEFAULT_SETTINGS;

  const map = Object.fromEntries(data.map((row) => [row.key, row.value]));
  return {
    gcash_tiers: map.gcash_tiers ?? DEFAULT_SETTINGS.gcash_tiers,
    maya_tiers: map.maya_tiers ?? DEFAULT_SETTINGS.maya_tiers,
    maya_fixed_fee: map.maya_fixed_fee ?? DEFAULT_SETTINGS.maya_fixed_fee,
    maya_load_commission: map.maya_load_commission ?? DEFAULT_SETTINGS.maya_load_commission,
    maya_banktransfer_commission:
      map.maya_banktransfer_commission ?? DEFAULT_SETTINGS.maya_banktransfer_commission,
  };
}

export async function saveSetting(supabase: SupabaseClient, key: keyof AppSettings, value: unknown) {
  const { error } = await supabase.from("app_settings").upsert({ key, value });
  if (error) throw error;
}
