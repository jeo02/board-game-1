const STYLE_ID = "jeopardy-night-styles";
const CSS = `
.j-stage{min-height:min(72vh,720px);padding:8px;color:#fff;font-family:"DM Sans",sans-serif;background:radial-gradient(circle at 50% 0,#283bc4,#080d45 62%);border-radius:12px}
.j-top{display:flex;align-items:center;gap:12px;padding:9px 12px}.j-title{flex:1}.j-title small{display:block;color:#f6d75b;font-size:9px;font-weight:800;letter-spacing:1.5px}.j-title strong{font:800 21px Manrope,sans-serif}.j-timer{min-width:70px;text-align:center;padding:7px 10px;border-radius:8px;background:#05082b;color:#f6d75b;font:800 19px Manrope,sans-serif;font-variant-numeric:tabular-nums}.j-timer:empty{display:none}.j-status{font-size:11px;color:#c7d0ff}
.j-board{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;padding:5px;background:#05082b}.j-category,.j-cell{min-width:0;border:1px solid #ffffff20;background:linear-gradient(145deg,#172cb1,#071d82);color:#fff;text-align:center;text-transform:uppercase}.j-category{display:grid;place-items:center;min-height:66px;padding:6px;font:800 clamp(8px,1.35vw,14px)/1.15 Manrope,sans-serif;text-shadow:1px 2px #000}.j-cell{min-height:70px;font:800 clamp(15px,2.5vw,29px) Manrope,sans-serif;color:#f6d75b;text-shadow:2px 2px #000}.j-cell:not(:disabled):hover{filter:brightness(1.25)}.j-cell.used{color:transparent;background:#07145d}.j-cell:disabled{cursor:default}
.j-clue{display:flex;min-height:385px;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px;background:linear-gradient(145deg,#1730bd,#071b7f);border:5px solid #05082b}.j-clue .category{color:#f6d75b;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase}.j-clue h2{max-width:850px;margin:22px auto;font:750 clamp(22px,4vw,42px)/1.28 Manrope,sans-serif;text-transform:uppercase;text-shadow:2px 3px #000}.j-dd{font:900 clamp(36px,7vw,78px)/1 Manrope,sans-serif;color:#f6d75b;letter-spacing:-2px;text-shadow:3px 4px #000}.j-answer{color:#f6d75b;font:800 23px Manrope,sans-serif}.j-result{font-size:15px}.j-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px}.j-btn{border:2px solid #f6d75b;border-radius:999px;padding:12px 24px;background:#f6d75b;color:#08104f;font:800 15px Manrope,sans-serif}.j-btn.alt{background:transparent;color:#fff}.j-btn:disabled{opacity:.45}.j-form{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;width:min(560px,100%);margin-top:20px}.j-form input{flex:1;min-width:180px;border:2px solid #90a0ff;border-radius:9px;padding:12px 14px;background:#fff;color:#17152b}.j-note{font-size:11px;color:#c7d0ff;margin-top:12px}
.j-podiums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px}.j-podium{min-width:0;padding:10px;border:2px solid #ffffff25;border-radius:6px;background:#0b176b;text-align:center}.j-podium.active{border-color:#f6d75b}.j-podium.buzzed{background:#8b261e}.j-podium strong,.j-podium span{display:block;overflow-wrap:anywhere}.j-podium strong{font:800 13px Manrope,sans-serif}.j-podium span{margin-top:4px;color:#f6d75b;font:800 20px Manrope,sans-serif}.j-podium small{font-size:9px;color:#bec8ff;text-transform:uppercase}
.j-final-reveals{display:grid;gap:8px;width:min(650px,100%);margin-top:18px}.j-final-row{display:grid;grid-template-columns:1fr 2fr auto;gap:10px;padding:10px;border:1px solid #ffffff2b;background:#05082b;text-align:left}.j-final-row.good{border-color:#67d78f}.j-final-row.bad{border-color:#e56f64}.j-credit{display:block;padding:2px 10px 8px;text-align:center;color:#95a4ee;font-size:8px}.j-credit:hover{color:#fff}
@media(max-width:700px){.j-stage{padding:3px}.j-board{gap:2px}.j-category{min-height:55px;font-size:7px}.j-cell{min-height:50px;font-size:14px}.j-clue{min-height:340px;padding:16px}.j-podiums{gap:3px}.j-podium{padding:7px 3px}.j-podium span{font-size:15px}}
`;
const escape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function mount(el, host) {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.append(style);
  }
  const stage = document.createElement("div");
  stage.className = "j-stage";
  el.append(stage);
  let frame = null;
  let deadline = 0;
  let timer = 0;
  let pending = false;

  const nameOf = (id) =>
    frame?.players.find((player) => player.id === id)?.name ?? "Contestant";
  const button = (label, payload, cls = "", disabled = false) =>
    `<button class="j-btn ${cls}" type="button" data-action='${escape(JSON.stringify(payload))}' ${disabled || pending ? "disabled" : ""}>${label}</button>`;
  const podiums = () =>
    `<div class="j-podiums">${frame.players
      .sort((a, b) => a.seat - b.seat)
      .map(
        (
          player,
        ) => `<div class="j-podium ${frame.selector === player.id ? "active" : ""} ${frame.responder === player.id ? "buzzed" : ""}">
          <small>${escape(player.podium)} podium${player.id === host.you ? " · you" : ""}</small>
          <strong>${escape(player.name)}</strong><span>$${player.score}</span>
        </div>`,
      )
      .join("")}</div>`;
  const shell = (body, status = "") => `
    <div class="j-top"><div class="j-title"><small>${escape(frame.roundName)}</small><strong>Jeopardy Night</strong></div><span class="j-status">${status}</span><span class="j-timer"></span></div>
    ${body}${podiums()}<a class="j-credit" href="https://opentdb.com/" target="_blank" rel="noreferrer">Trivia adapted from Open Trivia DB · CC BY-SA 4.0</a>`;
  const answerForm = (type, placeholder) => `
    <form class="j-form" data-form="${type}">
      <input name="answer" maxlength="100" autocomplete="off" placeholder="${placeholder}" aria-label="${placeholder}" required autofocus>
      <button class="j-btn" ${pending ? "disabled" : ""}>Lock response</button>
    </form><div class="j-note">Remember to respond in the form of a question.</div>`;
  const wagerForm = (type, min, max) => `
    <form class="j-form" data-form="${type}">
      <input name="amount" type="number" min="${min}" max="${max}" step="1" value="${min}" required aria-label="Wager amount">
      <button class="j-btn" ${pending ? "disabled" : ""}>Lock wager</button>
    </form><div class="j-note">Allowed wager: $${min} to $${max}.</div>`;

  function boardView() {
    const canChoose = frame.selector === host.you;
    const ordered = [];
    for (let row = 0; row < 6; row++)
      for (let column = 0; column < 6; column++)
        ordered.push(
          row === 0
            ? `<div class="j-category">${escape(frame.categories[column])}</div>`
            : frame.board[column][row - 1]
              ? `<button class="j-cell ${frame.board[column][row - 1].used ? "used" : ""}" data-action='${escape(JSON.stringify({ type: "select", cell: frame.board[column][row - 1].id }))}' ${frame.board[column][row - 1].used || !canChoose || pending ? "disabled" : ""}>${frame.board[column][row - 1].used ? "—" : `$${frame.board[column][row - 1].value}`}</button>`
              : "",
        );
    return shell(
      `<div class="j-board">${ordered.join("")}</div>`,
      canChoose
        ? "Choose a clue"
        : `${escape(nameOf(frame.selector))} controls the board`,
    );
  }

  function clueView() {
    const clue = frame.current;
    const attempted = frame.attempted.includes(host.you);
    const canBuzz =
      frame.phase === "clue" && !attempted && !frame.responder && !pending;
    let content = `<div class="category">${escape(clue.category)} · $${clue.value}</div>`;
    if (frame.phase === "daily-wager")
      content += `<div class="j-dd">DAILY DOUBLE</div>${
        frame.responder === host.you
          ? wagerForm(
              "wager",
              5,
              Math.max(frame.round === 0 ? 1000 : 2000, frame.you.score),
            )
          : `<p>${escape(nameOf(frame.responder))} is making a wager.</p>`
      }`;
    else {
      content += `<h2>${escape(clue.clue)}</h2>`;
      if (frame.phase === "answer")
        content +=
          frame.responder === host.you
            ? answerForm("answer", "What is…?")
            : `<p>${escape(nameOf(frame.responder))} buzzed first.</p>`;
      else if (frame.phase === "clue")
        content += `<div class="j-actions">${button(
          attempted ? "Already answered" : "BUZZ IN",
          { type: "buzz" },
          "",
          !canBuzz,
        )}</div>`;
      else if (frame.phase === "reveal")
        content += `<div class="j-answer">Correct response: What is ${escape(clue.answer)}?</div>
          <p class="j-result">${escape(frame.result?.message)}${
            frame.result?.response
              ? ` ${escape(nameOf(frame.result.player))} said “${escape(frame.result.response)}.”`
              : ""
          }</p>
          <div class="j-actions">${
            frame.selector === host.you
              ? button("Back to the board", { type: "continue" })
              : `<span class="j-note">${escape(nameOf(frame.selector))} selects next.</span>`
          }</div>`;
    }
    return shell(`<div class="j-clue">${content}</div>`);
  }

  function finalView() {
    const final = frame.final;
    const eligible = frame.you.finalist;
    let content = `<div class="category">Final Jeopardy · ${escape(final.category)}</div>`;
    if (frame.phase === "final-wager") {
      content += `<h2>Make your secret wager.</h2>`;
      content += !eligible
        ? `<p>You need a positive score to play Final Jeopardy.</p>`
        : frame.you.wagered
          ? `<p>Your wager is locked. Waiting for the other contestants.</p>`
          : wagerForm("final-wager", 0, frame.you.score);
    } else if (frame.phase === "final-clue") {
      content += `<h2>${escape(final.clue)}</h2>`;
      content += !eligible
        ? `<p>Watch the finalists submit their responses.</p>`
        : frame.you.answered
          ? `<p>Your response is locked.</p>`
          : answerForm("final-answer", "Who is…?");
    } else {
      content += `<h2>${escape(final.clue)}</h2><div class="j-answer">Correct response: Who is ${escape(final.answer)}?</div>
        <div class="j-final-reveals">${final.reveals
          .map(
            (entry) =>
              `<div class="j-final-row ${entry.correct ? "good" : "bad"}"><strong>${escape(nameOf(entry.id))}</strong><span>${escape(entry.answer || "No response")}</span><b>${entry.correct ? "+" : "−"}$${entry.wager}</b></div>`,
          )
          .join("")}</div>
        <div class="j-actions">${button("Show final scores", { type: "continue" })}</div>`;
    }
    return shell(`<div class="j-clue">${content}</div>`);
  }

  function render() {
    if (!frame) return;
    deadline = performance.now() + frame.timeLeft * 1000;
    if (frame.phase === "select") stage.innerHTML = boardView();
    else if (frame.phase === "round-break")
      stage.innerHTML = shell(
        `<div class="j-clue"><div class="j-dd">DOUBLE JEOPARDY!</div><p>Clue values double and two Daily Doubles are hidden on the board.</p><div class="j-actions">${button("Begin round", { type: "continue" })}</div></div>`,
      );
    else if (frame.phase.startsWith("final")) stage.innerHTML = finalView();
    else stage.innerHTML = clueView();
    updateTimer();
  }

  function updateTimer() {
    const node = stage.querySelector(".j-timer");
    if (!node) return;
    const left = Math.max(0, deadline - performance.now());
    node.textContent = frame?.timeLeft > 0 ? `${Math.ceil(left / 1000)}s` : "";
  }

  stage.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || pending) return;
    const previousSeq = frame?.seq;
    const payload = JSON.parse(target.dataset.action);
    pending = true;
    target.disabled = true;
    if (payload.type === "buzz") target.textContent = "BUZZED!";
    const accepted = await host.act(payload);
    pending = false;
    if (!accepted || frame?.seq !== previousSeq) render();
  });
  stage.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-form]");
    if (!form || pending) return;
    event.preventDefault();
    const data = new FormData(form);
    const type = form.dataset.form;
    const previousSeq = frame?.seq;
    pending = true;
    form.querySelector("button").disabled = true;
    const accepted = await host.act(
      type.includes("wager")
        ? { type, amount: Number(data.get("amount")) }
        : { type, answer: data.get("answer") },
    );
    pending = false;
    if (!accepted || frame?.seq !== previousSeq) render();
  });
  const unsubscribe = host.onFrame((next) => {
    const changed = next.seq !== frame?.seq;
    frame = next;
    if (changed) render();
  });
  timer = setInterval(updateTimer, 200);
  return {
    update() {},
    destroy() {
      unsubscribe();
      clearInterval(timer);
      stage.remove();
    },
  };
}
