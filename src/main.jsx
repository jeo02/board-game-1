import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  Clock3,
  Copy,
  Crown,
  Dice5,
  Eraser,
  Heart,
  Link,
  LogOut,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  Undo2,
  Users,
  X,
} from "lucide-react";
import "./styles.css";

const socket = io({ auth: { token: sessionStorage.getItem("gameToken") } });
const GAMES = {
  telephone: {
    name: "Cosmic Telephone",
    label: "THE MORE LOST, THE BETTER",
    description:
      "A sentence becomes a sketch. A sketch becomes a wild guess. See how far your story travels.",
    players: "3–8 players",
    time: "10–15 min",
    tag: "A little chaotic",
    color: "purple",
    minimum: 3,
    category: "Party games",
  },
  scribble: {
    name: "Scribble Club",
    label: "BIG IDEAS. QUESTIONABLE ART.",
    description:
      "Grab a word, draw your best (or worst), and let your friends race to guess what on earth it is.",
    players: "2–8 players",
    time: "5–15 min",
    tag: "Quick thinking",
    color: "orange",
    minimum: 2,
    category: "Drawing & guessing",
  },
};
const EXTERNAL_GAMES = {
  "gartic-phone": {
    name: "Gartic Phone",
    label: "THE ORIGINAL PARTY CLASSIC",
    description:
      "Jump over to Gartic Phone for its full collection of drawing, writing, and animation modes.",
    players: "4+ players",
    time: "15–30 min",
    tag: "External game",
    color: "purple",
    category: "Party games",
    illustration: "telephone",
    caption: "continue the chaos on the official site",
    url: "https://garticphone.com/",
  },
  skribbl: {
    name: "skribbl.io",
    label: "DRAW. GUESS. REPEAT.",
    description:
      "Head to skribbl.io for classic real-time drawing and guessing in a private or public room.",
    players: "2–20 players",
    time: "10–30 min",
    tag: "External game",
    color: "orange",
    category: "Drawing & guessing",
    illustration: "scribble",
    caption: "classic drawing and guessing, one click away",
    url: "https://skribbl.io/",
  },
};
const PROMPTS = [
  "A penguin presenting a very important spreadsheet",
  "An astronaut who forgot their lunch",
  "A cat interviewing for its first job",
  "A dinosaur trying to use a tiny laptop",
  "A cactus having a really good hair day",
  "A rocket powered entirely by coffee",
];
function Illustration({ kind, small = false }) {
  return (
    <svg
      className={`game-art ${small ? "small" : ""}`}
      viewBox="0 0 560 245"
      fill="none"
      aria-hidden="true"
    >
      {kind === "telephone" ? (
        <>
          <circle cx="284" cy="132" r="111" fill="#c7b9f1" opacity=".45" />
          <path
            d="M77 141C29 105 75 35 155 73M394 172c70 43 137-20 91-71"
            stroke="#81719f"
            strokeWidth="2"
            strokeDasharray="6 8"
          />
          <g transform="rotate(-12 154 130)">
            <rect
              x="72"
              y="61"
              width="146"
              height="119"
              rx="13"
              fill="#faf8f1"
              stroke="#302c41"
              strokeWidth="3"
            />
            <path
              d="M100 89h85M100 105h63M100 122h78"
              stroke="#b0a3cb"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M118 180v22l30-22"
              fill="#faf8f1"
              stroke="#302c41"
              strokeWidth="3"
            />
            <path
              d="m163 146 10 8 19-25"
              stroke="#8e79b7"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g transform="rotate(10 385 130)">
            <rect
              x="333"
              y="62"
              width="153"
              height="128"
              rx="13"
              fill="#faf8f1"
              stroke="#302c41"
              strokeWidth="3"
            />
            <path
              d="m357 166 25-41 19 16 30-45 31 70"
              stroke="#8463ac"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="371" cy="90" r="10" fill="#f4c76c" />
            <path
              d="M423 190v21l-29-21"
              fill="#faf8f1"
              stroke="#302c41"
              strokeWidth="3"
            />
          </g>
          <g transform="rotate(18 273 131)">
            <path
              d="M247 80c0-14 10-22 26-22s26 8 26 22v45c0 14-10 24-26 24s-26-10-26-24z"
              fill="#a38acc"
              stroke="#302c41"
              strokeWidth="3"
            />
            <path
              d="M240 115v12a33 33 0 0 0 66 0v-12M273 160v22m-17 0h34"
              stroke="#302c41"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M247 88h14m-14 12h14m24-12h14m-14 12h14"
              stroke="#302c41"
              strokeWidth="3"
            />
            <circle cx="267" cy="121" r="3" fill="#302c41" />
            <circle cx="281" cy="121" r="3" fill="#302c41" />
            <path
              d="M270 132q5 5 9-1"
              stroke="#302c41"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
          <path
            d="m301 29 5 13 14 3-12 8-1 14-10-10-14 3 6-13-7-11 14 1z"
            fill="#f8d46e"
            stroke="#302c41"
            strokeWidth="2"
          />
          <path
            d="m65 192 3 8 8 3-8 3-3 8-3-8-8-3 8-3zM485 38l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"
            fill="#fff8e9"
            stroke="#302c41"
            strokeWidth="2"
          />
          <path
            d="m227 197 15 8-16 7m100-173 15 8-16 7"
            stroke="#302c41"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="280" cy="129" r="111" fill="#f4c394" opacity=".5" />
          <g transform="rotate(-8 230 130)">
            <rect
              x="116"
              y="41"
              width="213"
              height="164"
              rx="12"
              fill="#fffaf0"
              stroke="#302c41"
              strokeWidth="3"
            />
            <path
              d="M138 65h46"
              stroke="#d6cbbc"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M157 172c-13-20 2-53 20-45-3-34 18-50 34-20 17-30 38-17 30 13 34-2 48 24 22 39 4 25-18 36-33 15-11 27-40 25-42 0-16 14-31 12-31-2z"
              stroke="#dc8c5c"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="203" cy="146" r="4" fill="#302c41" />
            <circle cx="227" cy="146" r="4" fill="#302c41" />
            <path
              d="M206 159q8 8 16-1"
              stroke="#302c41"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
          <g transform="rotate(27 340 139)">
            <path
              d="M329 62h24v124l-12 25-12-25z"
              fill="#a794d1"
              stroke="#302c41"
              strokeWidth="3"
            />
            <path d="M329 81h24M341 83v99" stroke="#302c41" strokeWidth="2" />
            <path
              d="m329 186 12 25 12-25z"
              fill="#f4d8a8"
              stroke="#302c41"
              strokeWidth="3"
            />
            <path d="m336 202 5 9 5-9z" fill="#302c41" />
            <path
              d="M329 62v-9a12 12 0 0 1 24 0v9z"
              fill="#df9da3"
              stroke="#302c41"
              strokeWidth="3"
            />
          </g>
          <g transform="rotate(8 422 83)">
            <rect
              x="366"
              y="40"
              width="115"
              height="71"
              rx="22"
              fill="#edf0d4"
              stroke="#302c41"
              strokeWidth="3"
            />
            <path
              d="m390 111-8 17 29-17"
              fill="#edf0d4"
              stroke="#302c41"
              strokeWidth="3"
            />
            <text
              x="392"
              y="86"
              fill="#302c41"
              fontSize="32"
              fontFamily="Georgia"
              fontWeight="bold"
            >
              ?!
            </text>
            <path
              d="m442 66 8 8-8 8"
              stroke="#302c41"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
          <path
            d="m81 116 4 12 12 4-12 4-4 12-4-12-12-4 12-4zM450 165l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"
            fill="#fff7da"
            stroke="#302c41"
            strokeWidth="2"
          />
          <path
            d="m81 67 7 7m-20 3 9 2m374 142 7 7m-20 3 9 2"
            stroke="#302c41"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
function Logo({ onClick }) {
  return (
    <button
      className="brand"
      onClick={onClick}
      aria-label="Early Career Game Night home"
    >
      <span className="brand-icon">
        <Dice5 size={27} />
      </span>
      <span>
        early career<span className="brand-bottom">GAME NIGHT</span>
      </span>
    </button>
  );
}
function Modal({ title, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function App() {
  const [room, setRoom] = useState(null);
  const [modal, setModal] = useState(null);
  const [game, setGame] = useState("telephone");
  const [name, setName] = useState(localStorage.getItem("playerName") || "");
  const [code, setCode] = useState(
    new URLSearchParams(location.search).get("room") || "",
  );
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(socket.connected);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("All games");
  const [toast, setToast] = useState("");
  useEffect(() => {
    const onRoom = (next) => {
      setRoom(next);
      setModal((current) =>
        ["create", "join"].includes(current) ? null : current,
      );
      setError("");
    };
    const onStroke = (stroke) =>
      setRoom((current) =>
        current
          ? { ...current, strokes: [...(current.strokes || []), stroke] }
          : current,
      );
    const onLeft = () => {
      setRoom(null);
      sessionStorage.removeItem("gameToken");
      socket.auth.token = null;
    };
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("room", onRoom);
    socket.on("stroke", onStroke);
    socket.on("left", onLeft);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (code) setModal("join");
    return () => {
      socket.off("room", onRoom);
      socket.off("stroke", onStroke);
      socket.off("left", onLeft);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function act(action, payload = {}) {
    setError("");
    if (!socket.connected) {
      setError(
        "Reconnecting to the game server. Please try again in a moment.",
      );
      return false;
    }
    return new Promise((resolve) =>
      socket.timeout(5000).emit("action", action, payload, (err, response) => {
        if (err || !response?.ok) {
          setError(
            err
              ? "The server did not respond. Please try again."
              : response.error,
          );
          resolve(false);
        } else {
          if (response.token) {
            sessionStorage.setItem("gameToken", response.token);
            socket.auth.token = response.token;
            localStorage.setItem("playerName", name);
          }
          resolve(true);
        }
      }),
    );
  }
  const open = (type, mode = game) => {
    setError("");
    setGame(mode);
    setModal(type);
  };
  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast("Copied! Send it to your crew.");
    } catch {
      setError("Clipboard unavailable. Select and copy the room code above.");
    }
  };
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Logo
            onClick={() =>
              room
                ? open("leave")
                : window.scrollTo({ top: 0, behavior: "smooth" })
            }
          />
          <nav aria-label="Main navigation">
            <a
              className={!room ? "active" : ""}
              href="#games"
              onClick={(e) => {
                if (room) {
                  e.preventDefault();
                  open("leave");
                }
              }}
            >
              The games
            </a>
            <button onClick={() => open("how")}>
              How it works <ArrowUpRight size={14} />
            </button>
          </nav>
          <button
            className="button small outline"
            onClick={() => open(room ? "invite" : "join")}
          >
            <Users size={16} />
            {room ? "Invite friends" : "Join a room"}
          </button>
        </div>
      </header>
      {!connected && (
        <div className="connection-banner" role="status">
          Connecting to the game server…
        </div>
      )}
      {room ? (
        <Room room={room} act={act} open={open} copy={copy} />
      ) : (
        <main className="home">
          <section className="hero">
            <div className="eyebrow">
              <span className="status-dot" /> OFF THE CLOCK. ON FOR GAME NIGHT.
            </div>
            <h1>
              Less small talk.
              <br />
              More{" "}
              <span className="fun-word">
                game on.
                <svg viewBox="0 0 370 18" aria-hidden="true">
                  <path
                    d="M3 12C97 0 240 0 365 8M22 17c110-8 241-7 319-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="hero-spark">✳</span>
            </h1>
            <p>
              Your next favorite team tradition starts here.
              <br />A few friends, a little friendly chaos, and absolutely no
              drawing skills required.
            </p>
            <div className="hero-actions">
              <a href="#games" className="button primary">
                Find your game <ArrowRight size={18} />
              </a>
              <button className="text-button" onClick={() => open("join")}>
                Have a room code? <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="hero-foot">
              <div className="mini-avatars">
                <span>J</span>
                <span>A</span>
                <span>M</span>
                <span>K</span>
              </div>
              <span>For work friends. And soon-to-be friends.</span>
            </div>
            <div className="hero-doodle doodle-left" aria-hidden="true">
              <span>
                take a little
                <br />
                play break
              </span>
              <svg viewBox="0 0 100 65">
                <path
                  d="M12 9c-7 48 65 43 52 8C56-3 28 25 86 46m-19-1 20 2-7-19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="floating-dice" aria-hidden="true">
              <Dice5 size={73} strokeWidth={1.4} />
              <span>✦</span>
            </div>
          </section>
          <section id="games" className="games-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow muted">
                  THE GOOD KIND OF SCREEN TIME
                </div>
                <h2>
                  Pick your kind of chaos<span>.</span>
                </h2>
              </div>
              <span className="collection-count">
                04 games · endless inside jokes
              </span>
            </div>
            <div className="filter-row">
              <div className="filters" aria-label="Filter games">
                {["All games", "Drawing & guessing", "Party games"].map((f) => (
                  <button
                    key={f}
                    className={filter === f ? "selected" : ""}
                    onClick={() => setFilter(f)}
                  >
                    {f === "All games" && <Dice5 size={15} />} {f}
                  </button>
                ))}
              </div>
              <span className="no-download">
                <Check size={14} /> No downloads. Just good company.
              </span>
            </div>
            <div className="game-grid">
              {[
                ...Object.entries(GAMES).map(([key, info]) => ({
                  key,
                  info,
                  external: false,
                })),
                ...Object.entries(EXTERNAL_GAMES).map(([key, info]) => ({
                  key,
                  info,
                  external: true,
                })),
              ]
                .filter(
                  ({ info }) =>
                    filter === "All games" || info.category === filter,
                )
                .map(({ key, info, external }, index) => (
                  <article className={`game-card ${info.color}`} key={key}>
                    <div className="art-panel">
                      <div className="art-badges">
                        <span>
                          <span className="tiny-dot" />{" "}
                          {external
                            ? info.label
                            : key === "telephone"
                              ? "THE ICEBREAKER"
                              : "THE CROWD FAVORITE"}
                        </span>
                        <span className="number">0{index + 1}</span>
                      </div>
                      <Illustration kind={info.illustration || key} />
                      <span className="art-caption">
                        {external
                          ? info.caption
                          : key === "telephone"
                            ? "a perfectly imperfect chain reaction"
                            : "bad drawings make great memories"}
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="card-title-row">
                        <h3>{info.name}</h3>
                        <span className={`game-tag ${info.color}`}>
                          {info.tag}
                        </span>
                      </div>
                      <p>{info.description}</p>
                      <div className="game-meta">
                        <span>
                          <Users size={15} />
                          {info.players}
                        </span>
                        <span>
                          <Clock3 size={15} />
                          {info.time}
                        </span>
                        <span>
                          <Pencil size={14} />
                          Drawing
                        </span>
                      </div>
                      <div className="card-actions">
                        {external ? (
                          <a
                            className="button dark"
                            href={info.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Play on {info.name} <ArrowUpRight size={17} />
                          </a>
                        ) : (
                          <>
                            <button
                              className="button dark"
                              onClick={() => open("create", key)}
                            >
                              Create a room <ArrowRight size={17} />
                            </button>
                            <button
                              className="text-button"
                              onClick={() => open("rules", key)}
                            >
                              How to play <ArrowUpRight size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </section>
          <section className="how-strip">
            <div className="strip-intro">
              <span className="strip-icon">
                <Sparkles size={26} />
              </span>
              <h3>
                Good times.
                <br />
                Zero logistics.
              </h3>
            </div>
            <div>
              <span className="step-number">01</span>
              <h4>Pick a game</h4>
              <p>
                Follow your competitive spirit.
                <br />
                Or your artistic delusions.
              </p>
            </div>
            <div>
              <span className="step-number">02</span>
              <h4>Round up your people</h4>
              <p>
                Share your room code.
                <br />
                No accounts, no awkward setup.
              </p>
            </div>
            <div>
              <span className="step-number">03</span>
              <h4>Make an inside joke</h4>
              <p>
                Play a round. Laugh a lot.
                <br />
                Immediately play another.
              </p>
            </div>
          </section>
          <section className="bottom-note">
            <span>✳</span>
            <p>
              A little play goes a long way.
              <br />
              <strong>Make room for it.</strong>
            </p>
            <span className="handwritten">See you in the lobby ↗</span>
          </section>
        </main>
      )}
      <footer>
        <span>© {new Date().getFullYear()} Early Career Game Night</span>
        <span>
          Made for connection. And questionable drawings. <Heart size={13} />
        </span>
        <button onClick={() => open("how")}>
          House rules <ArrowUpRight size={13} />
        </button>
      </footer>
      {error && !modal && (
        <div className="error-toast" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {toast && !modal && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === "create"
              ? "Make a little room for fun."
              : modal === "join"
                ? "Your crew is waiting."
                : modal === "rules"
                  ? GAMES[game].name
                  : modal === "leave"
                    ? "Heading out?"
                    : modal === "invite"
                      ? "Round up your people."
                      : "A good night starts here."
          }
          onClose={() => {
            setModal(null);
            setError("");
          }}
        >
          {["create", "join"].includes(modal) ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const data = Object.fromEntries(new FormData(e.currentTarget));
                await act(modal, { ...data, name, mode: game, code });
                setBusy(false);
              }}
            >
              <p className="modal-description">
                {modal === "create"
                  ? "You bring the friends. We’ll bring the happy chaos."
                  : "Enter a room code from your host to pull up a chair."}
              </p>
              <label>
                Your name
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={20}
                  placeholder="What should we call you?"
                  autoComplete="given-name"
                />
              </label>
              {modal === "join" ? (
                <label>
                  Room code
                  <input
                    className="code-input"
                    value={code}
                    onChange={(e) =>
                      setCode(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                      )
                    }
                    required
                    minLength={6}
                    maxLength={6}
                    placeholder="ABC123"
                  />
                </label>
              ) : (
                <>
                  <fieldset className="game-picker">
                    <legend>Your game</legend>
                    <div className="mode-options">
                      {Object.entries(GAMES).map(([key, info]) => (
                        <button
                          type="button"
                          key={key}
                          aria-pressed={game === key}
                          className={game === key ? "selected" : ""}
                          onClick={() => setGame(key)}
                        >
                          {key === "telephone" ? (
                            <MessageCircle size={20} />
                          ) : (
                            <Pencil size={20} />
                          )}
                          <span>
                            {info.name}
                            <small>{info.players}</small>
                          </span>
                          {game === key && <Check size={17} />}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label>
                    Room name <span className="optional">(optional)</span>
                    <input
                      name="title"
                      maxLength={40}
                      placeholder="The game night crew"
                    />
                  </label>
                  {game === "scribble" && (
                    <div className="form-row">
                      <label>
                        Rounds
                        <select name="rounds" defaultValue="2">
                          <option value="1">1 round</option>
                          <option value="2">2 rounds</option>
                          <option value="3">3 rounds</option>
                        </select>
                      </label>
                      <label>
                        Drawing time
                        <select name="seconds" defaultValue="60">
                          <option value="30">30 seconds</option>
                          <option value="60">60 seconds</option>
                          <option value="90">90 seconds</option>
                        </select>
                      </label>
                    </div>
                  )}
                </>
              )}
              <button
                className="button primary full"
                disabled={busy || !connected}
              >
                {busy
                  ? "Pulling up a chair…"
                  : modal === "create"
                    ? "Create room"
                    : "Join room"}
                <ArrowRight size={18} />
              </button>
              <p className="form-note">
                <Link size={13} /> Private room. No account needed.
              </p>
            </form>
          ) : modal === "leave" ? (
            <>
              <p className="modal-description">
                Leaving during a game returns the crew to the lobby so they can
                start a fresh round.
              </p>
              <div className="modal-actions">
                <button
                  className="button outline"
                  onClick={() => setModal(null)}
                >
                  Keep playing
                </button>
                <button
                  className="button dark"
                  onClick={async () => {
                    if (await act("leave")) setModal(null);
                  }}
                >
                  Leave room
                </button>
              </div>
            </>
          ) : modal === "invite" ? (
            <>
              <p className="modal-description">
                Send your friends this code. They can enter it with “Join a
                room.”
              </p>
              <div className="invite-code">{room.code}</div>
              <button
                className="button primary full"
                onClick={() => copy(`${location.origin}/?room=${room.code}`)}
              >
                <Copy size={17} /> Copy invite link
              </button>
            </>
          ) : (
            <>
              <p className="modal-description">
                {modal === "rules"
                  ? GAMES[game].description
                  : "A browser, a few friends, and a willingness to be a little silly. That’s everything you need."}
              </p>
              <ol className="rules-list">
                {(modal === "rules"
                  ? game === "telephone"
                    ? [
                        "Gather 3–8 players. Everyone starts by writing a funny sentence.",
                        "Draw the sentence you receive, then describe the drawing passed to you. Keep the previous turn a secret!",
                        "Once every story has made the rounds, reveal the entire chain together. No points. Just plot twists.",
                      ]
                    : [
                        "Gather 2–8 players and choose your number of rounds and drawing time.",
                        "Take turns picking a secret word and drawing it. Everyone else types their guesses before time runs out.",
                        "Faster guesses earn more points. Artists get points for each correct guess. The highest score wins!",
                      ]
                  : [
                      "Create a room, pick a game, and share the six-character code with your friends.",
                      "Join on separate devices or browsers. Keep a call open if you’re playing remotely.",
                      "Be kind, keep it friendly, and embrace the terrible drawings. There’s no wrong way to have fun.",
                    ]
                ).map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ol>
              <div className="friendly-note">
                <Heart size={18} /> The only skill you need is not taking
                yourself too seriously.
              </div>
              {modal === "rules" && !room && (
                <button
                  className="button primary full"
                  onClick={() => open("create", game)}
                >
                  Let’s play <ArrowRight size={18} />
                </button>
              )}
            </>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {toast && (
            <p className="inline-success" role="status">
              {toast}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}

function Room({ room, act, open, copy }) {
  const info = GAMES[room.mode];
  const isHost = room.you === room.host;
  const ready =
    room.players.length >= info.minimum &&
    room.players.every((p) => p.connected);
  return (
    <main className="room-page">
      <div className="room-top">
        <button className="text-button" onClick={() => open("leave")}>
          <ChevronLeft size={17} /> All games
        </button>
        <span className={`game-tag ${info.color}`}>{info.name}</span>
        <button className="text-button" onClick={() => open("leave")}>
          <LogOut size={15} /> Leave
        </button>
      </div>
      <div className="room-heading">
        <div>
          <div className="eyebrow muted">YOUR LITTLE CORNER OF GAME NIGHT</div>
          <h1>{room.title}</h1>
        </div>
        <button
          className="room-code"
          onClick={() => copy(room.code)}
          aria-label={`Copy room code ${room.code}`}
        >
          <span>ROOM CODE</span>
          <strong>{room.code}</strong>
          <Copy size={18} />
        </button>
      </div>
      {room.notice && room.phase === "lobby" && (
        <div className="notice">{room.notice}</div>
      )}
      {room.phase === "lobby" ? (
        <div className="lobby-grid">
          <section className={`lobby-feature ${info.color}`}>
            <Illustration kind={room.mode} />
            <div className="eyebrow">THE CREW’S COMING TOGETHER</div>
            <h2>Pull up a chair.</h2>
            <p>{info.description}</p>
            <div className="game-meta">
              <span>
                <Users size={16} />
                {info.players}
              </span>
              <span>
                <Clock3 size={16} />
                {room.mode === "scribble"
                  ? `${room.rounds} rounds · ${room.seconds}s turns`
                  : "Everyone writes, draws & guesses"}
              </span>
            </div>
            <button
              className="text-button"
              onClick={() => open("rules", room.mode)}
            >
              A quick refresher on the rules <ArrowUpRight size={15} />
            </button>
          </section>
          <section className="players-panel">
            <div className="panel-title">
              <h3>The lovely people</h3>
              <span>{room.players.length}/8</span>
            </div>
            <PlayerList room={room} />
            <button
              className="invite-button"
              onClick={() => copy(`${location.origin}/?room=${room.code}`)}
            >
              <Plus size={18} /> Invite a friend <Link size={15} />
            </button>
            <div className="lobby-start">
              <span className="status-dot" />
              <p>
                {ready
                  ? "The gang’s here. Let the chaos begin."
                  : `Waiting for ${Math.max(0, info.minimum - room.players.length)} more ${info.minimum - room.players.length === 1 ? "player" : "players"}${room.players.some((p) => !p.connected) ? " and everyone to reconnect" : ""}…`}
              </p>
            </div>
            {isHost ? (
              <button
                className="button primary full"
                disabled={!ready}
                onClick={() => act("start")}
              >
                Start game <Play size={16} />
              </button>
            ) : (
              <div className="waiting-host">Your host will start the game.</div>
            )}
            <p className="form-note">
              Friends join on their own device or browser.
            </p>
          </section>
        </div>
      ) : room.phase === "results" ? (
        <Results room={room} act={act} />
      ) : (
        <div className="play-grid">
          <section className="play-panel">
            {room.mode === "telephone" ? (
              <Telephone room={room} act={act} />
            ) : (
              <Scribble room={room} act={act} />
            )}
          </section>
          <aside className="players-panel in-game">
            <div className="panel-title">
              <h3>{room.mode === "telephone" ? "The crew" : "Scoreboard"}</h3>
              <Users size={18} />
            </div>
            <PlayerList room={room} scores={room.mode === "scribble"} />
            {room.mode === "telephone" ? (
              <div className="friendly-note">
                <Sparkles size={20} />
                <span>
                  A little mystery makes a great reveal. Keep your work to
                  yourself!
                </span>
              </div>
            ) : (
              <GuessBox room={room} act={act} />
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
function PlayerList({ room, scores = false }) {
  return (
    <ul className="player-list">
      {[...room.players]
        .sort((a, b) => (scores ? b.score - a.score : 0))
        .map((p, i) => (
          <li key={p.id}>
            <span className={`avatar avatar-${room.players.indexOf(p) % 5}`}>
              {p.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>
                {p.name}
                {p.id === room.you && <small> (you)</small>}
              </strong>
              <span>
                {!p.connected
                  ? "Reconnecting…"
                  : p.id === room.drawer &&
                      room.mode === "scribble" &&
                      room.phase !== "lobby"
                    ? "The artist"
                    : room.submitted?.includes(p.id)
                      ? "Ready for the next one"
                      : p.id === room.host
                        ? "Host with the most"
                        : "Here for a good time"}
              </span>
            </div>
            {scores ? (
              <b className="score">
                {p.score}
                <small>pts</small>
              </b>
            ) : room.submitted?.includes(p.id) ? (
              <Check size={18} color="#538568" />
            ) : p.id === room.host ? (
              <Crown size={17} />
            ) : (
              <span className={`player-dot ${p.connected ? "" : "offline"}`} />
            )}
          </li>
        ))}
    </ul>
  );
}
function Telephone({ room, act }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setText("");
    setBusy(false);
  }, [room.round]);
  const submitted = room.submitted.includes(room.you);
  if (submitted)
    return (
      <div className="waiting-screen">
        <span className="big-icon">
          <Check size={42} />
        </span>
        <div className="eyebrow">PASSED ALONG. PLOT THICKENING.</div>
        <h2>Your masterpiece is in.</h2>
        <p>
          Waiting for the rest of the crew to finish.
          <br />
          {room.submitted.length} of {room.players.length} players are ready.
        </p>
        <div className="progress-track">
          <div
            style={{
              width: `${(room.submitted.length / room.players.length) * 100}%`,
            }}
          />
        </div>
      </div>
    );
  return (
    <>
      <div className="play-title">
        <span className="eyebrow">
          CHAPTER {room.round + 1} OF {room.players.length}
        </span>
        <span className="game-tag purple">
          {room.phase === "prompt"
            ? "Write"
            : room.phase === "draw"
              ? "Draw"
              : "Guess"}
        </span>
      </div>
      <h2>
        {room.phase === "prompt"
          ? "Every great mess starts with a sentence."
          : room.phase === "draw"
            ? "Give this sentence a little life."
            : "What on earth is happening here?"}
      </h2>
      <p className="play-subtitle">
        {room.phase === "prompt"
          ? "Dream up something funny for the next person to draw."
          : room.phase === "draw"
            ? "No letters or words. Just your wonderfully questionable art."
            : "Describe this drawing. Your guess becomes the next person’s prompt."}
      </p>
      {room.phase === "draw" ? (
        <>
          <blockquote>{room.previous?.text}</blockquote>
          <DrawingCanvas
            strokes={room.strokes}
            editable
            onStroke={(s) => act("stroke", s)}
            onEdit={(action) => act("canvas", { action })}
          />
        </>
      ) : (
        <>
          {room.phase === "describe" && (
            <DrawingCanvas strokes={room.previous?.strokes || []} />
          )}
          <label className="prompt-label">
            {room.phase === "prompt"
              ? "Your opening sentence"
              : "Your best guess"}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={160}
              placeholder={
                room.phase === "prompt"
                  ? "A penguin presenting a very important spreadsheet…"
                  : "I’m pretty sure that’s…"
              }
              autoFocus
            />
            <span className="character-count">{text.length}/160</span>
          </label>
          {room.phase === "prompt" && (
            <button
              className="text-button"
              onClick={() =>
                setText(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])
              }
            >
              <Shuffle size={15} /> Give me a little inspiration
            </button>
          )}
        </>
      )}
      <div className="submit-row">
        <span>Keep it kind. Make it weird.</span>
        <button
          className="button primary"
          disabled={
            busy ||
            (room.phase !== "draw" && !text.trim()) ||
            (room.phase === "draw" && !room.strokes.length)
          }
          onClick={async () => {
            setBusy(true);
            await act("submit", { text });
            setBusy(false);
          }}
        >
          Pass it on <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}
function Scribble({ room, act }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const drawer = room.players.find((p) => p.id === room.drawer);
  const youDraw = room.you === room.drawer;
  return (
    <>
      <div className="play-title">
        <span className="eyebrow">
          ROUND {room.round + 1} OF {room.rounds} · ARTIST{" "}
          {(room.turn % room.players.length) + 1} OF {room.players.length}
        </span>
        <span
          className={`timer ${room.deadline - now < 11000 ? "urgent" : ""}`}
        >
          <Clock3 size={17} />
          {Math.max(0, Math.ceil((room.deadline - now) / 1000))}s
        </span>
      </div>
      {room.phase === "choose" ? (
        <div className="choose-screen">
          <span className="big-icon">
            <Pencil size={38} />
          </span>
          <h2>
            {youDraw
              ? "Pick your next masterpiece."
              : `${drawer?.name} is picking a word.`}
          </h2>
          <p>
            {youDraw
              ? "Choose one word. The timer starts when you pick."
              : "Get your guessing fingers ready."}
          </p>
          {youDraw && (
            <div className="word-choices">
              {room.choices?.map((word) => (
                <button
                  className="button outline"
                  key={word}
                  onClick={() => act("choose", { word })}
                >
                  {word}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="word-header">
            <div>
              <h2>
                {room.phase === "reveal"
                  ? "The word was…"
                  : youDraw
                    ? "You’re the artist!"
                    : `${drawer?.name} is drawing`}
              </h2>
              <p>
                {room.phase === "reveal"
                  ? "A little applause for our artist. Next turn coming up!"
                  : youDraw
                    ? "Draw the secret word. No letters, no hints!"
                    : "Type your guesses in the chat. Faster guesses earn more points."}
              </p>
            </div>
            <strong className="secret-word">{room.word || room.hint}</strong>
          </div>
          <DrawingCanvas
            strokes={room.strokes}
            editable={youDraw && room.phase === "drawing"}
            onStroke={(s) => act("stroke", s)}
            onEdit={(action) => act("canvas", { action })}
          />
          {room.phase === "reveal" && (
            <div className="round-result">
              <Sparkles size={19} />
              {room.guessed.length
                ? `${room.guessed.length} ${room.guessed.length === 1 ? "person cracked" : "people cracked"} the masterpiece!`
                : "A true abstract masterpiece. You’ll get the next one!"}
            </div>
          )}
        </>
      )}
    </>
  );
}
function GuessBox({ room, act }) {
  const [guess, setGuess] = useState("");
  const messages = useRef(null);
  useEffect(() => {
    messages.current?.scrollTo({ top: messages.current.scrollHeight });
  }, [room.messages]);
  const canGuess =
    room.phase === "drawing" &&
    room.you !== room.drawer &&
    !room.guessed?.includes(room.you);
  return (
    <div className="guess-box">
      <h4>
        <MessageCircle size={16} /> The guessing corner
      </h4>
      <div className="messages" ref={messages} aria-live="polite">
        {!room.messages.length && (
          <p className="empty-chat">
            Wild guesses welcome.
            <br />
            You’ve got this. Probably.
          </p>
        )}
        {room.messages.map((m, i) => (
          <p className={m.correct ? "correct-message" : ""} key={i}>
            <strong>{m.name}</strong> {m.text}
          </p>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act("guess", { text: guess })) setGuess("");
        }}
      >
        <input
          aria-label="Your guess"
          placeholder={
            room.guessed?.includes(room.you)
              ? "You got it! Nice work."
              : room.you === room.drawer
                ? "Your art does the talking"
                : "Type your guess…"
          }
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          maxLength={80}
          disabled={!canGuess}
        />
        <button aria-label="Send guess" disabled={!canGuess || !guess.trim()}>
          <ArrowRight size={19} />
        </button>
      </form>
    </div>
  );
}
const COLORS = [
  "#302c41",
  "#a38acc",
  "#ee8f67",
  "#edb948",
  "#609a7d",
  "#619ac6",
  "#db6c89",
  "#ffffff",
];
function paint(ctx, stroke, width, height) {
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = (stroke.width * width) / 800;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  stroke.points.forEach(([x, y], i) =>
    i ? ctx.lineTo(x * width, y * height) : ctx.moveTo(x * width, y * height),
  );
  if (stroke.points.length === 1) {
    ctx.arc(
      stroke.points[0][0] * width,
      stroke.points[0][1] * height,
      ctx.lineWidth / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  } else ctx.stroke();
}
function paintLatestSegment(ctx, stroke, width, height) {
  paint(ctx, { ...stroke, points: stroke.points.slice(-2) }, width, height);
}
function DrawingCanvas({ strokes = [], editable = false, onStroke, onEdit }) {
  const canvas = useRef(null);
  const current = useRef(null);
  const renderedStrokes = useRef(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(7);
  const redraw = () => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 440);
    strokes.forEach((s) => paint(ctx, s, 800, 440));
    if (current.current) paint(ctx, current.current, 800, 440);
  };
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const previous = renderedStrokes.current;
    const appended =
      previous &&
      strokes.length >= previous.length &&
      previous.every((stroke, index) => stroke === strokes[index]);
    if (appended)
      strokes
        .slice(previous.length)
        .forEach((stroke) => paint(ctx, stroke, 800, 440));
    else redraw();
    renderedStrokes.current = strokes;
  }, [strokes]);
  const point = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    ];
  };
  const finish = () => {
    if (current.current) {
      const stroke = current.current;
      current.current = null;
      onStroke?.(stroke);
    }
  };
  return (
    <div className="drawing-area">
      <canvas
        ref={canvas}
        width={800}
        height={440}
        aria-label={editable ? "Drawing canvas" : "Drawing to guess"}
        role="img"
        className={editable ? "editable" : ""}
        onPointerDown={(e) => {
          if (!editable) return;
          e.preventDefault();
          canvas.current.setPointerCapture(e.pointerId);
          current.current = { color, width, points: [point(e)] };
          paintLatestSegment(
            canvas.current.getContext("2d"),
            current.current,
            800,
            440,
          );
        }}
        onPointerMove={(e) => {
          if (current.current && editable) {
            current.current.points.push(point(e));
            paintLatestSegment(
              canvas.current.getContext("2d"),
              current.current,
              800,
              440,
            );
            if (current.current.points.length >= 990) finish();
          }
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      {editable && (
        <div className="canvas-toolbar">
          <div className="color-palette" aria-label="Brush colors">
            {COLORS.map((c, i) => (
              <button
                key={c}
                aria-label={
                  [
                    "Ink",
                    "Lavender",
                    "Orange",
                    "Yellow",
                    "Green",
                    "Blue",
                    "Pink",
                    "Eraser",
                  ][i]
                }
                aria-pressed={color === c}
                className={`color-swatch ${color === c ? "chosen" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              >
                {c === "#ffffff" ? (
                  <Eraser size={13} color="#302c41" />
                ) : (
                  color === c && <Check size={14} color="white" />
                )}
              </button>
            ))}
          </div>
          <select
            aria-label="Brush size"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          >
            <option value={3}>Fine</option>
            <option value={7}>Medium</option>
            <option value={14}>Bold</option>
            <option value={24}>Extra bold</option>
          </select>
          <div className="canvas-tools">
            <button
              className="icon-button"
              aria-label="Undo last stroke"
              onClick={() => onEdit("undo")}
            >
              <Undo2 size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Clear canvas"
              onClick={() => onEdit("clear")}
            >
              <RotateCcw size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function Results({ room, act }) {
  const [chain, setChain] = useState(0);
  const winner = [...room.players].sort((a, b) => b.score - a.score)[0];
  const winners = room.players.filter((p) => p.score === winner.score);
  return (
    <section className="results">
      <div className="results-heading">
        <span className="big-icon">
          {room.mode === "telephone" ? (
            <Sparkles size={37} />
          ) : (
            <Trophy size={37} />
          )}
        </span>
        <div className="eyebrow">THAT’S ONE FOR THE GROUP CHAT</div>
        <h2>
          {room.mode === "telephone"
            ? "Well, that took a turn."
            : winners.length > 1
              ? "Great minds draw alike. It’s a tie!"
              : `${winner.name} takes the crown!`}
        </h2>
        <p>
          {room.mode === "telephone"
            ? "From innocent sentence to beautiful nonsense. Explore every story below."
            : "A round of applause for the art, the guesses, and the glorious chaos."}
        </p>
      </div>
      {room.mode === "telephone" ? (
        <>
          <div className="chain-tabs">
            {room.chains.map((c, i) => (
              <button
                className={`button ${chain === i ? "dark" : "outline"}`}
                key={i}
                onClick={() => setChain(i)}
              >
                {c.owner}’s story
              </button>
            ))}
          </div>
          <div className="chain-entries">
            {room.chains[chain]?.entries.map((entry, i) => (
              <article className="chain-entry" key={i}>
                <div className="entry-heading">
                  <span className="step-number">0{i + 1}</span>
                  <strong>{entry.author}</strong>
                  <span>
                    {entry.type === "text"
                      ? i === 0
                        ? "started with"
                        : "guessed"
                      : "drew this"}
                  </span>
                </div>
                {entry.type === "text" ? (
                  <blockquote>{entry.text}</blockquote>
                ) : (
                  <DrawingCanvas strokes={entry.strokes} />
                )}
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="final-scores">
          <PlayerList room={room} scores />
        </div>
      )}
      <div className="results-actions">
        {room.you === room.host ? (
          <>
            <button className="button primary" onClick={() => act("start")}>
              <RotateCcw size={17} /> One more game
            </button>
            <button className="button outline" onClick={() => act("lobby")}>
              Back to lobby
            </button>
          </>
        ) : (
          <p>Your host can start another game. Same crew, fresh chaos.</p>
        )}
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
