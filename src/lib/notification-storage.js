const LEGACY_PREFIX = 'agenthub:read-notifications';
const PROFILE_PREFIX = 'agenthub:read-notifications:profile';

export function getNotificationStorageKey(profile) {
  if (profile?.id) {
    return `${PROFILE_PREFIX}:${profile.id}`;
  }

  if (profile?.email) {
    return `${LEGACY_PREFIX}:${profile.email}`;
  }

  return null;
}

export function getLegacyNotificationStorageKey(profile) {
  return profile?.email ? `${LEGACY_PREFIX}:${profile.email}` : null;
}

function parseIds(rawValue) {
  try {
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function readNotificationIdsFromStorage(storage, storageKey, legacyStorageKey = null) {
  if (!storageKey) {
    return [];
  }

  const ids = [
    ...parseIds(storage.getItem(storageKey)),
    ...(legacyStorageKey && legacyStorageKey !== storageKey ? parseIds(storage.getItem(legacyStorageKey)) : []),
  ];

  return [...new Set(ids)];
}

export function writeNotificationIdsToStorage(storage, storageKey, ids, legacyStorageKey = null) {
  if (!storageKey) {
    return;
  }

  const nextIds = Array.isArray(ids) ? [...new Set(ids.filter((item) => typeof item === 'string'))].slice(-80) : [];
  storage.setItem(storageKey, JSON.stringify(nextIds));

  if (legacyStorageKey && legacyStorageKey !== storageKey) {
    storage.removeItem(legacyStorageKey);
  }
}
