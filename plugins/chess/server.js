// Chess: one player each on White and Black, chosen in the shared team lobby
// (two one-seat teams), or one player against the computer. The server is
// authoritative: it validates every move, runs the clocks and decides the
// result. Moves arrive through the reliable action() path; frames are small
// per-player JSON snapshots that include the move list, so clients can
// replay the game for move-by-move review.

import { Worker } from "node:worker_threads";
import {
  BLACK,
  START_FEN,
  WHITE,
  canWin,
  fromFen,
  inCheck,
  insufficientMaterial,
  legalMoves,
  makeMove,
  positionKey,
  toFen,
  toSan,
  uci,
} from "./rules.js";
import { wantsDraw } from "./bot.js";

export const SIDES = ["w", "b"];
const COLORS = [WHITE, BLACK];
// How long the final position stays up before everyone sees the results.
export const RESULT_SECONDS = 20;
// The computer waits a moment before replying so its moves don't feel
// instant (shortened when its clock runs low).
const BOT_PAUSE = { easy: [0.8, 2], medium: [0.6, 1.5], hard: [0.3, 0.8] };
// Time controls: [starting seconds, increment per move].
export const CLOCKS = {
  "1+0": [60, 0],
  "3+0": [180, 0],
  "3+2": [180, 2],
  "5+0": [300, 0],
  "10+0": [600, 0],
  "15+10": [900, 10],
  "30+0": [1800, 0],
  none: null,
};
const ENDINGS = {
  checkmate: "by checkmate",
  resignation: "by resignation",
  timeout: "on time",
  stalemate: "by stalemate",
  repetition: "by repetition",
  "fifty-move": "by the 50-move rule",
  material: "by insufficient material",
  "timeout-material": "by timeout vs insufficient material",
  agreement: "by agreement",
};

const fail = (message) => {
  throw new Error(message);
};
const turnOf = (state) => (state.pos.turn === WHITE ? 0 : 1);

// The computer thinks in a worker thread so a long search never stalls the
// other rooms. One worker serves every game; requests queue up in order.
let bot = null;
function startWorker() {
  const worker = new Worker(new URL("./bot-worker.js", import.meta.url));
  const waiting = new Map();
  const stop = (error) => {
    if (bot?.worker === worker) bot = null;
    for (const request of waiting.values()) request.reject(error);
    waiting.clear();
  };
  worker.on("message", ({ id, move, error }) => {
    const request = waiting.get(id);
    waiting.delete(id);
    if (error) request?.reject(new Error(error));
    else request?.resolve(move);
  });
  worker.on("error", stop);
  worker.on("exit", () => stop(new Error("The chess computer stopped.")));
  worker.unref();
  return { worker, waiting, next: 0 };
}
export function think(request) {
  bot ??= startWorker();
  const { worker, waiting } = bot;
  const id = bot.next++;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    worker.postMessage({ id, request });
  });
}

function refresh(state) {
  state.legal = legalMoves(state.pos);
  state.legalUci = state.legal.map(uci);
}

function finish(state, winner, reason) {
  state.result = { winner, reason };
  state.closeAt = state.time + RESULT_SECONDS;
  state.drawOffer = null;
  state.pending = null;
  state.seq++;
}

function play(state, move) {
  const side = turnOf(state);
  const san = toSan(state.pos, move, state.legal);
  makeMove(state.pos, move);
  state.moves.push({ uci: uci(move), san });
  // Clocks start once both sides have moved, like on chess.com.
  if (state.clock && state.moves.length > 2)
    state.clock.left[side] += state.clock.increment;
  if (state.drawOffer === 1 - side) state.drawOffer = null;
  state.pending = null;
  const key = positionKey(state.pos);
  state.seen.set(key, (state.seen.get(key) ?? 0) + 1);
  refresh(state);
  state.seq++;
  if (!state.legal.length)
    finish(
      state,
      inCheck(state.pos) ? side : null,
      inCheck(state.pos) ? "checkmate" : "stalemate",
    );
  else if (insufficientMaterial(state.pos)) finish(state, null, "material");
  else if (state.seen.get(key) >= 3) finish(state, null, "repetition");
  else if (state.pos.halfmove >= 100) finish(state, null, "fifty-move");
}

