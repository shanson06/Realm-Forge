import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { ActionLog } from "@/components/game/ActionLog";
import { CardInspectModal } from "@/components/game/CardInspectModal";
import { CrystalSpinner } from "@/components/game/CrystalSpinner";
import { DeckPile } from "@/components/game/DeckPile";
import { DiscardPile } from "@/components/game/DiscardPile";
import { EnergyTray } from "@/components/game/EnergyCrystal";
import { Gate } from "@/components/game/Gate";
import { MatchPrompt } from "@/components/game/MatchPrompt";
import { MatchFxLayer } from "@/components/game/MatchFxLayer";
import { HandCard } from "@/components/game/HandCard";
import { MatchNotice } from "@/components/game/MatchNotice";
import { NothingPlayableHint } from "@/components/game/NothingPlayableHint";
import { RealmShell } from "@/components/game/RealmShell";
import { SupportSlot } from "@/components/game/SupportSlot";
import { UnitSlot } from "@/components/game/UnitSlot";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCard, requireCard } from "@/game-data/load";
import type { CardDefinition } from "@/game-data/schema";
import { configOf, useMatch } from "@/hooks/use-match";
import { useRecordOutcome } from "@/hooks/use-record-outcome";
import { useCuePlayer, useLogCues } from "@/hooks/use-audio";
import { canAttack, canPlayCard, legalAttackTargets } from "@/game-engine/legal";
import { isUnitCard, tryDefinition } from "@/game-engine/queries";
import {
  HOLLOW,
  OATHGUARD,
  TARGET_BOSS,
  TARGET_HOLLOW_CRYSTALS,
  TARGET_HOLLOW_GATE,
  type MatchState,
} from "@/game-engine/types";

export const Route = createFileRoute("/match")({
  head: () => ({
    meta: [
      { title: "Cooperative Match — Realmforge" },
      {
        name: "description",
        content:
          "Play the Truthwardens against the Veilborn encounter deck and Veyr, the Hidden Lie, in Realmforge QuickPlay.",
      },
      { property: "og:title", content: "Cooperative Match — Realmforge" },
      {
        property: "og:description",
        content: "Truthwardens versus the Hollow Crown in a full Realmforge QuickPlay match.",
      },
    ],
  }),
  component: MatchScreen,
  pendingComponent: () => (
    <p className="p-6 text-sm text-muted-foreground">Preparing the battlefield…</p>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="space-y-3 p-6">
      <h1 className="font-display text-lg">The match could not be started</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button asChild variant="outline">
        <Link to="/menu">Back to the main menu</Link>
      </Button>
    </div>
  ),
});

const STEP_LABEL: Record<MatchState["step"], string> = {
  setup: "Setup",
  readyAndCharge: "Ready and Charge",
  play: "Play",
  battle: "Battle",
  pass: "Pass",
  hollowCrown: "Hollow Crown",
};

