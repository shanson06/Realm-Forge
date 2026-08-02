import type { Caption } from "@/hooks/use-audio";

/**
 * Text equivalents for important sound cues. Rendered as a polite live region
 * so screen readers announce it without interrupting play.
 */
export function SoundCaptions({ captions }: { captions: readonly Caption[] }) {
  return (
    <div
      aria-live="polite"
      aria-label="Sound captions"
      className="pointer-events-none fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-50 flex flex-col items-center gap-1 px-4"
    >
      {captions.map((caption) => (
        <p
          key={caption.id}
          className="realm-fade-in rounded-full border border-oath-gold/45 bg-background/90 px-3 py-1 text-xs text-foreground shadow-[var(--shadow-relic)]"
        >
          🔊 {caption.text}
        </p>
      ))}
    </div>
  );
}
