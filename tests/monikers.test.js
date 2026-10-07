import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePlugin } from "../server/plugins.js";
import {
  createRoom,
  addPlayer,
  setTeam,
  setTeamCount,
  shuffleTeams,
  startGame,
  teamsReady,
} from "../server/engine.js";
import monikers, {
  draftSize,
  ROUNDS,
  DRAFT_SECONDS,
  REVIEW_SECONDS,
  tick,
} from "../plugins/monikers/server.js";
import { CARDS } from "../plugins/monikers/cards.js";

const seeded =
  (seed = 11) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
const plugin = validatePlugin(monikers, "monikers");
const TEAMS = [
  { index: 0, name: "Team Sunrise", color: "#e0794e" },
  { index: 1, name: "Team Midnight", color: "#5b6fc7" },
];
// a, c on team 0; b, d on team 1
const crew = ["a", "b", "c", "d"].map((id, i) => ({
  id,
  name: id.toUpperCase(),
  team: i % 2,
}));
function newGame(settings = { seconds: 60, deck: 30, rounds: 3 }) {
  return monikers.create({
    players: crew,
    settings,
    teams: TEAMS,
    random: seeded(),
  });
}
function draftAll(state) {
  for (const p of state.players.values()) {
    for (const card of p.hand.slice(0, state.draft.pick))
      monikers.action(state, p.id, { type: "pick", card });
    monikers.action(state, p.id, { type: "lock" });
  }
}
// Plays the current turn, guessing every card (or `limit` cards).
function playTurn(state, limit = Infinity) {
  monikers.action(state, state.giver, { type: "start" });
  for (let i = 0; i < limit && state.phase === "turn"; i++)
    monikers.action(state, state.giver, { type: "got" });
  if (state.phase === "turn") tick(state, state.seconds);
}

test("monikers loads as a 4–16 player team plugin", () => {
  assert.equal(plugin.meta.maxPlayers, 16);
  assert.equal(plugin.meta.minPlayers, 4);
  assert.deepEqual(
    { min: plugin.meta.teams.min, max: plugin.meta.teams.max },
    { min: 2, max: 4 },
  );
  assert.equal(plugin.meta.teams.names[1], "Team Midnight");
  assert.throws(
    () =>
      validatePlugin(
        {
          ...monikers,
          meta: { name: "X", teams: { max: 3, colors: ["#fff"] } },
        },
        "bad-teams",
      ),
    /teams.colors/,
  );
  assert.ok(CARDS.length >= 150);
});

test("team lobby balances, switches, resizes and shuffles teams", () => {
  const room = createRoom("Names", "monikers", 2, 60, plugin, {});
  assert.equal(room.teamCount, 2);
  for (const [id, name] of [
    ["a", "Ana"],
    ["b", "Ben"],
    ["c", "Cy"],
  ])
    addPlayer(room, id, name);
  assert.deepEqual(
    room.players.map((p) => p.team),
    [0, 1, 0],
  );
  assert.throws(() => startGame(room, "a"), /at least 4/);
  addPlayer(room, "d", "Dee");
  assert.equal(room.players[3].team, 1);
  assert.ok(teamsReady(room));
  setTeam(room, "b", 0);
  assert.ok(!teamsReady(room));
  assert.throws(() => startGame(room, "a"), /Every team needs at least 2/);
  assert.throws(() => setTeam(room, "b", 2), /Choose one of the teams/);
  assert.throws(() => setTeamCount(room, "b", 3), /Only the host/);
  setTeamCount(room, "a", 3);
  assert.equal(room.teamCount, 3);
  setTeamCount(room, "a", 2);
  assert.ok(room.players.every((p) => p.team < 2));
  assert.throws(() => setTeamCount(room, "a", 5), /between 2 and 4/);
  shuffleTeams(room, "a", seeded());
  assert.ok(teamsReady(room));
  startGame(room, "a");
  assert.equal(room.phase, "playing");
  assert.throws(() => setTeam(room, "a", 1), /between games/);
  addPlayer(room, "e", "Eve");
  assert.equal(typeof room.players[4].team, "number");
});

