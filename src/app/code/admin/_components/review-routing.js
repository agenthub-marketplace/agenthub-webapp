export const routingActionLabels = {
  approve_assets: 'Approuver assets',
  block_publication: 'Bloquer publication',
  request_creator_changes: 'Demander modifications',
  review_standard: 'Review standard',
  run_security_review: 'Security review',
  wait_precheck: 'Précheck à finaliser',
};

export const routingOwnerLabels = {
  admin: 'Admin',
  creator: 'Creator',
  platform_ops: 'Ops plateforme',
  security_reviewer: 'Security reviewer',
};

export const routingToneByPriority = {
  P0: 'failed',
  P1: 'rejected',
  P2: 'in_review',
  P3: 'approved',
};

const routingPriorityOrder = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function fallbackRouting(agent) {
  const precheck = agent.manifest?.securityPrecheck;

  if (!precheck) {
    return {
      blocksApproval: true,
      nextAction: 'wait_precheck',
      owner: 'admin',
      priority: 'P0',
      reason: 'Précheck indisponible. Générer un précheck avant décision.',
    };
  }

  if (precheck.recommendation === 'block_publication' || precheck.riskLevel === 'blocked') {
    return {
      blocksApproval: true,
      nextAction: 'block_publication',
      owner: 'admin',
      priority: 'P0',
      reason: precheck.summary,
    };
  }

  if (precheck.recommendation === 'security_review_required') {
    return {
      blocksApproval: true,
      nextAction: 'run_security_review',
      owner: 'security_reviewer',
      priority: 'P1',
      reason: precheck.summary,
    };
  }

  if (precheck.recommendation === 'request_changes') {
    return {
      blocksApproval: false,
      nextAction: 'request_creator_changes',
      owner: 'creator',
      priority: 'P2',
      reason: precheck.summary,
    };
  }

  return {
    blocksApproval: false,
    nextAction: 'review_standard',
    owner: 'admin',
    priority: 'P3',
    reason: precheck.summary,
  };
}

export function reviewRouting(agent) {
  return agent.manifest?.reviewRouting ?? fallbackRouting(agent);
}

export function buildReviewRoutingSummary(queue, { limit = 5 } = {}) {
  const counts = {
    P0: 0,
    P1: 0,
    P2: 0,
    P3: 0,
  };
  const routed = [...queue]
    .map((agent) => ({
      agent,
      routing: reviewRouting(agent),
    }))
    .sort((left, right) => {
      const priorityDelta =
        (routingPriorityOrder[left.routing.priority] ?? 9) -
        (routingPriorityOrder[right.routing.priority] ?? 9);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return new Date(left.agent.createdAt).getTime() - new Date(right.agent.createdAt).getTime();
    });

  for (const item of routed) {
    counts[item.routing.priority] = (counts[item.routing.priority] ?? 0) + 1;
  }

  return {
    counts,
    routed,
    urgent: routed.slice(0, limit),
  };
}
