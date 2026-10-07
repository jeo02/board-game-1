// Name Droppers client. Loaded on demand by the host site via dynamic
// import(); renders plain DOM from the per-player JSON frames and sends moves
// through host.act() (reliable and acknowledged) rather than volatile input.

const STYLE_ID = "name-droppers-styles";
const CSS = `
.nd-stage{--nd-accent:#d06a4b;--nd-ink:#302c3e;display:flex;flex-direction:column;gap:14px;min-height:min(68vh,620px);padding:6px;font-family:"DM Sans",sans-serif;color:var(--nd-ink)}
.nd-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.nd-round{flex:1;min-width:180px}
.nd-round small{display:block;font-size:10px;font-weight:700;letter-spacing:1.2px;color:#a24b30}
.nd-round strong{font:800 20px Manrope,sans-serif;letter-spacing:-.5px}
.nd-chip{background:#f6f1ea;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:650;color:#6f6778;white-space:nowrap}
.nd-timer{font:800 22px Manrope,sans-serif;min-width:74px;text-align:center;padding:6px 12px;border-radius:12px;background:#302c3e;color:#fff;font-variant-numeric:tabular-nums}
.nd-timer:empty{display:none}
.nd-timer.hurry{background:#d0493b;animation:nd-pulse 1s infinite}
@keyframes nd-pulse{50%{transform:scale(1.06)}}
.nd-body{flex:1;display:flex;flex-direction:column;gap:14px}
.nd-panel{background:#fbf6f0;border:1px solid #f0e3d8;border-radius:14px;padding:22px;text-align:center}
.nd-panel h2{font:800 26px Manrope,sans-serif;letter-spacing:-.8px;margin:4px 0 8px}
.nd-panel p{margin:6px auto;max-width:520px;color:#6f6778;line-height:1.5}
.nd-eyebrow{font-size:10px;font-weight:700;letter-spacing:1.4px;color:#a24b30;text-transform:uppercase}
.nd-rule{display:inline-block;margin-top:10px;padding:10px 14px;border-radius:10px;background:#fff;border:1px dashed #e2b9a6;font-size:13px;color:#5b4a52;max-width:520px}
.nd-rule b{color:#a24b30}
.nd-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px}
.nd-btn{border:0;border-radius:999px;padding:12px 22px;font:750 15px Manrope,sans-serif;background:#302c3e;color:#fff;cursor:pointer;transition:transform .12s,opacity .12s}
.nd-btn:hover:not(:disabled){transform:translateY(-1px)}
.nd-btn:disabled{opacity:.5;cursor:default}
.nd-btn:focus-visible{outline:3px solid #f4c27a;outline-offset:2px}
.nd-btn.go{background:#4f9a74;font-size:18px;padding:16px 34px}
.nd-btn.skip{background:#fff;color:#302c3e;box-shadow:inset 0 0 0 2px #302c3e}
.nd-btn.ghost{background:transparent;color:#6f6778;box-shadow:inset 0 0 0 1px #d9d2cc;font-size:13px;padding:9px 16px}
.nd-btn.accent{background:var(--nd-accent)}
.nd-card{position:relative;background:#fff;border:1px solid #eadfd6;border-radius:18px;padding:22px 20px 54px;box-shadow:0 10px 30px #a24b301a;text-align:center;max-width:380px;margin:0 auto;width:100%}
.nd-card h3{font:800 24px Manrope,sans-serif;letter-spacing:-.6px;margin:4px 0 12px;overflow-wrap:anywhere}
.nd-card p{font-size:13px;line-height:1.5;color:#6f6778;margin:0 0 14px}
.nd-card .cat{font-size:10px;font-weight:700;letter-spacing:1.4px;color:#a59aa8;text-transform:uppercase;border-top:1px dashed #e4dad2;padding-top:10px}
.nd-points{position:absolute;left:50%;bottom:-16px;transform:translateX(-50%);width:50px;height:50px;border-radius:50%;background:var(--nd-accent);color:#fff;display:grid;place-content:center;font:800 18px/1 Manrope,sans-serif;box-shadow:0 0 0 4px #fff}
.nd-points small{font-size:7px;letter-spacing:.8px;font-weight:700}
.nd-hand{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
.nd-pick{all:unset;box-sizing:border-box;cursor:pointer;background:#fff;border:2px solid #eee4dc;border-radius:14px;padding:12px 12px 10px;display:flex;flex-direction:column;gap:6px;transition:border-color .12s,transform .12s;position:relative}
.nd-pick:hover:not([aria-disabled=true]){transform:translateY(-2px)}
.nd-pick:focus-visible{outline:3px solid #f4c27a;outline-offset:2px}
.nd-pick[aria-pressed=true]{border-color:var(--nd-accent);background:#fff6f1}
.nd-pick[aria-disabled=true]{cursor:default;opacity:.55}
.nd-pick strong{font:800 15px Manrope,sans-serif;padding-right:28px}
.nd-pick span{font-size:11.5px;line-height:1.4;color:#77737e}
.nd-pick em{font-style:normal;font-size:9px;font-weight:700;letter-spacing:1.2px;color:#a59aa8;text-transform:uppercase;margin-top:auto}
.nd-pick b{position:absolute;top:10px;right:10px;width:24px;height:24px;border-radius:50%;background:#f3ebe4;display:grid;place-items:center;font-size:12px;color:#a24b30}
.nd-pick[aria-pressed=true] b{background:var(--nd-accent);color:#fff}
.nd-draftbar{position:sticky;bottom:0;display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fffefa;border:1px solid #efe5dc;border-radius:14px;padding:12px 14px;box-shadow:0 -6px 20px #0000000d}
.nd-draftbar p{flex:1;margin:0;font-size:13px;color:#6f6778;min-width:160px}
.nd-draftbar strong{color:var(--nd-ink)}
.nd-guess{font:800 34px Manrope,sans-serif;letter-spacing:-1px;margin:8px 0}
.nd-claims{list-style:none;padding:0;margin:12px auto 0;max-width:520px;display:flex;flex-direction:column;gap:8px;text-align:left}
.nd-claims li{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #efe5dc;border-radius:10px;padding:9px 12px}
.nd-claims li.rejected{opacity:.6}
.nd-claims li.rejected strong{text-decoration:line-through}
.nd-claims li div{flex:1;min-width:0}
.nd-claims strong{display:block;font-size:14px}
.nd-claims small{font-size:11px;color:#9d91a6}
.nd-claims .pts{font:800 14px Manrope,sans-serif;color:#a24b30}
.nd-teams{display:flex;gap:10px;flex-wrap:wrap}
.nd-team{flex:1;min-width:150px;border-radius:12px;padding:10px 12px;background:color-mix(in srgb,var(--team) 12%,white);border:2px solid transparent}
.nd-team.active{border-color:var(--team)}
.nd-team header{display:flex;align-items:center;gap:8px;font:800 13px Manrope,sans-serif}
.nd-team header i{width:10px;height:10px;border-radius:50%;background:var(--team)}
.nd-team header span{flex:1}
.nd-team header b{font-size:18px}
.nd-team p{margin:4px 0 0;font-size:11px;color:#6f6778;line-height:1.4;overflow-wrap:anywhere}
.nd-team p .giver{font-weight:800;color:var(--nd-ink)}
.nd-table{margin:14px auto 0;border-collapse:collapse;font-size:13px}
.nd-table th,.nd-table td{padding:7px 12px;border-bottom:1px solid #efe5dc;text-align:right}
.nd-table th:first-child,.nd-table td:first-child{text-align:left}
.nd-keys{font-size:11px;color:#a59aa8;margin-top:12px}
@media (max-width:760px){.nd-panel{padding:16px}.nd-panel h2{font-size:22px}.nd-hand{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}.nd-keys{display:none}}
`;

