'use strict';
/* The fight director. Two dogs contest one target → a 3-second brawl →
 * a random winner. Winner eats; loser's reaction is handed back to game.js.
 * Lupita goes Super Saiyan for the duration of any fight she's in. */

const FIGHT_MS = 3000;
const SPARKS = ['💥', '⭐', '💫', '💢', '🐾'];

function makeBrawl(arena, x, y) {
  const b = document.createElement('div');
  b.className = 'brawl';
  b.style.left = x + 'px';
  b.style.top = y + 'px';
  b.innerHTML = `<div class="clock">3</div><div class="cloud">💨</div>`;
  arena.appendChild(b);
  return b;
}

function spark(brawl) {
  const s = document.createElement('span');
  s.className = 'spark';
  s.textContent = SPARKS[Math.floor(Math.random() * SPARKS.length)];
  s.style.left = '50%'; s.style.top = '50%';
  const ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 46;
  s.style.setProperty('--sx', Math.cos(ang) * dist + 'px');
  s.style.setProperty('--sy', Math.sin(ang) * dist + 'px');
  brawl.appendChild(s);
  setTimeout(() => s.remove(), 600);
}

// dogA, dogB fight over `target`. ctx = { arena, resolve(winner,loser,target),
// toast(msg,type), reduced }.
function runBrawl(dogA, dogB, target, ctx) {
  const a = dogA.center(), b = dogB.center();
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;

  // Pull both dogs to the brawl point, flanking it.
  dogA.x = mx - window.DOG_W * 0.62; dogA.y = my - window.DOG_H / 2;
  dogB.x = mx - window.DOG_W * 0.38; dogB.y = my - window.DOG_H / 2;
  dogA.face = 'right'; dogB.face = 'left';
  dogA.el.classList.toggle('face-left', false);
  dogB.el.classList.add('face-left');
  dogA.place(); dogB.place();

  for (const d of [dogA, dogB]) {
    d.state = 'fight';
    d.lock = null;
    d.clearProps();
    const saiyan = d.key === 'lupita';
    d.setMotion({ fighting: true, saiyan });
    if (saiyan) { d.say('HAAAAA!', FIGHT_MS); ctx.toast(`${d.name} powers up — Super Saiyan!`, 'chaos'); }
  }
  if (target) target.claimedBy = 'fight';
  ctx.toast(`${dogA.name} vs ${dogB.name} — FIGHT!`, '');

  const brawl = makeBrawl(ctx.arena, mx, my);
  const clock = brawl.querySelector('.clock');

  let remaining = 3;
  const tick = setInterval(() => {
    remaining -= 1;
    if (remaining >= 1) clock.textContent = String(remaining);
    if (!ctx.reduced) { spark(brawl); spark(brawl); }
  }, 1000);

  const finish = () => {
    clearInterval(tick);
    brawl.remove();
    const winner = Math.random() < 0.5 ? dogA : dogB;
    const loser = winner === dogA ? dogB : dogA;
    for (const d of [dogA, dogB]) d.setMotion({});
    ctx.resolve(winner, loser, target);
  };

  const dur = ctx.reduced ? 600 : FIGHT_MS;
  setTimeout(finish, dur);
}

window.Fight = { runBrawl, FIGHT_MS };
