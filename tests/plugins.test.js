import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
  loadPlugins,
  sanitizeSettings,
  validatePlugin,
} from "../server/plugins.js";
import {
  createRoom,
  addPlayer,
  setColor,
  startGame,
  viewFor,
} from "../server/engine.js";
import slither, {
  COLORS,
  START_MASS,
  WORLD,
  tick,
  pointsFor,
} from "../plugins/slither/server.js";

const pluginDir = fileURLToPath(new URL("../plugins", import.meta.url));
const seeded =
  (seed = 7) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
const players = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    color: COLORS[i],
  }));
function place(snake, x, y, angle) {
  Object.assign(snake, { x, y, angle, target: angle, alive: true });
  snake.trail = Array.from({ length: pointsFor(snake.mass) }, (_, i) => [
    x - Math.cos(angle) * 8 * (i + 1),
    y - Math.sin(angle) * 8 * (i + 1),
  ]);
}
function decodeHeader(buffer) {
  const d = new Int16Array(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length),
  );
  const heads = d[12];
  let o = 13 + heads * 3;
  const snakes = d[o++];
  const slots = [];
  for (let i = 0; i < snakes; i++) {
    slots.push(d[o]);
    o += 4 + d[o + 3] * 2;
  }
  return {
    alive: d[2],
    timeLeft: d[5],
    world: d[7],
    mass: d[8],
    heads,
    slots,
    food: d[o],
    end: o + 1 + d[o] * 3,
    length: d.length,
  };
}

