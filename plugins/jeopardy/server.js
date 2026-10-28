const ROUND_ONE = [
  {
    title: "Movies That Escalated Quickly",
    clues: [
      [
        'Bruce Willis hears "I see dead people" in this 1999 thriller.',
        "The Sixth Sense",
      ],
      [
        "He plays Obi-Wan Kenobi in Star Wars Episodes I through III.",
        "Ewan McGregor",
      ],
      [
        "He wore the cape in Tim Burton's 1989 Batman, then played Birdman.",
        "Michael Keaton",
      ],
      [
        "This director wrote and directed the 1986 film Platoon.",
        "Oliver Stone",
      ],
      [
        "Look closely and Pac-Man makes a cameo in this glowing 1982 Disney film.",
        "Tron",
      ],
    ],
  },
  {
    title: "Songs You Know Too Well",
    clues: [
      ["Ringo Starr mainly played this instrument for The Beatles.", "drums"],
      [
        'The rapper known as "Mr. Worldwide" comes from this Florida city.',
        "Miami",
      ],
      [
        "Robert Smith's hair, eyeliner, and guitar front this gloriously gloomy band.",
        "The Cure",
      ],
      [
        "George Michael gave this one-word title to his chart-topping 1987 debut album.",
        "Faith",
      ],
      [
        "Prince's famous backing band shared a name with political upheaval.",
        "The Revolution",
        "Revolution",
      ],
    ],
  },
  {
    title: "Remote Control Required",
    clues: [
      ["Dr. Doofenshmirtz has this first name.", "Heinz"],
      [
        "In SpongeBob SquarePants, E.V.I.L. expands to this citrusy phrase.",
        "Every Villain Is Lemons",
      ],
      [
        "Breaking Bad nearly killed off this character in season one before everyone wisely reconsidered.",
        "Jesse Pinkman",
        "Jesse",
      ],
      [
        "The Simpsons eventually revealed Comic Book Guy's real name was this.",
        "Jeff Albertson",
      ],
      [
        "The Fresh Prince was born and raised in this state, specifically West Philadelphia.",
        "Pennsylvania",
      ],
    ],
  },
  {
    title: "Games Ate My Homework",
    clues: [
      [
        "The 1980s Gameline service downloaded games to this wood-paneled console.",
        "Atari 2600",
      ],
      [
        "Demons give the protagonist of 2016's DOOM this intimidating two-word title.",
        "Doom Slayer",
      ],
      [
        "Most of the original Dark Souls takes place in this region.",
        "Lordran",
      ],
      ["Blizzard released Hearthstone in this year.", "2014"],
      [
        "Bethesda bought the Fallout series from this company.",
        "Interplay Entertainment",
        "Interplay",
      ],
    ],
  },
  {
    title: "Board Games & Betrayal",
    clues: [
      [
        "Roll doubles three times in a row in Monopoly and you go directly here.",
        "jail",
      ],
      [
        "A standard chess game begins with this many pieces on the board.",
        "32",
      ],
      [
        "Despite the suspicious name, this colorful gentleman is not a classic Clue suspect.",
        "Mister Indigo",
        "Mr Indigo",
      ],
      [
        "Roll double six on your first Monopoly turn and you land on this utility.",
        "Electric Company",
      ],
      [
        "Magic: The Gathering used this delicious code name for the Urza's Destiny expansion.",
        "Chimichanga",
      ],
    ],
  },
  {
    title: "Animals Are Weird",
    clues: [
      ["Under all that white fur, a polar bear's skin is this color.", "black"],
      [
        "A spotted hyena's famous laugh can signal this uneasy emotional state.",
        "nervousness",
        "nervous",
      ],
      [
        "Thanks to a high-speed dive, this bird is the fastest animal on Earth.",
        "peregrine falcon",
      ],
      [
        "Snake and lizard scales are made from this protein, just like your fingernails.",
        "keratin",
      ],
      [
        "A group of bears is known by this surprisingly lazy collective noun.",
        "sloth",
      ],
    ],
  },
];

