'use strict';
/* The Pack — game orchestration.
 * Scans the real desktop for tabs/apps, renders them as chewable windows,
 * runs five autonomous dogs that hunt + contest + fight over them, routes
 * losers to their personality reactions, and gates every real "eat" through
 * the Safe/Chaos mode in the main process. */

const arena = document.getElementById('arena');
const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ───────── layout for target windows (avoids the left roster) ───────── */
const TW = 220, TH = 132, GX = 26, GY = 30, TOP = 100, START_X = 214;
let cols = 1, rows = 1, maxSlots = 1;
const occupied = new Set();
function computeGrid() {
  const avail = innerWidth - START_X - 20;
  cols = Math.max(1, Math.floor(avail / (TW + GX)));
  rows = Math.max(1, Math.floor((innerHeight - TOP - 16) / (TH + GY)));
  maxSlots = cols * rows;
}
function slotXY(i) {
  const c = i % cols, r = Math.floor(i / cols);
  return { x: START_X + c * (TW + GX), y: TOP + r * (TH + GY) };
}
function takeSlot() {
  for (let i = 0; i < maxSlots; i++) if (!occupied.has(i)) { occupied.add(i); return i; }
  return -1;
}

/* ───────── game state ───────── */
let dogs = [];
let targets = [];
let running = false, paused = false;
let mode = 'safe';
let eaten = 0;
let selectedDog = null;
let bones = [];
let scanTimer = null;
const respawnBlock = new Map(); // targetId -> time until it may reappear
let warnedPerm = false;

const rnd = (a, b) => a + Math.random() * (b - a);
const now = () => performance.now();

/* ───────── tiny optional SFX (WebAudio, no assets) ───────── */
const Sfx = {
  on: true, ctx: null,
  ensure() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {} } },
  blip(freq, dur = 0.18, type = 'sine', gain = 0.06) {
    if (!this.on || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur);
    } catch (_) {}
  },
  sad() { [392, 349, 294, 262].forEach((f, i) => setTimeout(() => this.blip(f, 0.4, 'sine', 0.05), i * 180)); },
  hit() { this.blip(90 + Math.random() * 60, 0.09, 'square', 0.05); },
  power() { [220, 330, 440, 660].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'sawtooth', 0.04), i * 90)); },
  gulp() { this.blip(180, 0.12, 'triangle', 0.06); setTimeout(() => this.blip(120, 0.14, 'triangle', 0.05), 90); },
  // One shared "woof" for every dog — a quick two-tone yip.
  bark() { this.blip(300, 0.07, 'square', 0.05); setTimeout(() => this.blip(190, 0.1, 'square', 0.045), 65); }
};

/* ───────── toast log ───────── */
const toastBox = document.getElementById('toast');
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast-line ' + type;
  el.textContent = msg;
  toastBox.appendChild(el);
  setTimeout(() => el.remove(), 3200);
  while (toastBox.children.length > 4) toastBox.firstChild.remove();
}

/* ───────── HUD ───────── */
const hud = {
  eaten: document.getElementById('s-eaten'),
  pack: document.getElementById('s-pack'),
  pill: document.getElementById('modePill'),
  pause: document.getElementById('btnPause'),
  treat: document.getElementById('btnTreat'),
  sound: document.getElementById('btnSound')
};
function refreshMode() {
  hud.pill.className = mode;
  hud.pill.querySelector('.label').textContent = mode === 'safe' ? 'Safe Mode' : 'CHAOS MODE';
}
function refreshHud() {
  hud.eaten.textContent = eaten;
  hud.pack.textContent = dogs.filter((d) => !['react', 'toCorner'].includes(d.state)).length;
}

/* ───────── target windows ───────── */
const KIND_ICON = { tab: '🌐', app: '🖥️' };

