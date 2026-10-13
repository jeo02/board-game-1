# Early Career Game Night

A browser-based party game room for work friends and soon-to-be friends. Built with React, Vite, Express, and Socket.IO.

## Play locally

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. Create a room and share its code or invite link. Each player needs their own browser session/device (use separate browser profiles or private windows to test on one computer).

- **Cosmic Telephone:** 3–8 players write prompts, draw the previous player's sentence, and describe drawings. All players submit each step before the next begins. The full story chains are revealed at the end.
- **Scribble Club:** 2–8 players take turns selecting a secret word and drawing while everyone else guesses. Includes 1–3 rounds, 30/60/90 second turns, automatic timeout progression, speed-based points, and a final scoreboard.
- Both games include private room codes, host controls, invite links, an 8-color canvas, brush sizes, eraser, undo, and clear. Refreshing or briefly losing connection restores your player session. Leaving mid-game returns everyone to the lobby.
- **Slither Showdown** (plugin): 1–8 players pick a snake color in the lobby, then steer around a round arena eating glowing pellets to grow. Hitting another snake knocks you out. After a 3-second countdown, a Respawn button brings you back, and the length you lost is dropped as food for everyone else. Rounds last 1, 3 or 5 minutes. Friends can join mid-round, and a live leaderboard ranks everyone by length. Steer with the mouse, touch or arrow keys. Hold click, Space or the on-screen Boost button to speed up; boosting costs length.
- **Name Droppers** (plugin): 4–16 players split into 2–4 teams in the lobby (pick a team, or let the host shuffle). Everyone is dealt a secret hand of famous names and keeps half. The picks form one shared deck of about 30, 45 or 60 cards. Teams take turns giving clues against a 30/45/60 second timer while the clue-giver's teammates guess. Opponents see the card so they can keep things honest. Skipped cards are reshuffled into the deck. The same deck is played over 3 rounds: anything goes, then one word, then charades. You can add an optional fourth round where clues are a single sound. After each turn anyone can flag a card that shouldn't count, which puts it back in the deck. Each round starts with the lowest-scoring team, and the highest total wins. Inspired by the public-domain game Celebrity and Monikers (CC BY-NC-SA). The card text is original.
- **Chess** (plugin): 1–2 players, styled after chess.com. In the lobby, players choose White or Black (the host can shuffle sides). Playing alone? The host can put the computer on the empty side at Easy, Medium or Hard, and change the level or remove it before starting. Time controls run from 1-minute bullet to 30 minutes, with or without increments, or no clock. Clocks start after each side's first move. Move by dragging or clicking, with legal-move dots (to castle, pick the king and then its rook), last-move and check highlights, and a promotion picker. Right-click marks squares and right-drag draws arrows. The side panel has the move list with move-by-move review (arrow keys work too), draw offers, resign, board flip and sound. The server enforces every rule: castling, en passant, promotion, checkmate, stalemate, threefold repetition, the 50-move rule, insufficient material, and timeout vs insufficient material. When the game ends, the final position stays up with the result before the scoreboard appears.
- The game picker also includes direct tiles for launching Gartic Phone and skribbl.io on their official sites.

## Game plugins

New games can be added without changing the website code. Put a folder in `plugins/` and restart the server. The new game appears on the landing page, gets the shared lobby (room codes, invites, color picker, host controls), and gets the live and final leaderboards.

```
plugins/<id>/
  server.js          # authoritative game logic (runs on the server, never served)
  public/client.js   # browser renderer, lazy-loaded from /plugins/<id>/client.js
  public/art.svg     # optional card/lobby illustration (any file in public/ is served)
```

Team games declare `meta.teams`. The lobby then shows a team picker where players choose a team and the host sets the number of teams or shuffles them. A game can't start until every team has `minPlayers`. Set `teams.maxPlayers` to cap each team's size; with `1`, teams become seats, like White and Black in Chess. `teams.noun` renames "team" in the lobby (Chess uses "side").