const ROUND_TWO = [
  {
    title: "Myths Behaving Badly",
    clues: [
      ["The Egyptian ankh is a hieroglyph representing this.", "life"],
      [
        "The Roman god of fire shares his name with a Star Trek species.",
        "Vulcan",
      ],
      ["This thunderbolt enthusiast ruled the ancient Greek gods.", "Zeus"],
      [
        "This mythological creature is half human, half horse, and all torso confusion.",
        "centaur",
      ],
      ["This Greek goddess handled wisdom and battle strategy.", "Athena"],
    ],
  },
  {
    title: "Famous People Being Famous",
    clues: [
      [
        "Gwyneth Paltrow gave her daughter this fruit-forward first name.",
        "Apple",
      ],
      [
        "Elvis Presley would celebrate his 100th birthday in this year.",
        "2035",
      ],
      [
        "Miley Cyrus calls this country music legend her godmother.",
        "Dolly Parton",
      ],
      [
        "Doug Walker's best-known YouTube character has this nostalgic name.",
        "The Nostalgia Critic",
        "Nostalgia Critic",
      ],
      [
        "Dwayne Johnson wrestled and acted under this geological nickname.",
        "The Rock",
        "Rock",
      ],
    ],
  },
  {
    title: "Comic Book Chaos",
    clues: [
      [
        "Superman was launched toward Earth from this doomed planet.",
        "Krypton",
      ],
      [
        "Captain America's full civilian name is this.",
        "Steven Grant Rogers",
        "Steve Rogers",
      ],
      [
        "Superman files stories at the Daily Planet under this name.",
        "Clark Kent",
      ],
      ["Marvel Comics was founded in this pre-war year.", "1939"],
      [
        "Despite sounding plausible, this is not one of Marvel's Infinity Stones.",
        "Energy",
        "the Energy Stone",
      ],
    ],
  },
  {
    title: "Saturday Morning Energy",
    clues: [
      [
        "Scooby-Doo's surprisingly formal full first name is this.",
        "Scoobert",
        "Scoobert Doo",
      ],
      [
        "Traditional animation commonly runs at this many frames per second.",
        "24",
        "24 FPS",
      ],
      ["This is the name of the child who owns the toys in Toy Story.", "Andy"],
      [
        "This aristocratic-sounding fake is not a Flintstones character.",
        "Lord Rockingham IX",
      ],
      [
        "The fifth and final season of Samurai Jack contains this many episodes.",
        "10",
        "ten",
      ],
    ],
  },
  {
    title: "Sports, Technically",
    clues: [
      [
        "Before Los Angeles, the Lakers represented this Minnesota city.",
        "Minneapolis",
      ],
      [
        "This club completed a fairy-tale run to win the 2015–16 Premier League.",
        "Leicester City",
        "Leicester",
      ],
      ["This nation won UEFA Euro 2016.", "Portugal"],
      [
        "This English darts legend has won the most World Championship titles.",
        "Phil Taylor",
      ],
      ["This nation won soccer's 2016 Copa América Centenario.", "Chile"],
    ],
  },
  {
    title: "Shiny Little Gadgets",
    clues: [
      ["GPS expands to these three words.", "Global Positioning System"],
      ["The DVD was invented in this year.", "1995"],
      [
        "This intimidatingly named instrument measures blood pressure.",
        "sphygmomanometer",
      ],
      [
        "Compact discs began appearing on the consumer market in this year.",
        "1982",
      ],
      [
        "A centrifuge separates heavier and lighter particles by doing this very quickly.",
        "spinning",
        "rotating",
      ],
    ],
  },
];

const FINAL = {
  category: "Stage Names",
  clue: "Born Peter Gene Hernandez, this singer chose a first name from a wrestler and a last name from a planet.",
  answers: ["Bruno Mars", "Mars"],
};

const fail = (message) => {
  throw new Error(message);
};
const valuesFor = (round) =>
  round === 0 ? [200, 400, 600, 800, 1000] : [400, 800, 1200, 1600, 2000];
const questionForm = (answer) =>
  /^(who|what|where|when|why|how)\b/i.test(String(answer).trim());
const normalize = (answer) =>
  String(answer ?? "")
    .toLowerCase()
    .trim()
    .replace(/^(who|what|where|when|why|how)\s+(is|are|was|were)\s+/i, "")
    .replace(/^(who|what|where|when|why|how)\s+/i, "")
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]/g, "");
const correct = (answer, accepted) =>
  questionForm(answer) &&
  accepted.some((choice) => normalize(choice) === normalize(answer));
const ranked = (state) =>
  [...state.players.values()]
    .sort((a, b) => b.score - a.score || a.seat - b.seat)
    .map((player) => ({
      id: player.id,
      score: player.score,
      detail: player.score < 0 ? "In the red" : player.podium,
    }));
const boardData = (round) => (round === 0 ? ROUND_ONE : ROUND_TWO);

