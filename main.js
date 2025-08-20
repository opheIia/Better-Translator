const { app, BrowserWindow, clipboard, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');
const os = require('os');
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

let nodeFetch = null;
try {
  if (typeof fetch !== 'function') {
    nodeFetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  }
} catch (_) {
  nodeFetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}
const doFetch = async (...args) => {
  if (typeof fetch === 'function') return fetch(...args);
  return nodeFetch(...args);
};
let popup;
let lastClipboardText = '';
let targetLang = 'en';
let polling = true;
let pollIntervalMs = 600;
let minChars = 2;
let lastActionAt = 0;
const cooldownMs = 450;
function createPopup() {
  popup = new BrowserWindow({
    width: 360,
    height: 160,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  popup.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  popup.on('blur', () => {
  });
}
async function translateText(text, targetLang = "en") {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map(item => item[0]).join(" ");
  } catch (err) {
    console.error("Translation error:", err);
    return "Translation failed";
  }
}
function movePopupNearCursor() {
  try {
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const { width, height, x, y } = display.workArea;
    const offsetX = 16;
    const offsetY = 24;
    let nx = point.x + offsetX;
    let ny = point.y + offsetY;
    const bw = popup.getBounds().width;
    const bh = popup.getBounds().height;
    if (nx + bw > x + width) nx = (x + width) - bw - 8;
    if (ny + bh > y + height) ny = (y + height) - bh - 8;
    if (nx < x) nx = x + 8;
    if (ny < y) ny = y + 8;
    popup.setPosition(nx, ny, true);
  } catch (_) {
  }
}
function startClipboardPolling() {
  setInterval(async () => {
    if (!polling) return;
    const now = Date.now();
    if (now - lastActionAt < cooldownMs) return;
    const txt = clipboard.readText().trim();
    if (!txt || txt.length < minChars) return;
    if (txt === lastClipboardText) return;
    lastClipboardText = txt;
    lastActionAt = now;
    if (popup) {
      if (!popup.isVisible()) {
        movePopupNearCursor();
      }
      popup.showInactive();
      popup.webContents.send('translation:update', {
        status: 'loading',
        src: txt,
        dst: '',
        from: 'auto',
        to: targetLang
      });
    }
    const translated = await translateText(txt, targetLang);
    if (popup) {
      popup.webContents.send('translation:update', {
        status: 'done',
        src: txt,
        dst: translated,
        from: 'auto',
        to: targetLang
      });
    }
  }, pollIntervalMs);
}
app.whenReady().then(() => {
  createPopup();
  startClipboardPolling();
  ipcMain.handle('settings:get', () => ({
    targetLang,
    pollIntervalMs,
    minChars,
  }));
  ipcMain.on('settings:update', (_evt, payload) => {
    if (payload?.targetLang) targetLang = payload.targetLang;
    if (typeof payload?.pollIntervalMs === 'number') pollIntervalMs = Math.max(200, payload.pollIntervalMs);
    if (typeof payload?.minChars === 'number') minChars = Math.max(1, payload.minChars);
  });
  ipcMain.on('popup:resize', (_evt, size) => {
    if (!popup || !size) return;
    const maxWidth = 420;
    const maxHeight = 260;
    const w = Math.min(maxWidth, Math.max(280, size.width || 360));
    const h = Math.min(maxHeight, Math.max(60, size.height || 160));
    popup.setSize(w, h);
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPopup();
    }
  });
});
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
  } else {
  }
});