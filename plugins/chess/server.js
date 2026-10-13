import { Chess } from "chess.js";
import { requestMove } from "./bot.js";

const fail = (message) => {
  throw new Error(message);
};
const sideName = (side) => (side === "w" ? "White" : "Black");
const other = (side) => (side === "w" ? "b" : "w");
// Minutes + increment seconds, as on chess.com.
export const TIME_CONTROLS = {
  none: null,
  "1+0": [1, 0],
  "3+2": [3, 2],
  "5+0": [5, 0],
  "10+0": [10, 0],
  "15+10": [15, 10],
};

// Clocks start after White's first move. Only the side to move is charged,
// measured from wall time so moves between ticks are billed precisely.
export function remaining(state, side, now = state.now()) {
  const clock = state.clock;
  if (!clock) return null;
  const running =
    clock.since !== null && !state.outcome && state.chess.turn() === side;
  return Math.max(0, clock[side] - (running ? now - clock.since : 0));
}

// A flagged player only loses if the opponent could still deliver mate.
function canMate(chess, side) {
  const pieces = chess
    .board()
    .flat()
    .filter((piece) => piece?.color === side && piece.type !== "k");
  return !(
    pieces.length === 0 ||
    (pieces.length === 1 && ["b", "n"].includes(pieces[0].type))
  );
}

function flag(state, side) {
  state.clock[side] = 0;
  state.clock.since = null;
  const opponent = other(side);
  if (canMate(state.chess, opponent)) finish(state, opponent, "timeout");
  else finish(state, null, "timeout vs insufficient material");
}

function finish(state, winner, reason) {
  if (state.clock && state.clock.since !== null) {
    const side = state.chess.turn();
    state.clock[side] = remaining(state, side);
    state.clock.since = null;
  }
  state.outcome = {
    winner,
    reason,
    summary: winner
      ? `${state.seats[winner].name} wins by ${reason}.`
      : `Draw by ${reason}.`,
  };
  state.drawOffer = null;
}

export function checkOutcome(state) {
  const chess = state.chess;
  if (chess.isCheckmate())
    finish(state, chess.turn() === "w" ? "b" : "w", "checkmate");
  else if (chess.isStalemate()) finish(state, null, "stalemate");
  else if (chess.isThreefoldRepetition())
    finish(state, null, "threefold repetition");
  else if (chess.isInsufficientMaterial())
    finish(state, null, "insufficient material");
  else if (chess.isDrawByFiftyMoves())
    finish(state, null, "the fifty-move rule");
}

function applyMove(state, move) {
  const clock = state.clock;
  const side = state.chess.turn();
  const now = clock ? state.now() : 0;
  const left = clock?.since !== null ? remaining(state, side, now) : null;
  if (left === 0) {
    flag(state, side);
    state.seq++;
    return;
  }
  state.chess.move(move);
  if (clock) {
    clock[side] = (left ?? clock[side]) + clock.increment;
    clock.since = now;
  }
  state.drawOffer = null;
  state.seq++;
  checkOutcome(state);
  // Bots answer faster when their own clock is low.
  state.botDelay = clock
    ? Math.min(0.35, remaining(state, other(side), now) / 40000)
    : 0.35;
}

function clockSnapshot(state) {
  if (!state.clock) return null;
  const now = state.now();
  return {
    w: remaining(state, "w", now),
    b: remaining(state, "b", now),
    increment: state.clock.increment,
    running: state.clock.since !== null && !state.outcome,
  };
}

function snapshot(state) {
  return {
    seq: state.seq,
    board: state.chess.board().flat().filter(Boolean),
    turn: state.chess.turn(),
    check: state.chess.isCheck(),
    history: state.chess.history(),
    lastMove: state.chess.history({ verbose: true }).at(-1) ?? null,
    seats: state.seats,
    outcome: state.outcome,
    drawOffer: state.drawOffer,
    thinking: !!state.search,
    clock: clockSnapshot(state),
    legal: state.outcome
      ? []
      : state.chess.moves({ verbose: true }).map(({ from, to, promotion }) => ({
          from,
          to,
          ...(promotion ? { promotion } : {}),
        })),
  };
}

