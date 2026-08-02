import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Realmforge crests are original geometric marks rather than stock icons.
 * Every faction uses a distinct silhouette as well as a distinct accent so the
 * identity survives grayscale, colour-vision differences, and small card sizes.
 */
const CRESTS: Record<string, { accent: string; label: string; key: CrestKey }> = {
  Truthwardens: {
    accent: "var(--faction-truthwardens)",
    label: "Truthwardens",
    key: "prism-eye",
  },
  Honorbound: {
    accent: "var(--faction-honorbound)",
    label: "Honorbound",
    key: "vowshield",
  },
  Dawnwatch: {
    accent: "var(--faction-dawnwatch)",
    label: "Dawnwatch",
    key: "winged-dawn",
  },
  Veilborn: {
    accent: "var(--faction-veilborn)",
    label: "Veilborn",
    key: "split-mask",
  },
  "Whisper Court": {
    accent: "var(--faction-whisper)",
    label: "Whisper Court",
    key: "mute-crown",
  },
  "The Breakers": {
    accent: "var(--faction-breakers)",
    label: "The Breakers",
    key: "fracture-maul",
  },
};

type CrestKey =
  "prism-eye" | "vowshield" | "winged-dawn" | "split-mask" | "mute-crown" | "fracture-maul";

function CrestGlyph({ kind }: { kind: CrestKey }): ReactNode {
  switch (kind) {
    case "prism-eye":
      return (
        <>
          <path d="M3 12c2.7-4 5.7-6 9-6s6.3 2 9 6c-2.7 4-5.7 6-9 6s-6.3-2-9-6Z" />
          <path d="m12 8 3 4-3 4-3-4 3-4Z" />
          <path d="M12 3v3M12 18v3" />
        </>
      );
    case "vowshield":
      return (
        <>
          <path d="M12 2.8 19 6v5.2c0 4.8-2.8 8.2-7 10-4.2-1.8-7-5.2-7-10V6l7-3.2Z" />
          <path d="M8 9.2h8M12 6v11M8.5 14.5 12 17l3.5-2.5" />
        </>
      );
    case "winged-dawn":
      return (
        <>
          <path d="M12 7.5a4.5 4.5 0 1 1-4.5 4.5A4.5 4.5 0 0 1 12 7.5Z" />
          <path d="M12 2v3M3.5 7l2.7 1.5M20.5 7l-2.7 1.5M4 16h3M17 16h3" />
          <path d="m2.5 12 5 2.5M21.5 12l-5 2.5M7 20l5-3 5 3" />
        </>
      );
    case "split-mask":
      return (
        <>
          <path d="M5 4.5 11 3l1 18c-4.4-1.8-7-5.7-7-10.6V4.5Z" />
          <path d="m19 4.5-6-1.5-1 18c4.4-1.8 7-5.7 7-10.6V4.5Z" />
          <path d="m7.5 9 3 1M16.5 9l-3 1M9 15l3 2 3-2" />
        </>
      );
    case "mute-crown":
      return (
        <>
          <path d="m4 8 3 2 2-6 3 5 3-5 2 6 3-2-1.5 10h-13L4 8Z" />
          <path d="M7 14h10M8 21h8M12 9v9" />
        </>
      );
    case "fracture-maul":
      return (
        <>
          <path d="m5 4 7 2-2 7-7-2 2-7ZM12 11l7 9M15 5l4-1 2 5-6 2" />
          <path d="m4 18 4-2-1 5M13 15l3-3" />
        </>
      );
  }
}

// eslint-disable-next-line react-refresh/only-export-components -- crest metadata is coupled to the crest renderer.
export function factionAccent(faction: string): string | undefined {
  return CRESTS[faction]?.accent;
}

export interface FactionCrestProps {
  faction: string;
  size?: "sm" | "md";
  withLabel?: boolean;
  className?: string;
}

export function FactionCrest({
  faction,
  size = "sm",
  withLabel = false,
  className,
}: FactionCrestProps) {
  const crest = CRESTS[faction];
  if (!crest) return null;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={crest.label}>
      <span
        aria-hidden
        className={cn(
          "realm-crest inline-flex shrink-0 items-center justify-center border",
          size === "sm" ? "size-6" : "size-9",
        )}
        style={{
          borderColor: `color-mix(in oklab, ${crest.accent} 72%, transparent)`,
          backgroundColor: `color-mix(in oklab, ${crest.accent} 16%, var(--hollow-blackglass))`,
          color: crest.accent,
          boxShadow: `0 0 14px color-mix(in oklab, ${crest.accent} 24%, transparent)`,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={size === "sm" ? "size-4" : "size-6"}
        >
          <CrestGlyph kind={crest.key} />
        </svg>
      </span>
      {withLabel && (
        <span className="truncate text-[0.7em] tracking-wide uppercase">{crest.label}</span>
      )}
      <span className="sr-only">{crest.label}</span>
    </span>
  );
}
