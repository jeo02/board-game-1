// Chess rules shared by the game server and the computer opponent: a 0x88
// board with make/unmake moves, legal move generation, SAN, and the draw
// rules (stalemate, repetition, 50 moves, insufficient material).
// Squares are rank * 16 + file, so a1 = 0, h1 = 7, a8 = 0x70, h8 = 0x77.

export const WHITE = 8;
export const BLACK = 16;
export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;
export const COLOR = WHITE | BLACK;
export const TYPE = 7;

export const CAPTURE = 1;
export const DOUBLE_PUSH = 2;
export const EN_PASSANT = 4;
export const PROMOTION = 8;
export const CASTLE = 16;

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const LETTERS = ".pnbrqk";
const FILES = "abcdefgh";
const KNIGHT_STEPS = [33, 31, 18, 14, -14, -18, -31, -33];
const KING_STEPS = [17, 16, 15, 1, -1, -15, -16, -17];
const DIAGONALS = [17, 15, -15, -17];
const LINES = [16, 1, -1, -16];
const PROMOTIONS = [QUEEN, ROOK, BISHOP, KNIGHT];
// Castling rights bits: white king/queen side, black king/queen side.
const WK = 1;
const WQ = 2;
const BK = 4;
const BQ = 8;
// Moving from or capturing on these squares removes castling rights.
const RIGHTS_MASK = new Uint8Array(128).fill(15);
RIGHTS_MASK[0x00] = 15 & ~WQ;
RIGHTS_MASK[0x04] = 15 & ~(WK | WQ);
RIGHTS_MASK[0x07] = 15 & ~WK;
RIGHTS_MASK[0x70] = 15 & ~BQ;
RIGHTS_MASK[0x74] = 15 & ~(BK | BQ);
RIGHTS_MASK[0x77] = 15 & ~BK;

export const rankOf = (sq) => sq >> 4;
export const fileOf = (sq) => sq & 7;
export const squareName = (sq) => FILES[sq & 7] + ((sq >> 4) + 1);
export function parseSquare(name) {
  const match = /^([a-h])([1-8])$/.exec(name ?? "");
  return match ? (Number(match[2]) - 1) * 16 + FILES.indexOf(match[1]) : -1;
}
export const colorIndex = (color) => (color === WHITE ? 0 : 1);
export const uci = (move) =>
  squareName(move.from) +
  squareName(move.to) +
  (move.promotion ? LETTERS[move.promotion] : "");

export function fromFen(fen = START_FEN) {
  const [placement, turn = "w", rights = "-", ep = "-", half, full] = String(
    fen,
  )
    .trim()
    .split(/\s+/);
  const rows = placement?.split("/") ?? [];
  if (rows.length !== 8) throw new Error("Invalid FEN board.");
  const pos = {
    board: new Uint8Array(128),
    turn: turn === "b" ? BLACK : WHITE,
    castling: 0,
    ep: ep === "-" ? -1 : parseSquare(ep),
    halfmove: Number(half) || 0,
    fullmove: Number(full) || 1,
    kings: [-1, -1],
    stack: [],
  };
  rows.forEach((row, i) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) file += Number(ch);
      else {
        const type = LETTERS.indexOf(ch.toLowerCase());
        if (type < 1 || file > 7) throw new Error("Invalid FEN piece.");
        const color = ch === ch.toLowerCase() ? BLACK : WHITE;
        const sq = (7 - i) * 16 + file++;
        pos.board[sq] = color | type;
        if (type === KING) pos.kings[colorIndex(color)] = sq;
      }
    }
  });
  if (pos.kings.includes(-1)) throw new Error("Both sides need a king.");
  for (const [ch, bit] of [
    ["K", WK],
    ["Q", WQ],
    ["k", BK],
    ["q", BQ],
  ])
    if (rights.includes(ch)) pos.castling |= bit;
  return pos;
}

