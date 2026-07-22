'use strict';
/* A Dog: its DOM, where it is, which way it faces, and the small visual
 * primitives (speech, tears, props, state classes) the AI and the fight
 * director drive it with. Behaviour/decisions live in game.js & fight.js. */

const DOG_W = 120, DOG_H = 114;

class Dog {
  constructor(def, arena) {
    this.key = def.key;
    this.name = def.name;
    this.breed = def.breed;
    this.pronouns = def.pronouns;
    this.emoji = def.emoji;

    const el = document.createElement('div');
    el.className = 'dog';
    el.dataset.key = def.key;
    el.innerHTML =
      `<div class="aura"></div>` +
      `<div class="saiyan-hair"></div>` +
      `<div class="react-badge"></div>` +
      `<div class="flip">${window.Sprites.buildDogSVG(def.key)}</div>` +
      `<div class="props"></div>` +
      `<div class="bubble"></div>` +
      `<div class="nameplate">${def.name}</div>` +
      `<div class="eatcount" title="tabs & apps eaten">🦴 0</div>`;
    arena.appendChild(el);

    this.el = el;
    this.propsEl = el.querySelector('.props');
    this.bubbleEl = el.querySelector('.bubble');
    this.badgeEl = el.querySelector('.react-badge');
    this.eatEl = el.querySelector('.eatcount');
    this.eaten = 0;

    // position (top-left)
    this.x = 40 + Math.random() * (innerWidth - 240);
    this.y = 120 + Math.random() * (innerHeight - 320);
    this.tx = this.x; this.ty = this.y;
    this.face = 'right';

    // AI fields (owned by game.js)
    this.state = 'roam';
    this.lock = null;        // target being hunted/chewed
    this.opponent = null;    // dog for revenge
    this.until = 0;          // state timer (ms, performance.now)
    this.chompAt = 0;
    this.wanderAt = 0;
    this.priority = false;   // user-assigned target
    this.distractedUntil = 0;

    this.place();
  }

  center() { return { x: this.x + DOG_W / 2, y: this.y + DOG_H / 2 - 6 }; }
  mouth() {
    // roughly where the head/muzzle sits, accounting for facing
    const cy = this.y + DOG_H * 0.52;
    const cx = this.face === 'right' ? this.x + DOG_W * 0.78 : this.x + DOG_W * 0.22;
    return { x: cx, y: cy };
  }

  place() { this.el.style.transform = `translate(${this.x}px, ${this.y}px)`; }

  setFacing(dx) {
    if (dx > 1.5) this.face = 'right';
    else if (dx < -1.5) this.face = 'left';
    this.el.classList.toggle('face-left', this.face === 'left');
  }

  // Move toward a point; returns remaining distance to it.
  moveToward(tx, ty, speed, dt) {
    const cx = this.x + DOG_W / 2, cy = this.y + DOG_H / 2;
    const dx = tx - cx, dy = ty - cy;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > 3) {
      const step = Math.min(dist, speed * dt);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      this.setFacing(dx);
      this.clampToArena();
      this.place();
    }
    return dist;
  }

  clampToArena() {
    this.x = Math.max(-10, Math.min(innerWidth - DOG_W + 10, this.x));
    this.y = Math.max(72, Math.min(innerHeight - DOG_H, this.y));
  }

  setMotion({ walking = false, chomp = false, fighting = false, saiyan = false } = {}) {
    this.el.classList.toggle('walking', walking);
    this.el.classList.toggle('chomp', chomp);
    this.el.classList.toggle('fighting', fighting);
    this.el.classList.toggle('saiyan', saiyan);
  }

  say(text, ms = 1600) {
    this.bubbleEl.textContent = text;
    this.bubbleEl.classList.add('show');
    clearTimeout(this._sayT);
    this._sayT = setTimeout(() => this.bubbleEl.classList.remove('show'), ms);
  }

  clearProps() { this.propsEl.innerHTML = ''; }

  bumpEaten() { this.eaten += 1; this.eatEl.textContent = '🦴 ' + this.eaten; }

  // Big reaction emoji, floating above the dog's head.
  showBadge(emoji) { this.badgeEl.textContent = emoji; this.badgeEl.classList.add('show'); }
  hideBadge() { this.badgeEl.classList.remove('show'); this.badgeEl.textContent = ''; }

  addProp(cls, emoji, style = {}) {
    const s = document.createElement('span');
    s.className = 'prop ' + cls;
    s.textContent = emoji;
    Object.assign(s.style, style);
    this.propsEl.appendChild(s);
    return s;
  }

  tear() {
    const t = document.createElement('span');
    t.className = 'tear';
    t.textContent = '💧';
    t.style.left = (30 + Math.random() * 60) + 'px';
    t.style.top = (46 + Math.random() * 10) + 'px';
    this.propsEl.appendChild(t);
    setTimeout(() => t.remove(), 900);
  }

  note() {
    const n = document.createElement('span');
    n.className = 'note';
    n.textContent = ['♪', '♫', '♩'][Math.floor(Math.random() * 3)];
    n.style.left = (40 + Math.random() * 40) + 'px';
    n.style.top = (30 + Math.random() * 20) + 'px';
    this.propsEl.appendChild(n);
    setTimeout(() => n.remove(), 1600);
  }

  reset() {
    this.state = 'roam';
    this.lock = null; this.opponent = null; this.priority = false;
    this.clearProps();
    this.hideBadge();
    this.setMotion({});
  }
}

window.Dog = Dog;
window.DOG_W = DOG_W;
window.DOG_H = DOG_H;
