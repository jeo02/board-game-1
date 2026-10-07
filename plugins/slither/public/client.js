// Slither Showdown client. Loaded on demand by the host site via dynamic
// import(); it renders into the provided element and never touches React.

const STYLE_ID = "slither-plugin-styles";
const CSS = `
.slither-stage{position:relative;height:min(68vh,640px);min-height:360px;border-radius:12px;overflow:hidden;background:#17241e;touch-action:none;user-select:none;-webkit-user-select:none}
.slither-stage canvas{display:block;width:100%;height:100%;outline:none;cursor:crosshair}
.slither-stage canvas:focus-visible{box-shadow:inset 0 0 0 3px #f4d278}
.slither-hud{position:absolute;top:12px;left:12px;display:flex;gap:8px;pointer-events:none;flex-wrap:wrap}
.slither-hud span{background:#0f1a15b3;color:#eaf6ef;font:600 12px "DM Sans",sans-serif;padding:7px 10px;border-radius:8px;letter-spacing:.2px}
.slither-hud b{font-weight:800;margin-left:4px}
.slither-overlay{position:absolute;inset:0;display:grid;place-items:center;background:#0e1712a6;color:#fff;text-align:center;font:600 15px "DM Sans",sans-serif;pointer-events:none}
.slither-overlay[hidden]{display:none}
.slither-overlay strong{display:block;font:800 26px Manrope,sans-serif;margin-bottom:6px}
.slither-overlay .count{display:block;font:800 44px Manrope,sans-serif;margin-top:10px;opacity:.85}
.slither-respawn{pointer-events:auto;margin-top:14px;padding:12px 30px;border:0;border-radius:999px;background:#f4d278;color:#302c41;font:800 16px Manrope,sans-serif;cursor:pointer;box-shadow:0 6px 18px #0006;transition:transform .12s}
.slither-respawn:hover{transform:translateY(-1px)}
.slither-respawn:focus-visible{outline:3px solid #fff;outline-offset:3px}
.slither-respawn:disabled{opacity:.7;cursor:progress}
.slither-boost{position:absolute;right:14px;bottom:14px;width:74px;height:74px;border-radius:50%;border:2px solid #ffffff70;background:#ffffff26;color:#fff;font:800 12px Manrope,sans-serif;letter-spacing:.8px;display:none}
.slither-boost.active{background:#f4d278;color:#302c41}
@media (pointer:coarse){.slither-boost{display:block}}
.slither-help{position:absolute;bottom:10px;left:12px;color:#d7eadf99;font:500 11px "DM Sans",sans-serif;pointer-events:none}
@media (max-width:760px){.slither-stage{height:62vh;min-height:320px}.slither-help{display:none}}
`;

function decode(buffer) {
  const d = new Int16Array(buffer);
  let o = 0;
  const f = {
    version: d[o++],
    seq: d[o++],
    alive: d[o++] === 1,
    respawn: d[o++] / 10,
    killer: d[o++],
    timeLeft: d[o++],
    view: d[o++],
    world: d[o++],
    mass: d[o++],
    kills: d[o++],
    cx: d[o++],
    cy: d[o++],
    heads: [],
    snakes: new Map(),
    food: null,
  };
  const headCount = d[o++];
  for (let i = 0; i < headCount; i++, o += 3)
    f.heads.push([d[o], d[o + 1], d[o + 2]]);
  const snakeCount = d[o++];
  for (let i = 0; i < snakeCount; i++) {
    const slot = d[o];
    const boost = d[o + 1] === 1;
    const radius = d[o + 2] / 10;
    const n = d[o + 3];
    o += 4;
    f.snakes.set(slot, {
      slot,
      boost,
      radius,
      points: d.subarray(o, o + n * 2),
    });
    o += n * 2;
  }
  const foodCount = d[o++];
  f.food = d.subarray(o, o + foodCount * 3);
  return f;
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount),
  );
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function makePattern(ctx) {
  const tile = document.createElement("canvas");
  tile.width = tile.height = 56;
  const t = tile.getContext("2d");
  t.fillStyle = "#1d2f26";
  t.fillRect(0, 0, 56, 56);
  t.fillStyle = "#24392e";
  for (const [x, y] of [
    [14, 14],
    [42, 42],
  ]) {
    t.beginPath();
    t.arc(x, y, 12, 0, Math.PI * 2);
    t.fill();
  }
  return ctx.createPattern(tile, "repeat");
}

