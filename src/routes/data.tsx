import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { RealmShell } from "@/components/game/RealmShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlayerData } from "@/hooks/use-player-data";
import { deleteMatch, listMatches, storageAvailable } from "@/persistence/local-store";
import {
  PLAYER_DATA_VERSION,
  exportBackup,
  importBackup,
  type ImportReport,
} from "@/persistence/player-data";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Data Management — Realmforge" },
      {
        name: "description",
        content:
          "Export or import your Realmforge progress as a JSON backup, review saved matches, and clear local data. Guest play, no account.",
      },
      { property: "og:title", content: "Data Management — Realmforge" },
      {
        property: "og:description",
        content: "Back up, restore, or clear your local Realmforge data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataManagement,
  errorComponent: ({ error }) => (
    <p role="alert" className="p-6">
      {error.message}
    </p>
  ),
});

function DataManagement() {
  const { data, refresh, resetAll } = usePlayerData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    listMatches()
      .then((m) => setMatchCount(m.length))
      .catch(() => setMatchCount(null));
    storageAvailable()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  useEffect(reload, [reload]);

  const onExport = useCallback(async () => {
    setBusy(true);
    try {
      const bundle = await exportBackup();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `realmforge-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setReport({
        ok: true,
        message: "Backup downloaded.",
        restoredMatches: bundle.matches.length,
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const onImport = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const result = await importBackup(await file.text());
        setReport(result);
        if (result.ok) {
          refresh();
          reload();
        }
      } finally {
        setBusy(false);
      }
    },
    [refresh, reload],
  );

  const onClearMatches = useCallback(async () => {
    const matches = await listMatches();
    await Promise.all(matches.map((m) => deleteMatch(m.matchId)));
    reload();
  }, [reload]);

  return (
    <RealmShell
      eyebrow="Data management"
      title="Your saved data"
      description="Everything is stored on this device. You can take a full JSON backup at any time."
      actions={<Badge variant="secondary">Save schema v{PLAYER_DATA_VERSION}</Badge>}
    >
      <Alert className="mb-6 border-oath-gold/50">
        <AlertTitle>Guest play, no account</AlertTitle>
        <AlertDescription>
          Settings, tutorial progress, achievements, statistics, cosmetics, and active matches all
          live locally. Older saves are migrated forward automatically and are never discarded
          because the app updated.
        </AlertDescription>
      </Alert>

      <dl className="mb-6 grid gap-3 sm:grid-cols-3">
        <Info label="Saved matches" value={matchCount === null ? "—" : String(matchCount)} />
        <Info
          label="Local database"
          value={available === null ? "…" : available ? "Available" : "Unavailable"}
        />
        <Info label="Profile created" value={new Date(data.createdAt).toLocaleDateString()} />
      </dl>

      <section className="grid gap-3 md:grid-cols-2">
        <Panel
          title="Export a backup"
          body="Downloads one JSON file containing your profile, progress, settings, and saved matches."
        >
          <Button onClick={onExport} disabled={busy}>
            Export JSON backup
          </Button>
        </Panel>

        <Panel
          title="Import a backup"
          body="Restores a previously exported file. A file from an older app version is migrated on import."
        >
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImport(file);
              event.target.value = "";
            }}
          />
          <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            Choose backup file
          </Button>
        </Panel>

        <Panel
          title="Clear saved matches"
          body="Removes in-progress matches. Progress and achievements are kept."
        >
          <Button variant="outline" disabled={busy} onClick={() => void onClearMatches()}>
            Delete saved matches
          </Button>
        </Panel>

        <Panel
          title="Reset all progress"
          body="Deletes your local profile, achievements, statistics, and cosmetics. Export a backup first."
        >
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Delete all local Realmforge progress? This cannot be undone.")) {
                resetAll();
                setReport({ ok: true, message: "Local progress reset.", restoredMatches: 0 });
              }
            }}
          >
            Reset progress
          </Button>
        </Panel>
      </section>

      {report && (
        <p
          role="status"
          className={`mt-6 text-sm ${report.ok ? "text-oath-cyan" : "text-realm-danger"}`}
        >
          {report.message}
          {report.ok && report.restoredMatches > 0 && ` (${report.restoredMatches} match save(s))`}
          {report.migratedFrom !== undefined &&
            report.migratedFrom !== PLAYER_DATA_VERSION &&
            ` Migrated from schema v${report.migratedFrom}.`}
        </p>
      )}

      <section className="mt-8 rounded-xl border border-border/70 bg-card/60 p-4">
        <h2 className="font-display text-xs tracking-widest uppercase">Cloud sync</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Optional cloud accounts are not enabled yet. Local persistence is the tested path in this
          phase; sign-in and conflict resolution are the next step and will always keep guest play
          available.
        </p>
      </section>
    </RealmShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4">
      <dt className="text-xs tracking-widest text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 font-display text-xl">{value}</dd>
    </div>
  );
}

function Panel({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-4">
      <div>
        <h2 className="font-display text-sm">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}