function createTarget(def) {
  const slot = takeSlot();
  const el = document.createElement('div');
  el.className = 'target' + (def.protected ? ' protected' : ' assignable');
  el.innerHTML =
    `<div class="bar"><span class="kind">${KIND_ICON[def.kind] || '📄'}</span>` +
    `<span class="ttl">${escapeHtml(def.title)}</span></div>` +
    (def.protected ? `<span class="lock">🔒</span>` : '') +
    `<div class="body"><div class="fake-line" style="width:90%"></div>` +
    `<div class="fake-line" style="width:70%"></div><div class="fake-line" style="width:82%"></div></div>` +
    `<div class="hplabel">structural integrity</div><div class="hp"><i></i></div>`;
  arena.appendChild(el);

  const pos = slot >= 0 ? slotXY(slot) : { x: rnd(START_X, innerWidth - TW - 20), y: rnd(TOP, innerHeight - TH - 20) };
  // Tabs are flimsier than executables — a shorter (and faster-draining) bar.
  const maxHp = def.kind === 'tab' ? 50 : 100;
  const t = {
    ...def, el, slot,
    x: pos.x + rnd(-6, 6), y: pos.y + rnd(-6, 6),
    w: TW, h: TH, hp: maxHp, maxHp, dead: false, holes: [], claimedBy: null,
    hpBar: el.querySelector('.hp i')
  };
  t.hpBar.style.width = maxHp + '%';
  positionTarget(t);
  el.addEventListener('click', () => onTargetClick(t));
  return t;
}
function positionTarget(t) {
  t.el.style.setProperty('--tx', t.x + 'px');
  t.el.style.setProperty('--ty', t.y + 'px');
  t.el.style.transform = `translate(${t.x}px, ${t.y}px)`;
}
function targetCenter(t) { return { x: t.x + t.w / 2, y: t.y + t.h / 2 }; }

function removeTarget(t, closedExternally) {
  t.dead = true;
  if (t.slot >= 0) occupied.delete(t.slot);
  for (const d of dogs) if (d.lock === t) { d.lock = null; if (d.state === 'chew' || d.state === 'hunt') d.state = 'roam'; }
  if (closedExternally) { t.el.remove(); }
}

/* fold the eaten-tab payload down to what the main process needs */
function eatPayload(t) {
  return t.kind === 'tab'
    ? { kind: 'tab', browser: t.browser, win: t.win, tab: t.tab, title: t.title }
    : { kind: 'app', appName: t.appName, pid: t.pid, title: t.title };
}

/* ───────── real-world scan + reconcile ───────── */
async function scan() {
  if (!running) return;
  let res;
  try { res = await window.pack.scan(); } catch (e) { return; }
  if (!res || !res.ok) {
    if (!warnedPerm) { toast('Scan failed — check Automation permission.', 'block'); warnedPerm = true; }
    return;
  }
  reconcile(res.targets || []);
}

function reconcile(scanned) {
  const t = now();
  const byId = new Map(targets.filter((x) => !x.dead).map((x) => [x.id, x]));
  // Choose which to show: drop respawn-blocked, keep a tabs+apps mix, cap to grid.
  const fresh = scanned.filter((s) => !(respawnBlock.get(s.id) > t));
  const tabs = fresh.filter((s) => s.kind === 'tab');
  const apps = fresh.filter((s) => s.kind === 'app');
  const pick = [];
  let ti = 0, ai = 0;
  while (pick.length < maxSlots && (ti < tabs.length || ai < apps.length)) {
    if (ti < tabs.length) pick.push(tabs[ti++]);
    if (pick.length < maxSlots && ai < apps.length) pick.push(apps[ai++]);
  }
  const keepIds = new Set(pick.map((s) => s.id));

  // remove ones that vanished from the world (or got de-prioritised),
  // but never yank a window out from under an active fight or chew.
  for (const ex of [...byId.values()]) {
    const busy = ex.claimedBy === 'fight' || dogs.some((d) => d.lock === ex && ['hunt', 'chew'].includes(d.state));
    if (!keepIds.has(ex.id) && !busy) removeTarget(ex, true);
  }
  // add new
  const next = [];
  for (const s of pick) {
    const ex = byId.get(s.id);
    if (ex && !ex.dead) { next.push(ex); }
    else next.push(createTarget(s));
  }
  targets = next;
  document.getElementById('empty').hidden = targets.length > 0;
}