export function toFen(pos) {
  const rows = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = "";
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const p = pos.board[rank * 16 + file];
      if (!p) empty++;
      else {
        if (empty) row += empty;
        empty = 0;
        const letter = LETTERS[p & TYPE];
        row += p & WHITE ? letter.toUpperCase() : letter;
      }
    }
    rows.push(row + (empty || ""));
  }
  const rights =
    [
      [WK, "K"],
      [WQ, "Q"],
      [BK, "k"],
      [BQ, "q"],
    ]
      .filter(([bit]) => pos.castling & bit)
      .map(([, ch]) => ch)
      .join("") || "-";
  return [
    rows.join("/"),
    pos.turn === WHITE ? "w" : "b",
    rights,
    pos.ep < 0 ? "-" : squareName(pos.ep),
    pos.halfmove,
    pos.fullmove,
  ].join(" ");
}

export function isAttacked(pos, sq, by) {
  const b = pos.board;
  // A white pawn attacks diagonally upward, so it sits below the square.
  const pawnFrom = by === WHITE ? [sq - 15, sq - 17] : [sq + 15, sq + 17];
  for (const t of pawnFrom)
    if (!(t & 0x88) && b[t] === (by | PAWN)) return true;
  for (const step of KNIGHT_STEPS) {
    const t = sq + step;
    if (!(t & 0x88) && b[t] === (by | KNIGHT)) return true;
  }
  for (const step of KING_STEPS) {
    const t = sq + step;
    if (!(t & 0x88) && b[t] === (by | KING)) return true;
  }
  for (const dir of LINES)
    for (let t = sq + dir; !(t & 0x88); t += dir) {
      const p = b[t];
      if (!p) continue;
      if (p === (by | ROOK) || p === (by | QUEEN)) return true;
      break;
    }
  for (const dir of DIAGONALS)
    for (let t = sq + dir; !(t & 0x88); t += dir) {
      const p = b[t];
      if (!p) continue;
      if (p === (by | BISHOP) || p === (by | QUEEN)) return true;
      break;
    }
  return false;
}

export const inCheck = (pos, color = pos.turn) =>
  isAttacked(pos, pos.kings[colorIndex(color)], color ^ COLOR);

// Pseudo-legal moves (may leave the king in check). With noisyOnly, only
// captures and promotions, for the computer's quiescence search.
export function pseudoMoves(pos, noisyOnly = false) {
  const moves = [];
  const b = pos.board;
  const us = pos.turn;
  const them = us ^ COLOR;
  const add = (from, to, flags, captured = 0, promotion = 0) =>
    moves.push({ from, to, piece: b[from], captured, promotion, flags });
  const addPawn = (from, to, flags, captured = 0) => {
    if (rankOf(to) === 0 || rankOf(to) === 7)
      for (const promotion of PROMOTIONS)
        add(from, to, flags | PROMOTION, captured, promotion);
    else add(from, to, flags, captured);
  };
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) {
      sq += 7;
      continue;
    }
    const p = b[sq];
    if (!p || (p & COLOR) !== us) continue;
    const type = p & TYPE;
    if (type === PAWN) {
      const dir = us === WHITE ? 16 : -16;
      const to = sq + dir;
      const promoting = rankOf(to) === 0 || rankOf(to) === 7;
      if (!(to & 0x88) && !b[to] && (!noisyOnly || promoting)) {
        addPawn(sq, to, 0);
        const start = us === WHITE ? 1 : 6;
        if (!noisyOnly && rankOf(sq) === start && !b[to + dir])
          add(sq, to + dir, DOUBLE_PUSH);
      }
      for (const side of [-1, 1]) {
        const t = to + side;
        if (t & 0x88) continue;
        if (b[t] && (b[t] & COLOR) === them) addPawn(sq, t, CAPTURE, b[t]);
        else if (t === pos.ep) add(sq, t, CAPTURE | EN_PASSANT, them | PAWN);
      }
    } else if (type === KNIGHT || type === KING) {
      for (const step of type === KNIGHT ? KNIGHT_STEPS : KING_STEPS) {
        const t = sq + step;
        if (t & 0x88) continue;
        if (!b[t]) {
          if (!noisyOnly) add(sq, t, 0);
        } else if ((b[t] & COLOR) === them) add(sq, t, CAPTURE, b[t]);
      }
    } else {
      const dirs =
        type === BISHOP
          ? DIAGONALS
          : type === ROOK
            ? LINES
            : [...LINES, ...DIAGONALS];
      for (const dir of dirs)
        for (let t = sq + dir; !(t & 0x88); t += dir) {
          if (!b[t]) {
            if (!noisyOnly) add(sq, t, 0);
            continue;
          }
          if ((b[t] & COLOR) === them) add(sq, t, CAPTURE, b[t]);
          break;
        }
    }
  }
  if (!noisyOnly) addCastles(pos, add);
  return moves;
}

