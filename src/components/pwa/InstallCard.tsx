import { Smartphone, WifiOff } from "lucide-react";

import { InstallRealmforge } from "@/components/pwa/InstallRealmforge";
import { useInstallPrompt } from "@/hooks/use-pwa";

/**
 * Settings panel describing installation and offline play. When Realmforge is
 * already running from the home screen it reports that state instead of
 * continuing to advertise installation.
 */
export function InstallCard() {
  const { installed } = useInstallPrompt();

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4 md:col-span-2">
      <p className="flex items-center gap-2 font-display">
        <Smartphone aria-hidden className="size-4 text-oath-gold" />
        Install Realmforge
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {installed
          ? "Realmforge is installed and running from your home screen."
          : "Add Realmforge to your home screen to play full screen. This is a web app, not an App Store download."}
      </p>
      <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
        <WifiOff aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          After your first visit, the tutorial, cooperative and competitive QuickPlay,
          pass-and-play, collection, decks, settings, and saved matches all work with no connection.
          Only cloud sign-in and sync need the network.
        </span>
      </p>
      {!installed && <InstallRealmforge className="mt-3" />}
    </div>
  );
}
