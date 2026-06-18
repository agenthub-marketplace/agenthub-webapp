'use client';

import { useEffect } from 'react';
import { clearNewAgentDraftStorage } from '@/lib/new-agent-draft-storage';

export default function ClearNewAgentDraftOnSubmit({ draftScopeKey, submittedSlug }) {
  useEffect(() => {
    if (!submittedSlug) {
      return;
    }

    try {
      clearNewAgentDraftStorage(window.localStorage, draftScopeKey);
      window.dispatchEvent(new CustomEvent('agenthub-code:new-agent-draft-cleared'));
    } catch {
      // Non-blocking: the agent is already submitted; local storage cleanup is only a UI convenience.
    }
  }, [draftScopeKey, submittedSlug]);

  return null;
}
