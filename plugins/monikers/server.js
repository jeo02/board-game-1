// Name Droppers: a team guessing game in the style of Monikers / Celebrity.
// Players draft a shared deck, then teams race the clock over three rounds
// with stricter clue rules each time (anything goes, one word, charades).
// Turn-based moves arrive through the reliable action() path; frames are
// small per-player JSON snapshots so each player only sees what they should.

import { CARDS } from "./cards.js";

export const ROUNDS = [
  {
    title: "Anything goes",
    rule: "Say anything except the name itself. Sounds, gestures and reading the clue out loud are all fine. Said part of the name? Skip that card.",
  },
  {
    title: "One word",
    rule: "Give exactly one word per card. Repeat it as much as you like, but no sounds or gestures.",
  },
  {
    title: "Charades",
    rule: "No words at all. Act it out! Sound effects are OK, within reason.",
  },
  {
    title: "One sound",
    rule: "Bonus round: make a single sound per card. No words, no gestures.",
  },
];
export const DRAFT_SECONDS = 150;
export const REVIEW_SECONDS = 25;
export const ROUND_BREAK_SECONDS = 15;
export const GIVER_PATIENCE_SECONDS = 15;

const shuffle = (list, random) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};
const cardView = (id) => ({ id, ...CARDS[id] });
const fail = (message) => {
  throw new Error(message);
};

// Deal more and keep more with small groups, fewer with big ones, so the
// shared deck lands near the target size (the rules suggest 40–50 cards).
export function draftSize(playerCount, target, poolSize = CARDS.length) {
  const pick = Math.min(10, Math.max(2, Math.round(target / playerCount)));
  const deal = Math.max(
    pick,
    Math.min(pick * 2, Math.floor(poolSize / playerCount)),
  );
  return { pick, deal };
}

function addPlayer(state, { id, name, team }) {
  const t = state.teams[team] ?? state.teams[0];
  const player = {
    id,
    name,
    team: t.index,
    hand: [],
    picks: [],
    locked: false,
  };
  state.players.set(id, player);
  if (!t.members.includes(id)) t.members.push(id);
  if (state.phase === "draft") {
    player.hand = state.pool.splice(0, state.draft.deal);
    if (player.hand.length < state.draft.pick) player.locked = true;
  }
}

function finishDraft(state) {
  for (const p of state.players.values()) {
    if (!p.locked) {
      const missing = p.hand.filter((c) => !p.picks.includes(c));
      p.picks.push(...missing.slice(0, state.draft.pick - p.picks.length));
    }
    state.deck.push(...p.picks);
    p.hand = [];
  }
  state.deck = [...new Set(state.deck)];
  state.activeTeam = Math.floor(state.random() * state.teams.length);
  startRound(state, 0);
}

function startRound(state, round) {
  state.round = round;
  state.drawPile = shuffle([...state.deck], state.random);
  state.claims.push([]);
  state.teams.forEach((t) => t.rounds.push(0));
  readyNextGiver(state);
}

function readyNextGiver(state) {
  const team = state.teams[state.activeTeam];
  state.giver = team.members[team.next % team.members.length] ?? null;
  state.phase = "ready";
  state.deadline = state.time + GIVER_PATIENCE_SECONDS;
  state.seq++;
}

function drawCard(state) {
  if (!state.drawPile.length && state.skipped.length) {
    state.drawPile = shuffle(state.skipped, state.random);
    state.skipped = [];
  }
  state.current = state.drawPile.pop() ?? null;
  if (state.current === null) endTurn(state);
}

function endTurn(state) {
  if (state.current !== null) state.drawPile.push(state.current);
  state.drawPile = shuffle([...state.drawPile, ...state.skipped], state.random);
  state.current = null;
  state.skipped = [];
  state.phase = "review";
  state.deadline = state.time + REVIEW_SECONDS;
  state.seq++;
}

function claimsFor(state, round = state.round) {
  return state.claims[round] ?? [];
}

