import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createRoom,
  addPlayer,
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
import { games } from "./games/index.js";

const app = express();
const http = createServer(app);
const io = new Server(http, { maxHttpBufferSize: 100000 });
const rooms = new Map();
const sessions = new Map();
function broadcast(room) {
  room.updatedAt = Date.now();
  for (const p of room.players)
    if (p.socketId)
      io.to(p.socketId).emit(
        "room",
        viewFor(
          {
            ...room,
            players: room.players.map(({ socketId, ...safe }) => safe),
          },
          p.id,
        ),
      );
}
function leave(socket) {
  const room = rooms.get(socket.data.code);
  if (!room) return;
  socket.leave(room.code);
  room.players = room.players.filter((p) => p.id !== socket.data.playerId);
  sessions.delete(socket.data.token);
  socket.data = {};
  socket.emit("left");
  if (!room.players.length) return void rooms.delete(room.code);
  if (!room.players.some((p) => p.id === room.host))
    room.host = room.players[0].id;
  if (!["lobby", "results"].includes(room.phase)) {
    room.phase = "lobby";
    room.deadline = null;
    delete room.arena;
    room.notice = "A player left. Gather your crew and start a fresh game.";
  }
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
      socket.join(room.code);
      p.socketId = socket.id;
      p.connected = true;
      broadcast(room);
    }
  }
  let lastAction = 0;
  let lastSteer = 0;
  socket.on("action", (action, payload = {}, ack = () => {}) => {
    try {
      if (!payload || typeof payload !== "object")
        throw new Error("Invalid request.");
      const now = Date.now();
      const plugin = games.get(rooms.get(socket.data.code)?.mode);
      if (plugin?.fastActions?.includes(action)) {
        if (now - lastSteer < 40) return;
        lastSteer = now;
      } else {
        if (now - lastAction < 20) throw new Error("One moment — try again.");
        lastAction = now;
      }
      if (["create", "join"].includes(action)) {
        if (socket.data.code) throw new Error("Leave your current room first.");
        const room =
          action === "create"
            ? createRoom(
                payload.title,
                payload.mode,
                Number(payload.rounds),
                Number(payload.seconds),
              )
            : rooms.get(clean(payload.code, 6).toUpperCase());
        if (!room)
          throw new Error(
            "Room not found. Double-check the six-character code.",
          );
        const playerId = randomUUID();
        addPlayer(room, playerId, payload.name);
        rooms.set(room.code, room);
        room.players.at(-1).socketId = socket.id;
        const sessionToken = randomUUID();
        socket.data = { code: room.code, playerId, token: sessionToken };
        socket.join(room.code);
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
      if (action === "start") startGame(room, id);
      else if (action === "lobby") {
        if (id !== room.host || room.phase !== "results")
          throw new Error(
            "Only the host can return everyone to the lobby after a game.",
          );
        room.phase = "lobby";
        room.deadline = null;
        room.notice = "";
      } else if (plugin) {
        const changed = plugin.action(room, id, action, payload);
        ack({ ok: true });
        if (changed) broadcast(room);
        return;
      } else if (action === "submit") telephoneSubmit(room, id, payload.text);
      else if (action === "choose") chooseWord(room, id, payload.word);
      else if (action === "guess") guess(room, id, payload.text);
      else if (action === "stroke") addStroke(room, id, payload);
      else if (action === "canvas") editCanvas(room, id, payload.action);
      else throw new Error("Unknown action.");
      ack({ ok: true });
      broadcast(room);
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
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
    if (!games.has(room.mode) && tick(room)) broadcast(room);
    if (Date.now() - room.updatedAt > 4 * 60 * 60 * 1000) {
      for (const [key, session] of sessions)
        if (session.code === room.code) sessions.delete(key);
      rooms.delete(room.code);
    }
  }
}, 500).unref();
let arenaFrame = 0;
setInterval(() => {
  arenaFrame++;
  for (const room of rooms.values()) {
    const plugin = games.get(room.mode);
    if (!plugin || room.phase !== "arena") continue;
    if (plugin.tick(room)) {
      broadcast(room);
      continue;
    }
    if (room.phase === "arena" && arenaFrame % 2 === 0) {
      io.to(room.code).volatile.emit("arena", plugin.view(room));
    }
  }
}, 50).unref();
app.get("/api/health", (_req, res) => res.json({ ok: true }));
const dist = fileURLToPath(new URL("../dist", import.meta.url));
app.use(express.static(dist));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
http.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log(
    "Game server ready on http://localhost:" + (process.env.PORT || 3001),
  ),
);
