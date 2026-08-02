import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cardEffectSummary } from "@/game-engine/effect-status";
import type { CardDefinition } from "@/game-data/schema";
import { RealmCard } from "./RealmCard";

export interface CardInspectModalProps {
  card: CardDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardInspectModal({ card, open, onOpenChange }: CardInspectModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {card && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{card.name}</DialogTitle>
              <DialogDescription>
                {card.type} · {card.faction} · {card.side} · {card.mode} edition
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
              <RealmCard card={card} size="md" />

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Stable source ID
                  </dt>
                  <dd className="font-mono text-xs">{card.id}</dd>
                </div>
                {card.sourceCardId && (
                  <div>
                    <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                      Derived from
                    </dt>
                    <dd className="font-mono text-xs">{card.sourceCardId}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Source rules text
                  </dt>
                  <dd>{card.rules_text}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Cost / ATK / DEF
                  </dt>
                  <dd>
                    {card.cost} / {card.atk ?? "—"} / {card.def ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Keywords
                  </dt>
                  <dd className="flex flex-wrap gap-1">
                    {card.keywords.length === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      card.keywords.map((k) => (
                        <Badge key={k} variant="outline">
                          {k}
                        </Badge>
                      ))
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Digital effect
                  </dt>
                  <dd>
                    {(() => {
                      const summary = cardEffectSummary(card);
                      if (summary.status === "implemented") {
                        return (
                          <span className="text-oath-cyan">
                            Registered{summary.trigger ? ` (${summary.trigger})` : ""}
                          </span>
                        );
                      }
                      if (summary.status === "no-effect-required") {
                        return <span className="text-muted-foreground">No effect required</span>;
                      }
                      return (
                        <span className="font-semibold text-realm-danger">NOT IMPLEMENTED</span>
                      );
                    })()}
                  </dd>
                </div>
                {card.flavor_text && (
                  <div>
                    <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                      Flavor
                    </dt>
                    <dd className="italic">{card.flavor_text}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Art brief
                  </dt>
                  <dd className="text-muted-foreground">{card.art_brief || "—"}</dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