function rescore(state) {
  for (const t of state.teams) t.rounds[state.round] = 0;
  for (const claim of claimsFor(state))
    if (!claim.rejected)
      state.teams[claim.team].rounds[state.round] += CARDS[claim.card].points;
}

function finishReview(state) {
  for (const claim of claimsFor(state))
    if (claim.turn === state.turnNumber && claim.rejected)
      state.drawPile.push(claim.card);
  state.claims[state.round] = claimsFor(state).filter((c) => !c.rejected);
  state.drawPile = shuffle(state.drawPile, state.random);
  rescore(state);
  if (state.drawPile.length) {
    state.activeTeam = (state.activeTeam + 1) % state.teams.length;
    readyNextGiver(state);
    return;
  }
  if (state.round + 1 >= state.rounds) {
    state.phase = "over";
    state.seq++;
    return;
  }
  state.phase = "break";
  state.deadline = state.time + ROUND_BREAK_SECONDS;
  state.seq++;
}

function nextRound(state) {
  // The team with the lowest score starts the next round. Ties go to the
  // team that would have been next in the rotation anyway.
  const order = state.teams.map(
    (_, i) => (state.activeTeam + 1 + i) % state.teams.length,
  );
  state.activeTeam = order.reduce((best, i) =>
    total(state.teams[i]) < total(state.teams[best]) ? i : best,
  );
  startRound(state, state.round + 1);
}

const total = (team) => team.rounds.reduce((sum, n) => sum + n, 0);

function startTurn(state) {
  const team = state.teams[state.activeTeam];
  team.next++;
  state.turnNumber++;
  state.phase = "turn";
  state.deadline = state.time + state.seconds;
  state.skipped = [];
  drawCard(state);
  state.seq++;
}

function passGiver(state) {
  state.teams[state.activeTeam].next++;
  readyNextGiver(state);
}

function ranked(state) {
  return [...state.teams]
    .sort((a, b) => total(b) - total(a) || a.index - b.index)
    .map((t) => ({
      team: t.index,
      score: total(t),
      detail: t.rounds.map((n, i) => `R${i + 1} ${n}`).join(" · "),
    }));
}

export function tick(state, dt) {
  state.time += dt;
  if (state.phase === "over") return true;
  if (state.time < state.deadline) return false;
  if (state.phase === "draft") finishDraft(state);
  else if (state.phase === "turn") endTurn(state);
  else if (state.phase === "review") finishReview(state);
  else if (state.phase === "break") nextRound(state);
  return state.phase === "over";
}

