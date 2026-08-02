/**
 * Cover artwork band used on the title screen and both mode landing pages.
 * Purely presentational: the art sits behind a scrim so overlaid text keeps
 * its contrast at every width.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import competitiveCover from "@/assets/competitive-cover-banner.png.asset.json";
import coopCover from "@/assets/coop-cover-banner.png.asset.json";

export type CoverArt = "cooperative" | "competitive";

const ART: Record<CoverArt, { url: string; alt: string }> = {
  cooperative: {
    url: coopCover.url,
    alt: "Oathguard heroes holding the line against the Hollow Crown",
  },
  competitive: {
    url: competitiveCover.url,
    alt: "Two Oathguard hosts facing each other across a storm-split realm",
  },
};

export interface CoverBannerProps {
  art: CoverArt;
  eyebrow?: string;
  title?: string;
  tagline?: string;
  children?: ReactNode;
  /** Taller treatment for the title screen hero. */
  hero?: boolean;
  className?: string;
}

export function CoverBanner({
  art,
  eyebrow,
  title,
  tagline,
  children,
  hero = false,
  className,
}: CoverBannerProps) {
  const source = ART[art];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-oath-gold/45 edge-double-gilt",
        className,
      )}
    >
      <img
        src={source.url}
        alt={source.alt}
        loading={hero ? "eager" : "lazy"}
        decoding="async"
        className={cn(
          "w-full object-cover",
          hero ? "h-64 object-center sm:h-80 lg:h-96" : "h-40 object-[50%_72%] sm:h-52",
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:linear-gradient(180deg,color-mix(in_oklab,var(--oath-blue-deep)_10%,transparent),color-mix(in_oklab,var(--oath-blue-deep)_88%,transparent))]"
      />
      {(eyebrow || title || tagline || children) && (
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          {eyebrow && (
            <p className="text-[0.65rem] tracking-[0.4em] text-oath-cyan uppercase">{eyebrow}</p>
          )}
          {title && (
            <h2 className="mt-1 font-display text-2xl leading-none font-bold sm:text-4xl">
              <span className="text-gilt">{title}</span>
            </h2>
          )}
          {tagline && <p className="mt-2 max-w-xl text-sm text-oath-silver">{tagline}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
      )}
    </section>
  );
}
