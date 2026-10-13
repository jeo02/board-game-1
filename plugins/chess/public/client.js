// Chess client, styled after chess.com. Loaded on demand by the host site via
// dynamic import(); renders plain DOM from the per-player JSON frames and
// sends moves through host.act() (reliable and acknowledged). The server
// sends the legal moves for whoever is to move, so no rules live here.
//
// Pieces are Colin M. L. Burnett's "Cburnett" set (BSD license).

const STYLE_ID = "chess-plugin-styles";
const FILES = "abcdefgh";
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w";
const VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
const FULL_SET = { P: 8, N: 2, B: 2, R: 2, Q: 1 };
const PROMOTIONS = ["q", "n", "r", "b"];

const stroke =
  'stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
const PAWN_PATH =
  "m22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z";
const KNIGHT_PATHS = (fill) =>
  `<path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="${fill}"/>
  <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.99-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.99 2.5-3c1 0 1 3 1 3" fill="${fill}"/>`;
const BISHOP_BODY = `<path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/>
  <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
  <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>`;
const QUEEN_BODY = `<path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/>
  <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/>
  <circle cx="6" cy="12" r="2"/><circle cx="14" cy="9" r="2"/><circle cx="22.5" cy="8" r="2"/><circle cx="31" cy="9" r="2"/><circle cx="39" cy="12" r="2"/>`;
const KING_BODY = (fill) =>
  `<path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/>
  <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="${fill}" stroke-linecap="butt" stroke-linejoin="miter"/>
  <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill="${fill}"/>`;
const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">${body}</svg>`;
const PIECES = {
  wP: svg(`<path d="${PAWN_PATH}" fill="#fff" ${stroke}/>`),
  bP: svg(`<path d="${PAWN_PATH}" fill="#000" ${stroke}/>`),
  wN: svg(
    `<g fill="none" fill-rule="evenodd" ${stroke}>${KNIGHT_PATHS("#fff")}
    <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#000"/>
    <path d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0z" transform="matrix(.866 .5 -.5 .866 9.693 -5.173)" fill="#000"/></g>`,
  ),
  bN: svg(
    `<g fill="none" fill-rule="evenodd" ${stroke}>${KNIGHT_PATHS("#000")}
    <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#fff" stroke="#fff"/>
    <path d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0z" transform="matrix(.866 .5 -.5 .866 9.693 -5.173)" fill="#fff" stroke="#fff"/>
    <path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="#fff" stroke="none"/></g>`,
  ),
  wB: svg(
    `<g fill="none" fill-rule="evenodd" ${stroke}><g fill="#fff" stroke-linecap="butt">${BISHOP_BODY}</g>
    <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter"/></g>`,
  ),
  bB: svg(
    `<g fill="none" fill-rule="evenodd" ${stroke}><g fill="#000" stroke-linecap="butt">${BISHOP_BODY}</g>
    <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#fff" stroke-linejoin="miter"/></g>`,
  ),
  wR: svg(
    `<g fill="#fff" fill-rule="evenodd" ${stroke}>
    <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="butt"/>
    <path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17" stroke-linecap="butt" stroke-linejoin="miter"/>
    <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23" fill="none" stroke-linejoin="miter"/></g>`,
  ),
  bR: svg(
    `<g fill="#000" fill-rule="evenodd" ${stroke}>
    <path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" stroke-linecap="butt"/>
    <path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt" stroke-linejoin="miter"/>
    <path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" stroke-linecap="butt"/>
    <path d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23" fill="none" stroke="#fff" stroke-width="1" stroke-linejoin="miter"/></g>`,
  ),
  wQ: svg(
    `<g fill="#fff" ${stroke}>${QUEEN_BODY}
    <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/></g>`,
  ),
  bQ: svg(
    `<g fill="#000" ${stroke}>${QUEEN_BODY}
    <path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke-linecap="butt"/>
    <path d="M11 29a35 35 1 0 1 23 0M12.5 31.5h20M11.5 34.5a35 35 1 0 0 22 0M10.5 37.5a35 35 1 0 0 24 0" fill="none" stroke="#fff"/></g>`,
  ),
  wK: svg(
    `<g fill="none" fill-rule="evenodd" ${stroke}>${KING_BODY("#fff")}
    <path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/></g>`,
  ),
  bK: svg(
    `<g fill="none" fill-rule="evenodd" ${stroke}>${KING_BODY("#000")}
    <path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5v2.1-2.1C20 18 10.85 14 6.97 19.85 4.5 25.5 13 29.5 13 29.5" stroke="#fff"/>
    <path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0" stroke="#fff"/></g>`,
  ),
};
const ROBOT = `<svg viewBox="0 0 24 24" width="62%" height="62%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 17h5"/></svg>`;

