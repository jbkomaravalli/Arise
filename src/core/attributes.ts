import type { AttributeKey, AttributeSnapshot, XpTransaction } from './types';
import { ATTRIBUTES, PROGRESSION } from './config';

export interface AttributeScore {
  attribute: AttributeKey;
  xp: number;
  /** 0–100 derived score. Application-defined, not a scientific measurement. */
  value: number;
  milestoneIndex: number;
}

/**
 * Attribute XP accumulates from XP transactions via their declared weights,
 * which makes scores fully recomputable from the transaction ledger on both
 * the client and the server.
 *
 *   value = round(100 × (1 − e^(−xp / 600)))
 */
export function scoreFromAttributeXp(xp: number): number {
  if (xp <= 0) return 0;
  return Math.round(
    Math.min(PROGRESSION.attribute.max, PROGRESSION.attribute.max * (1 - Math.exp(-xp / PROGRESSION.attribute.scale))),
  );
}

export function computeAttributeScores(transactions: XpTransaction[]): AttributeScore[] {
  const xpTotals: Record<AttributeKey, number> = {
    strength: 0,
    endurance: 0,
    mobility: 0,
    technical: 0,
    problemSolving: 0,
    discipline: 0,
  };

  for (const tx of transactions) {
    for (const [key, weight] of Object.entries(tx.attributeWeights)) {
      if (weight && key in xpTotals) {
        xpTotals[key as AttributeKey] += tx.amount * weight;
      }
    }
  }

  return ATTRIBUTES.map((def) => {
    const xp = xpTotals[def.key];
    const value = scoreFromAttributeXp(xp);
    const milestoneIndex = def.milestones.filter((m) => value >= m.at).length;
    return { attribute: def.key, xp, value, milestoneIndex };
  });
}

export function attributeSnapshots(
  ownerId: string,
  transactions: XpTransaction[],
  now: string = new Date().toISOString(),
): AttributeSnapshot[] {
  return computeAttributeScores(transactions).map((s) => ({
    ownerId,
    attribute: s.attribute,
    value: s.value,
    xp: Math.round(s.xp),
    milestoneIndex: s.milestoneIndex,
    updatedAt: now,
  }));
}

/** XP still needed to reach the next named milestone (or null at the top). */
export function nextMilestone(attribute: AttributeKey, value: number) {
  const def = ATTRIBUTES.find((a) => a.key === attribute);
  if (!def) return null;
  const next = def.milestones.find((m) => m.at > value);
  if (!next) return null;
  return {
    milestone: next,
    remaining: next.at - value,
    percent: Math.min(100, (value / next.at) * 100),
  };
}
