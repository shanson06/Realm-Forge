/**
 * Card art registry. Maps a stable source card ID to CDN-hosted illustration art.
 * Cards with no entry fall back to the empty "Art pending" art window.
 *
 * IDs are the ones printed in the source databases, so the same illustration is
 * listed once per edition (cooperative `RF-OATH-*`, competitive `RF-TRIAL-*`).
 */
import artAegisLion from "@/assets/art-aegis-lion.png.asset.json";
import artAllBeaconsForward from "@/assets/art-all-beacons-forward.png.asset.json";
import artArchiveGuardian from "@/assets/art-archive-guardian.png.asset.json";
import artArenCrossFirstLightCaptain from "@/assets/art-aren-cross-first-light-captain.png.asset.json";
import artAshfieldStandard from "@/assets/art-ashfield-standard.png.asset.json";
import artAuroraLifters from "@/assets/art-aurora-lifters.png.asset.json";
import artBannerBearer from "@/assets/art-banner-bearer.png.asset.json";
import artBeaconInitiate from "@/assets/art-beacon-initiate.png.asset.json";
import artBeaconOfOpenSight from "@/assets/art-beacon-of-open-sight.png.asset.json";
import artBeaconRailCharger from "@/assets/art-beacon-rail-charger.png.asset.json";
import artBeaconWarder from "@/assets/art-beacon-warder.png.asset.json";
import artBlackglassDuelist from "@/assets/art-blackglass-duelist.png.asset.json";
import artBlackglassProwler from "@/assets/art-blackglass-prowler.png.asset.json";
import artBreakerSapper from "@/assets/art-breaker-sapper.png.asset.json";
import artBrightarmSmith from "@/assets/art-brightarm-smith.png.asset.json";
import artBrokenCrownBailiff from "@/assets/art-broken-crown-bailiff.png.asset.json";
import artBronzeRamConstruct from "@/assets/art-bronze-ram-construct.png.asset.json";
import artCaptainSGuard from "@/assets/art-captain-s-guard.png.asset.json";
import artCaptainSorenShieldOfTheOath from "@/assets/art-captain-soren-shield-of-the-oath.png.asset.json";
import artChamberOfMurmurs from "@/assets/art-chamber-of-murmurs.png.asset.json";
import artCinderQuill from "@/assets/art-cinder-quill.png.asset.json";
import artClearPathTactic from "@/assets/art-clear-path-tactic.png.asset.json";
import artCollapseTheArch from "@/assets/art-collapse-the-arch.png.asset.json";
import artCourtOfDoubledFaces from "@/assets/art-court-of-doubled-faces.png.asset.json";
import artCourtPage from "@/assets/art-court-page.png.asset.json";
import artCrackTheMortar from "@/assets/art-crack-the-mortar.png.asset.json";
import artCrownMauler from "@/assets/art-crown-mauler.png.asset.json";
import artDawnCourier from "@/assets/art-dawn-courier.png.asset.json";
import artDawnbackStag from "@/assets/art-dawnback-stag.png.asset.json";
import artDaybreakVerdict from "@/assets/art-daybreak-verdict.png.asset.json";
import artDimmingWord from "@/assets/art-dimming-word.png.asset.json";
import artDoubtWhisper from "@/assets/art-doubt-whisper.png.asset.json";
import artDoubtbinder from "@/assets/art-doubtbinder.png.asset.json";
import artFallingStone from "@/assets/art-falling-stone.png.asset.json";
import artFalseTrail from "@/assets/art-false-trail.png.asset.json";
import artFalsehoodFalls from "@/assets/art-falsehood-falls.png.asset.json";
import artFirstLightMedic from "@/assets/art-first-light-medic.png.asset.json";
import artFogMote from "@/assets/art-fog-mote.png.asset.json";
import artGatePup from "@/assets/art-gate-pup.png.asset.json";
import artGateRootColossus from "@/assets/art-gate-root-colossus.png.asset.json";
import artGatefallBeast from "@/assets/art-gatefall-beast.png.asset.json";
import artGliderScout from "@/assets/art-glider-scout.png.asset.json";
import artGoldwallDefender from "@/assets/art-goldwall-defender.png.asset.json";
import artGrayglassAdvocate from "@/assets/art-grayglass-advocate.png.asset.json";
import artHallOfShiftingDoors from "@/assets/art-hall-of-shifting-doors.png.asset.json";
import artHammerCadet from "@/assets/art-hammer-cadet.png.asset.json";
import artHiddenRoute from "@/assets/art-hidden-route.png.asset.json";
import artHologlassScribe from "@/assets/art-hologlass-scribe.png.asset.json";
import artHushwingShade from "@/assets/art-hushwing-shade.png.asset.json";
import artInterpose from "@/assets/art-interpose.png.asset.json";
import artLanternArray from "@/assets/art-lantern-array.png.asset.json";
import artLensSprite from "@/assets/art-lens-sprite.png.asset.json";
import artLuminantJudge from "@/assets/art-luminant-judge.png.asset.json";
import artMalrethSEnvoy from "@/assets/art-malreth-s-envoy.png.asset.json";
import artMarshalVerinLightOfDiscernment from "@/assets/art-marshal-verin-light-of-discernment.png.asset.json";
import artMasklingSneak from "@/assets/art-maskling-sneak.png.asset.json";
import artMirrorSkyGryphon from "@/assets/art-mirror-sky-gryphon.png.asset.json";
import artMirrormaskAgent from "@/assets/art-mirrormask-agent.png.asset.json";
import artMistStep from "@/assets/art-mist-step.png.asset.json";
import artMoonroadLurker from "@/assets/art-moonroad-lurker.png.asset.json";
import artMuteBellConstruct from "@/assets/art-mute-bell-construct.png.asset.json";
import artNhalMaskOfManyRoads from "@/assets/art-nhal-mask-of-many-roads.png.asset.json";
import artOathPage from "@/assets/art-oath-page.png.asset.json";
import artOathRenewed from "@/assets/art-oath-renewed.png.asset.json";
import artObsidianTortoise from "@/assets/art-obsidian-tortoise.png.asset.json";
import artOravaxKeeperOfDoubt from "@/assets/art-oravax-keeper-of-doubt.png.asset.json";
import artPackFormation from "@/assets/art-pack-formation.png.asset.json";
import artPatchTheWard from "@/assets/art-patch-the-ward.png.asset.json";
import artPrismArcher from "@/assets/art-prism-archer.png.asset.json";
import artQuickRally from "@/assets/art-quick-rally.png.asset.json";
import artRaceTheDarkness from "@/assets/art-race-the-darkness.png.asset.json";
import artRepairTheBreach from "@/assets/art-repair-the-breach.png.asset.json";
import artRubbleRunner from "@/assets/art-rubble-runner.png.asset.json";
import artSentenceOfSilence from "@/assets/art-sentence-of-silence.png.asset.json";
import artSharedMomentum from "@/assets/art-shared-momentum.png.asset.json";
import artShieldhandRecruit from "@/assets/art-shieldhand-recruit.png.asset.json";
import artSiegeLineBrute from "@/assets/art-siege-line-brute.png.asset.json";
import artSilverThreadTrickster from "@/assets/art-silver-thread-trickster.png.asset.json";
import artSkylineSkirmisher from "@/assets/art-skyline-skirmisher.png.asset.json";
import artSparkwingFinch from "@/assets/art-sparkwing-finch.png.asset.json";
import artSplinterBarrage from "@/assets/art-splinter-barrage.png.asset.json";
import artStandardOfCourage from "@/assets/art-standard-of-courage.png.asset.json";
import artStillTheRoom from "@/assets/art-still-the-room.png.asset.json";
import artStonejawGrub from "@/assets/art-stonejaw-grub.png.asset.json";
import artSunrunnerCadet from "@/assets/art-sunrunner-cadet.png.asset.json";
import artTheUnseenAdvance from "@/assets/art-the-unseen-advance.png.asset.json";
import artThroneOfSecondGuesses from "@/assets/art-throne-of-second-guesses.png.asset.json";
import artTowerLookout from "@/assets/art-tower-lookout.png.asset.json";
import artTwinBeaconSignal from "@/assets/art-twin-beacon-signal.png.asset.json";
import artUnmaskThePlot from "@/assets/art-unmask-the-plot.png.asset.json";
import artUnsteadyThought from "@/assets/art-unsteady-thought.png.asset.json";
import artVeilRunner from "@/assets/art-veil-runner.png.asset.json";
import artVeiledCourtRelic from "@/assets/art-veiled-court-relic.png.asset.json";
import artVerdictSeeker from "@/assets/art-verdict-seeker.png.asset.json";
import artVeyrSHerald from "@/assets/art-veyr-s-herald.png.asset.json";
import artVorakSBanner from "@/assets/art-vorak-s-banner.png.asset.json";
import artVorakSSiegeTitan from "@/assets/art-vorak-s-siege-titan.png.asset.json";
import artVowsteelSentinel from "@/assets/art-vowsteel-sentinel.png.asset.json";
import artWallOfLivingLight from "@/assets/art-wall-of-living-light.png.asset.json";
import artWarEngineIgniter from "@/assets/art-war-engine-igniter.png.asset.json";
import artWeightOfMaybe from "@/assets/art-weight-of-maybe.png.asset.json";
import artWingbannerCaptain from "@/assets/art-wingbanner-captain.png.asset.json";

