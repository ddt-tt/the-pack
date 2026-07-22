# who ate the tab? 🐕🐕🐕🐕🐕

Five dogs live on your macOS desktop and eat your **real browser tabs** and
**real running apps**. When two dogs go for the same thing, they **fight** — the
loser slinks off to a corner and reacts in character for 10 seconds. A Chindōgu
("useless tech") desktop companion. (Who ate the tab? *No one*.)

Built as the merge of two references: the dog-eats-windows visual toy
(`dog-window-eater.html`) and the really-closes-tabs Chrome extension
(`tab-roulette`). See [`../REQUIREMENTS.md`](../REQUIREMENTS.md) for the full spec.

## The pack

| Dog | Breed | Pronouns | On losing a fight |
|-----|-------|----------|-------------------|
| **Pita** | Yorkshire Terrier | she/her | cries and plays a sad piano 🎹 |
| **No one** | Corgi | he/him | cries, then charges back to re-fight 😾 |
| **Lupita** | Border Collie | she/her | trains, comes back for revenge 💪 — and goes **Super Saiyan** ⚡ during every fight |
| **Oreo** | Dalmatian | she/her | stress-eats an Oreo while crying 🍪 |
| **Anything** | Cocker Spaniel | they/them | fights hard, but gives up easily 🤷 |

Every dog barks while chewing and tracks how many things it's eaten (shown below
it). A **scoreboard** (top-right) ranks the top 3 by eats + fight wins, and the
current #1 wears a **👑 crown**. **Tabs are flimsier than apps** (shorter health
bar). And once in a while a **sky-blue dolphin** drifts across, pausing to look at
a dog — or pulling off a circus backflip.

## Run it

```bash
npm install
npm run fix-electron   # one-time: makes Electron runnable on Apple Silicon (see notes)
npm start
```

The launch screen says **“I don't want to work”** — click **Yes** and the pack
starts eating. Dogs roam and hunt on their own.

- **Click a dog's roster card** to bench it (take it off the field) or field it again.
- **Click a tab/app** to sic the nearest free dog on it.
- **🦴 Treat** (or Space) throws a bone that distracts the nearest dog.
- **🌐 Tabs only** (the default) makes the pack ignore executables and eat only tabs.
- **Call off** pauses the pack; the **mode pill** flips Safe ↔ Chaos.

New tabs you open are picked up within ~1.5s and jump to the front of the queue.
In **Chaos Mode**, whichever tab is currently being eaten is brought to the front in
the browser so you can watch it vanish. A sky-blue **dolphin** (2× size) drifts across —
rare normally, more frequent in Safe Mode — and sometimes does a circus backflip.

## Troubleshooting / logs

The main process writes a log to **`the-pack/pack.log`**. Tail it while playing:

```bash
tail -f the-pack/pack.log
```

Every real eat is logged — `EAT real → …`, `EAT ok`, or `EAT FAILED … stderr=…`.

**If tabs don't close in Chaos Mode:** the fix is already in — tabs are closed by their
**stable Chrome tab id**, not their position. (Closing by position hits AppleScript error
`-1719 "Invalid index"` because indices shift as tabs close. Also note Chrome tab ids must
be compared *as text* in AppleScript, not as a numeric literal.) If you still see failures,
check `pack.log` for the `stderr=` line and confirm **Automation** permission is granted.

## Safe Mode vs. Chaos Mode

- **Safe Mode (default):** dogs eat the on-screen windows, but **nothing real is
  closed.** Great for testing and demoing.
- **Chaos Mode:** dogs **really close your browser tabs and quit your running
  apps.** Toggle it in the HUD; it asks for confirmation first. Protected apps
  (Finder, this app, your terminal/editor) can **never** be eaten, in any mode.

Eating an app is not undoable — Safe Mode exists for exactly this reason.

## macOS permissions

The first time a dog eats something, macOS asks to allow **Automation** for
controlling browsers / listing apps. Grant it in
**System Settings → Privacy & Security → Automation**. Until then, tabs may
appear but running apps won't (that's the permission, not a bug).

## Notes on `fix-electron`

Two macOS gotchas we hit, both handled by `npm run fix-electron`:

1. **Apple revoked this Electron build's notarization**, so Gatekeeper pops up
   *“Electron will damage your computer”* and the kernel `SIGKILL`s it. We fix it
   by applying a **local ad-hoc code signature** (`codesign --force --deep -s -`),
   which detaches it from the revoked ticket and satisfies Apple Silicon's
   mandatory-signing rule.
2. The `npm` download sometimes extracts incompletely; the script re-extracts
   from the Electron cache with `ditto` (which preserves the bundle) if needed.

Also: if you launch from a shell where `ELECTRON_RUN_AS_NODE=1` is set, Electron
runs headless as plain Node (no window). The `npm start` script strips that
variable for you (`env -u ELECTRON_RUN_AS_NODE`).

## Layout

```
main.js            Electron main process + IPC bridge
preload.js         contextBridge — the only OS surface the game gets
src/scanner.js     lists real tabs (AppleScript) + apps (System Events)
src/executor.js    the real "eat": close tab / quit app
src/safety.js      Safe/Chaos mode + the never-eat protected list
renderer/
  index.html       arena, HUD, intro + chaos overlays
  styles.css       arena, dogs, targets, fights, personality FX
  sprites.js       the five breeds as hand-authored SVG
  dogs.js          Dog: DOM, movement, speech/tears/props primitives
  fight.js         the 3-second brawl + Super Saiyan
  game.js          scan/reconcile, AI state machine, fights, personalities, HUD
scripts/fix-electron.sh
```
