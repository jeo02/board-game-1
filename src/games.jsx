import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Bot,
  Check,
  Crown,
  Medal,
  Shuffle,
} from "lucide-react";

// Team helpers shared by the lobby, live leaderboard and results.
export const teamName = (room, team) =>
  room.meta?.teams?.names[team] ?? `Team ${team + 1}`;
export const teamColor = (room, team) => room.meta?.teams?.colors[team];
export const teamBot = (room, team) => room.bots?.find((b) => b.team === team);
export const botLabel = (room, bot) =>
  `${room.meta.bots.name} · ${
    room.meta.bots.levels.find((l) => l.value === bot.level)?.label ?? bot.level
  }`;
export const teamsReady = (room) =>
  !room.teamCount ||
  Array.from({ length: room.teamCount }, (_, t) => t).every(
    (t) =>
      teamBot(room, t) ||
      room.players.filter((p) => p.team === t).length >=
        room.meta.teams.minPlayers,
  );
// One-seat teams (like White and Black) are named after whoever sits there.
export const teamDisplayName = (room, team) => {
  if (room.meta?.teams?.maxPlayers === 1) {
    const member = room.players.find((p) => p.team === team);
    if (member) return member.name;
    if (teamBot(room, team)) return room.meta.bots.name;
  }
  return teamName(room, team);
};
// Dark or light text, whichever reads better on a team's color.
const inkOn = (hex = "#000000") => {
  const n = parseInt(hex.slice(1), 16);
  const light =
    0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return light > 160 ? "#302c41" : "#fff";
};

export function TeamPicker({ room, act }) {
  const isHost = room.you === room.host;
  const me = room.players.find((p) => p.id === room.you);
  const { min, max, minPlayers, maxPlayers, noun } = room.meta.teams;
  const capped = maxPlayers < (room.maxPlayers ?? Infinity);
  const levels = room.meta.bots?.levels ?? [];
  // Two one-seat sides (like White and Black) can only trade places.
  const swap = room.teamCount === 2 && maxPlayers === 1;
  return (
    <div className="team-picker">
      {isHost && (
        <div className="team-controls">
          {max > min && (
            <label>
              Teams
              <select
                value={room.teamCount}
                onChange={(e) =>
                  act("teams", { count: Number(e.target.value) })
                }
              >
                {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(
                  (n) => (
                    <option key={n} value={n}>
                      {n} teams
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
          <button
            type="button"
            className="button small outline"
            onClick={() => act("shuffle")}
          >
            {swap ? (
              <>
                <ArrowLeftRight size={14} /> Swap {noun}s
              </>
            ) : (
              <>
                <Shuffle size={14} /> Shuffle {noun}s
              </>
            )}
          </button>
        </div>
      )}
      <div className="team-columns">
        {Array.from({ length: room.teamCount }, (_, t) => {
          const members = room.players.filter((p) => p.team === t);
          const mine = me?.team === t;
          const bot = teamBot(room, t);
          const name = teamName(room, t);
          return (
            <section
              key={t}
              className={`team-column ${mine ? "mine" : ""}`}
              style={{
                "--team": teamColor(room, t),
                "--team-ink": inkOn(teamColor(room, t)),
              }}
              aria-label={name}
            >
              <header>
                <i />
                <strong>{name}</strong>
                <span
                  className={members.length < minPlayers && !bot ? "short" : ""}
                  title={
                    capped
                      ? `${maxPlayers} ${maxPlayers === 1 ? "seat" : "seats"}`
                      : `At least ${minPlayers} players per ${noun}`
                  }
                >
                  {bot ? 1 : members.length}
                  {capped && `/${maxPlayers}`}
                </span>
              </header>
              <ul>
                {members.map((p) => (
                  <li key={p.id} className={p.connected ? "" : "offline"}>
                    {p.name}
                    {p.id === room.you && <small> (you)</small>}
                    {p.id === room.host && <Crown size={12} />}
                  </li>
                ))}
                {bot && (
                  <li className="bot">
                    <Bot size={14} /> {botLabel(room, bot)}
                  </li>
                )}
                {!members.length && !bot && (
                  <li className="empty">No one yet</li>
                )}
              </ul>
              {bot ? (
                isHost && (
                  <div className="team-bot">
                    <select
                      aria-label={`${room.meta.bots.name} difficulty for ${name}`}
                      value={bot.level}
                      onChange={(e) =>
                        act("bot", { team: t, level: e.target.value })
                      }
                    >
                      {levels.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="team-bot-remove"
                      onClick={() => act("bot", { team: t, level: null })}
                    >
                      Remove
                    </button>
                  </div>
                )
              ) : (
                <>
                  {!mine && members.length < maxPlayers && (
                    <button
                      type="button"
                      className="team-join"
                      onClick={() => act("team", { team: t })}
                    >
                      {capped ? "Play as" : "Join"} {name}
                    </button>
                  )}
                  {isHost && levels.length > 0 && !members.length && (
                    <div className="team-bot-pick">
                      <span>
                        or play the {room.meta.bots.name.toLowerCase()}
                      </span>
                      <div>
                        {levels.map((l) => (
                          <button
                            key={l.value}
                            type="button"
                            onClick={() =>
                              act("bot", { team: t, level: l.value })
                            }
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

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
    (room.teamCount
      ? Array.from({ length: room.teamCount }, (_, team) => ({
          team,
          score: 0,
          detail: "",
        }))
      : room.players.map((p) => ({ id: p.id, score: 0, detail: "" })));
  const me = room.players.find((p) => p.id === room.you);
  const rows = source
    .map((entry) =>
      entry.team !== undefined
        ? {
            ...entry,
            id: `team-${entry.team}`,
            mine: me?.team === entry.team,
            player: {
              name: teamName(room, entry.team),
              color: teamColor(room, entry.team),
            },
            members: [
              ...room.players
                .filter((p) => p.team === entry.team)
                .map((p) => p.name),
              ...(teamBot(room, entry.team)
                ? [botLabel(room, teamBot(room, entry.team))]
                : []),
            ].join(", "),
          }
        : {
            ...entry,
            mine: entry.id === room.you,
            player: room.players.find((p) => p.id === entry.id),
          },
    )
    .filter((row) => row.player)
    .slice(0, limit);
  return (
    <ol
      className="leaderboard"
      aria-label={live ? "Live leaderboard" : "Final leaderboard"}
    >
      {rows.map(({ id, score, detail, player, mine, members }, i) => (
        <li key={id} className={mine ? "you" : ""}>
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
              {mine && (
                <small>
                  {members && room.meta.teams.maxPlayers > 1
                    ? " (your team)"
                    : " (you)"}
                </small>
              )}
            </strong>
            {members && <span>{members}</span>}
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

export function PluginStage({ room, socket, act }) {
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
      // Reliable and acknowledged, for turn-based moves that must not be
      // dropped. Resolves to true on success; errors show in the site banner.
      act(input) {
        return act("play", input);
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
