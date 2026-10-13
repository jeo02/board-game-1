import { Chess } from "chess.js";
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";

const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function evaluate(chess) {
  if (chess.isCheckmate()) return -100000;
  if (chess.isDraw()) return 0;
  let score = 0;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const file = piece.square.charCodeAt(0) - 97;
      const rank = Number(piece.square[1]) - 1;
      const center = 7 - Math.abs(file - 3.5) - Math.abs(rank - 3.5);
      const development =
        piece.type === "p"
          ? (piece.color === "w" ? rank : 7 - rank) * 8
          : ["n", "b"].includes(piece.type)
            ? center * 10
            : 0;
      score +=
        (piece.color === chess.turn() ? 1 : -1) *
        (VALUES[piece.type] + development);
    }
  }
  return score;
}

const orderMoves = (moves) =>
  moves.sort(
    (a, b) =>
      (VALUES[b.captured] ?? 0) +
      (VALUES[b.promotion] ?? 0) -
      (VALUES[a.captured] ?? 0) -
      (VALUES[a.promotion] ?? 0),
  );
const moveInput = ({ from, to, promotion }) => ({
  from,
  to,
  ...(promotion ? { promotion } : {}),
});

// Iterative deepening keeps a completed answer within a bounded search budget.
export function chooseMove(
  fen,
  difficulty = "medium",
  random = Math.random,
  budgetMs = Infinity,
) {
  if (!["easy", "medium", "hard"].includes(difficulty))
    throw new Error("Unknown bot difficulty.");
  const chess = new Chess(fen);
  const moves = orderMoves(chess.moves({ verbose: true }));
  if (chess.isGameOver() || !moves.length) return null;
  if (difficulty === "easy")
    return moveInput(moves[Math.floor(random() * moves.length)]);
  const deadline =
    performance.now() + Math.min(difficulty === "hard" ? 700 : 200, budgetMs);
  const maximumDepth = difficulty === "hard" ? 3 : 2;
  const timeout = Symbol("search-timeout");
  function search(depth, alpha, beta, ply) {
    if (performance.now() >= deadline) throw timeout;
    if (chess.isCheckmate()) return -100000 + ply;
    if (depth === 0 || chess.isDraw()) return evaluate(chess);
    let best = -Infinity;
    for (const move of orderMoves(chess.moves({ verbose: true }))) {
      chess.move(moveInput(move));
      let score;
      try {
        score = -search(depth - 1, -beta, -alpha, ply + 1);
      } finally {
        chess.undo();
      }
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return best;
  }
  let bestMove = moves[0];
  for (let depth = 1; depth <= maximumDepth; depth++) {
    let candidate = moves[0];
    let best = -Infinity;
    try {
      for (const move of moves) {
        chess.move(moveInput(move));
        let score;
        try {
          score = -search(depth - 1, -Infinity, -best, 1);
        } finally {
          chess.undo();
        }
        if (score > best) {
          best = score;
          candidate = move;
        }
      }
      bestMove = candidate;
    } catch (error) {
      if (error !== timeout) throw error;
      break;
    }
  }
  return moveInput(bestMove);
}

// Search never blocks the shared game scheduler or other rooms.
export function requestMove(fen, difficulty, budgetMs = Infinity) {
  const worker = new Worker(new URL("./bot.js", import.meta.url), {
    workerData: { fen, difficulty, budgetMs },
  });
  const promise = new Promise((resolve, reject) => {
    let received = false;
    worker.once("message", (move) => {
      received = true;
      resolve(move);
    });
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (!received)
        reject(new Error(`Chess bot exited without a move (code ${code}).`));
    });
  });
  return { promise, cancel: () => worker.terminate() };
}

if (!isMainThread && workerData) {
  parentPort.postMessage(
    chooseMove(
      workerData.fen,
      workerData.difficulty,
      Math.random,
      workerData.budgetMs,
    ),
  );
}