function makeBoard(round, random) {
  const values = valuesFor(round);
  const cells = boardData(round).map((category, categoryIndex) =>
    category.clues.map(([clue, ...answers], row) => ({
      id: `${round}-${categoryIndex}-${row}`,
      category: categoryIndex,
      row,
      value: values[row],
      clue,
      answers,
      used: false,
      dailyDouble: false,
    })),
  );
  const candidates = cells.flat();
  const doubles = round === 0 ? 1 : 2;
  for (let i = 0; i < doubles; i++) {
    const available = candidates.filter((cell) => !cell.dailyDouble);
    available[Math.floor(random() * available.length)].dailyDouble = true;
  }
  return cells;
}

function beginFinal(state) {
  state.current = null;
  state.finalists = [...state.players.values()]
    .filter((player) => player.score > 0)
    .map((player) => player.id);
  state.finalWagers = new Map();
  state.finalAnswers = new Map();
  if (!state.finalists.length) {
    state.phase = "over";
    return;
  }
  state.phase = "final-wager";
  state.deadline = state.time + 45;
  state.seq++;
}

function beginRound(state, round) {
  state.round = round;
  state.board = makeBoard(round, state.random);
  state.phase = round === 0 ? "select" : "round-break";
  if (round === 1) state.selector = ranked(state).at(-1)?.id ?? state.selector;
  state.deadline = round === 0 ? 0 : state.time + 6;
  state.current = null;
  state.attempted = new Set();
  state.responder = null;
  state.seq++;
}

function advance(state) {
  state.current = null;
  state.responder = null;
  state.attempted = new Set();
  if (state.board.flat().every((cell) => cell.used)) {
    if (state.round === 0) beginRound(state, 1);
    else beginFinal(state);
  } else {
    state.phase = "select";
    state.deadline = 0;
    state.seq++;
  }
}

function reveal(state, message) {
  state.phase = "reveal";
  state.result = message;
  state.deadline = state.time + 6;
  state.seq++;
}

function judgeResponse(state, answer, timedOut = false) {
  const player = state.players.get(state.responder);
  if (!player) return reveal(state, "No response was recorded.");
  const cell = state.current;
  const amount = cell.dailyDouble ? state.wager : cell.value;
  const isCorrect = !timedOut && correct(answer, cell.answers);
  player.score += isCorrect ? amount : -amount;
  state.lastAnswer = answer;
  state.lastPlayer = player.id;
  state.lastCorrect = isCorrect;
  if (isCorrect) {
    state.selector = player.id;
    reveal(state, `${player.name} is correct!`);
    return;
  }
  state.attempted.add(player.id);
  if (cell.dailyDouble) {
    state.selector = player.id;
    reveal(state, `${player.name} missed the Daily Double.`);
    return;
  }
  state.responder = null;
  if (
    state.attempted.size >= state.players.size ||
    state.time >= state.clueDeadline
  ) {
    reveal(state, timedOut ? "Time expired." : "No contestants remain.");
  } else {
    state.phase = "clue";
    state.deadline = state.clueDeadline;
    state.seq++;
  }
}

function finishFinalAnswers(state) {
  for (const id of state.finalists) {
    const player = state.players.get(id);
    const response = state.finalAnswers.get(id) ?? "";
    const wager = state.finalWagers.get(id) ?? 0;
    player.score += correct(response, FINAL.answers) ? wager : -wager;
  }
  state.phase = "final-reveal";
  state.deadline = state.time + 12;
  state.seq++;
}

