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

For friends on the same network, use this computer's LAN IP in place of localhost. The host must be reachable and Windows Firewall must allow the server. For internet play, see [Hosting](#hosting) below and share the public URL.

## Production

```sh
npm run build
npm start
```

The server serves the built app and game connections on **http://localhost:3001** (or `PORT`). Rooms are stored in memory, support a single server instance, and reset when the server restarts. Disconnected players have 30 seconds to reconnect; otherwise they leave the room. This first version has no accounts or persistent history.

## Hosting

The app is live at **https://game-night.azurewebsites.net**.

It runs as a single always-on Azure App Service instance. Invite links are generated from the browser's current origin, so they automatically use the Azure URL with no configuration.

| | |
|---|---|
| **URL** | https://game-night.azurewebsites.net |
| **Cloud** | Azure App Service (Linux) |
| **Subscription** | Visual Studio Enterprise Subscription (`Default Directory` tenant) |
| **Resource group** | `rg-game-night` |
| **App name** | `game-night` |
| **App Service plan** | `asp-game-night`, SKU **B1**, always-on |
| **Region** | **centralus** |
| **Runtime** | Node 24 LTS, started with `npm start` |
| **Health check** | `/api/health` |

The plan is in `centralus` rather than a coastal region because the subscription has **no B1 quota in eastus or westus2**. If you recreate this elsewhere, expect to hunt for a region with quota.

Resource IDs are intentionally not recorded here. Run `az account show` to get the subscription and tenant IDs.

### Redeploying after a change

```powershell
cd <repo root>
Compress-Archive -Path index.html,package.json,package-lock.json,vite.config.js,server,src,public -DestinationPath deploy.zip -Force
az webapp deploy --resource-group rg-game-night --name game-night --src-path deploy.zip --type zip
```

App Service builds the app server-side (`npm install` then `npm run build`) because `SCM_DO_BUILD_DURING_DEPLOYMENT=true`, then starts it with `npm start`. Do not include `node_modules` or `dist` in the zip.

Nothing deploys automatically. Editing code locally — or pushing to GitHub — does **not** change the live site until you run the command above. A deploy takes roughly 5–8 minutes, almost all of it the server-side `npm install` and Vite build, and it restarts the container at the end, which ends any games in progress.

The deploy command may report a `504 GatewayTimeout` while the server-side build is still running. That is the status poll timing out, not a failed deploy. Check the real result with:

```powershell
az webapp log deployment show --resource-group rg-game-night --name game-night
```

### Configuration that matters

- **WebSockets must stay enabled.** App Service disables them by default, and Socket.IO silently degrades to slow HTTP long-polling without them.
- **Always On is enabled** so the container is not unloaded while idle.

```powershell
az webapp config set --resource-group rg-game-night --name game-night --web-sockets-enabled true --always-on true --startup-file "npm start"
```

### Keep it to one instance

Rooms live in memory, so do not scale out. Two instances would split players across servers that cannot see each other. Every deploy or restart also ends in-progress games and returns players to the lobby.

### Cost

The B1 plan is roughly $12–13/month and is the only meaningful charge. To stop billing without deleting anything, stop the app (`az webapp stop`); to remove everything, delete the group:

```powershell
az group delete --name rg-game-night
```


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
