import { supabase } from "./supabaseClient.js";
import { formatTimestamp } from "./format.js";

/**
 * Atomically quarantines a post or vibe and writes the mod_log entry, via a
 * single SECURITY DEFINER database function (see migration_009). This
 * replaces two separate client-side calls (an UPDATE + an INSERT) that
 * each had their own RLS policy — those policies were broader than they
 * needed to be (any authenticated user could edit any post's content, or
 * write arbitrary fake entries to mod_log). The RPC only ever does these
 * two things together, so there's nothing broader to exploit.
 */
export async function reportAndQuarantine({ targetType, targetId, reasonLabel, targetSnippet, device }) {
  const { error } = await supabase.rpc("report_and_quarantine", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason_label: reasonLabel,
    p_target_snippet: targetSnippet,
    p_device: device,
  });
  if (error) throw new Error(error.message);
}

function mapModLogRow(row) {
  return {
    id: row.id,
    reasonLabel: row.reason_label,
    targetSnippet: row.target_snippet,
    timestamp: formatTimestamp(row.created_at),
    device: row.device,
    lockout: row.lockout,
  };
}

export async function fetchModLog() {
  const { data, error } = await supabase.from("mod_log").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapModLogRow);
}