function MatchScreen() {
  const { state, loading, notice, dispatch, startNewMatch, loadFromJson, dismissNotice } =
    useMatch();
  const [inspected, setInspected] = useState<CardDefinition | null>(null);
  const [attackerId, setAttackerId] = useState<string | null>(null);
  const [pendingHandId, setPendingHandId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [confirmConcede, setConfirmConcede] = useState(false);
  const [seedInput, setSeedInput] = useState("");
  const playCue = useCuePlayer();

  // Impact flashes are driven by resolved values, never by animation timing.
  const previousWard = useRef<number | null>(null);
  const previousCrystals = useRef<number | null>(null);
  const [gateImpact, setGateImpact] = useState(false);
  const [crystalImpact, setCrystalImpact] = useState(false);

  const oathWard = state?.players[OATHGUARD].gateWard ?? null;
  const oathCrystals = state?.players[OATHGUARD].crystalSpinner ?? null;

  useEffect(() => {
    if (oathWard === null) return;
    if (previousWard.current !== null && oathWard < previousWard.current) {
      setGateImpact(true);
      window.setTimeout(() => setGateImpact(false), 400);
    }
    previousWard.current = oathWard;
  }, [oathWard]);

  useEffect(() => {
    if (oathCrystals === null) return;
    if (previousCrystals.current !== null && oathCrystals < previousCrystals.current) {
      setCrystalImpact(true);
      window.setTimeout(() => setCrystalImpact(false), 400);
    }
    previousCrystals.current = oathCrystals;
  }, [oathCrystals]);

  useLogCues(state?.log ?? []);

  useEffect(() => {
    if (!state?.result) return;
    playCue(state.result.outcome === "oathguard-victory" ? "victory" : "defeat");
  }, [state?.result, playCue]);

  const card = (instanceId: string | null | undefined): CardDefinition | null => {
    if (!state || !instanceId) return null;
    return getCard(state.mode, state.board.instances[instanceId]?.definitionId ?? "") ?? null;
  };

  const targets = useMemo(
    () => (state && attackerId ? legalAttackTargets(state, attackerId) : []),
    [state, attackerId],
  );

  // Local statistics only. Recorded once per match id; never alters match state.
  const outcome = useMemo(
    () =>
      state?.result
        ? {
            mode: "cooperative" as const,
            won: state.result.outcome === "oathguard-victory",
            order: state.seats?.[0]?.faction,
            bossId: state.bossId ?? null,
          }
        : null,
    [state],
  );
  useRecordOutcome(state?.matchId ?? null, outcome);

  if (loading || !state) {
    return (
      <RealmShell
        wide
        bed={null}
        eyebrow="Battlefield"
        title="Match"
        description="Restoring your match…"
      >
        <p className="text-sm text-muted-foreground">Loading saved match state…</p>
      </RealmShell>
    );
  }

  const oath = state.players[OATHGUARD];
  const handLegality = oath.hand.map((instanceId) => ({
    instanceId,
    legality: canPlayCard(state, instanceId),
    cost: tryDefinition(state, instanceId)?.cost ?? Number.POSITIVE_INFINITY,
  }));
  const nothingPlayable =
    oath.hand.length > 0 &&
    state.step === "play" &&
    state.turnSide === OATHGUARD &&
    !state.result &&
    handLegality.every((entry) => !entry.legality.legal);
  const blockedByEnergyOnly =
    nothingPlayable &&
    handLegality.every(
      (entry) => !entry.legality.legal && entry.legality.reason.code === "not-enough-energy",
    );
  const cheapestCost = Math.min(...handLegality.map((entry) => entry.cost));
  const hollow = state.players[HOLLOW];
  const boss = state.board.boss;
  const bossCard = boss ? requireCard(state.mode, boss.definitionId) : null;
  const yourTurn = state.turnSide === OATHGUARD && !state.result;

  const selectAttacker = (instanceId: string) => {
    const legality = canAttack(state, instanceId);
    if (!legality.legal) {
      dispatch({ kind: "declareAttack", attackerId: instanceId, targetId: "" });
      return;
    }
    setAttackerId((current) => (current === instanceId ? null : instanceId));
  };

  const attack = (targetId: string) => {
    if (!attackerId) return;
    dispatch({ kind: "declareAttack", attackerId, targetId });
    setAttackerId(null);
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

  const tapUnitSlot = (index: number, instanceId: string | null) => {
    if (pendingHandId) {
      playFromHand(pendingHandId, index);
      return;
    }
    if (instanceId) selectAttacker(instanceId);
  };

  const restart = () => {
    startNewMatch({ ...configOf(state), seed: seedInput.trim() || undefined });
    setAttackerId(null);
    setConfirmRestart(false);
    setPaused(false);
  };

  return (
    <RealmShell
      wide
      bed={boss?.revealed ? "battleBoss" : "battleOathguard"}
      eyebrow="Cooperative QuickPlay"
      title="Truthwardens vs the Hollow Crown"
      description={`Round ${state.round} · ${STEP_LABEL[state.step]} · ${oath.cardsPlayedThisTurn}/${oath.cardPlayLimit} cards played`}
      actions={
        <div className="flex flex-wrap gap-2">
          {state.step === "play" && yourTurn && (
            <Button
              variant="secondary"
              onClick={() => dispatch({ kind: "beginStep", step: "battle" })}
            >
              Go to Battle
            </Button>
          )}
          {yourTurn && !state.prompt && (
            <Button onClick={() => dispatch({ kind: "endTurn" })}>End turn</Button>
          )}
          <Button variant="outline" onClick={() => setPaused(true)}>
            Pause
          </Button>
        </div>
      }
    >
      <MatchFxLayer animations={state.animations} />

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

      {state.result && (
        <Alert className="realm-rise mb-4 border-oath-cyan/70 forge-glow" role="alert">
          <AlertTitle className="font-display">
            {state.result.outcome === "oathguard-victory" ? "Victory" : "Defeat"}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{state.result.reason}</p>
            <Button size="sm" onClick={() => setConfirmRestart(true)}>
              New match
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {state.prompt && (
        <div className="mb-4">
          <MatchPrompt
            prompt={state.prompt}
            state={state}
            onChoose={(effectId, targetIds) =>
              dispatch({ kind: "chooseTarget", effectId, targetIds })
            }
            onKeepHand={() => dispatch({ kind: "mulligan", replace: false })}
            onReplaceHand={() => dispatch({ kind: "mulligan", replace: true })}
            onCancel={() => dispatch({ kind: "cancelPending" })}
          />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <div className="board-bed space-y-3 rounded-2xl border-2 border-oath-gold/30 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={!targets.includes(TARGET_HOLLOW_GATE)}
              onClick={() => attack(TARGET_HOLLOW_GATE)}
              className="text-left disabled:cursor-default"
            >
              <Gate
                allegiance="hollow"
                label="Hollow Crown Gate"
                ward={hollow.gateWard}
                maxWard={hollow.gateMaxWard}
                className={
                  targets.includes(TARGET_HOLLOW_GATE) ? "ring-2 ring-oath-cyan" : undefined
                }
              />
            </button>
            <button
              type="button"
              disabled={!targets.includes(TARGET_HOLLOW_CRYSTALS)}
              onClick={() => attack(TARGET_HOLLOW_CRYSTALS)}
              className="text-left disabled:cursor-default"
            >
              <CrystalSpinner
                allegiance="hollow"
                label="Hollow Crown Crystals"
                remaining={hollow.crystalSpinner}
                className={
                  targets.includes(TARGET_HOLLOW_CRYSTALS) ? "ring-2 ring-oath-cyan" : undefined
                }
              />
            </button>
          </div>

          {boss?.revealed && bossCard && (
            <button
              type="button"
              disabled={!targets.includes(TARGET_BOSS)}
              onClick={() => attack(TARGET_BOSS)}
              className="w-full rounded-xl border border-hollow-violet/60 bg-hollow-blackglass/70 px-4 py-3 text-left disabled:cursor-default"
            >
              <p className="font-display text-sm tracking-widest uppercase">Quick Boss</p>
              <p className="text-lg">{bossCard.name}</p>
              <p className="font-mono text-sm">
                Health {Math.max(boss.health - boss.damage, 0)}/{boss.health}
                {boss.enraged ? " · Enraged" : ""}
              </p>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {hollow.unitSlots.map((instanceId, index) => (
              <div
                key={index}
                onClick={() => instanceId && targets.includes(instanceId) && attack(instanceId)}
              >
                <UnitSlot
                  index={index}
                  allegiance="hollow"
                  card={card(instanceId)}
                  damage={instanceId ? state.board.instances[instanceId].damage : 0}
                  exhausted={instanceId ? state.board.instances[instanceId].exhausted : false}
                  highlighted={Boolean(instanceId && targets.includes(instanceId))}
                  onInspect={setInspected}
                />
              </div>
            ))}
            <SupportSlot
              allegiance="hollow"
              label="Hollow Support"
              card={card(hollow.supportSlot)}
              onInspect={setInspected}
            />
          </div>

          <div className="h-px bg-[image:var(--gradient-gilt)] opacity-50" aria-hidden />

          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {oath.unitSlots.map((instanceId, index) => (
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
                  damage={instanceId ? state.board.instances[instanceId].damage : 0}
                  exhausted={instanceId ? state.board.instances[instanceId].exhausted : false}
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
                label="Oathguard Support"
                card={card(oath.supportSlot)}
                onInspect={setInspected}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Gate
              allegiance="oathguard"
              label="Oathguard Gate"
              ward={oath.gateWard}
              maxWard={oath.gateMaxWard}
              impact={gateImpact}
            />
            <CrystalSpinner
              allegiance="oathguard"
              label="Oathguard Crystals"
              remaining={oath.crystalSpinner}
              impact={crystalImpact}
            />
          </div>

          <div className="flex flex-wrap items-stretch gap-3">
            <DeckPile count={oath.deck.length} allegiance="oathguard" />
            <DiscardPile
              cards={oath.discard
                .map((id) => card(id))
                .filter((c): c is CardDefinition => c !== null)}
              onInspectTop={setInspected}
            />
            <EnergyTray
              permanent={oath.energy.permanentCrystals}
              faceUp={oath.energy.faceUpCrystals}
              temporary={oath.energy.temporaryCrystals}
              max={oath.energy.maxPermanentCrystals}
              className="min-w-64 flex-1"
            />
          </div>

          {nothingPlayable && (
            <NothingPlayableHint
              available={oath.energy.faceUpCrystals + oath.energy.temporaryCrystals}
              cheapestCost={Number.isFinite(cheapestCost) ? cheapestCost : 0}
              energyOnly={blockedByEnergyOnly}
            />
          )}
          <section
            aria-label="Your hand"
            className="flex min-h-40 gap-2 overflow-x-auto rounded-xl border border-dashed border-oath-gold/35 p-2"
          >
            {oath.hand.length === 0 && (
              <p className="m-auto text-sm text-muted-foreground">Your hand is empty.</p>
            )}
            {oath.hand.map((instanceId) => {
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
          </section>
        </div>

        <div className="space-y-3">
          <ActionLog entries={state.log.slice(-60)} />
          {import.meta.env.DEV && (
            <section
              aria-label="Development diagnostics"
              className="space-y-2 rounded-lg border border-border/70 bg-card/60 p-3 text-xs"
            >
              <h2 className="font-display text-xs tracking-widest uppercase">Diagnostics (dev)</h2>
              <p className="font-mono break-all text-muted-foreground">
                seed {state.rngSeed} · cursor {state.rngCursor}
              </p>
              <input
                value={seedInput}
                onChange={(event) => setSeedInput(event.target.value)}
                placeholder="Seed for a new match"
                className="w-full rounded border border-border/70 bg-background px-2 py-1"
                aria-label="Seed for a new match"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={restart}>
                  Seeded restart
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void navigator.clipboard?.writeText(JSON.stringify(state))}
                >
                  Export state
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard?.readText().then((text) => loadFromJson(text))
                  }
                >
                  Import state
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard?.writeText(
                      state.log.map((entry) => `R${entry.round} ${entry.summary}`).join("\n"),
                    )
                  }
                >
                  Copy action log
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <CardInspectModal
        card={inspected}
        open={inspected !== null}
        onOpenChange={(open) => !open && setInspected(null)}
      />

      <Dialog open={paused} onOpenChange={setPaused}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Paused</DialogTitle>
            <DialogDescription>
              The match is saved on this device. Nothing is lost while paused.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-wrap gap-2 sm:justify-start">
            <Button onClick={() => setPaused(false)}>Resume</Button>
            <Button variant="outline" onClick={() => setConfirmRestart(true)}>
              Restart match
            </Button>
            <Button variant="outline" onClick={() => setConfirmConcede(true)}>
              Concede
            </Button>
            <Button asChild variant="ghost">
              <Link to="/settings">Settings</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/menu">Leave match</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Start a new match?</DialogTitle>
            <DialogDescription>
              The current match is discarded. Your settings are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={restart}>Start new match</Button>
            <Button variant="ghost" onClick={() => setConfirmRestart(false)}>
              Keep playing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmConcede} onOpenChange={setConfirmConcede}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Concede this match?</DialogTitle>
            <DialogDescription>The Hollow Crown wins immediately.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              onClick={() => {
                dispatch({ kind: "surrender", playerId: OATHGUARD });
                setConfirmConcede(false);
                setPaused(false);
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