Games with a computer opponent also declare `meta.bots` (`{name, levels: [{value, label}]}`). In the team lobby, the host can give any empty team to the computer at one of those levels, change the level, or remove it. At least one team must stay human. `create()` receives the computer players as `bots: [{team, level}]`, and the plugin plays their moves itself (see `plugins/chess`).

The `id` must match `^[a-z0-9-]{2,24}$`. Set `PLUGINS_DIR` to load plugins from another folder. Plugins are trusted code installed by whoever runs the server. Don't load plugins from untrusted sources.

**`server.js`** default-exports an object:

| Field                                              | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tickRate`, `sendRate`                             | Simulation Hz (default 20, max 60) and how often frames are sent to players                                                                                                                                                                                                                                                                                                                                                                                                              |
| `meta`                                             | `name`, `description`, `players`, `time`, `tag`, `badge`, `caption`, `categories`, `art`, `theme {background, accent, ink}`, `minPlayers`, `maxPlayers` (≤ 16), `joinInProgress`, `continueOnLeave`, `colors` / `colorNames`, `teams {min, max, default, minPlayers, maxPlayers, noun, names, colors}`, `bots {name, levels}`, `sidebar` (`false` gives the game the full width, for games with their own side panel), `scoreUnit`, `settings [{key, label, default, options}]`, `rules` |
| `create({players, settings, teams, bots, random})` | Returns the initial game state. Players include `team` and `teams` lists `{index, name, color}` in team games; `bots` lists computer players `{team, level}`                                                                                                                                                                                                                                                                                                                             |
| `input(state, playerId, payload)`                  | Applies a player's realtime (volatile) input. Treat the payload as untrusted.                                                                                                                                                                                                                                                                                                                                                                                                            |
| `action(state, playerId, payload)`                 | Optional: applies a reliable, acknowledged move for turn-based games. Throw an `Error` to show its message to the player                                                                                                                                                                                                                                                                                                                                                                 |
| `tick(state, dtSeconds)`                           | Advances the game. Return `true` when the round is over.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `frame(state, playerId)`                           | Per-player snapshot (`Buffer` or JSON-serializable), sent as a volatile socket message                                                                                                                                                                                                                                                                                                                                                                                                   |
| `leaderboard(state)` / `results(state)`            | `[{id, score, detail}]` (or `[{team, score, detail}]` in team games) for the live and final leaderboards                                                                                                                                                                                                                                                                                                                                                                                 |
| `join`, `leave`, `publicState`                     | Optional: players joining or leaving mid-round, plus extra state included in room updates                                                                                                                                                                                                                                                                                                                                                                                                |

**`client.js`** exports `mount(element, host)` and returns `{ update(room), destroy() }`. `host` provides `you`, `getRoom()`, `onFrame(fn)` (returns an unsubscribe function), `send(input)` for volatile realtime input and `act(payload)` for reliable moves (returns a promise of `true`/`false`, and errors show in the site banner). See `plugins/slither` for a realtime example, `plugins/monikers` for a turn-based team game, and `plugins/chess` for seats, computer players and a full-width layout.

### The chess computer

`plugins/chess` is split into `rules.js` (a 0x88 move generator checked against standard perft counts), `server.js` (the game: turns, clocks, draws, frames) and `bot.js` (the computer opponent). The bot uses alpha-beta search with quiescence, killer moves and piece-square tables, plus an endgame "mop-up" term so it can finish won endings:

| Level  | How it plays                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------- |
| Easy   | Looks one move ahead with heavy random noise, misjudges trades, and plays a random move 1 in 4       |
| Medium | Searches 3 half-moves deep plus all captures, with a little noise; plays a random move about 1 in 30 |
| Hard   | Thinks for up to 1.5 seconds (less when its clock runs low), usually reaching 5–7 half-moves deep    |

The search runs in a worker thread (`bot-worker.js`), so a long think never stalls the realtime games on the same server. One worker serves every room, so simultaneous computer games queue their moves. The computer pauses briefly before each reply so moves don't feel instant. It avoids threefold repetition when it's winning, and accepts a draw offer only when it thinks it's losing.

### Realtime performance

The server simulates each plugin game at its own tick rate from one shared scheduler, using measured time steps. Slither runs at 30 Hz and sends each player a compact binary frame at 15 Hz. Each frame contains only the snakes and food within that player's view, and snake bodies are downsampled. With 8 long snakes a tick takes about 0.3 ms, and a frame is about 5 KB versus about 170 KB as JSON. Frames and inputs use volatile Socket.IO messages, so a slow connection skips stale updates instead of building up lag. Leaderboards are sent reliably, and only when they change. The client interpolates between frames at the display's refresh rate, batches canvas drawing, caps the device pixel ratio at 2, and loads plugin code only when a game starts.

For friends on the same network, use this computer's LAN IP in place of localhost. The host must be reachable and Windows Firewall must allow the server. For internet play, see [Hosting](#hosting) below and share the public URL.

## Production

```sh
npm run build
npm start
```

The server serves the built app and game connections on **http://localhost:3001** (or `PORT`). Rooms are stored in memory, support a single server instance, and reset when the server restarts. Disconnected players have 30 seconds to reconnect; otherwise they leave the room. This first version has no accounts or persistent history.

### Deploy to Azure App Service

The `infra` directory contains Bicep that creates the resource group, free
Linux App Service plan, and Node.js web app:

| Resource         | Current deployment                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| App URL          | [early-career-game-night-jeo02.azurewebsites.net](https://early-career-game-night-jeo02.azurewebsites.net) |
| Resource group   | `rg-early-career-game-night`                                                                               |
| Region           | West US 3                                                                                                  |
| App Service plan | `juanospina_asp_7601`                                                                                      |
| Web app          | `early-career-game-night-jeo02`                                                                            |
| Runtime          | Node.js 22 LTS on Linux                                                                                    |
| Pricing tier     | F1 Free, one instance                                                                                      |

```sh
az deployment sub create \
  --name early-career-game-night \
  --location westus3 \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam
