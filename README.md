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
- **Trivia Dash:** 2–8 players race through five multiple-choice questions. Correct answers earn points with a speed bonus, and each answer stays private until the reveal.
- **Act It Out:** 2–8 players take turns choosing private charades prompts while everyone else guesses. Includes timed turns, speed-based points, and performer bonuses.
- All games include private room codes, host controls, invite links, scoring or shared round progress, and session reconnection. The drawing games add an 8-color canvas, brush sizes, eraser, undo, and clear. Leaving mid-game returns everyone to the lobby.

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

| Resource | Current deployment |
| --- | --- |
| App URL | [early-career-game-night-jeo02.azurewebsites.net](https://early-career-game-night-jeo02.azurewebsites.net) |
| Resource group | `rg-early-career-game-night` |
| Region | West US 3 |
| App Service plan | `juanospina_asp_7601` |
| Web app | `early-career-game-night-jeo02` |
| Runtime | Node.js 22 LTS on Linux |
| Pricing tier | F1 Free, one instance |

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

Unit tests cover private game state, chain rotation, host controls, drawing validation, scoring, and timed rounds. Browser tests use separate player contexts to play both games from start to finish, test reconnects and leaving, check shared drawing/undo, and verify the mobile layout. Browser tests use installed Microsoft Edge; change `channel` in `playwright.config.js` if using another Playwright browser.

To test an already running server on port 3001 from PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3001"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Setting `PLAYWRIGHT_BASE_URL` uses that server without starting the development server.

The game names, illustrations, and interface are original, inspired by drawing telephone and drawing-and-guessing party game formats.
