import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import chessPlugin, { checkOutcome } from "../plugins/chess/server.js";
import { chooseMove, requestMove } from "../plugins/chess/bot.js";
import {
  validatePlugin,
  sanitizeSettings,
  loadPlugins,
} from "../server/plugins.js";
import {
  createRoom,
  addPlayer,
  setSide,
  setSettings,
  startGame,
  playerLimits,
} from "../server/engine.js";
import { fileURLToPath } from "node:url";

const players = [
  { id: "a", name: "Ana", side: "w" },
  { id: "b", name: "Ben", side: "b" },
];
const create = (settings = {}) =>
  chessPlugin.create({
    players: settings.opponent === "bot" ? players.slice(0, 1) : players,
    settings,
  });
const move = (state, id, from, to, promotion) =>
  chessPlugin.action(state, id, {
    type: "move",
    from,
    to,
    ...(promotion ? { promotion } : {}),
  });

test("chess loads as a plugin and shares the lobby with sides, bot capacity and host settings", async () => {
  const plugins = await loadPlugins(
    fileURLToPath(new URL("../plugins", import.meta.url)),
  );
  assert.ok(plugins.has("chess"));
  const plugin = validatePlugin(chessPlugin, "chess");
  const room = createRoom(
    "Chess night",
    "chess",
    2,
    60,
    plugin,
    sanitizeSettings(plugin.meta),
  );
  addPlayer(room, "a", "Ana");
  assert.deepEqual(playerLimits(room), { min: 2, max: 2 });
  assert.throws(() => startGame(room, "a"), /at least 2/);
  addPlayer(room, "b", "Ben");
  assert.deepEqual(
    room.players.map((p) => p.side),
    ["w", "b"],
  );
  setSide(room, "a", "b");
  assert.deepEqual(
    room.players.map((p) => p.side),
    ["b", "w"],
  );
  assert.throws(() => setSide(room, "a", "red"), /available sides/);
  assert.throws(
    () => setSettings(room, "b", { opponent: "bot" }),
    /Only the host/,
  );
  assert.throws(() => setSettings(room, "a", { opponent: "bot" }), /one human/);
  assert.equal(room.settings.opponent, "friend");
  assert.throws(() => addPlayer(room, "c", "Cam"), /full/);
  room.players.pop();
  setSettings(
    room,
    "a",
    sanitizeSettings(plugin.meta, { opponent: "bot", difficulty: "hard" }),
  );
  assert.deepEqual(playerLimits(room), { min: 1, max: 1 });
  assert.throws(() => addPlayer(room, "b", "Ben"), /full/);
  startGame(room, "a");
  assert.throws(() => setSide(room, "a", "w"), /between games/);
  assert.throws(() => setSettings(room, "a", {}), /between games/);
  const state = chessPlugin.create({
    players: room.players,
    settings: room.settings,
  });
  assert.equal(state.seats.w.bot, true);
  assert.equal(state.seats.b.id, "a");
  assert.throws(
    () => chessPlugin.create({ players, settings: { opponent: "bot" } }),
    /one human/,
  );
});

test("authoritative chess validates membership, turn, legality and frame destinations", () => {
  const state = create();
  assert.equal(chessPlugin.frame(state, "a").legal.length, 20);
  assert.deepEqual(chessPlugin.frame(state, "b").legal, []);
  assert.equal(chessPlugin.frame(state, "stranger"), null);
  assert.throws(() => move(state, "stranger", "e2", "e4"), /Join/);
  assert.throws(() => move(state, "b", "e7", "e5"), /turn/);
  assert.throws(() => move(state, "a", "e2", "e5"), /not legal/);
  assert.throws(() => move(state, "a", "x2", "e4"), /valid board/);
  assert.throws(() => move(state, "a", "e2", "e4", "q"), /not legal/);
  move(state, "a", "e2", "e4");
  assert.equal(state.chess.turn(), "b");
  assert.deepEqual(chessPlugin.frame(state, "a").history, ["e4"]);
  assert.ok(
    chessPlugin
      .frame(state, "b")
      .legal.some((m) => m.from === "e7" && m.to === "e5"),
  );
});

