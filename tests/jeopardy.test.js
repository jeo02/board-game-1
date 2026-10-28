import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePlugin } from "../server/plugins.js";
import {
  addPlayer,
  createRoom,
  setLobbySlot,
  startGame,
  viewFor,
} from "../server/engine.js";
import jeopardy, { action, frame, tick } from "../plugins/jeopardy/server.js";

const seeded =
  (seed = 13) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
const plugin = validatePlugin(jeopardy, "jeopardy");
const contestants = [
  { id: "a", name: "Ana", lobbySlot: "left" },
  { id: "b", name: "Ben", lobbySlot: "center" },
  { id: "c", name: "Cy", lobbySlot: "right" },
];

test("slot lobby auto-assigns open podiums and allows switching", () => {
  assert.equal(plugin.meta.lobby.kind, "slots");
  assert.equal(plugin.meta.lobby.slots.length, 3);
  const room = createRoom("Quiz", "jeopardy", 2, 60, plugin, {});
  addPlayer(room, "a", "Ana");
  addPlayer(room, "b", "Ben");
  assert.deepEqual(
    room.players.map((player) => player.lobbySlot),
    ["left", "center"],
  );
  assert.throws(() => setLobbySlot(room, "b", "left"), /Ana already chose/);
  setLobbySlot(room, "a", "right");
  setLobbySlot(room, "b", "left");
  const lobby = viewFor(room, "a").lobby;
  assert.equal(lobby.ready, true);
  assert.deepEqual(lobby.openSlotIds, ["center"]);
  assert.equal(lobby.slots[0].playerName, "Ben");
  assert.equal(lobby.slots[2].playerName, "Ana");
  startGame(room, "a");
  assert.equal(room.phase, "playing");
  assert.throws(() => setLobbySlot(room, "a", "right"), /between games/);
});

test("regular clues require question form and transfer board control", () => {
  const state = jeopardy.create({
    players: contestants,
    random: seeded(),
  });
  assert.ok(
    frame(state, "a").categories.includes("Movies That Escalated Quickly"),
  );
  const chooser = state.selector;
  const cell = state.board.flat().find((candidate) => !candidate.dailyDouble);
  action(state, chooser, { type: "select", cell: cell.id });
  const responder = contestants.find((player) => player.id !== chooser).id;
  action(state, responder, { type: "buzz" });
  action(state, responder, { type: "answer", answer: cell.answers[0] });
  assert.equal(state.players.get(responder).score, -cell.value);
  assert.equal(state.phase, "clue");
  action(state, chooser, { type: "buzz" });
  action(state, chooser, {
    type: "answer",
    answer: `What is ${cell.answers[0]}?`,
  });
  assert.equal(state.players.get(chooser).score, cell.value);
  assert.equal(state.selector, chooser);
  assert.equal(state.phase, "reveal");
  assert.equal(frame(state, chooser).current.answer, cell.answers[0]);
  action(state, chooser, { type: "continue" });
  assert.equal(state.phase, "select");
});

test("Daily Double is exclusive and applies the chosen wager", () => {
  const state = jeopardy.create({
    players: contestants,
    random: seeded(2),
  });
  const chooser = state.selector;
  const dailyDouble = state.board.flat().find((cell) => cell.dailyDouble);
  action(state, chooser, { type: "select", cell: dailyDouble.id });
  assert.equal(state.phase, "daily-wager");
  assert.throws(
    () => action(state, "ghost", { type: "wager", amount: 500 }),
    /not in this game/,
  );
  assert.throws(
    () =>
      action(state, contestants.find((player) => player.id !== chooser).id, {
        type: "wager",
        amount: 500,
      }),
    /belongs/,
  );
  action(state, chooser, { type: "wager", amount: 700 });
  action(state, chooser, {
    type: "answer",
    answer: `What is ${dailyDouble.answers[0]}?`,
  });
  assert.equal(state.players.get(chooser).score, 700);
});

test("Final Jeopardy keeps wagers private and scores all finalists", () => {
  const state = jeopardy.create({
    players: contestants.slice(0, 2),
    random: seeded(),
  });
  state.players.get("a").score = 1200;
  state.players.get("b").score = 800;
  state.phase = "final-wager";
  state.finalists = ["a", "b"];
  state.finalWagers = new Map();
  state.finalAnswers = new Map();
  state.deadline = state.time + 30;
  action(state, "a", { type: "final-wager", amount: 600 });
  const privateFrame = frame(state, "b");
  assert.equal(privateFrame.final.submittedWagers, 1);
  assert.equal(privateFrame.final.reveals, null);
  assert.equal(privateFrame.wager, null);
  action(state, "b", { type: "final-wager", amount: 800 });
  assert.equal(state.phase, "final-clue");
  action(state, "a", {
    type: "final-answer",
    answer: "Who is Bruno Mars?",
  });
  action(state, "b", {
    type: "final-answer",
    answer: "Who is Thomas Edison?",
  });
  assert.equal(state.phase, "final-reveal");
  assert.equal(state.players.get("a").score, 1800);
  assert.equal(state.players.get("b").score, 0);
  assert.equal(frame(state, "a").final.reveals.length, 2);
  tick(state, 13);
  assert.equal(state.phase, "over");
});
