// Persist credit and receipt together before exposing the new balance in memory.
export function applyAccountRewards(progression, rewards, persist) {
  if (!Array.isArray(rewards)) return progression;
  const next = { ...progression, accountRewards: { ...progression.accountRewards } };
  let changed = false;
  for (const reward of rewards) {
    if (
      !reward ||
      typeof reward.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(reward.id) ||
      !Number.isSafeInteger(reward.bits) ||
      reward.bits <= 0 ||
      reward.bits > 1000000 ||
      Object.hasOwn(next.accountRewards, reward.id)
    )
      continue;
    if (!Number.isSafeInteger(next.bits + reward.bits)) continue;
    next.bits += reward.bits;
    next.accountRewards[reward.id] = true;
    changed = true;
  }
  if (!changed) return progression;
  persist(next);
  return next;
}
