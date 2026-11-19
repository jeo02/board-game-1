// Track positions run clockwise from the top-left corner. Safety positions
// are relative to the pawn's color, never shared between players.
export const COLORS = ["#bd454c", "#346faf", "#cf9827", "#358360"];
export const START = -1,
  TRACK = 60,
  HOME = 65;
export const entry = (side) => side * 15 + 2;
export const exit = (side) => side * 15 + 4;
export function slideEnd(pos, side) {
  if (pos < 0 || pos >= TRACK || Math.floor(pos / 15) === side) return pos;
  return pos % 15 === 1 ? pos + 3 : pos % 15 === 9 ? pos + 4 : pos;
}
