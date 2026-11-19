import { test } from "node:test";
import assert from "node:assert/strict";
import game from "../plugins/sorry/server.js";
import { START, HOME } from "../plugins/sorry/public/board.js";

function setup(board, card) {
  const s = game.create({
    players: game.meta.colors
      .slice(0, 2)
      .map((color, i) => ({ color, name: `P${i}`, id: `p${i}` })),
  });
  s.turn = 0;
  if (board) s.board = board;
  if (card) draw(s, card);
  return s;
}
function act(s, action) {
  game.action(s, s.players[s.turn].id, { revision: s.revision, ...action });
}
function draw(s, card) {
  s.deck.push(card);
  act(s, { type: "draw" });
}
function move(s, label) {
  act(s, {
    type: "move",
    index: s.options.findIndex((o) => o.label === label),
  });
}
const nest = () => [START, START, START, START];
test("classic deck, private move choices, start bump and extra draws on twos", () => {
  const s = setup();
  assert.equal(s.deck.length, 45);
  s.board[1][0] = 4;
  draw(s, 2);
  assert.deepEqual(game.frame(s, "p1").options, []);
  assert.throws(() =>
    game.action(s, "p1", { type: "move", index: 0, revision: s.revision }),
  );
  move(s, "Pawn 1: leave Start");
  assert.equal(s.board[0][0], 4);
  assert.deepEqual(s.board[1], nest());
  assert.equal(s.turn, 0);
  s.board[0] = [64, HOME, HOME, HOME];
  draw(s, 2);
  move(s, "Pass");
  assert.equal(s.turn, 0);
  s.deck = [];
  act(s, { type: "draw" });
  assert.equal(s.card, 2);
});
test("backing past Start gives a shortcut; safety can be exited backward", () => {
  const s = setup([[4, START, START, START], nest()], 4);
  move(s, "Pawn 1: back 4");
  assert.equal(s.board[0][0], 0);
  s.turn = 0;
  draw(s, 3);
  move(s, "Pawn 1: forward 3");
  assert.equal(s.board[0][0], 60);
  s.turn = 0;
  draw(s, 10);
  move(s, "Pawn 1: back 1");
  assert.equal(s.board[0][0], 2);
});
test("opposing slides bump both colors including the endpoint; own slides do not fire", () => {
  const s = setup(
    [
      [13, 17, START, START],
      [16, 19, START, START],
    ],
    3,
  );
  move(s, "Pawn 1: forward 3");
  assert.deepEqual(s.board, [[19, START, START, START], nest()]);
  s.turn = 0;
  s.board[0][0] = 6;
  draw(s, 3);
  move(s, "Pawn 1: forward 3");
  assert.equal(s.board[0][0], 9);
});
test("Sorry and switches target only open-track opponents; a switch alone may be declined", () => {
  const s = setup(
    [
      [START, 64, HOME, HOME],
      [16, 60, HOME, START],
    ],
    "Sorry!",
  );
  assert.deepEqual(
    s.options.map((o) => o.label),
    ["Pawn 1: replace P1's pawn 1"],
  );
  move(s, s.options[0].label);
  assert.equal(s.board[0][0], 19);
  s.turn = 0;
  s.board[0][0] = 0;
  s.board[1][0] = 25;
  draw(s, 11);
  assert.deepEqual(
    s.options.map((o) => o.label),
    ["Pawn 1: switch with P1's pawn 1", "Pass"],
  );
  move(s, s.options[0].label);
  assert.equal(s.board[1][0], 0);
  assert.equal(s.board[0][0], 25);
});
test("split seven must use both parts legally; exact Home ends the game", () => {
  const s = setup([[63, 60, HOME, HOME], nest()], 7);
  assert.ok(
    !s.options.some((o) => o.label === "Pass" || o.label.endsWith("forward 7")),
  );
  move(s, "Pawn 1 +2, then pawn 2 +5");
  assert.deepEqual(s.board[0], [HOME, HOME, HOME, HOME]);
  assert.equal(game.tick(s), true);
  assert.deepEqual(game.results(s)[0], { id: "p0", score: 4 });
  assert.throws(() => act(s, { type: "draw" }));
});