function botTurn(state, side) {
  const seat = state.seats[side];
  if (!state.pending) {
    const clock = state.clock?.left[side] ?? Infinity;
    const [min, max] = BOT_PAUSE[seat.bot] ?? BOT_PAUSE.medium;
    const pause = Math.min(min + state.random() * (max - min), clock / 40);
    const pending = { readyAt: state.time + pause, move: undefined };
    state.pending = pending;
    state.seq++;
    state
      .think({
        fen: toFen(state.pos),
        level: seat.bot,
        repeats: [...state.seen].filter(([, n]) => n >= 2).map(([k]) => k),
        // Spend at most about a thirtieth of the remaining time.
        seconds: state.clock ? clock / 30 : undefined,
      })
      .then(
        (move) => {
          pending.move = move;
        },
        (error) => {
          console.error("Chess computer failed:", error.message);
          pending.move = null;
        },
      );
    return;
  }
  const { move, readyAt } = state.pending;
  if (move === undefined || state.time < readyAt) return;
  play(
    state,
    state.legal.find((m) => uci(m) === move) ??
      state.legal[Math.floor(state.random() * state.legal.length)],
  );
}

export function tick(state, dt) {
  state.time += dt;
  if (state.result) return state.done || state.time >= state.closeAt;
  const side = turnOf(state);
  if (state.clock && state.moves.length >= 2) {
    state.clock.left[side] = Math.max(0, state.clock.left[side] - dt);
    if (!state.clock.left[side]) {
      const winner = 1 - side;
      if (canWin(state.pos, COLORS[winner])) finish(state, winner, "timeout");
      else finish(state, null, "timeout-material");
      return false;
    }
  }
  if (state.seats[side].bot) botTurn(state, side);
  return false;
}

export function action(state, id, payload) {
  const seat = state.seats.findIndex((s) => s.id === id);
  if (seat < 0) fail("You’re not playing in this game.");
  const type = payload?.type;
  const opponent = 1 - seat;
  if (type === "continue") {
    if (!state.result) fail("The game is still going.");
    state.done = true;
    return;
  }
  if (state.result) fail("This game is over.");
  if (type === "move") {
    if (turnOf(state) !== seat) fail("It’s not your turn.");
    const promotion = payload.promotion ?? "";
    if (
      !/^[a-h][1-8]$/.test(payload.from) ||
      !/^[a-h][1-8]$/.test(payload.to) ||
      !/^[qrbn]?$/.test(promotion)
    )
      fail("That move isn’t on the board.");
    const move = state.legal.find(
      (m) => uci(m) === payload.from + payload.to + promotion,
    );
    if (!move) fail("That move isn’t legal.");
    play(state, move);
    return;
  }
  if (type === "resign") finish(state, opponent, "resignation");
  else if (type === "draw") {
    if (state.drawOffer === opponent) finish(state, null, "agreement");
    else if (state.seats[opponent].bot) {
      if (wantsDraw(toFen(state.pos), COLORS[opponent]))
        finish(state, null, "agreement");
      else
        state.note = {
          text: "The computer declined. Play on!",
          until: state.time + 4,
        };
    } else {
      if (state.offered[seat] === state.moves.length)
        fail("You can offer another draw after your next move.");
      state.offered[seat] = state.moves.length;
      state.drawOffer = seat;
    }
  } else if (type === "decline") {
    if (state.drawOffer !== opponent) fail("There’s no draw offer to decline.");
    state.drawOffer = null;
  } else fail("Unknown move.");
  state.seq++;
}

export function frame(state, id) {
  const seat = state.seats.findIndex((s) => s.id === id);
  const side = turnOf(state);
  const live = !state.result;
  return {
    seq: state.seq,
    fen: toFen(state.pos),
    you: SIDES[seat] ?? null,
    turn: SIDES[side],
    moves: state.moves,
    legal: live && seat === side ? state.legalUci : [],
    clock: state.clock && {
      left: state.clock.left,
      increment: state.clock.increment,
      running: live && state.moves.length >= 2 ? SIDES[side] : null,
    },
    players: state.seats.map(({ name, bot }) => ({ name, bot })),
    drawOffer: SIDES[state.drawOffer] ?? null,
    thinking: live && !!state.pending,
    note: state.note && state.time < state.note.until ? state.note.text : null,
    result: state.result && {
      winner: SIDES[state.result.winner] ?? null,
      how: ENDINGS[state.result.reason],
      closesIn: Math.max(0, state.closeAt - state.time),
    },
  };
}

