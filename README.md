# parts-tel-desktop

Windows desktop app (Electron) for sending iRacing telemetry to RaceStrategist.

Runs `server.js` + `sdk-worker.js` as a child process and relays telemetry data to the RaceStrategist backend via HTTP POST.

## Features

- **Graphical UI** — Configure relay URL, driver name, and agent token without CLI
- **System Tray** — Minimizes to tray with connection status indicator
- **Auto-Reconnect** — Child process restarts automatically if it crashes
- **Live Log** — Real-time console output from the SDK worker

## Usage

### Option A: Desktop App (recommended)

```bash
npm start
```

Fill in the fields and click **CONNECT**. The agent will start sending telemetry to the configured relay.

### Option B: CLI only (without GUI)

```bash
node server.js --relay=wss://your-server.com/ws/telemetry/agent --driver=MyName --token=at_xxx
```

## Config persistence

Settings are saved to `%APPDATA%/parts-tel-desktop/agent-config.json`.

## Building standalone .exe

```bash
npm run build
```

Output in `dist/` using electron-builder (config in `build.config.json`).

## How it works

```
iRacing (Sim)
  → sdk-worker.js (reads telemetry via irsdk-node)
  → server.js (agent, sends HTTP POST every 200ms)
  → RaceStrategist backend (/api/telemetry/ingest)
  → Web browser (live telemetry panel)
```
