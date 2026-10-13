import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePlugin } from "../server/plugins.js";
import {
  createRoom,
  addPlayer,
  setBot,
  setTeam,
  shuffleTeams,
  startGame,
  teamsReady,
} from "../server/engine.js";
import {
  BLACK,
  WHITE,
  canWin,
  fromFen,
  insufficientMaterial,
  legalMoves,
  parseSquare,
  perft,
  toFen,
  toSan,
  uci,
} from "../plugins/chess/rules.js";
import chess, { RESULT_SECONDS, tick } from "../plugins/chess/server.js";
import { chooseMove } from "../plugins/chess/bot.js";

const plugin = validatePlugin(chess, "chess");
const seeded =
  (seed = 5) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
const people = [
  { id: "w", name: "Wren", team: 0 },
  { id: "b", name: "Bo", team: 1 },
];
const newGame = (settings = { clock: "none" }, players = people, bots = []) =>
  chess.create({ players, settings, bots, random: seeded() });
// Plays a list of moves in coordinate form, alternating sides.
function play(state, ...moves) {
  for (const move of moves) {
    const id = state.seats[state.pos.turn === WHITE ? 0 : 1].id;
    chess.action(state, id, {
      type: "move",
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      promotion: move[4],
    });
  }
}
function setPosition(state, fen) {
  state.pos = fromFen(fen);
  state.legal = legalMoves(state.pos);
  state.legalUci = state.legal.map(uci);
}
const sanOf = (fen, move) => {
  const pos = fromFen(fen);
  return toSan(
    pos,
    legalMoves(pos).find((m) => uci(m) === move),
  );
};

test("move generation matches known perft counts", () => {
  const cases = [
    ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 3, 8902],
    [
      "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
      2,
      2039,
    ],
    ["8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", 4, 43238],
    [
      "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
      3,
      9467,
    ],
    ["rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", 3, 62379],
  ];
  for (const [fen, depth, nodes] of cases) {
    const pos = fromFen(fen);
    assert.equal(perft(pos, depth), nodes, fen);
    assert.equal(toFen(pos), fen, "make/unmake restores the position");
  }
});

test("SAN covers disambiguation, castling, promotion and check", () => {
  const knights =
    "rnbqkbnr/pppppppp/8/8/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 1";
  assert.equal(sanOf(knights, "b1d2"), "Nbd2");
  assert.equal(sanOf(knights, "f3d2"), "Nfd2");
  const rooks = "4k3/8/8/R7/8/8/8/R3K3 w - - 0 1";
  assert.equal(sanOf(rooks, "a1a3"), "R1a3");
  assert.equal(sanOf(rooks, "a5a3"), "R5a3");
  assert.equal(sanOf(rooks, "a5a8"), "Ra8+");
  assert.equal(sanOf("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1", "e1g1"), "O-O");
  assert.equal(sanOf("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1", "e1c1"), "O-O-O");
  assert.equal(sanOf("8/4P3/8/8/8/8/k7/4K3 w - - 0 1", "e7e8q"), "e8=Q");
  assert.equal(sanOf("8/4P3/8/8/8/8/k7/4K3 w - - 0 1", "e7e8n"), "e8=N");
  assert.equal(
    sanOf(
      "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3",
      "e5f6",
    ),
    "exf6",
  );
  assert.equal(parseSquare("h8"), 0x77);
  assert.equal(parseSquare("i9"), -1);
});

test("material rules know which endings can't be won", () => {
  assert.ok(insufficientMaterial(fromFen("8/8/4k3/8/8/2K5/8/8 w - - 0 1")));
  assert.ok(insufficientMaterial(fromFen("8/8/4k3/8/8/2KN4/8/8 w - - 0 1")));
  assert.ok(
    insufficientMaterial(fromFen("8/5b2/4k3/8/8/2KB4/8/8 w - - 0 1")),
    "bishops on the same color",
  );
  assert.ok(!insufficientMaterial(fromFen("8/8/4kb2/8/8/2KB4/8/8 w - - 0 1")));
  assert.ok(!insufficientMaterial(fromFen("8/8/4k3/8/8/2KP4/8/8 w - - 0 1")));
  const pos = fromFen("8/8/4k3/8/8/2KN4/8/7r w - - 0 1");
  assert.ok(!canWin(pos, WHITE), "a lone knight can't win on time");
  assert.ok(canWin(pos, BLACK));
});

