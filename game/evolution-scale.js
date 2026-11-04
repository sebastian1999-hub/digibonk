// World-space idle heights, shared by players, companions and enemy Digimon.
const heights = [1.7, 2.2, 2.9, 3.9, 5, 6.3];
export function evolutionHeight(stage) {
  const phase = Number.isFinite(stage) ? Math.round(stage) : -1;
  return heights[Math.max(0, Math.min(5, phase + 1))];
}
