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
export const CHARADES_WORDS = [
  "walking on the moon",
  "making a sandwich",
  "riding a roller coaster",
  "taking a selfie",
  "opening a stubborn jar",
  "winning the lottery",
  "getting caught in the rain",
  "building a snowman",
  "missing the bus",
  "dancing at a wedding",
  "trying to catch a fly",
  "playing air guitar",
  "wrapping a present",
  "walking a tiny dog",
  "blowing out birthday candles",
  "stepping on a building block",
  "learning to skateboard",
  "carrying too many groceries",
];
export const TRIVIA_QUESTIONS = [
  {
    question: "Which planet has the most moons?",
    choices: ["Jupiter", "Saturn", "Neptune", "Uranus"],
    answer: "Saturn",
  },
  {
    question: "What is the largest ocean on Earth?",
    choices: ["Atlantic", "Indian", "Pacific", "Arctic"],
    answer: "Pacific",
  },
  {
    question: "Which board game features Boardwalk and Park Place?",
    choices: ["Clue", "Monopoly", "Risk", "Sorry!"],
    answer: "Monopoly",
  },
  {
    question: "How many sides does a dodecagon have?",
    choices: ["10", "11", "12", "14"],
    answer: "12",
  },
  {
    question: "What is the capital of Australia?",
    choices: ["Sydney", "Melbourne", "Canberra", "Perth"],
    answer: "Canberra",
  },
  {
    question: "Which instrument has 88 keys?",
    choices: ["Piano", "Harp", "Accordion", "Organ"],
    answer: "Piano",
  },
  {
    question: "What is the fastest land animal?",
    choices: ["Lion", "Pronghorn", "Cheetah", "Greyhound"],
    answer: "Cheetah",
  },
  {
    question: "Which language has the most native speakers?",
    choices: ["English", "Hindi", "Spanish", "Mandarin Chinese"],
    answer: "Mandarin Chinese",
  },
  {
    question: "What does a group of crows traditionally get called?",
    choices: ["A parliament", "A murder", "A crash", "A charm"],
    answer: "A murder",
  },
  {
    question: "Which element has the chemical symbol Au?",
    choices: ["Silver", "Copper", "Gold", "Argon"],
    answer: "Gold",
  },
];
export const clean = (value, max = 100) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
export function createRoom(name, mode, rounds = 2, seconds = 60) {
  assert(
    ["telephone", "scribble", "trivia", "charades"].includes(mode),
    "Choose a game first.",
  );
  return {
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
    trivia: null,
    triviaAnswers: {},
    triviaOrder: [],
    turn: 0,
    round: 0,
    updatedAt: Date.now(),
  };
}
export function addPlayer(room, id, name) {
  assert(
    room.phase === "lobby",
    "This game has already started. Join the next one!",
  );
  assert(room.players.length < 8, "This room is full (8 players).");
  const safeName = clean(name, 20);
  assert(safeName, "Enter your name to join.");
  assert(
    !room.players.some((p) => p.name.toLowerCase() === safeName.toLowerCase()),
    "That name is already in the room. Try another.",
  );
  room.players.push({ id, name: safeName, score: 0, connected: true });
  room.host ??= id;
}
export function startGame(room, id) {
  assert(id === room.host, "Only the host can start the game.");
  assert(
    ["lobby", "results"].includes(room.phase),
    "A game is already in progress.",
  );
  const minimum = room.mode === "telephone" ? 3 : 2;
  assert(
    room.players.length >= minimum && room.players.every((p) => p.connected),
    `Gather at least ${minimum} connected players to start.`,
  );
  room.players.forEach((p) => {
    p.score = 0;
  });
  room.round = 0;
  room.turn = 0;
  room.messages = [];
  room.submissions = {};
  room.strokes = [];
  room.trivia = null;
  room.triviaAnswers = {};
  room.triviaOrder = [];
  if (room.mode === "telephone") {
    room.chains = room.players.map((p) => ({ owner: p.name, entries: [] }));
    room.phase = "prompt";
    room.deadline = null;
  } else if (room.mode === "scribble") startDrawingTurn(room);
  else if (room.mode === "charades") startCharadesTurn(room);
  else startTriviaRound(room);
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
export function startCharadesTurn(room) {
  room.phase = "choose";
  room.guessed = [];
  room.word = null;
  room.messages = [];
  room.drawer = room.players[room.turn % room.players.length].id;
  room.round = Math.floor(room.turn / room.players.length);
  room.choices = [...CHARADES_WORDS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  room.deadline = Date.now() + 20000;
}
export function chooseCharade(room, id, word) {
  assert(
    room.mode === "charades" && room.phase === "choose" && id === room.drawer,
    "Wait for your charades turn.",
  );
  assert(room.choices.includes(word), "Choose one of the three prompts.");
  room.word = word;
  room.phase = "acting";
  room.deadline = Date.now() + room.seconds * 1000;
}
export function startTriviaRound(room) {
  if (!room.triviaOrder.length)
    room.triviaOrder = [...TRIVIA_QUESTIONS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  room.phase = "question";
  room.trivia = room.triviaOrder[room.round];
  room.triviaAnswers = {};
  room.deadline = Date.now() + 20000;
}
export function answerTrivia(room, id, choice, now = Date.now()) {
  assert(
    room.mode === "trivia" && room.phase === "question",
    "Wait for the next question.",
  );
  assert(
    room.players.some((p) => p.id === id),
    "Join the room first.",
  );
  assert(!room.triviaAnswers[id], "You already locked in an answer.");
  assert(now < room.deadline, "Time’s up! The answer is being revealed.");
  assert(room.trivia.choices.includes(choice), "Choose one of the answers.");
  room.triviaAnswers[id] = { choice, answeredAt: now };
  if (room.players.every((p) => room.triviaAnswers[p.id])) revealTrivia(room);
}
export function revealTrivia(room, now = Date.now()) {
  const startedAt = room.deadline - 20000;
  for (const player of room.players) {
    const response = room.triviaAnswers[player.id];
    if (response?.choice === room.trivia.answer) {
      const speed = Math.max(0, 1 - (response.answeredAt - startedAt) / 20000);
      player.score += 100 + Math.round(speed * 200);
    }
  }
  room.phase = "reveal";
  room.deadline = now + 5000;
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
  const guessingPhase = room.mode === "charades" ? "acting" : "drawing";
  assert(
    room.phase === guessingPhase && id !== room.drawer,
    `Guess when someone else is ${room.mode === "charades" ? "acting" : "drawing"}.`,
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
  if (room.phase === "choose")
    room.mode === "charades"
      ? chooseCharade(room, room.drawer, room.choices[0])
      : chooseWord(room, room.drawer, room.choices[0]);
  else if (["drawing", "acting"].includes(room.phase)) endTurn(room);
  else if (room.phase === "question") revealTrivia(room, now);
  else if (room.phase === "reveal") {
    if (room.mode === "trivia") {
      room.round++;
      if (room.round >= room.triviaOrder.length) {
        room.phase = "results";
        room.deadline = null;
      } else startTriviaRound(room);
      return true;
    }
    room.turn++;
    if (room.turn >= room.rounds * room.players.length) {
      room.phase = "results";
      room.deadline = null;
    } else if (room.mode === "charades") startCharadesTurn(room);
    else startDrawingTurn(room);
  } else return false;
  return true;
}
export function viewFor(room, id) {
  const {
    word,
    choices,
    chains,
    submissions,
    strokes,
    triviaAnswers,
    triviaOrder,
    trivia,
    ...view
  } = room;
  view.you = id;
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
  } else if (room.mode === "scribble" || room.mode === "charades") {
    view.word =
      id === room.drawer || ["reveal", "results"].includes(room.phase)
        ? word
        : null;
    view.hint = word ? word.replace(/[^ ]/g, "_") : "";
    if (id === room.drawer && room.phase === "choose") view.choices = choices;
  } else {
    view.answered = Object.keys(triviaAnswers);
    view.trivia = {
      question: trivia?.question,
      choices: trivia?.choices || [],
      answer: ["reveal", "results"].includes(room.phase)
        ? trivia?.answer
        : undefined,
      yourAnswer: triviaAnswers[id]?.choice,
    };
  }
  return view;
}