const CSS = `
.cx-stage{--light:#ebecd0;--dark:#739552;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:start;background:#312e2b;border-radius:12px;padding:18px;color:#fff;font-family:"DM Sans",system-ui,sans-serif;user-select:none;-webkit-user-select:none}
.cx-main{width:min(100%,max(300px,calc(100vh - 150px)),780px);justify-self:center;display:flex;flex-direction:column;gap:8px}
.cx-bar{display:flex;align-items:center;gap:10px;min-height:44px}
.cx-avatar{width:40px;height:40px;border-radius:4px;display:grid;place-items:center;font:800 18px Manrope,sans-serif;flex-shrink:0}
.cx-avatar.w{background:#f0efe9;color:#312e2b}
.cx-avatar.b{background:#1f1d1b;color:#f0efe9;box-shadow:inset 0 0 0 1px #4b4845}
.cx-who{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.cx-who strong{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cx-who strong small{font-weight:500;color:#a7a6a2;margin-left:6px;font-size:12px}
.cx-taken{display:flex;align-items:center;height:18px}
.cx-taken i{width:18px;height:18px;margin-right:-7px;background-size:contain;flex-shrink:0}
.cx-taken i.gap{margin-left:9px}
.cx-taken i[class^="pc-b"]{filter:drop-shadow(0 0 1px #ffffffa6)}
.cx-taken b{margin-left:12px;font-size:12px;color:#a7a6a2;font-weight:600}
.cx-thinking{font-size:12px;color:#a7a6a2}
.cx-dots::after{content:"";animation:cx-dots 1.2s steps(4) infinite}
@keyframes cx-dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}
.cx-clock{min-width:112px;box-sizing:border-box;padding:6px 12px;border-radius:4px;font:700 23px/1.25 ui-monospace,Consolas,"Roboto Mono",monospace;text-align:right;font-variant-numeric:tabular-nums;opacity:.55;display:flex;align-items:center;justify-content:flex-end;gap:8px}
.cx-clock.w{background:#fff;color:#312e2b}
.cx-clock.b{background:#262421;color:#fff}
.cx-clock.on{opacity:1}
.cx-clock.on.low{background:#b33430;color:#fff}
.cx-clock i{width:8px;height:8px;border-radius:50%;background:currentColor;opacity:0}
.cx-clock.on i{opacity:.75;animation:cx-blink 1s infinite}
@keyframes cx-blink{50%{opacity:.2}}
.cx-clock[hidden]{display:none}
.cx-board{position:relative;width:100%;aspect-ratio:1;border-radius:3px;overflow:hidden;touch-action:none;cursor:pointer;box-shadow:0 6px 24px #0006}
.cx-squares{position:absolute;inset:0;display:grid;grid-template:repeat(8,1fr)/repeat(8,1fr)}
.cx-sq{position:relative;background:var(--light)}
.cx-sq.d{background:var(--dark)}
.cx-sq.hl.l{background:#f5f682}
.cx-sq.hl.d{background:#b9ca43}
.cx-sq.mark.l{background:#eb7d6a}
.cx-sq.mark.d{background:#d36c50}
.cx-sq.check{background-image:radial-gradient(ellipse at center,#ff0000 0%,#e70000 25%,#a9000000 89%)}
.cx-sq.over{box-shadow:inset 0 0 0 4px #ffffffa6}
.cx-sq.hint::after{content:"";position:absolute;inset:34%;border-radius:50%;background:#00000024}
.cx-sq.hint.cap::after{inset:0;background:none;border:7px solid #00000024}
.cx-coord{position:absolute;font:700 clamp(9px,1.4vw,13px)/1 "DM Sans",sans-serif;pointer-events:none}
.cx-coord.rank{top:3px;left:4px}
.cx-coord.file{bottom:3px;right:4px}
.cx-sq.l .cx-coord{color:var(--dark)}
.cx-sq.d .cx-coord{color:var(--light)}
.cx-pieces{position:absolute;inset:0;pointer-events:none}
.cx-p{position:absolute;top:0;left:0;width:12.5%;height:12.5%;background-size:100%;background-repeat:no-repeat}
.cx-p.anim{transition:transform .15s ease-out}
.cx-p.drag{z-index:6;cursor:grabbing}
.cx-arrows{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5}
.cx-shade{position:absolute;inset:0;background:#00000059;z-index:7}
.cx-promo{position:absolute;z-index:8;width:12.5%;display:flex;flex-direction:column;background:#fff;box-shadow:0 6px 24px #000a;border-radius:4px;overflow:hidden}
.cx-promo button{all:unset;aspect-ratio:1;background-size:88%;background-position:center;background-repeat:no-repeat;cursor:pointer}
.cx-promo button:hover,.cx-promo button:focus-visible{background-color:#e8e8e8}
.cx-promo .x{aspect-ratio:auto;height:26px;text-align:center;font:700 14px/26px "DM Sans",sans-serif;color:#8b8987;background:#f1f1f1}
.cx-over{position:absolute;inset:0;display:grid;place-items:center;z-index:9;background:#0000004d}
.cx-over[hidden]{display:none}
.cx-card{width:min(310px,86%);background:#262421;border-radius:8px;overflow:hidden;box-shadow:0 14px 44px #000b;text-align:center}
.cx-card-top{padding:18px 16px 14px;background:#3c3a37}
.cx-card.won .cx-card-top{background:#81b64c}
.cx-card h3{margin:0;font:800 26px Manrope,sans-serif;letter-spacing:-.5px}
.cx-card-top p{margin:4px 0 0;color:#ffffffc4;font-size:13px}
.cx-score{display:flex;align-items:center;justify-content:center;gap:14px;padding:18px 10px 16px}
.cx-score .cx-avatar{width:56px;height:56px;font-size:24px}
.cx-score b{font:800 22px Manrope,sans-serif;min-width:52px}
.cx-score span{display:block;font-size:11px;color:#a7a6a2;margin-top:4px;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-card-actions{display:flex;flex-direction:column;gap:8px;padding:0 16px 16px}
.cx-card small{color:#8b8987;font-size:11px}
.cx-btn{all:unset;box-sizing:border-box;cursor:pointer;text-align:center;border-radius:6px;padding:10px 14px;font:700 14px "DM Sans",sans-serif;background:#3c3a37;color:#fff;transition:background .12s}
.cx-btn:hover:not([disabled]){background:#4a4845}
.cx-btn.go{background:#81b64c;box-shadow:0 4px 0 #45753c;font:800 18px Manrope,sans-serif;padding:13px}
.cx-btn.go:hover:not([disabled]){background:#95c562}
.cx-btn.warn{background:#b33430}
.cx-btn.warn:hover:not([disabled]){background:#c8423c}
.cx-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
.cx-btn[disabled]{opacity:.45;cursor:default}
.cx-side{background:#262421;border-radius:8px;display:flex;flex-direction:column;min-height:440px;max-height:min(calc(100vh - 60px),860px);overflow:hidden}
.cx-head{padding:14px 16px 12px;border-bottom:1px solid #3c3a37}
.cx-head strong{display:block;font:800 16px Manrope,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-head span{font-size:12px;color:#a7a6a2}
.cx-status{padding:11px 16px;font-size:13px;line-height:1.45;color:#e2e1df;min-height:20px}
.cx-status em{display:block;font-style:normal;color:#a7a6a2;font-size:12px}
.cx-offer{margin:0 12px 10px;padding:11px;border-radius:6px;background:#3c3a37;font-size:13px;display:flex;flex-direction:column;gap:9px}
.cx-offer[hidden]{display:none}
.cx-offer div{display:flex;gap:6px}
.cx-offer .cx-btn{flex:1;padding:8px;font:700 13px "DM Sans",sans-serif;background:#555250}
.cx-offer .cx-btn.go{background:#81b64c;box-shadow:0 3px 0 #45753c}
.cx-moves{flex:1;overflow-y:auto;margin:0;padding:4px 0;list-style:none;font-size:13px;min-height:150px;border-top:1px solid #3c3a37}
.cx-moves li{display:grid;grid-template-columns:42px 1fr 1fr;align-items:center;padding:1px 8px}
.cx-moves li:nth-child(even){background:#2b2927}
.cx-moves .n{color:#8b8987;padding-left:6px}
.cx-moves button{all:unset;cursor:pointer;padding:3px 7px;border-radius:3px;font-weight:600;color:#d4d3d1;justify-self:start}
.cx-moves button:hover{background:#3c3a37}
.cx-moves button.now{background:#4b4847;color:#fff;box-shadow:inset 0 -2px 0 #6c6967}
.cx-moves button:focus-visible{outline:2px solid #fff}
.cx-moves li.none{display:block;padding:12px 16px;color:#8b8987}
.cx-nav{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:8px 10px;border-top:1px solid #3c3a37}
.cx-nav button{all:unset;cursor:pointer;text-align:center;padding:6px 0;border-radius:4px;background:#3c3a37;color:#d4d3d1;font-size:14px}
.cx-nav button:hover:not([disabled]){background:#4a4845}
.cx-nav button[disabled]{opacity:.4;cursor:default}
.cx-nav button:focus-visible{outline:2px solid #fff}
.cx-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 10px 12px}
.cx-actions .cx-btn{padding:9px 6px;font-size:13px}
.cx-actions .cx-btn.go{grid-column:1/-1;font-size:16px}
.cx-tools{display:flex;gap:6px;padding:0 10px 12px}
.cx-tools .cx-btn{flex:1;padding:7px 6px;font-size:12px;background:transparent;box-shadow:inset 0 0 0 1px #4a4845;color:#c3c2c1}
.cx-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:900px){.cx-stage{grid-template-columns:1fr;padding:10px;gap:12px}.cx-main{width:min(100%,max(280px,calc(100vh - 130px)))}.cx-side{min-height:0;max-height:none}.cx-moves{max-height:140px;min-height:60px}.cx-clock{min-width:92px;font-size:19px}}
${Object.entries(PIECES)
  .map(
    ([key, art]) =>
      `.cx-stage .pc-${key}{background-image:url("data:image/svg+xml,${encodeURIComponent(art)}")}`,
  )
  .join("\n")}
`;

