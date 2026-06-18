'use client';

import { useEffect } from 'react';
import {
  getLegacyRecentAgentStorageKey,
  getRecentAgentStorageKey,
  mergeRecentAgent,
  parseRecentAgentsFromStorage,
  writeRecentAgentsToStorage,
} from '@/lib/recent-agents';

export default function RecentAgentTracker({ agent, profile = null }) {
  const profileId = profile?.id ?? null;
  const profileEmail = profile?.email ?? null;
  const agentSlug = agent?.slug ?? '';
  const agentName = agent?.name ?? '';
  const agentCategory = agent?.category ?? '';
  const agentPitch = agent?.pitch ?? '';
  const agentRuntimeLabel = agent?.runtimeLabel ?? '';

  useEffect(() => {
    if (!agentSlug || !agentName) {
      return;
    }

    try {
      const scopedProfile = { id: profileId, email: profileEmail };
      const storageKey = getRecentAgentStorageKey(scopedProfile);
      const legacyStorageKey = getLegacyRecentAgentStorageKey(scopedProfile);
      const current = parseRecentAgentsFromStorage(window.localStorage, storageKey, legacyStorageKey);
      const next = mergeRecentAgent(current, {
        category: agentCategory,
        name: agentName,
        pitch: agentPitch,
        runtimeLabel: agentRuntimeLabel,
        slug: agentSlug,
        viewedAt: Date.now(),
      });
      writeRecentAgentsToStorage(window.localStorage, storageKey, next, legacyStorageKey);
      window.dispatchEvent(new CustomEvent('agenthub:recent-agents-updated'));
    } catch {
      // Local convenience only. The product must still work without storage.
    }
  }, [agentCategory, agentName, agentPitch, agentRuntimeLabel, agentSlug, profileEmail, profileId]);

  return null;
}
