// Slither Showdown: server-authoritative snake arena.
// Frames are packed into a single Int16Array (see encodeFrame) to keep
// realtime traffic small and parsing cheap on the client.

export const WORLD = 1600;
export const SEG = 8;
export const START_MASS = 10;
const BASE_SPEED = 165;
const BOOST_SPEED = 320;
const TURN_RATE = 4.6;
const FOOD_TARGET = 420;
const FOOD_MAX = 1100;
const RESPAWN_SECONDS = 3;
const BOOST_COST_SECONDS = 0.18;
export const COLORS = [
  "#7b61c9",
  "#ee8f67",
  "#e6b43c",
  "#4f9a74",
  "#4d8fc7",
  "#db6c89",
  "#35b3b0",
  "#a3c14a",
  "#c05bc4",
  "#5f5a73",
];

export const pointsFor = (mass) => Math.floor(10 + mass * 1.5);
export const radiusFor = (mass) => Math.min(30, 7 + Math.sqrt(mass) * 0.9);
const viewRadiusFor = (mass) =>
  Math.round(500 + Math.min(700, Math.sqrt(mass) * 32));
const clampInt = (n) => Math.max(-32768, Math.min(32767, Math.round(n)));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function spawnFood(state, x, y, value = 1, color) {
  if (state.food.length >= FOOD_MAX) return;
  if (x === undefined) {
    const r = (WORLD - 40) * Math.sqrt(state.random());
    const a = state.random() * Math.PI * 2;
    x = Math.cos(a) * r;
    y = Math.sin(a) * r;
  }
  state.food.push({
    x,
    y,
    v: value,
    c: color ?? Math.floor(state.random() * COLORS.length),
  });
}

function spawnSnake(state, s) {
  let best = null;
  for (let i = 0; i < 24; i++) {
    const r = WORLD * 0.72 * Math.sqrt(state.random());
    const a = state.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    let nearest = Infinity;
    for (const o of state.snakes.values())
      if (o.alive && o !== s)
        for (let j = 0; j < o.trail.length; j += 4)
          nearest = Math.min(
            nearest,
            (o.trail[j][0] - x) ** 2 + (o.trail[j][1] - y) ** 2,
          );
    if (!best || nearest > best.nearest) best = { x, y, nearest };
  }
  const angle = Math.atan2(-best.y, -best.x) + (state.random() - 0.5);
  Object.assign(s, {
    alive: true,
    x: best.x,
    y: best.y,
    angle,
    target: angle,
    boost: false,
    boostAcc: 0,
    mass: START_MASS,
    killer: -1,
    trail: Array.from({ length: pointsFor(START_MASS) }, (_, i) => [
      best.x - Math.cos(angle) * SEG * (i + 1),
      best.y - Math.sin(angle) * SEG * (i + 1),
    ]),
  });
}

function addSnake(state, player) {
  const s = {
    id: player.id,
    slot: state.slots.length,
    colorIndex: Math.max(0, COLORS.indexOf(player.color)),
    kills: 0,
    deaths: 0,
    best: START_MASS,
    view: viewRadiusFor(START_MASS),
  };
  state.slots.push(player.id);
  state.snakes.set(player.id, s);
  spawnSnake(state, s);
  return s;
}

function kill(state, s, killer) {
  s.alive = false;
  s.deaths++;
  s.respawnAt = state.time + RESPAWN_SECONDS;
  s.killer = killer ? killer.slot : -1;
  if (killer) killer.kills++;
  const count = Math.min(90, Math.ceil(s.trail.length / 2));
  const value = Math.max(1, Math.round((s.mass * 0.75) / count));
  for (let i = 0; i < count; i++) {
    const [x, y] = s.trail[Math.min(s.trail.length - 1, i * 2)];
    spawnFood(
      state,
      x + (state.random() - 0.5) * 14,
      y + (state.random() - 0.5) * 14,
      value,
      s.colorIndex,
    );
  }
}

function bounds(s) {
  let minX = s.x,
    maxX = s.x,
    minY = s.y,
    maxY = s.y;
  for (const [x, y] of s.trail) {
    if (x < minX) minX = x;
    else if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    else if (y > maxY) maxY = y;
  }
  const r = radiusFor(s.mass);
  return { minX: minX - r, maxX: maxX + r, minY: minY - r, maxY: maxY + r };
}

