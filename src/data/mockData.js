/** Tier metadata applied to every real account created through signup. */
export const TIER_META = {
  JHS: { tierLabel: "Junior High", color: "#7C9EFF", minor: true },
  SHS: { tierLabel: "Senior High", color: "#FF8A65", minor: true },
  UNI: { tierLabel: "University", color: "#FFD000", minor: false },
};

export const REPORT_REASONS = [
  { id: "spam", label: "Spam", severity: "low" },
  { id: "misinfo", label: "Misinformation", severity: "low" },
  { id: "harassment", label: "Harassment / Bullying", severity: "medium" },
  { id: "explicit", label: "Explicit / Sexual Content", severity: "severe" },
  { id: "violence", label: "Graphic Violence / Gore", severity: "severe" },
  { id: "other", label: "Other", severity: "low" },
];

export const MOD_SYSTEM_NOTES = [
  "Pre-screening filter updated \u2022 v2.4.1",
  "3 flagged accounts currently under review",
  "Kill-switch response time: under 400ms",
];

export const DEVICE_STRING = "Chrome 126 \u2022 Windows 11 \u2022 Bacoor, Cavite, PH";

export function nowTimestamp() {
  const d = new Date();
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
