import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { ActionLog } from "@/components/game/ActionLog";
import { CardInspectModal } from "@/components/game/CardInspectModal";
import { CrystalSpinner } from "@/components/game/CrystalSpinner";
import { DeckPile } from "@/components/game/DeckPile";
import { DiscardPile } from "@/components/game/DiscardPile";
import { EnergyTray } from "@/components/game/EnergyCrystal";
import { Gate } from "@/components/game/Gate";
import { HandCard } from "@/components/game/HandCard";
import { NothingPlayableHint } from "@/components/game/NothingPlayableHint";
import { MatchNotice } from "@/components/game/MatchNotice";
import { RealmShell } from "@/components/game/RealmShell";
import { SupportSlot } from "@/components/game/SupportSlot";
import { TrialsPromptPanel } from "@/components/game/TrialsPromptPanel";
import { UnitSlot } from "@/components/game/UnitSlot";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCard } from "@/game-data/load";
import type { CardDefinition } from "@/game-data/schema";
import { canAttack, canPlayCard, legalAttackTargets } from "@/game-engine/trials/legal";
import { availableEnergy, isUnitCard } from "@/game-engine/trials/queries";
import {
  crystalsTarget,
  gateTarget,
  otherSeat,
  type TrialsMatchState,
  type TrialsSeatId,
} from "@/game-engine/trials/types";
import { trialsConfigOf, useTrials } from "@/hooks/use-trials";
import { useRecordOutcome } from "@/hooks/use-record-outcome";
import { useCuePlayer, useLogCues } from "@/hooks/use-audio";

export const Route = createFileRoute("/trials/match")({
  head: () => ({
    meta: [
      { title: "Trials Duel — Realmforge" },
      {
        name: "description",
        content:
          "A competitive Realmforge QuickPlay duel: break the opposing Gate, shatter six crystals, and hold your own.",
      },
      { property: "og:title", content: "Trials Duel — Realmforge" },
      {
        property: "og:description",
        content: "Oathguard Order versus Oathguard Order in competitive QuickPlay.",
      },
    ],
  }),
  component: TrialsMatchScreen,
  errorComponent: ({ error }) => (
    <div role="alert" className="space-y-3 p-6">
      <h1 className="font-display text-lg">The duel could not be started</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button asChild variant="outline">
        <Link to="/trials">Back to Trials setup</Link>
      </Button>
    </div>
  ),
});

const STEP_LABEL: Record<TrialsMatchState["step"], string> = {
  setup: "Setup",
  readyAndCharge: "Ready and Charge",
  play: "Play",
  battle: "Battle",
  pass: "Pass",
};