function addCastles(pos, add) {
  const us = pos.turn;
  const them = us ^ COLOR;
  const home = us === WHITE ? 0 : 0x70;
  const king = home + 4;
  const b = pos.board;
  if (b[king] !== (us | KING) || isAttacked(pos, king, them)) return;
  const [kingSide, queenSide] = us === WHITE ? [WK, WQ] : [BK, BQ];
  if (
    pos.castling & kingSide &&
    b[home + 7] === (us | ROOK) &&
    !b[home + 5] &&
    !b[home + 6] &&
    !isAttacked(pos, home + 5, them) &&
    !isAttacked(pos, home + 6, them)
  )
    add(king, home + 6, CASTLE);
  if (
    pos.castling & queenSide &&
    b[home] === (us | ROOK) &&
    !b[home + 1] &&
    !b[home + 2] &&
    !b[home + 3] &&
    !isAttacked(pos, home + 3, them) &&
    !isAttacked(pos, home + 2, them)
  )
    add(king, home + 2, CASTLE);
}

export function makeMove(pos, move) {
  const b = pos.board;
  const us = pos.turn;
  pos.stack.push({
    move,
    castling: pos.castling,
    ep: pos.ep,
    halfmove: pos.halfmove,
  });
  b[move.to] = move.promotion ? us | move.promotion : move.piece;
  b[move.from] = 0;
  if (move.flags & EN_PASSANT) b[move.to + (us === WHITE ? -16 : 16)] = 0;
  if (move.flags & CASTLE) {
    const kingSide = fileOf(move.to) === 6;
    const rookFrom = move.to + (kingSide ? 1 : -2);
    const rookTo = move.to + (kingSide ? -1 : 1);
    b[rookTo] = b[rookFrom];
    b[rookFrom] = 0;
  }
  if ((move.piece & TYPE) === KING) pos.kings[colorIndex(us)] = move.to;
  pos.castling &= RIGHTS_MASK[move.from] & RIGHTS_MASK[move.to];
  pos.ep = move.flags & DOUBLE_PUSH ? (move.from + move.to) >> 1 : -1;
  pos.halfmove =
    (move.piece & TYPE) === PAWN || move.captured ? 0 : pos.halfmove + 1;
  if (us === BLACK) pos.fullmove++;
  pos.turn = us ^ COLOR;
}

export function unmakeMove(pos) {
  const { move, castling, ep, halfmove } = pos.stack.pop();
  const b = pos.board;
  const us = (pos.turn ^= COLOR);
  if (us === BLACK) pos.fullmove--;
  b[move.from] = move.piece;
  if (move.flags & EN_PASSANT) {
    b[move.to] = 0;
    b[move.to + (us === WHITE ? -16 : 16)] = move.captured;
  } else b[move.to] = move.captured;
  if (move.flags & CASTLE) {
    const kingSide = fileOf(move.to) === 6;
    const rookFrom = move.to + (kingSide ? 1 : -2);
    const rookTo = move.to + (kingSide ? -1 : 1);
    b[rookFrom] = b[rookTo];
    b[rookTo] = 0;
  }
  if ((move.piece & TYPE) === KING) pos.kings[colorIndex(us)] = move.from;
  pos.castling = castling;
  pos.ep = ep;
  pos.halfmove = halfmove;
}

