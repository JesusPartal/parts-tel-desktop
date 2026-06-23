const $ = (id) => document.getElementById(id);
const relayUrl = $('relayUrl');
const driverId = $('driverId');
const token = $('token');
const btnStart = $('btnStart');
const btnStop = $('btnStop');
const btnClose = $('btnClose');
const btnMinimize = $('btnMinimize');
const btnToggleToken = $('btnToggleToken');
const btnClearLog = $('btnClearLog');
const statusDot = $('statusDot');
const statusText = $('statusText');
const driverBadge = $('driverBadge');
const logBox = $('logBox');
let tokenVisible = false;
let config = {};

(async function init() {
  config = await window.api.loadConfig();
  relayUrl.value = config.relayUrl || 'ws://localhost:3000/ws/telemetry/agent';
  driverId.value = config.driverId || '';
  token.value = config.token || '';

  const st = await window.api.getAgentStatus();
  if (st === 'running') setStatus('connected');

  window.api.onAgentLog((msg) => addLog(msg));
  window.api.onAgentStatus((status) => {
    setStatus(status === 'running' ? 'connected' : 'stopped');
  });
})();

function setStatus(state) {
  statusDot.className = 'status-dot ' + state;
  if (state === 'connected') {
    statusText.textContent = 'Connected';
    driverBadge.style.display = config.driverId ? '' : 'none';
    if (config.driverId) driverBadge.textContent = config.driverId;
    btnStart.style.display = 'none';
    btnStop.style.display = '';
  } else if (state === 'connecting') {
    statusText.textContent = 'Connecting...';
    driverBadge.style.display = 'none';
  } else {
    statusText.textContent = 'Stopped';
    driverBadge.style.display = 'none';
    btnStart.style.display = '';
    btnStop.style.display = 'none';
  }
}

function addLog(msg) {
  const ph = logBox.querySelector('.log-placeholder');
  if (ph) ph.remove();

  const div = document.createElement('div');
  div.className = 'log-entry';
  if (msg.startsWith('ERR:')) {
    div.classList.add('error');
    msg = msg.replace(/^ERR:\s*/, '');
  } else if (/connected/i.test(msg)) {
    div.classList.add('info');
  }
  div.textContent = msg;
  logBox.appendChild(div);
  logBox.scrollTop = logBox.scrollHeight;
}

function clearLog() {
  logBox.innerHTML = '<div class="log-placeholder">Log cleared.</div>';
}

function readForm() {
  return {
    relayUrl: relayUrl.value.trim(),
    driverId: driverId.value.trim(),
    token: token.value.trim(),
  };
}

function toggleToken() {
  tokenVisible = !tokenVisible;
  token.type = tokenVisible ? 'text' : 'password';
}

async function startAgent() {
  config = readForm();
  if (!config.relayUrl || !config.driverId || !config.token) {
    addLog('ERR: Fill Relay URL, Driver ID and Token');
    return;
  }

  setStatus('connecting');
  const result = await window.api.startAgent(config);
  if (result === 'started' || result === 'already-running') {
    addLog('Agent started');
    window.api.saveConfig(config);
  } else {
    addLog('ERR: ' + result);
    setStatus('stopped');
  }
}

async function stopAgent() {
  await window.api.stopAgent();
}

btnStart.addEventListener('click', startAgent);
btnStop.addEventListener('click', stopAgent);
btnClose.addEventListener('click', () => window.api.closeApp());
btnMinimize.addEventListener('click', () => window.api.minimizeToTray());
btnToggleToken.addEventListener('click', toggleToken);
btnClearLog.addEventListener('click', clearLog);
