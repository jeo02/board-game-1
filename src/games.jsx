import React, { useEffect, useRef, useState } from "react";
import { Check, Crown, Medal } from "lucide-react";

export function ColorPicker({ room, act, label = "Pick your color" }) {
  const me = room.players.find((p) => p.id === room.you);
  const names = room.meta?.colorNames ?? [];
  return (
    <div className="color-picker">
      <div className="color-picker-head">
        <span>{label}</span>
        <svg viewBox="0 0 90 26" aria-hidden="true" className="color-preview">
          <path
            d="M6 17c12-12 22-12 32-2s22 10 34-2"
            stroke={me?.color}
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="76" cy="12" r="7" fill={me?.color} />
          <circle cx="78" cy="10" r="2.4" fill="#fff" />
        </svg>
      </div>
      <div className="color-options" role="radiogroup" aria-label={label}>
        {room.colors.map((color, i) => {
          const owner = room.players.find((p) => p.color === color);
          const mine = owner?.id === room.you;
          const name = names[i] ?? `Color ${i + 1}`;
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={mine}
              aria-label={
                owner && !mine ? `${name}, taken by ${owner.name}` : name
              }
              title={owner && !mine ? `${owner.name} has this one` : name}
              disabled={!!owner && !mine}
              className={`color-option ${mine ? "chosen" : ""}`}
              style={{ "--swatch": color }}
              onClick={() => !mine && act("color", { color })}
            >
              {mine ? (
                <Check size={15} />
              ) : (
                owner && <span>{owner.name.slice(0, 1).toUpperCase()}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Leaderboard({
  room,
  socket,
  entries,
  live = false,
  unit = "pts",
  limit = 8,
}) {
  const [board, setBoard] = useState(null);
  useEffect(() => {
    if (!live) return;
    socket.on("leaderboard", setBoard);
    return () => socket.off("leaderboard", setBoard);
  }, [live, socket]);
  const source =
    (live ? board : entries) ??
    room.players.map((p) => ({ id: p.id, score: 0, detail: "" }));
  const rows = source
    .map((entry) => ({
      ...entry,
      player: room.players.find((p) => p.id === entry.id),
    }))
    .filter((row) => row.player)
    .slice(0, limit);
  return (
    <ol
      className="leaderboard"
      aria-label={live ? "Live leaderboard" : "Final leaderboard"}
    >
      {rows.map(({ id, score, detail, player }, i) => (
        <li key={id} className={id === room.you ? "you" : ""}>
          <span className={`rank rank-${i + 1}`}>
            {i === 0 ? (
              <Crown size={14} />
            ) : i < 3 ? (
              <Medal size={14} />
            ) : (
              i + 1
            )}
          </span>
          <span
            className="leader-swatch"
            style={{ background: player.color ?? "#d9cef3" }}
          />
          <div>
            <strong>
              {player.name}
              {id === room.you && <small> (you)</small>}
            </strong>
            {detail && <span>{detail}</span>}
          </div>
          <b className="score">
            {score}
            <small>{unit}</small>
          </b>
        </li>
      ))}
    </ol>
  );
}

export function PluginStage({ room, socket }) {
  const mountPoint = useRef(null);
  const roomRef = useRef(room);
  const instance = useRef(null);
  const [status, setStatus] = useState("loading");
  roomRef.current = room;
  useEffect(() => {
    let cancelled = false;
    const handlers = new Set();
    const onFrame = (frame) => handlers.forEach((handler) => handler(frame));
    socket.on("frame", onFrame);
    const api = {
      you: room.you,
      getRoom: () => roomRef.current,
      onFrame(handler) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      // Volatile: if the network is congested, stale input is dropped rather
      // than queued, so the latest steering always wins.
      send(input) {
        socket.volatile.emit("input", input);
      },
    };
    import(/* @vite-ignore */ room.meta.client)
      .then((mod) => {
        if (cancelled) return;
        instance.current = mod.mount(mountPoint.current, api);
        setStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      socket.off("frame", onFrame);
      instance.current?.destroy?.();
      instance.current = null;
    };
  }, [room.mode, room.meta.client, socket]);
  useEffect(() => {
    instance.current?.update?.(room);
  }, [room]);
  return (
    <div className="plugin-stage">
      {status !== "ready" && (
        <p className="plugin-status" role="status">
          {status === "loading"
            ? "Warming up the arena…"
            : "We couldn’t load this game. Refresh to try again."}
        </p>
      )}
      <div ref={mountPoint} />
    </div>
  );
}
