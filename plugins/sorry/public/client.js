import { COLORS, START, TRACK, HOME, entry, exit, slideEnd } from "./board.js";

const names = ["Red", "Blue", "Gold", "Green"];
const inks = ["#9e3441", "#285b94", "#815719", "#246447"];
const tints = ["#f8dddd", "#deebf8", "#f6e8be", "#dbede1"];
const cell = 48;
const margin = 40;
function rotate(x, y, side) {
  for (let i = 0; i < side; i++) [x, y] = [15 - y, x];
  return [margin + x * cell, margin + y * cell];
}
function track(pos) {
  return rotate(pos % 15, 0, Math.floor(pos / 15));
}
function dock(side, pos) {
  return pos === START ? rotate(4.5, 2.15, side) : rotate(2.15, 7, side);
}
function berth([x, y], p) {
  return [x + ((p % 2) - 0.5) * 44, y + (Math.floor(p / 2) - 0.5) * 44];
}
function shape(parent, tag, attrs, text) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  parent.append(node);
  return node;
}
function tile(svg, [x, y], fill, stroke) {
  shape(svg, "rect", {
    x: x - 22,
    y: y - 22,
    width: 44,
    height: 44,
    rx: 7,
    fill,
    stroke,
    "stroke-width": 1.5,
  });
}
function drawBoard(svg) {
  shape(svg, "rect", {
    x: 4,
    y: 4,
    width: 792,
    height: 792,
    rx: 28,
    fill: "#f8f2e2",
    stroke: "#554936",
    "stroke-width": 5,
  });
  shape(svg, "rect", {
    x: 68,
    y: 68,
    width: 664,
    height: 664,
    rx: 18,
    fill: "#fffaf0",
    stroke: "#dbceb6",
    "stroke-width": 2,
  });
  for (let i = 0; i < TRACK; i++)
    tile(svg, track(i), i % 15 === 0 ? "#efe3c9" : "#fffdfa", "#c0b49f");
  for (let side = 0; side < 4; side++) {
    const color = COLORS[side],
      ink = inks[side];
    for (const start of [side * 15 + 1, side * 15 + 9]) {
      const [x, y] = track(start),
        [x2, y2] = track(slideEnd(start, (side + 1) % 4));
      shape(svg, "line", {
        x1: x,
        y1: y,
        x2,
        y2,
        stroke: color,
        "stroke-width": 9,
        "stroke-linecap": "round",
      });
      shape(svg, "path", {
        d: "M -9 -12 L 12 0 L -9 12 Z",
        transform: `translate(${x} ${y}) rotate(${side * 90})`,
        fill: ink,
      });
      shape(svg, "circle", { cx: x2, cy: y2, r: 6, fill: ink });
    }
    for (const [pos, dir] of [
      [entry(side), 0],
      [exit(side), 180],
    ]) {
      const [x, y] = track(pos);
      shape(svg, "path", {
        d: "M -6 7 L 0 14 L 6 7",
        transform: `translate(${x} ${y}) rotate(${side * 90 + dir})`,
        fill: "none",
        stroke: ink,
        "stroke-width": 3,
      });
    }
    for (let i = 1; i <= 5; i++)
      tile(svg, rotate(2, i, side), tints[side], color);
    for (const pos of [START, HOME]) {
      const [x, y] = dock(side, pos);
      const attrs = { fill: tints[side], stroke: color, "stroke-width": 3 };
      if (pos === START)
        shape(svg, "rect", {
          x: x - 51,
          y: y - 51,
          width: 102,
          height: 102,
          rx: 24,
          ...attrs,
        });
      else
        shape(svg, "path", {
          d: `M ${x - 51} ${y + 48} v -76 l 51 -33 l 51 33 v 76 z`,
          ...attrs,
        });
      for (let p = 0; p < 4; p++) {
        const [cx, cy] = berth([x, y], p);
        shape(svg, "circle", {
          cx,
          cy,
          r: 18,
          fill: "#fffdf8",
          stroke: color,
          "stroke-width": 1.5,
        });
      }
    }
  }
  // The card has its own space in the middle; no captions share pawn squares.
  shape(svg, "rect", {
    x: 344,
    y: 332,
    width: 100,
    height: 132,
    rx: 12,
    fill: "#deca9e",
    stroke: "#a88b58",
    "stroke-width": 2,
    transform: "rotate(-10 400 400)",
  });
  shape(svg, "rect", {
    x: 350,
    y: 334,
    width: 100,
    height: 132,
    rx: 12,
    fill: "#384e50",
    stroke: "#263b3d",
    "stroke-width": 3,
  });
  shape(svg, "rect", {
    x: 356,
    y: 340,
    width: 88,
    height: 120,
    rx: 8,
    fill: "none",
    stroke: "#d8caa7",
    "stroke-width": 2,
  });
  return shape(
    svg,
    "text",
    { x: 400, y: 400, class: "card-rank", fill: "#fff6dd" },
    "?",
  );
}
export function mount(element, host) {
  const root = document.createElement("section");
  element.append(root);
  const ui = root.attachShadow({ mode: "open" });
  ui.innerHTML = `<link rel="stylesheet" href="${new URL("./table.css", import.meta.url).href}">
    <header><div><small>Sorry! &nbsp;/&nbsp; Classic table</small><h2></h2></div><div class="controls"></div></header>
    <div class="map" role="region" aria-label="Game board" tabindex="0"><svg class="board" viewBox="0 0 800 800" role="img" aria-label="Sorry! board, clockwise track and private safety lanes"></svg></div>
    <div class="legend"><span><i class="start"></i> Start</span><span><i class="home"></i> Home</span><span><i class="slide"></i> Slide</span><button class="zoom" aria-pressed="false">Enlarge board</button></div>
    <div class="key" aria-label="Player colors"></div><p class="last" aria-live="polite"></p>
    <a href="https://www.hasbro.com/common/instruct/Sorry_2005.pdf" target="_blank" rel="noopener">Official rules (PDF)</a>`;
  const svg = ui.querySelector(".board"),
    card = drawBoard(svg);
  const zoom = ui.querySelector(".zoom");
  zoom.onclick = () => {
    const expanded = ui.querySelector(".map").classList.toggle("expanded");
    zoom.setAttribute("aria-pressed", String(expanded));
    zoom.textContent = expanded ? "Fit board" : "Enlarge board";
  };
  const pieces = shape(svg, "g", {}),
    controls = ui.querySelector(".controls");
  let revision = -1;
  const off = host.onFrame((s) => {
    if (s.revision === revision) return;
    revision = s.revision;
    pieces.replaceChildren();
    s.board.forEach((row, i) =>
      row.forEach((pos, p) => {
        const { side, name } = s.players[i],
          parked = pos === START || pos === HOME;
        const [x, y] = parked
          ? berth(dock(side, pos), p)
          : pos >= TRACK
            ? rotate(2, pos - TRACK + 1, side)
            : track(pos);
        const token = shape(pieces, "g", {
          class: "pawn",
          transform: `translate(${x} ${y})`,
        });
        shape(token, "title", {}, `${name}, pawn ${p + 1}`);
        shape(token, "circle", { r: 18, cy: 2, fill: "#514235" });
        shape(token, "circle", {
          r: 17,
          fill: inks[side],
          stroke: "#fffaf1",
          "stroke-width": 2,
        });
        shape(token, "text", { x: 0, y: 0, fill: "#fff" }, p + 1);
      }),
    );
    const active = s.players[s.turn],
      mine = active.id === host.you;
    card.textContent = s.card === "Sorry!" ? "!" : (s.card ?? "?");
    ui.querySelector("h2").textContent =
      (mine ? "Your turn" : `${active.name}'s turn`) +
      (s.card !== null ? ` · ${s.card}` : "");
    ui.querySelector(".last").textContent = s.last;
    const key = ui.querySelector(".key");
    key.replaceChildren();
    for (const player of s.players) {
      const chip = document.createElement("span");
      chip.style.setProperty("--ink", inks[player.side]);
      chip.textContent = `${names[player.side]}: ${player.name}`;
      key.append(chip);
    }
    controls.replaceChildren();
    if (!mine || s.won) return;
    const select = document.createElement("select"),
      button = document.createElement("button");
    if (s.card !== null) {
      select.ariaLabel = "Legal moves";
      s.options.forEach((label, i) => select.add(new Option(label, i)));
      controls.append(select);
    }
    button.textContent = s.card === null ? "Draw card" : "Play move";
    button.onclick = async () => {
      button.disabled = true;
      if (
        !(await host.act({
          type: s.card === null ? "draw" : "move",
          index: select.selectedIndex,
          revision: s.revision,
        }))
      )
        button.disabled = false;
    };
    controls.append(button);
  });
  return {
    destroy() {
      off();
      root.remove();
    },
  };
}
