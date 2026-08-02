import { useCallback, useEffect, useState } from "react";

import { isIOSSafari, isStandalone, isOnline } from "@/lib/platform";
import { registerServiceWorker } from "@/lib/pwa/register-sw";

/** Chromium's install prompt event, which is not in the DOM lib typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallState {
  /** The browser offered a native install prompt we can trigger. */
  canPrompt: boolean;
  /** No prompt API, but Add to Home Screen is available via the Share sheet. */
  needsIOSInstructions: boolean;
  /** Already launched from the home screen — stop advertising installation. */
  installed: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIosSafari(isIOSSafari());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const media = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayChange = () => setInstalled(isStandalone());
    media?.addEventListener?.("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      media?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
    return outcome;
  }, [deferred]);

  return {
    canPrompt: !installed && deferred !== null,
    needsIOSInstructions: !installed && deferred === null && iosSafari,
    installed,
    promptInstall,
  };
}

/** Live connectivity, used only for messaging — never to gate local play. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(isOnline());
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}

/**
 * Registers the worker once per session and exposes a pending update.
 * The update is never applied automatically — see `register-sw.ts`.
 */
export function useServiceWorkerUpdate() {
  const [activate, setActivate] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    void registerServiceWorker((run) => {
      if (!cancelled) setActivate(() => run);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => setActivate(null), []);

  return { updateReady: activate !== null, applyUpdate: activate, dismiss };
}