/**
 * Shown when a player holds cards but the engine allows none of them.
 * Presentation only: the caller passes the already-computed situation.
 */
export interface NothingPlayableHintProps {
  /** Face-up crystals the player can currently spend. */
  available: number;
  /** Cheapest printed cost in hand. */
  cheapestCost: number;
  /** True when the block is an Energy shortfall rather than a rule limit. */
  energyOnly: boolean;
}

export function NothingPlayableHint({
  available,
  cheapestCost,
  energyOnly,
}: NothingPlayableHintProps) {
  return (
    <p
      role="status"
      className="mb-2 rounded-lg border border-oath-cyan/40 bg-oath-cyan/10 px-3 py-2 text-xs leading-snug text-foreground"
    >
      {energyOnly ? (
        <>
          <strong>Not enough Energy yet.</strong> You have {available} face-up crystal
          {available === 1 ? "" : "s"} and your cheapest card costs {cheapestCost}. You gain one
          more crystal at the start of every turn (up to six), so end your turn with Pass and try
          again next round.
        </>
      ) : (
        <>
          <strong>No card can be played right now.</strong> Each card below explains why. Continue
          to Battle or Pass to end your turn.
        </>
      )}
    </p>
  );
}
