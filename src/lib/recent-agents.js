export const RECENT_AGENT_STORAGE_KEY = 'agenthub:recent-agents';

const MAX_RECENT_AGENTS = 5;

export function getRecentAgentStorageKey(profile) {
  const profileId = String(profile?.id ?? '').trim();

  if (!profileId) {
    return RECENT_AGENT_STORAGE_KEY;
  }

  return `${RECENT_AGENT_STORAGE_KEY}:profile:${profileId}`;
}

export function getLegacyRecentAgentStorageKey(profile) {
  const email = String(profile?.email ?? '').trim().toLowerCase();

  return email ? `${RECENT_AGENT_STORAGE_KEY}:${email}` : null;
}

export function normalizeRecentAgent(agent) {
  if (!agent?.slug || !agent?.name) {
    return null;
  }

  return {
    category: String(agent.category ?? '').trim(),
    name: String(agent.name).trim(),
    pitch: String(agent.pitch ?? '').trim(),
    runtimeLabel: String(agent.runtimeLabel ?? '').trim(),
    slug: String(agent.slug).trim(),
    viewedAt: Number(agent.viewedAt) || Date.now(),
  };
}

export function parseRecentAgents(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeRecentAgent)
      .filter(Boolean)
      .sort((left, right) => right.viewedAt - left.viewedAt)
      .slice(0, MAX_RECENT_AGENTS);
  } catch {
    return [];
  }
}

export function parseRecentAgentsFromStorage(storage, storageKey, legacyStorageKey = null) {
  if (!storage) {
    return [];
  }

  const primaryAgents = parseRecentAgents(storage.getItem(storageKey || RECENT_AGENT_STORAGE_KEY));

  if (legacyStorageKey && primaryAgents.length === 0) {
    const legacyAgents = parseRecentAgents(storage.getItem(legacyStorageKey));

    if (legacyAgents.length > 0) {
      return legacyAgents;
    }
  }

  return primaryAgents;
}

export function removeRecentAgentsFromStorage(storage, storageKey, legacyStorageKey = null) {
  if (!storage) {
    return;
  }

  storage.removeItem(storageKey || RECENT_AGENT_STORAGE_KEY);

  if (legacyStorageKey) {
    storage.removeItem(legacyStorageKey);
  }

  if (storageKey && storageKey !== RECENT_AGENT_STORAGE_KEY) {
    storage.removeItem(RECENT_AGENT_STORAGE_KEY);
  }
}

export function writeRecentAgentsToStorage(storage, storageKey, agents, legacyStorageKey = null) {
  if (!storage) {
    return;
  }

  const nextAgents = Array.isArray(agents) ? agents.map(normalizeRecentAgent).filter(Boolean).slice(0, MAX_RECENT_AGENTS) : [];
  const targetStorageKey = storageKey || RECENT_AGENT_STORAGE_KEY;
  storage.setItem(targetStorageKey, JSON.stringify(nextAgents));

  if (legacyStorageKey && legacyStorageKey !== targetStorageKey) {
    storage.removeItem(legacyStorageKey);
  }

  if (targetStorageKey !== RECENT_AGENT_STORAGE_KEY) {
    storage.removeItem(RECENT_AGENT_STORAGE_KEY);
  }
}

export function mergeRecentAgent(existingAgents, nextAgent) {
  const normalized = normalizeRecentAgent(nextAgent);

  if (!normalized) {
    return existingAgents ?? [];
  }

  const deduped = (existingAgents ?? []).filter((agent) => agent.slug !== normalized.slug);

  return [normalized, ...deduped]
    .sort((left, right) => right.viewedAt - left.viewedAt)
    .slice(0, MAX_RECENT_AGENTS);
}

export function formatRecentAgentViewedAt(viewedAt, locale = 'fr') {
  const timestamp = Number(viewedAt);

  if (!timestamp) {
    return locale === 'en' ? 'Viewed recently' : 'Vu récemment';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return locale === 'en' ? 'Viewed just now' : 'Vu à l’instant';
  }

  if (diffMinutes < 60) {
    return locale === 'en'
      ? `Viewed ${diffMinutes} min ago`
      : `Vu il y a ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return locale === 'en'
      ? `Viewed ${diffHours}h ago`
      : `Vu il y a ${diffHours}h`;
  }

  const diffDays = Math.round(diffHours / 24);

  return locale === 'en'
    ? `Viewed ${diffDays}d ago`
    : `Vu il y a ${diffDays}j`;
}