export function mount(el, host) {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.append(style);
  }
  const stage = document.createElement("div");
  stage.className = "slither-stage";
  stage.innerHTML = `
    <canvas tabindex="0" role="application" aria-label="Slither arena. Steer with your mouse, finger, or the left and right arrow keys. Hold Space to boost."></canvas>
    <div class="slither-hud" aria-live="off"><span>Length<b data-k="mass">10</b></span><span>Takedowns<b data-k="kills">0</b></span><span>Time<b data-k="time">–</b></span></div>
    <div class="slither-overlay" hidden role="status"></div>
    <button class="slither-boost" type="button" aria-label="Boost">BOOST</button>
    <div class="slither-help">Mouse to steer · hold click or Space to boost · ← → keys work too</div>`;
  el.append(stage);
  const canvas = stage.querySelector("canvas");
  const overlay = stage.querySelector(".slither-overlay");
  const boostButton = stage.querySelector(".slither-boost");
  const hud = Object.fromEntries(
    [...stage.querySelectorAll("[data-k]")].map((n) => [n.dataset.k, n]),
  );
  const ctx = canvas.getContext("2d", { alpha: false });
  const pattern = makePattern(ctx);
  const palette = host.getRoom().meta?.colors ?? ["#7b61c9"];

  let prev = null;
  let cur = null;
  let interval = 1000 / 15;
  let scale = 1;
  let dpr = 1;
  let raf = 0;
  let slotInfo = [];
  let heading = null;
  let pointer = null;
  let boostMouse = false;
  let boostKey = false;
  let boostTouch = false;
  const keys = new Set();
  let sent = { a: NaN, b: false, at: 0 };
  let lastHud = 0;
  let overlayText = "";
  let respawnAsked = 0;

  function requestRespawn() {
    if (!cur || cur.alive || cur.respawn > 0) return;
    respawnAsked = performance.now();
    host.send({ r: 1 });
    const button = overlay.querySelector(".slither-respawn");
    if (button) {
      button.disabled = true;
      button.textContent = "Respawning…";
    }
  }
  const onOverlayClick = (e) => {
    if (e.target.closest(".slither-respawn")) requestRespawn();
  };
  overlay.addEventListener("click", onOverlayClick);

  function refreshSlots(room) {
    const slots = room.gameInfo?.slots ?? [];
    slotInfo = slots.map((id) => {
      const p = room.players.find((player) => player.id === id);
      return p
        ? {
            id,
            name: p.name,
            color: p.color ?? palette[0],
            you: id === room.you,
          }
        : null;
    });
  }
  refreshSlots(host.getRoom());

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const offFrame = host.onFrame((buffer) => {
    const frame = decode(buffer);
    frame.at = performance.now();
    if (cur) {
      if (((frame.seq - cur.seq) & 0x7fff) > 0x4000) return;
      interval = interval * 0.85 + Math.min(250, frame.at - cur.at) * 0.15;
    }
    prev = cur;
    cur = frame;
    if (heading === null) {
      const me = [...frame.snakes.values()].find((s) => slotInfo[s.slot]?.you);
      if (me && me.points.length >= 4)
        heading = Math.atan2(
          me.points[1] - me.points[3],
          me.points[0] - me.points[2],
        );
    }
  });

  function steerFromPointer(e) {
    const r = canvas.getBoundingClientRect();
    pointer = [
      e.clientX - r.left - r.width / 2,
      e.clientY - r.top - r.height / 2,
    ];
  }
  const onPointerMove = (e) => steerFromPointer(e);
  const onPointerDown = (e) => {
    canvas.focus({ preventScroll: true });
    steerFromPointer(e);
    if (e.pointerType === "mouse") boostMouse = true;
  };
  const onPointerUp = (e) => {
    if (e.pointerType === "mouse") boostMouse = false;
  };
  const onKeyDown = (e) => {
    if (e.target !== canvas && e.target !== document.body) return;
    const k = e.key;
    if (cur && !cur.alive) {
      if ((k === "Enter" || k === " ") && !e.repeat) requestRespawn();
      if (k === "Enter" || k === " ") e.preventDefault();
      return;
    }
    if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(k)) {
      keys.add(k.toLowerCase());
      pointer = null;
      e.preventDefault();
    } else if ([" ", "ArrowUp", "w", "W"].includes(k)) {
      boostKey = true;
      e.preventDefault();
    }
  };
  const onKeyUp = (e) => {
    keys.delete(e.key.toLowerCase());
    if ([" ", "ArrowUp", "w", "W"].includes(e.key)) boostKey = false;
  };
  const onBoostDown = (e) => {
    e.stopPropagation();
    boostTouch = true;
    boostButton.classList.add("active");
  };
  const onBoostUp = () => {
    boostTouch = false;
    boostButton.classList.remove("active");
  };
  const onBlur = () => {
    boostMouse = boostKey = boostTouch = false;
    keys.clear();
  };
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  boostButton.addEventListener("pointerdown", onBoostDown);
  boostButton.addEventListener("pointerup", onBoostUp);
  boostButton.addEventListener("pointercancel", onBoostUp);
  boostButton.addEventListener("pointerleave", onBoostUp);

  function sendInput(now, dt) {
    if (heading === null) return;
    if (pointer && Math.hypot(pointer[0], pointer[1]) > 6)
      heading = Math.atan2(pointer[1], pointer[0]);
    const turn =
      (keys.has("arrowright") || keys.has("d") ? 1 : 0) -
      (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
    if (turn) heading += turn * 3.6 * dt;
    const boost = boostMouse || boostKey || boostTouch;
    const changed =
      Math.abs(
        Math.atan2(Math.sin(heading - sent.a), Math.cos(heading - sent.a)),
      ) > 0.015 || !(sent.a === sent.a);
    if (
      (changed && now - sent.at > 45) ||
      boost !== sent.b ||
      now - sent.at > 300
    ) {
      sent = { a: heading, b: boost, at: now };
      host.send({ a: Math.round(heading * 1000) / 1000, b: boost ? 1 : 0 });
    }
  }

  function drawSnake(s, p, alpha, you) {
    const info = slotInfo[s.slot];
    if (!info) return;
    const pts = s.points;
    let hx = pts[0];
    let hy = pts[1];
    if (p && p.points.length >= 2) {
      hx = p.points[0] + (pts[0] - p.points[0]) * alpha;
      hy = p.points[1] + (pts[1] - p.points[1]) * alpha;
    }
    const cut = (pts[0] - hx) ** 2 + (pts[1] - hy) ** 2;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    for (let i = 2; i < pts.length; i += 2)
      if ((pts[i] - pts[0]) ** 2 + (pts[i + 1] - pts[1]) ** 2 > cut)
        ctx.lineTo(pts[i], pts[i + 1]);
    const w = s.radius * 2;
    if (s.boost) {
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = shade(info.color, 0.5);
      ctx.lineWidth = w + 12;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = shade(info.color, -0.35);
    ctx.lineWidth = w + 3;
    ctx.stroke();
    ctx.strokeStyle = info.color;
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = shade(info.color, 0.6);
    ctx.lineWidth = w * 0.3;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const nx = pts.length >= 4 ? pts[2] : hx - 1;
    const ny = pts.length >= 4 ? pts[3] : hy;
    const a = Math.atan2(hy - ny, hx - nx);
    const r = s.radius;
    for (const side of [-1, 1]) {
      const ex =
        hx + Math.cos(a) * r * 0.35 + Math.cos(a + side * 1.57) * r * 0.5;
      const ey =
        hy + Math.sin(a) * r * 0.35 + Math.sin(a + side * 1.57) * r * 0.5;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1b1726";
      ctx.beginPath();
      ctx.arc(
        ex + Math.cos(a) * r * 0.13,
        ey + Math.sin(a) * r * 0.13,
        r * 0.19,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    if (!you) {
      ctx.font = `600 ${Math.max(12, r)}px "DM Sans",sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffffcc";
      ctx.fillText(info.name, hx, hy - r - 9);
    }
  }

  function render(now) {
    raf = requestAnimationFrame(render);
    const dt = Math.min(0.1, (now - (render.last ?? now)) / 1000);
    render.last = now;
    sendInput(now, dt);
    const W = canvas.width;
    const H = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#101a15";
    ctx.fillRect(0, 0, W, H);
    if (!cur) return;
    const alpha = Math.min(1, (now - cur.at) / interval);
    const cx = prev ? prev.cx + (cur.cx - prev.cx) * alpha : cur.cx;
    const cy = prev ? prev.cy + (cur.cy - prev.cy) * alpha : cur.cy;
    const target = Math.hypot(W, H) / 2 / dpr / cur.view;
    scale += (target - scale) * Math.min(1, dt * 3);
    const k = scale * dpr;
    ctx.setTransform(k, 0, 0, k, W / 2 - cx * k, H / 2 - cy * k);
    ctx.fillStyle = pattern;
    ctx.beginPath();
    ctx.arc(0, 0, cur.world, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e0697a";
    ctx.lineWidth = 6;
    ctx.stroke();

    const food = cur.food;
    const buckets = palette.map(() => []);
    for (let i = 0; i < food.length; i += 3)
      buckets[(food[i + 2] & 15) % palette.length].push(i);
    const pulse = 1 + Math.sin(now / 300) * 0.12;
    for (let c = 0; c < palette.length; c++) {
      if (!buckets[c].length) continue;
      for (const [alphaPass, grow] of [
        [0.22, 2.1 * pulse],
        [1, 1],
      ]) {
        ctx.globalAlpha = alphaPass;
        ctx.fillStyle = palette[c];
        ctx.beginPath();
        for (const i of buckets[c]) {
          const r = Math.min(10, 4 + (food[i + 2] >> 4) * 1.3) * grow;
          ctx.moveTo(food[i] + r, food[i + 1]);
          ctx.arc(food[i], food[i + 1], r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    let mine = null;
    for (const s of cur.snakes.values()) {
      if (slotInfo[s.slot]?.you) mine = s;
      else drawSnake(s, prev?.snakes.get(s.slot), alpha, false);
    }
    if (mine) drawSnake(mine, prev?.snakes.get(mine.slot), alpha, true);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mr = 52;
    const mx = W / dpr - mr - 14;
    const my =
      H / dpr - mr - (matchMedia("(pointer:coarse)").matches ? 104 : 14);
    ctx.fillStyle = "#0b1410b3";
    ctx.strokeStyle = "#ffffff40";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (const [slot, x, y] of cur.heads) {
      const info = slotInfo[slot];
      if (!info) continue;
      ctx.fillStyle = info.color;
      ctx.beginPath();
      ctx.arc(
        mx + (x / cur.world) * mr,
        my + (y / cur.world) * mr,
        info.you ? 4.5 : 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (info.you) {
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      }
    }

    if (now - lastHud > 200) {
      lastHud = now;
      hud.mass.textContent = cur.mass;
      hud.kills.textContent = cur.kills;
      hud.time.textContent = `${Math.floor(cur.timeLeft / 60)}:${String(cur.timeLeft % 60).padStart(2, "0")}`;
      stage.dataset.state = cur.alive ? "alive" : "dead";
      stage.dataset.length = cur.mass;
      if (cur.alive) respawnAsked = 0;
      const ready = !cur.alive && cur.respawn <= 0;
      const text = cur.alive
        ? ""
        : `<div><strong>${cur.killer >= 0 ? `${escape(slotInfo[cur.killer]?.name ?? "Someone")} got you!` : "Bonk! You hit the wall."}</strong>You finished at length ${cur.mass}.${
            ready
              ? `<br><button class="slither-respawn" type="button">Respawn</button>`
              : `<span class="count" aria-label="Respawn available in ${Math.ceil(cur.respawn)} seconds">${Math.ceil(cur.respawn)}</span>`
          }</div>`;
      if (text !== overlayText) {
        const hadFocus = overlay.contains(document.activeElement);
        overlayText = text;
        overlay.hidden = !text;
        overlay.innerHTML = text;
        if (!cur.alive) heading = null;
        if (ready) overlay.querySelector(".slither-respawn").focus();
        else if (cur.alive && hadFocus) canvas.focus({ preventScroll: true });
      }
      // Inputs are volatile, so retry if the respawn request got dropped.
      if (ready && respawnAsked && now - respawnAsked > 700) requestRespawn();
    }
  }
  raf = requestAnimationFrame(render);
  canvas.focus({ preventScroll: true });

  return {
    update(room) {
      refreshSlots(room);
    },
    destroy() {
      cancelAnimationFrame(raf);
      offFrame();
      observer.disconnect();
      overlay.removeEventListener("click", onOverlayClick);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      stage.remove();
    },
  };
}

function escape(text) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
