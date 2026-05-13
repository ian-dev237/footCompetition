export type RRPair = { homeId: string; awayId: string };
export type RRRound = RRPair[];

/**
 * Berger / circle round-robin. Returns N-1 rounds for even N, N rounds for odd N
 * (one player has a bye each round). Home/away alternates roughly evenly.
 */
export function generateRoundRobin(playerIds: string[]): RRRound[] {
  const ids: (string | null)[] = [...playerIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 !== 0) ids.push(null);

  const rounds = ids.length - 1;
  const half = ids.length / 2;
  const schedule: RRRound[] = [];

  for (let r = 0; r < rounds; r++) {
    const matches: RRPair[] = [];
    for (let i = 0; i < half; i++) {
      const a = ids[i];
      const b = ids[ids.length - 1 - i];
      if (a && b) {
        // Alternate home/away every other round so it's reasonably fair.
        if ((r + i) % 2 === 0) matches.push({ homeId: a, awayId: b });
        else matches.push({ homeId: b, awayId: a });
      }
    }
    schedule.push(matches);
    // Rotation: keep ids[0] fixed, rotate the rest clockwise
    const fixed = ids[0];
    const rest = ids.slice(1);
    rest.unshift(rest.pop() as string | null);
    ids.splice(0, ids.length, fixed, ...rest);
  }
  return schedule;
}
