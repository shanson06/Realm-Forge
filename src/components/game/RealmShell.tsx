import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { CueId } from "@/audio/cues";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAudioBed, useAudioUnlock, useSoundCaptions } from "@/hooks/use-audio";
import { SoundCaptions } from "./SoundCaptions";

export interface RealmShellProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
  wide?: boolean;
  bed?: CueId | null;
}

export function RealmShell({
  title,
  eyebrow,
  description,
  actions,
  backTo = "/menu",
  backLabel = "Back to menu",
  children,
  wide = false,
  bed = "menuAmbience",
}: RealmShellProps) {
  const { settings } = useAppSettings();
  useAudioUnlock();
  useAudioBed(bed, bed !== null);
  const captions = useSoundCaptions(settings.soundCaptions);

  return (
    <div className="safe-shell relative min-h-dvh overflow-hidden bg-background">
      <div aria-hidden className="realm-world-grid pointer-events-none fixed inset-0 opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 [background:radial-gradient(1000px_520px_at_18%_-8%,color-mix(in_oklab,var(--oath-blue)_30%,transparent),transparent_70%),radial-gradient(820px_480px_at_94%_104%,color-mix(in_oklab,var(--hollow-violet)_18%,transparent),transparent_72%)]"
      />
      <div
        aria-hidden
        className="realm-forge-sigil pointer-events-none fixed -top-48 left-1/2 size-[34rem] -translate-x-1/2 opacity-30"
      />
      <div
        aria-hidden
        className="realm-shimmer pointer-events-none fixed inset-0 opacity-20 [background:radial-gradient(600px_300px_at_80%_110%,color-mix(in_oklab,var(--oath-gold)_18%,transparent),transparent_70%)]"
      />

      <div
        className={cn(
          "relative mx-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8",
          wide ? "max-w-[110rem]" : "max-w-6xl",
        )}
      >
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-oath-gold/25 pb-4">
          <div className="min-w-0">
            {backTo && (
              <Link
                to={backTo}
                className="text-xs tracking-widest text-oath-silver/80 uppercase transition-colors hover:text-oath-gold"
              >
                ← {backLabel}
              </Link>
            )}
            {eyebrow && (
              <p className="mt-2 text-xs tracking-[0.32em] text-oath-cyan uppercase">{eyebrow}</p>
            )}
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              <span className="text-gilt">{title}</span>
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>

        {wide && (
          <p className="mb-3 hidden rounded-lg border border-oath-gold/35 bg-card/60 px-3 py-2 text-xs text-muted-foreground portrait:max-lg:block">
            Rotate to landscape for the full battlefield. This compact portrait layout keeps every
            control reachable above the home indicator.
          </p>
        )}
        {children}
      </div>
      {settings.soundCaptions && <SoundCaptions captions={captions} />}
    </div>
  );
}