function step(state, s, dt) {
  const turn = (TURN_RATE * dt) / (1 + (s.mass - START_MASS) / 700);
  const diff = wrapAngle(s.target - s.angle);
  s.angle = wrapAngle(s.angle + Math.max(-turn, Math.min(turn, diff)));
  const boosting = s.boost && s.mass > START_MASS + 1;
  const speed = boosting ? BOOST_SPEED : BASE_SPEED;
  s.x += Math.cos(s.angle) * speed * dt;
  s.y += Math.sin(s.angle) * speed * dt;
  // Lay trail points at exact SEG spacing so body shape is speed-independent.
  let [lx, ly] = s.trail[0];
  let d = Math.hypot(s.x - lx, s.y - ly);
  while (d >= SEG) {
    lx += ((s.x - lx) / d) * SEG;
    ly += ((s.y - ly) / d) * SEG;
    s.trail.unshift([lx, ly]);
    d -= SEG;
  }
  if (boosting) {
    s.boostAcc += dt;
    while (s.boostAcc >= BOOST_COST_SECONDS && s.mass > START_MASS + 1) {
      s.boostAcc -= BOOST_COST_SECONDS;
      s.mass--;
      const [tx, ty] = s.trail.at(-1);
      spawnFood(state, tx, ty, 1, s.colorIndex);
    }
  } else s.boostAcc = 0;
  const max = pointsFor(s.mass);
  if (s.trail.length > max) s.trail.length = max;
}

export function tick(state, dt) {
  dt = Math.min(0.1, Math.max(0, dt));
  state.time += dt;
  const snakes = [...state.snakes.values()];
  const alive = snakes.filter((s) => s.alive);
  for (const s of alive) step(state, s, dt);
  for (const s of alive) {
    const reach = radiusFor(s.mass) + 12;
    for (let i = state.food.length - 1; i >= 0; i--) {
      const f = state.food[i];
      const r = reach + f.v * 2;
      const dx = f.x - s.x;
      if (dx > r || dx < -r) continue;
      const dy = f.y - s.y;
      if (dx * dx + dy * dy < r * r) {
        s.mass += f.v;
        state.food[i] = state.food.at(-1);
        state.food.pop();
      }
    }
    s.best = Math.max(s.best, s.mass);
    s.view = viewRadiusFor(s.mass);
  }
  const boxes = new Map(alive.map((s) => [s, bounds(s)]));
  const deaths = [];
  for (const s of alive) {
    const r = radiusFor(s.mass);
    if (Math.hypot(s.x, s.y) + r > WORLD) {
      deaths.push([s, null]);
      continue;
    }
    for (const o of alive) {
      if (o === s) continue;
      const b = boxes.get(o);
      if (s.x < b.minX || s.x > b.maxX || s.y < b.minY || s.y > b.maxY)
        continue;
      const hit = (r * 0.8 + radiusFor(o.mass)) ** 2;
      let dead = (o.x - s.x) ** 2 + (o.y - s.y) ** 2 < hit;
      for (let i = 0; !dead && i < o.trail.length; i++)
        dead = (o.trail[i][0] - s.x) ** 2 + (o.trail[i][1] - s.y) ** 2 < hit;
      if (dead) {
        deaths.push([s, o]);
        break;
      }
    }
  }
  for (const [s, o] of deaths) kill(state, s, o);
  for (let i = 0; i < 12 && state.food.length < FOOD_TARGET; i++)
    spawnFood(state);
  state.seq = (state.seq + 1) & 0x7fff;
  state.frameCache = null;
  return state.time >= state.duration;
}

function encodeSnake(s) {
  const out = [s.slot, s.boost && s.mass > START_MASS + 1 ? 1 : 0];
  out.push(Math.round(radiusFor(s.mass) * 10), 0, clampInt(s.x), clampInt(s.y));
  const last = s.trail.length - 1;
  for (let i = 1; i <= last; i += 2)
    out.push(clampInt(s.trail[i][0]), clampInt(s.trail[i][1]));
  if (last % 2 === 0)
    out.push(clampInt(s.trail[last][0]), clampInt(s.trail[last][1]));
  out[3] = (out.length - 4) / 2;
  return out;
}

export function encodeFrame(state, id) {
  const me = state.snakes.get(id);
  if (!me) return null;
  if (!state.frameCache) {
    const alive = [...state.snakes.values()].filter((s) => s.alive);
    state.frameCache = {
      heads: alive.flatMap((s) => [s.slot, clampInt(s.x), clampInt(s.y)]),
      snakes: alive.map((s) => ({ box: bounds(s), data: encodeSnake(s) })),
    };
  }
  const { heads, snakes } = state.frameCache;
  const view = me.view;
  const cx = me.x;
  const cy = me.y;
  const visible = snakes.filter(
    ({ box }) =>
      box.maxX > cx - view &&
      box.minX < cx + view &&
      box.maxY > cy - view &&
      box.minY < cy + view,
  );
  const food = [];
  for (const f of state.food) {
    const dx = f.x - cx;
    const dy = f.y - cy;
    if (dx * dx + dy * dy < view * view)
      food.push(clampInt(f.x), clampInt(f.y), (Math.min(f.v, 15) << 4) | f.c);
  }
  const header = [
    1,
    state.seq,
    me.alive ? 1 : 0,
    me.alive ? 0 : Math.max(0, Math.ceil((me.respawnAt - state.time) * 10)),
    me.killer,
    Math.max(0, Math.ceil(state.duration - state.time)),
    view,
    WORLD,
    Math.min(32767, me.mass),
    me.kills,
    clampInt(cx),
    clampInt(cy),
    heads.length / 3,
  ];
  let size = header.length + heads.length + 1 + 1 + food.length;
  for (const s of visible) size += s.data.length;
  const out = new Int16Array(size);
  let o = 0;
  const write = (values) => {
    out.set(values, o);
    o += values.length;
  };
  write(header);
  write(heads);
  out[o++] = visible.length;
  for (const s of visible) write(s.data);
  out[o++] = food.length / 3;
  write(food);
  return Buffer.from(out.buffer);
}