/* ───────── chewing + devouring ───────── */
function biteHole(t, dog) {
  const c = targetCenter(t), m = dog.mouth();
  const toDog = Math.atan2(m.y - c.y, m.x - c.x);
  const r = rnd(24, 38);
  const hx = t.w / 2 + Math.cos(toDog) * (t.w / 2 - 6) + rnd(-10, 10);
  const hy = t.h / 2 + Math.sin(toDog) * (t.h / 2 - 6) + rnd(-10, 10);
  t.holes.push({ x: hx, y: hy, r });
  const mask = ['linear-gradient(#000,#000)']
    .concat(t.holes.map((h) => `radial-gradient(circle at ${h.x}px ${h.y}px, transparent 0 ${h.r}px, #000 ${h.r + 1}px)`))
    .join(',');
  t.el.style.webkitMaskImage = mask; t.el.style.maskImage = mask;
  t.el.style.webkitMaskComposite = 'source-in'; t.el.style.maskComposite = 'intersect';

  const crumb = document.createElement('div');
  crumb.className = 'crumb';
  crumb.textContent = ['🍞', '📄', '🧾', '✏️', '💾'][Math.floor(rnd(0, 5))];
  crumb.style.left = (t.x + hx) + 'px'; crumb.style.top = (t.y + hy) + 'px';
  arena.appendChild(crumb);
  setTimeout(() => crumb.remove(), 700);
}

function damageTarget(t, dog) {
  t.hp -= rnd(8, 13);
  biteHole(t, dog);
  const p = Math.max(0, t.hp);
  const ratio = p / t.maxHp;
  t.hpBar.style.width = p + '%'; // absolute: a tab's bar is visibly shorter
  t.hpBar.style.background = ratio < 0.35 ? 'var(--danger)' : ratio < 0.65 ? 'var(--warn)' : 'var(--ok)';
  t.el.classList.remove('hurt'); void t.el.offsetWidth; t.el.classList.add('hurt');
  if (t.hp <= 0) devour(t, dog);
}

async function devour(t, dog) {
  if (t.dead) return;
  t.dead = true;
  if (t.slot >= 0) occupied.delete(t.slot);
  dog.lock = null; dog.state = 'roam';
  dog.bumpEaten();
  dog.say('gulp 😌'); Sfx.gulp();

  // shrink toward the dog
  const m = dog.mouth();
  t.el.classList.add('dying');
  t.el.style.transformOrigin = (m.x - t.x) + 'px ' + (m.y - t.y) + 'px';
  requestAnimationFrame(() => { t.el.style.transform += ' scale(.02)'; t.el.style.opacity = '0'; });
  setTimeout(() => t.el.remove(), 440);

  // block respawn briefly so dry-run food doesn't blink back instantly
  respawnBlock.set(t.id, now() + 9000);

  // the real action (gated in the main process)
  try {
    const r = await window.pack.eat(eatPayload(t));
    if (r.ok && r.dryRun) toast(`${dog.name} "ate" ${short(t.title)} (safe — nothing closed)`, 'eat');
    else if (r.ok) toast(`${dog.name} really closed ${short(t.title)} 💥`, 'chaos');
    else if (r.blocked) toast(`${short(t.title)} is protected — spat it out`, 'block');
    else toast(`couldn't close ${short(t.title)}: ${r.error || 'error'}`, 'block');
  } catch (e) {
    toast(`eat failed: ${e.message}`, 'block');
  }
  eaten += 1; refreshHud();
}

/* ───────── fights ───────── */
const fightCtx = { arena, reduced, toast, resolve: resolveFight };
function triggerFight(a, b, target) {
  if (!a || !b || a === b) return;
  if (a.state === 'fight' || b.state === 'fight') return;
  Sfx.hit();
  window.Fight.runBrawl(a, b, target, fightCtx);
}
function resolveFight(winner, loser, target) {
  if (target && !target.dead) { target.claimedBy = winner.key; winner.lock = target; winner.state = 'hunt'; }
  else winner.state = 'roam';
  winner.say('mine 😋');
  // Loser slinks off to the nearest corner; it reacts there (see startReaction).
  loser.lock = null; loser.priority = false; loser.opponent = winner;
  loser.clearProps(); loser.hideBadge();
  loser.cornerSpot = nearestCorner(loser);
  loser.state = 'toCorner';
}