export function action(state, id, payload) {
  const player = state.players.get(id) ?? fail("You are not in this game.");
  const type = payload?.type;
  if (state.phase === "select") {
    if (type !== "select") fail("Choose a clue from the board.");
    if (id !== state.selector) fail("Wait for the board chooser.");
    const cell = state.board
      .flat()
      .find((candidate) => candidate.id === payload.cell);
    if (!cell || cell.used) fail("Choose an available clue.");
    cell.used = true;
    state.current = cell;
    state.attempted = new Set();
    state.lastAnswer = "";
    state.lastPlayer = null;
    state.lastCorrect = null;
    if (cell.dailyDouble) {
      state.phase = "daily-wager";
      state.responder = id;
      state.deadline = state.time + 20;
    } else {
      state.phase = "clue";
      state.responder = null;
      state.deadline = state.time + 30;
      state.clueDeadline = state.deadline;
    }
  } else if (state.phase === "daily-wager") {
    if (type !== "wager" || id !== state.responder)
      fail("The Daily Double belongs to the contestant who selected it.");
    const maximum = Math.max(
      valuesFor(state.round).at(-1),
      Math.max(0, player.score),
    );
    const wager = Number(payload.amount);
    if (!Number.isInteger(wager) || wager < 5 || wager > maximum)
      fail(`Wager between 5 and ${maximum}.`);
    state.wager = wager;
    state.phase = "answer";
    state.deadline = state.time + 15;
  } else if (state.phase === "clue") {
    if (type !== "buzz") fail("Buzz in when you know it.");
    if (state.attempted.has(id)) fail("You already responded to this clue.");
    if (state.responder) fail("Another contestant buzzed first.");
    state.responder = id;
    state.clueDeadline = state.deadline;
    state.phase = "answer";
    state.deadline = state.time + 8;
  } else if (state.phase === "answer") {
    if (type !== "answer" || id !== state.responder)
      fail("Only the contestant who buzzed may respond.");
    const answer = String(payload.answer ?? "")
      .trim()
      .slice(0, 100);
    if (!answer) fail("Enter a response.");
    judgeResponse(state, answer);
  } else if (state.phase === "reveal") {
    if (type !== "continue") fail("The clue is being revealed.");
    if (id !== state.selector) fail("The board chooser moves play along.");
    advance(state);
  } else if (state.phase === "round-break") {
    if (type !== "continue") fail("Double Jeopardy is about to begin.");
    state.phase = "select";
    state.deadline = 0;
  } else if (state.phase === "final-wager") {
    if (type !== "final-wager" || !state.finalists.includes(id))
      fail("Only eligible contestants submit a Final Jeopardy wager.");
    if (state.finalWagers.has(id)) fail("Your wager is locked.");
    const wager = Number(payload.amount);
    if (!Number.isInteger(wager) || wager < 0 || wager > player.score)
      fail(`Wager between 0 and ${player.score}.`);
    state.finalWagers.set(id, wager);
    if (state.finalWagers.size === state.finalists.length) {
      state.phase = "final-clue";
      state.deadline = state.time + 30;
    }
  } else if (state.phase === "final-clue") {
    if (type !== "final-answer" || !state.finalists.includes(id))
      fail("Submit your Final Jeopardy response.");
    if (state.finalAnswers.has(id)) fail("Your response is locked.");
    const answer = String(payload.answer ?? "")
      .trim()
      .slice(0, 100);
    if (!answer) fail("Enter a response.");
    state.finalAnswers.set(id, answer);
    if (state.finalAnswers.size === state.finalists.length)
      finishFinalAnswers(state);
  } else if (state.phase === "final-reveal") {
    if (type !== "continue") fail("The final responses are being revealed.");
    state.phase = "over";
  } else fail("Wait for the next clue.");
  state.seq++;
}

export function tick(state, dt) {
  state.time += dt;
  if (state.phase === "over") return true;
  if (!state.deadline || state.time < state.deadline) return false;
  if (state.phase === "round-break") {
    state.phase = "select";
    state.deadline = 0;
  } else if (state.phase === "daily-wager") {
    state.wager = 5;
    state.phase = "answer";
    state.deadline = state.time + 15;
  } else if (state.phase === "clue") reveal(state, "No one buzzed in.");
  else if (state.phase === "answer") judgeResponse(state, "", true);
  else if (state.phase === "reveal") advance(state);
  else if (state.phase === "final-wager") {
    for (const id of state.finalists)
      if (!state.finalWagers.has(id)) state.finalWagers.set(id, 0);
    state.phase = "final-clue";
    state.deadline = state.time + 30;
  } else if (state.phase === "final-clue") {
    for (const id of state.finalists)
      if (!state.finalAnswers.has(id)) state.finalAnswers.set(id, "");
    finishFinalAnswers(state);
  } else if (state.phase === "final-reveal") state.phase = "over";
  state.seq++;
  return state.phase === "over";
}

