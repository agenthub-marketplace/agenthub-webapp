export const NEW_AGENT_DRAFT_STORAGE_KEY = 'agenthub-code:new-agent-draft:v1';

export function getNewAgentDraftStorageKey(scopeKey) {
  return scopeKey ? `${NEW_AGENT_DRAFT_STORAGE_KEY}:creator:${scopeKey}` : NEW_AGENT_DRAFT_STORAGE_KEY;
}

export function getLegacyNewAgentDraftStorageKey(scopeKey) {
  return scopeKey ? NEW_AGENT_DRAFT_STORAGE_KEY : null;
}

export function clearNewAgentDraftStorage(storage, scopeKey) {
  const storageKey = getNewAgentDraftStorageKey(scopeKey);
  const legacyStorageKey = getLegacyNewAgentDraftStorageKey(scopeKey);

  storage.removeItem(storageKey);

  if (legacyStorageKey && legacyStorageKey !== storageKey) {
    storage.removeItem(legacyStorageKey);
  }
}
