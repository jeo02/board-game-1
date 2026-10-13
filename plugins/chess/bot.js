// Computer opponent for the chess plugin: an alpha-beta search with
// quiescence over the shared rules engine, tuned to three levels. It's pure
// and synchronous; the game server runs it in a worker thread (bot-worker.js)
// so a long think never stalls the realtime games sharing the server.
//
// easy    looks one move ahead, misjudges trades and often plays on a whim
// medium  searches a few moves deep with a little randomness
// hard    deepens until its time budget runs out and plays its best move

import {
  BISHOP,
  COLOR,
  KING,
  KNIGHT,
  PAWN,
  QUEEN,
  ROOK,
  TYPE,
  WHITE,
  colorIndex,
  fileOf,
  fromFen,
  inCheck,
  legalMoves,
  makeMove,
  positionKey,
  pseudoMoves,
  rankOf,
  uci,
  unmakeMove,
} from "./rules.js";

export const LEVELS = {
  easy: { depth: 1, quiesce: false, noise: 160, whim: 0.25 },
  medium: { depth: 3, quiesce: true, noise: 30, whim: 0.03 },
  hard: { depth: 32, quiesce: true, noise: 0, whim: 0, seconds: 1.5 },
};

const MATE = 100000;
const VALUE = [0, 100, 320, 330, 500, 900, 0];

// Piece-square tables (Tomasz Michniewski's "simplified evaluation
// function"), written from White's side with a8 first.
const TABLES = {
  [PAWN]: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30,
    20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5,
    -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0,
    0,
  ],
  [KNIGHT]: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30,
    0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20,
    20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20,
    -40, -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  [BISHOP]: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0,
    5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10,
    0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20,
    -10, -10, -10, -10, -10, -10, -20,
  ],
  [ROOK]: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0,
    -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0,
    0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  [QUEEN]: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5,
    5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5,
    5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10,
    -10, -20,
  ],
  [KING]: [
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40,
    -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40,
    -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20,
    -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
  ],
};
const KING_ENDGAME = [
  -50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30,
  -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30,
  0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50,
];

const centerDistance = (sq) =>
  Math.max(3 - rankOf(sq), rankOf(sq) - 4, 0) +
  Math.max(3 - fileOf(sq), fileOf(sq) - 4, 0);

// Static evaluation in centipawns from the side to move's point of view.
export function evaluate(pos) {
  const b = pos.board;
  let score = 0;
  const pieces = [0, 0]; // non-pawn material per side
  const bishops = [0, 0];
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) {
      sq += 7;
      continue;
    }
    const p = b[sq];
    if (!p) continue;
    const type = p & TYPE;
    const side = colorIndex(p & COLOR);
    if (type !== PAWN && type !== KING) pieces[side] += VALUE[type];
    if (type === BISHOP) bishops[side]++;
    if (type === KING) continue;
    const index =
      side === 0
        ? (7 - rankOf(sq)) * 8 + fileOf(sq)
        : rankOf(sq) * 8 + fileOf(sq);
    score += (side === 0 ? 1 : -1) * (VALUE[type] + TABLES[type][index]);
  }
  const endgame = pieces[0] <= 1300 && pieces[1] <= 1300;
  pos.kings.forEach((sq, side) => {
    const index =
      side === 0
        ? (7 - rankOf(sq)) * 8 + fileOf(sq)
        : rankOf(sq) * 8 + fileOf(sq);
    score +=
      (side === 0 ? 1 : -1) * (endgame ? KING_ENDGAME : TABLES[KING])[index];
  });
  score += (bishops[0] >= 2 ? 30 : 0) - (bishops[1] >= 2 ? 30 : 0);
  // Mop-up: when clearly winning an endgame, herd the losing king to the
  // edge and bring our own king closer, so won endings actually get won.
  if (endgame && Math.abs(score) > 300) {
    const winner = score > 0 ? 0 : 1;
    const [mine, theirs] = [pos.kings[winner], pos.kings[1 - winner]];
    const between =
      Math.abs(rankOf(mine) - rankOf(theirs)) +
      Math.abs(fileOf(mine) - fileOf(theirs));
    const bonus = centerDistance(theirs) * 10 + (14 - between) * 4;
    score += winner === 0 ? bonus : -bonus;
  }
  return pos.turn === WHITE ? score : -score;
}

// Most valuable victim first, then least valuable attacker; promotions too.
const mvvLva = (move) =>
  (move.captured
    ? VALUE[move.captured & TYPE] * 10 - VALUE[move.piece & TYPE] / 10
    : 0) + (move.promotion ? VALUE[move.promotion] * 10 : 0);
const sameMove = (a, b) => a && b && a.from === b.from && a.to === b.to;

function order(moves, killers) {
  for (const m of moves)
    m.order =
      m.captured || m.promotion
        ? 1e6 + mvvLva(m)
        : killers?.some((k) => sameMove(k, m))
          ? 5e5
          : 0;
  return moves.sort((a, b) => b.order - a.order);
}

