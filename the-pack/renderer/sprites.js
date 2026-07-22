'use strict';
/* The five dogs of The Pack, as hand-authored SVG sprites.
 * Each sprite faces RIGHT; the game flips it with scaleX(-1) to face left.
 * Parts carry classes (.tail, .ear-tw) so idle motion and state animations
 * can drive them independently. viewBox is a shared 0 0 200 190. */

const SVG = {
  /* ── Pita — Yorkshire Terrier ── */
  pita: `
    <ellipse cx="100" cy="168" rx="52" ry="9" fill="#000" opacity=".16"/>
    <g class="rig">
      <rect x="72" y="132" width="11" height="30" rx="5" fill="#a67f54"/>
      <rect x="112" y="132" width="11" height="30" rx="5" fill="#a67f54"/>
      <g class="tail" style="transform-origin:62px 118px">
        <path d="M62 122 Q42 108 50 86 Q60 96 66 116 Z" fill="#5f6b78"/>
        <path d="M50 92 Q47 84 52 82 Q57 86 56 94 Z" fill="#cf9f6f"/>
      </g>
      <ellipse cx="96" cy="120" rx="46" ry="27" fill="#cf9f6f"/>
      <path d="M58 108 Q96 88 138 108 Q140 126 132 138 Q96 128 62 138 Q54 122 58 108 Z" fill="#5f6b78"/>
      <path d="M60 138 q8 12 4 20 q10 -8 12 4 q8 -10 12 2 q8 -10 12 3 q9 -10 13 2 q9 -9 13 3 q4 -12 -2 -20 Z" fill="#c99669"/>
      <rect x="66" y="136" width="12" height="30" rx="6" fill="#cf9f6f"/>
      <rect x="118" y="136" width="12" height="30" rx="6" fill="#cf9f6f"/>
      <g class="head">
        <circle cx="146" cy="96" r="26" fill="#cf9f6f"/>
        <g class="ear-tw" style="transform-origin:132px 78px">
          <path d="M130 80 L126 54 L144 74 Z" fill="#5f6b78"/>
          <path d="M132 76 L131 62 L140 73 Z" fill="#7c5a3a"/>
        </g>
        <path d="M162 80 L166 56 L172 80 Z" fill="#5f6b78"/>
        <path d="M140 74 q6 -10 14 0 q-7 4 -14 0 Z" fill="#8b95a1"/>
        <circle cx="147" cy="70" r="4.5" fill="#e05a72"/>
        <circle cx="147" cy="70" r="1.6" fill="#fff" opacity=".7"/>
        <ellipse cx="170" cy="104" rx="14" ry="11" fill="#dcae7d"/>
        <circle cx="182" cy="102" r="4.2" fill="#2b2b2b"/>
        <path class="mouth" d="M175 110 q4 4 8 0" stroke="#7c5a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <circle class="eye" cx="156" cy="92" r="4.6" fill="#2b2b2b"/>
        <circle cx="157.6" cy="90.4" r="1.5" fill="#fff"/>
      </g>
    </g>`,

  /* ── Fanta — Corgi ── */
  fanta: `
    <ellipse cx="100" cy="170" rx="56" ry="9" fill="#000" opacity=".16"/>
    <g class="rig">
      <rect x="70" y="146" width="12" height="18" rx="6" fill="#f4e6d2"/>
      <rect x="116" y="146" width="12" height="18" rx="6" fill="#f4e6d2"/>
      <g class="tail" style="transform-origin:54px 128px">
        <ellipse cx="46" cy="122" rx="13" ry="15" fill="#e79138"/>
        <ellipse cx="44" cy="126" rx="7" ry="9" fill="#fbf3e6"/>
      </g>
      <ellipse cx="98" cy="130" rx="52" ry="26" fill="#fbf3e6"/>
      <path d="M52 118 Q98 98 146 120 Q148 132 140 140 Q98 126 60 138 Q50 128 52 118 Z" fill="#e79138"/>
      <rect x="64" y="148" width="13" height="18" rx="6.5" fill="#fbf3e6"/>
      <rect x="122" y="148" width="13" height="18" rx="6.5" fill="#fbf3e6"/>
      <g class="head">
        <circle cx="150" cy="102" r="25" fill="#e79138"/>
        <g class="ear-tw" style="transform-origin:138px 84px">
          <path d="M134 88 L128 50 L152 80 Z" fill="#e79138"/>
          <path d="M136 82 L134 62 L146 78 Z" fill="#f2b98a"/>
        </g>
        <path d="M164 82 L172 48 L178 84 Z" fill="#e79138"/>
        <path d="M166 80 L172 60 L174 82 Z" fill="#f2b98a"/>
        <path d="M150 92 q9 22 0 34 q-9 -14 0 -34 Z" fill="#fbf3e6"/>
        <ellipse cx="174" cy="112" rx="14" ry="11" fill="#fbf3e6"/>
        <circle cx="187" cy="110" r="4.2" fill="#2b2b2b"/>
        <path class="mouth" d="M180 118 q4 4 8 0" stroke="#b07a34" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <circle class="eye" cx="158" cy="98" r="4.6" fill="#2b2b2b"/>
        <circle cx="159.6" cy="96.4" r="1.5" fill="#fff"/>
      </g>
    </g>`,

  /* ── Lupita — Border Collie ── */
  lupita: `
    <ellipse cx="100" cy="168" rx="54" ry="9" fill="#000" opacity=".16"/>
    <g class="rig">
      <rect x="70" y="128" width="12" height="34" rx="6" fill="#e9e9e4"/>
      <rect x="116" y="128" width="12" height="34" rx="6" fill="#e9e9e4"/>
      <g class="tail" style="transform-origin:60px 116px">
        <path d="M60 118 Q34 118 26 146 Q40 140 46 128 Q54 126 62 122 Z" fill="#2b303a"/>
        <path d="M28 142 q-4 8 2 10 q6 -4 4 -12 Z" fill="#f4f4f0"/>
      </g>
      <ellipse cx="96" cy="116" rx="48" ry="26" fill="#f4f4f0"/>
      <path d="M54 106 Q96 84 140 106 Q146 122 136 134 Q96 120 60 130 Q50 118 54 106 Z" fill="#2b303a"/>
      <rect x="64" y="130" width="13" height="34" rx="6.5" fill="#f4f4f0"/>
      <path d="M64 130 h13 v10 h-13 Z" fill="#2b303a"/>
      <rect x="122" y="130" width="13" height="34" rx="6.5" fill="#f4f4f0"/>
      <path d="M122 130 h13 v10 h-13 Z" fill="#2b303a"/>
      <g class="head">
        <circle cx="148" cy="94" r="25" fill="#2b303a"/>
        <path class="collie-blaze" d="M148 72 q10 22 0 44 q-6 -22 0 -44 Z" fill="#f4f4f0"/>
        <g class="ear-tw" style="transform-origin:136px 78px">
          <path class="collie-ear" d="M134 82 L130 54 L150 76 Z" fill="#2b303a"/>
          <path d="M130 54 L128 62 L136 62 Z" fill="#1c2028"/>
        </g>
        <path class="collie-ear" d="M162 78 L170 56 L174 82 Z" fill="#2b303a"/>
        <ellipse cx="172" cy="104" rx="14" ry="10" fill="#f4f4f0"/>
        <circle cx="184" cy="102" r="4.2" fill="#2b2b2b"/>
        <path class="mouth" d="M177 110 q4 4 8 0" stroke="#9a9a94" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <circle class="eye" cx="156" cy="90" r="4.8" fill="#6b4a1e"/>
        <circle cx="157" cy="88.5" r="1.6" fill="#fff"/>
      </g>
    </g>`,

  /* ── Oreo — Dalmatian (cookie-colored) ── */
  oreo: `
    <ellipse cx="100" cy="170" rx="56" ry="9" fill="#000" opacity=".16"/>
    <g class="rig">
      <rect x="68" y="130" width="13" height="34" rx="6.5" fill="#e6e4dd"/>
      <rect x="118" y="130" width="13" height="34" rx="6.5" fill="#e6e4dd"/>
      <circle cx="74" cy="150" r="4" fill="#23262b"/>
      <g class="tail" style="transform-origin:56px 112px">
        <path d="M56 116 Q30 110 20 88 Q36 96 48 110 Q54 110 60 113 Z" fill="#fbfaf6"/>
        <path d="M20 88 q-4 -6 2 -10 q6 4 6 12 Z" fill="#23262b"/>
      </g>
      <ellipse cx="94" cy="116" rx="52" ry="29" fill="#fbfaf6"/>
      <circle cx="72" cy="108" r="9" fill="#23262b"/>
      <circle cx="98" cy="122" r="11" fill="#23262b"/>
      <circle cx="120" cy="106" r="7.5" fill="#23262b"/>
      <circle cx="84" cy="130" r="5.5" fill="#23262b"/>
      <circle cx="116" cy="128" r="6.5" fill="#23262b"/>
      <rect x="62" y="132" width="14" height="34" rx="7" fill="#fbfaf6"/>
      <rect x="124" y="132" width="14" height="34" rx="7" fill="#fbfaf6"/>
      <circle cx="131" cy="150" r="4.5" fill="#23262b"/>
      <g class="head">
        <circle cx="150" cy="98" r="27" fill="#fbfaf6"/>
        <circle cx="146" cy="88" r="8.5" fill="#23262b"/>
        <g class="ear-tw" style="transform-origin:134px 84px">
          <path d="M136 86 Q118 82 116 116 Q128 118 138 100 Z" fill="#23262b"/>
        </g>
        <path d="M166 84 Q184 84 184 112 Q172 112 164 98 Z" fill="#23262b"/>
        <ellipse cx="176" cy="108" rx="15" ry="12" fill="#fbfaf6"/>
        <circle cx="189" cy="105" r="4.5" fill="#23262b"/>
        <path class="mouth" d="M181 114 q5 6 11 1" stroke="#8a8880" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M184 116 q3 6 7 3 q-1 -5 -7 -3 Z" fill="#e06e7a"/>
        <circle class="eye" cx="159" cy="94" r="4.8" fill="#2b2b2b"/>
        <circle cx="160.4" cy="92.4" r="1.6" fill="#fff"/>
      </g>
    </g>`,

  /* ── Anything — Cocker Spaniel ── */
  anything: `
    <ellipse cx="100" cy="168" rx="50" ry="9" fill="#000" opacity=".16"/>
    <g class="rig">
      <rect x="72" y="130" width="12" height="32" rx="6" fill="#8f6234"/>
      <rect x="112" y="130" width="12" height="32" rx="6" fill="#8f6234"/>
      <g class="tail" style="transform-origin:60px 114px">
        <path d="M60 116 Q44 104 44 90 Q54 96 62 110 Z" fill="#a5713f"/>
        <path d="M44 94 q-4 8 2 12 q6 -4 4 -12 Z" fill="#ecd9b8"/>
      </g>
      <ellipse cx="94" cy="118" rx="46" ry="26" fill="#a5713f"/>
      <path d="M52 132 q8 12 3 20 q10 -8 13 3 q8 -10 13 2 q8 -10 13 3 q9 -9 13 3 q5 -12 -2 -22 Z" fill="#c79256"/>
      <rect x="66" y="132" width="13" height="32" rx="6.5" fill="#a5713f"/>
      <rect x="118" y="132" width="13" height="32" rx="6.5" fill="#a5713f"/>
      <g class="head">
        <circle cx="150" cy="98" r="25" fill="#a5713f"/>
        <path d="M138 78 q12 -10 24 0 q-12 6 -24 0 Z" fill="#8f6234"/>
        <g class="ear-tw" style="transform-origin:134px 86px">
          <path d="M136 84 Q110 84 106 132 Q98 150 112 150 Q126 132 128 112 Q134 100 138 96 Z" fill="#8a5a2e"/>
        </g>
        <path d="M166 86 Q192 88 194 132 Q200 150 188 148 Q176 130 172 110 Q168 98 164 96 Z" fill="#8a5a2e"/>
        <ellipse cx="174" cy="108" rx="14" ry="11" fill="#c79256"/>
        <circle cx="186" cy="105" r="4.3" fill="#2b2b2b"/>
        <path class="mouth" d="M179 113 q4 5 9 1" stroke="#8f6234" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <circle class="eye" cx="158" cy="94" r="5.2" fill="#3a2510"/>
        <circle cx="159.6" cy="92.2" r="1.8" fill="#fff"/>
      </g>
    </g>`
};