const REACT_MS = 10000;
function nearestCorner(dog) {
  const c = dog.center();
  const pts = [
    { x: START_X + 60, y: TOP + 70 },
    { x: innerWidth - 90, y: TOP + 70 },
    { x: START_X + 60, y: innerHeight - 110 },
    { x: innerWidth - 90, y: innerHeight - 110 }
  ];
  let best = pts[0], bd = Infinity;
  for (const p of pts) { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bd) { bd = d; best = p; } }
  return best;
}

/* ───────── personalities (loser reactions, played at the corner for 10s) ───────── */
function startReaction(dog) {
  dog.clearProps(); dog.setMotion({});
  dog._nextParticle = 0;
  dog.until = now() + REACT_MS;
  switch (dog.key) {
    case 'pita':
      dog.reaction = { particle: '💧', notes: true, then: null };
      dog.showBadge('🎹'); dog.addProp('piano', '🎹'); dog.say('😭', 2600); Sfx.sad();
      break;
    case 'oreo':
      dog.reaction = { particle: '💧', then: null };
      dog.showBadge('🍪'); dog.addProp('oreo', '🍪'); dog.say('*crunch* *sob*', 2600);
      break;
    case 'anything':
      dog.reaction = { then: null };
      dog.showBadge('🤷'); dog.addProp('shrug', '🤷'); dog.say('eh, whatever.', 2600);
      break;
    case 'fanta': // "No one"
      dog.reaction = { particle: '💧', then: 'revenge' };
      dog.showBadge('😾'); dog.say('grrr… coming back 😾', 2600);
      break;
    case 'lupita':
      dog.reaction = { particle: '💦', then: 'revenge' };
      dog.showBadge('💪'); dog.addProp('dumbbell', '🏋️'); dog.say('must. get. stronger.', 2600);
      break;
    default:
      dog.reset(); return;
  }
  dog.state = 'react';
}

