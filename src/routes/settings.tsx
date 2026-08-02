import { Link, createFileRoute } from "@tanstack/react-router";

import { RealmShell } from "@/components/game/RealmShell";
import { InstallCard } from "@/components/pwa/InstallCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useCuePlayer } from "@/hooks/use-audio";
import type { AppSettings } from "@/persistence/local-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Realmforge" },
      {
        name: "description",
        content:
          "Adjust Realmforge animation speed, sound, action history, and surrender confirmation. Saved on this device.",
      },
      { property: "og:title", content: "Settings — Realmforge" },
      { property: "og:description", content: "Animation, sound, and match preferences." },
    ],
  }),
  component: SettingsScreen,
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error.message}</p>,
});

function SettingsScreen() {
  const { settings, update, reset } = useAppSettings();
  const playCue = useCuePlayer();

  return (
    <RealmShell
      eyebrow="Preferences"
      title="Settings"
      description="Stored locally. Accessibility options live on their own page."
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/accessibility">Accessibility</Link>
          </Button>
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <InstallCard />
        <div className="rounded-xl border border-border/70 bg-card/60 p-4">
          <Label htmlFor="animation-speed" className="font-display">
            Animation speed
          </Label>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Controls how quickly cards, attacks, and crystals animate.
          </p>
          <Select
            value={settings.animationSpeed}
            onValueChange={(value) =>
              update("animationSpeed", value as AppSettings["animationSpeed"])
            }
          >
            <SelectTrigger id="animation-speed" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="reduced">Reduced</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="fast">Fast</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ToggleRow
          id="sound"
          label="Sound effects"
          detail="Attack, crystal, and Gate feedback."
          checked={settings.soundEnabled}
          onChange={(value) => update("soundEnabled", value)}
        />
        <ToggleRow
          id="music"
          label="Music"
          detail="Background score during matches."
          checked={settings.musicEnabled}
          onChange={(value) => update("musicEnabled", value)}
        />

        <VolumeRow
          id="master-volume"
          label="Master volume"
          detail="Scales every other audio channel."
          value={settings.masterVolume}
          onChange={(value) => update("masterVolume", value)}
          onCommit={() => playCue("crystalCharge")}
        />
        <VolumeRow
          id="music-volume"
          label="Music volume"
          detail="Menu, battle, competitive, and boss themes."
          value={settings.musicVolume}
          onChange={(value) => update("musicVolume", value)}
        />
        <VolumeRow
          id="effects-volume"
          label="Effects volume"
          detail="Card play, metal impact, Gate break, victory, and defeat."
          value={settings.effectsVolume}
          onChange={(value) => update("effectsVolume", value)}
          onCommit={() => playCue("metalImpact")}
        />
        <VolumeRow
          id="ambience-volume"
          label="Ambience volume"
          detail="Hall and battlefield atmosphere beds."
          value={settings.ambienceVolume}
          onChange={(value) => update("ambienceVolume", value)}
        />

        <ToggleRow
          id="history"
          label="Show action history"
          detail="Keeps the visible log panel open during a match."
          checked={settings.showActionHistory}
          onChange={(value) => update("showActionHistory", value)}
        />
        <ToggleRow
          id="surrender"
          label="Confirm surrender and restart"
          detail="Always ask before ending a match early."
          checked={settings.confirmSurrender}
          onChange={(value) => update("confirmSurrender", value)}
        />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        All Realmforge audio is generated in the app itself — no third-party or copyrighted music or
        sound effects are used. Audio starts only after your first tap or key press, as browsers require.
      </p>
    </RealmShell>
  );
}

export function VolumeRow({
  id,
  label,
  detail,
  value,
  onChange,
  onCommit,
}: {
  id: string;
  label: string;
  detail: string;
  value: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="font-display">
          {label}
        </Label>
        <span className="font-mono text-sm">{value}%</span>
      </div>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">{detail}</p>
      <Slider
        id={id}
        value={[value]}
        min={0}
        max={100}
        step={5}
        aria-label={`${label}, ${value} percent`}
        onValueChange={([next]) => onChange(next)}
        onValueCommit={() => onCommit?.()}
      />
    </div>
  );
}

export function ToggleRow({
  id,
  label,
  detail,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="font-display">
          {label}
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}