const plugin = {
  id: "chess",
  tickRate: 5,
  sendRate: 5,
  meta: {
    name: "Chess",
    label: "YOUR NEXT GREAT MOVE",
    description:
      "A classic battle of ideas. Challenge a friend or sharpen your play against a bot.",
    players: "2 players or solo vs bot",
    time: "1-15 min or untimed",
    tag: "Strategy",
    badge: "THINK AHEAD",
    caption: "one board, endless possibilities",
    categories: ["Strategy"],
    art: "art.svg",
    theme: { background: "#e8eedf", accent: "#769656", ink: "#324629" },
    minPlayers: 2,
    maxPlayers: 2,
    sides: [
      { value: "w", label: "White" },
      { value: "b", label: "Black" },
    ],
    bot: { setting: "opponent", value: "bot" },
    lobbySettings: true,
    showFinalState: true,
    scoreUnit: "points",
    settings: [
      {
        key: "opponent",
        label: "Opponent",
        default: "friend",
        options: [
          { value: "friend", label: "Friend" },
          { value: "bot", label: "Bot" },
        ],
      },
      {
        key: "difficulty",
        label: "Bot difficulty",
        default: "medium",
        showWhen: { opponent: "bot" },
        options: [
          { value: "easy", label: "Easy" },
          { value: "medium", label: "Medium" },
          { value: "hard", label: "Hard" },
        ],
      },
      {
        key: "timeControl",
        label: "Time control",
        default: "10+0",
        options: [
          { value: "1+0", label: "Bullet 1 min" },
          { value: "3+2", label: "Blitz 3 | 2" },
          { value: "5+0", label: "Blitz 5 min" },
          { value: "10+0", label: "Rapid 10 min" },
          { value: "15+10", label: "Rapid 15 | 10" },
          { value: "none", label: "No timer" },
        ],
      },
    ],
    rules: [
      "Choose White or Black in the lobby. White moves first. Play a friend or choose a bot at easy, medium or hard difficulty.",
      "Select a piece, then a highlighted destination. Put the opposing king in checkmate to win.",
      "The host picks a time control. Clocks start after White's first move, and increments are added after each move. Run out of time and you lose, unless your opponent has only a king or a king and one bishop or knight, which is a draw.",
      "Castling, en passant and pawn promotion follow standard chess rules. Choose a queen, rook, bishop or knight when promoting.",
      "Resign or offer a draw during play. Stalemate, insufficient material, threefold repetition and the fifty-move rule end the game in a draw.",
    ],
  },
  create({ players, settings = {} }) {
    const bot = settings.opponent === "bot";
    if (players.length !== (bot ? 1 : 2))
      fail(bot ? "A bot game needs one human." : "Chess needs two players.");
    if (!["easy", "medium", "hard"].includes(settings.difficulty ?? "medium"))
      fail("Choose a bot difficulty.");
    const timeControl = settings.timeControl ?? "10+0";
    if (!(timeControl in TIME_CONTROLS)) fail("Choose a time control.");
    const control = TIME_CONTROLS[timeControl];
    const seats = {};
    for (const player of players) {
      if (!["w", "b"].includes(player.side) || seats[player.side])
        fail("Each player needs a different side.");
      seats[player.side] = { id: player.id, name: player.name, bot: false };
    }
    if (bot) {
      const side = players[0].side === "w" ? "b" : "w";
      seats[side] = {
        id: null,
        name: `${settings.difficulty ?? "medium"} bot`,
        bot: true,
      };
    }
    return {
      chess: new Chess(),
      seats,
      players,
      difficulty: settings.difficulty ?? "medium",
      clock: control
        ? {
            w: control[0] * 60000,
            b: control[0] * 60000,
            increment: control[1] * 1000,
            since: null,
          }
        : null,
      now: Date.now,
      outcome: null,
      drawOffer: null,
      seq: 0,
      botDelay: 0.35,
      search: null,
      botMove: null,
      botError: null,
      disposed: false,
    };
  },
  input() {},
  action(state, id, payload) {
    if (state.outcome) fail("This game is already over.");
    const side = ["w", "b"].find(
      (color) => state.seats[color].id === id && !state.seats[color].bot,
    );
    if (!side) fail("Join this game before playing.");
    const opponent = side === "w" ? "b" : "w";
    if (payload.type === "resign") {
      finish(state, opponent, "resignation");
    } else if (payload.type === "offerDraw") {
      if (state.seats[opponent].bot) fail("Bots do not accept draw offers.");
      if (state.drawOffer) fail("A draw offer is already pending.");
      state.drawOffer = side;
    } else if (["acceptDraw", "declineDraw"].includes(payload.type)) {
      if (state.drawOffer !== opponent)
        fail("There is no opponent draw offer.");
      if (payload.type === "acceptDraw") finish(state, null, "agreement");
      else state.drawOffer = null;
    } else if (payload.type === "move") {
      if (state.chess.turn() !== side) fail("Wait for your turn.");
      const { from, to, promotion } = payload;
      if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to))
        fail("Choose valid board squares.");
      const moves = state.chess
        .moves({ square: from, verbose: true })
        .filter((move) => move.to === to);
      const move = moves.find((move) => move.promotion === promotion);
      if (!move)
        fail(
          moves.some((move) => move.promotion)
            ? "Choose a promotion piece."
            : "That move is not legal.",
        );
      applyMove(state, { from, to, ...(promotion ? { promotion } : {}) });
      return;
    } else fail("Unknown chess action.");
    state.seq++;
  },
  tick(state, dt) {
    if (state.outcome) return true;
    if (state.botError) throw state.botError;
    const turn = state.chess.turn();
    if (state.clock?.since != null && remaining(state, turn) === 0) {
      state.search?.cancel();
      state.search = null;
      state.botMove = null;
      flag(state, turn);
      state.seq++;
      return true;
    }
    if (state.botMove) {
      const move = state.botMove;
      state.botMove = null;
      state.search = null;
      applyMove(state, move);
      return !!state.outcome;
    }
    if (!state.seats[state.chess.turn()].bot || state.search) return false;
    state.botDelay -= dt;
    if (state.botDelay > 0) return false;
    const search = requestMove(
      state.chess.fen(),
      state.difficulty,
      state.clock
        ? Math.max(20, remaining(state, state.chess.turn()) / 30 - 150)
        : Infinity,
    );
    state.search = search;
    search.promise
      .then((move) => {
        if (state.disposed || state.outcome) return;
        if (!move)
          state.botError = new Error("Chess bot returned no legal move.");
        else state.botMove = move;
      })
      .catch((error) => {
        if (!state.disposed) state.botError = error;
      });
    return false;
  },
  frame(state, id) {
    const side = ["w", "b"].find(
      (color) => state.seats[color].id === id && !state.seats[color].bot,
    );
    if (!side) return null;
    return {
      ...snapshot(state),
      you: side,
      legal:
        !state.outcome && state.chess.turn() === side
          ? state.chess
              .moves({ verbose: true })
              .map(({ from, to, promotion }) => ({
                from,
                to,
                ...(promotion ? { promotion } : {}),
              }))
          : [],
    };
  },
  leaderboard(state) {
    return state.players
      .map((player) => ({
        id: player.id,
        score: state.outcome
          ? state.outcome.winner === player.side
            ? 1
            : state.outcome.winner
              ? 0
              : 0.5
          : 0,
        detail:
          state.outcome?.summary ??
          `${sideName(player.side)}${state.chess.turn() === player.side ? " - to move" : ""}`,
      }))
      .sort((a, b) => b.score - a.score);
  },
  results(state) {
    return this.leaderboard(state);
  },
  end(state) {
    if (!state.outcome) finish(state, null, "the host ending the game");
  },
  publicState: snapshot,
  dispose(state) {
    if (!state) return;
    state.disposed = true;
    state.search?.cancel();
  },
};

export default plugin;
