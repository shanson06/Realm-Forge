import type { CardDefinition, CardSide } from "@/game-data/schema";

export type Allegiance = "oathguard" | "hollow" | "neutral";

export function allegianceOf(side: CardSide): Allegiance {
  if (side === "Hollow Crown") return "hollow";
  if (side === "Neutral Setup") return "neutral";
  return "oathguard";
}

export function cardAllegiance(card: CardDefinition): Allegiance {
  return allegianceOf(card.side);
}

/** Surface + edge treatment per allegiance. Tokens only — no raw colors. */
export const surfaceClass: Record<Allegiance, string> = {
  oathguard: "surface-oathguard",
  hollow: "surface-hollow",
  neutral: "bg-muted shadow-[var(--edge-steel)]",
};

export const trimClass: Record<Allegiance, string> = {
  oathguard: "border-oath-gold/50",
  hollow: "border-hollow-violet/55",
  neutral: "border-border",
};

export const accentTextClass: Record<Allegiance, string> = {
  oathguard: "text-oath-gold",
  hollow: "text-hollow-violet-bright",
  neutral: "text-muted-foreground",
};