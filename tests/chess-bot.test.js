import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseMove, evaluate, wantsDraw } from "../plugins/chess/bot.js";
import {
  BLACK,
  WHITE,
  fromFen,
  legalMoves,
  makeMove,
  positionKey,
  uci,
} from "../plugins/chess/rules.js";

const seeded =
  (seed = 3) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
const LEVELS = ["easy", "medium", "hard"];
const MATE_IN_ONE =
  "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";
// 1. Qg8+ Rxg8 2. Nf7# (a smothered mate).
const MATE_IN_TWO = "3r3k/6pp/7N/8/2Q5/8/8/6K1 w - - 0 1";
const FREE_QUEEN =
  "rnb1kbnr/pppp1ppp/8/4p1q1/4P3/3P4/PPP2PPP/RNBQKBNR w KQkq - 0 3";

test("every level plays legal moves and stops when there are none", () => {
  const fens = [
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R b KQkq - 0 1",
    "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
  ];
  for (const level of LEVELS)
    for (const fen of fens) {
      const move = chooseMove({ fen, level, random: seeded(), seconds: 0.2 });
      assert.ok(
        legalMoves(fromFen(fen)).map(uci).includes(move),
        `${level}: ${move}`,
      );
    }
  const mated = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
  assert.equal(chooseMove({ fen: mated, level: "hard" }), null);
  assert.equal(
    chooseMove({ fen: "7k/8/8/8/8/8/6q1/7K w - - 0 1", level: "hard" }),
    "h1g2",
    "the only legal move is played immediately",
  );
});

test("medium and hard find mates; hard finds the smothered mate in two", () => {
  for (const level of ["medium", "hard"])
    assert.equal(
      chooseMove({ fen: MATE_IN_ONE, level, random: seeded() }),
      "h5f7",
      level,
    );
  assert.equal(chooseMove({ fen: MATE_IN_TWO, level: "hard" }), "c4g8");
  assert.equal(
    chooseMove({ fen: MATE_IN_TWO, level: "medium", random: seeded() }),
    "c4g8",
  );
});

test("weaker levels grab free material less reliably", () => {
  const grabs = (level) => {
    const moves = [];
    for (let seed = 1; seed <= 30; seed++)
      moves.push(
        chooseMove({
          fen: FREE_QUEEN,
          level,
          random: seeded(seed * 7919),
          seconds: 0.05,
        }),
      );
    return {
      count: moves.filter((m) => m === "c1g5").length,
      kinds: new Set(moves).size,
    };
  };
  const easy = grabs("easy");
  assert.ok(easy.count >= 15, `easy took the queen ${easy.count}/30 times`);
  assert.ok(easy.kinds > 1, "but not every time");
  // Medium plays a random move about 3% of the time; hard never does.
  assert.ok(grabs("medium").count >= 27);
  assert.equal(grabs("hard").count, 30);
});

test("hard stays within its time budget", () => {
  const start = performance.now();
  chooseMove({
    fen: "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
    level: "hard",
    seconds: 0.25,
  });
  assert.ok(performance.now() - start < 1000);
});

test("a winning computer steers clear of a drawing repetition", () => {
  const fen = "4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1";
  const first = chooseMove({ fen, level: "hard", seconds: 0.3 });
  const pos = fromFen(fen);
  makeMove(
    pos,
    legalMoves(pos).find((m) => uci(m) === first),
  );
  const second = chooseMove({
    fen,
    level: "hard",
    seconds: 0.3,
    repeats: [positionKey(pos)],
  });
  assert.notEqual(second, first);
});

test("evaluation and draw offers follow the material", () => {
  const start = fromFen();
  assert.equal(evaluate(start), 0);
  const upQueen = fromFen("4k3/8/8/8/8/8/8/Q3K3 w - - 0 1");
  assert.ok(evaluate(upQueen) > 800);
  upQueen.turn = BLACK;
  assert.ok(evaluate(upQueen) < -800);
  assert.equal(wantsDraw("4k3/8/8/8/8/8/8/Q3K3 w - - 0 1", BLACK), true);
  assert.equal(wantsDraw("4k3/8/8/8/8/8/8/Q3K3 w - - 0 1", WHITE), false);
  assert.equal(
    wantsDraw(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      BLACK,
    ),
    false,
  );
});
