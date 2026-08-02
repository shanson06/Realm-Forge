import { useCallback, useEffect, useState } from "react";

import { setAudioLevels } from "@/audio/engine";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "@/persistence/local-store";

/**
 * Reads persisted settings after hydration so SSR and the first client render
 * agree, then applies accessibility flags to the document element.
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("realm-high-contrast", settings.highContrast);
    root.classList.toggle("realm-large-text", settings.largeText);
    root.classList.toggle("realm-reduced-motion", settings.reducedMotion);
    root.classList.toggle("realm-no-shake", !settings.screenShake);
    root.dataset.animationSpeed = settings.animationSpeed;
  }, [hydrated, settings]);

  // Volume sliders feed the shared audio engine. Muting never blocks gameplay.
  useEffect(() => {
    setAudioLevels({
      master: settings.masterVolume / 100,
      music: settings.musicEnabled ? settings.musicVolume / 100 : 0,
      effects: settings.soundEnabled ? settings.effectsVolume / 100 : 0,
      ambience: settings.soundEnabled ? settings.ambienceVolume / 100 : 0,
    });
  }, [
    settings.masterVolume,
    settings.musicVolume,
    settings.effectsVolume,
    settings.ambienceVolume,
    settings.musicEnabled,
    settings.soundEnabled,
  ]);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, update, reset, hydrated };
}