test("castling, en passant, pins and every promotion choice follow standard rules", () => {
  const castle = create();
  castle.chess = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  move(castle, "a", "e1", "g1");
  assert.equal(castle.chess.get("f1").type, "r");
  assert.equal(castle.chess.get("g1").type, "k");
  const attacked = create();
  attacked.chess = new Chess("4kr2/8/8/8/8/8/8/4K2R w K - 0 1");
  assert.throws(() => move(attacked, "a", "e1", "g1"), /not legal/);
  const ep = create();
  for (const [id, from, to] of [
    ["a", "e2", "e4"],
    ["b", "a7", "a6"],
    ["a", "e4", "e5"],
    ["b", "d7", "d5"],
  ])
    move(ep, id, from, to);
  move(ep, "a", "e5", "d6");
  assert.equal(ep.chess.get("d5"), undefined);
  assert.equal(ep.chess.get("d6").type, "p");
  const pinned = create();
  pinned.chess = new Chess("4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1");
  assert.throws(() => move(pinned, "a", "e2", "d2"), /not legal/);
  for (const piece of ["q", "r", "b", "n"]) {
    const promotion = create();
    promotion.chess = new Chess("7k/P7/8/8/8/8/8/7K w - - 0 1");
    assert.throws(() => move(promotion, "a", "a7", "a8"), /promotion piece/);
    move(promotion, "a", "a7", "a8", piece);
    assert.equal(promotion.chess.get("a8").type, piece);
  }
});

test("checkmate produces the real winner, freezes moves and records final position", () => {
  const state = create();
  for (const [id, from, to] of [
    ["a", "f2", "f3"],
    ["b", "e7", "e5"],
    ["a", "g2", "g4"],
    ["b", "d8", "h4"],
  ])
    move(state, id, from, to);
  assert.equal(state.outcome.winner, "b");
  assert.equal(state.outcome.reason, "checkmate");
  assert.equal(chessPlugin.tick(state, 0.2), true);
  assert.deepEqual(
    chessPlugin.results(state).map(({ id, score }) => [id, score]),
    [
      ["b", 1],
      ["a", 0],
    ],
  );
  assert.throws(() => move(state, "a", "a2", "a3"), /already over/);
  assert.match(chessPlugin.publicState(state).outcome.summary, /Ben wins/);
  assert.deepEqual(chessPlugin.frame(state, "a").legal, []);
});

test("automatic draws include stalemate, insufficient material, fifty moves and repetition", () => {
  for (const [fen, reason] of [
    ["7k/5Q2/6K1/8/8/8/8/8 b - - 0 1", "stalemate"],
    ["7k/8/8/8/8/8/8/K7 w - - 0 1", "insufficient material"],
    ["7k/8/8/8/8/8/8/KR6 w - - 100 51", "the fifty-move rule"],
  ]) {
    const state = create();
    state.chess = new Chess(fen);
    checkOutcome(state);
    assert.equal(state.outcome.winner, null);
    assert.equal(state.outcome.reason, reason);
    assert.deepEqual(
      chessPlugin.results(state).map((r) => r.score),
      [0.5, 0.5],
    );
  }
  const state = create();
  for (let i = 0; i < 2; i++) {
    move(state, "a", "g1", "f3");
    move(state, "b", "g8", "f6");
    move(state, "a", "f3", "g1");
    move(state, "b", "f6", "g8");
  }
  assert.equal(state.outcome.reason, "threefold repetition");
});

