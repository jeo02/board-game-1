import { randomUUID } from "node:crypto";

// Each game chooses its audience and when its canvas is writable. Geometry,
// storage, snapshots and wire operations are independent of its renderer.
const policies = new Map([
  [
    "telephone",
    {
      private: true,
      writable: (r, id) => r.phase === "draw" && !r.submissions[id],
    },
  ],
  [
    "scribble",
    {
      private: false,
      writable: (r, id) => r.phase === "drawing" && r.drawer === id,
    },
  ],
]);
export function registerDrawingPlugin(plugin) {
  if (!plugin.drawing) return;
  policies.set(plugin.id, {
    private: plugin.drawing.private !== false,
    writable: (room, id) =>
      room.phase === "playing" &&
      room.game &&
      plugin.drawing.writable(room.game, id),
  });
}
export function resetCanvas(room) {
  room.canvasId = randomUUID();
  room.strokes = [];
}
export function visibleTo(room, author, viewer) {
  return policies.get(room.mode)?.private === false || author === viewer;
}
export function canvasSnapshot(room, id) {
  return policies.get(room.mode)?.private === false
    ? room.strokes
    : room.strokes.filter((s) => s.player === id);
}
function authorize(room, id) {
  if (!policies.get(room.mode)?.writable(room, id))
    throw new Error("It is not your drawing turn.");
  if (!room.players.some((p) => p.id === id))
    throw new Error("Join the room first.");
}
function validate(stroke, limit) {
  if (
    !stroke ||
    typeof stroke.color !== "string" ||
    !/^#[0-9a-f]{6}$/i.test(stroke.color) ||
    ![3, 7, 14, 24].includes(stroke.width)
  )
    throw new Error("Invalid brush.");
  if (
    !Array.isArray(stroke.points) ||
    !stroke.points.length ||
    stroke.points.length > limit ||
    !stroke.points.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        p.every((n) => Number.isFinite(n) && n >= 0 && n <= 1),
    )
  )
    throw new Error("Invalid drawing.");
  return { color: stroke.color, width: stroke.width, points: stroke.points };
}
export function addStroke(room, id, stroke) {
  authorize(room, id);
  const added = { ...validate(stroke, 1000), player: id };
  if (room.strokes.filter((s) => s.player === id).length >= 1500)
    throw new Error("Canvas is full. Clear or undo to keep drawing.");
  room.strokes.push(added);
  return added;
}
export function editCanvas(room, id, type) {
  authorize(room, id);
  if (type === "clear")
    room.strokes = room.strokes.filter((s) => s.player !== id);
  else if (type === "undo") {
    const index = room.strokes.findLastIndex((s) => s.player === id);
    if (index >= 0) room.strokes.splice(index, 1);
  } else throw new Error("Unknown canvas edit.");
}
export function drawingOperation(room, id, op) {
  if (!room?.canvasId || op?.canvasId !== room.canvasId)
    throw new Error("This canvas has closed.");
  const { type, canvasId } = op;
  const delta = { type, canvasId, player: id };
  if (type === "preview") {
    authorize(room, id);
    delta.stroke = validate(op.stroke, 64);
  } else if (type === "stroke") delta.stroke = addStroke(room, id, op.stroke);
  else editCanvas(room, id, type);
  return delta;
}