export function action(state, id, payload) {
  const player = state.players.get(id) ?? fail("You are not in this game.");
  const type = payload?.type;
  const isGiver = id === state.giver;
  if (state.phase === "draft") {
    if (type === "pick") {
      const card = Number(payload.card);
      if (player.locked) fail("Unlock your picks to change them.");
      if (!player.hand.includes(card)) fail("That card isn’t in your hand.");
      if (player.picks.includes(card))
        player.picks = player.picks.filter((c) => c !== card);
      else if (player.picks.length >= state.draft.pick)
        fail(`You can keep ${state.draft.pick} cards. Drop one first.`);
      else player.picks.push(card);
    } else if (type === "lock") {
      if (!player.locked && player.picks.length !== state.draft.pick)
        fail(`Choose ${state.draft.pick} cards first.`);
      player.locked = !player.locked;
      if ([...state.players.values()].every((p) => p.locked))
        finishDraft(state);
    } else fail("Finish the draft first.");
  } else if (state.phase === "ready") {
    if (type === "start") {
      if (!isGiver) fail("Wait for your turn to give clues.");
      startTurn(state);
    } else if (type === "pass") {
      if (!isGiver && state.time < state.deadline)
        fail("Give them a moment to get ready.");
      passGiver(state);
    } else fail("Waiting for the next turn to start.");
  } else if (state.phase === "turn") {
    if (!isGiver) fail("Only the clue-giver can do that.");
    if (type === "got") {
      state.claims[state.round].push({
        card: state.current,
        team: state.activeTeam,
        turn: state.turnNumber,
        rejected: false,
      });
      rescore(state);
      drawCard(state);
    } else if (type === "skip") {
      // Skipped cards sit out until the draw pile runs dry, then get
      // reshuffled back in so the clue-giver never runs out mid-turn.
      state.skipped.push(state.current);
      drawCard(state);
    } else if (type === "undo") {
      const claims = claimsFor(state);
      const last = claims.at(-1);
      if (last?.turn !== state.turnNumber) fail("Nothing to undo this turn.");
      claims.pop();
      state.drawPile.push(state.current);
      state.current = last.card;
      rescore(state);
    } else fail("Unknown move.");
  } else if (state.phase === "review") {
    if (type === "dispute") {
      const claim = claimsFor(state).find(
        (c) => c.turn === state.turnNumber && c.card === Number(payload.card),
      );
      if (!claim) fail("That card wasn’t guessed this turn.");
      claim.rejected = !claim.rejected;
      claim.by = player.name;
      rescore(state);
    } else if (type === "continue") {
      const next = state.teams[(state.activeTeam + 1) % state.teams.length];
      const nextGiver = next.members[next.next % next.members.length];
      if (!isGiver && id !== nextGiver)
        fail("The clue-giver or the next one up moves things along.");
      finishReview(state);
    } else fail("Review the turn first.");
  } else if (state.phase === "break") {
    if (type !== "continue") fail("The next round is about to start.");
    nextRound(state);
  } else fail("The game is wrapping up.");
  state.seq++;
}

export function frame(state, id) {
  const you = state.players.get(id);
  const team = you?.team ?? null;
  const giverTeam = state.players.get(state.giver)?.team ?? state.activeTeam;
  const role =
    id === state.giver ? "giver" : team === giverTeam ? "guesser" : "watcher";
  const turnClaims = claimsFor(state).filter(
    (c) => c.turn === state.turnNumber,
  );
  const live = ["turn", "review"].includes(state.phase);
  const out = {
    seq: state.seq,
    phase: state.phase,
    round: state.round,
    rounds: state.rounds,
    rule: ROUNDS[state.round],
    seconds: state.seconds,
    timeLeft:
      state.phase === "over" ? 0 : Math.max(0, state.deadline - state.time),
    deckSize: state.deck.length,
    cardsLeft:
      state.drawPile.length +
      state.skipped.length +
      (state.current === null ? 0 : 1) +
      turnClaims.filter((c) => c.rejected).length,
    activeTeam: state.activeTeam,
    giver: state.giver,
    you: { team, role },
    teams: state.teams.map((t) => ({
      index: t.index,
      name: t.name,
      color: t.color,
      members: t.members,
      rounds: t.rounds,
      total: total(t),
    })),
  };
  if (state.phase === "draft") {
    const players = [...state.players.values()];
    out.draft = {
      pick: state.draft.pick,
      hand: (you?.hand ?? []).map(cardView),
      picks: you?.picks ?? [],
      locked: you?.locked ?? false,
      lockedCount: players.filter((p) => p.locked).length,
      playerCount: players.length,
    };
  }
  if (live) {
    out.turn = {
      skipped: state.skipped.length,
      canUndo:
        role === "giver" && state.phase === "turn" && turnClaims.length > 0,
      claims: turnClaims.map((c) => ({
        ...cardView(c.card),
        rejected: c.rejected,
        by: c.by ?? null,
      })),
    };
    if (state.phase === "turn" && role !== "guesser" && state.current !== null)
      out.card = cardView(state.current);
  }
  if (state.phase === "review") {
    const next = state.teams[(state.activeTeam + 1) % state.teams.length];
    out.nextGiver = next.members[next.next % next.members.length] ?? null;
  }
  return out;
}

