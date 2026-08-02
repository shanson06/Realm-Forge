/**
 * Dawnwatch QuickPlay effects (cooperative edition, source IDs preserved).
 *
 * Each entry encodes ONE verbatim source wording as typed operations.
 * Nothing here reads `rules_text` at runtime.
 */
import { GameMode } from "@/game-data/schema";
import { drawCard, log } from "../mutations";
import { unitsOf } from "../queries";
import { OATHGUARD, type MatchDraft } from "../types";
import { registerEffects, type EffectImplementation } from "./registry";
import { promptEffectId, registerPromptResolver } from "./prompts";

function friendlyUnitIds(draft: MatchDraft, exceptId?: string): string[] {
  return unitsOf(draft, OATHGUARD)
    .map((u) => u.instanceId)
    .filter((id) => id !== exceptId);
}

function buff(draft: MatchDraft, instanceId: string, amount: number, label: string): void {
  const inst = draft.board.instances[instanceId];
  if (!inst || inst.zone !== "unitSlot") return;
  inst.temporaryAtk += amount;
  log(draft, `${label}: +${amount} ATK this turn.`, { playerId: OATHGUARD });
}

/* ------------------------------------------------------------------ prompts */

registerPromptResolver("daw-003-buff", (draft, chosen) => {
  if (chosen[0]) buff(draft, chosen[0], 1, "Dawn Courier");
});

registerPromptResolver("daw-004-rally", (draft, chosen) => {
  const id = chosen[0];
  if (!id) return;
  const inst = draft.board.instances[id];
  if (!inst) return;
  if (!inst.grantedKeywords.includes("Surge")) {
    inst.grantedKeywords = [...inst.grantedKeywords, "Surge"];
  }
  log(draft, "Quick Rally grants Surge.", { playerId: OATHGUARD });
  buff(draft, id, 1, "Quick Rally");
});

registerPromptResolver("daw-007-restore", (draft, chosen) => {
  const id = chosen[0];
  const inst = id ? draft.board.instances[id] : undefined;
  if (!inst) return;
  const before = inst.damage;
  inst.damage = Math.max(0, inst.damage - 2);
  log(draft, `First-Light Medic restores ${before - inst.damage} damage.`, { playerId: OATHGUARD });
});

/** Pack Formation buffs up to two units, one prompt at a time. */
registerPromptResolver("daw-009-first", (draft, chosen, selfId) => {
  if (!chosen[0]) return;
  buff(draft, chosen[0], 1, "Pack Formation");
  const remaining = friendlyUnitIds(draft, chosen[0]);
  if (remaining.length === 0) return;
  draft.prompt = {
    kind: "selectTarget",
    effectId: promptEffectId("daw-009-second", selfId),
    sourceInstanceId: selfId,
    legalTargetIds: remaining,
    optional: true,
    description: "Pack Formation: choose a second unit to gain +1 ATK this turn, or skip.",
  };
});

registerPromptResolver("daw-009-second", (draft, chosen) => {
  if (chosen[0]) buff(draft, chosen[0], 1, "Pack Formation");
});

/* ------------------------------------------------------------------ effects */

const SURGE_ONLY = "Surge.";

const EFFECTS: EffectImplementation[] = [
  { cardId: "RF-OATH-DAW-001", mode: GameMode.Cooperative, sourceText: SURGE_ONLY, trigger: "static" },
  { cardId: "RF-OATH-DAW-002", mode: GameMode.Cooperative, sourceText: SURGE_ONLY, trigger: "static" },
  {
    cardId: "RF-OATH-DAW-003",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Another unit gets +1 ATK this turn.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      const legal = friendlyUnitIds(draft, ctx.selfId);
      if (legal.length === 0) {
        log(draft, "Dawn Courier has no other unit to rally.", { playerId: OATHGUARD });
        return;
      }
      draft.prompt = {
        kind: "selectTarget",
        effectId: promptEffectId("daw-003-buff", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        legalTargetIds: legal,
        optional: true,
        description: "Dawn Courier: choose another unit to gain +1 ATK this turn.",
      };
    },
  },
  {
    cardId: "RF-OATH-DAW-004",
    mode: GameMode.Cooperative,
    sourceText: "Give a unit Surge and +1 ATK this turn.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      const legal = friendlyUnitIds(draft);
      if (legal.length === 0) {
        log(draft, "Quick Rally finds no unit to rally.", { playerId: OATHGUARD });
        return;
      }
      draft.prompt = {
        kind: "selectTarget",
        effectId: promptEffectId("daw-004-rally", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        legalTargetIds: legal,
        optional: true,
        description: "Quick Rally: choose a unit to gain Surge and +1 ATK this turn.",
      };
    },
  },
  { cardId: "RF-OATH-DAW-005", mode: GameMode.Cooperative, sourceText: SURGE_ONLY, trigger: "static" },
  {
    cardId: "RF-OATH-DAW-006",
    mode: GameMode.Cooperative,
    sourceText: "Sync: If you control two ready units, draw 1 card.",
    trigger: "deploy",
    handler: (draft) => {
      const ready = unitsOf(draft, OATHGUARD).filter((u) => !u.exhausted).length;
      if (ready >= 2) {
        log(draft, "Twin Beacon Signal syncs — draw 1 card.", { playerId: OATHGUARD });
        drawCard(draft, OATHGUARD, { extra: true });
      } else {
        log(draft, "Twin Beacon Signal needs two ready units to sync.", { playerId: OATHGUARD });
      }
    },
  },
  {
    cardId: "RF-OATH-DAW-007",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Restore 2 damage from a unit.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      const legal = unitsOf(draft, OATHGUARD)
        .filter((u) => u.damage > 0)
        .map((u) => u.instanceId);
      if (legal.length === 0) {
        log(draft, "First-Light Medic finds no damaged unit.", { playerId: OATHGUARD });
        return;
      }
      draft.prompt = {
        kind: "selectTarget",
        effectId: promptEffectId("daw-007-restore", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        legalTargetIds: legal,
        optional: true,
        description: "First-Light Medic: restore 2 damage from one of your units.",
      };
    },
  },
  { cardId: "RF-OATH-DAW-008", mode: GameMode.Cooperative, sourceText: SURGE_ONLY, trigger: "static" },
  {
    cardId: "RF-OATH-DAW-009",
    mode: GameMode.Cooperative,
    sourceText: "Up to two units get +1 ATK this turn.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      const legal = friendlyUnitIds(draft);
      if (legal.length === 0) {
        log(draft, "Pack Formation finds no unit to rally.", { playerId: OATHGUARD });
        return;
      }
      draft.prompt = {
        kind: "selectTarget",
        effectId: promptEffectId("daw-009-first", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        legalTargetIds: legal,
        optional: true,
        description: "Pack Formation: choose a unit to gain +1 ATK this turn.",
      };
    },
  },
  { cardId: "RF-OATH-DAW-010", mode: GameMode.Cooperative, sourceText: SURGE_ONLY, trigger: "static" },
];

registerEffects(EFFECTS);

export default EFFECTS;
