# Car-DJ — Part 1A

Multiplayer loop-jamming grid. Up to 4 people share a room and toggle clip slots in real time.

## Run locally

```bash
npm install
npm run dev
```

This starts both servers concurrently:
- **Vite** (client) → http://localhost:5173
- **PartyKit** (WebSocket server) → http://localhost:1999

## Test with two tabs

1. Open http://localhost:5173 in Tab A.
2. Enter a display name and click **Create new room** — note the 5-character code.
3. Open http://localhost:5173 in Tab B.
4. Enter a different name, paste the room code, click **Join**.
5. Both tabs show the same grid. Clicking any slot syncs instantly to the other tab.
6. A 5th connection to the same room gets a "Room full" message.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run client + PartyKit server together |
| `npm run dev:client` | Vite only |
| `npm run dev:party` | PartyKit only |
| `npm run build` | Production Vite build |