export function frame(state, id) {
  const player = state.players.get(id);
  const current = state.current;
  const revealAnswer =
    state.phase === "reveal" || state.phase === "final-reveal";
  return {
    seq: state.seq,
    phase: state.phase,
    round: state.round,
    roundName: state.round === 0 ? "Jeopardy!" : "Double Jeopardy!",
    timeLeft: state.deadline ? Math.max(0, state.deadline - state.time) : 0,
    selector: state.selector,
    responder: state.responder,
    attempted: [...state.attempted],
    you: {
      id,
      score: player?.score ?? 0,
      finalist: state.finalists?.includes(id) ?? false,
      wagered: state.finalWagers?.has(id) ?? false,
      answered: state.finalAnswers?.has(id) ?? false,
    },
    players: [...state.players.values()].map((contestant) => ({
      id: contestant.id,
      name: contestant.name,
      score: contestant.score,
      podium: contestant.podium,
      seat: contestant.seat,
    })),
    categories: boardData(state.round).map((category) => category.title),
    board: state.board.map((column) =>
      column.map((cell) => ({
        id: cell.id,
        value: cell.value,
        used: cell.used,
      })),
    ),
    current: current
      ? {
          id: current.id,
          value: current.value,
          category: boardData(state.round)[current.category].title,
          clue: current.clue,
          dailyDouble: current.dailyDouble,
          answer: revealAnswer ? current.answers[0] : null,
        }
      : null,
    result:
      state.phase === "reveal"
        ? {
            message: state.result,
            player: state.lastPlayer,
            response: state.lastAnswer,
            correct: state.lastCorrect,
          }
        : null,
    wager: id === state.responder ? (state.wager ?? null) : null,
    final: state.phase.startsWith("final")
      ? {
          category: FINAL.category,
          clue: state.phase === "final-wager" ? null : FINAL.clue,
          answer: state.phase === "final-reveal" ? FINAL.answers[0] : null,
          submittedWagers: state.finalWagers.size,
          submittedAnswers: state.finalAnswers.size,
          finalists: state.finalists,
          reveals:
            state.phase === "final-reveal"
              ? state.finalists.map((playerId) => ({
                  id: playerId,
                  wager: state.finalWagers.get(playerId),
                  answer: state.finalAnswers.get(playerId),
                  correct: correct(
                    state.finalAnswers.get(playerId),
                    FINAL.answers,
                  ),
                }))
              : null,
        }
      : null,
  };
}

export default {
  id: "jeopardy",
  tickRate: 5,
  sendRate: 5,
  meta: {
    name: "Jeopardy Night",
    label: "ANSWERS FIRST. QUESTIONS SECOND.",
    description:
      "Take a podium, choose clues, buzz in, hunt for Daily Doubles, and wager your way through a final clue.",
    players: "2–3 players",
    time: "25–40 min",
    tag: "Trivia",
    badge: "THE QUIZ SHOW",
    caption: "big clues, bold wagers, dramatic podiums",
    kind: "Trivia",
    categories: ["Trivia", "Party games"],
    art: "art.svg",
    theme: { background: "#10185f", accent: "#2536c9", ink: "#f4c84a" },
    minPlayers: 2,
    maxPlayers: 3,
    scoreUnit: "$",
    lobby: {
      kind: "slots",
      label: "Choose your podium on stage",
      required: true,
      slots: [
        { id: "left", label: "Left podium", accent: "#1f43b7" },
        { id: "center", label: "Center podium", accent: "#263bd1" },
        { id: "right", label: "Right podium", accent: "#1f43b7" },
      ],
    },
    rules: [
      "Choose clues from six categories. Buzz in after the clue appears and respond in the form of a question. Correct responses add the clue value; incorrect responses subtract it.",
      "A Daily Double belongs only to the contestant who selected it. Jeopardy has one; Double Jeopardy has two and doubles every clue value.",
      "Contestants above $0 enter Final Jeopardy, secretly wager up to their score, and submit one final response. The highest score wins.",
    ],
  },
  create({ players, random = Math.random }) {
    const ordered = [...players].sort((a, b) =>
      String(a.lobbySlot).localeCompare(String(b.lobbySlot)),
    );
    const state = {
      random,
      time: 0,
      seq: 0,
      phase: "select",
      round: 0,
      board: [],
      players: new Map(),
      selector: ordered[Math.floor(random() * ordered.length)]?.id,
      responder: null,
      attempted: new Set(),
      current: null,
      deadline: 0,
      finalists: [],
      finalWagers: new Map(),
      finalAnswers: new Map(),
    };
    ordered.forEach((entry, seat) =>
      state.players.set(entry.id, {
        id: entry.id,
        name: entry.name,
        score: 0,
        seat,
        podium: entry.lobbySlot,
      }),
    );
    beginRound(state, 0);
    return state;
  },
  input() {},
  action,
  tick,
  frame,
  leaderboard: ranked,
  results: ranked,
};