test("draft size aims for the target deck and secret hands", () => {
  assert.deepEqual(draftSize(4, 45), { pick: 10, deal: 20 });
  assert.deepEqual(draftSize(9, 45), { pick: 5, deal: 10 });
  assert.deepEqual(draftSize(16, 60), { pick: 4, deal: 8 });
  assert.deepEqual(draftSize(16, 60, 50), { pick: 4, deal: 4 });
  const state = newGame();
  assert.equal(state.phase, "draft");
  const frameA = monikers.frame(state, "a");
  assert.equal(frameA.draft.hand.length, state.draft.deal);
  assert.equal(frameA.draft.pick, 8);
  const handB = monikers.frame(state, "b").draft.hand.map((c) => c.id);
  assert.ok(frameA.draft.hand.every((c) => !handB.includes(c.id)));
  const foreign = handB[0];
  assert.throws(
    () => monikers.action(state, "a", { type: "pick", card: foreign }),
    /isn’t in your hand/,
  );
  assert.throws(
    () => monikers.action(state, "a", { type: "lock" }),
    /Choose 8 cards/,
  );
  draftAll(state);
  assert.equal(state.phase, "ready");
  assert.equal(state.deck.length, 32);
  assert.equal(state.drawPile.length, 32);
});

test("draft timeout fills missing picks and starts round 1", () => {
  const state = newGame();
  monikers.action(state, "a", {
    type: "pick",
    card: state.players.get("a").hand[3],
  });
  tick(state, DRAFT_SECONDS + 1);
  assert.equal(state.phase, "ready");
  assert.equal(state.deck.length, 32);
  assert.ok(state.deck.includes(state.players.get("a").picks[0]));
});

test("only the guessing team is kept from seeing the card", () => {
  const state = newGame();
  draftAll(state);
  const giver = state.giver;
  const team = state.players.get(giver).team;
  assert.throws(
    () =>
      monikers.action(state, crew.find((p) => p.id !== giver).id, {
        type: "start",
      }),
    /Wait for your turn/,
  );
  monikers.action(state, giver, { type: "start" });
  assert.equal(state.phase, "turn");
  const teammate = crew.find((p) => p.team === team && p.id !== giver).id;
  const opponent = crew.find((p) => p.team !== team).id;
  assert.equal(monikers.frame(state, giver).card.id, state.current);
  assert.equal(monikers.frame(state, opponent).card.id, state.current);
  assert.equal(monikers.frame(state, teammate).card, undefined);
  assert.equal(monikers.frame(state, teammate).you.role, "guesser");
  assert.throws(
    () => monikers.action(state, teammate, { type: "got" }),
    /Only the clue-giver/,
  );
});

test("got, skip, undo and the buzzer manage the deck", () => {
  const state = newGame();
  draftAll(state);
  const team = state.activeTeam;
  monikers.action(state, state.giver, { type: "start" });
  const first = state.current;
  monikers.action(state, state.giver, { type: "got" });
  assert.equal(state.teams[team].rounds[0], CARDS[first].points);
  const second = state.current;
  monikers.action(state, state.giver, { type: "skip" });
  assert.deepEqual(state.skipped, [second]);
  const third = state.current;
  monikers.action(state, state.giver, { type: "got" });
  monikers.action(state, state.giver, { type: "undo" });
  assert.equal(state.current, third);
  assert.equal(state.teams[team].rounds[0], CARDS[first].points);
  tick(state, state.seconds);
  assert.equal(state.phase, "review");
  // Skipped and unfinished cards go back in the deck.
  assert.equal(state.drawPile.length, 31);
  assert.ok(state.drawPile.includes(second) && state.drawPile.includes(third));
  assert.equal(monikers.frame(state, "a").turn.claims.length, 1);
});

test("skipping the last cards reshuffles them back in mid-turn", () => {
  const state = newGame();
  draftAll(state);
  monikers.action(state, state.giver, { type: "start" });
  for (let i = 0; i < 40; i++)
    monikers.action(state, state.giver, { type: "skip" });
  assert.equal(state.phase, "turn");
  assert.equal(
    state.drawPile.length + state.skipped.length + 1,
    state.deck.length,
  );
});

