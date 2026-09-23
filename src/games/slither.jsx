import React, { useEffect, useRef, useState } from "react";
import { MoveRight } from "lucide-react";

const COLORS = [
  "#a38acc",
  "#ee8f67",
  "#edb948",
  "#609a7d",
  "#619ac6",
  "#db6c89",
  "#62b9ad",
  "#b38a66",
];
function Illustration() {
  return (
    <svg className="game-art" viewBox="0 0 560 245" aria-hidden="true">
      <path
        d="M70 155C95 50 210 185 275 90S440 56 468 151"
        fill="none"
        stroke="#609a7d"
        strokeWidth="35"
        strokeLinecap="round"
      />
      <circle cx="468" cy="151" r="23" fill="#609a7d" />
      <circle cx="475" cy="143" r="5" fill="#302c41" />
      <circle cx="420" cy="174" r="7" fill="#edb948" />
      <circle cx="166" cy="69" r="7" fill="#edb948" />
      <circle cx="335" cy="200" r="7" fill="#edb948" />
    </svg>
  );
}

function ColorPicker({ room, act }) {
  const color = room.players.find((player) => player.id === room.you)?.color;
  return (
    <fieldset className="snake-colors">
      <legend>Choose your snake color</legend>
      <div>
        {COLORS.map((value) => (
          <button
            key={value}
            type="button"
            className={color === value ? "chosen" : ""}
            aria-label={`Snake color ${value}`}
            aria-pressed={color === value}
            style={{ backgroundColor: value }}
            onClick={() => act("color", { color: value })}
          />
        ))}
      </div>
    </fieldset>
  );
}