import { quickPlayCardUniverse } from "./quickplay";
import type { CardDefinition } from "./schema";

export const ART_BY_CARD_ID: Readonly<Record<string, string>> = {
  "RF-HC-BRK-001": artRubbleRunner.url,
  "RF-HC-BRK-002": artStonejawGrub.url,
  "RF-HC-BRK-003": artHammerCadet.url,
  "RF-HC-BRK-004": artCrackTheMortar.url,
  "RF-HC-BRK-005": artSiegeLineBrute.url,
  "RF-HC-BRK-006": artFallingStone.url,
  "RF-HC-BRK-007": artBronzeRamConstruct.url,
  "RF-HC-BRK-008": artAshfieldStandard.url,
  "RF-HC-BRK-009": artBreakerSapper.url,
  "RF-HC-BRK-010": artCrownMauler.url,
  "RF-HC-BRK-011": artSplinterBarrage.url,
  "RF-HC-BRK-012": artObsidianTortoise.url,
  "RF-HC-BRK-013": artWarEngineIgniter.url,
  "RF-HC-BRK-014": artVorakSBanner.url,
  "RF-HC-BRK-015": artGatefallBeast.url,
  "RF-HC-BRK-016": artCollapseTheArch.url,
  "RF-HC-BRK-017": artVorakSSiegeTitan.url,
  "RF-HC-VEI-001": artMasklingSneak.url,
  "RF-HC-VEI-002": artFogMote.url,
  "RF-HC-VEI-003": artVeilRunner.url,
  "RF-HC-VEI-004": artFalseTrail.url,
  "RF-HC-VEI-005": artMirrormaskAgent.url,
  "RF-HC-VEI-006": artMistStep.url,
  "RF-HC-VEI-007": artBlackglassDuelist.url,
  "RF-HC-VEI-008": artVeiledCourtRelic.url,
  "RF-HC-VEI-009": artMoonroadLurker.url,
  "RF-HC-VEI-010": artSilverThreadTrickster.url,
  "RF-HC-VEI-011": artHiddenRoute.url,
  "RF-HC-VEI-012": artBlackglassProwler.url,
  "RF-HC-VEI-013": artCourtOfDoubledFaces.url,
  "RF-HC-VEI-014": artVeyrSHerald.url,
  "RF-HC-VEI-015": artHallOfShiftingDoors.url,
  "RF-HC-VEI-016": artTheUnseenAdvance.url,
  "RF-HC-VEI-017": artNhalMaskOfManyRoads.url,
  "RF-HC-WHI-001": artDoubtWhisper.url,
  "RF-HC-WHI-002": artCinderQuill.url,
  "RF-HC-WHI-003": artCourtPage.url,
  "RF-HC-WHI-004": artUnsteadyThought.url,
  "RF-HC-WHI-005": artGrayglassAdvocate.url,
  "RF-HC-WHI-006": artDimmingWord.url,
  "RF-HC-WHI-007": artBrokenCrownBailiff.url,
  "RF-HC-WHI-008": artChamberOfMurmurs.url,
  "RF-HC-WHI-009": artHushwingShade.url,
  "RF-HC-WHI-010": artDoubtbinder.url,
  "RF-HC-WHI-011": artWeightOfMaybe.url,
  "RF-HC-WHI-012": artMuteBellConstruct.url,
  "RF-HC-WHI-013": artThroneOfSecondGuesses.url,
  "RF-HC-WHI-014": artMalrethSEnvoy.url,
  "RF-HC-WHI-015": artStillTheRoom.url,
  "RF-HC-WHI-016": artSentenceOfSilence.url,
  "RF-HC-WHI-017": artOravaxKeeperOfDoubt.url,
  "RF-OATH-DAW-001": artSunrunnerCadet.url,
  "RF-OATH-DAW-002": artSparkwingFinch.url,
  "RF-OATH-DAW-003": artDawnCourier.url,
  "RF-OATH-DAW-004": artQuickRally.url,
  "RF-OATH-DAW-005": artGliderScout.url,
  "RF-OATH-DAW-006": artTwinBeaconSignal.url,
  "RF-OATH-DAW-007": artFirstLightMedic.url,
  "RF-OATH-DAW-008": artSkylineSkirmisher.url,
  "RF-OATH-DAW-009": artPackFormation.url,
  "RF-OATH-DAW-010": artDawnbackStag.url,
  "RF-OATH-DAW-011": artSharedMomentum.url,
  "RF-OATH-DAW-012": artBeaconRailCharger.url,
  "RF-OATH-DAW-013": artWingbannerCaptain.url,
  "RF-OATH-DAW-014": artAuroraLifters.url,
  "RF-OATH-DAW-015": artRaceTheDarkness.url,
  "RF-OATH-DAW-016": artAllBeaconsForward.url,
  "RF-OATH-DAW-017": artArenCrossFirstLightCaptain.url,
  "RF-OATH-HON-001": artOathPage.url,
  "RF-OATH-HON-002": artGatePup.url,
  "RF-OATH-HON-003": artBannerBearer.url,
  "RF-OATH-HON-004": artPatchTheWard.url,
  "RF-OATH-HON-005": artShieldhandRecruit.url,
  "RF-OATH-HON-006": artInterpose.url,
  "RF-OATH-HON-007": artGoldwallDefender.url,
  "RF-OATH-HON-008": artStandardOfCourage.url,
  "RF-OATH-HON-009": artBrightarmSmith.url,
  "RF-OATH-HON-010": artVowsteelSentinel.url,
  "RF-OATH-HON-011": artRepairTheBreach.url,
  "RF-OATH-HON-012": artAegisLion.url,
  "RF-OATH-HON-013": artGateRootColossus.url,
  "RF-OATH-HON-014": artCaptainSGuard.url,
  "RF-OATH-HON-015": artOathRenewed.url,
  "RF-OATH-HON-016": artWallOfLivingLight.url,
  "RF-OATH-HON-017": artCaptainSorenShieldOfTheOath.url,
  "RF-OATH-TRU-001": artBeaconInitiate.url,
  "RF-OATH-TRU-002": artLensSprite.url,
  "RF-OATH-TRU-003": artHologlassScribe.url,
  "RF-OATH-TRU-004": artClearPathTactic.url,
  "RF-OATH-TRU-005": artTowerLookout.url,
  "RF-OATH-TRU-006": artUnmaskThePlot.url,
  "RF-OATH-TRU-007": artPrismArcher.url,
  "RF-OATH-TRU-008": artBeaconWarder.url,
  "RF-OATH-TRU-009": artLanternArray.url,
  "RF-OATH-TRU-010": artVerdictSeeker.url,
  "RF-OATH-TRU-011": artFalsehoodFalls.url,
  "RF-OATH-TRU-012": artMirrorSkyGryphon.url,
  "RF-OATH-TRU-013": artArchiveGuardian.url,
  "RF-OATH-TRU-014": artBeaconOfOpenSight.url,
  "RF-OATH-TRU-015": artLuminantJudge.url,
  "RF-OATH-TRU-016": artDaybreakVerdict.url,
  "RF-OATH-TRU-017": artMarshalVerinLightOfDiscernment.url,
  "RF-TRIAL-DAW-001": artSunrunnerCadet.url,
  "RF-TRIAL-DAW-002": artSparkwingFinch.url,
  "RF-TRIAL-DAW-003": artDawnCourier.url,
  "RF-TRIAL-DAW-004": artQuickRally.url,
  "RF-TRIAL-DAW-005": artGliderScout.url,
  "RF-TRIAL-DAW-006": artTwinBeaconSignal.url,
  "RF-TRIAL-DAW-007": artFirstLightMedic.url,
  "RF-TRIAL-DAW-008": artSkylineSkirmisher.url,
  "RF-TRIAL-DAW-009": artPackFormation.url,
  "RF-TRIAL-DAW-010": artDawnbackStag.url,
  "RF-TRIAL-DAW-011": artSharedMomentum.url,
  "RF-TRIAL-DAW-012": artBeaconRailCharger.url,
  "RF-TRIAL-DAW-013": artWingbannerCaptain.url,
  "RF-TRIAL-DAW-014": artAuroraLifters.url,
  "RF-TRIAL-DAW-015": artRaceTheDarkness.url,
  "RF-TRIAL-DAW-016": artAllBeaconsForward.url,
  "RF-TRIAL-DAW-017": artArenCrossFirstLightCaptain.url,
  "RF-TRIAL-HON-001": artOathPage.url,
  "RF-TRIAL-HON-002": artGatePup.url,
  "RF-TRIAL-HON-003": artBannerBearer.url,
  "RF-TRIAL-HON-004": artPatchTheWard.url,
  "RF-TRIAL-HON-005": artShieldhandRecruit.url,
  "RF-TRIAL-HON-006": artInterpose.url,
  "RF-TRIAL-HON-007": artGoldwallDefender.url,
  "RF-TRIAL-HON-008": artStandardOfCourage.url,
  "RF-TRIAL-HON-009": artBrightarmSmith.url,
  "RF-TRIAL-HON-010": artVowsteelSentinel.url,
  "RF-TRIAL-HON-011": artRepairTheBreach.url,
  "RF-TRIAL-HON-012": artAegisLion.url,
  "RF-TRIAL-HON-013": artGateRootColossus.url,
  "RF-TRIAL-HON-014": artCaptainSGuard.url,
  "RF-TRIAL-HON-015": artOathRenewed.url,
  "RF-TRIAL-HON-016": artWallOfLivingLight.url,
  "RF-TRIAL-HON-017": artCaptainSorenShieldOfTheOath.url,
  "RF-TRIAL-TRU-001": artBeaconInitiate.url,
  "RF-TRIAL-TRU-002": artLensSprite.url,
  "RF-TRIAL-TRU-003": artHologlassScribe.url,
  "RF-TRIAL-TRU-004": artClearPathTactic.url,
  "RF-TRIAL-TRU-005": artTowerLookout.url,
  "RF-TRIAL-TRU-006": artUnmaskThePlot.url,
  "RF-TRIAL-TRU-007": artPrismArcher.url,
  "RF-TRIAL-TRU-008": artBeaconWarder.url,
  "RF-TRIAL-TRU-009": artLanternArray.url,
  "RF-TRIAL-TRU-010": artVerdictSeeker.url,
  "RF-TRIAL-TRU-011": artFalsehoodFalls.url,
  "RF-TRIAL-TRU-012": artMirrorSkyGryphon.url,
  "RF-TRIAL-TRU-013": artArchiveGuardian.url,
  "RF-TRIAL-TRU-014": artBeaconOfOpenSight.url,
  "RF-TRIAL-TRU-015": artLuminantJudge.url,
  "RF-TRIAL-TRU-016": artDaybreakVerdict.url,
  "RF-TRIAL-TRU-017": artMarshalVerinLightOfDiscernment.url,
};

/** Illustration for a card, resolved by stable ID. */
export function cardArtUrl(cardId: string): string | null {
  return ART_BY_CARD_ID[cardId] ?? null;
}

export function hasCardArt(cardId: string): boolean {
  return cardId in ART_BY_CARD_ID;
}

export interface ArtCoverageRow {
  readonly cardId: string;
  readonly name: string;
  readonly faction: string;
  readonly type: string;
  readonly hasArt: boolean;
}

export interface ArtCoverage {
  readonly rows: readonly ArtCoverageRow[];
  readonly imported: readonly ArtCoverageRow[];
  readonly pending: readonly ArtCoverageRow[];
  readonly total: number;
}

/** Art coverage across every card used by a QuickPlay deck, both editions. */
export function quickPlayArtCoverage(): ArtCoverage {
  const rows = quickPlayCardUniverse()
    .map((card: CardDefinition) => ({
      cardId: card.id,
      name: card.name,
      faction: card.faction,
      type: card.type,
      hasArt: hasCardArt(card.id),
    }))
    .sort((a, b) => a.cardId.localeCompare(b.cardId));

  return {
    rows,
    imported: rows.filter((r) => r.hasArt),
    pending: rows.filter((r) => !r.hasArt),
    total: rows.length,
  };
}