const escape = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let audio = null;
function beep() {
  try {
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.18, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.6);
  } catch {}
}

export function mount(el, host) {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.append(style);
  }
  const stage = document.createElement("div");
  stage.className = "nd-stage";
  stage.innerHTML = `
    <div class="nd-bar">
      <div class="nd-round"><small data-k="eyebrow"></small><strong data-k="title">Shuffling the deck…</strong></div>
      <span class="nd-chip" data-k="left" hidden></span>
      <span class="nd-timer" data-k="timer" aria-live="off"></span>
    </div>
    <div class="nd-body" aria-live="polite"></div>
    <div class="nd-teams"></div>`;
  el.append(stage);
  const parts = Object.fromEntries(
    [...stage.querySelectorAll("[data-k]")].map((n) => [n.dataset.k, n]),
  );
  const body = stage.querySelector(".nd-body");
  const teamsEl = stage.querySelector(".nd-teams");

  let f = null;
  let deadline = 0;
  let pending = false;
  let lastHtml = "";
  let lastTeams = "";
  let raf = 0;

  const nameOf = (id) =>
    host.getRoom().players.find((p) => p.id === id)?.name ?? "Someone";
  const teamOf = (index) => f?.teams[index];
  const teamLabel = (index) => {
    const t = teamOf(index);
    return t
      ? `<span style="color:${t.color};font-weight:800">${escape(t.name)}</span>`
      : "";
  };
  const ruleBox = (round = f.round) => {
    const rule = round === f.round ? f.rule : null;
    return rule
      ? `<div class="nd-rule"><b>Round ${round + 1}: ${escape(rule.title)}.</b> ${escape(rule.rule)}</div>`
      : "";
  };
  const cardHtml = (card) => `
    <article class="nd-card" aria-label="Card: ${escape(card.name)}">
      <div class="nd-eyebrow">The name is</div>
      <h3>${escape(card.name)}</h3>
      <p>${escape(card.description)}</p>
      <div class="cat">${escape(card.category)}</div>
      <div class="nd-points">${card.points}<small>${card.points === 1 ? "POINT" : "POINTS"}</small></div>
    </article>`;
  const button = (label, payload, cls = "", disabled = false) =>
    `<button type="button" class="nd-btn ${cls}" data-act='${escape(JSON.stringify(payload))}' ${disabled || pending ? "disabled" : ""}>${label}</button>`;

  function draftView() {
    const d = f.draft;
    if (!d.hand.length)
      return `<div class="nd-panel"><div class="nd-eyebrow">The draft</div><h2>Your crew is building the deck.</h2><p>You joined mid-draft, so sit tight. You’ll guess every one of these soon. ${d.lockedCount}/${d.playerCount} players locked in.</p></div>`;
    const cards = d.hand
      .map((card) => {
        const chosen = d.picks.includes(card.id);
        const full = !chosen && d.picks.length >= d.pick;
        return `<button type="button" class="nd-pick" data-act='${escape(JSON.stringify({ type: "pick", card: card.id }))}' aria-pressed="${chosen}" aria-disabled="${d.locked || full}">
          <b>${chosen ? "✓" : card.points}</b>
          <strong>${escape(card.name)}</strong>
          <span>${escape(card.description)}</span>
          <em>${escape(card.category)} · ${card.points} pt${card.points === 1 ? "" : "s"}</em>
        </button>`;
      })
      .join("");
    return `
      <div class="nd-panel" style="text-align:left;padding:16px 18px">
        <div class="nd-eyebrow">The draft · keep it secret</div>
        <h2 style="margin-bottom:2px">Keep ${d.pick} names you like.</h2>
        <p style="margin:0;max-width:none">Your picks are shuffled into one deck that every team plays for the whole game. Pick names you think your friends will know.</p>
      </div>
      <div class="nd-hand">${cards}</div>
      <div class="nd-draftbar">
        <p><strong>${d.picks.length}/${d.pick}</strong> picked · ${d.lockedCount}/${d.playerCount} players locked in${d.locked ? " · waiting for the rest of the crew" : ""}</p>
        ${button(d.locked ? "Change my picks" : "Lock in my picks", { type: "lock" }, d.locked ? "ghost" : "accent", !d.locked && d.picks.length !== d.pick)}
      </div>`;
  }

  function readyView() {
    const giver = nameOf(f.giver);
    const you = f.you.role;
    const late = f.timeLeft <= 0;
    let lead;
    if (you === "giver")
      lead = `<div class="nd-eyebrow">You’re up</div><h2>Give clues to ${teamLabel(f.activeTeam)}</h2><p>You’ll have ${f.seconds} seconds. Hit Start when your team is ready to shout.</p>`;
    else if (you === "guesser")
      lead = `<div class="nd-eyebrow">Your team is up</div><h2>${escape(giver)} is giving clues.</h2><p>Get ready to shout your guesses. There’s no limit!</p>`;
    else
      lead = `<div class="nd-eyebrow">Next up: ${teamLabel(f.activeTeam)}</div><h2>${escape(giver)} is giving clues.</h2><p>You’ll see each card, so keep them honest.</p>`;
    const actions =
      you === "giver"
        ? button("Start my turn", { type: "start" }, "go") +
          button("Pass to a teammate", { type: "pass" }, "ghost")
        : late
          ? button(
              `${escape(giver)} isn’t here? Skip them`,
              { type: "pass" },
              "ghost",
            )
          : "";
    return `<div class="nd-panel">${lead}${ruleBox()}<div class="nd-actions">${actions}</div></div>`;
  }

  function claimsList(editable) {
    const claims = f.turn?.claims ?? [];
    if (!claims.length) return "";
    return `<ul class="nd-claims">${claims
      .map(
        (c) => `<li class="${c.rejected ? "rejected" : ""}">
          <div><strong>${escape(c.name)}</strong>${c.rejected ? `<small>Doesn’t count${c.by ? ` (called by ${escape(c.by)})` : ""}</small>` : c.by ? `<small>Reinstated by ${escape(c.by)}</small>` : ""}</div>
          <span class="pts">+${c.points}</span>
          ${editable ? button(c.rejected ? "Count it" : "Doesn’t count", { type: "dispute", card: c.id }, "ghost") : ""}
        </li>`,
      )
      .join("")}</ul>`;
  }

  function turnView() {
    const role = f.you.role;
    const got = f.turn.claims.length;
    const counter = `<p><strong>${got}</strong> ${got === 1 ? "card" : "cards"} guessed this turn${f.turn.skipped ? ` · ${f.turn.skipped} skipped` : ""}</p>`;
    if (role === "giver")
      return `
        ${f.card ? cardHtml(f.card) : ""}
        <div class="nd-panel" style="padding:16px">
          <div class="nd-actions" style="margin-top:6px">
            ${button("Got it!", { type: "got" }, "go")}
            ${button("Skip", { type: "skip" }, "skip")}
            ${f.turn.canUndo ? button("Undo last", { type: "undo" }, "ghost") : ""}
          </div>
          ${counter}
          ${ruleBox()}
          <div class="nd-keys">Shortcuts: G or Enter = got it · S = skip</div>
        </div>`;
    if (role === "guesser")
      return `<div class="nd-panel">
        <div class="nd-eyebrow">${escape(nameOf(f.giver))} is giving clues</div>
        <div class="nd-guess">Shout your guesses!</div>
        ${counter}${ruleBox()}${claimsList(false)}</div>`;
    return `${f.card ? cardHtml(f.card) : ""}
      <div class="nd-panel" style="padding:16px">
        <div class="nd-eyebrow">${escape(nameOf(f.giver))} is giving clues to ${teamLabel(f.activeTeam)}</div>
        ${counter}<p>Keep them honest, and save the arguments for after the buzzer.</p>${ruleBox()}
      </div>`;
  }

  function reviewView() {
    const points = f.turn.claims
      .filter((c) => !c.rejected)
      .reduce((sum, c) => sum + c.points, 0);
    const canContinue = f.you.role === "giver" || f.nextGiver === host.you;
    return `<div class="nd-panel">
      <div class="nd-eyebrow">Time! ${teamLabel(f.activeTeam)} scored ${points} ${points === 1 ? "point" : "points"}</div>
      <h2>${f.turn.claims.length ? "Any disagreements?" : "No cards this time."}</h2>
      <p>${f.turn.claims.length ? "Anyone can flag a card that shouldn’t count. It goes back in the deck." : "It happens to the best of us."} ${f.cardsLeft} ${f.cardsLeft === 1 ? "card" : "cards"} left this round.</p>
      ${claimsList(true)}
      <div class="nd-actions">${canContinue ? button("Looks good, next turn", { type: "continue" }, "accent") : `<p>${escape(nameOf(f.nextGiver ?? f.giver))} moves things along, or we continue automatically.</p>`}</div>
    </div>`;
  }

  function breakView() {
    const rows = [...f.teams]
      .sort((a, b) => b.total - a.total)
      .map(
        (t) =>
          `<tr><td>${teamLabel(t.index)}</td>${t.rounds.map((n) => `<td>${n}</td>`).join("")}<td><strong>${t.total}</strong></td></tr>`,
      )
      .join("");
    const next = f.round + 1;
    return `<div class="nd-panel">
      <div class="nd-eyebrow">Round ${f.round + 1} complete</div>
      <h2>The deck is empty. Reshuffle!</h2>
      <table class="nd-table"><thead><tr><th>Team</th>${f.teams[0].rounds.map((_, i) => `<th>R${i + 1}</th>`).join("")}<th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <p>Next: <strong>Round ${next + 1}</strong>, the same ${f.deckSize} names with stricter clues. The team with the lowest score goes first.</p>
      <div class="nd-actions">${button(`Start round ${next + 1}`, { type: "continue" }, "accent")}</div>
    </div>`;
  }

  function teamsView() {
    return f.teams
      .map((t) => {
        const members = t.members
          .map((id) => {
            const name = escape(nameOf(id)) + (id === host.you ? " (you)" : "");
            return id === f.giver &&
              ["ready", "turn", "review"].includes(f.phase)
              ? `<span class="giver">🎤 ${name}</span>`
              : name;
          })
          .join(", ");
        const active =
          t.index === f.activeTeam && !["draft", "break"].includes(f.phase);
        return `<section class="nd-team ${active ? "active" : ""}" style="--team:${t.color}">
          <header><i></i><span>${escape(t.name)}</span><b>${t.total}</b></header>
          <p>${members || "No players"}</p>
        </section>`;
      })
      .join("");
  }

  function render() {
    if (!f) return;
    const ROUND_LABEL = `ROUND ${f.round + 1} OF ${f.rounds}`;
    const heads = {
      draft: ["THE DRAFT", "Build the deck"],
      ready: [ROUND_LABEL, f.rule.title],
      turn: [ROUND_LABEL, f.rule.title],
      review: [ROUND_LABEL, "Turn review"],
      break: [ROUND_LABEL, "Round complete"],
      over: ["THAT’S A WRAP", "Tallying the scores…"],
    };
    const [eyebrow, title] = heads[f.phase] ?? heads.over;
    parts.eyebrow.textContent = eyebrow;
    parts.title.textContent = title;
    const showLeft = ["ready", "turn", "review"].includes(f.phase);
    parts.left.hidden = !showLeft;
    parts.left.textContent = `${f.cardsLeft}/${f.deckSize} cards left`;
    const html =
      f.phase === "draft"
        ? draftView()
        : f.phase === "ready"
          ? readyView()
          : f.phase === "turn"
            ? turnView()
            : f.phase === "review"
              ? reviewView()
              : f.phase === "break"
                ? breakView()
                : `<div class="nd-panel"><h2>That’s the game!</h2><p>Adding up the points…</p></div>`;
    if (html !== lastHtml) {
      const focused = document.activeElement?.closest?.(".nd-body [data-act]");
      const focusKey = focused?.dataset.act;
      lastHtml = html;
      body.innerHTML = html;
      if (focusKey)
        [...body.querySelectorAll("[data-act]")]
          .find((n) => n.dataset.act === focusKey)
          ?.focus({ preventScroll: true });
    }
    const teams = teamsView();
    if (teams !== lastTeams) {
      lastTeams = teams;
      teamsEl.innerHTML = teams;
    }
  }

  function tickTimer() {
    raf = requestAnimationFrame(tickTimer);
    if (!f) return;
    const timed = ["draft", "turn", "review", "break"].includes(f.phase);
    const left = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    const text = timed
      ? left >= 60
        ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`
        : `${left}s`
      : "";
    if (parts.timer.textContent !== text) parts.timer.textContent = text;
    parts.timer.classList.toggle("hurry", f.phase === "turn" && left <= 10);
  }

  async function send(payload) {
    if (pending) return;
    pending = true;
    lastHtml = "";
    render();
    try {
      await host.act(payload);
    } finally {
      pending = false;
      lastHtml = "";
      render();
    }
  }

  const onClick = (e) => {
    const target = e.target.closest("[data-act]");
    if (
      !target ||
      target.disabled ||
      target.getAttribute("aria-disabled") === "true"
    )
      return;
    send(JSON.parse(target.dataset.act));
  };
  const onKey = (e) => {
    if (f?.phase !== "turn" || f.you.role !== "giver" || e.repeat) return;
    if (e.target.closest?.("input, textarea, select")) return;
    const key = e.key.toLowerCase();
    if (key === "g" || (key === "enter" && !e.target.closest?.("button"))) {
      e.preventDefault();
      send({ type: "got" });
    } else if (key === "s") {
      e.preventDefault();
      send({ type: "skip" });
    }
  };
  stage.addEventListener("click", onClick);
  window.addEventListener("keydown", onKey);

  const offFrame = host.onFrame((next) => {
    if (!next || typeof next !== "object" || !next.phase) return;
    if (f?.phase === "turn" && next.phase === "review") beep();
    f = next;
    deadline = performance.now() + next.timeLeft * 1000;
    render();
  });
  raf = requestAnimationFrame(tickTimer);

  return {
    update() {
      lastTeams = "";
      render();
    },
    destroy() {
      cancelAnimationFrame(raf);
      offFrame();
      stage.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      stage.remove();
    },
  };
}
