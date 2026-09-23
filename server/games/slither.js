export const COLORS = [
  "#a38acc",
  "#ee8f67",
  "#edb948",
  "#609a7d",
  "#619ac6",
  "#db6c89",
  "#62b9ad",
  "#b38a66",
];
export const WIDTH = 1200;
export const HEIGHT = 800;
const FOOD_COUNT = 90;
const SPEED = 140;
const STEP = 12;
const TAU = Math.PI * 2;

function food() {
  return {
    x: 24 + Math.random() * (WIDTH - 48),
    y: 24 + Math.random() * (HEIGHT - 48),
  };
}
function spawn(player, now) {
  const x = 100 + Math.random() * (WIDTH - 200);
  const y = 100 + Math.random() * (HEIGHT - 200);
  const angle = Math.random() * TAU;
  return {
    id: player.id,
    x,
    y,
    angle,
    target: angle,
    length: 8,
    trail: [[x, y]],
    distance: 0,
    invulnerableUntil: now + 2000,
    respawnAt: 0,
  };
}
const distance2 = (x, y, point) => (x - point[0]) ** 2 + (y - point[1]) ** 2;

export function start(room, now = Date.now()) {
  room.arena = {
    snakes: room.players.map((p) => spawn(p, now)),
    food: Array.from({ length: FOOD_COUNT }, food),
    lastTick: now,
  };
  room.phase = "arena";
  room.deadline = now + room.seconds * 1000;
}
export function action(room, id, name, payload) {
  if (name === "color") {
    if (room.phase !== "lobby") throw new Error("Choose a color in the lobby.");
    if (!COLORS.includes(payload?.color))
      throw new Error("Invalid snake color.");
    const player = room.players.find((p) => p.id === id);
    if (!player) throw new Error("Join the room first.");
    player.color = payload.color;
    return true;
  }
  if (name !== "steer" && name !== "respawn")
    throw new Error("Unknown game action.");
  if (room.phase !== "arena") throw new Error("The match is not running.");
  const snake = room.arena.snakes.find((s) => s.id === id);
  if (!snake) throw new Error("Join the room first.");
  if (name === "respawn") {
    if (!snake.respawnAt) throw new Error("Your snake is already playing.");
    if (Date.now() < snake.respawnAt)
      throw new Error("Your snake is not ready to respawn yet.");
    Object.assign(
      snake,
      spawn(
        room.players.find((p) => p.id === id),
        Date.now(),
      ),
    );
    return false;
  }
  if (snake.respawnAt) throw new Error("Respawn before steering.");
  if (!Number.isFinite(payload?.angle))
    throw new Error("Invalid steering direction.");
  snake.target = ((payload.angle % TAU) + TAU) % TAU;
  return false;
}
export function tick(room, now = Date.now()) {
  if (room.phase !== "arena") return false;
  if (now >= room.deadline) {
    room.phase = "results";
    room.deadline = null;
    delete room.arena;
    return true;
  }
  const arena = room.arena;
  const dt = Math.min(0.1, Math.max(0, (now - arena.lastTick) / 1000));
  arena.lastTick = now;
  for (const snake of arena.snakes) {
    if (snake.respawnAt) continue;
    const delta = Math.atan2(
      Math.sin(snake.target - snake.angle),
      Math.cos(snake.target - snake.angle),
    );
    snake.angle += Math.max(-dt * 3, Math.min(dt * 3, delta));
    snake.x += Math.cos(snake.angle) * SPEED * dt;
    snake.y += Math.sin(snake.angle) * SPEED * dt;
    snake.distance += SPEED * dt;
    if (snake.distance >= STEP) {
      snake.trail.unshift([snake.x, snake.y]);
      snake.distance %= STEP;
      snake.trail.length = Math.min(snake.trail.length, snake.length);
    }
    const wall =
      snake.x < 12 ||
      snake.x > WIDTH - 12 ||
      snake.y < 12 ||
      snake.y > HEIGHT - 12;
    const body = arena.snakes.some(
      (other) =>
        !other.respawnAt &&
        other.trail
          .slice(other === snake ? 6 : 2)
          .some((point) => distance2(snake.x, snake.y, point) < 17 ** 2),
    );
    if (wall || (now >= snake.invulnerableUntil && body)) {
      snake.respawnAt = now + 1800;
      snake.trail = [];
      snake.length = 8;
      continue;
    }
    for (let i = 0; i < arena.food.length; i++) {
      if (
        distance2(snake.x, snake.y, [arena.food[i].x, arena.food[i].y]) <
        20 ** 2
      ) {
        arena.food[i] = food();
        snake.length = Math.min(75, snake.length + 2);
        room.players.find((p) => p.id === snake.id).score += 10;
      }
    }
  }
  return false;
}
export function view(room) {
  return {
    width: WIDTH,
    height: HEIGHT,
    food: room.arena.food,
    snakes: room.arena.snakes.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      trail: s.trail,
      length: s.length,
      respawnAt: s.respawnAt,
      invulnerableUntil: s.invulnerableUntil,
    })),
    scores: room.players.map((p) => ({ id: p.id, score: p.score })),
    deadline: room.deadline,
  };
}
export default {
  id: "slither",
  minimum: 2,
  maximum: 8,
  seconds: [60, 90, 120],
  fastActions: ["steer"],
  start,
  action,
  tick,
  view,
  onJoin(room, player) {
    player.color = COLORS[(room.players.length - 1) % COLORS.length];
  },
};