export default {
  id: "monikers",
  tickRate: 4,
  sendRate: 2,
  meta: {
    name: "Name Droppers",
    label: "WHO? EXACTLY.",
    description:
      "Draft a deck of famous names, then split into teams and race the clock to get your friends to guess them. Same deck, three rounds, fewer words each time.",
    players: "4–16 players",
    time: "30–60 min",
    tag: "Team game",
    badge: "THE TEAM PICK",
    caption: "same names, fewer words, more chaos",
    kind: "Party",
    categories: ["Party games", "Team games"],
    art: "art.svg",
    theme: { background: "#fbe4d8", accent: "#d06a4b", ink: "#a24b30" },
    minPlayers: 4,
    maxPlayers: 16,
    joinInProgress: true,
    continueOnLeave: true,
    teams: {
      min: 2,
      max: 4,
      default: 2,
      minPlayers: 2,
      names: ["Team Sunrise", "Team Midnight", "Team Fern", "Team Mustard"],
      colors: ["#e0794e", "#5b6fc7", "#4f9a74", "#c99a1e"],
    },
    scoreUnit: "pts",
    settings: [
      {
        key: "seconds",
        label: "Turn length",
        default: 60,
        options: [
          { value: 30, label: "30-second turns" },
          { value: 45, label: "45-second turns" },
          { value: 60, label: "60-second turns" },
        ],
      },
      {
        key: "deck",
        label: "Deck size",
        default: 45,
        options: [
          { value: 30, label: "Quick deck (~30 cards)" },
          { value: 45, label: "Classic deck (~45 cards)" },
          { value: 60, label: "Big deck (~60 cards)" },
        ],
      },
      {
        key: "rounds",
        label: "Rounds",
        default: 3,
        options: [
          { value: 3, label: "3 rounds" },
          { value: 4, label: "4 rounds (+ one-sound bonus)" },
        ],
      },
    ],
    rules: [
      "Split into teams of 2+. Everyone secretly keeps half of the cards they’re dealt; the picks form one shared deck.",
      "On your turn, get your team to guess as many names as you can before time runs out. Skip freely. Round 1: say anything but the name. Round 2: one word. Round 3: charades.",
      "A round ends when the deck is empty. Each card is worth its points, and the lowest-scoring team starts the next round. Highest total after the last round wins!",
    ],
  },
  create({ players, settings, teams, random = Math.random }) {
    const state = {
      random,
      time: 0,
      seq: 0,
      seconds: Number(settings?.seconds) || 60,
      rounds: Math.min(ROUNDS.length, Number(settings?.rounds) || 3),
      phase: "draft",
      deadline: DRAFT_SECONDS,
      draft: draftSize(players.length, Number(settings?.deck) || 45),
      pool: shuffle(
        CARDS.map((_, i) => i),
        random,
      ),
      players: new Map(),
      teams: (teams ?? [{ index: 0, name: "Everyone", color: "#d06a4b" }]).map(
        (t) => ({ ...t, members: [], next: 0, rounds: [] }),
      ),
      deck: [],
      drawPile: [],
      skipped: [],
      current: null,
      claims: [],
      round: 0,
      turnNumber: 0,
      activeTeam: 0,
      giver: null,
    };
    for (const p of players) addPlayer(state, p);
    return state;
  },
  join: addPlayer,
  leave(state, id) {
    const player = state.players.get(id);
    if (!player) return;
    state.players.delete(id);
    const team = state.teams[player.team];
    team.members = team.members.filter((m) => m !== id);
    if (state.phase === "draft") {
      if (player.locked) state.deck.push(...player.picks);
      if (
        state.players.size &&
        [...state.players.values()].every((p) => p.locked)
      )
        finishDraft(state);
    } else if (state.giver === id) {
      if (state.phase === "turn") endTurn(state);
      else if (state.phase === "ready") readyNextGiver(state);
    }
    state.seq++;
  },
  input() {},
  action,
  tick,
  frame,
  leaderboard: ranked,
  results: ranked,
};
