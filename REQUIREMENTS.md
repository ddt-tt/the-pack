# who ate the tab? — Requirements

> A Chindōgu ("useless tech") desktop companion: **5 dogs live on your
> screen and eat your real browser tabs and real running apps.** When two dogs go for
> the same thing, they fight. Descended from two references:
> `dog-window-eater.html` (visual dog-eats-window toy) and `tab-roulette` (Chrome
> extension that really closes tabs).
>
> **Title:** "who ate the tab?" (the answer, of course, is *No one*). Launch screen reads
> **"I don't want to work"** with a single **Yes** button; saying Yes starts the eating.

---

## 1. Vision & scope

A **macOS Electron desktop app**. Five named dogs roam a transparent/overlay "desktop"
and consume two kinds of real targets:

- **Browser tabs** — real open tabs in Chrome / Safari (closed via AppleScript).
- **Computer apps** — real running applications / processes (quit or killed).

Dogs act **autonomously** (roam + grab the nearest target) but the user can also **throw
a specific target at a specific dog** (the "Mix" targeting model). When two dogs target
the same thing, a **3-second fight** decides a random winner; the loser reacts in-character.

Confirmed decisions (from kickoff):
- **Reality:** Really eat both — real tabs AND **real executables / running apps**.
  *(highest impact + highest risk)*
- **Targeting:** Mix — autonomous roaming + user can assign a target to a dog.
- **Fight:** Cosmetic, random winner, intense 3-second animation, per-dog loser personality.
- **Safe Mode:** ON by default while testing (real kills gated); "Chaos Mode" opt-in.
- **Sprites:** Real per-breed sprites (see §2). Delivered as hand-authored **SVG** sprites
  (scalable, animatable per body-part, self-contained — no image-gen dependency).
- **Name:** "The Pack" (placeholder, will change).

Out of scope (v1): eating **files/documents** (only browser tabs + executables/apps),
Windows/Linux support, multi-monitor awareness, persisting a "score" across sessions,
networked/multiplayer dogs.

---

## 2. The five dogs

Each dog has an emoji/sprite, a name, and a **loser personality** — a scripted reaction
that plays when it loses a fight.

| Dog | Breed | Pronouns | Personality when it **loses** a fight |
|-----|-------|----------|----------------------------------------|
| **Pita** | Yorkshire Terrier | she/her | Sits and **cries while playing a sad piano** (piano sound + tears). |
| **No one** | Corgi | he/him | **Cries, then charges back** to re-fight the same dog. (was "Fanta") |
| **Lupita** | Border Collie | she/her | **Trains** (dumbbell + sweat), then returns to **take revenge** on the same dog. |
| **Oreo** | Dalmatian | she/her | Sits and **eats an Oreo while crying**. |
| **Anything** | Cocker Spaniel | they/them | Fights — but **gives up easily** if it loses (walks away, no drama). |

**Loser-reaction flow (all dogs):** the loser **walks to the nearest corner** and plays its
reaction there for **10 seconds**, with its reaction icon shown **large, floating above the
dog**. Revenge reactions (No one, Lupita) charge back after the 10s.

**Fight-mode animation:** **Lupita** transforms **Super Saiyan** during any fight — a **golden
aura** flares and her hair goes gold for the duration (power-up SFX).

**Other behaviours:** every dog **barks** (one shared woof) while chewing; each dog shows a
**running eaten-count** below its sprite; **tabs are flimsier than executables** (shorter,
faster-draining health bar); a **rare sky-blue dolphin** drifts across doing nothing, sometimes
pausing to look at a dog; opening more tabs/apps feeds the pack; **🦴 Treats** (unlimited)
distract a dog.

Winner reaction is shared/simple (happy chomp + eats the target). Personalities are the
signature feature; they must be visibly distinct.

---

## 3. Functional requirements

### FR-1 — Target discovery
- FR-1.1 List real **browser tabs** (Chrome and Safari) with title + an identifier
  (window index + tab index). Refresh periodically (e.g. every 2–3s).
- FR-1.2 List real **running apps** (visible/user apps, not system daemons) with name + PID.
- FR-1.3 Represent each discovered target on-screen as a chewable object (reusing the
  window/HP metaphor from `dog-window-eater.html`).

### FR-2 — Eating (the real action)
- FR-2.1 Eating a **tab** closes that specific real tab (AppleScript
  `close tab N of window M`).
- FR-2.2 Eating an **app** quits/kills that real app (`osascript ... to quit`, fallback
  `kill PID`).
- FR-2.3 A target has "structural integrity" (HP). It's only really closed when HP hits 0,
  giving the user time to react — matching the reference toy's feel.
