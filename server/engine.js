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
export const MONIKERS = [
  "A Group Chat",
  "A Participation Trophy",
  "An Influencer Apology",
  "Bigfoot",
  "The Wi-Fi Password",
  "A Three-Day Weekend",
  "The Office Microwave",
  "A Surprise Meeting",
  "A Tiny Horse",
  "An Awkward Elevator Ride",
  "A Podcast Host",
  "The Last Slice of Pizza",
  "A Roomba",
  "The Moon Landing",
  "A Midlife Crisis",
  "A Viral Dance",
  "The Friend Who Is Always Late",
  "A Haunted Doll",
  "A Food Truck",
  "The Reply-All Button",
  "A Detective With One Day Until Retirement",
  "A Renaissance Painting",
  "An Escape Room",
  "The Person Who Invented Mondays",
  "A Bad Haircut",
  "A Supervillain's Intern",
  "A Theme Park Mascot",
  "An Unskippable Ad",
  "A Fancy Pigeon",
  "A Weather Reporter in a Hurricane",
  "The World's Smallest Violin",
  "A Motivational Speaker",
  "A Suspiciously Smart Dog",
  "The Printer That Never Works",
  "An Airport Goodbye",
  "A Time Traveler",
  "The Main Character",
  "A Human Resources Email",
  "A Karaoke Legend",
  "A Secret Handshake",
  "A Disappointed Chef",
  "A Reality TV Reunion",
  "The Loch Ness Monster",
  "A Competitive Grandparent",
  "A Magician's Assistant",
  "The First Person to Try Milk",
  "A Very Important Spreadsheet",
  "An Overpacked Suitcase",
  "A Museum Security Guard",
  "A Dramatic Sneeze",
  "A Celebrity Chef",
  "The Cool Substitute Teacher",
  "A Conspiracy Theorist",
  "A Medieval Dentist",
  "An Accidental Text to Your Boss",
  "A Nervous Astronaut",
  "A Lost Tourist",
  "The Person Holding Up the Line",
  "A Superhero's Day Off",
  "A Competitive Toddler",
  "The Office Plant",
  "A Mystery Flavor",
  "A Pirate Accountant",
  "An Extremely Local Celebrity",
  "A Broken Umbrella",
  "The Last Dinosaur",
  "A Fortune Cookie",
  "A Couch Cushion Treasure",
  "An Amateur Ghost Hunter",
  "The Person Who Names Paint Colors",
  "A Very Slow Chase Scene",
  "A Fancy Hat",
  "An Unnecessary Sequel",
  "A Robot Learning to Dance",
  "The Group Project",
  "A Professional Napper",
  "A Suspicious Package",
  "A Famous Statue",
  "The World's Worst Tour Guide",
  "A Tiny Microphone",
  "The Green Children of Woolpit",
  "Tarrare",
  "Kaspar Hauser",
  "Violet Jessop",
  "The Antikythera Mechanism",
  "The Mechanical Turk",
  "The Silver Swan",
  "A Bathysphere",
  "The Voynich Manuscript",
  "The Maunsell Sea Forts",
  "A Lighthouse Keeper's Cat",
  "A Victorian Time Traveler",
  "A Cowboy Astronomer",
  "The Mayor of a Very Small Town",
  "A Professional Queue Stand-In",
  "A Historian Who Hates History",
  "A Pirate With Seasickness",
  "A Detective's Extremely Obvious Disguise",
  "A Mermaid Applying for a Desk Job",
  "A Ghost at a Housewarming Party",
  "A Dragon With Student Loans",
  "A Wizard Who Only Knows One Spell",
  "A Vampire at a Blood Drive",
  "A Werewolf at a Dog Show",
  "A Knight Reviewing a Restaurant",
  "A Fairy Godparent on Sabbatical",
  "A Troll Undergoing Customer Service Training",
  "A Time Traveler's First Day at Work",
  "An Alien Who Misread the Dress Code",
  "A Robot With Stage Fright",
  "A Clone Meeting the Original",
  "A Supervillain Filing Their Taxes",
  "A Hero Who Forgot Their Catchphrase",
  "A Secret Agent With a Loud Sneezing Problem",
  "A Spy's Suspiciously Normal Vacation",
  "A Treasure Map With No Treasure",
  "A Treasure Hunter Looking for Their Glasses",
  "A Volcano With a Podcast",
  "A Glacier in a Hurry",
  "A Tornado Taking Driving Lessons",
  "A Cloud With a Dark Secret",
  "A Rainbow After a Bad Review",
  "A Comet Running Late",
  "The Sun's Out-of-Office Reply",
  "A Moonwalking Accountant",
  "A Planet With Stage Fright",
  "A Telescope That Saw Too Much",
  "A Satellite With a Flat Battery",
  "A Meteorologist Who Fears Weather",
  "A Museum Exhibit That Moved Overnight",
  "A Painting Asking for a Frame Upgrade",
  "A Statue Who Needs to Stretch",
  "A Sculpture With Imposter Syndrome",
  "A Portrait With a Bad Side",
  "A Medieval Influencer",
  "A Renaissance Person at a Networking Event",
  "A Pharaoh's Customer Support Ticket",
  "A Roman Gladiator at a Yoga Class",
  "A Viking Afraid of Water",
  "A Pirate's First Video Call",
  "A Cowboy Ordering a Fancy Coffee",
  "A Victorian Child With a Smartphone",
  "A Caveman Discovering Autocorrect",
  "A Knight Searching for Parking",
  "A Samurai at a Team-Building Retreat",
  "A Royal Excuse Note",
  "A Queen's Group Text",
  "A Castle With Thin Walls",
  "A Dungeon With a Waiting List",
  "A Drawbridge That Is Too Shy",
  "A Haunted Escape Room",
  "A Ghost Who Missed Their Own Appointment",
  "A Skeleton at a Fitness Class",
  "A Mummy Unwrapping a Present",
  "A Monster With a Bedtime Routine",
  "A Cryptid on a Dating App",
  "A Sasquatch at a Job Interview",
  "A Sea Monster Taking a Bath",
  "A Loch Ness Tour Guide",
  "A Talking Statue With No Filter",
  "A Psychic Who Cannot Read Their Own Future",
  "A Fortune Teller With Stage Fright",
  "A Magician Whose Rabbit Is the Boss",
  "A Juggler With Too Many Passwords",
  "A Mime Trapped in a Voice Message",
  "A Clown at a Serious Conference",
  "A Ventriloquist Losing an Argument",
  "A Puppeteer Whose Puppet Quit",
  "A Circus Strongperson Carrying Groceries",
  "A Tightrope Walker on a Group Project",
  "A Fortune Cookie With a Complaint",
  "A Compass That Points to Snacks",
  "A Map That Refuses to Fold",
  "A Suitcase With Commitment Issues",
  "An Umbrella in a Desert",
  "A Snow Globe With a Weather Warning",
  "A Vacuum Cleaner at a Silent Retreat",
  "A Toaster With Big Dreams",
  "A Coffee Machine in a Crisis",
  "A Refrigerator Keeping a Secret",
  "A Doorbell That Wants Privacy",
  "A Chair Saving a Seat",
  "A Lamp in the Spotlight",
  "A Mirror With Constructive Feedback",
  "A Sock Seeking Its Match",
  "A Shoe at a Job Interview",
  "A Hat With a Tight Schedule",
  "A Pencil With Writer's Block",
  "An Eraser Trying to Forget",
  "A Calculator With Stage Fright",
  "A Spreadsheet That Became Self-Aware",
  "A Printer Seeking Revenge",
  "A Keyboard Missing One Important Key",
  "A Mouse Who Is Afraid of Cats",
  "A Screenshot From the Future",
  "A Password Nobody Can Remember",
  "An Email Sent to the Entire Company",
  "A Calendar With Too Many Plans",
  "A Notification That Won't Go Away",
  "A Loading Bar at 99 Percent",
  "A Video Call With a Very Dramatic Background",
  "A Group Project With One Hero",
  "A Meeting That Could Have Been a Text",
  "A Presentation With One Slide Too Many",
  "An Office Plant Asking for a Promotion",
  "A Chairperson Who Is Literally a Chair",
  "A Deadline That Learned to Walk",
  "A Brainstorm With Actual Rain",
  "A Team-Building Exercise That Became Competitive",
  "A Lunch Break That Needs a Vacation",
  "A Customer Review Written by a Dog",
  "A Restaurant Menu With Stage Fright",
  "A Chef Who Cannot Boil Water",
  "A Waiter Delivering a Mystery Dish",
  "A Food Critic at a Vending Machine",
  "A Sandwich With a Five-Year Plan",
  "A Pickle at a Formal Dance",
  "A Potato With a Security Detail",
  "A Banana Wearing a Tuxedo",
  "A Cake That Is Afraid of Candles",
  "A Soup That Needs Personal Space",
  "A Refrigerator Magnet Running for Office",
  "A Picnic Interrupted by Diplomacy",
  "A Grocery Cart With Road Rage",
  "A Farmer's Market Celebrity",
  "A Cow Practicing for a Musical",
  "A Chicken With a Secret Identity",
  "A Goat on a Rooftop",
  "A Pigeon Delivering an Important Letter",
  "A Crow Who Collects Receipts",
  "A Squirrel With a Retirement Plan",
  "A Goldfish With a Long Memory",
  "A Cat Hosting a Cooking Show",
  "A Dog Writing a Breakup Letter",
  "A Hamster Training for a Marathon",
  "A Penguin at a Beach Resort",
  "An Octopus Trying to Shake Hands",
  "A Whale With a Tiny Umbrella",
  "A Butterfly in a Board Meeting",
  "A Bee Who Is Allergic to Flowers",
  "A Snail Winning a Race",
  "A Turtle With a Fast-Talking Lawyer",
  "A Dinosaur Reading the Fine Print",
  "A Fossil With a Social Media Account",
  "A Tree With a Very Specific Opinion",
  "A Cactus Giving Relationship Advice",
  "A Mushroom Running a Nightclub",
  "A Flower With a Security Clearance",
  "A Garden Gnome on a Business Trip",
  "A Traffic Cone Directing a Parade",
  "A Street Sign With Stage Fright",
  "A Bus Driver Who Missed the Bus",
  "A Train Station for Lost Thoughts",
  "An Elevator Going Through a Growth Spurt",
  "A Traffic Jam With a Seating Chart",
  "A Tourist Who Packed Only Snacks",
  "An Airport Announcer With a Secret",
  "A Hotel That Checks In Its Guests",
  "A Tourist Attraction Nobody Can Find",
  "A Map Legend Becoming Literal",
  "A Postcard From Around the Corner",
  "A Souvenir That Wants to Go Home",
  "A Theme Park Ride With Stage Fright",
  "A Roller Coaster Looking for a Quiet Day",
  "A Ferris Wheel With a Fear of Heights",
  "A Carnival Game That Knows the Odds",
  "A Parade Float Taking a Wrong Turn",
  "A Confetti Cannon at a Library",
  "A Birthday Party for a Birthday Party",
  "A Wedding Cake's Plus-One",
  "A Surprise Party That Spoiled Itself",
  "A Costume Nobody Understands",
  "A Karaoke Machine Choosing the Songs",
  "A Dance Lesson for People Who Cannot Dance",
  "A Talent Show With One Talent",
  "A Trophy That Wants to Compete",
  "A Medal for Extraordinary Napping",
  "A Referee Who Forgot the Rules",
  "A Sports Mascot in Disguise",
  "A Chess Piece Asking for a Rematch",
  "A Deck of Cards With a Wild Personality",
  "A Dice Roll With a Backup Plan",
  "A Board Game Asking for House Rules",
  "A Puzzle Piece at a Job Fair",
  "A Jigsaw Puzzle Missing One Very Important Corner",
  "A Rubber Duck at a Strategy Meeting",
  "A Balloon With an Appointment",
  "A Kite That Wants to Come Down",
  "A Paper Airplane With Frequent-Flyer Miles",
  "A Sidewalk Chalk Masterpiece in the Rain",
  "A Library Book on a Road Trip",
  "A Bookmark That Lost Its Place",
  "A Dictionary With a New Word",
  "A Book Club for People Who Did Not Read the Book",
  "A Librarian Who Shushes the Ocean",
  "A Poet at a Spreadsheet Convention",
  "A Detective Novel Solving Its Own Mystery",
  "A Mystery Novel With No Mystery",
  "A Cookbook Written by a Picky Eater",
  "A Travel Guide to the Living Room",
  "A Newspaper From Tomorrow",
  "A Headline That Escaped",
  "A Radio Host Who Cannot Find the Volume",
  "A Weather Forecast for Inside the House",
  "A Photograph Blinked",
  "A Camera With Stage Fright",
  "A Selfie Stick in a Family Portrait",
  "A Film Director Who Lost the Plot",
  "A Movie Trailer for a Grocery Trip",
  "A Sound Effect Looking for Its Scene",
  "A Costume Designer With One Color",
  "A Director's Chair Taking Control",
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
    plugin
      ? plugin.id === mode
      : ["telephone", "scribble", "monikers"].includes(mode),
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
  if (mode === "monikers")
    Object.assign(room, {
      minPlayers: 4,
      maxPlayers: 12,
      teams: [
        { id: 0, name: "Team Moon", score: 0 },
        { id: 1, name: "Team Sun", score: 0 },
      ],
      monikers: null,
    });
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
  if (room.mode === "monikers") {
    const counts = [0, 1].map(
      (team) => room.players.filter((p) => p.team === team).length,
    );
    player.team = counts[0] <= counts[1] ? 0 : 1;
  }
  if (room.colors)
    player.color =
      room.colors.find((c) => !room.players.some((p) => p.color === c)) ??
      room.colors[0];
  room.players.push(player);
  room.host ??= id;
}
export function setTeam(room, id, team) {
  assert(room.mode === "monikers", "This game does not use teams.");
  assert(
    ["lobby", "results"].includes(room.phase),
    "Switch teams between games.",
  );
  const player = room.players.find((p) => p.id === id);
  assert(player, "Join the room first.");
  const next = Number(team);
  assert(next === 0 || next === 1, "Choose one of the two teams.");
  player.team = next;
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
  if (room.mode === "monikers") {
    for (const team of room.teams) team.score = 0;
    for (const team of room.teams)
      assert(
        room.players.filter((p) => p.team === team.id).length >= 2,
        "Monikers needs at least two players on each team.",
      );
    const count = Math.min(MONIKERS.length, room.players.length * 5);
    const cards = [...MONIKERS].sort(() => Math.random() - 0.5).slice(0, count);
    room.monikers = {
      cards,
      deck: [...cards].sort(() => Math.random() - 0.5),
      round: 0,
      activeTeam: 0,
      activeByTeam: [0, 0],
      activePlayer: null,
      current: null,
      turnScore: 0,
      roundScores: [0, 0],
    };
    room.phase = "monikers-ready";
    room.deadline = null;
    prepareMonikersTurn(room);
    return;
  }
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
function teamPlayers(room, team) {
  return room.players.filter((p) => p.team === team);
}
function prepareMonikersTurn(room) {
  const game = room.monikers;
  const players = teamPlayers(room, game.activeTeam);
  game.activePlayer =
    players[game.activeByTeam[game.activeTeam] % players.length].id;
  game.activeByTeam[game.activeTeam]++;
  game.current = null;
  game.turnScore = 0;
  room.phase = "monikers-ready";
  room.deadline = null;
}
function finishMonikersRound(room) {
  const game = room.monikers;
  if (game.round === 2) {
    room.players.forEach((p) => {
      p.score = room.teams[p.team].score;
    });
    room.phase = "results";
    room.deadline = null;
    game.current = null;
    return;
  }
  game.round++;
  game.deck = [...game.cards].sort(() => Math.random() - 0.5);
  game.roundScores = [0, 0];
  game.activeTeam = 1 - game.activeTeam;
  prepareMonikersTurn(room);
}
function finishMonikersTurn(room) {
  const game = room.monikers;
  if (game.current) game.deck.push(game.current);
  game.current = null;
  game.activeTeam = 1 - game.activeTeam;
  prepareMonikersTurn(room);
}
export function startMonikersTurn(room, id) {
  assert(
    room.mode === "monikers" && room.phase === "monikers-ready",
    "This turn is not ready to start.",
  );
  assert(
    id === room.monikers.activePlayer,
    "Wait for your turn to give clues.",
  );
  room.phase = "monikers-turn";
  room.monikers.current = room.monikers.deck.shift();
  room.deadline = Date.now() + room.seconds * 1000;
}
export function playMonikersCard(room, id, result) {
  assert(
    room.mode === "monikers" &&
      room.phase === "monikers-turn" &&
      room.monikers.current,
    "There is no active card.",
  );
  const game = room.monikers;
  assert(id === game.activePlayer, "Only the clue giver can mark a card.");
  assert(["guessed", "skip"].includes(result), "Choose guessed or skip.");
  if (result === "guessed") {
    room.teams[game.activeTeam].score++;
    game.roundScores[game.activeTeam]++;
    game.turnScore++;
    if (!game.deck.length) {
      game.current = null;
      finishMonikersRound(room);
      return;
    }
  } else game.deck.push(game.current);
  game.current = game.deck.shift();
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
  const added = {
    color: stroke.color,
    width: stroke.width,
    points: stroke.points,
    player: id,
  };
  room.strokes.push(added);
  return added;
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
  if (room.phase === "monikers-turn") finishMonikersTurn(room);
  else if (room.phase === "choose")
    chooseWord(room, room.drawer, room.choices[0]);
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
  const {
    word,
    choices,
    chains,
    submissions,
    strokes,
    game,
    monikers,
    ...view
  } = room;
  view.you = id;
  if (room.mode === "monikers" && monikers) {
    view.monikers = {
      round: monikers.round,
      activeTeam: monikers.activeTeam,
      activePlayer: monikers.activePlayer,
      remaining: monikers.deck.length + (monikers.current ? 1 : 0),
      total: monikers.cards.length,
      turnScore: monikers.turnScore,
      roundScores: monikers.roundScores,
      card: id === monikers.activePlayer ? monikers.current : null,
    };
  }
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
