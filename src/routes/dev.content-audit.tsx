import { createFileRoute } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";

import { RealmShell } from "@/components/game/RealmShell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildAuditReport } from "@/game-data/audit";
import { quickPlayArtCoverage } from "@/game-data/card-art";
import { QUICKPLAY_DECK_SIZE } from "@/game-data/quickplay";

export const Route = createFileRoute("/dev/content-audit")({
  head: () => ({
    meta: [
      { title: "Content Audit — Realmforge" },
      {
        name: "description",
        content:
          "Development verification of Realmforge source files, deck counts, ID collisions, missing art, effect coverage, keywords, and open conflicts.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Content Audit — Realmforge" },
      { property: "og:description", content: "Development data verification tables." },
    ],
  }),
  component: ContentAudit,
  pendingComponent: () => <p className="p-6 text-muted-foreground">Building audit…</p>,
  errorComponent: ({ error }) => (
    <p role="alert" className="p-6 text-realm-danger">
      Audit failed: {error.message}
    </p>
  ),
});

function ContentAudit() {
  const report = useMemo(() => buildAuditReport(), []);
  const art = useMemo(() => quickPlayArtCoverage(), []);

  return (
    <RealmShell
      wide
      eyebrow="Development only"
      title="Content Audit"
      description="Derived directly from the uploaded JSON databases. Nothing here is hand-written."
      actions={<Badge variant="outline">{report.sources.length} source files</Badge>}
    >
      <div className="space-y-8">
        <Section title="Source file status">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">In file</TableHead>
                <TableHead className="text-right">Accepted</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.sources.map((source) => (
                <TableRow key={source.fileName}>
                  <TableCell className="font-mono text-xs">{source.fileName}</TableCell>
                  <TableCell>{source.mode}</TableCell>
                  <TableCell className="text-right">{source.recordsInFile}</TableCell>
                  <TableCell className="text-right">{source.recordsAccepted}</TableCell>
                  <TableCell className="text-right">{source.recordsRejected}</TableCell>
                  <TableCell>
                    <Badge variant={source.status === "ok" ? "secondary" : "destructive"}>
                      {source.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title="QuickPlay deck counts">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deck</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Source deck</TableHead>
                <TableHead className="text-right">Titles</TableHead>
                <TableHead className="text-right">Cards</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.quickPlayDecks.map((deck) => (
                <TableRow key={deck.manifest.deckId}>
                  <TableCell className="font-mono text-xs">{deck.manifest.deckId}</TableCell>
                  <TableCell>{deck.manifest.mode}</TableCell>
                  <TableCell>{deck.manifest.sourceDeck}</TableCell>
                  <TableCell className="text-right">{deck.entries.length}/10</TableCell>
                  <TableCell className="text-right">
                    {deck.totalCards}/{QUICKPLAY_DECK_SIZE}
                  </TableCell>
                  <TableCell>
                    <Badge variant={deck.valid ? "secondary" : "destructive"}>
                      {deck.valid ? "valid" : deck.manifest.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title={`Card ID collisions (${report.idCollisions.length})`}>
          {report.idCollisions.length === 0 ? (
            <Empty>No stable ID is reused across the two editions.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Modes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.idCollisions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id}</TableCell>
                    <TableCell>{row.modes.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <Section title={`QuickPlay card art import (${art.imported.length}/${art.total} imported)`}>
          <p className="mb-3 text-sm text-muted-foreground">
            Art is mapped into RealmCard by stable card ID. {art.pending.length} QuickPlay cards
            still render the “Art pending” window.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Faction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Art</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {art.rows.map((row) => (
                <TableRow key={row.cardId}>
                  <TableCell className="font-mono text-xs">{row.cardId}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-xs">{row.faction}</TableCell>
                  <TableCell className="text-xs">{row.type}</TableCell>
                  <TableCell>
                    <Badge variant={row.hasArt ? "secondary" : "destructive"}>
                      {row.hasArt ? "imported" : "art pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title={`Missing source art (${report.missingArt.length})`}>
          {report.missingArt.length === 0 ? (
            <Empty>Every record has production art.</Empty>
          ) : (
            <details className="rounded-lg border border-border/70 bg-card/60 p-4">
              <summary className="cursor-pointer text-sm">
                {report.missingArt.length} records have no production art
              </summary>
              <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
                {report.missingArt.map((row) => (
                  <li key={`${row.mode}:${row.cardId}`} className="font-mono">
                    {row.cardId} — {row.name}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Section>

        <Section
          title={`Effect implementation (${report.effectCoverage.implemented}/${report.effectCoverage.total})`}
        >
          <p className="mb-3 text-sm text-muted-foreground">
            {report.effectCoverage.notImplemented} playable cards have no typed effect and are
            marked NOT IMPLEMENTED. Rules text is never parsed at runtime.
          </p>
          <details className="rounded-lg border border-border/70 bg-card/60 p-4">
            <summary className="cursor-pointer text-sm">Show every card</summary>
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Deck</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.effectCoverage.rows.map((row) => (
                  <TableRow key={`${row.mode}:${row.cardId}`}>
                    <TableCell className="font-mono text-xs">{row.cardId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.mode}</TableCell>
                    <TableCell className="text-xs">{row.deck}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "implemented" ? "secondary" : "destructive"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
        </Section>

        <Section title="Keyword support">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Cards</TableHead>
                <TableHead>QuickPlay core</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.keywordUsage.map((row) => (
                <TableRow key={`${row.mode}:${row.keyword}`}>
                  <TableCell>{row.keyword}</TableCell>
                  <TableCell>{row.mode}</TableCell>
                  <TableCell className="text-right">{row.cardCount}</TableCell>
                  <TableCell>
                    <Badge variant={row.supported ? "secondary" : "destructive"}>
                      {row.supported ? "supported" : "unsupported"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title={`Conflicts requiring approval (${report.conflicts.length})`}>
          <div className="grid gap-3 lg:grid-cols-2">
            {report.conflicts.map((conflict) => (
              <article
                key={conflict.id}
                className="rounded-xl border border-realm-danger/50 bg-card/60 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display">{conflict.topic}</h3>
                  <Badge variant="outline">{conflict.id}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{conflict.detail}</p>
                <dl className="mt-3 space-y-1 text-xs">
                  <Row label="Source A" value={conflict.sourceA} />
                  <Row label="Source B" value={conflict.sourceB} />
                  <Row label="Recommendation" value={conflict.recommendation} />
                </dl>
              </article>
            ))}
          </div>
        </Section>

        <Section title={`Validation issues (${report.issues.length})`}>
          <details className="rounded-lg border border-border/70 bg-card/60 p-4">
            <summary className="cursor-pointer text-sm">Show all issues</summary>
            <ul className="mt-3 space-y-1 text-xs">
              {report.issues.map((issue, index) => (
                <li key={index} className="flex gap-2">
                  <span className="w-16 shrink-0 uppercase">{issue.severity}</span>
                  <span className="w-40 shrink-0 font-mono">{issue.cardId ?? "—"}</span>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          </details>
        </Section>
      </div>
    </RealmShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 font-display text-lg tracking-wide text-gilt">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