- FR-2.4 On successful eat: play chomp animation, remove the on-screen object, remove the
  real target.

### FR-3 — Autonomous behavior
- FR-3.1 Each dog independently roams and locks onto the nearest available target.
- FR-3.2 Hunger/appetite drives how aggressively a dog seeks food (port the hunger ramp
  from the reference).
- FR-3.3 No two dogs may *finish* eating the same target — contention triggers a fight (FR-5).

### FR-4 — User control (Mix model)
- FR-4.1 User can pick a target and **assign/throw it to a specific dog**; that dog
  prioritizes it.
- FR-4.2 User can pause / "call off the pack" (global stop).
- FR-4.3 A **treat** mechanic (optional, from reference) to distract a dog off a target.

### FR-5 — Fights
- FR-5.1 Trigger when ≥2 dogs lock the same target at (roughly) the same time.
- FR-5.2 Play an **intense fight animation lasting exactly ~3 seconds** (dust cloud, stars,
  shake, SFX).
- FR-5.3 Winner chosen **randomly** (v1; "strength" is a future hook).
- FR-5.4 Winner eats the contested target; **loser plays its personality reaction** (§2).
- FR-5.5 During the fight the target is neither eaten nor lost (it waits for resolution).

### FR-6 — Safety (required, because it's real)
- FR-6.1 **Safe Mode toggle** (default ON): dogs only eat targets from an **allowlist**
  and/or require a confirmation before the first real kill. "Chaos Mode" turns this off.
- FR-6.2 **Never-eat list**: protected apps (e.g. the app itself, Finder, the terminal
  running it) can never be targeted.
- FR-6.3 Optional confirmation dialog before killing an app (apps lose unsaved work more
  readily than tabs).
- FR-6.4 Clear on-screen indication of which mode is active.

---

## 4. Non-functional requirements

- **NFR-1 Platform:** macOS (darwin). Electron.
- **NFR-2 Performance:** 5 dogs + target objects animate at ~60fps; target polling must
  not jank the UI (run in main process / off the render loop).
- **NFR-3 Permissions:** Requires macOS **Automation/Accessibility** permission for
  AppleScript control of browsers and apps. App must detect missing permission and guide
  the user.
- **NFR-4 Resilience:** A failed kill (permission denied, app already gone) must not crash
  the app — the dog just "spits it out."
- **NFR-5 Reduced motion:** honor `prefers-reduced-motion` (shorten/skip animations), as
  the reference does.
- **NFR-6 Reversibility:** eating an app is destructive and NOT undoable — this is why
  Safe Mode exists. Document it plainly.

---

## 5. Proposed architecture (for the design phase)

```
Electron app
├── Main process (Node)
│   ├── target-scanner   → AppleScript/ps polling: tabs + apps
│   ├── executor         → close tab / quit app (the "real eat")
│   └── safety           → allowlist, never-eat list, mode gate
└── Renderer (the visual desktop — evolved from dog-window-eater.html)
    ├── 5 dog agents (state machines: roam/hunt/chew/fight/personality)
    ├── target objects (HP, bite holes, crumbs)
    ├── fight director (3s sequence + winner/loser routing)
    └── HUD (mode toggle, pause, treat, per-dog status)
```

- **Why Electron + AppleScript:** a plain web page is sandboxed and cannot close real tabs
  or kill real apps. On macOS, AppleScript (`osascript`) can close *individual* browser
  tabs and quit apps without needing a Chrome extension — so the whole thing is one desktop
  app, no separate browser install. `tab-roulette`'s idea (real tab closing) is preserved;
  `dog-window-eater`'s visuals/animation loop are the renderer foundation.

---

## 6. Open questions (please confirm)

1. **Browsers:** Chrome + Safari enough, or also Arc / Edge / Firefox? (Firefox has no
   AppleScript tab control — would be "kill whole app" only.)
2. **Sprites:** emoji (🐕, fast, like the reference) or custom art per dog? Emoji is the
   fast hackathon path.
3. **Sound:** OK to include audio (Pita's piano, fight SFX)? Any autoplay concern for the
   demo?
4. **Safe Mode default:** ship with Safe Mode ON (safer demo) and a big "unleash Chaos
   Mode" button — agreed?
5. **App name:** keep "The Pack" or you have a name in mind?

---

## 7. Suggested build milestones (post-signoff)

1. Electron shell + renderer port of `dog-window-eater` with **fake** targets and all 5
   dogs roaming.
2. Fight system + 5 personality reactions (still fake targets) — the demo centerpiece.
3. Real target scanner (list real tabs + apps) shown as on-screen objects.
4. Real executor (close tab / quit app) behind Safe Mode.
5. Polish: HUD, treats, sound, permissions onboarding.