function standings(state) {
  const { result } = state;
  return [0, 1]
    .map((team) => {
      if (!result) return { team, score: 0, detail: "Unfinished" };
      const how = ENDINGS[result.reason];
      if (result.winner === null)
        return { team, score: 0.5, detail: `Draw ${how}` };
      const won = result.winner === team;
      return {
        team,
        score: won ? 1 : 0,
        detail: `${won ? "Won" : "Lost"} ${how}`,
      };
    })
    .sort((a, b) => b.score - a.score || a.team - b.team);
}

export default {
  id: "chess",
  tickRate: 10,
  sendRate: 5,
  meta: {
    name: "Chess",
    label: "YOUR MOVE.",
    description:
      "The classic, with a chess.com feel. Pick White or Black, set the clock, and take on a friend or the computer at easy, medium or hard.",
    players: "1–2 players",
    time: "5–30 min",
    tag: "Strategy",
    badge: "THE CLASSIC",
    caption: "a friendly little battle of wits",
    kind: "Board game",
    categories: ["Board games"],
    art: "art.svg",
    theme: { background: "#e4ecd6", accent: "#739552", ink: "#4b6a33" },
    minPlayers: 1,
    maxPlayers: 2,
    sidebar: false,
    teams: {
      min: 2,
      max: 2,
      minPlayers: 1,
      maxPlayers: 1,
      noun: "side",
      names: ["White", "Black"],
      colors: ["#cfc8b8", "#3d3a37"],
    },
    bots: {
      name: "Computer",
      levels: [
        { value: "easy", label: "Easy" },
        { value: "medium", label: "Medium" },
        { value: "hard", label: "Hard" },
      ],
    },
    scoreUnit: "pts",
    settings: [
      {
        key: "clock",
        label: "Time control",
        default: "10+0",
        options: [
          { value: "1+0", label: "1 min · Bullet" },
          { value: "3+0", label: "3 min · Blitz" },
          { value: "3+2", label: "3 | 2 · Blitz" },
          { value: "5+0", label: "5 min · Blitz" },
          { value: "10+0", label: "10 min · Rapid" },
          { value: "15+10", label: "15 | 10 · Rapid" },
          { value: "30+0", label: "30 min · Classical" },
          { value: "none", label: "No clock" },
        ],
      },
    ],
    rules: [
      "Pick White or Black in the lobby. Playing solo? The host can seat the computer (easy, medium or hard) on the empty side.",
      "Drag a piece or click it, then click where it should go. Dots show the legal moves. To castle, pick your king and then its rook. Right-click to mark squares, and right-drag to draw arrows.",
      "Checkmate wins. Stalemate, threefold repetition, the 50-move rule, too little material to mate, or an accepted draw offer split the point. If your clock runs out you lose, unless your opponent can’t possibly checkmate.",
    ],
  },
  create({ players, settings, bots = [], random = Math.random }) {
    const seats = [0, 1].map((team) => {
      const player = players.find((p) => p.team === team);
      if (player) return { id: player.id, name: player.name, bot: null };
      const level = bots.find((b) => b.team === team)?.level ?? "medium";
      return { id: null, name: "Computer", bot: level };
    });
    const clock = CLOCKS[settings?.clock] ?? null;
    const pos = fromFen(START_FEN);
    const state = {
      random,
      think,
      time: 0,
      seq: 0,
      pos,
      seen: new Map([[positionKey(pos), 1]]),
      moves: [],
      seats,
      clock: clock && { left: [clock[0], clock[0]], increment: clock[1] },
      drawOffer: null,
      offered: [-1, -1],
      note: null,
      pending: null,
      result: null,
      closeAt: Infinity,
      done: false,
    };
    refresh(state);
    return state;
  },
  input() {},
  action,
  tick,
  frame,
  leaderboard: standings,
  results: standings,
};