const escape = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const toIndex = (name) => (Number(name[1]) - 1) * 8 + FILES.indexOf(name[0]);
const toName = (i) => FILES[i % 8] + (Math.floor(i / 8) + 1);
const pad = (n) => String(n).padStart(2, "0");

function parseBoard(fen) {
  const board = Array(64).fill(null);
  fen
    .split(" ")[0]
    .split("/")
    .forEach((row, r) => {
      let file = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) file += Number(ch);
        else
          board[(7 - r) * 8 + file++] =
            (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase();
      }
    });
  return board;
}

// Replays a move on a board array; the server already checked it's legal.
function applyMove(board, move) {
  const next = board.slice();
  const from = toIndex(move.slice(0, 2));
  const to = toIndex(move.slice(2, 4));
  const piece = next[from];
  if (!piece) return next;
  if (piece[1] === "P" && from % 8 !== to % 8 && !next[to])
    next[to + (piece[0] === "w" ? -8 : 8)] = null;
  if (piece[1] === "K" && Math.abs(to - from) === 2) {
    const kingSide = to > from;
    next[kingSide ? from + 1 : from - 1] = next[kingSide ? from + 3 : from - 4];
    next[kingSide ? from + 3 : from - 4] = null;
  }
  next[to] = move[4] ? piece[0] + move[4].toUpperCase() : piece;
  next[from] = null;
  return next;
}

let audio = null;
let noiseBuffer = null;
function playSound(kind) {
  try {
    audio ??= new AudioContext();
    if (!noiseBuffer) {
      noiseBuffer = audio.createBuffer(
        1,
        audio.sampleRate * 0.12,
        audio.sampleRate,
      );
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const now = audio.currentTime;
    const knock = (at, freq, volume) => {
      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      source.buffer = noiseBuffer;
      filter.type = "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      gain.gain.setValueAtTime(volume, now + at);
      gain.gain.exponentialRampToValueAtTime(0.001, now + at + 0.09);
      source.connect(filter).connect(gain).connect(audio.destination);
      source.start(now + at);
      source.stop(now + at + 0.12);
    };
    const tone = (at, freq, length, volume = 0.12) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, now + at);
      gain.gain.exponentialRampToValueAtTime(0.001, now + at + length);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + at);
      osc.stop(now + at + length);
    };
    if (kind === "capture") {
      knock(0, 900, 1.4);
      knock(0.045, 1500, 0.7);
    } else if (kind === "check") {
      knock(0, 1300, 1);
      tone(0.02, 880, 0.18);
    } else if (kind === "end") {
      tone(0, 523, 0.25);
      tone(0.12, 659, 0.25);
      tone(0.24, 784, 0.4);
    } else knock(0, 1300, 1);
  } catch {}
}

