import { readdir } from "node:fs/promises";

const files = (await readdir(new URL(".", import.meta.url))).filter(
  (file) => file.endsWith(".js") && file !== "index.js",
);
export const games = new Map();
for (const file of files) {
  const game = (await import(new URL(file, import.meta.url))).default;
  if (
    !game?.id ||
    games.has(game.id) ||
    !Number.isInteger(game.minimum) ||
    !Number.isInteger(game.maximum) ||
    typeof game.start !== "function" ||
    typeof game.action !== "function" ||
    typeof game.tick !== "function" ||
    typeof game.view !== "function"
  )
    throw new Error(`Invalid game plugin: ${file}`);
  games.set(game.id, game);
}
