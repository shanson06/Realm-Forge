import { createFileRoute } from "@tanstack/react-router";

import { RealmShell } from "@/components/game/RealmShell";
import { useAppSettings } from "@/hooks/use-app-settings";
import { ToggleRow } from "./settings";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility — Realmforge" },
      {
        name: "description",
        content:
          "Realmforge accessibility options: reduced motion, high contrast, larger text, and non-colour state indicators.",
      },
      { property: "og:title", content: "Accessibility — Realmforge" },
      { property: "og:description", content: "Reduced motion, contrast, text size, and indicators." },
    ],
  }),
  component: AccessibilityScreen,
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error.message}</p>,
});

function AccessibilityScreen() {
  const { settings, update } = useAppSettings();

  return (
    <RealmShell
      backTo="/settings"
      backLabel="Settings"
      eyebrow="Accessibility"
      title="Make it readable"
      description="No required action in Realmforge depends on a hidden gesture. Tap targets, contrast, and text size can all be adjusted here."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <ToggleRow
          id="reduced-motion"
          label="Reduced motion"
          detail="Removes card flight, shake, and crystal shimmer."
          checked={settings.reducedMotion}
          onChange={(value) => update("reducedMotion", value)}
        />
        <ToggleRow
          id="screen-shake"
          label="Screen shake"
          detail="Impact shake on Gate damage and crystal loss. Turn off for a still battlefield."
          checked={settings.screenShake}
          onChange={(value) => update("screenShake", value)}
        />
        <ToggleRow
          id="sound-captions"
          label="Sound captions"
          detail="Shows a short caption for every important sound cue."
          checked={settings.soundCaptions}
          onChange={(value) => update("soundCaptions", value)}
        />
        <ToggleRow
          id="high-contrast"
          label="High contrast"
          detail="Strengthens borders and text against the battlefield."
          checked={settings.highContrast}
          onChange={(value) => update("highContrast", value)}
        />
        <ToggleRow
          id="large-text"
          label="Larger text"
          detail="Increases card and interface text size."
          checked={settings.largeText}
          onChange={(value) => update("largeText", value)}
        />
        <ToggleRow
          id="non-color"
          label="Non-colour indicators"
          detail="Adds symbols and labels wherever colour alone would carry meaning."
          checked={settings.nonColorIndicators}
          onChange={(value) => update("nonColorIndicators", value)}
        />
      </div>
      <div className="mt-6 space-y-2 rounded-xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">
        <h2 className="font-display text-sm tracking-widest text-foreground uppercase">
          Always on
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Every drag has a tap alternative: use the Play button on a card, or tap an attacker and then a highlighted target.</li>
          <li>Illegal actions stay visible, dimmed, and explain the reason instead of disappearing.</li>
          <li>Card, stat, target, and match-state controls carry descriptive labels for screen readers.</li>
          <li>Focus is always visible and follows reading order for keyboard and switch access.</li>
          <li>State is never carried by colour alone — icons, symbols, and text back every indicator.</li>
        </ul>
      </div>
    </RealmShell>
  );
}