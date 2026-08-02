/**
 * Veilborn encounter effects (cooperative edition, source IDs preserved).
 *
 * Hollow Crown effects are fully automated: they resolve without prompts, using the
 * rulebook's target priority (§10) whenever a card's own wording is silent.
 */
import { GameMode } from "@/game-data/schema";
import { damageGate, damageUnit, log } from "../mutations";
import { definitionOf, hasKeyword, pickByTargetPriority, unitsOf } from "../queries";
import { HOLLOW, OATHGUARD, type MatchDraft } from "../types";
import { registerEffects, type EffectImplementation } from "./registry";

function oathguardUnits(draft: MatchDraft) {
  return unitsOf(draft as never, OATHGUARD);
}

function moveToLeftmost(draft: MatchDraft, instanceId: string): void {
  const slots = draft.players[HOLLOW].unitSlots;
  const from = slots.indexOf(instanceId);
  if (from <= 0) return;
  slots.splice(from, 1);
  slots.unshift(instanceId);
  slots.forEach((id, index) => {
    if (id) draft.board.instances[id].slotIndex = index;
  });
}

const EFFECTS: EffectImplementation[] = [
  {
    cardId: "RF-HC-VEI-001",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Deal 1 damage to the lowest-DEF Oathguard unit.",
    trigger: "deploy",
    handler: (draft) => {
      const target = pickByTargetPriority(draft as never, oathguardUnits(draft), { ignoreAegis: true });
      if (!target) return;
      log(draft, "Maskling Sneak deals 1 damage to the lowest-DEF Oathguard unit.", { playerId: HOLLOW });
      damageUnit(draft, target.instanceId, 1);
    },
  },
  {
    cardId: "RF-HC-VEI-002",
    mode: GameMode.Cooperative,
    sourceText: "When attacking a damaged unit, ignore Aegis.",
    trigger: "static",
    aegisRule: "ignore-when-target-damaged",
  },
  {
    cardId: "RF-HC-VEI-003",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: If no Aegis unit is in play, deal 1 Ward damage to the Oathguard Gate.",
    trigger: "deploy",
    handler: (draft) => {
      const anyAegis = oathguardUnits(draft).some((u) => hasKeyword(draft as never, u.instanceId, "Aegis"));
      if (anyAegis) return;
      log(draft, "Veil Runner slips past an undefended Gate.", { playerId: HOLLOW });
      damageGate(draft, OATHGUARD, 1);
    },
  },
  {
    cardId: "RF-HC-VEI-004",
    mode: GameMode.Cooperative,
    sourceText: "The next enemy attack this turn ignores Aegis.",
    trigger: "deploy",
    handler: (draft) => {
      draft.turnFlags.nextEnemyAttackIgnoresAegis = true;
      log(draft, "False Trail: the next Hollow Crown attack ignores Aegis.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-VEI-005",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Move this to the leftmost enemy position.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      moveToLeftmost(draft, ctx.selfId);
      log(draft, "Mirrormask Agent shifts to the leftmost position.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-VEI-006",
    mode: GameMode.Cooperative,
    sourceText: "Move the highest-ATK enemy to the leftmost position. It attacks first this turn.",
    trigger: "deploy",
    handler: (draft) => {
      const enemies = unitsOf(draft as never, HOLLOW);
      if (enemies.length === 0) return;
      const highest = [...enemies].sort((a, b) => {
        const atkA = draft.board.instances[a.instanceId].temporaryAtk;
        const atkB = draft.board.instances[b.instanceId].temporaryAtk;
        return atkB - atkA;
      })[0];
      moveToLeftmost(draft, highest.instanceId);
      draft.turnFlags.attacksFirstInstanceId = highest.instanceId;
      log(draft, "Mist Step pushes an enemy to the front of the attack order.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-VEI-007",
    mode: GameMode.Cooperative,
    sourceText: "This attacks the Oathguard unit with lowest printed DEF.",
    trigger: "static",
    attackTargetRule: "lowest-printed-def-unit",
  },
  {
    cardId: "RF-HC-VEI-009",
    mode: GameMode.Cooperative,
    sourceText: "Echo: Deal 1 Ward damage to the Oathguard Gate.",
    trigger: "echo",
    handler: (draft) => {
      log(draft, "Moonroad Lurker's Echo strikes the Oathguard Gate.", { playerId: HOLLOW });
      damageGate(draft, OATHGUARD, 1);
    },
  },
  {
    cardId: "RF-HC-VEI-008",
    mode: GameMode.Cooperative,
    sourceText: "Enemies with Threat 2 or less get +1 ATK.",
    trigger: "static",
    ambiguity:
      "Resolved from source, not a judgement call: Realmforge_Volume_1_Foundation.md states \"Hollow Crown cards use Threat rather than Energy. The database field `cost` stores Threat for Hollow Crown cards.\" \"Enemies\" is written from the players' seat (see the Global Threat rule, \"Each enemy unit gains +1 ATK\"), so this grants +1 ATK to Hollow Crown units in play whose cost/Threat is 2 or less.",
    atkAura: (state, targetInstanceId) => {
      const target = state.board.instances[targetInstanceId];
      if (!target || target.ownerId !== HOLLOW || target.zone !== "unitSlot") return 0;
      return definitionOf(state, targetInstanceId).cost <= 2 ? 1 : 0;
    },
  },
  {
    cardId: "RF-HC-VEI-010",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Use one ready non-Aegis Oathguard unit.",
    trigger: "deploy",
    handler: (draft) => {
      const candidates = oathguardUnits(draft).filter(
        (u) => !u.exhausted && !hasKeyword(draft as never, u.instanceId, "Aegis"),
      );
      const target = pickByTargetPriority(draft as never, candidates, { ignoreAegis: true });
      if (!target) return;
      draft.board.instances[target.instanceId].exhausted = true;
      log(draft, "Silver-Thread Trickster uses a ready Oathguard unit.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-VEI-012",
    mode: GameMode.Cooperative,
    sourceText: "This ignores Aegis on its first attack each game.",
    trigger: "static",
    aegisRule: "ignore-first-attack-each-game",
  },
];

registerEffects(EFFECTS);

export const VEILBORN_EFFECT_IDS = EFFECTS.map((e) => e.cardId);