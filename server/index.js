import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createRoom,
  addPlayer,
  setColor,
  startGame,
  telephoneSubmit,
  chooseWord,
  guess,
  addStroke,
  editCanvas,
  viewFor,
  tick,
  clean,
} from "./engine.js";
import { loadPlugins, sanitizeSettings } from "./plugins.js";

const pluginDir = process.env.PLUGINS_DIR
  ? path.resolve(process.env.PLUGINS_DIR)
  : fileURLToPath(new URL("../plugins", import.meta.url));
const plugins = await loadPlugins(pluginDir);
console.log(
  `Loaded ${plugins.size} game plugin(s)${plugins.size ? ": " + [...plugins.keys()].join(", ") : ""}`,
);
const app = express();
const http = createServer(app);
const io = new Server(http, { maxHttpBufferSize: 100000 });
const rooms = new Map();
const sessions = new Map();
function broadcast(room) {
  room.updatedAt = Date.now();
  const { game, ...shared } = room;
  const plugin = plugins.get(room.mode);
  if (plugin && game) shared.gameInfo = plugin.publicState?.(game) ?? null;
  for (const p of room.players)
    if (p.socketId)
      io.to(p.socketId).emit(
        "room",
        viewFor(
          {
            ...shared,
            players: room.players.map(({ socketId, ...safe }) => safe),
          },
          p.id,
        ),
      );
}
function stopGame(room, notice) {
  room.game = null;
  room.phase = "lobby";
  room.deadline = null;
  room.notice = notice;
}
function finishGame(room) {
  const plugin = plugins.get(room.mode);
  const ids = new Set(room.players.map((p) => p.id));
  room.results = plugin
    .results(room.game)
    .filter((entry) => ids.has(entry.id))
    .map(({ id, score, detail }) => ({
      id,
      score: Number(score) || 0,
      detail: clean(detail, 60),
    }));
  for (const entry of room.results)
    room.players.find((p) => p.id === entry.id).score = entry.score;
  room.game = null;
  room.phase = "results";
}
function startPluginGame(room) {
  const plugin = plugins.get(room.mode);
  room.game = plugin.create({
    players: room.players.map(({ id, name, color }) => ({ id, name, color })),
    settings: room.settings,
  });
  room.lastTick = performance.now();
  room.ticks = 0;
}
function leave(socket) {
  const room = rooms.get(socket.data.code);
  if (!room) return;
  room.players = room.players.filter((p) => p.id !== socket.data.playerId);
  sessions.delete(socket.data.token);
  const plugin = plugins.get(room.mode);
  if (room.game) plugin.leave?.(room.game, socket.data.playerId);
  socket.data = {};
  socket.emit("left");
  if (!room.players.length) return void rooms.delete(room.code);
  if (!room.players.some((p) => p.id === room.host))
    room.host = room.players[0].id;
  if (
    room.game &&
    plugin.meta.continueOnLeave &&
    room.players.length >= room.minPlayers
  ) {
    broadcast(room);
    return;
  }
  if (!["lobby", "results"].includes(room.phase))
    stopGame(room, "A player left. Gather your crew and start a fresh game.");
  broadcast(room);
}
io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;
  const session = sessions.get(token);
  if (session) {
    const room = rooms.get(session.code);
    const p = room?.players.find((p) => p.id === session.playerId);
    if (p) {
      socket.data = { ...session, token };
      p.socketId = socket.id;
      p.connected = true;
      broadcast(room);
    }
  }
  let lastAction = 0;
  socket.on("action", (action, payload = {}, ack = () => {}) => {
    try {
      if (!payload || typeof payload !== "object")
        throw new Error("Invalid request.");
      const now = Date.now();
      if (now - lastAction < 20) throw new Error("One moment — try again.");
      lastAction = now;
      if (["create", "join"].includes(action)) {
        if (socket.data.code) throw new Error("Leave your current room first.");
        const plugin = plugins.get(payload.mode);
        const room =
          action === "create"
            ? createRoom(
                payload.title,
                payload.mode,
                Number(payload.rounds),
                Number(payload.seconds),
                plugin,
                plugin ? sanitizeSettings(plugin.meta, payload.settings) : {},
              )
            : rooms.get(clean(payload.code, 6).toUpperCase());
        if (!room)
          throw new Error(
            "Room not found. Double-check the six-character code.",
          );
        const playerId = randomUUID();
        addPlayer(room, playerId, payload.name);
        rooms.set(room.code, room);
        const player = room.players.at(-1);
        player.socketId = socket.id;
        if (room.game)
          plugins.get(room.mode).join?.(room.game, {
            id: player.id,
            name: player.name,
            color: player.color,
          });
        const sessionToken = randomUUID();
        socket.data = { code: room.code, playerId, token: sessionToken };
        sessions.set(sessionToken, { code: room.code, playerId });
        ack({ ok: true, token: sessionToken });
        broadcast(room);
        return;
      }
      const room = rooms.get(socket.data.code);
      if (!room) throw new Error("Join a room to play.");
      const id = socket.data.playerId;
      if (action === "leave") {
        leave(socket);
        ack({ ok: true });
        return;
      }
      if (action === "start") {
        startGame(room, id);
        if (room.plugin) startPluginGame(room);
      } else if (action === "color") setColor(room, id, payload.color);
      else if (action === "finish") {
        if (id !== room.host || !room.game)
          throw new Error("Only the host can end the round early.");
        finishGame(room);
      } else if (room.plugin && !["lobby"].includes(action))
        throw new Error("Unknown action.");
      else if (action === "submit") telephoneSubmit(room, id, payload.text);
      else if (action === "choose") chooseWord(room, id, payload.word);
      else if (action === "guess") guess(room, id, payload.text);
      else if (action === "stroke") addStroke(room, id, payload);
      else if (action === "canvas") editCanvas(room, id, payload.action);
      else if (action === "lobby") {
        if (id !== room.host || room.phase !== "results")
          throw new Error(
            "Only the host can return everyone to the lobby after a game.",
          );
        room.phase = "lobby";
        room.deadline = null;
        room.notice = "";
      } else throw new Error("Unknown action.");
      ack({ ok: true });
      broadcast(room);
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  });
  // Realtime input bypasses the action ack/throttle path: it is fire-and-forget
  // (volatile on the client) and only the latest value matters.
  let lastInput = 0;
  socket.on("input", (payload) => {
    const now = Date.now();
    if (now - lastInput < 15 || !payload || typeof payload !== "object") return;
    lastInput = now;
    const room = rooms.get(socket.data.code);
    if (!room?.game) return;
    try {
      plugins.get(room.mode).input(room.game, socket.data.playerId, payload);
    } catch {}
  });
  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.code);
    const player = room?.players.find((p) => p.id === socket.data.playerId);
    if (!player || player.socketId !== socket.id) return;
    player.connected = false;
    broadcast(room);
    setTimeout(() => {
      if (!player.connected) leave(socket);
    }, 30000).unref();
  });
});
setInterval(() => {
  for (const room of rooms.values()) {
    if (tick(room)) broadcast(room);
    if (Date.now() - room.updatedAt > 4 * 60 * 60 * 1000) {
      for (const [key, session] of sessions)
        if (session.code === room.code) sessions.delete(key);
      rooms.delete(room.code);
    }
  }
}, 500).unref();
// One scheduler drives every realtime room; each plugin's tickRate is honored
// with measured dt so simulations stay correct under timer jitter.
setInterval(() => {
  const now = performance.now();
  for (const room of rooms.values()) {
    if (!room.game) continue;
    const plugin = plugins.get(room.mode);
    const dt = now - room.lastTick;
    if (dt < 1000 / plugin.tickRate - 2) continue;
    room.lastTick = now;
    try {
      if (plugin.tick(room.game, dt / 1000)) {
        finishGame(room);
        broadcast(room);
        continue;
      }
      room.ticks++;
      if (room.ticks % plugin.sendEvery === 0)
        for (const p of room.players) {
          if (!p.socketId || !p.connected) continue;
          const frame = plugin.frame(room.game, p.id);
          if (frame) io.to(p.socketId).volatile.emit("frame", frame);
        }
      if (room.ticks % Math.max(1, Math.round(plugin.tickRate / 2)) === 0) {
        const board = plugin
          .leaderboard(room.game)
          .map(({ id, score, detail }) => ({
            id,
            score: Number(score) || 0,
            detail: clean(detail, 60),
          }));
        for (const p of room.players)
          if (p.socketId) io.to(p.socketId).volatile.emit("leaderboard", board);
      }
    } catch (error) {
      console.error(`Game plugin "${room.mode}" crashed:`, error);
      stopGame(room, "The game hit a snag and was stopped. Start a new round!");
      broadcast(room);
    }
  }
}, 1000 / 60).unref();
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/games", (_req, res) =>
  res.json([...plugins.values()].map((p) => p.meta)),
);
for (const plugin of plugins.values())
  app.use(
    `/plugins/${plugin.id}`,
    express.static(path.join(pluginDir, plugin.folder, "public"), {
      fallthrough: false,
    }),
  );
const dist = fileURLToPath(new URL("../dist", import.meta.url));
app.use(express.static(dist));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
http.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log(
    "Game server ready on http://localhost:" + (process.env.PORT || 3001),
  ),
);
