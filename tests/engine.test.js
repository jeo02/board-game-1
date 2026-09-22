import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  addPlayer,
  startGame,
  telephoneSubmit,
  chooseWord,
  chooseCharade,
  answerTrivia,
  guess,
  addStroke,
  editCanvas,
  viewFor,
  tick,
} from "../server/engine.js";
const stroke = {
  color: "#302c41",
  width: 7,
  points: [
    [0.1, 0.2],
    [0.3, 0.4],
  ],
};
function setup(mode = "telephone", count = 3) {
  const room = createRoom("Test crew", mode, 1, 30);
  for (let i = 0; i < count; i++) addPlayer(room, `p${i}`, `Player ${i}`);
  return room;
}
test("rooms enforce names, capacity, host controls and minimum players", () => {
  const r = setup("telephone", 1);
  assert.throws(() => addPlayer(r, "bad", "  "), /name/);
  assert.throws(() => addPlayer(r, "bad", "player 0"), /already/);
  assert.throws(() => startGame(r, "p1"), /host/);
  assert.throws(() => startGame(r, "p0"), /3/);
  for (let i = 1; i < 8; i++) addPlayer(r, `p${i}`, `Player ${i}`);
  assert.throws(() => addPlayer(r, "p9", "Player 9"), /full/);
  startGame(r, "p0");
  assert.throws(() => addPlayer(r, "p9", "Late guest"), /already started/);
  assert.throws(() => startGame(r, "p0"), /already in progress/);
});
test("telephone rotates private chains and reveals complete stories", () => {
  const r = setup();
  startGame(r, "p0");
  for (let i = 0; i < 3; i++) telephoneSubmit(r, `p${i}`, `Prompt ${i}`);
  assert.equal(r.phase, "draw");
  assert.equal(viewFor(r, "p1").previous.text, "Prompt 0");
  assert.equal(viewFor(r, "p2").previous.text, "Prompt 1");
  assert.equal(viewFor(r, "p0").previous.text, "Prompt 2");
  assert.equal(viewFor(r, "p0").chains, undefined);
  assert.throws(() => telephoneSubmit(r, "p0"), /drawing/);
  for (let i = 0; i < 3; i++) {
    addStroke(r, `p${i}`, stroke);
    telephoneSubmit(r, `p${i}`);
    if (i === 0)
      assert.throws(() => telephoneSubmit(r, "p0"), /already submitted/);
  }
  assert.equal(r.phase, "describe");
  assert.equal(viewFor(r, "p2").previous.author, "Player 1");
  for (let i = 0; i < 3; i++) telephoneSubmit(r, `p${i}`, `Guess ${i}`);
  assert.equal(r.phase, "results");
  assert.deepEqual(
    r.chains[0].entries.map((e) => e.author),
    ["Player 0", "Player 1", "Player 2"],
  );
  assert.equal(viewFor(r, "p0").chains.length, 3);
  startGame(r, "p0");
  assert.equal(r.phase, "prompt");
  assert.equal(r.chains[0].entries.length, 0);
});
test("telephone supports an even player count ending in a drawing", () => {
  const r = setup("telephone", 4);
  startGame(r, "p0");
  for (let round = 0; round < 4; round++)
    for (let i = 0; i < 4; i++) {
      if (round % 2) addStroke(r, `p${i}`, stroke);
      telephoneSubmit(r, `p${i}`, `Round ${round}`);
    }
  assert.equal(r.phase, "results");
  assert.equal(r.chains[0].entries.length, 4);
  assert.equal(r.chains[0].entries.at(-1).type, "drawing");
});
test("drawing validation and canvas editing are scoped to the artist", () => {
  const r = setup();
  startGame(r, "p0");
  for (let i = 0; i < 3; i++) telephoneSubmit(r, `p${i}`, "Hello");
  assert.throws(
    () => addStroke(r, "p0", { ...stroke, points: [[Infinity, 0]] }),
    /Invalid/,
  );
  assert.throws(
    () => addStroke(r, "p0", { ...stroke, color: "red" }),
    /Invalid/,
  );
  addStroke(r, "p0", stroke);
  addStroke(r, "p1", stroke);
  assert.equal(viewFor(r, "p0").strokes.length, 1);
  editCanvas(r, "p0", "undo");
  assert.equal(r.strokes.length, 1);
  assert.equal(r.strokes[0].player, "p1");
  addStroke(r, "p0", stroke);
  editCanvas(r, "p0", "clear");
  assert.equal(r.strokes.length, 1);
});
test("scribble keeps words private, scores once and rotates to results", () => {
  const r = setup("scribble", 2);
  startGame(r, "p0");
  assert.equal(r.phase, "choose");
  assert.equal(viewFor(r, "p1").choices, undefined);
  assert.throws(() => chooseWord(r, "p1", r.choices[0]), /turn/);
  chooseWord(r, "p0", r.choices[0]);
  assert.equal(viewFor(r, "p1").word, null);
  assert.equal(viewFor(r, "p0").word, r.word);
  assert.throws(() => addStroke(r, "p1", stroke), /turn/);
  assert.throws(() => guess(r, "p0", "cheating"), /someone else/);
  guess(r, "p1", "wrong answer");
  assert.equal(r.players[1].score, 0);
  guess(r, "p1", r.word.toUpperCase(), r.deadline - 15000);
  assert.equal(r.players[1].score, 300);
  assert.equal(r.players[0].score, 100);
  assert.equal(r.phase, "reveal");
  assert.equal(viewFor(r, "p1").word, r.word);
  tick(r, r.deadline + 1);
  assert.equal(r.drawer, "p1");
  chooseWord(r, "p1", r.choices[0]);
  guess(r, "p0", r.word);
  tick(r, r.deadline + 1);
  assert.equal(r.phase, "results");
  assert.equal(r.deadline, null);
});
test("correct guess cannot score twice while others are still guessing", () => {
  const r = setup("scribble", 3);
  startGame(r, "p0");
  chooseWord(r, "p0", r.choices[0]);
  guess(r, "p1", r.word);
  assert.throws(() => guess(r, "p1", r.word), /already got/);
  assert.equal(r.guessed.length, 1);
});
test("timeouts auto-pick words and advance rounds without guesses", () => {
  const r = setup("scribble", 2);
  startGame(r, "p0");
  assert.equal(tick(r, r.deadline - 1), false);
  tick(r, r.deadline + 1);
  assert.equal(r.phase, "drawing");
  tick(r, r.deadline + 1);
  assert.equal(r.phase, "reveal");
  tick(r, r.deadline + 1);
  assert.equal(r.drawer, "p1");
  assert.equal(r.strokes.length, 0);
});

