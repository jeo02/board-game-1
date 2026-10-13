const PIECES = {
  k: "\u265a",
  q: "\u265b",
  r: "\u265c",
  b: "\u265d",
  n: "\u265e",
  p: "\u265f",
};
const NAMES = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};
const CSS = `
.chess-stage{container-type:inline-size;background:#302e2b;color:#eeece8;padding:18px;border-radius:14px;font-family:system-ui,sans-serif}
.chess-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,240px);gap:18px;align-items:start}
.chess-board{container-type:inline-size;display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1;max-width:640px;width:100%}
.chess-square{position:relative;border:0;border-radius:0;aspect-ratio:1;padding:0;display:grid;place-items:center;background:#eeeed2;cursor:pointer;min-width:0;touch-action:manipulation}
.chess-square.dark{background:#769656}
.chess-square.last{box-shadow:inset 0 0 0 100px #f6df5355}
.chess-square.selected{box-shadow:inset 0 0 0 100px #f6df5399}
.chess-square.check{background:#cf5446}
.chess-square:focus-visible{z-index:1;outline:3px solid #f6df53;outline-offset:-3px}
.chess-piece{font-family:"Segoe UI Symbol","DejaVu Sans",serif;font-size:clamp(20px,10cqw,64px);line-height:1;color:#262522;filter:drop-shadow(0 2px 1px #0004);pointer-events:none}
.chess-piece.white{color:#fffaf0;text-shadow:1px 0 #383633,-1px 0 #383633,0 1px #383633,0 -1px #383633}
.chess-coordinate{position:absolute;font-size:10px;font-weight:700;color:#526940;pointer-events:none}
.chess-square.dark .chess-coordinate{color:#eeeed2}
.chess-file{bottom:2px;right:4px}.chess-rank{top:2px;left:4px}
.chess-square.legal:after{content:"";position:absolute;width:25%;height:25%;border-radius:50%;background:#0003;pointer-events:none}
.chess-square.legal.capture:after{width:88%;height:88%;border:5px solid #0003;background:transparent;box-sizing:border-box}
.chess-player{padding:10px 0;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:8px;overflow-wrap:anywhere}
.chess-player small{font-weight:400;color:#c5c0b8}
.chess-clock{flex:none;min-width:96px;text-align:right;padding:6px 12px;border-radius:4px;background:#262522;color:#8b8987;font:700 22px/1.1 system-ui,sans-serif;font-variant-numeric:tabular-nums}
.chess-clock.active{background:#fff;color:#262522}
.chess-clock.low{background:#7a2b25;color:#fff}.chess-clock.low.active{background:#e02828}
.chess-clock.flagged{background:#e02828;color:#fff}
.chess-panel{background:#262522;border-radius:10px;padding:14px;min-width:0}
.chess-status{font-size:17px;font-weight:700;margin:0 0 12px;line-height:1.4}
.chess-hint{font-size:12px;color:#c5c0b8;margin:8px 0}
.chess-moves{max-height:340px;overflow:auto;display:grid;grid-template-columns:32px 1fr 1fr;gap:6px;font-size:13px;padding:12px 0;font-variant-numeric:tabular-nums}
.chess-moves .number{color:#aaa49b}
.chess-controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.chess-btn{background:#45413c;color:#fff;border:0;border-radius:6px;padding:9px 12px;font:600 12px system-ui;cursor:pointer}
.chess-btn.green{background:#769656}.chess-btn:disabled{opacity:.5;cursor:default}.chess-btn:focus-visible{outline:3px solid #f6df53;outline-offset:2px}
.chess-promotion,.chess-confirm{background:#45413c;padding:12px;border-radius:8px;margin-top:12px}
.chess-promotion p,.chess-confirm p{margin:0 0 8px}
@container(max-width:600px){.chess-layout{grid-template-columns:1fr}.chess-moves{max-height:150px}}
@media(max-width:800px){.chess-stage{padding:10px}}
`;
const escape = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const colorName = (color) => (color === "w" ? "White" : "Black");
// chess.com style: m:ss, with tenths under 20 seconds.
export function formatClock(ms) {
  const t = Math.max(0, ms);
  if (t < 20000)
    return `0:${(Math.floor(t / 100) / 10).toFixed(1).padStart(4, "0")}`;
  const seconds = Math.ceil(t / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function mount(element, host) {
  if (!document.getElementById("chess-styles")) {
    const style = document.createElement("style");
    style.id = "chess-styles";
    style.textContent = CSS;
    document.head.append(style);
  }
  const stage = document.createElement("div");
  stage.className = "chess-stage";
  stage.innerHTML = `<div class="chess-layout"><div><div class="chess-player top"></div><div class="chess-board" role="group" aria-label="Chess board"></div><div class="chess-player bottom"></div></div><aside class="chess-panel"><p class="chess-status" role="status" aria-live="polite"></p><p class="chess-hint"></p><div class="chess-moves" aria-label="Move history"></div><div class="chess-promotion" hidden></div><div class="chess-confirm" hidden></div><div class="chess-controls"></div></aside></div>`;
  element.append(stage);
  const board = stage.querySelector(".chess-board");
  const status = stage.querySelector(".chess-status");
  const moves = stage.querySelector(".chess-moves");
  const promotionEl = stage.querySelector(".chess-promotion");
  const confirmEl = stage.querySelector(".chess-confirm");
  const controls = stage.querySelector(".chess-controls");
  let frame = null;
  let selected = null;
  let promotion = null;
  let flipped = false;
  let pending = false;
  let confirming = false;
  let alive = true;
  let historyKey = "";
  let boardKey = "";
  let receivedAt = 0;
  const me = () =>
    frame?.you ??
    host.getRoom().players.find((p) => p.id === host.you)?.side ??
    "w";
  const final = () => host.getRoom().phase === "results";
  const myTurn = () =>
    frame && !final() && !frame.outcome && frame.turn === me() && !pending;

  function render() {
    if (!frame) return;
    const side = me();
    const orientation = flipped ? (side === "w" ? "b" : "w") : side;
    const files = orientation === "w" ? "abcdefgh" : "hgfedcba";
    const ranks = orientation === "w" ? "87654321" : "12345678";
    const key = JSON.stringify([
      frame.seq,
      frame.board,
      selected,
      orientation,
      pending,
      frame.legal,
      final(),
    ]);
    if (key !== boardKey) {
      const focused =
        document.activeElement?.closest(".chess-square")?.dataset.square;
      boardKey = key;
      const pieces = new Map(frame.board.map((piece) => [piece.square, piece]));
      board.innerHTML = [...ranks]
        .map((rank, row) =>
          [...files]
            .map((file, column) => {
              const square = file + rank;
              const piece = pieces.get(square);
              const legal =
                myTurn() &&
                (frame.legal ?? []).some(
                  (move) => move.from === selected && move.to === square,
                );
              const last =
                frame.lastMove &&
                [frame.lastMove.from, frame.lastMove.to].includes(square);
              const check =
                frame.check &&
                piece?.type === "k" &&
                piece.color === frame.turn;
              const dark = (file.charCodeAt(0) - 97 + Number(rank)) % 2 === 1;
              return `<button type="button" class="chess-square${dark ? " dark" : ""}${last ? " last" : ""}${selected === square ? " selected" : ""}${legal ? " legal" : ""}${piece ? " capture" : ""}${check ? " check" : ""}" data-square="${square}" aria-label="${square}${piece ? ` ${colorName(piece.color)} ${NAMES[piece.type]}` : " empty"}${legal ? ", legal destination" : ""}" aria-pressed="${selected === square}">${piece ? `<span class="chess-piece ${piece.color === "w" ? "white" : ""}" aria-hidden="true">${PIECES[piece.type]}</span>` : ""}${column === 0 ? `<span class="chess-coordinate chess-rank">${rank}</span>` : ""}${row === 7 ? `<span class="chess-coordinate chess-file">${file}</span>` : ""}</button>`;
            })
            .join(""),
        )
        .join("");
      if (focused)
        board
          .querySelector(`[data-square="${focused}"]`)
          ?.focus({ preventScroll: true });
    }
    for (const [position, color] of [
      ["top", orientation === "w" ? "b" : "w"],
      ["bottom", orientation],
    ]) {
      const seat = frame.seats[color];
      const html = `<span>${escape(seat.name)}${color === side ? " (you)" : ""} <small>${colorName(color)}</small></span>${frame.clock ? `<span class="chess-clock" data-color="${color}" role="timer" aria-label="${colorName(color)} clock"></span>` : ""}`;
      const bar = stage.querySelector(`.chess-player.${position}`);
      if (bar.dataset.html !== html) {
        bar.dataset.html = html;
        bar.innerHTML = html;
      }
    }
    updateClocks();
    const text =
      frame.outcome?.summary ??
      (final()
        ? "Game ended."
        : `${colorName(frame.turn)} to move${frame.check ? " - check!" : ""}${frame.thinking ? " - bot thinking" : ""}`);
    if (status.textContent !== text) status.textContent = text;
    stage.querySelector(".chess-hint").textContent =
      frame.outcome || final()
        ? "Final position"
        : myTurn()
          ? "Select a piece, then a highlighted square."
          : `Waiting for your opponent.${frame.clock ? "" : " Untimed game."}`;
    const history = JSON.stringify(frame.history);
    if (history !== historyKey) {
      historyKey = history;
      moves.innerHTML = frame.history
        .map(
          (move, i) =>
            `${i % 2 === 0 ? `<span class="number">${Math.floor(i / 2) + 1}.</span>` : ""}<span>${escape(move)}</span>`,
        )
        .join("");
      moves.scrollTop = moves.scrollHeight;
    }
    const offered = frame.drawOffer && frame.drawOffer !== side;
    const active = !frame.outcome && !final();
    const buttons = `<button class="chess-btn" data-action="flip">Flip board</button>${active ? `<button class="chess-btn" data-action="resign" ${pending ? "disabled" : ""}>Resign</button>${!frame.seats[side === "w" ? "b" : "w"].bot ? (offered ? `<button class="chess-btn green" data-action="acceptDraw" ${pending ? "disabled" : ""}>Accept draw</button><button class="chess-btn" data-action="declineDraw" ${pending ? "disabled" : ""}>Decline draw</button>` : `<button class="chess-btn" data-action="offerDraw" ${frame.drawOffer || pending ? "disabled" : ""}>${frame.drawOffer ? "Draw offered" : "Offer draw"}</button>`) : ""}` : ""}`;
    if (controls.innerHTML !== buttons) controls.innerHTML = buttons;
    promotionEl.hidden = !promotion;
    if (promotion)
      promotionEl.innerHTML = `<p>Choose promotion</p>${["q", "r", "b", "n"].map((piece) => `<button class="chess-btn" data-promotion="${piece}" ${pending ? "disabled" : ""}>${NAMES[piece]}</button>`).join(" ")} <button class="chess-btn" data-action="cancelPromotion">Cancel</button>`;
    confirmEl.hidden = !confirming || !active;
    if (confirming)
      confirmEl.innerHTML = `<p>Resign this game?</p><button class="chess-btn" data-action="confirmResign" ${pending ? "disabled" : ""}>Confirm resignation</button> <button class="chess-btn" data-action="cancelResign">Keep playing</button>`;
  }
  // Frames carry authoritative remaining time; count down locally between them.
  function updateClocks() {
    if (!frame?.clock) return;
    const elapsed = performance.now() - receivedAt;
    for (const el of stage.querySelectorAll(".chess-clock")) {
      const color = el.dataset.color;
      const active = frame.clock.running && frame.turn === color && !final();
      const ms = Math.max(0, frame.clock[color] - (active ? elapsed : 0));
      const text = formatClock(ms);
      if (el.textContent !== text) el.textContent = text;
      el.classList.toggle("active", active);
      el.classList.toggle("low", ms < 20000);
      el.classList.toggle(
        "flagged",
        ms === 0 && !!frame.outcome?.reason.startsWith("timeout"),
      );
    }
  }
  const clockTimer = setInterval(updateClocks, 100);
  async function send(payload) {
    if (pending) return;
    pending = true;
    render();
    try {
      const ok = await host.act(payload);
      if (!alive) return;
      if (ok) {
        selected = null;
        promotion = null;
        confirming = false;
      }
    } finally {
      pending = false;
      if (alive) render();
    }
  }
  function receive(next) {
    if (!alive) return;
    if (frame && frame.seq !== next.seq) {
      selected = null;
      promotion = null;
    }
    frame = next;
    receivedAt = performance.now();
    render();
  }
  function click(event) {
    const button = event.target.closest("button");
    if (!button) return;
    const square = button.dataset.square;
    if (square && myTurn() && !promotion) {
      const choices = (frame.legal ?? []).filter(
        (move) => move.from === selected && move.to === square,
      );
      if (choices.length) {
        if (choices.some((move) => move.promotion)) {
          promotion = { from: selected, to: square };
          render();
        } else void send({ type: "move", from: selected, to: square });
      } else {
        selected =
          frame.board.some((p) => p.square === square && p.color === me()) &&
          selected !== square
            ? square
            : null;
        render();
      }
      return;
    }
    if (button.dataset.promotion && promotion && !pending) {
      void send({
        type: "move",
        ...promotion,
        promotion: button.dataset.promotion,
      });
      return;
    }
    const action = button.dataset.action;
    if (action === "flip") flipped = !flipped;
    else if (action === "cancelPromotion") promotion = null;
    else if (action === "resign") confirming = true;
    else if (action === "cancelResign") confirming = false;
    else if (action === "confirmResign") void send({ type: "resign" });
    else if (["offerDraw", "acceptDraw", "declineDraw"].includes(action))
      void send({ type: action });
    render();
  }
  function keydown(event) {
    const button = event.target.closest("[data-square]");
    if (!button) return;
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }[
      event.key
    ];
    if (delta !== undefined) {
      event.preventDefault();
      const buttons = [...board.children];
      const next = buttons.indexOf(button) + delta;
      if (next >= 0 && next < 64) buttons[next].focus();
    } else if (event.key === "Escape") {
      selected = null;
      promotion = null;
      confirming = false;
      render();
    }
  }
  stage.addEventListener("click", click);
  stage.addEventListener("keydown", keydown);
  const off = host.onFrame(receive);
  const initial = host.getRoom().gameInfo;
  if (initial) receive(initial);
  return {
    update(room) {
      if (room.gameInfo && (!frame || room.gameInfo.seq >= frame.seq)) {
        receive({ ...room.gameInfo, you: me() });
      }
    },
    destroy() {
      alive = false;
      clearInterval(clockTimer);
      off();
      stage.removeEventListener("click", click);
      stage.removeEventListener("keydown", keydown);
      stage.remove();
    },
  };
}