// Static roster — order, names, breeds, pronouns, and per-dog loser reactions.
const BREEDS = [
  { key: 'pita',     name: 'Pita',     breed: 'Yorkshire Terrier', pronouns: 'she/her',   loser: 'plays a sad piano', emoji: '🎹' },
  { key: 'fanta',    name: 'No one',   breed: 'Corgi',             pronouns: 'he/him',    loser: 're-fights instantly', emoji: '😾' },
  { key: 'lupita',   name: 'Lupita',   breed: 'Border Collie',     pronouns: 'she/her',   loser: 'trains, then revenge', emoji: '💪' },
  { key: 'oreo',     name: 'Oreo',     breed: 'Dalmatian',         pronouns: 'she/her',   loser: 'stress-eats an Oreo', emoji: '🍪' },
  { key: 'anything', name: 'Anything', breed: 'Cocker Spaniel',    pronouns: 'they/them', loser: 'gives up easily', emoji: '🤷' }
];

// A rare, calm, sky-blue dolphin. Ambient only — it swims by, sometimes pauses
// to look at a dog, then swims on. Faces RIGHT; flipped to swim left.
const DOLPHIN_SVG = `
  <g class="rig">
    <!-- tail flukes -->
    <path d="M16 62 Q2 46 8 42 Q22 52 30 60 Z" fill="#3fa3cf"/>
    <path d="M16 62 Q2 82 8 86 Q22 74 30 66 Z" fill="#3fa3cf"/>
    <!-- body -->
    <path d="M24 62 Q78 26 148 42 Q176 49 192 68 Q150 66 118 68 Q78 74 42 76 Q28 72 24 62 Z" fill="#4fb3d9"/>
    <!-- lighter belly -->
    <path d="M42 76 Q78 74 118 68 Q150 66 192 68 Q170 84 120 86 Q80 86 50 82 Z" fill="#bfe6f5"/>
    <!-- beak/snout -->
    <path d="M186 66 Q200 63 200 70 Q195 74 184 72 Z" fill="#4fb3d9"/>
    <!-- dorsal fin -->
    <path class="fin" d="M96 44 Q104 20 122 42 Z" fill="#3fa3cf" style="transform-origin:108px 44px"/>
    <!-- pectoral fin -->
    <path d="M98 74 Q106 96 124 82 Q114 74 98 74 Z" fill="#2f93bf"/>
    <!-- eye + smile -->
    <circle class="d-eye" cx="172" cy="60" r="3.2" fill="#0e2a38"/>
    <circle cx="173" cy="59" r="1" fill="#fff"/>
    <path d="M180 68 q6 3 12 0" stroke="#2a6d88" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  </g>`;

function buildDogSVG(key) {
  return `<svg viewBox="0 0 200 190" class="dog-svg dog-${key}" xmlns="http://www.w3.org/2000/svg">${SVG[key]}</svg>`;
}
function buildDolphinSVG() {
  return `<svg viewBox="0 0 200 120" class="dolphin-svg" xmlns="http://www.w3.org/2000/svg">${DOLPHIN_SVG}</svg>`;
}

window.Sprites = { SVG, BREEDS, buildDogSVG, buildDolphinSVG };