test("disputed cards go back in the deck after review", () => {
  const state = newGame();
  draftAll(state);
  const team = state.activeTeam;
  playTurn(state, 2);
  const [disputed] = monikers.frame(state, "a").turn.claims;
  monikers.action(state, "b", { type: "dispute", card: disputed.id });
  assert.equal(monikers.frame(state, "a").turn.claims[0].rejected, true);
  assert.equal(monikers.frame(state, "a").turn.claims[0].by, "B");
  tick(state, REVIEW_SECONDS);
  assert.equal(state.phase, "ready");
  assert.ok(state.drawPile.includes(disputed.id));
  assert.equal(state.drawPile.length, 31);
  assert.notEqual(state.activeTeam, team, "teams alternate turns");
});

test("teams alternate, giver rotates, and the lowest score starts the next round", () => {
  const state = newGame();
  draftAll(state);
  const givers = [];
  for (let i = 0; i < 4; i++) {
    givers.push(state.giver);
    playTurn(state, 3);
    monikers.action(state, state.giver, { type: "continue" });
  }
  assert.equal(new Set(givers).size, 4, "everyone gives clues once");
  playTurn(state);
  const leader = state.activeTeam;
  monikers.action(state, state.giver, { type: "continue" });
  assert.equal(state.phase, "break");
  assert.equal(
    state.teams[0].rounds[0] + state.teams[1].rounds[0],
    state.deck.reduce((sum, c) => sum + CARDS[c].points, 0),
  );
  monikers.action(state, "c", { type: "continue" });
  assert.equal(state.round, 1);
  assert.equal(state.drawPile.length, state.deck.length);
  const totals = state.teams.map((t) => t.rounds[0]);
  const trailing =
    totals[0] === totals[1] ? 1 - leader : totals.indexOf(Math.min(...totals));
  assert.equal(state.activeTeam, trailing);
  assert.equal(monikers.frame(state, "a").rule.title, ROUNDS[1].title);
});

test("a full game ends after the last round with team results", () => {
  const state = newGame({ seconds: 30, deck: 30, rounds: 4 });
  draftAll(state);
  let guard = 0;
  while (!tick(state, 0) && guard++ < 200) {
    if (state.phase === "ready") playTurn(state);
    else if (state.phase === "review")
      monikers.action(state, state.giver, { type: "continue" });
    else if (state.phase === "break")
      monikers.action(state, "a", { type: "continue" });
  }
  assert.equal(state.phase, "over");
  assert.equal(state.round, 3);
  const results = monikers.results(state);
  assert.equal(results.length, 2);
  assert.ok(results[0].score >= results[1].score);
  const deckPoints = state.deck.reduce((sum, c) => sum + CARDS[c].points, 0);
  assert.equal(results[0].score + results[1].score, deckPoints * 4);
  assert.match(results[0].detail, /^R1 \d+ · R2 \d+ · R3 \d+ · R4 \d+$/);
});

test("players can join mid-game and a leaving clue-giver ends the turn", () => {
  const state = newGame();
  monikers.join(state, { id: "e", name: "E", team: 1 });
  assert.equal(state.players.get("e").hand.length, state.draft.deal);
  draftAll(state);
  assert.equal(state.deck.length, 40);
  monikers.action(state, state.giver, { type: "start" });
  const giver = state.giver;
  monikers.leave(state, giver);
  assert.equal(state.phase, "review");
  assert.ok(!state.teams.some((t) => t.members.includes(giver)));
  tick(state, REVIEW_SECONDS);
  assert.equal(state.phase, "ready");
  assert.ok(state.players.has(state.giver));
  const late = state.giver;
  const bystander = [...state.players.keys()].find((id) => id !== late);
  assert.throws(
    () => monikers.action(state, bystander, { type: "pass" }),
    /Give them a moment/,
  );
  tick(state, 30);
  monikers.action(state, bystander, { type: "pass" });
  assert.notEqual(state.giver, late);
});