function quiesce(pos, alpha, beta, ctx) {
  ctx.nodes++;
  const stand = evaluate(pos);
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  const us = pos.turn;
  for (const move of order(pseudoMoves(pos, true))) {
    makeMove(pos, move);
    if (inCheck(pos, us)) {
      unmakeMove(pos);
      continue;
    }
    const score = -quiesce(pos, -beta, -alpha, ctx);
    unmakeMove(pos);
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(pos, depth, alpha, beta, ply, ctx) {
  if ((++ctx.nodes & 1023) === 0 && performance.now() > ctx.deadline)
    ctx.stopped = true;
  if (ctx.stopped) return 0;
  const check = inCheck(pos);
  // Never stop searching while in check, so mates are always seen.
  if (check) depth++;
  if (depth <= 0)
    return ctx.quiesce ? quiesce(pos, alpha, beta, ctx) : evaluate(pos);
  if (pos.halfmove >= 100) return 0;
  const us = pos.turn;
  const killers = (ctx.killers[ply] ??= [null, null]);
  let legal = 0;
  let best = -MATE;
  for (const move of order(pseudoMoves(pos), killers)) {
    makeMove(pos, move);
    if (inCheck(pos, us)) {
      unmakeMove(pos);
      continue;
    }
    legal++;
    const score = -search(pos, depth - 1, -beta, -alpha, ply + 1, ctx);
    unmakeMove(pos);
    if (ctx.stopped) return 0;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      if (!move.captured && !move.promotion && !sameMove(killers[0], move)) {
        killers[1] = killers[0];
        killers[0] = move;
      }
      break;
    }
  }
  if (!legal) return check ? -MATE + ply : 0;
  return best;
}

// Scores root moves in order. With `exact`, every move gets a true score
// (for picking with noise); otherwise moves that can't beat the best so far
// are cut short. Moves that repeat a position for the third time score as a
// draw, since the game would end right there.
function scoreRoot(pos, moves, depth, ctx, exact) {
  const scored = [];
  let alpha = -MATE - 1;
  for (const move of moves) {
    makeMove(pos, move);
    let score;
    if (ctx.repeats.has(positionKey(pos))) score = 0;
    else if (depth > 1 || ctx.quiesce)
      score = -search(
        pos,
        depth - 1,
        -MATE - 1,
        exact ? MATE + 1 : -alpha,
        1,
        ctx,
      );
    else if (legalMoves(pos).length) score = -evaluate(pos);
    else score = inCheck(pos) ? MATE - 1 : 0;
    unmakeMove(pos);
    if (ctx.stopped) break;
    scored.push({ move, score });
    if (score > alpha) alpha = score;
  }
  return scored;
}

const best = (scored) => scored.reduce((a, b) => (b.score > a.score ? b : a));

// Picks a move for the side to move. Returns it in UCI form ("e2e4",
// "e7e8q"), or null when there are no legal moves. `repeats` lists position
// keys already seen twice; `seconds` caps the hard level's thinking time.
export function chooseMove({
  fen,
  level = "medium",
  repeats = [],
  random = Math.random,
  seconds,
}) {
  const settings = LEVELS[level] ?? LEVELS.medium;
  const pos = fromFen(fen);
  // Shuffled so equally good moves vary from game to game.
  const moves = legalMoves(pos)
    .map((move) => ({ move, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ move }) => move);
  if (moves.length <= 1) return moves.length ? uci(moves[0]) : null;
  if (random() < settings.whim)
    return uci(moves[Math.floor(random() * moves.length)]);
  const ctx = {
    nodes: 0,
    killers: [],
    quiesce: settings.quiesce,
    repeats: new Set(repeats),
    stopped: false,
    deadline: Infinity,
  };
  if (!settings.seconds) {
    const scored = scoreRoot(pos, moves, settings.depth, ctx, true);
    return uci(pickNoisy(scored, settings.noise, random).move);
  }
  // Hard: iterative deepening, searching the previous best move first and
  // stopping when the time budget is spent.
  const budget = Math.max(
    0.05,
    Math.min(settings.seconds, seconds ?? Infinity),
  );
  const start = performance.now();
  ctx.deadline = start + budget * 1000;
  let top = { move: moves[0] };
  let ranked = moves;
  for (let depth = 1; depth <= settings.depth; depth++) {
    const scored = scoreRoot(pos, ranked, depth, ctx, false);
    // An interrupted iteration still searched the previous best move first,
    // so its best so far is at least as trustworthy.
    if (scored.length) top = best(scored);
    if (ctx.stopped || top.score >= MATE - 100) break;
    ranked = [top.move, ...ranked.filter((m) => m !== top.move)];
    // The next iteration would take several times longer; don't start it.
    if (performance.now() - start > budget * 500) break;
  }
  return uci(top.move);
}

// Picks the best move after adding random noise to each score, so weaker
// levels sometimes prefer a worse move. Mates are never missed this way.
function pickNoisy(scored, amount, random) {
  return best(
    scored.map(({ move, score }) => ({
      move,
      score: score >= MATE - 100 ? score : score + (random() * 2 - 1) * amount,
    })),
  );
}

// The computer accepts a draw offer when it thinks it's worse off.
export function wantsDraw(fen, color) {
  const pos = fromFen(fen);
  const score = quiesce(pos, -MATE, MATE, { nodes: 0 });
  return (pos.turn === color ? score : -score) <= -150;
}