test("players move in turn; illegal and out-of-turn moves are refused", () => {
  const state = newGame();
  assert.equal(state.seats[0].name, "Wren");
  const white = chess.frame(state, "w");
  assert.equal(white.you, "w");
  assert.equal(white.legal.length, 20);
  assert.deepEqual(
    chess.frame(state, "b").legal,
    [],
    "only the mover sees moves",
  );
  assert.throws(
    () => chess.action(state, "b", { type: "move", from: "e7", to: "e5" }),
    /not your turn/,
  );
  assert.throws(
    () => chess.action(state, "w", { type: "move", from: "e2", to: "e5" }),
    /isn’t legal/,
  );
  assert.throws(
    () => chess.action(state, "w", { type: "move", from: "e2", to: "z9" }),
    /isn’t on the board/,
  );
  assert.throws(
    () => chess.action(state, "ghost", { type: "move", from: "e2", to: "e4" }),
    /not playing/,
  );
  play(state, "e2e4", "e7e5", "g1f3");
  const frame = chess.frame(state, "b");
  assert.deepEqual(
    frame.moves.map((m) => m.san),
    ["e4", "e5", "Nf3"],
  );
  assert.equal(frame.turn, "b");
  assert.ok(frame.legal.includes("b8c6"));
  assert.equal(frame.clock, null);
});

test("checkmate ends the game and results follow the final position", () => {
  const state = newGame();
  play(state, "f2f3", "e7e5", "g2g4", "d8h4");
  const frame = chess.frame(state, "w");
  assert.deepEqual(frame.result.winner, "b");
  assert.equal(frame.result.how, "by checkmate");
  assert.equal(frame.moves.at(-1).san, "Qh4#");
  assert.deepEqual(frame.legal, []);
  assert.throws(
    () => chess.action(state, "w", { type: "resign" }),
    /game is over/,
  );
  assert.deepEqual(chess.results(state), [
    { team: 1, score: 1, detail: "Won by checkmate" },
    { team: 0, score: 0, detail: "Lost by checkmate" },
  ]);
  assert.equal(tick(state, 1), false, "the final position stays up");
  assert.equal(tick(state, RESULT_SECONDS), true);
  const early = newGame();
  play(early, "f2f3", "e7e5", "g2g4", "d8h4");
  chess.action(early, "w", { type: "continue" });
  assert.equal(tick(early, 0.1), true, "a player can skip ahead");
});

test("resigning and draw offers", () => {
  const state = newGame();
  chess.action(state, "w", { type: "resign" });
  assert.deepEqual(chess.results(state)[0], {
    team: 1,
    score: 1,
    detail: "Won by resignation",
  });

  const draw = newGame();
  play(draw, "e2e4");
  chess.action(draw, "w", { type: "draw" });
  assert.equal(chess.frame(draw, "b").drawOffer, "w");
  assert.throws(
    () => chess.action(draw, "w", { type: "draw" }),
    /after your next move/,
  );
  chess.action(draw, "b", { type: "decline" });
  assert.equal(chess.frame(draw, "b").drawOffer, null);
  assert.throws(
    () => chess.action(draw, "b", { type: "decline" }),
    /no draw offer/,
  );
  play(draw, "e7e5");
  chess.action(draw, "w", { type: "draw" });
  play(draw, "g1f3");
  assert.equal(draw.drawOffer, 0, "the offer stands while its maker moves");
  play(draw, "b8c6");
  assert.equal(draw.drawOffer, null, "replying with a move declines it");
  chess.action(draw, "b", { type: "draw" });
  chess.action(draw, "w", { type: "draw" });
  assert.deepEqual(
    chess.results(draw).map((r) => [r.score, r.detail]),
    [
      [0.5, "Draw by agreement"],
      [0.5, "Draw by agreement"],
    ],
  );
});