test("clocks start after White's first move, add increments and flag on timeout", () => {
  let now = 0;
  const timed = (timeControl) => {
    const state = create({ timeControl });
    state.now = () => now;
    return state;
  };
  assert.equal(create({ timeControl: "none" }).clock, null);
  assert.throws(() => create({ timeControl: "2+1" }), /time control/);

  const state = timed("3+2");
  now = 50000;
  move(state, "a", "e2", "e4");
  assert.deepEqual(chessPlugin.publicState(state).clock, {
    w: 182000,
    b: 180000,
    increment: 2000,
    running: true,
  });
  now += 10000;
  assert.equal(chessPlugin.frame(state, "a").clock.b, 170000);
  move(state, "b", "e7", "e5");
  assert.equal(state.clock.b, 172000);
  now += 182000;
  assert.equal(chessPlugin.tick(state, 0.2), true);
  assert.equal(state.outcome.winner, "b");
  assert.equal(state.outcome.reason, "timeout");
  assert.equal(chessPlugin.publicState(state).clock.running, false);
  assert.equal(chessPlugin.publicState(state).clock.w, 0);

  // A move that arrives after the flag fell between ticks still loses.
  const late = timed("1+0");
  move(late, "a", "e2", "e4");
  now += 60001;
  move(late, "b", "e7", "e5");
  assert.equal(late.outcome.winner, "w");
  assert.equal(late.chess.history().length, 1);

  // Flagging against a lone king or a single minor piece is a draw.
  const bare = timed("1+0");
  bare.chess = new Chess("7k/8/8/8/8/8/8/KN6 b - - 0 1");
  bare.clock.since = now;
  now += 60000;
  chessPlugin.tick(bare, 0.2);
  assert.equal(bare.outcome.winner, null);
  assert.equal(bare.outcome.reason, "timeout vs insufficient material");
});

test("draw offers, resignations and bot losses never incorrectly award the human a win", () => {
  const state = create();
  chessPlugin.action(state, "a", { type: "offerDraw" });
  assert.throws(
    () => chessPlugin.action(state, "a", { type: "acceptDraw" }),
    /no opponent/,
  );
  chessPlugin.action(state, "b", { type: "declineDraw" });
  assert.equal(state.drawOffer, null);
  chessPlugin.action(state, "b", { type: "offerDraw" });
  move(state, "a", "e2", "e4");
  assert.equal(state.drawOffer, null);
  chessPlugin.action(state, "a", { type: "offerDraw" });
  chessPlugin.action(state, "b", { type: "acceptDraw" });
  assert.equal(state.outcome.reason, "agreement");
  const bot = create({ opponent: "bot", difficulty: "easy" });
  assert.throws(
    () => chessPlugin.action(bot, "a", { type: "offerDraw" }),
    /Bots/,
  );
  chessPlugin.action(bot, "a", { type: "resign" });
  assert.equal(bot.outcome.winner, "b");
  assert.equal(chessPlugin.results(bot)[0].score, 0);
  assert.match(bot.outcome.summary, /easy bot wins/);
});

test("separate bot module returns legal moves at every difficulty and finds mate", () => {
  const fen = new Chess().fen();
  for (const difficulty of ["easy", "medium", "hard"]) {
    const move = chooseMove(fen, difficulty, () => 0);
    assert.ok(new Chess(fen).move(move));
  }
  const mate = "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1";
  const chess = new Chess(mate);
  chess.move(chooseMove(mate, "hard"));
  assert.ok(chess.isCheckmate());
  assert.equal(chooseMove("7k/8/8/8/8/8/8/K7 w - - 0 1", "easy"), null);
});

test("bot search runs in a worker and is applied only on its turn", async () => {
  const worker = requestMove(new Chess().fen(), "easy");
  const chosen = await worker.promise;
  assert.ok(new Chess().move(chosen));
  const state = create({ opponent: "bot", difficulty: "easy" });
  assert.equal(chessPlugin.tick(state, 1), false);
  assert.equal(state.search, null);
  move(state, "a", "e2", "e4");
  chessPlugin.tick(state, 1);
  const search = state.search;
  assert.ok(search);
  await search.promise;
  chessPlugin.tick(state, 0.2);
  assert.equal(state.chess.history().length, 2);
  assert.equal(state.chess.turn(), "w");
  chessPlugin.dispose(state);
});
