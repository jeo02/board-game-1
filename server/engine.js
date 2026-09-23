import { randomBytes } from "node:crypto";

export const WORDS = [
  "telescope",
  "pizza",
  "rainbow",
  "bicycle",
  "penguin",
  "campfire",
  "cactus",
  "umbrella",
  "rocket",
  "butterfly",
  "snowman",
  "guitar",
  "lighthouse",
  "octopus",
  "headphones",
  "watermelon",
  "skateboard",
  "volcano",
  "backpack",
  "sunflower",
  "robot",
  "sandcastle",
  "airplane",
  "birthday cake",
];
export const clean = (value, max = 100) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
export function createRoom(
  name,
  mode,
  rounds = 2,
  seconds = 60,
  plugin = null,
  settings = {},
) {
  assert(
    plugin ? plugin.id === mode : ["telephone", "scribble"].includes(mode),
    "Choose a game first.",
  );
  const room = {
    code: randomBytes(3).toString("hex").toUpperCase(),
    mode,
    host: null,
    players: [],
    phase: "lobby",
    rounds: [1, 2, 3].includes(rounds) ? rounds : 2,
    seconds: [30, 60, 90].includes(seconds) ? seconds : 60,
    title: clean(name, 40) || "The game night crew",
    submissions: {},
    chains: [],
    strokes: [],
    messages: [],
    turn: 0,
    round: 0,
    updatedAt: Date.now(),
  };
  if (plugin)
    Object.assign(room, {
      plugin: true,
      meta: plugin.meta,
      settings,
      colors: plugin.meta.colors ?? null,
      minPlayers: plugin.meta.minPlayers,
      maxPlayers: plugin.meta.maxPlayers,
      game: null,
      results: null,
    });
  return room;
}
export function addPlayer(room, id, name) {
  assert(
    room.phase === "lobby" ||
      (room.meta?.joinInProgress && room.phase === "playing"),
    "This game has already started. Join the next one!",
  );
  const max = room.maxPlayers ?? 8;
  assert(room.players.length < max, `This room is full (${max} players).`);
  const safeName = clean(name, 20);
  assert(safeName, "Enter your name to join.");
  assert(
    !room.players.some((p) => p.name.toLowerCase() === safeName.toLowerCase()),
    "That name is already in the room. Try another.",
  );
  const player = { id, name: safeName, score: 0, connected: true };
  if (room.colors)
    player.color =
      room.colors.find((c) => !room.players.some((p) => p.color === c)) ??
      room.colors[0];
  room.players.push(player);
  room.host ??= id;
}
export function setColor(room, id, color) {
  assert(room.colors, "This game does not use player colors.");
  assert(
    ["lobby", "results"].includes(room.phase),
    "Pick your color between games.",
  );
  assert(room.colors.includes(color), "Choose one of the available colors.");
  const player = room.players.find((p) => p.id === id);
  assert(player, "Join the room first.");
  const owner = room.players.find((p) => p.color === color);
  assert(
    !owner || owner === player,
    `${owner?.name} already picked that color.`,
  );
  player.color = color;
}
export function startGame(room, id) {
  assert(id === room.host, "Only the host can start the game.");
  assert(
    ["lobby", "results"].includes(room.phase),
    "A game is already in progress.",
  );
  const minimum = room.minPlayers ?? (room.mode === "telephone" ? 3 : 2);
  assert(
    room.players.length >= minimum && room.players.every((p) => p.connected),
    `Gather at least ${minimum} connected ${minimum === 1 ? "player" : "players"} to start.`,
  );
  room.players.forEach((p) => {
    p.score = 0;
  });
  if (room.plugin) {
    room.phase = "playing";
    room.deadline = null;
    room.results = null;
    room.notice = "";
    return;
  }
  room.round = 0;
  room.turn = 0;
  room.messages = [];
  room.submissions = {};
  room.strokes = [];
  if (room.mode === "telephone") {
    room.chains = room.players.map((p) => ({ owner: p.name, entries: [] }));
    room.phase = "prompt";
    room.deadline = null;
  } else startDrawingTurn(room);
}
export function startDrawingTurn(room) {
  room.phase = "choose";
  room.strokes = [];
  room.guessed = [];
  room.word = null;
  room.messages = [];
  room.drawer = room.players[room.turn % room.players.length].id;
  room.round = Math.floor(room.turn / room.players.length);
  room.choices = [...WORDS].sort(() => Math.random() - 0.5).slice(0, 3);
  room.deadline = Date.now() + 20000;
}
export function chooseWord(room, id, word) {
  assert(
    room.phase === "choose" && id === room.drawer,
    "Wait for your drawing turn.",
  );
  assert(room.choices.includes(word), "Choose one of the three words.");
  room.word = word;
  room.phase = "drawing";
  room.deadline = Date.now() + room.seconds * 1000;
}
export function telephoneSubmit(room, id, value) {
  assert(
    ["prompt", "draw", "describe"].includes(room.phase),
    "This round is not accepting submissions.",
  );
  assert(!room.submissions[id], "You already submitted this round.");
  const index = room.players.findIndex((p) => p.id === id);
  assert(index >= 0, "Join the room first.");
  let entry;
  if (room.phase === "draw") {
    assert(
      room.strokes.some((s) => s.player === id && s.color !== "#ffffff"),
      "Add a drawing before passing it on.",
    );
    entry = {
      type: "drawing",
      strokes: room.strokes.filter((s) => s.player === id),
      author: room.players[index].name,
    };
  } else {
    const content = clean(value, 160);
    assert(content, "Write something before passing it on.");
    entry = { type: "text", text: content, author: room.players[index].name };
  }
  room.chains[
    (index - room.round + room.players.length) % room.players.length
  ].entries.push(entry);
  room.submissions[id] = true;
  if (room.players.every((p) => room.submissions[p.id])) {
    room.round++;
    room.submissions = {};
    room.strokes = [];
    room.phase =
      room.round >= room.players.length
        ? "results"
        : room.round % 2
          ? "draw"
          : "describe";
  }
}
export function addStroke(room, id, stroke) {
  assert(
    (room.phase === "draw" && !room.submissions[id]) ||
      (room.phase === "drawing" && room.drawer === id),
    "It is not your drawing turn.",
  );
  assert(
    room.players.some((p) => p.id === id),
    "Join the room first.",
  );
  assert(
    stroke &&
      /^#[0-9a-f]{6}$/i.test(stroke.color) &&
      [3, 7, 14, 24].includes(stroke.width),
    "Invalid brush.",
  );
  assert(
    Array.isArray(stroke.points) &&
      stroke.points.length >= 1 &&
      stroke.points.length <= 1000 &&
      stroke.points.every(
        (p) =>
          Array.isArray(p) &&
          p.length === 2 &&
          p.every((n) => Number.isFinite(n) && n >= 0 && n <= 1),
      ),
    "Invalid drawing.",
  );
  assert(
    room.strokes.filter((s) => s.player === id).length < 1500,
    "Canvas is full. Clear or undo to keep drawing.",
  );
  room.strokes.push({
    color: stroke.color,
    width: stroke.width,
    points: stroke.points,
    player: id,
  });
}
export function editCanvas(room, id, action) {
  assert(
    (room.phase === "draw" && !room.submissions[id]) ||
      (room.phase === "drawing" && room.drawer === id),
    "It is not your drawing turn.",
  );
  if (action === "clear")
    room.strokes = room.strokes.filter((s) => s.player !== id);
  else if (action === "undo") {
    const index = room.strokes.findLastIndex((s) => s.player === id);
    if (index >= 0) room.strokes.splice(index, 1);
  }
}
export function guess(room, id, value, now = Date.now()) {
  assert(
    room.phase === "drawing" && id !== room.drawer,
    "Guess when someone else is drawing.",
  );
  assert(!room.guessed.includes(id), "You already got it!");
  assert(now < room.deadline, "Time’s up! The next turn is coming.");
  const player = room.players.find((p) => p.id === id);
  assert(player, "Join the room first.");
  const content = clean(value, 80);
  assert(content, "Type a guess first.");
  if (
    content.toLowerCase().replace(/[\s-]+/g, "") ===
    room.word.toLowerCase().replace(/[\s-]+/g, "")
  ) {
    const points =
      100 +
      Math.round(
        (Math.max(0, room.deadline - now) / (room.seconds * 1000)) * 400,
      );
    player.score += points;
    room.players.find((p) => p.id === room.drawer).score += 100;
    room.guessed.push(id);
    room.messages.push({
      name: player.name,
      text: `guessed the word! +${points}`,
      correct: true,
    });
    if (room.guessed.length === room.players.length - 1) endTurn(room);
  } else
    room.messages.push({ name: player.name, text: content, correct: false });
  room.messages = room.messages.slice(-60);
}
export function endTurn(room) {
  room.phase = "reveal";
  room.deadline = Date.now() + 6000;
}
export function tick(room, now = Date.now()) {
  if (!room.deadline || now < room.deadline) return false;
  if (room.phase === "choose") chooseWord(room, room.drawer, room.choices[0]);
  else if (room.phase === "drawing") endTurn(room);
  else if (room.phase === "reveal") {
    room.turn++;
    if (room.turn >= room.rounds * room.players.length) {
      room.phase = "results";
      room.deadline = null;
    } else startDrawingTurn(room);
  } else return false;
  return true;
}
export function viewFor(room, id) {
  const { word, choices, chains, submissions, strokes, game, ...view } = room;
  view.you = id;
  if (room.plugin) {
    delete view.messages;
    delete view.submitted;
    return view;
  }
  view.submitted = Object.keys(submissions);
  view.strokes =
    room.mode === "telephone"
      ? strokes.filter((s) => s.player === id)
      : strokes;
  if (room.mode === "telephone") {
    const index = room.players.findIndex((p) => p.id === id);
    view.previous =
      room.round > 0
        ? chains[
            (index - room.round + room.players.length) % room.players.length
          ]?.entries.at(-1)
        : null;
    if (room.phase === "results") view.chains = chains;
  } else {
    view.word =
      id === room.drawer || ["reveal", "results"].includes(room.phase)
        ? word
        : null;
    view.hint = word ? word.replace(/[^ ]/g, "_") : "";
    if (id === room.drawer && room.phase === "choose") view.choices = choices;
  }
  return view;
}
