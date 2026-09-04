export function formatCredits(value, fallback = 'Crédits non renseignés') {
  if (typeof value !== 'number' || value <= 0) {
    return fallback;
  }

  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)} crédits`;
}

export function formatCreditsFromCents(cents, fallback = 'Crédits non renseignés') {
  if (typeof cents !== 'number' || cents <= 0) {
    return fallback;
  }

  return formatCredits(cents / 100, fallback);
}

export function euroLabelToCredits(label) {
  if (!label) {
    return null;
  }

  return label
    .replace(/€\s*([0-9]+(?:[,.][0-9]+)?)/g, '$1 crédits')
    .replace(/([0-9]+(?:[,.][0-9]+)?)\s*€/g, '$1 crédits');
}