/* ───────── per-dog AI step ───────── */
function pickTarget(dog) {
  let best = null, bd = Infinity;
  const c = dog.center();
  for (const t of targets) {
    if (t.dead || t.protected || t.claimedBy === 'fight') continue;
    const tc = targetCenter(t);
    const d = Math.hypot(tc.x - c.x, tc.y - c.y);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
function stepDog(dog, T, dt) {
  switch (dog.state) {
    case 'roam': {
      // treat chase
      if (dog.treat) {
        const b = dog.treat;
        if (b.dead) { dog.treat = null; }
        else {
          const d = dog.moveToward(b.x + 16, b.y + 16, 220, dt);
          dog.setMotion({ walking: true });
          if (d < 40) { eatBone(b); dog.treat = null; dog.distractedUntil = T + 2600; dog.say('❤️ treat!'); }
          return;
        }
      }
      if (T < dog.distractedUntil) { wander(dog, T, dt); return; }
      if (!paused) {
        const tgt = pickTarget(dog);
        if (tgt) { dog.lock = tgt; dog.state = 'hunt'; return; }
      }
      wander(dog, T, dt);
      break;
    }
    case 'hunt': {
      const t = dog.lock;
      if (!t || t.dead || t.protected || paused) { dog.lock = null; dog.state = 'roam'; return; }
      if (t.claimedBy === 'fight') { dog.lock = null; dog.state = 'roam'; return; }
      const tc = targetCenter(t);
      const dist = dog.moveToward(tc.x, tc.y, dog.priority ? 240 : 175, dt);
      dog.setMotion({ walking: true });
      if (dist < Math.max(t.w, t.h) / 2 + 8) {
        // Someone already on this target? Contest it.
        if (t.claimedBy && t.claimedBy !== dog.key && t.claimedBy !== 'fight') {
          const other = dogs.find((d) => d.key === t.claimedBy);
          if (other && ['hunt', 'chew'].includes(other.state)) { triggerFight(dog, other, t); return; }
        }
        t.claimedBy = dog.key; dog.state = 'chew'; dog.chompAt = 0; dog.priority = false;
      }
      break;
    }
    case 'chew': {
      const t = dog.lock;
      if (!t || t.dead || paused) { if (t) t.claimedBy = null; dog.lock = null; dog.state = 'roam'; return; }
      dog.setMotion({ chomp: true });
      if (T - dog.chompAt > 300) {
        dog.chompAt = T;
        damageTarget(t, dog);
        if (Math.random() < 0.25) { dog.say(bark()); Sfx.bark(); }
      }
      break;
    }
    case 'fight': return; // fight.js owns this
    case 'toCorner': {
      const cs = dog.cornerSpot;
      const d = dog.moveToward(cs.x, cs.y, 205, dt);
      dog.setMotion({ walking: d > 6 });
      if (d < 20) startReaction(dog);
      break;
    }
    case 'react': {
      dog.setMotion({});
      const r = dog.reaction || {};
      if (r.particle && T > dog._nextParticle) {
        if (r.particle === '💦') {
          const s = dog.addProp('sweat', '💦', { left: (36 + rnd(0, 48)) + 'px', top: '40px' });
          setTimeout(() => s.remove(), 700);
        } else dog.tear();
        if (r.notes) { dog.note(); Sfx.blip(rnd(300, 500), 0.3, 'sine', 0.03); }
        dog._nextParticle = T + 400;
      }
      if (T > dog.until) {
        dog.clearProps(); dog.hideBadge();
        if (r.then === 'revenge' && dog.opponent) {
          dog.state = 'revenge'; dog.revengeUntil = T + 9000;
          dog.say(dog.key === 'lupita' ? 'REVENGE. 🔥' : 'AGAIN! 😾');
          if (dog.key === 'lupita') Sfx.power();
        } else dog.reset();
      }
      break;
    }
    case 'revenge': {
      const opp = dog.opponent;
      if (!opp || T > dog.revengeUntil) { dog.reset(); return; }
      const oc = opp.center();
      const d = dog.moveToward(oc.x, oc.y, 215, dt);
      dog.setMotion({ walking: true });
      if (d < 74) {
        if (opp.state === 'fight') return; // wait for them to be free
        triggerFight(dog, opp, opp.lock || null);
      }
      break;
    }
  }
}

function wander(dog, T, dt) {
  if (!dog._wp || T > dog.wanderAt || Math.hypot(dog._wp.x - dog.center().x, dog._wp.y - dog.center().y) < 24) {
    dog._wp = { x: rnd(START_X, innerWidth - 80), y: rnd(TOP + 20, innerHeight - 120) };
    dog.wanderAt = T + rnd(1600, 3400);
  }
  const d = dog.moveToward(dog._wp.x, dog._wp.y, 95, dt);
  dog.setMotion({ walking: d > 6 });
}

function bark() {
  const B = ['nom', 'mine now 😋', 'delicious', 'is this load-bearing?', 'more. MORE.', 'tasty tab', '404 soon'];
  return B[Math.floor(rnd(0, B.length))];
}

/* ───────── treats ───────── */
function throwTreat() {
  if (!running || paused) return;
  const bx = rnd(START_X, innerWidth - 80), by = rnd(TOP + 20, innerHeight - 100);
  const el = document.createElement('div');
  el.className = 'bone'; el.textContent = '🦴';
  el.style.left = (bx - 16) + 'px'; el.style.top = (by - 16) + 'px';
  arena.appendChild(el);
  const b = { el, x: bx - 16, y: by - 16, dead: false };
  bones.push(b);
  // nearest interruptible dog goes for it
  let best = null, bd = Infinity;
  for (const d of dogs) {
    if (!['roam', 'hunt', 'chew'].includes(d.state)) continue;
    const c = d.center(); const dist = Math.hypot(c.x - bx, c.y - by);
    if (dist < bd) { bd = dist; best = d; }
  }
  if (best) {
    if (best.lock) { best.lock.claimedBy = null; best.lock = null; }
    best.state = 'roam'; best.treat = b; best.say('BONE!');
  }
}
function eatBone(b) { b.dead = true; b.el.remove(); bones = bones.filter((x) => x !== b); }

/* ───────── user assignment (Mix targeting) ───────── */
function onTargetClick(t) {
  if (!running || t.dead || t.protected) return;
  if (!selectedDog) { toast('Pick a dog on the left first, then a target.'); return; }
  const d = selectedDog;
  if (d.lock) { if (d.lock !== t) d.lock.claimedBy = null; }
  d.state = 'hunt'; d.lock = t; d.priority = true; d.treat = null;
  d.say('on it! 🎯');
  toast(`Sent ${d.name} after ${short(t.title)}`);
  selectDog(null);
}

/* ───────── roster ───────── */
const STATE_ICON = { roam: '🐾', hunt: '👀', chew: '😋', fight: '🥊', toCorner: '🏃', react: '😢', revenge: '🔥' };
function buildRoster() {
  const box = document.getElementById('roster');
  box.innerHTML = '';
  for (const d of dogs) {
    const card = document.createElement('div');
    card.className = 'roster-card'; card.dataset.key = d.key;
    card.innerHTML =
      `<div class="chip">${window.Sprites.buildDogSVG(d.key)}</div>` +
      `<div class="who"><b>${d.name}</b><span>${d.breed}</span><span class="pron">${d.pronouns}</span></div>` +
      `<div class="state">🐾</div>`;
    card.addEventListener('click', () => selectDog(selectedDog === d ? null : d));
    d.card = card; d.stateEl = card.querySelector('.state');
    box.appendChild(card);
  }
  const hint = document.createElement('div');
  hint.id = 'rosterHint';
  hint.textContent = 'Click a dog, then click a tab/app to send it.';
  box.appendChild(hint);
}
function selectDog(d) {
  selectedDog = d;
  for (const x of dogs) x.card.classList.toggle('selected', x === d);
  for (const t of targets) if (!t.protected) t.el.classList.toggle('assignable', true);
}
function refreshRoster() {
  for (const d of dogs) if (d.stateEl) d.stateEl.textContent = STATE_ICON[d.state] || '🐾';
}

/* ───────── ambient dolphin ───────── */
// A rare sky-blue dolphin drifts across, sometimes pausing to look at a dog.
let dolphin = null, nextDolphinAt = 0;
const DW = 150;
function spawnDolphin() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const el = document.createElement('div');
  el.className = 'dolphin';
  el.innerHTML = `<div class="flip">${window.Sprites.buildDolphinSVG()}</div>`;
  arena.appendChild(el);
  dolphin = {
    el, dir, y: rnd(TOP + 10, TOP + 120), speed: rnd(85, 125),
    x: dir === 1 ? -DW - 20 : innerWidth + 20,
    pauseX: rnd(innerWidth * 0.35, innerWidth * 0.62),
    hasPaused: false, pausedUntil: 0,
    flip: el.querySelector('.flip')
  };
  faceDolphin(dir);
  placeDolphin();
}
function placeDolphin() { dolphin.el.style.transform = `translate(${dolphin.x}px, ${dolphin.y}px)`; }
function faceDolphin(dir) { dolphin.flip.style.transform = dir === 1 ? 'scaleX(1)' : 'scaleX(-1)'; }
function updateDolphin(T, dt) {
  if (!dolphin) { if (T > nextDolphinAt) spawnDolphin(); return; }
  const d = dolphin, mid = d.x + DW / 2;
  if (T < d.pausedUntil) {
    // paused mid-swim: turn to look at the nearest dog
    let best = null, bd = Infinity;
    for (const dg of dogs) { const dist = Math.abs(dg.center().x - mid); if (dist < bd) { bd = dist; best = dg; } }
    if (best) faceDolphin(best.center().x >= mid ? 1 : -1);
    return;
  }
  faceDolphin(d.dir);
  d.x += d.dir * d.speed * dt;
  placeDolphin();
  if (!d.hasPaused && ((d.dir === 1 && d.x >= d.pauseX) || (d.dir === -1 && d.x <= d.pauseX))) {
    d.hasPaused = true;
    if (Math.random() < 0.7) d.pausedUntil = T + rnd(1400, 2200);
  }
  if (d.x < -DW - 40 || d.x > innerWidth + 40) {
    d.el.remove(); dolphin = null;
    nextDolphinAt = T + rnd(14000, 28000);
  }
}

/* ───────── main loop ───────── */
let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const T = performance.now();
  const dt = Math.min(0.05, (T - last) / 1000) || 0.016; last = T;
  if (!running) return;
  for (const d of dogs) stepDog(d, T, dt);
  updateDolphin(T, dt);
  refreshRoster(); refreshHud();
}