function ranked(state, key) {
  return [...state.snakes.values()].sort(
    (a, b) => key(b) - key(a) || b.kills - a.kills || a.deaths - b.deaths,
  );
}

export default {
  id: "slither",
  tickRate: 30,
  sendRate: 15,
  meta: {
    name: "Slither Showdown",
    label: "EAT. GROW. DON’T BLINK.",
    description:
      "Steer your snake around the arena, gobble glowing snacks and trap your friends to become the longest noodle in the room.",
    players: "1–8 players",
    time: "1–5 min",
    tag: "Fast-paced",
    badge: "THE ARCADE PICK",
    caption: "longest noodle wins",
    kind: "Arcade",
    categories: ["Arcade"],
    art: "art.svg",
    theme: { background: "#dcefe3", accent: "#4f8f6c", ink: "#3f7358" },
    minPlayers: 1,
    maxPlayers: 8,
    joinInProgress: true,
    continueOnLeave: true,
    colors: COLORS,
    colorNames: [
      "Grape",
      "Tangerine",
      "Mustard",
      "Fern",
      "Sky",
      "Bubblegum",
      "Lagoon",
      "Lime",
      "Orchid",
      "Slate",
    ],
    scoreUnit: "length",
    settings: [
      {
        key: "minutes",
        label: "Round length",
        default: 3,
        options: [
          { value: 1, label: "1 minute" },
          { value: 3, label: "3 minutes" },
          { value: 5, label: "5 minutes" },
        ],
      },
    ],
    rules: [
      "Pick a snake color in the lobby. 1–8 players, and friends can hop in mid-round.",
      "Steer with your mouse, finger, or arrow keys. Hold click, Space, or the Boost button to speed up (it costs length).",
      "If your head touches another snake you’re out — hit Respawn after 3 seconds to jump back in. Longest snake at any point in the round wins!",
    ],
  },
  create({ players, settings, random = Math.random }) {
    const state = {
      time: 0,
      duration: (Number(settings?.minutes) || 3) * 60,
      snakes: new Map(),
      slots: [],
      food: [],
      seq: 0,
      random,
      frameCache: null,
    };
    for (const p of players) addSnake(state, p);
    while (state.food.length < FOOD_TARGET) spawnFood(state);
    return state;
  },
  join(state, player) {
    if (!state.snakes.has(player.id)) addSnake(state, player);
  },
  leave(state, id) {
    const s = state.snakes.get(id);
    if (!s) return;
    if (s.alive) kill(state, s, null);
    state.snakes.delete(id);
    state.frameCache = null;
  },
  input(state, id, payload) {
    const s = state.snakes.get(id);
    if (!s) return;
    if (payload.r === 1) {
      if (!s.alive && state.time >= s.respawnAt) {
        spawnSnake(state, s);
        state.frameCache = null;
      }
      return;
    }
    const a = Number(payload.a);
    if (Number.isFinite(a)) s.target = wrapAngle(a);
    if ("b" in payload) s.boost = payload.b === true || payload.b === 1;
  },
  tick,
  frame: encodeFrame,
  publicState(state) {
    return { slots: state.slots, worldRadius: WORLD };
  },
  leaderboard(state) {
    return ranked(state, (s) => (s.alive ? s.mass : 0)).map((s) => ({
      id: s.id,
      score: s.alive ? s.mass : 0,
      detail: s.alive
        ? `${s.kills} ${s.kills === 1 ? "takedown" : "takedowns"}`
        : "Knocked out",
    }));
  },
  results(state) {
    return ranked(state, (s) => s.best).map((s) => ({
      id: s.id,
      score: s.best,
      detail: `${s.kills} ${s.kills === 1 ? "takedown" : "takedowns"} · ${s.deaths} ${s.deaths === 1 ? "crash" : "crashes"}`,
    }));
  },
};