export function mount(el, host) {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.append(style);
  }
  const stage = document.createElement("div");
  stage.className = "cx-stage";
  stage.innerHTML = `
    <div class="cx-main">
      <div class="cx-bar" data-k="top"></div>
      <div class="cx-board" role="application" aria-label="Chess board" aria-describedby="cx-help">
        <div class="cx-squares"></div>
        <div class="cx-pieces"></div>
        <svg class="cx-arrows" viewBox="0 0 8 8" aria-hidden="true"></svg>
        <div data-k="promo"></div>
        <div class="cx-over" data-k="over" hidden></div>
      </div>
      <div class="cx-bar" data-k="bottom"></div>
    </div>
    <aside class="cx-side" aria-label="Game panel">
      <div class="cx-head"><strong data-k="title">Chess</strong><span data-k="control"></span></div>
      <div class="cx-status" data-k="status" aria-live="polite"></div>
      <div class="cx-offer" data-k="offer" hidden></div>
      <ol class="cx-moves" data-k="moves" aria-label="Moves"></ol>
      <div class="cx-nav">
        <button type="button" data-nav="first" aria-label="First move">⏮</button>
        <button type="button" data-nav="back" aria-label="Previous move">◀</button>
        <button type="button" data-nav="next" aria-label="Next move">▶</button>
        <button type="button" data-nav="live" aria-label="Latest move">⏭</button>
      </div>
      <div class="cx-actions" data-k="actions"></div>
      <div class="cx-tools">
        <button type="button" class="cx-btn" data-tool="flip">⇅ Flip board</button>
        <button type="button" class="cx-btn" data-tool="sound" aria-pressed="true"></button>
      </div>
      <p class="cx-sr" id="cx-help">Drag a piece or click it and then a highlighted square. Use the arrow keys to step through the moves.</p>
      <p class="cx-sr" data-k="spoken" aria-live="polite"></p>
    </aside>`;
  el.append(stage);
  const parts = Object.fromEntries(
    [...stage.querySelectorAll("[data-k]")].map((n) => [n.dataset.k, n]),
  );
  const boardEl = stage.querySelector(".cx-board");
  const squaresEl = stage.querySelector(".cx-squares");
  const piecesEl = stage.querySelector(".cx-pieces");
  const arrowsEl = stage.querySelector(".cx-arrows");
  const soundButton = stage.querySelector('[data-tool="sound"]');

  let f = null;
  let frameAt = 0;
  let boards = [parseBoard(START)];
  let view = null; // ply being reviewed, or null for the live position
  let selected = null;
  let drag = null;
  let promo = null;
  let optimistic = null;
  let animate = null;
  let flipped = false;
  let confirmResign = 0;
  let overlayClosed = false;
  let soundOn = localStorage.getItem("chessSound") !== "off";
  let rightFrom = null;
  const marks = new Set();
  const arrows = new Set();
  let legalFrom = new Map();
  let squareEls = [];
  let pieceEls = new Map();
  let piecesKey = "";
  let movesKey = "";
  let lastSound = -1;
  let raf = 0;
  const clocks = {};

  const mySide = () => f?.you ?? "w";
  const sideIndex = (side) => (side === "w" ? 0 : 1);
  const plies = () => f?.moves.length ?? 0;
  const shownPly = () => view ?? plies();
  const isLive = () => view === null;
  const bottomSide = () => ((mySide() === "w") !== flipped ? "w" : "b");
  const seat = (side) => f.players[sideIndex(side)];
  const nameOf = (side) => {
    const p = seat(side);
    return p.bot ? "Computer" : p.name;
  };
  const levelLabel = (level) =>
    host.getRoom()?.meta?.bots?.levels?.find((l) => l.value === level)?.label ??
    level;

  // Display position (row/col from the top-left) for a board index.
  const cellOf = (i) => {
    const rank = Math.floor(i / 8);
    const file = i % 8;
    return bottomSide() === "w"
      ? { row: 7 - rank, col: file }
      : { row: rank, col: 7 - file };
  };
  const indexAt = (row, col) =>
    bottomSide() === "w" ? (7 - row) * 8 + col : row * 8 + (7 - col);
  function squareAt(e) {
    const rect = boardEl.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * 8);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * 8);
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return indexAt(row, col);
  }

  // The live position comes straight from the server; replayed boards are
  // only used to review earlier moves.
  function shownBoard() {
    if (!isLive()) return boards[view];
    const board = parseBoard(f.fen);
    return optimistic ? applyMove(board, optimistic) : board;
  }
  const lastMove = () =>
    isLive() && optimistic ? optimistic : f.moves[shownPly() - 1]?.uci;
  const sideToMove = (ply) => (ply % 2 === 0 ? "w" : "b");

  function syncHistory() {
    // Rebuild if this frame's history doesn't extend what we replayed.
    const known = boards.length - 1;
    if (known > f.moves.length) boards = [parseBoard(START)];
    while (boards.length <= f.moves.length)
      boards.push(applyMove(boards.at(-1), f.moves[boards.length - 1].uci));
    legalFrom = new Map();
    const board = parseBoard(f.fen);
    for (const move of f.legal) {
      const from = toIndex(move.slice(0, 2));
      const dest = toIndex(move.slice(2, 4));
      // Castling is done deliberately: king first, then its rook. The
      // king's two-square jump itself isn't a clickable target.
      const castle = board[from]?.[1] === "K" && Math.abs(dest - from) === 2;
      if (!legalFrom.has(from)) legalFrom.set(from, []);
      legalFrom.get(from).push({
        to: castle ? (dest > from ? from + 3 : from - 4) : dest,
        dest,
        promotion: move[4] ?? "",
      });
    }
  }

  const canMove = () =>
    f && !f.result && isLive() && !optimistic && f.legal.length > 0;
  const targets = (from) => (canMove() ? (legalFrom.get(from) ?? []) : []);

  function buildSquares() {
    squaresEl.innerHTML = "";
    squareEls = Array(64);
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 8; col++) {
        const i = indexAt(row, col);
        const sq = document.createElement("div");
        sq.className = `cx-sq ${(Math.floor(i / 8) + (i % 8)) % 2 ? "l" : "d"}`;
        sq.dataset.square = toName(i);
        if (col === 0)
          sq.insertAdjacentHTML(
            "beforeend",
            `<span class="cx-coord rank">${Math.floor(i / 8) + 1}</span>`,
          );
        if (row === 7)
          sq.insertAdjacentHTML(
            "beforeend",
            `<span class="cx-coord file">${FILES[i % 8]}</span>`,
          );
        squaresEl.append(sq);
        squareEls[i] = sq;
      }
    piecesKey = "";
  }

  function renderSquares(board) {
    const last = lastMove();
    const lit = new Set(
      last ? [toIndex(last.slice(0, 2)), toIndex(last.slice(2, 4))] : [],
    );
    if (selected !== null) lit.add(selected);
    const hints = new Map(targets(selected).map((t) => [t.to, true]));
    // The king of the side to move is in check if the last move gave check.
    const san = f.moves[shownPly() - 1]?.san ?? "";
    const checked =
      !optimistic && /[+#]$/.test(san)
        ? board.indexOf(sideToMove(shownPly()) + "K")
        : -1;
    squareEls.forEach((sq, i) => {
      sq.classList.toggle("hl", lit.has(i) && !marks.has(i));
      sq.classList.toggle("mark", marks.has(i));
      sq.classList.toggle("check", i === checked);
      sq.classList.toggle("hint", hints.has(i));
      sq.classList.toggle("cap", hints.has(i) && !!board[i]);
    });
  }

  const place = (node, i) => {
    const { row, col } = cellOf(i);
    node.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
  };
  function renderPieces(board) {
    const key = `${board.join(",")}|${bottomSide()}`;
    if (key === piecesKey && !animate) return;
    piecesKey = key;
    piecesEl.innerHTML = "";
    pieceEls = new Map();
    board.forEach((piece, i) => {
      if (!piece) return;
      const node = document.createElement("div");
      node.className = `cx-p pc-${piece}`;
      place(node, i);
      piecesEl.append(node);
      pieceEls.set(i, node);
    });
    if (animate) {
      const node = pieceEls.get(animate.to);
      if (node) {
        place(node, animate.from);
        node.getBoundingClientRect();
        node.classList.add("anim");
        place(node, animate.to);
      }
      animate = null;
    }
  }

  function renderArrows() {
    const center = (i) => {
      const { row, col } = cellOf(i);
      return { x: col + 0.5, y: row + 0.5 };
    };
    arrowsEl.innerHTML = [...arrows]
      .map((key) => {
        const [a, b] = key.split("-").map(Number).map(center);
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const [ux, uy] = [(b.x - a.x) / length, (b.y - a.y) / length];
        const [px, py] = [-uy, ux];
        const [shaft, head, headLength, start] = [0.09, 0.24, 0.42, 0.22];
        const [sx, sy] = [a.x + ux * start, a.y + uy * start];
        const [ex, ey] = [b.x - ux * headLength, b.y - uy * headLength];
        const points = [
          [sx + px * shaft, sy + py * shaft],
          [ex + px * shaft, ey + py * shaft],
          [ex + px * head, ey + py * head],
          [b.x, b.y],
          [ex - px * head, ey - py * head],
          [ex - px * shaft, ey - py * shaft],
          [sx - px * shaft, sy - py * shaft],
        ];
        return `<polygon points="${points.map((p) => p.map((n) => n.toFixed(3)).join(",")).join(" ")}" fill="#ffaa00" opacity=".8"/>`;
      })
      .join("");
  }

  function renderPromo() {
    if (!promo) {
      parts.promo.innerHTML = "";
      return;
    }
    const color = mySide();
    const { row, col } = cellOf(promo.to);
    const down = row === 0;
    const buttons = PROMOTIONS.map(
      (p) =>
        `<button type="button" class="pc-${color}${p.toUpperCase()}" data-promo="${p}" aria-label="Promote to ${{ q: "queen", n: "knight", r: "rook", b: "bishop" }[p]}"></button>`,
    );
    const close = `<button type="button" class="x" data-promo="" aria-label="Cancel promotion">✕</button>`;
    parts.promo.innerHTML = `<div class="cx-shade" data-promo=""></div>
      <div class="cx-promo" style="left:${col * 12.5}%;${down ? "top:0" : "bottom:0"}">${(down ? [...buttons, close] : [close, ...buttons.reverse()]).join("")}</div>`;
    parts.promo.querySelector("[data-promo]:not(.x):not(.cx-shade)")?.focus();
  }

  function takenHtml(side, board) {
    // Pieces this side has captured: the opponent's missing pieces.
    const enemy = side === "w" ? "b" : "w";
    const counts = Object.fromEntries(Object.keys(FULL_SET).map((t) => [t, 0]));
    let mine = 0;
    let theirs = 0;
    for (const piece of board) {
      if (!piece) continue;
      if (piece[0] === enemy && piece[1] in counts) counts[piece[1]]++;
      if (piece[0] === side) mine += VALUES[piece[1]];
      else theirs += VALUES[piece[1]];
    }
    let html = "";
    for (const type of ["P", "N", "B", "R", "Q"]) {
      const missing = Math.max(0, FULL_SET[type] - counts[type]);
      for (let i = 0; i < missing; i++)
        html += `<i class="pc-${enemy}${type}${i === 0 && html ? " gap" : ""}"></i>`;
    }
    if (mine > theirs) html += `<b>+${mine - theirs}</b>`;
    return html;
  }

  function renderBar(node, side, board) {
    const p = seat(side);
    const you = f.you === side;
    const thinking = f.thinking && p.bot && f.turn === side;
    const tag = p.bot ? levelLabel(p.bot) : you ? "you" : "";
    const avatar = p.bot
      ? ROBOT
      : escape(nameOf(side).slice(0, 1).toUpperCase());
    node.innerHTML = `
      <div class="cx-avatar ${side}">${avatar}</div>
      <div class="cx-who">
        <strong>${escape(nameOf(side))}${tag ? `<small>${escape(tag)}</small>` : ""}</strong>
        <div class="cx-taken">${thinking ? `<span class="cx-dots cx-thinking">Thinking</span>` : takenHtml(side, board)}</div>
      </div>
      <div class="cx-clock ${side}" ${f.clock ? "" : "hidden"}><i></i><span></span></div>`;
    clocks[side] = node.querySelector(".cx-clock");
  }

  function renderMoves() {
    const key = `${f.moves.length}|${shownPly()}`;
    if (key === movesKey) return;
    movesKey = key;
    const rows = [];
    for (let i = 0; i < f.moves.length; i += 2) {
      const cell = (ply) =>
        f.moves[ply - 1]
          ? `<button type="button" data-ply="${ply}" class="${ply === shownPly() ? "now" : ""}">${escape(f.moves[ply - 1].san)}</button>`
          : "<span></span>";
      rows.push(
        `<li><span class="n">${i / 2 + 1}.</span>${cell(i + 1)}${cell(i + 2)}</li>`,
      );
    }
    parts.moves.innerHTML =
      rows.join("") || `<li class="none">White moves first.</li>`;
    const now = parts.moves.querySelector(".now");
    if (isLive()) parts.moves.scrollTop = parts.moves.scrollHeight;
    else now?.scrollIntoView({ block: "nearest" });
    const nav = (name, disabled) => {
      stage.querySelector(`[data-nav="${name}"]`).disabled = disabled;
    };
    nav("first", shownPly() === 0);
    nav("back", shownPly() === 0);
    nav("next", isLive());
    nav("live", isLive());
  }

  function statusHtml() {
    const opponent = f.you === "w" ? "b" : "w";
    if (f.result) {
      const { winner, how } = f.result;
      return winner === null
        ? `<strong>Draw</strong> ${escape(how)}.`
        : `<strong>${winner === f.you ? "You won" : `${escape(nameOf(winner))} won`}</strong> ${escape(how)}.`;
    }
    let text;
    if (!isLive())
      text = `Reviewing move ${Math.ceil(shownPly() / 2) || 1}. <em>Press → or click the board to get back to the game.</em>`;
    else if (f.turn === f.you)
      text = `<strong>Your move.</strong>${/[+]$/.test(f.moves.at(-1)?.san ?? "") ? " You’re in check!" : ""}`;
    else if (f.thinking)
      text = `<span class="cx-dots">The computer is thinking</span>`;
    else text = `Waiting for ${escape(nameOf(opponent))} to move…`;
    if (f.drawOffer === f.you) text += `<em>You offered a draw.</em>`;
    if (f.note) text += `<em>${escape(f.note)}</em>`;
    if (f.clock && f.moves.length < 2 && isLive())
      text += `<em>Clocks start after each side’s first move.</em>`;
    return text;
  }

  function renderPanel() {
    const room = host.getRoom();
    parts.title.textContent = `${nameOf("w")} vs ${nameOf("b")}`;
    const option = room?.meta?.settings
      ?.find((s) => s.key === "clock")
      ?.options.find((o) => String(o.value) === String(room.settings?.clock));
    parts.control.textContent = option?.label ?? "";
    parts.status.innerHTML = statusHtml();
    const offer = !f.result && f.drawOffer && f.drawOffer !== f.you;
    parts.offer.hidden = !offer;
    parts.offer.innerHTML = offer
      ? `<span><strong>${escape(nameOf(f.drawOffer))}</strong> offers a draw.</span>
        <div><button type="button" class="cx-btn go" data-act="draw">Accept</button><button type="button" class="cx-btn" data-act="decline">Decline</button></div>`
      : "";
    if (f.result)
      parts.actions.innerHTML = `<button type="button" class="cx-btn go" data-act="continue">See results</button>`;
    else {
      const resigning = performance.now() < confirmResign;
      parts.actions.innerHTML = `
        <button type="button" class="cx-btn" data-act="draw" ${f.drawOffer === f.you ? "disabled" : ""}>½ Draw</button>
        <button type="button" class="cx-btn ${resigning ? "warn" : ""}" data-act="resign">${resigning ? "Really resign?" : "⚑ Resign"}</button>`;
    }
    soundButton.textContent = soundOn ? "🔊 Sound on" : "🔈 Sound off";
    soundButton.setAttribute("aria-pressed", String(soundOn));
  }

  function renderOverlay() {
    const over = parts.over;
    if (!f.result || overlayClosed) {
      over.hidden = true;
      return;
    }
    const { winner, how } = f.result;
    const title =
      winner === null
        ? "Draw"
        : f.you
          ? winner === f.you
            ? "You Won!"
            : "You Lost"
          : `${winner === "w" ? "White" : "Black"} Won`;
    const score =
      winner === null ? "½ – ½" : winner === "w" ? "1 – 0" : "0 – 1";
    const face = (side) => {
      const p = seat(side);
      return `<div><div class="cx-avatar ${side}">${p.bot ? ROBOT : escape(nameOf(side).slice(0, 1).toUpperCase())}</div><span>${escape(nameOf(side))}</span></div>`;
    };
    const html = `<div class="cx-card ${winner && winner === f.you ? "won" : ""}" role="dialog" aria-label="${escape(title)}">
      <div class="cx-card-top"><h3>${title}</h3><p>${escape(how)}</p></div>
      <div class="cx-score">${face("w")}<b>${score}</b>${face("b")}</div>
      <div class="cx-card-actions">
        <button type="button" class="cx-btn go" data-act="continue">Continue</button>
        <button type="button" class="cx-btn" data-tool="review">Review the game</button>
        <small data-k="closes"></small>
      </div></div>`;
    if (over.dataset.html !== html) {
      over.dataset.html = html;
      over.innerHTML = html;
    }
    over.hidden = false;
  }

  function render() {
    if (!f) return;
    const board = shownBoard();
    if (squareEls.length !== 64 || squaresEl.dataset.side !== bottomSide()) {
      squaresEl.dataset.side = bottomSide();
      buildSquares();
    }
    renderSquares(board);
    if (!drag) renderPieces(board);
    renderArrows();
    renderPromo();
    const top = bottomSide() === "w" ? "b" : "w";
    renderBar(parts.top, top, board);
    renderBar(parts.bottom, bottomSide(), board);
    renderMoves();
    renderPanel();
    renderOverlay();
    tickClocks();
  }

  function clockText(side) {
    let left = f.clock.left[sideIndex(side)];
    if (f.clock.running === side) left -= (performance.now() - frameAt) / 1000;
    left = Math.max(0, left);
    if (left < 20)
      return `0:${pad(Math.floor(left))}.${Math.floor(left * 10) % 10}`;
    const whole = Math.floor(left);
    return whole >= 3600
      ? `${Math.floor(whole / 3600)}:${pad(Math.floor(whole / 60) % 60)}:${pad(whole % 60)}`
      : `${Math.floor(whole / 60)}:${pad(whole % 60)}`;
  }
  function tickClocks() {
    if (!f) return;
    if (f.clock)
      for (const side of ["w", "b"]) {
        const node = clocks[side];
        if (!node) continue;
        const text = clockText(side);
        const span = node.querySelector("span");
        if (span.textContent !== text) span.textContent = text;
        node.classList.toggle("on", f.clock.running === side);
        node.classList.toggle(
          "low",
          f.clock.left[sideIndex(side)] - (performance.now() - frameAt) / 1000 <
            20,
        );
      }
    const closes = stage.querySelector('[data-k="closes"]');
    if (closes && f.result) {
      const left = Math.max(
        0,
        Math.ceil(f.result.closesIn - (performance.now() - frameAt) / 1000),
      );
      const text = `Results in ${left}s`;
      if (closes.textContent !== text) closes.textContent = text;
    }
    if (confirmResign && performance.now() > confirmResign) {
      confirmResign = 0;
      renderPanel();
    }
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    tickClocks();
  }

  async function sendMove(from, to, promotion = "", dropped = false) {
    promo = null;
    selected = null;
    optimistic = toName(from) + toName(to) + promotion;
    if (!dropped) animate = { from, to };
    render();
    const ok = await host.act({
      type: "move",
      from: toName(from),
      to: toName(to),
      ...(promotion ? { promotion } : {}),
    });
    if (!ok) {
      optimistic = null;
      render();
    }
  }
  function tryMove(from, to, dropped) {
    const options = targets(from).filter((t) => t.to === to);
    if (!options.length) return false;
    if (options.some((t) => t.promotion)) {
      promo = { from, to };
      selected = null;
      render();
    } else sendMove(from, options[0].dest, "", dropped);
    return true;
  }
  async function act(type) {
    if (type === "resign" && performance.now() > confirmResign) {
      confirmResign = performance.now() + 3000;
      renderPanel();
      return;
    }
    confirmResign = 0;
    await host.act({ type });
  }
  const goTo = (ply) => {
    view = ply === null || ply >= plies() ? null : Math.max(0, ply);
    selected = null;
    promo = null;
    render();
  };

  const clearAnnotations = () => {
    if (!marks.size && !arrows.size) return false;
    marks.clear();
    arrows.clear();
    return true;
  };
  function onPointerDown(e) {
    if (!f || e.target.closest("[data-promo], .cx-over")) return;
    const sq = squareAt(e);
    if (e.button === 2) {
      rightFrom = sq;
      return;
    }
    if (e.button !== 0 || sq === null) return;
    const cleared = clearAnnotations();
    if (!isLive()) return goTo(null);
    if (promo) return;
    if (selected !== null && selected !== sq && tryMove(selected, sq, false))
      return;
    if (targets(sq).length) {
      const reselect = selected === sq;
      selected = sq;
      render();
      drag = {
        from: sq,
        id: e.pointerId,
        moved: false,
        reselect,
        node: pieceEls.get(sq),
        x: e.clientX,
        y: e.clientY,
        over: null,
      };
      boardEl.setPointerCapture(e.pointerId);
    } else if (selected !== null || cleared) {
      selected = null;
      render();
    }
  }
  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4)
      return;
    drag.moved = true;
    const rect = boardEl.getBoundingClientRect();
    const size = rect.width / 8;
    if (drag.node) {
      drag.node.classList.add("drag");
      drag.node.classList.remove("anim");
      drag.node.style.transform = `translate(${e.clientX - rect.left - size / 2}px, ${e.clientY - rect.top - size / 2}px)`;
    }
    const sq = squareAt(e);
    if (sq !== drag.over) {
      if (drag.over !== null) squareEls[drag.over]?.classList.remove("over");
      drag.over = sq;
      if (sq !== null) squareEls[sq]?.classList.add("over");
    }
  }
  function endDrag() {
    if (drag?.over !== null && drag?.over !== undefined)
      squareEls[drag.over]?.classList.remove("over");
    drag?.node?.classList.remove("drag");
    drag = null;
    piecesKey = "";
  }
  function onPointerUp(e) {
    if (e.button === 2) {
      const sq = squareAt(e);
      if (sq !== null && rightFrom !== null) {
        if (sq === rightFrom) marks.has(sq) ? marks.delete(sq) : marks.add(sq);
        else {
          const key = `${rightFrom}-${sq}`;
          arrows.has(key) ? arrows.delete(key) : arrows.add(key);
        }
        render();
      }
      rightFrom = null;
      return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    const { from, moved, reselect } = drag;
    const sq = squareAt(e);
    endDrag();
    if (moved && sq !== null && sq !== from && tryMove(from, sq, true)) return;
    if ((!moved && reselect) || (moved && sq !== from)) selected = null;
    render();
  }
  function onPointerCancel() {
    if (!drag) return;
    endDrag();
    render();
  }

  function onClick(e) {
    const promoButton = e.target.closest("[data-promo]");
    if (promoButton) {
      const choice = promoButton.dataset.promo;
      if (choice && promo) sendMove(promo.from, promo.to, choice);
      else {
        promo = null;
        render();
      }
      return;
    }
    const ply = e.target.closest("[data-ply]");
    if (ply) return goTo(Number(ply.dataset.ply));
    const nav = e.target.closest("[data-nav]")?.dataset.nav;
    if (nav) {
      const ply = shownPly();
      return goTo({ first: 0, back: ply - 1, next: ply + 1, live: null }[nav]);
    }
    const tool = e.target.closest("[data-tool]")?.dataset.tool;
    if (tool === "flip") {
      flipped = !flipped;
      selected = null;
      render();
    } else if (tool === "sound") {
      soundOn = !soundOn;
      localStorage.setItem("chessSound", soundOn ? "on" : "off");
      renderPanel();
    } else if (tool === "review") {
      overlayClosed = true;
      renderOverlay();
    }
    const type = e.target.closest("[data-act]")?.dataset.act;
    if (type && !e.target.closest("[data-act]").disabled) act(type);
  }
  function onKey(e) {
    if (!f || e.target.closest?.("input, textarea, select")) return;
    if (e.key === "Escape" && (promo || selected !== null)) {
      promo = null;
      selected = null;
      render();
      return;
    }
    const ply = shownPly();
    const target = {
      ArrowLeft: ply - 1,
      ArrowRight: ply + 1,
      ArrowUp: 0,
      Home: 0,
      ArrowDown: null,
      End: null,
    }[e.key];
    if (
      target === undefined ||
      e.target.closest?.("button:not([data-ply]):not([data-nav])")
    )
      return;
    e.preventDefault();
    goTo(target);
  }
  const onContextMenu = (e) => e.preventDefault();

  boardEl.addEventListener("pointerdown", onPointerDown);
  boardEl.addEventListener("pointermove", onPointerMove);
  boardEl.addEventListener("pointerup", onPointerUp);
  boardEl.addEventListener("pointercancel", onPointerCancel);
  boardEl.addEventListener("contextmenu", onContextMenu);
  stage.addEventListener("click", onClick);
  window.addEventListener("keydown", onKey);

  const offFrame = host.onFrame((next) => {
    if (!next || typeof next !== "object" || !next.fen) return;
    const previous = f;
    f = next;
    frameAt = performance.now();
    if (previous && previous.seq === next.seq) return;
    const before = previous?.moves.length ?? 0;
    syncHistory();
    if (next.moves.length > before) {
      const latest = next.moves.at(-1);
      // Animate moves we didn't just make ourselves.
      if (previous && latest.uci !== optimistic)
        animate = {
          from: toIndex(latest.uci.slice(0, 2)),
          to: toIndex(latest.uci.slice(2, 4)),
        };
      if (view !== null) view = null;
      selected = null;
      promo = null;
      parts.spoken.textContent = `${nameOf(sideToMove(next.moves.length - 1))} played ${latest.san}`;
      if (soundOn && lastSound !== next.moves.length && previous) {
        lastSound = next.moves.length;
        playSound(
          /[+#]$/.test(latest.san)
            ? "check"
            : latest.san.includes("x")
              ? "capture"
              : "move",
        );
      }
    }
    if (next.result && !previous?.result && previous && soundOn)
      playSound("end");
    optimistic = null;
    render();
    // Bring the whole board into view when the game first appears.
    if (!previous && stage.getBoundingClientRect().bottom > innerHeight)
      stage.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  raf = requestAnimationFrame(loop);

  return {
    update() {
      if (f) renderPanel();
    },
    destroy() {
      cancelAnimationFrame(raf);
      offFrame();
      boardEl.removeEventListener("pointerdown", onPointerDown);
      boardEl.removeEventListener("pointermove", onPointerMove);
      boardEl.removeEventListener("pointerup", onPointerUp);
      boardEl.removeEventListener("pointercancel", onPointerCancel);
      boardEl.removeEventListener("contextmenu", onContextMenu);
      stage.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      stage.remove();
    },
  };
}
