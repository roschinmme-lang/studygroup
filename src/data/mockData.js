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

export const VIBES = [
  {
    id: "vibe-1",
    title: "Big-O in 60 seconds",
    subject: "Data Structures & Algorithms",
    author: "Prof. Aldana",
    gradient: "linear-gradient(160deg,#3C3489,#0F6E56)",
    transcript: [
      "Big-O describes how runtime grows as input grows.",
      "O(1) is constant, it never changes with input size.",
      "O(n) grows in a straight line with the input.",
      "O(log n) is the reason binary search feels instant.",
      "O(n\u00b2) is what nested loops usually cost you.",
    ],
    qa: [
      { q: "Is O(n log n) better than O(n\u00b2) for big datasets?", a: "Yes, it scales much better as n grows." },
      { q: "What's a real example of O(log n)?", a: "Binary search on a sorted array." },
    ],
  },
  {
    id: "vibe-2",
    title: "Normalizing a database in 3 steps",
    subject: "Database Systems",
    author: "Chin Dela Cruz",
    gradient: "linear-gradient(160deg,#0C447C,#085041)",
    transcript: [
      "First normal form removes repeating groups from a table.",
      "Second normal form removes partial dependencies on composite keys.",
      "Third normal form removes transitive dependencies entirely.",
      "Normalizing reduces redundancy but can add extra joins.",
    ],
    qa: [{ q: "When should I denormalize on purpose?", a: "When read performance matters more than write consistency." }],
  },
  {
    id: "vibe-3",
    title: "Urban heat islands, explained fast",
    subject: "Earth Science",
    author: "Elaine Cruz",
    gradient: "linear-gradient(160deg,#712B13,#4A1B0C)",
    transcript: [
      "Cities absorb and re-emit more heat than natural landscapes.",
      "Concrete and asphalt store heat throughout the day.",
      "Green cover and water bodies help cool surrounding air.",
      "Urban planning can reduce heat islands with reflective materials.",
    ],
    qa: [{ q: "Does this apply to a city like Bacoor?", a: "Yes, dense low-rise areas with little tree cover show it clearly." }],
  },
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
