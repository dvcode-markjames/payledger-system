const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Returns the UTC ISO bounds [start, end) of "today" in Asia/Manila,
 * computed independently of the server/browser's local timezone.
 */
export function getManilaTodayRangeUTC(reference: Date = new Date()) {
  const manilaShiftedMs = reference.getTime() + MANILA_OFFSET_MS;
  const shifted = new Date(manilaShiftedMs);

  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();

  const manilaMidnightShiftedMs = Date.UTC(y, m, d, 0, 0, 0, 0);
  const startUTCms = manilaMidnightShiftedMs - MANILA_OFFSET_MS;
  const endUTCms = startUTCms + 24 * 60 * 60 * 1000;

  return {
    startISO: new Date(startUTCms).toISOString(),
    endISO: new Date(endUTCms).toISOString(),
  };
}

/** Formats a UTC timestamp as an Asia/Manila local time string. */
export function formatManilaTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatManilaDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