test("guesses at or after the deadline cannot earn points", () => {
  const r = setup("scribble", 2);
  startGame(r, "p0");
  chooseWord(r, "p0", r.choices[0]);
  assert.throws(() => guess(r, "p1", r.word, r.deadline), /Time’s up/);
  assert.equal(r.players[1].score, 0);
});

test("charades keeps prompts private, scores guesses and rotates performers", () => {
  const r = setup("charades", 2);
  startGame(r, "p0");
  assert.equal(r.phase, "choose");
  assert.equal(viewFor(r, "p1").choices, undefined);
  chooseCharade(r, "p0", r.choices[0]);
  assert.equal(r.phase, "acting");
  assert.equal(viewFor(r, "p1").word, null);
  guess(r, "p1", r.word);
  assert.equal(r.phase, "reveal");
  assert.ok(r.players[1].score >= 100);
  tick(r, r.deadline + 1);
  assert.equal(r.drawer, "p1");
});

test("trivia hides answers, scores correct responses and finishes five questions", () => {
  const r = setup("trivia", 2);
  startGame(r, "p0");
  assert.equal(r.phase, "question");
  assert.equal(viewFor(r, "p0").trivia.answer, undefined);
  answerTrivia(r, "p0", r.trivia.answer, r.deadline - 15000);
  answerTrivia(
    r,
    "p1",
    r.trivia.choices.find((c) => c !== r.trivia.answer),
  );
  assert.equal(r.phase, "reveal");
  assert.equal(viewFor(r, "p1").trivia.answer, r.trivia.answer);
  assert.ok(r.players[0].score > 100);
  for (let i = 1; i < 5; i++) {
    tick(r, r.deadline + 1);
    answerTrivia(r, "p0", r.trivia.answer);
    answerTrivia(r, "p1", r.trivia.answer);
  }
  tick(r, r.deadline + 1);
  assert.equal(r.phase, "results");
});
