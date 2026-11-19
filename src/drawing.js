// Renderers consume confirmed strokes and optionally paint transient segments.
// Only the confirmed operations change room state or survive a reconnect.
export function canvasClient(socket, room, act) {
  const { canvasId } = room;
  return {
    write: (type, stroke) => act("drawing", { type, canvasId, stroke }),
    preview(stroke) {
      if (socket.connected)
        socket.volatile.emit("drawing", { type: "preview", canvasId, stroke });
    },
    subscribe(handler) {
      const listener = (delta) => {
        if (delta.type === "preview" && delta.canvasId === canvasId)
          handler(delta.stroke);
      };
      socket.on("drawing", listener);
      return () => socket.off("drawing", listener);
    },
    canvasId,
  };
}
export function applyDrawing(room, delta) {
  if (!room || room.canvasId !== delta.canvasId) return room;
  let strokes = room.strokes;
  if (delta.type === "stroke") strokes = [...strokes, delta.stroke];
  else if (delta.type === "clear")
    strokes = strokes.filter((s) => s.player !== delta.player);
  else if (delta.type === "undo") {
    const index = strokes.findLastIndex((s) => s.player === delta.player);
    strokes = strokes.filter((_, i) => i !== index);
  } else return room;
  return { ...room, strokes };
}