function TrialsMatchScreen() {
  const { state, loading, notice, aiThinking, dispatch, startNewMatch, dismissNotice } = useTrials();
  const [inspected, setInspected] = useState<CardDefinition | null>(null);
  const [attackerId, setAttackerId] = useState<string | null>(null);
  const [pendingHandId, setPendingHandId] = useState<string | null>(null);
  const [confirmConcede, setConfirmConcede] = useState(false);
  const playCue = useCuePlayer();

  useLogCues(state?.log ?? []);

  useEffect(() => {
    if (!state?.result) return;
    playCue("victory");
  }, [state?.result, playCue]);

  const card = (instanceId: string | null | undefined): CardDefinition | null => {
    if (!state || !instanceId) return null;
    return getCard(state.mode, state.instances[instanceId]?.definitionId ?? "") ?? null;
  };

  const targets = useMemo(
    () => (state && attackerId ? legalAttackTargets(state, attackerId) : []),
    [state, attackerId],
  );

  // Local statistics only. The human seat's result is what gets recorded.
  const outcome = useMemo(() => {
    if (!state?.result) return null;
    const humanSeats = (Object.values(state.players) as { seatId: string; controller: string; faction: string }[])
      .filter((p) => p.controller === "human");
    const primary = humanSeats[0];
    if (!primary) return null;
    return {
      mode: "competitive" as const,
      won: state.result.winningPlayerIds.includes(primary.seatId as never),
      order: primary.faction,
    };
  }, [state]);
  useRecordOutcome(state?.matchId ?? null, outcome);

  if (loading) {
    return (
      <RealmShell wide eyebrow="Battlefield" title="Trials duel" description="Restoring your duel…">
        <p className="text-sm text-muted-foreground">Loading saved match state…</p>
      </RealmShell>
    );
  }

  if (!state) {
    return (
      <RealmShell
        wide
        eyebrow="Competitive QuickPlay"
        title="No duel in progress"
        description="Choose an opponent and an Order to begin."
      >
        <Button asChild>
          <Link to="/trials">Set up a duel</Link>
        </Button>
      </RealmShell>
    );
  }

  const activeId = state.activeSeatId;
  const active = state.players[activeId];
  const handLegality = active.hand.map((instanceId) => ({
    instanceId,
    definition: card(instanceId),
    legality: canPlayCard(state, instanceId),
  }));
  const nothingPlayable =
    active.controller === "human" &&
    active.hand.length > 0 &&
    state.step === "play" &&
    !state.prompt &&
    !state.handoffPending &&
    !state.result &&
    handLegality.every((entry) => !entry.legality.legal);
  const blockedByEnergyOnly =
    nothingPlayable &&
    handLegality.every(
      (entry) => !entry.legality.legal && entry.legality.reason.code === "not-enough-energy",
    );
  const cheapestCost = Math.min(
    ...handLegality.map((entry) => entry.definition?.cost ?? Number.POSITIVE_INFINITY),
  );
  const foeId = otherSeat(activeId);
  const foe = state.players[foeId];
  const humanTurn = active.controller === "human" && !state.result && !state.handoffPending;

  // Pass-and-play privacy: the outgoing hand is gone before the handoff screen appears,
  // and nothing about either hand is written to the action history.
  if (state.handoffPending && state.pendingSeatId) {
    const incoming = state.players[state.pendingSeatId];
    return (
      <RealmShell
        eyebrow="Pass and play"
        title="Hand the device over"
        description="The previous player's cards are hidden. Only tap Continue when the next player is holding the device."
      >
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-oath-gold/40 bg-oath-blue-deep/60 p-6 text-center">
          <Badge className="bg-oath-cyan/20 text-oath-cyan">Next up</Badge>
          <p className="font-display text-2xl">{incoming.displayName}</p>
          <p className="text-sm text-muted-foreground">
            Tap Continue to reveal your hand and begin your turn.
          </p>
          <Button size="lg" onClick={() => dispatch({ kind: "acknowledgeHandoff" })}>
            Continue as {incoming.displayName}
          </Button>
        </div>
      </RealmShell>
    );
  }

  const attack = (targetId: string) => {
    if (!attackerId) return;
    dispatch({ kind: "declareAttack", attackerId, targetId });
    setAttackerId(null);
  };

  const selectAttacker = (instanceId: string) => {
    const legality = canAttack(state, instanceId);
    if (!legality.legal) {
      dispatch({ kind: "declareAttack", attackerId: instanceId, targetId: "" });
      return;
    }
    setAttackerId((current) => (current === instanceId ? null : instanceId));
  };

  const playFromHand = (instanceId: string, slotIndex: number | null = null) => {
    dispatch({ kind: "playCard", instanceId, slotIndex, targetIds: [] });
    setPendingHandId(null);
  };

  // Tap-to-play: unit cards ask for a space first, everything else resolves now.
  const beginPlay = (instanceId: string) => {
    const definition = card(instanceId);
    const legality = canPlayCard(state, instanceId);
    if (!legality.legal || !definition) {
      dispatch({ kind: "playCard", instanceId, slotIndex: null, targetIds: [] });
      return;
    }
    if (isUnitCard(definition)) {
      setAttackerId(null);
      setPendingHandId((current) => (current === instanceId ? null : instanceId));
      return;
    }
    playFromHand(instanceId, null);
  };

  // A tapped unit space either receives the pending card or picks an attacker.
  const tapUnitSlot = (index: number, instanceId: string | null) => {
    if (pendingHandId) {
      playFromHand(pendingHandId, index);
      return;
    }
    if (instanceId) selectAttacker(instanceId);
  };

  const seatSummary = (seatId: TrialsSeatId) => {
    const player = state.players[seatId];
    return `${player.displayName} · Gate ${player.gateWard}/${player.gateMaxWard} · Crystals ${player.crystalSpinner}/${player.maxCrystals}`;
  };

  const foeGate = gateTarget(foeId);
  const foeCrystals = crystalsTarget(foeId);
  const deckWarning = active.deck.length <= 3 && !state.result;

  return (
    <RealmShell
      wide
      bed="battleCompetitive"
      eyebrow="Oathguard Trials"
      title={`${active.displayName}'s turn`}
      description={`Round ${state.round} · ${STEP_LABEL[state.step]} · ${active.cardsPlayedThisTurn}/${active.cardPlayLimit} cards played`}
      actions={
        <div className="flex flex-wrap gap-2">
          {humanTurn && state.step === "play" && (
            <Button variant="secondary" onClick={() => dispatch({ kind: "beginStep", step: "battle" })}>
              Go to Battle
            </Button>
          )}
          {humanTurn && active.reserveToken === "available" && (
            <Button variant="outline" onClick={() => dispatch({ kind: "spendReserveToken" })}>
              Spend Reserve token
            </Button>
          )}
          {humanTurn && !state.prompt && (
            <Button onClick={() => dispatch({ kind: "endTurn" })}>End turn</Button>
          )}
          <Button variant="outline" onClick={() => setConfirmConcede(true)}>
            Concede
          </Button>
        </div>
      }
    >
      <div
        role="status"
        className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-oath-gold/40 bg-oath-blue-deep/50 px-4 py-2 text-sm"
      >
        <Badge className="bg-oath-cyan/20 text-oath-cyan">Active: {active.displayName}</Badge>
        <span className="text-muted-foreground">{seatSummary(activeId)}</span>
        <span className="text-muted-foreground">{seatSummary(foeId)}</span>
        {active.reserveToken !== "none" && (
          <Badge className="bg-oath-gold/20 text-oath-gold">
            Reserve token {active.reserveToken === "available" ? "ready" : "used"}
          </Badge>
        )}
        {aiThinking && <span className="text-muted-foreground">The computer is deciding…</span>}
      </div>

      <MatchNotice message={notice} onDismiss={dismissNotice} />

      {pendingHandId && (
        <Alert className="mb-4 border-oath-cyan/60" role="status">
          <AlertTitle>Choose a space</AlertTitle>
          <AlertDescription>
            Tap one of your highlighted empty unit spaces to deploy this card, or tap Cancel on the
            card.
          </AlertDescription>
        </Alert>
      )}

      {deckWarning && (
        <Alert className="mb-4 border-hollow-violet/60" role="status">
          <AlertTitle>Deck running low</AlertTitle>
          <AlertDescription>
            {active.displayName} has {active.deck.length} card
            {active.deck.length === 1 ? "" : "s"} left. Drawing from an empty deck loses the duel.
          </AlertDescription>
        </Alert>
      )}

      {state.result && (
        <Alert className="realm-rise mb-4 border-oath-cyan/70 forge-glow" role="alert">
          <AlertTitle className="font-display">
            {state.players[state.result.winningPlayerIds[0] as TrialsSeatId]?.displayName ?? "Match"}{" "}
            wins
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{state.result.reason}</p>
            <Button size="sm" onClick={() => startNewMatch(trialsConfigOf(state))}>
              Rematch
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {import.meta.env.DEV && state.lastAiReason && (
        <p className="mb-3 font-mono text-xs text-muted-foreground">AI: {state.lastAiReason}</p>
      )}

      {state.prompt && active.controller === "human" && (
        <div className="mb-4">
          <TrialsPromptPanel
            prompt={state.prompt}
            state={state}
            onChoose={(effectId, targetIds) => dispatch({ kind: "chooseTarget", effectId, targetIds })}
            onKeepHand={() => dispatch({ kind: "mulligan", replace: false })}
            onReplaceHand={() => dispatch({ kind: "mulligan", replace: true })}
            onCancel={() => dispatch({ kind: "cancelPending" })}
            onInspect={setInspected}
          />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <div className="board-bed space-y-3 rounded-2xl border-2 border-oath-gold/30 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={!targets.includes(foeGate)}
              onClick={() => attack(foeGate)}
              className="text-left disabled:cursor-default"
            >
              <Gate
                allegiance="hollow"
                label={`${foe.displayName} Gate`}
                ward={foe.gateWard}
                maxWard={foe.gateMaxWard}
                className={targets.includes(foeGate) ? "ring-2 ring-oath-cyan" : undefined}
              />
            </button>
            <button
              type="button"
              disabled={!targets.includes(foeCrystals)}
              onClick={() => attack(foeCrystals)}
              className="text-left disabled:cursor-default"
            >
              <CrystalSpinner
                allegiance="hollow"
                label={`${foe.displayName} Crystals`}
                remaining={foe.crystalSpinner}
                className={targets.includes(foeCrystals) ? "ring-2 ring-oath-cyan" : undefined}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {foe.unitSlots.map((instanceId, index) => (
              <div
                key={index}
                onClick={() => instanceId && targets.includes(instanceId) && attack(instanceId)}
              >
                <UnitSlot
                  index={index}
                  allegiance="hollow"
                  card={card(instanceId)}
                  damage={instanceId ? state.instances[instanceId].damage : 0}
                  exhausted={instanceId ? state.instances[instanceId].exhausted : false}
                  highlighted={Boolean(instanceId && targets.includes(instanceId))}
                  onInspect={setInspected}
                />
              </div>
            ))}
            <SupportSlot
              allegiance="hollow"
              label={`${foe.displayName} Support`}
              card={card(foe.supportSlot)}
              onInspect={setInspected}
            />
          </div>

          <div className="h-px bg-[image:var(--gradient-gilt)] opacity-50" aria-hidden />

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {active.unitSlots.map((instanceId, index) => (
              <div
                key={index}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const dragged = event.dataTransfer.getData("text/plain");
                  if (dragged) playFromHand(dragged, index);
                }}
                onClick={() => tapUnitSlot(index, instanceId)}
              >
                <UnitSlot
                  index={index}
                  allegiance="oathguard"
                  card={card(instanceId)}
                  damage={instanceId ? state.instances[instanceId].damage : 0}
                  exhausted={instanceId ? state.instances[instanceId].exhausted : false}
                  highlighted={
                    pendingHandId
                      ? instanceId === null
                      : Boolean(instanceId) && attackerId === instanceId
                  }
                  onInspect={setInspected}
                />
              </div>
            ))}
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const dragged = event.dataTransfer.getData("text/plain");
                if (dragged) playFromHand(dragged, null);
              }}
            >
              <SupportSlot
                allegiance="oathguard"
                label={`${active.displayName} Support`}
                card={card(active.supportSlot)}
                onInspect={setInspected}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Gate
              allegiance="oathguard"
              label={`${active.displayName} Gate`}
              ward={active.gateWard}
              maxWard={active.gateMaxWard}
            />
            <CrystalSpinner
              allegiance="oathguard"
              label={`${active.displayName} Crystals`}
              remaining={active.crystalSpinner}
            />
          </div>

          <div className="flex flex-wrap items-stretch gap-3">
            <DeckPile count={active.deck.length} allegiance="oathguard" />
            <DiscardPile
              cards={active.discard
                .map((id) => card(id))
                .filter((c): c is CardDefinition => c !== null)}
              onInspectTop={setInspected}
            />
            <EnergyTray
              permanent={active.energy.permanentCrystals}
              faceUp={active.energy.faceUpCrystals}
              temporary={active.energy.temporaryCrystals}
              max={active.energy.maxPermanentCrystals}
              className="min-w-64 flex-1"
            />
          </div>

          {nothingPlayable && (
            <NothingPlayableHint
              available={availableEnergy(active)}
              cheapestCost={Number.isFinite(cheapestCost) ? cheapestCost : 0}
              energyOnly={blockedByEnergyOnly}
            />
          )}
          <section
            aria-label={`${active.displayName} hand`}
            className="flex min-h-40 gap-2 overflow-x-auto rounded-xl border border-dashed border-oath-gold/35 p-2"
          >
            {active.controller === "ai" ? (
              <p className="m-auto text-sm text-muted-foreground">
                The computer's hand stays hidden, exactly like a human opponent's.
              </p>
            ) : (
              <>
                {active.hand.length === 0 && (
                  <p className="m-auto text-sm text-muted-foreground">Your hand is empty.</p>
                )}
                {active.hand.map((instanceId) => {
                  const definition = card(instanceId);
                  if (!definition) return null;
                  const legality = canPlayCard(state, instanceId);
                  return (
                    <HandCard
                      key={instanceId}
                      card={definition}
                      instanceId={instanceId}
                      legal={legality.legal}
                      reason={legality.legal ? null : legality.reason.message}
                      needsSpace={isUnitCard(definition)}
                      selected={pendingHandId === instanceId}
                      onInspect={setInspected}
                      onPlay={beginPlay}
                      onCancel={() => setPendingHandId(null)}
                    />
                  );
                })}
              </>
            )}
          </section>
        </div>

        <div className="space-y-3">
          <ActionLog entries={state.log.slice(-60)} />
        </div>
      </div>

      <CardInspectModal
        card={inspected}
        open={inspected !== null}
        onOpenChange={(open) => !open && setInspected(null)}
      />

      <Dialog open={confirmConcede} onOpenChange={setConfirmConcede}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Concede this duel?</DialogTitle>
            <DialogDescription>{foe.displayName} wins immediately.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              onClick={() => {
                dispatch({ kind: "surrender", seatId: activeId });
                setConfirmConcede(false);
              }}
            >
              Concede
            </Button>
            <Button variant="ghost" onClick={() => setConfirmConcede(false)}>
              Keep playing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RealmShell>
  );
}