test("threefold repetition, stalemate and dead positions are draws", () => {
  const state = newGame();
  play(state, "g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1");
  assert.equal(state.result, null);
  play(state, "f6g8");
  assert.equal(chess.frame(state, "w").result.how, "by repetition");

  const stalemate = newGame();
  setPosition(stalemate, "k7/8/8/1Q6/8/8/8/7K w - - 0 1");
  play(stalemate, "b5b6");
  assert.equal(chess.frame(stalemate, "b").result.how, "by stalemate");

  const dead = newGame();
  setPosition(dead, "8/8/4k3/8/3r4/2KN4/8/8 w - - 0 1");
  play(dead, "c3d4");
  assert.equal(chess.frame(dead, "w").result.how, "by insufficient material");

  const fifty = newGame();
  setPosition(fifty, "8/8/4k3/8/8/2KR4/8/8 w - - 99 80");
  play(fifty, "d3d1");
  assert.equal(chess.frame(fifty, "w").result.how, "by the 50-move rule");
});

test("promotion needs a piece, and under-promotion works", () => {
  const state = newGame();
  setPosition(state, "8/4P3/8/8/8/8/k7/4K3 w - - 0 1");
  assert.throws(
    () => chess.action(state, "w", { type: "move", from: "e7", to: "e8" }),
    /isn’t legal/,
  );
  play(state, "e7e8n");
  assert.equal(state.moves.at(-1).san, "e8=N");
  assert.match(chess.frame(state, "b").fen, /^4N3\//);
});

test("clocks start after both first moves, add increments and flag", () => {
  const state = newGame({ clock: "3+2" });
  tick(state, 10);
  play(state, "e2e4");
  tick(state, 10);
  assert.deepEqual(state.clock.left, [180, 180], "no clock for first moves");
  play(state, "e7e5");
  assert.equal(chess.frame(state, "w").clock.running, "w");
  tick(state, 5);
  play(state, "g1f3");
  assert.deepEqual(state.clock.left, [177, 180], "5s used, 2s back");
  for (let i = 0; i < 200 && !state.result; i++) tick(state, 1);
  assert.deepEqual(chess.frame(state, "b").result, {
    winner: "w",
    how: "on time",
    closesIn: RESULT_SECONDS,
  });

  const bare = newGame({ clock: "1+0" });
  play(bare, "e2e4", "e7e5");
  setPosition(bare, "8/8/4k3/8/8/2K5/7p/8 b - - 0 1");
  tick(bare, 61);
  assert.equal(
    chess.frame(bare, "w").result.how,
    "by timeout vs insufficient material",
    "Black ran out, but White's bare king can't win",
  );
});

test("the computer plays its side after a short pause", async () => {
  const state = newGame(
    { clock: "none" },
    [people[0]],
    [{ team: 1, level: "easy" }],
  );
  state.think = async (request) =>
    chooseMove({ ...request, random: seeded(9) });
  assert.deepEqual(
    state.seats.map((s) => s.bot),
    [null, "easy"],
  );
  assert.equal(chess.frame(state, "w").players[1].name, "Computer");
  play(state, "e2e4");
  tick(state, 0.1);
  assert.equal(chess.frame(state, "w").thinking, true);
  await new Promise((resolve) => setImmediate(resolve));
  tick(state, 0.1);
  assert.equal(state.moves.length, 1, "waits out its thinking pause");
  for (let i = 0; i < 30 && state.moves.length < 2; i++) tick(state, 0.1);
  assert.equal(state.moves.length, 2);
  assert.equal(chess.frame(state, "w").turn, "w");

  // A computer that's ahead turns down draws; one that's behind accepts.
  const winning = newGame(
    { clock: "none" },
    [people[0]],
    [{ team: 1, level: "hard" }],
  );
  setPosition(winning, "q3k3/8/8/8/8/8/8/4K3 w - - 0 1");
  chess.action(winning, "w", { type: "draw" });
  assert.equal(winning.result, null);
  assert.match(chess.frame(winning, "w").note, /declined/);
  setPosition(winning, "4k3/8/8/8/8/8/8/Q3K3 w - - 0 1");
  chess.action(winning, "w", { type: "draw" });
  assert.equal(chess.frame(winning, "w").result.how, "by agreement");
});

test("the worker thread answers with a legal move", async () => {
  const { think } = await import("../plugins/chess/server.js");
  const move = await think({
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    level: "medium",
  });
  const pos = fromFen(
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  );
  assert.ok(legalMoves(pos).map(uci).includes(move));
});

test("the lobby seats one player per side, or the computer", () => {
  const room = createRoom("Chess night", "chess", 2, 60, plugin, {
    clock: "5+0",
  });
  assert.equal(plugin.meta.teams.maxPlayers, 1);
  assert.equal(plugin.meta.teams.noun, "side");
  assert.deepEqual(room.bots, []);
  addPlayer(room, "a", "Ana");
  assert.equal(room.players[0].team, 0, "first player gets White");
  assert.ok(!teamsReady(room));
  assert.throws(
    () => startGame(room, "a"),
    /Every side needs at least 1 player or the computer/,
  );
  assert.throws(() => setBot(room, "a", 0, "hard"), /already has a player/);
  assert.throws(() => setBot(room, "a", 1, "grandmaster"), /difficulty/);
  setBot(room, "a", 1, "medium");
  assert.ok(teamsReady(room));
  assert.throws(() => setTeam(room, "a", 1), /computer is playing Black/);
  assert.throws(() => addPlayer(room, "b", "Ben"), /Every seat/);
  setBot(room, "a", 1, "hard");
  assert.deepEqual(room.bots, [{ team: 1, level: "hard" }]);
  for (let i = 0; i < 25; i++) {
    const side = room.players[0].team;
    shuffleTeams(room, "a");
    assert.equal(room.players[0].team, 1 - side, "the player swaps sides");
    assert.equal(room.bots[0].team, side, "with the computer");
  }
  assert.ok(teamsReady(room));
  startGame(room, "a");
  assert.equal(room.phase, "playing");

  const friends = createRoom("Chess night", "chess", 2, 60, plugin, {});
  addPlayer(friends, "a", "Ana");
  addPlayer(friends, "b", "Ben");
  assert.deepEqual(
    friends.players.map((p) => p.team),
    [0, 1],
  );
  assert.throws(() => setTeam(friends, "a", 1), /Black is taken/);
  assert.throws(() => setBot(friends, "b", 0, "easy"), /Only the host/);
  assert.throws(() => addPlayer(friends, "c", "Cy"), /room is full/);
  // With two one-seat sides, every shuffle swaps them (never a no-op).
  for (let i = 0; i < 25; i++) {
    const before = friends.players.map((p) => p.team);
    shuffleTeams(friends, "a");
    assert.deepEqual(
      friends.players.map((p) => p.team),
      before.map((t) => 1 - t),
    );
  }
  startGame(friends, "a");
  assert.equal(friends.phase, "playing");

  const solo = createRoom("Solo", "chess", 2, 60, plugin, {});
  addPlayer(solo, "a", "Ana");
  setBot(solo, "a", 1, "easy");
  assert.throws(() => setBot(solo, "a", 0, "easy"), /already has a player/);
  setBot(solo, "a", 1, null);
  assert.deepEqual(solo.bots, []);
});

test("plugin validation checks computer-player metadata", () => {
  const meta = { ...chess.meta };
  assert.throws(
    () =>
      validatePlugin({ ...chess, meta: { ...meta, teams: undefined } }, "x-1"),
    /meta.bots needs meta.teams/,
  );
  assert.throws(
    () =>
      validatePlugin(
        { ...chess, meta: { ...meta, bots: { levels: [{ value: "Bad!" }] } } },
        "x-2",
      ),
    /levels/,
  );
  assert.equal(plugin.meta.bots.name, "Computer");
  assert.equal(plugin.meta.sidebar, false);
});