function render(ctx, state, players, you, canvas) {
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f0f5ed";
  ctx.fillRect(0, 0, width, height);
  if (!state) return;
  const me = state.snakes.find((snake) => snake.id === you);
  const zoom = Math.max(0.55, Math.min(width / 740, height / 520));
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-(me?.x ?? 600), -(me?.y ?? 400));
  ctx.strokeStyle = "#dce8d8";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, state.width, state.height);
  ctx.strokeStyle = "#e4eddf";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 40; x < state.width; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.height);
  }
  for (let y = 40; y < state.height; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#e9b85e";
  for (const dot of state.food) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const snake of state.snakes) {
    if (snake.respawnAt) continue;
    const player = players.find((p) => p.id === snake.id);
    ctx.strokeStyle = player?.color || COLORS[0];
    ctx.fillStyle = ctx.strokeStyle;
    ctx.globalAlpha = snake.invulnerableUntil > Date.now() ? 0.65 : 1;
    ctx.lineWidth = 19;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(snake.x, snake.y);
    for (const point of snake.trail) ctx.lineTo(point[0], point[1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(snake.x, snake.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#302c41";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(player?.name || "Player", snake.x, snake.y - 19);
  }
  ctx.restore();
}

function Play({ room, act, socket }) {
  const canvas = useRef(null);
  const snapshot = useRef(null);
  const lastInput = useRef(0);
  const [scores, setScores] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [respawnAt, setRespawnAt] = useState(0);
  const [respawning, setRespawning] = useState(false);
  useEffect(() => {
    const onArena = (next) => {
      snapshot.current = next;
      const readyAt =
        next.snakes.find((snake) => snake.id === room.you)?.respawnAt || 0;
      setRespawnAt((current) => (current === readyAt ? current : readyAt));
      if (!readyAt) setRespawning(false);
    };
    socket.on("arena", onArena);
    const timer = setInterval(() => {
      setNow(Date.now());
      if (snapshot.current) setScores(snapshot.current.scores);
    }, 500);
    let frame;
    const draw = () => {
      const element = canvas.current;
      if (element) {
        const width = Math.round(
          element.clientWidth * Math.min(devicePixelRatio, 2),
        );
        const height = Math.round(
          element.clientHeight * Math.min(devicePixelRatio, 2),
        );
        if (element.width !== width || element.height !== height) {
          element.width = width;
          element.height = height;
        }
        render(
          element.getContext("2d"),
          snapshot.current,
          room.players,
          room.you,
          element,
        );
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      socket.off("arena", onArena);
      clearInterval(timer);
      cancelAnimationFrame(frame);
    };
  }, [room.you, room.players, socket]);
  const steer = (angle) => {
    if (
      snapshot.current?.snakes.find((snake) => snake.id === room.you)?.respawnAt
    )
      return;
    const time = performance.now();
    if (time - lastInput.current >= 50 && socket.connected) {
      lastInput.current = time;
      socket.emit("action", "steer", { angle });
    }
  };
  useEffect(() => {
    const key = (event) => {
      const directions = {
        ArrowRight: 0,
        d: 0,
        ArrowDown: Math.PI / 2,
        s: Math.PI / 2,
        ArrowLeft: Math.PI,
        a: Math.PI,
        ArrowUp: -Math.PI / 2,
        w: -Math.PI / 2,
      };
      if (directions[event.key] === undefined) return;
      event.preventDefault();
      steer(directions[event.key]);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const pointer = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - box.left - box.width / 2;
    const dy = event.clientY - box.top - box.height / 2;
    if (Math.hypot(dx, dy) > 12) steer(Math.atan2(dy, dx));
  };
  const ranked = [...room.players].sort(
    (a, b) =>
      (scores.find((s) => s.id === b.id)?.score ?? b.score) -
      (scores.find((s) => s.id === a.id)?.score ?? a.score),
  );
  return (
    <div className="snake-game">
      <div className="snake-header">
        <div>
          <h2>Snake Sprint</h2>
          <p>Steer toward the food. Avoid walls and other snakes!</p>
        </div>
        <strong role="timer">
          {Math.max(0, Math.ceil((room.deadline - now) / 1000))}s
        </strong>
      </div>
      <div className="snake-arena">
        <canvas
          ref={canvas}
          aria-label="Snake arena"
          role="img"
          onPointerMove={pointer}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pointer(event);
          }}
        />
        {respawnAt > 0 && (
          <div className="snake-death" role="dialog" aria-label="Snake crashed">
            <h3>Oops, you crashed!</h3>
            <p>Your points are safe. Jump back in when you’re ready.</p>
            <button
              className="button primary"
              disabled={now < respawnAt || respawning}
              onClick={async () => {
                setRespawning(true);
                if (!(await act("respawn"))) setRespawning(false);
              }}
            >
              {now < respawnAt
                ? `Respawn in ${Math.ceil((respawnAt - now) / 1000)}s`
                : "Respawn"}
            </button>
          </div>
        )}
      </div>
      <p className="snake-hint">
        Move your mouse, drag on touch, or use arrow / WASD keys to steer.
        Crashed? Click Respawn to jump back in.
      </p>
      <div className="snake-leaderboard" aria-label="Live leaderboard">
        <h3>Leaderboard</h3>
        <ol>
          {ranked.map((player) => (
            <li key={player.id}>
              <span
                className="snake-swatch"
                style={{ backgroundColor: player.color }}
              />
              <span>
                {player.name}
                {player.id === room.you ? " (you)" : ""}
              </span>
              <strong>
                {scores.find((s) => s.id === player.id)?.score ?? player.score}{" "}
                pts
              </strong>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default {
  id: "slither",
  Icon: MoveRight,
  Illustration,
  label: "THE SNACK CHASE",
  caption: "a little food for thought",
  name: "Snake Sprint",
  description:
    "Slither around the arena, snack on glowing food, and grow your snake. Watch out for walls and rivals!",
  players: "2–8 players",
  time: "1–2 min",
  tag: "Live arena",
  color: "green",
  minimum: 2,
  seconds: [60, 90, 120],
  rules: [
    "Gather 2–8 players, pick your snake color, and start a timed match.",
    "Steer with your mouse, touch drag, arrow keys, or WASD. Collect food to grow and earn points.",
    "Avoid walls and snake bodies. Crashes reset your size; click Respawn after a brief pause to rejoin. You keep your points. Highest score at the buzzer wins!",
  ],
  ColorPicker,
  Play,
};
