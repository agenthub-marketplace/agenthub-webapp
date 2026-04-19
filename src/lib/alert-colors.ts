// Single source of truth for alert color logic. Use this EVERYWHERE an alert
// is rendered (dashboard cards, analyses cards, future components).
//
// PERMANENT RULES — do not change:
//  - Left border color is driven ONLY by `impact_short_term`:
//      "positif"  → green  (#2E7D32)
//      "negatif"  → red    (#E53935)
//      "neutre"   → orange (#F57C00)  (also fallback for unknown/null)
//  - Urgency badge color is driven ONLY by `urgency`:
//      1 → INFO       green  (bg #EAFAF1 / text #2E7D32)
//      2 → ATTENTION  orange (bg #FFF3E0 / text #F57C00)
//      3 → URGENT     red    (bg #FFEBEE / text #E53935)
//
// The two fields are independent. NEVER mix them.

export type Tone = "success" | "warning" | "danger";

export type AlertColors = {
  border: {
    tone: Tone;
    hex: string;
    className: string; // tailwind bg-* for the 4px left strip
  };
  badge: {
    label: "INFO" | "ATTENTION" | "URGENT";
    tone: Tone;
    bg: string;   // background hex
    fg: string;   // text hex
  };
};

const GREEN = "#2E7D32";
const ORANGE = "#F57C00";
const RED = "#E53935";

function borderFromImpact(impact: string | null | undefined): AlertColors["border"] {
  const v = (impact ?? "").toLowerCase();
  if (v.includes("pos")) return { tone: "success", hex: GREEN, className: "bg-success" };
  if (v.includes("neg") || v.includes("nég")) return { tone: "danger", hex: RED, className: "bg-danger" };
  return { tone: "warning", hex: ORANGE, className: "bg-warning" };
}

function badgeFromUrgency(urgency: number): AlertColors["badge"] {
  if (urgency >= 3) return { label: "URGENT", tone: "danger", bg: "#FFEBEE", fg: RED };
  if (urgency === 2) return { label: "ATTENTION", tone: "warning", bg: "#FFF3E0", fg: ORANGE };
  return { label: "INFO", tone: "success", bg: "#EAFAF1", fg: GREEN };
}

export function getAlertColors(
  impact_short_term: string | null | undefined,
  urgency: number,
): AlertColors {
  return {
    border: borderFromImpact(impact_short_term),
    badge: badgeFromUrgency(urgency),
  };
}
