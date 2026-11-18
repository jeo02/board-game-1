import {
  COLORS,
  START,
  TRACK,
  HOME,
  entry,
  exit,
  slideEnd,
} from "./public/board.js";

function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
function walk(pos, side, n) {
  if (pos === START || pos === HOME) return null;
  for (let i = 0; i < Math.abs(n); i++) {
    if (pos >= TRACK)
      pos = n < 0 && pos === TRACK ? entry(side) : pos + Math.sign(n);
    else if (pos === entry(side) && n > 0) pos = TRACK;
    else pos = (pos + Math.sign(n) + TRACK) % TRACK;
  }
  return pos > HOME ? null : pos;
}
function land(board, who, pawn, dest, players) {
  if (dest === null || (dest !== HOME && board[who].includes(dest)))
    return null;
  const end = slideEnd(dest, players[who].side);
  const next = board.map((row) =>
    row.map((pos) => (dest < TRACK && pos >= dest && pos <= end ? START : pos)),
  );
  next[who][pawn] = end;
  return next;
}
function moves(s) {
  const { board, turn, players, card } = s;
  const side = players[turn].side,
    own = board[turn],
    options = [];
  function add(label, next) {
    if (next) options.push({ label, next });
  }
  let forward11 = false;
  own.forEach((pos, p) => {
    const name = `Pawn ${p + 1}`;
    if (pos === START && own.indexOf(START) !== p) return;
    if (pos === START && [1, 2].includes(card))
      add(`${name}: leave Start`, land(board, turn, p, exit(side), players));
    if (typeof card === "number") {
      for (const n of card === 10 ? [10, -1] : [card === 4 ? -4 : card]) {
        const next = land(board, turn, p, walk(pos, side, n), players);
        add(`${name}: ${n < 0 ? "back" : "forward"} ${Math.abs(n)}`, next);
        if (next && card === 11) forward11 = true;
      }
    }
    if (card === 7)
      for (let n = 1; n < 7; n++) {
        const first = land(board, turn, p, walk(pos, side, n), players);
        if (!first) continue;
        first[turn].forEach((other, q) => {
          if (p !== q)
            add(
              `${name} +${n}, then pawn ${q + 1} +${7 - n}`,
              land(first, turn, q, walk(other, side, 7 - n), players),
            );
        });
      }
    const swap = card === 11 && pos >= 0 && pos < TRACK;
    if (!swap && !(card === "Sorry!" && pos === START)) return;
    board.forEach((row, i) => {
      if (i === turn) return;
      row.forEach((target, q) => {
        if (target < 0 || target >= TRACK) return;
        const before = board.map((r) => [...r]);
        before[i][q] = swap ? pos : START;
        add(
          `${name}: ${swap ? "switch with" : "replace"} ${players[i].name}'s pawn ${q + 1}`,
          land(before, turn, p, target, players),
        );
      });
    });
  });
  if (!options.length || (card === 11 && !forward11)) add("Pass", board);
  return options;
}
const leaderboard = (s) =>
  s.players
    .map(({ id }, i) => ({
      id,
      score: s.board[i].filter((pos) => pos === HOME).length,
    }))
    .sort((a, b) => b.score - a.score);

export default {
  id: "sorry",
  meta: {
    name: "Sorry!",
    description:
      "Race four pawns home around a track of shortcuts, slides and sudden setbacks.",
    players: "2–4 players",
    minPlayers: 2,
    maxPlayers: 4,
    time: "30–60 min",
    tag: "Board game",
    categories: ["Board games"],
    caption: "four pawns, one race home",
    badge: "THE BOARD GAME",
    label: "RACE HOME",
    kind: "Board",
    theme: { background: "#faf1d9", accent: "#b68340", ink: "#74551e" },
    colorNames: ["Red", "Blue", "Gold", "Green"],
    colors: COLORS,
    scoreUnit: "home",
    art: "art.svg",
    rules: [
      "Draw a card and choose a legal move. A 1 or 2 can bring a pawn out of Start; a 2 gives another draw.",
      "Bump rivals back to Start, and slide when you land on another color's triangle. A slide clears every pawn in its path.",
      "Enter your safety lane and reach Home by exact count with all four pawns to win.",
    ],
  },
  tickRate: 1,
  create({ players }) {
    const seats = players
      .map(({ id, name, color }) => ({ id, name, side: COLORS.indexOf(color) }))
      .sort((a, b) => a.side - b.side);
    const ranks = [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, "Sorry!"];
    return {
      players: seats,
      board: seats.map(() => Array(4).fill(START)),
      deck: shuffle([1, ...Array.from({ length: 4 }, () => ranks).flat()]),
      discard: [],
      turn: Math.floor(Math.random() * seats.length),
      revision: 0,
      card: null,
      options: [],
      last: "",
      won: false,
    };
  },
  action(s, id, action) {
    if (s.won || id !== s.players[s.turn].id || action.revision !== s.revision)
      throw new Error("Wait for your current turn.");
    if (action.type === "draw" && s.card === null) {
      if (!s.deck.length) s.deck = shuffle(s.discard.splice(0));
      s.card = s.deck.pop();
      s.options = moves(s);
    } else if (
      action.type === "move" &&
      Number.isInteger(action.index) &&
      s.options[action.index]
    ) {
      const move = s.options[action.index];
      s.board = move.next;
      s.last = `${s.players[s.turn].name} drew ${s.card}: ${move.label}.`;
      s.won = s.board[s.turn].every((pos) => pos === HOME);
      if (s.card !== 2 && !s.won) s.turn = (s.turn + 1) % s.players.length;
      s.discard.push(s.card);
      s.card = null;
      s.options = [];
    } else throw new Error("Choose one of the available actions.");
    s.revision++;
  },
  input() {},
  tick: (s) => s.won,
  frame: (s, id) => ({
    players: s.players,
    board: s.board,
    turn: s.turn,
    card: s.card,
    last: s.last,
    revision: s.revision,
    won: s.won,
    options: id === s.players[s.turn].id ? s.options.map((o) => o.label) : [],
  }),
  leaderboard,
  results: leaderboard,
};