test("plugin loader discovers slither and normalizes metadata", async () => {
  const plugins = await loadPlugins(pluginDir);
  const game = plugins.get("slither");
  assert.ok(game);
  assert.equal(game.meta.client, "/plugins/slither/client.js");
  assert.equal(game.meta.art, "/plugins/slither/art.svg");
  assert.equal(game.meta.plugin, true);
  assert.equal(game.sendEvery, 2);
  assert.deepEqual([...(await loadPlugins(pluginDir + "-missing")).keys()], []);
});
test("plugin validation rejects reserved ids and incomplete games", () => {
  const base = { meta: { name: "X" }, ...slither, id: undefined };
  assert.throws(() => validatePlugin({ ...base }, "scribble"), /reserved/);
  assert.throws(() => validatePlugin({ ...base, tick: 1 }, "ok-game"), /tick/);
  assert.throws(
    () =>
      validatePlugin({ ...base, meta: { name: "X", colors: ["red"] } }, "ok"),
    /colors/,
  );
  assert.equal(validatePlugin(base, "ok-game").id, "ok-game");
});
test("settings are restricted to declared options", () => {
  const meta = slither.meta;
  assert.deepEqual(sanitizeSettings(meta, { minutes: "5" }), { minutes: 5 });
  assert.deepEqual(sanitizeSettings(meta, { minutes: "99" }), { minutes: 3 });
  assert.deepEqual(sanitizeSettings(meta, null), { minutes: 3 });
});
test("plugin rooms assign unique colors, allow solo start and late joins", () => {
  const plugin = validatePlugin(slither, "slither");
  const room = createRoom("Snakes", "slither", 2, 60, plugin, { minutes: 1 });
  assert.throws(() => createRoom("x", "slither"), /Choose a game/);
  addPlayer(room, "a", "Ana");
  addPlayer(room, "b", "Ben");
  assert.equal(room.players[0].color, COLORS[0]);
  assert.equal(room.players[1].color, COLORS[1]);
  assert.throws(() => setColor(room, "b", COLORS[0]), /Ana already picked/);
  assert.throws(() => setColor(room, "b", "#000000"), /available colors/);
  setColor(room, "b", COLORS[4]);
  setColor(room, "b", COLORS[4]);
  assert.equal(room.players[1].color, COLORS[4]);
  startGame(room, "a");
  assert.equal(room.phase, "playing");
  assert.throws(() => setColor(room, "a", COLORS[5]), /between games/);
  addPlayer(room, "c", "Cy");
  assert.equal(room.players[2].color, COLORS[1]);
  room.game = { secret: true };
  const view = viewFor(room, "a");
  assert.equal(view.game, undefined);
  assert.equal(view.meta.name, "Slither Showdown");
  const solo = createRoom("Solo", "slither", 2, 60, plugin, {});
  addPlayer(solo, "z", "Zed");
  startGame(solo, "z");
  assert.equal(solo.phase, "playing");
  const scribble = createRoom("Draw", "scribble");
  addPlayer(scribble, "a", "Ana");
  assert.equal(scribble.players[0].color, undefined);
  assert.throws(() => setColor(scribble, "a", COLORS[0]), /does not use/);
});
test("snakes steer, eat food and grow", () => {
  const state = slither.create({
    players: players(1),
    settings: { minutes: 1 },
    random: seeded(),
  });
  const s = state.snakes.get("p0");
  place(s, 0, 0, 0);
  state.food = [{ x: 30, y: 0, v: 3, c: 0 }];
  slither.input(state, "p0", { a: Math.PI / 2, b: 0 });
  tick(state, 1 / 30);
  assert.equal(s.mass, START_MASS + 3);
  assert.ok(s.angle > 0 && s.angle < Math.PI / 2, "turn rate is limited");
  for (let i = 0; i < 30; i++) tick(state, 1 / 30);
  assert.ok(Math.abs(s.angle - Math.PI / 2) < 0.01);
  assert.ok(s.y > 80);
  assert.ok(s.trail.length <= pointsFor(s.mass));
  slither.input(state, "p0", { a: "nope", b: "yes" });
  assert.equal(s.boost, false);
});
test("boosting is faster but costs length and drops food", () => {
  const state = slither.create({ players: players(1), settings: {} });
  const s = state.snakes.get("p0");
  s.mass = 30;
  place(s, -600, 0, 0);
  state.food = [];
  slither.input(state, "p0", { a: 0, b: 1 });
  for (let i = 0; i < 30; i++) tick(state, 1 / 30);
  assert.ok(s.mass < 30);
  assert.ok(s.x > -600 + 300);
  assert.ok(state.food.some((f) => f.c === s.colorIndex));
});
test("head collisions eliminate, award takedowns, drop food and respawn", () => {
  const state = slither.create({
    players: players(2),
    settings: {},
    random: seeded(3),
  });
  const [a, b] = [state.snakes.get("p0"), state.snakes.get("p1")];
  place(b, 200, 0, Math.PI / 2);
  b.trail = Array.from({ length: 40 }, (_, i) => [200, -i * 8]);
  place(a, 150, -150, 0);
  state.food = [];
  for (let i = 0; i < 15 && a.alive; i++) tick(state, 1 / 30);
  assert.equal(a.alive, false);
  assert.equal(a.killer, b.slot);
  assert.equal(b.kills, 1);
  assert.ok(state.food.length > 5);
  const board = slither.leaderboard(state);
  assert.equal(board[0].id, "p1");
  assert.equal(board[1].detail, "Knocked out");
  const diedAt = state.time;
  slither.input(state, "p0", { r: 1 });
  assert.equal(a.alive, false, "can't respawn during the countdown");
  while (state.time - diedAt < 3.2) tick(state, 1 / 30);
  assert.equal(a.alive, false, "waits for the Respawn button");
  slither.input(state, "p0", { r: 1 });
  assert.equal(a.alive, true);
  assert.ok(a.mass < START_MASS + 5, "respawns small");
});
test("hitting the arena wall ends a life", () => {
  const state = slither.create({ players: players(1), settings: {} });
  const s = state.snakes.get("p0");
  place(s, WORLD - 12, 0, 0);
  tick(state, 1 / 30);
  assert.equal(s.alive, false);
  assert.equal(s.killer, -1);
});
test("binary frames are compact and culled to each player's view", () => {
  const state = slither.create({
    players: players(3),
    settings: { minutes: 1 },
    random: seeded(11),
  });
  place(state.snakes.get("p0"), -1100, 0, 0);
  place(state.snakes.get("p1"), -1000, 100, 0);
  place(state.snakes.get("p2"), 1100, 0, Math.PI);
  tick(state, 1 / 30);
  const frame = slither.frame(state, "p0");
  assert.ok(Buffer.isBuffer(frame));
  const f = decodeHeader(frame);
  assert.equal(f.end, f.length, "frame decodes exactly");
  assert.equal(f.alive, 1);
  assert.equal(f.world, WORLD);
  assert.equal(f.timeLeft, 60);
  assert.equal(f.heads, 3, "minimap sees every snake");
  assert.deepEqual(f.slots.sort(), [0, 1], "far snake is culled");
  assert.ok(f.food < state.food.length, "far food is culled");
  assert.ok(frame.length < 4000);
  assert.equal(slither.frame(state, "ghost"), null);
});
test("rounds end on time with results ranked by best length", () => {
  const state = slither.create({
    players: players(2),
    settings: { minutes: 1 },
  });
  state.snakes.get("p1").best = 55;
  state.snakes.get("p0").best = 20;
  assert.equal(tick(state, 1 / 30), false);
  state.time = 59.99;
  assert.equal(tick(state, 1 / 30), true);
  const results = slither.results(state);
  assert.deepEqual(
    results.map((r) => r.id),
    ["p1", "p0"],
  );
  assert.ok(results[0].score >= 55);
  slither.leave(state, "p0");
  assert.equal(state.snakes.has("p0"), false);
  assert.deepEqual(slither.publicState(state).slots, ["p0", "p1"]);
});
