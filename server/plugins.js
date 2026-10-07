import { readdir, access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BUILT_IN = ["telephone", "scribble"];
const REQUIRED = ["create", "input", "tick", "frame", "leaderboard", "results"];
const MAX_PLAYERS = 16;
const MAX_TEAMS = 6;

export function validatePlugin(plugin, folder) {
  if (!plugin || typeof plugin !== "object")
    throw new Error("server.js must default-export a game object");
  const id = plugin.id ?? folder;
  if (!/^[a-z0-9-]{2,24}$/.test(id) || BUILT_IN.includes(id))
    throw new Error(`invalid or reserved game id "${id}"`);
  if (!plugin.meta?.name) throw new Error("meta.name is required");
  for (const fn of REQUIRED)
    if (typeof plugin[fn] !== "function")
      throw new Error(`missing required function ${fn}()`);
  const meta = plugin.meta;
  if (meta.colors && !meta.colors.every((c) => /^#[0-9a-f]{6}$/i.test(c)))
    throw new Error("meta.colors must be #rrggbb values");
  const teams = meta.teams ? normalizeTeams(meta.teams) : null;
  const tickRate = Math.min(60, Math.max(1, plugin.tickRate ?? 20));
  return {
    ...plugin,
    id,
    tickRate,
    sendEvery: Math.max(
      1,
      Math.round(tickRate / (plugin.sendRate ?? tickRate)),
    ),
    meta: {
      players: "",
      time: "",
      tag: "New",
      description: "",
      rules: [],
      settings: [],
      categories: [],
      ...meta,
      id,
      plugin: true,
      teams,
      minPlayers: Math.max(1, meta.minPlayers ?? 2),
      maxPlayers: Math.min(MAX_PLAYERS, Math.max(1, meta.maxPlayers ?? 8)),
      client: `/plugins/${id}/client.js`,
      art: meta.art ? `/plugins/${id}/${meta.art}` : null,
    },
  };
}

// Team games declare meta.teams; the shared lobby then lets players pick a
// team and the host choose how many teams to play with.
function normalizeTeams(teams) {
  const min = Math.max(2, Math.floor(teams.min ?? 2));
  const max = Math.min(MAX_TEAMS, Math.max(min, Math.floor(teams.max ?? min)));
  const colors = teams.colors ?? [];
  if (colors.length < max || !colors.every((c) => /^#[0-9a-f]{6}$/i.test(c)))
    throw new Error(`meta.teams.colors needs ${max} #rrggbb values`);
  return {
    min,
    max,
    default: Math.min(max, Math.max(min, teams.default ?? min)),
    minPlayers: Math.max(1, Math.floor(teams.minPlayers ?? 1)),
    colors: colors.slice(0, max),
    names: Array.from(
      { length: max },
      (_, i) => String(teams.names?.[i] ?? "").slice(0, 24) || `Team ${i + 1}`,
    ),
  };
}

export async function loadPlugins(dir) {
  const plugins = new Map();
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return plugins;
  }
  for (const entry of entries.filter((e) => e.isDirectory())) {
    const file = path.join(dir, entry.name, "server.js");
    try {
      await access(file);
      await access(path.join(dir, entry.name, "public", "client.js"));
      const mod = await import(pathToFileURL(file).href);
      const plugin = validatePlugin(mod.default, entry.name);
      if (plugins.has(plugin.id)) throw new Error("duplicate game id");
      plugins.set(plugin.id, { ...plugin, folder: entry.name });
    } catch (error) {
      console.error(`Skipping game plugin "${entry.name}": ${error.message}`);
    }
  }
  return plugins;
}

export function sanitizeSettings(meta, raw = {}) {
  const settings = {};
  for (const s of meta.settings ?? []) {
    const values = s.options.map((o) => o.value);
    const value = values.find((v) => String(v) === String(raw?.[s.key]));
    settings[s.key] = value ?? s.default ?? values[0];
  }
  return settings;
}
