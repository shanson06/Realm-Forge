/**
 * The Breakers encounter effects (cooperative edition, source IDs preserved).
 *
 * Fracture N is Ward damage to the Oathguard Gate. Excess Gate damage never
 * carries into crystals, which `damageGate` already enforces.
 */
import { GameMode } from "@/game-data/schema";
import { damageGate, damageUnit, log } from "../mutations";
import { definitionOf, hasKeyword, unitsOf } from "../queries";
import { HOLLOW, OATHGUARD, type MatchDraft } from "../types";
import { registerEffects, type EffectImplementation } from "./registry";

function fracture(draft: MatchDraft, amount: number, source: string): void {
  log(draft, `${source}: Fracture ${amount} against the Oathguard Gate.`, { playerId: HOLLOW });
  damageGate(draft, OATHGUARD, amount);
}

function lowestDefOathguardUnit(draft: MatchDraft): string | null {
  const units = unitsOf(draft, OATHGUARD);
  if (units.length === 0) return null;
  const printedDef = (id: string) => definitionOf(draft, id).def ?? 0;
  return [...units].sort((a, b) => {
    const diff = printedDef(a.instanceId) - printedDef(b.instanceId);
    return diff !== 0 ? diff : (a.slotIndex ?? 0) - (b.slotIndex ?? 0);
  })[0].instanceId;
}

const EFFECTS: EffectImplementation[] = [
  {
    cardId: "RF-HC-BRK-001",
    mode: GameMode.Cooperative,
    sourceText: "Echo: Deal 1 Ward damage to the Oathguard Gate.",
    trigger: "echo",
    handler: (draft) => fracture(draft, 1, "Rubble Runner"),
  },
  {
    cardId: "RF-HC-BRK-002",
    mode: GameMode.Cooperative,
    sourceText: "Shield Matrix.",
    trigger: "static",
  },
  {
    cardId: "RF-HC-BRK-003",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Deal 1 damage to an Aegis unit.",
    trigger: "deploy",
    handler: (draft) => {
      const aegis = unitsOf(draft, OATHGUARD).filter((u) =>
        hasKeyword(draft, u.instanceId, "Aegis"),
      );
      if (aegis.length === 0) {
        log(draft, "Hammer Cadet finds no Aegis unit to strike.", { playerId: HOLLOW });
        return;
      }
      const target = [...aegis].sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))[0];
      log(draft, "Hammer Cadet deals 1 damage to an Aegis unit.", { playerId: HOLLOW });
      damageUnit(draft, target.instanceId, 1);
    },
  },
  {
    cardId: "RF-HC-BRK-004",
    mode: GameMode.Cooperative,
    sourceText: "Fracture 2.",
    trigger: "deploy",
    handler: (draft) => fracture(draft, 2, "Crack the Mortar"),
  },
  {
    cardId: "RF-HC-BRK-005",
    mode: GameMode.Cooperative,
    sourceText: "When attacking a Gate, this gets +1 ATK.",
    trigger: "static",
    gateAttackBonus: 1,
  },
  {
    cardId: "RF-HC-BRK-006",
    mode: GameMode.Cooperative,
    sourceText: "Deal 2 damage to the lowest-DEF Oathguard unit.",
    trigger: "deploy",
    handler: (draft) => {
      const target = lowestDefOathguardUnit(draft);
      if (!target) {
        log(draft, "Falling Stone finds no Oathguard unit.", { playerId: HOLLOW });
        return;
      }
      log(draft, "Falling Stone deals 2 damage.", { playerId: HOLLOW });
      damageUnit(draft, target, 2);
    },
  },
  {
    cardId: "RF-HC-BRK-007",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Deal 1 Ward damage to the Oathguard Gate.",
    trigger: "deploy",
    handler: (draft) => fracture(draft, 1, "Bronze Ram Construct"),
  },
  {
    cardId: "RF-HC-BRK-008",
    mode: GameMode.Cooperative,
    sourceText: "Enemies get +1 ATK while attacking Gates.",
    trigger: "static",
    gateAttackAura: 1,
  },
  {
    cardId: "RF-HC-BRK-009",
    mode: GameMode.Cooperative,
    sourceText: "Echo: Deal 1 Ward damage to the Oathguard Gate.",
    trigger: "echo",
    handler: (draft) => fracture(draft, 1, "Breaker Sapper"),
  },
  {
    cardId: "RF-HC-BRK-010",
    mode: GameMode.Cooperative,
    sourceText: "This attacks the Gate if able.",
    trigger: "static",
    attackTargetRule: "gate-if-able",
  },
];

registerEffects(EFFECTS);

export default EFFECTS;
