export const portfolio = {
  value: "€ 42 327",
  monthChange: "+1,2% ce mois",
  todayChange: "-0,3% aujourd'hui",
  allocation: [
    { label: "Actions", pct: "64%", tone: "dark" as const },
    { label: "Oblig.", pct: "21%", tone: "mid" as const },
    { label: "Cash", pct: "15%", tone: "light" as const },
  ],
};

export const analyses = [
  {
    ticker: "TTE",
    company: "TotalEnergies",
    time: "Il y a 30min",
    color: "danger" as const,
    summary:
      "Le baril de Brent bondit +8,4% suite aux tensions en mer Rouge. Impact direct sur les marges TotalEnergies, révision haussière attendue.",
  },
  {
    ticker: "LVMH",
    company: "LVMH Moët Hennessy",
    time: "Il y a 2h",
    color: "warning" as const,
    summary:
      "Ralentissement du luxe en Asie confirmé. Pression sur les ventes Q2, analystes divisés sur l'impact annuel.",
  },
  {
    ticker: "BNP",
    company: "BNP Paribas",
    time: "Il y a 4h",
    color: "success" as const,
    summary:
      "BCE maintient ses taux stables. BNP bénéficie d'un contexte favorable sur ses marges nettes d'intérêt.",
  },
];

export const sectors = [
  { name: "Technologie", pct: 29 },
  { name: "Énergie", pct: 21 },
  { name: "Finance", pct: 17 },
  { name: "Luxe", pct: 15 },
  { name: "Santé", pct: 11 },
  { name: "Autre", pct: 7 },
];

export const geo = [
  { name: "Europe", pct: 53 },
  { name: "États-Unis", pct: 33 },
  { name: "Asie", pct: 10 },
  { name: "Autre", pct: 4 },
];

export const positions = [
  { ticker: "TTE", company: "TotalEnergies", qty: "42 titres", sector: "Énergie", value: "€ 2 540", perf: "+3,2%", up: true },
  { ticker: "LVMH", company: "LVMH", qty: "8 titres", sector: "Luxe", value: "€ 5 920", perf: "-1,4%", up: false },
  { ticker: "BNP", company: "BNP Paribas", qty: "60 titres", sector: "Finance", value: "€ 3 880", perf: "+0,8%", up: true },
  { ticker: "MC", company: "Sanofi", qty: "30 titres", sector: "Santé", value: "€ 2 760", perf: "+1,9%", up: true },
];