/* ───────── start / overlays / mode ───────── */
function startGame() {
  document.getElementById('intro').hidden = true;
  Sfx.ensure();
  computeGrid();
  dogs = window.Sprites.BREEDS.map((def) => new window.Dog(def, arena));
  buildRoster();
  running = true; paused = false;
  refreshMode(); refreshHud();
  scan();
  scanTimer = setInterval(scan, 2500);
  last = performance.now();
  nextDolphinAt = performance.now() + rnd(6000, 12000);
}

function askChaos() {
  document.getElementById('chaos').hidden = false;
}
async function setMode(m) {
  const res = await window.pack.setMode(m);
  mode = (res && res.mode) || m;
  refreshMode();
  toast(mode === 'chaos' ? '⚠️ CHAOS MODE — real tabs & apps will be closed!' : 'Safe Mode — nothing real will close.', mode === 'chaos' ? 'chaos' : 'eat');
}

/* ───────── helpers ───────── */
function short(s) { s = s || ''; return s.length > 26 ? s.slice(0, 25) + '…' : s; }
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ───────── permission onboarding ───────── */
async function refreshPermissions() {
  try {
    const p = await window.pack.checkPermissions();
    const setRow = (id, ok) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = ok ? '<span class="ok">granted ✓</span>' : '<span class="no">needs approval</span>';
    };
    setRow('perm-apps', p.apps);
    setRow('perm-browsers', p.browsers);
  } catch (_) {}
}

