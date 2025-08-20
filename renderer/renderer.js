const container = document.getElementById('container');
const statusEl = document.getElementById('status');
const srcEl = document.getElementById('src');
const dstEl = document.getElementById('dst');
const langSel = document.getElementById('lang');

function resizeToFit() {
  requestAnimationFrame(() => {
    const rect = container.getBoundingClientRect();
    window.electronAPI.resizePopup({ width: Math.ceil(rect.width + 2), height: Math.ceil(rect.height + 2) });
  });
}
async function init() {
  const settings = await window.electronAPI.getSettings();
  langSel.value = settings.targetLang || 'en';
  resizeToFit();
}
langSel.addEventListener('change', () => {
  window.electronAPI.updateSettings({ targetLang: langSel.value });
});
window.electronAPI.onTranslationUpdate((payload) => {
  if (!payload) return;
  if (payload.status === 'loading') {
    statusEl.textContent = `Translating (${payload.from} → ${payload.to})…`;
    srcEl.textContent = payload.src || '';
    dstEl.textContent = '';
    container.classList.add('loading');
  } else if (payload.status === 'done') {
    statusEl.textContent = `Translation (${payload.from} → ${payload.to})`;
    srcEl.textContent = payload.src || '';
    dstEl.textContent = payload.dst || '';
    container.classList.remove('loading');
  } else {
    statusEl.textContent = 'Ready';
  }
  resizeToFit();
});
init();