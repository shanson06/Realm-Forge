/**
 * Cooperative seat handling.
 *
 * The shared Oathguard board lives on `players.oathguard`. Private resources
 * (deck, hand, discard, Energy, cards played) belong to a seat and are swapped
 * in and out of that shared record as the turn passes. This keeps every existing
 * rule, effect and query working unchanged for one, two or three players.
 */
import { OATHGUARD, type MatchDraft, type MatchState, type SeatState } from "./types";

export function activeSeat(state: MatchState): SeatState {
  return state.seats[state.activeSeatId];
}

export function seatIndex(state: MatchState, seatId = state.activeSeatId): number {
  return state.seatOrder.indexOf(seatId);
}

export function isLastSeatOfRound(state: MatchState): boolean {
  return seatIndex(state) === state.seatOrder.length - 1;
}

export function nextSeatId(state: MatchState): string {
  const index = seatIndex(state);
  return state.seatOrder[(index + 1) % state.seatOrder.length];
}

/** Copies the shared record's private fields back onto the active seat. */
export function saveActiveSeat(draft: MatchDraft): void {
  const seat = draft.seats[draft.activeSeatId];
  const oath = draft.players[OATHGUARD];
  if (!seat) return;
  seat.deck = oath.deck;
  seat.hand = oath.hand;
  seat.discard = oath.discard;
  seat.energy = oath.energy;
  seat.cardsPlayedThisTurn = oath.cardsPlayedThisTurn;
}

/** Makes `seatId` the active seat and loads its private resources. */
export function loadSeat(draft: MatchDraft, seatId: string): void {
  const seat = draft.seats[seatId];
  if (!seat) return;
  draft.activeSeatId = seatId;
  const oath = draft.players[OATHGUARD];
  oath.deck = seat.deck;
  oath.hand = seat.hand;
  oath.discard = seat.discard;
  oath.energy = seat.energy;
  oath.cardsPlayedThisTurn = seat.cardsPlayedThisTurn;
  oath.displayName = seat.displayName;
  oath.deckId = seat.deckId;
}

/** Total cards held across every seat — used by the cooperative HUD. */
export function seatSummaries(state: MatchState) {
  return state.seatOrder.map((seatId) => {
    const seat = state.seats[seatId];
    return {
      seatId,
      displayName: seat.displayName,
      faction: seat.faction,
      deckId: seat.deckId,
      handCount:
        seatId === state.activeSeatId ? state.players[OATHGUARD].hand.length : seat.hand.length,
      deckCount:
        seatId === state.activeSeatId ? state.players[OATHGUARD].deck.length : seat.deck.length,
      discardCount:
        seatId === state.activeSeatId
          ? state.players[OATHGUARD].discard.length
          : seat.discard.length,
      energy: seatId === state.activeSeatId ? state.players[OATHGUARD].energy : seat.energy,
      active: seatId === state.activeSeatId && state.turnSide === OATHGUARD,
    };
  });
}
