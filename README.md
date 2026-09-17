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

Live at **https://game-night.azurewebsites.net** on Azure App Service.

| | |
|---|---|
| Resource group | `rg-game-night` |
| App name | `game-night` |
| Plan | `asp-game-night`, B1, always-on |
| Region | `centralus` |
| Runtime | Node 24 LTS, `npm start` |
| Health check | `/api/health` |

### Redeploy

```powershell
Compress-Archive -Path index.html,package.json,package-lock.json,vite.config.js,server,src,public -DestinationPath deploy.zip -Force
az webapp deploy --resource-group rg-game-night --name game-night --src-path deploy.zip --type zip
```

App Service runs `npm install` and `npm run build` server-side, so leave `node_modules` and `dist` out of the zip. Nothing deploys automatically — pushing to GitHub does not update the live site. A deploy takes 5–8 minutes and restarts the app, ending games in progress.

A `504 GatewayTimeout` from the deploy command is the status poll giving up while the build runs, not a failure. Check the real result:

```powershell
az webapp log deployment show --resource-group rg-game-night --name game-night
```

### Gotchas

- **WebSockets must stay enabled.** App Service disables them by default and Socket.IO silently falls back to long-polling.
- **Keep one instance.** Rooms are in memory and are not shared between instances.
- **No B1 quota in eastus or westus2** on this subscription, hence `centralus`.

```powershell
az webapp config set --resource-group rg-game-night --name game-night --web-sockets-enabled true --always-on true --startup-file "npm start"
```

### Cost

The B1 plan is ~$12–13/month and bills whether or not the app is running — stopping the app does not stop charges, since the plan is the billed resource. To stop paying, delete the group:

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