/* ───────── wire up ───────── */
window.addEventListener('DOMContentLoaded', async () => {
  const m = await window.pack.getMode().catch(() => ({ mode: 'safe' }));
  mode = m.mode || 'safe'; refreshMode();
  refreshPermissions();

  document.getElementById('btnStart').addEventListener('click', startGame);
  hud.pill.addEventListener('click', () => { if (mode === 'safe') askChaos(); else setMode('safe'); });
  document.getElementById('chaosGo').addEventListener('click', () => { document.getElementById('chaos').hidden = true; setMode('chaos'); });
  document.getElementById('chaosCancel').addEventListener('click', () => { document.getElementById('chaos').hidden = true; });

  hud.pause.addEventListener('click', () => {
    paused = !paused;
    hud.pause.textContent = paused ? '▶️ Resume' : '⏸ Call off';
    if (paused) for (const d of dogs) if (['hunt', 'chew'].includes(d.state)) { if (d.lock) d.lock.claimedBy = null; d.lock = null; d.state = 'roam'; }
    toast(paused ? 'Pack called off — dogs are chilling.' : 'Pack released!');
  });
  hud.treat.addEventListener('click', throwTreat);
  hud.sound.addEventListener('click', () => {
    Sfx.on = !Sfx.on;
    hud.sound.textContent = Sfx.on ? '🔊' : '🔇';
  });
  addEventListener('keydown', (e) => { if (e.code === 'Space' && running) { e.preventDefault(); throwTreat(); } });
  addEventListener('resize', () => { computeGrid(); });
});

requestAnimationFrame(loop);