export function legalMoves(pos) {
  const us = pos.turn;
  return pseudoMoves(pos).filter((move) => {
    makeMove(pos, move);
    const legal = !inCheck(pos, us);
    unmakeMove(pos);
    return legal;
  });
}

export function perft(pos, depth) {
  if (depth === 0) return 1;
  let nodes = 0;
  for (const move of legalMoves(pos)) {
    makeMove(pos, move);
    nodes += perft(pos, depth - 1);
    unmakeMove(pos);
  }
  return nodes;
}

export function toSan(pos, move, legal = legalMoves(pos)) {
  let san;
  const type = move.piece & TYPE;
  if (move.flags & CASTLE) san = fileOf(move.to) === 6 ? "O-O" : "O-O-O";
  else if (type === PAWN) {
    san = move.captured
      ? `${FILES[fileOf(move.from)]}x${squareName(move.to)}`
      : squareName(move.to);
    if (move.promotion) san += "=" + LETTERS[move.promotion].toUpperCase();
  } else {
    san = LETTERS[type].toUpperCase();
    const rivals = legal.filter(
      (m) => m.piece === move.piece && m.to === move.to && m.from !== move.from,
    );
    if (rivals.length) {
      if (!rivals.some((m) => fileOf(m.from) === fileOf(move.from)))
        san += FILES[fileOf(move.from)];
      else if (!rivals.some((m) => rankOf(m.from) === rankOf(move.from)))
        san += rankOf(move.from) + 1;
      else san += squareName(move.from);
    }
    san += (move.captured ? "x" : "") + squareName(move.to);
  }
  makeMove(pos, move);
  if (inCheck(pos)) san += legalMoves(pos).length ? "+" : "#";
  unmakeMove(pos);
  return san;
}

// Identifies a position for the repetition rule: placement, side to move,
// castling rights and (only when a capture is possible) the en passant file.
export function positionKey(pos) {
  let key = "";
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) sq += 7;
    else key += String.fromCharCode(65 + pos.board[sq]);
  }
  let ep = -1;
  if (pos.ep >= 0) {
    const pawn = pos.turn | PAWN;
    const from = pos.ep + (pos.turn === WHITE ? -16 : 16);
    if (
      [from - 1, from + 1].some((sq) => !(sq & 0x88) && pos.board[sq] === pawn)
    )
      ep = pos.ep;
  }
  return `${key}${pos.turn}${pos.castling}${ep}`;
}

function material(pos) {
  const pieces = [];
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) {
      sq += 7;
      continue;
    }
    const p = pos.board[sq];
    if (p && (p & TYPE) !== KING)
      pieces.push({
        type: p & TYPE,
        color: p & COLOR,
        shade: (rankOf(sq) + fileOf(sq)) % 2,
      });
  }
  return pieces;
}

// Neither side can ever checkmate: bare kings, a lone minor piece, or only
// bishops that all travel on the same color squares.
export function insufficientMaterial(pos) {
  const pieces = material(pos);
  if (pieces.length <= 1)
    return pieces.every(
      (p) => p.type !== PAWN && p.type !== ROOK && p.type !== QUEEN,
    );
  return pieces.every((p) => p.type === BISHOP && p.shade === pieces[0].shade);
}

// Used when the other side runs out of time: a bare king or a king with a
// single minor piece can't win, so the game is drawn instead.
export function canWin(pos, color) {
  const mine = material(pos).filter((p) => p.color === color);
  return (
    mine.some((p) => p.type === PAWN || p.type === ROOK || p.type === QUEEN) ||
    mine.length >= 2
  );
}
