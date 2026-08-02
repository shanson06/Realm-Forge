/**
 * Whisper Court encounter effects (cooperative edition, source IDs preserved).
 *
 * The Hollow Crown is automated, so every choice here is resolved by a stated,
 * deterministic rule rather than a prompt. Ties break toward the lowest unit
 * space so replays from the same seed are identical.
 */
import { GameMode } from "@/game-data/schema";
import { addModifier, log } from "../mutations";
import { attackOf, unitsOf } from "../queries";
import { HOLLOW, OATHGUARD, type CardInstance, type MatchDraft } from "../types";
import { registerEffects, type EffectImplementation } from "./registry";

function highestAtkOathguardUnit(draft: MatchDraft): CardInstance | null {
  const units = unitsOf(draft, OATHGUARD);
  if (units.length === 0) return null;
  return [...units].sort((a, b) => {
    const diff = attackOf(draft, b.instanceId) - attackOf(draft, a.instanceId);
    return diff !== 0 ? diff : (a.slotIndex ?? 0) - (b.slotIndex ?? 0);
  })[0];
}

function lowestAtkReadyOathguardUnit(draft: MatchDraft): CardInstance | null {
  const units = unitsOf(draft, OATHGUARD).filter((u) => !u.exhausted);
  if (units.length === 0) return null;
  return [...units].sort((a, b) => {
    const diff = attackOf(draft, a.instanceId) - attackOf(draft, b.instanceId);
    return diff !== 0 ? diff : (a.slotIndex ?? 0) - (b.slotIndex ?? 0);
  })[0];
}

const EFFECTS: EffectImplementation[] = [
  {
    cardId: "RF-HC-WHI-001",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Highest-ATK Oathguard unit gets -1 ATK this turn.",
    trigger: "deploy",
    handler: (draft) => {
      const target = highestAtkOathguardUnit(draft);
      if (!target) return;
      draft.board.instances[target.instanceId].temporaryAtk -= 1;
      log(draft, "Doubt Whisper weakens the strongest Oathguard unit by 1 ATK.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-WHI-002",
    mode: GameMode.Cooperative,
    sourceText: "Echo: Active player discards 1 card if they have 6 or more cards.",
    trigger: "echo",
    ambiguity:
      "The source does not say which card is discarded. The automated Hollow Crown discards the most recently drawn card so replays stay deterministic.",
    handler: (draft) => {
      const oath = draft.players[OATHGUARD];
      if (oath.hand.length < 6) return;
      const id = oath.hand[oath.hand.length - 1];
      oath.hand = oath.hand.slice(0, -1);
      oath.discard.push(id);
      draft.board.instances[id].zone = "discard";
      log(draft, "Cinder Quill forces a card to be discarded.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-WHI-003",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Siphon 1 from the active player this turn.",
    trigger: "deploy",
    handler: (draft) => {
      const energy = draft.players[OATHGUARD].energy;
      if (energy.temporaryCrystals > 0) energy.temporaryCrystals -= 1;
      else if (energy.faceUpCrystals > 0) energy.faceUpCrystals -= 1;
      else {
        draft.seats[draft.activeSeatId].energyDrainNextCharge += 1;
        log(draft, "Court Page's Siphon will land on the next charge.", { playerId: HOLLOW });
        return;
      }
      log(draft, "Court Page siphons 1 Energy.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-WHI-004",
    mode: GameMode.Cooperative,
    sourceText: "The next Oathguard unit played enters used.",
    trigger: "deploy",
    handler: (draft) => {
      addModifier(draft, {
        id: "whi-004-enters-used",
        label: "Unsteady Thought",
        description: "The next Oathguard unit played enters used.",
        source: "Unsteady Thought",
        owner: HOLLOW,
        duration: "match",
        amount: 1,
        kind: "enters-used",
      });
      log(draft, "Unsteady Thought: the next Oathguard unit played enters used.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-WHI-005",
    mode: GameMode.Cooperative,
    sourceText: "Static 1 to the highest-ATK Oathguard unit this round.",
    trigger: "deploy",
    handler: (draft) => {
      const target = highestAtkOathguardUnit(draft);
      if (!target) return;
      draft.board.instances[target.instanceId].roundAtk -= 1;
      log(draft, "Grayglass Advocate applies Static 1 for the round.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-WHI-006",
    mode: GameMode.Cooperative,
    sourceText: "Cancel one temporary ATK bonus until end of round.",
    trigger: "deploy",
    handler: (draft) => {
      const buffed = unitsOf(draft, OATHGUARD)
        .filter((u) => u.temporaryAtk > 0 || u.roundAtk > 0 || u.nextAttackAtk > 0)
        .sort((a, b) => b.temporaryAtk + b.roundAtk - (a.temporaryAtk + a.roundAtk))[0];
      if (!buffed) {
        log(draft, "Dimming Word finds no temporary ATK bonus to cancel.", { playerId: HOLLOW });
        return;
      }
      const inst = draft.board.instances[buffed.instanceId];
      inst.temporaryAtk = Math.min(0, inst.temporaryAtk);
      inst.roundAtk = Math.min(0, inst.roundAtk);
      inst.nextAttackAtk = 0;
      log(draft, "Dimming Word cancels a temporary ATK bonus.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-WHI-007",
    mode: GameMode.Cooperative,
    sourceText: "This ignores Aegis while attacking.",
    trigger: "static",
    aegisRule: "always-ignore",
  },
  {
    cardId: "RF-HC-WHI-008",
    mode: GameMode.Cooperative,
    sourceText: "Cancel the first extra card draw by players each round.",
    trigger: "static",
    roundStartModifier: {
      label: "Chamber of Murmurs",
      description: "Cancels the first extra card draw by the Oathguard this round.",
      source: "Chamber of Murmurs",
      owner: HOLLOW,
      duration: "round",
      amount: 1,
      kind: "suppress-extra-draw",
    },
    handler: (draft) => {
      addModifier(draft, {
        id: "whi-008-suppress",
        label: "Chamber of Murmurs",
        description: "Cancels the first extra card draw by the Oathguard this round.",
        source: "Chamber of Murmurs",
        owner: HOLLOW,
        duration: "round",
        amount: 1,
        kind: "suppress-extra-draw",
      });
      log(draft, "Chamber of Murmurs smothers the next extra draw.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-WHI-009",
    mode: GameMode.Cooperative,
    sourceText: "Echo: Highest-ATK Oathguard unit gets -1 ATK this round.",
    trigger: "echo",
    handler: (draft) => {
      const target = highestAtkOathguardUnit(draft);
      if (!target) return;
      draft.board.instances[target.instanceId].roundAtk -= 1;
      log(draft, "Hushwing Shade's echo weakens the strongest Oathguard unit.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-WHI-010",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Use the lowest-ATK ready Oathguard unit.",
    trigger: "deploy",
    handler: (draft) => {
      const target = lowestAtkReadyOathguardUnit(draft);
      if (!target) {
        log(draft, "Doubtbinder finds no ready Oathguard unit.", { playerId: HOLLOW });
        return;
      }
      draft.board.instances[target.instanceId].exhausted = true;
      log(draft, "Doubtbinder forces an Oathguard unit to be used.", { playerId: HOLLOW });
    },
  },
];

registerEffects(EFFECTS);

export default EFFECTS;
