import { Download, Share, Plus, CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInstallPrompt } from "@/hooks/use-pwa";
import { haptic } from "@/lib/platform";

/**
 * "Install Realmforge" entry point.
 *
 * Chromium browsers get their native install prompt. iPhone and iPad Safari have
 * no prompt API, so they get the three Share-sheet steps instead. Once the app
 * is running standalone nothing renders at all.
 *
 * This installs a web app to the home screen. It is deliberately never described
 * as an App Store download.
 */
export function InstallRealmforge({ className }: { className?: string }) {
  const { canPrompt, needsIOSInstructions, installed, promptInstall } = useInstallPrompt();
  const [showIOS, setShowIOS] = useState(false);

  if (installed || (!canPrompt && !needsIOSInstructions)) return null;

  return (
    <>
      <Button
        variant="outline"
        className={className}
        onClick={() => {
          haptic();
          if (canPrompt) void promptInstall();
          else setShowIOS(true);
        }}
      >
        <Download aria-hidden className="mr-2 size-4" />
        Install Realmforge
      </Button>

      <Dialog open={showIOS} onOpenChange={setShowIOS}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Realmforge to your Home Screen</DialogTitle>
            <DialogDescription>
              Three steps in Safari on iPhone or iPad. This adds the web app to your Home Screen —
              it is not an App Store download.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <IOSStep
              index={1}
              icon={<Share aria-hidden className="size-5 text-oath-cyan" />}
              title="Tap Share"
              detail="The square-with-an-arrow button in Safari's toolbar."
            />
            <IOSStep
              index={2}
              icon={<Plus aria-hidden className="size-5 text-oath-cyan" />}
              title="Choose Add to Home Screen"
              detail="Scroll the share sheet if you do not see it straight away."
            />
            <IOSStep
              index={3}
              icon={<CheckCircle2 aria-hidden className="size-5 text-oath-gold" />}
              title="Tap Add"
              detail="Realmforge appears on your Home Screen and opens full screen, offline."
            />
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}

function IOSStep({
  index,
  icon,
  title,
  detail,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-oath-gold/25 bg-card/60 p-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-oath-gold/50 text-xs text-oath-gold">
        {index}
      </span>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}