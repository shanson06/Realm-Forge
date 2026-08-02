# Known Issues

Plain-language list of decisions and checks that remain outside the verified source build.

## Owner decision before public release

**CONF-001 — QuickPlay deck lists are curated cuts.**
The uploaded sources describe 30-card standard decks. QuickPlay needs 20 cards
(ten titles, two copies each), so each deck is a ten-title cut selected from the
approved source cards. No card name, stat, keyword, or rules text was changed.
The project owner should approve these final cuts before announcing the lists as canonical.

## Deployment smoke test

**Installed offline reload on a real device.**
The production build now generates `sw.js` in the served `.output/public` directory
and precaches the full client shell (74+ generated assets instead of zero). Build-level
PWA verification passes. A final installed-device test should still confirm: first online
launch, installation, one controlled match, app close, network disabled, and offline reload.

## Minor

**Art pending on 21 non-card records.**
Gates, bosses, and a few reference records still show original placeholder frames. All 153
playable QuickPlay cards have final art.

**"Lantern Array" resolves once, on arrival.**
QuickPlay has no step for using an ability later in the turn, so this card applies
its effect the moment it enters play instead of repeatedly.

**Undo is intentionally limited.**
Undo is offered only where it cannot reveal hidden information. After a draw, a
reveal, or a handoff, the action stands.

**Progress is local to the device.**
Cloud accounts are not enabled. Progress, settings, and saved matches live on the device
being used. Use Settings > Data Management to export a backup before clearing browser data.