```

After provisioning, deploy the application source:

```sh
az webapp up \
  --name early-career-game-night-jeo02 \
  --resource-group rg-early-career-game-night \
  --plan juanospina_asp_7601 \
  --location westus3 \
  --sku F1 \
  --runtime "NODE:22-lts"
```

The free F1 tier can unload or restart an idle app. A restart clears all
active rooms, so keep the app at one instance and move to a Basic plan if
always-on lobby availability becomes important.

## Verify

```sh
npm run check
npm run test:e2e
```

Unit tests cover private game state, chain rotation, host controls, drawing validation, scoring, and timed rounds, plus plugin validation, the Slither simulation (growth, collisions, respawn, boosting, frame encoding) and color picking, team lobbies (balancing, switching, resizing, shuffling, seat limits and computer seats), the Name Droppers rules (draft sizing, hidden cards, skips, undo, the buzzer, disputes, turn rotation, round order and full games), and Chess (perft move counts, SAN, every draw rule, promotion, clocks and increments, timeouts, draw offers, resigning, the computer's turns, and bot tactics and time budgets). Browser tests use separate player contexts to play the drawing games from start to finish, play a live Slither round with color picking, mid-round joining and leaderboards, play a four-player Name Droppers game through the team lobby, draft, a disputed turn and a round break, play Chess against the computer (seating it, changing its level, clicking and dragging moves, reviewing, resigning) and between two friends (shuffling sides, a flipped board, a declined draw offer, checkmate), test reconnects and leaving, check shared drawing/undo, and verify the mobile layout. Browser tests use installed Microsoft Edge; change `channel` in `playwright.config.js` if using another Playwright browser.

To test an already running server on port 3001 from PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3001"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Setting `PLAYWRIGHT_BASE_URL` uses that server without starting the development server.

The game names, illustrations, and interface are original, inspired by drawing telephone and drawing-and-guessing party game formats. Chess's look is inspired by chess.com. The chess pieces are Colin M. L. Burnett's "Cburnett" set, used under its BSD license, and the bot's piece-square tables come from Tomasz Michniewski's Simplified Evaluation Function.
