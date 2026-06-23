const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let agentProcess = null;
const configPath = path.join(app.getPath('userData'), 'agent-config.json');
const serverPath = path.join(__dirname, 'server.js');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 680,
    resizable: false,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (e) => {
    if (agentProcess) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('iRacing Telemetry Agent');

  const ctxMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow?.show() },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(ctxMenu);

  tray.on('double-click', () => mainWindow?.show());
}

// ─── IPC Handlers ────────────────────────────────────────────

ipcMain.handle('load-config', () => {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch {}
  return { relayUrl: 'ws://localhost:3000/ws/telemetry/agent', driverId: '', token: '' };
});

ipcMain.handle('save-config', (_e, cfg) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
    return true;
  } catch { return false; }
});

let onAgentStdout = null;
let onAgentStderr = null;
let onAgentExit = null;

function safeSend(channel, ...args) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
    }
  } catch { /* webContents destroyed */ }
}

function detachAgentListeners() {
  if (!agentProcess) return;
  if (onAgentStdout) agentProcess.stdout?.removeListener('data', onAgentStdout);
  if (onAgentStderr) agentProcess.stderr?.removeListener('data', onAgentStderr);
  if (onAgentExit) agentProcess.removeListener('exit', onAgentExit);
  onAgentStdout = null;
  onAgentStderr = null;
  onAgentExit = null;
}

ipcMain.handle('start-agent', async (_e, cfg) => {
  if (agentProcess) return 'already-running';

  const args = [
    serverPath,
    `--relay=${cfg.relayUrl}`,
    `--driver=${cfg.driverId}`,
    `--token=${cfg.token}`,
  ];

  agentProcess = spawn('node', args, {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  onAgentStdout = (data) => {
    safeSend('agent-log', data.toString());
  };
  agentProcess.stdout.on('data', onAgentStdout);

  onAgentStderr = (data) => {
    safeSend('agent-log', `ERR: ${data.toString()}`);
  };
  agentProcess.stderr.on('data', onAgentStderr);

  onAgentExit = (code) => {
    safeSend('agent-status', 'stopped');
    safeSend('agent-log', `Process exited (code ${code})`);
    agentProcess = null;
    onAgentStdout = null;
    onAgentStderr = null;
    onAgentExit = null;
  };
  agentProcess.on('exit', onAgentExit);

  safeSend('agent-status', 'running');
  return 'started';
});

ipcMain.handle('stop-agent', () => {
  if (agentProcess) {
    detachAgentListeners();
    agentProcess.kill();
    agentProcess = null;
    return 'stopped';
  }
  return 'not-running';
});

ipcMain.handle('get-agent-status', () => {
  return agentProcess ? 'running' : 'stopped';
});

ipcMain.handle('minimize-to-tray', () => {
  mainWindow?.hide();
});

ipcMain.handle('close-app', () => {
  if (agentProcess) {
    agentProcess.kill();
  }
  app.isQuitting = true;
  app.quit();
});

// ─── App lifecycle ───────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (!app.isQuitting) {
      // Keep running in tray
    } else {
      app.quit();
    }
  }
});

app.on('before-quit', () => {
  if (agentProcess) {
    detachAgentListeners();
    agentProcess.kill();
    agentProcess = null;
  }
});
