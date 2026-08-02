import type { CSSProperties } from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { cardEffectStatus } from "@/game-engine/effect-status";
import { cardArtUrl } from "@/game-data/card-art";
import type { CardDefinition } from "@/game-data/schema";
import { accentTextClass, cardAllegiance, surfaceClass, trimClass } from "./side";
import { FactionCrest, factionAccent } from "./FactionCrest";

export type CardSize = "sm" | "md" | "lg";

const sizeClass: Record<CardSize, string> = {
  sm: "w-28 min-h-44 text-[0.62rem]",
  md: "w-44 min-h-72 text-[0.72rem]",
  lg: "w-64 min-h-[24rem] text-sm",
};

const badgeSize: Record<CardSize, string> = {
  sm: "size-7 text-[0.68rem]",
  md: "size-9 text-sm",
  lg: "size-12 text-lg",
};

const artHeight: Record<CardSize, string> = {
  sm: "h-16",
  md: "h-28",
  lg: "h-40",
};

export interface RealmCardProps {
  card: CardDefinition;
  size?: CardSize;
  illegalReason?: string | null;
  selected?: boolean;
  damage?: number;
  onInspect?: (card: CardDefinition) => void;
  entering?: boolean;
  className?: string;
}

export function RealmCard({
  card,
  size = "md",
  illegalReason = null,
  selected = false,
  damage = 0,
  onInspect,
  entering = false,
  className,
}: RealmCardProps) {
  const allegiance = cardAllegiance(card);
  const effectStatus = cardEffectStatus(card);
  const remainingDef = card.def === null ? null : Math.max(card.def - damage, 0);
  const accent = factionAccent(card.faction);
  const hollow = allegiance === "hollow";
  const artUrl = cardArtUrl(card.id);
  const resourceLabel = hollow ? "Threat" : "Energy";

  return (
    <button
      type="button"
      onClick={() => onInspect?.(card)}
      aria-label={`${card.name}, ${card.type}, ${resourceLabel.toLowerCase()} ${card.cost}`}
      aria-disabled={illegalReason !== null}
      title={illegalReason ?? undefined}
      className={cn(
        "realm-card-frame group relative flex flex-col overflow-hidden border-2 p-[3px] text-left transition-transform",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        sizeClass[size],
        surfaceClass[allegiance],
        trimClass[allegiance],
        hollow
          ? "layer-blackglass edge-double-hollow realm-card-hollow"
          : "layer-metal edge-double-gilt realm-card-oath",
        entering && "realm-arrive",
        illegalReason ? "opacity-45 saturate-50" : "hover:-translate-y-1 hover:scale-[1.015]",
        selected && "ring-2 ring-oath-cyan",
        className,
      )}
      style={
        accent
          ? ({
              "--card-accent": accent,
              borderColor: `color-mix(in oklab, ${accent} 58%, transparent)`,
            } as CSSProperties)
          : undefined
      }
    >
      <span aria-hidden className="realm-card-circuit" />

      <header className="relative z-10 flex items-center gap-1 px-1 pt-1">
        <span
          aria-label={`${resourceLabel} ${card.cost}`}
          className={cn(
            "realm-resource-badge flex shrink-0 flex-col items-center justify-center font-display font-bold text-foreground",
            badgeSize[size],
          )}
        >
          <span className="leading-none">{card.cost}</span>
          <span className="text-[0.42em] leading-none tracking-widest uppercase">
            {hollow ? "T" : "E"}
          </span>
        </span>

        <span className="realm-title-plate min-w-0 flex-1 px-1.5 py-1 text-center">
          <span className="block truncate font-display leading-tight font-semibold tracking-wide text-foreground">
            {card.name}
          </span>
          <span
            className={cn(
              "block truncate text-[0.58em] tracking-[0.18em] uppercase",
              accentTextClass[allegiance],
            )}
          >
            {card.type} · {card.faction}
          </span>
        </span>

        <span className="realm-crest-collar flex shrink-0 items-center justify-center p-0.5">
          <FactionCrest faction={card.faction} />
        </span>
      </header>

      <div className={cn("relative z-10 mx-1 mt-1.5", artHeight[size])}>
        <div
          aria-hidden
          className={cn(
            "realm-art-window flex size-full items-end justify-center overflow-hidden px-2 pb-1 text-center text-[0.6em] tracking-widest text-muted-foreground uppercase",
            hollow ? "realm-art-hollow" : "realm-art-oath",
          )}
        >
          {artUrl ? (
            <img
              src={artUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.035]"
            />
          ) : (
            "Art pending"
          )}
        </div>

        {card.atk !== null && (
          <span
            aria-label={`Attack ${card.atk}`}
            className={cn(
              "realm-stat-badge realm-stat-attack absolute -bottom-2 -left-1 flex items-center justify-center font-display font-bold text-foreground",
              badgeSize[size],
            )}
          >
            {card.atk}
          </span>
        )}
        {remainingDef !== null && (
          <span
            aria-label={`Defense ${remainingDef} of ${card.def}`}
            className={cn(
              "realm-stat-badge realm-stat-defense absolute -right-1 -bottom-2 flex items-center justify-center font-display font-bold",
              damage > 0 ? "text-realm-danger" : "text-oath-cyan",
              badgeSize[size],
            )}
          >
            {remainingDef}
          </span>
        )}
      </div>

      {card.keywords.length > 0 && (
        <ul className="relative z-10 mt-3 flex flex-wrap justify-center gap-1 px-1">
          {card.keywords.map((keyword) => (
            <li
              key={keyword}
              className="realm-keyword-chip px-1.5 py-px text-[0.62em] tracking-wide text-oath-silver"
            >
              {keyword}
            </li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          "realm-rules-glass relative z-10 mx-1 mt-1 flex-1 overflow-hidden px-1.5 py-1.5",
          card.keywords.length === 0 && "mt-3",
        )}
      >
        <FactionCrest
          faction={card.faction}
          size="md"
          className="pointer-events-none absolute -right-1 -bottom-1 opacity-[0.08]"
        />
        <p className="relative line-clamp-4 leading-snug text-foreground/90">{card.rules_text}</p>
      </div>

      <footer className="relative z-10 mt-auto flex items-center gap-1 overflow-hidden px-1.5 pt-1 pb-0.5 text-[0.58em] tracking-widest uppercase">
        <span className="truncate text-muted-foreground">{card.rarity}</span>
        <span aria-hidden className="realm-edition-gem ml-0.5" />
        {damage > 0 && <span className="shrink-0 text-realm-danger">−{damage}</span>}
        <span className="ml-auto shrink-0 text-oath-gold/70">{card.id}</span>
        {effectStatus === "not-implemented" && (
          <span
            className="shrink-0 text-realm-danger"
            title="No typed effect implementation is registered for this card."
            aria-label="No typed effect implementation is registered for this card"
          >
            <AlertTriangle className="size-3" aria-hidden />
          </span>
        )}
      </footer>
    </button>
  );
}
