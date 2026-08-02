/**
 * Honorbound QuickPlay effects (cooperative edition, source IDs preserved).
 *
 * Each entry encodes ONE verbatim source wording as typed operations.
 * Nothing here reads `rules_text` at runtime.
 */
import { GameMode } from "@/game-data/schema";
import { addModifier, log, restoreWard } from "../mutations";
import { hasKeyword, unitsOf } from "../queries";
import { OATHGUARD, type MatchDraft } from "../types";
import { registerEffects, type EffectImplementation } from "./registry";
import { promptEffectId, registerPromptResolver } from "./prompts";

/** Removes damage markers from a unit. Never raises DEF above printed. */
function healUnit(draft: MatchDraft, instanceId: string, amount: number): void {
  const inst = draft.board.instances[instanceId];
  if (!inst || inst.zone !== "unitSlot") return;
  const before = inst.damage;
  inst.damage = Math.max(0, inst.damage - amount);
  if (inst.damage !== before) {
    log(draft, `${inst.definitionId} recovers ${before - inst.damage} damage.`, {
      playerId: OATHGUARD,
    });
  }
}

function damagedFriendlyUnits(draft: MatchDraft): string[] {
  return unitsOf(draft, OATHGUARD)
    .filter((u) => u.damage > 0)
    .map((u) => u.instanceId);
}

/* ------------------------------------------------------------------ prompts */

registerPromptResolver("hon-001-restore", (draft, chosen) => {
  const id = chosen[0];
  if (!id) return;
  log(draft, "Oath Page restores 1 damage.", { playerId: OATHGUARD });
  healUnit(draft, id, 1);
});

/* ------------------------------------------------------------------ effects */

const EFFECTS: EffectImplementation[] = [
  {
    cardId: "RF-OATH-HON-001",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Restore 1 damage from a unit.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      const legal = damagedFriendlyUnits(draft);
      if (legal.length === 0) {
        log(draft, "Oath Page finds no damaged unit to restore.", { playerId: OATHGUARD });
        return;
      }
      draft.prompt = {
        kind: "selectTarget",
        effectId: promptEffectId("hon-001-restore", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        legalTargetIds: legal,
        optional: true,
        description: "Oath Page: restore 1 damage from one of your units.",
      };
    },
  },
  {
    cardId: "RF-OATH-HON-002",
    mode: GameMode.Cooperative,
    sourceText: "Shield Matrix.",
    trigger: "static",
  },
  {
    cardId: "RF-OATH-HON-003",
    mode: GameMode.Cooperative,
    sourceText: "Aegis.",
    trigger: "static",
  },
  {
    cardId: "RF-OATH-HON-004",
    mode: GameMode.Cooperative,
    sourceText: "Restore 3 Ward to the Oathguard Gate.",
    trigger: "deploy",
    handler: (draft) => {
      log(draft, "Patch the Ward restores 3 Ward.", { playerId: OATHGUARD });
      restoreWard(draft, OATHGUARD, 3);
    },
  },
  {
    cardId: "RF-OATH-HON-005",
    mode: GameMode.Cooperative,
    sourceText: "Aegis.",
    trigger: "static",
  },
  {
    cardId: "RF-OATH-HON-006",
    mode: GameMode.Cooperative,
    sourceText: "Prevent the next 3 damage to a unit or Gate this round.",
    trigger: "deploy",
    ambiguity:
      "The source wording does not say when the unit or Gate is chosen. Implemented as a shared 3-damage shield that absorbs the next damage dealt to any Oathguard unit or the Oathguard Gate this round, which never protects more than the printed 3 damage.",
    handler: (draft, ctx) => {
      addModifier(draft, {
        id: `interpose:${ctx.selfId}`,
        label: "Interpose",
        description: "Prevents the next 3 damage to an Oathguard unit or the Gate this round.",
        source: "Interpose",
        owner: OATHGUARD,
        duration: "round",
        amount: 3,
        kind: "damage-prevention",
      });
      log(draft, "Interpose will prevent the next 3 damage this round.", { playerId: OATHGUARD });
    },
  },
  {
    cardId: "RF-OATH-HON-007",
    mode: GameMode.Cooperative,
    sourceText: "Aegis. Shield Matrix.",
    trigger: "static",
  },
  {
    cardId: "RF-OATH-HON-008",
    mode: GameMode.Cooperative,
    sourceText: "Oathguard units with Aegis have +1 ATK.",
    trigger: "static",
    atkAura: (state, targetId) => {
      const target = state.board.instances[targetId];
      if (!target || target.ownerId !== OATHGUARD || target.zone !== "unitSlot") return 0;
      return hasKeyword(state, targetId, "Aegis") ? 1 : 0;
    },
  },
  {
    cardId: "RF-OATH-HON-009",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Restore 1 Ward. If a unit has Shield Matrix, Restore 2 Ward instead.",
    trigger: "deploy",
    handler: (draft) => {
      const shielded = unitsOf(draft, OATHGUARD).some((u) =>
        hasKeyword(draft, u.instanceId, "Shield Matrix"),
      );
      const amount = shielded ? 2 : 1;
      log(draft, `Brightarm Smith restores ${amount} Ward.`, { playerId: OATHGUARD });
      restoreWard(draft, OATHGUARD, amount);
    },
  },
  {
    cardId: "RF-OATH-HON-010",
    mode: GameMode.Cooperative,
    sourceText: "Aegis.",
    trigger: "static",
  },
];

registerEffects(EFFECTS);

export default EFFECTS;
