// js/admin.js — Admin 後台邏輯
import { TEAMS, GROUPS } from './data.js';

const STAGE_NAMES = ['32強', '16強', '8強', '4強', '決賽', '冠軍'];
const STAGE_SIZES = [32, 16, 8, 4, 2, 1];

let currentResults = [[], [], [], [], [], []];

let adminToken = null;   // = ADMIN_PASSWORD_HASH（sha256 of admin password）

// ── SHA-256 ────────────────────────────────────────────
async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Toast 提示 ──────────────────────────────────────────
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.borderColor = isError ? '#ef4444' : '#0ea5e9';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ── API Helper ──────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`/api/${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Login ───────────────────────────────────────────────
document.getElementById('admin-login-btn').addEventListener('click', doLogin);
document.getElementById('admin-pw').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const pw = document.getElementById('admin-pw').value.trim();
  if (!pw) return;
  const hash = await sha256hex(pw);
  adminToken = hash;

  // 用 listRooms 驗證 token 是否正確
  try {
    await api('GET', 'list-rooms');
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-ui').classList.remove('hidden');
    init();
  } catch {
    document.getElementById('admin-pw-error').classList.remove('hidden');
    adminToken = null;
  }
}

document.getElementById('btn-logout-admin').addEventListener('click', () => {
  adminToken = null;
  location.reload();
});

// ── Init ────────────────────────────────────────────────
async function init() {
  await Promise.all([loadRooms(), loadResultsForm()]);
}

// ── ① 房間管理 ──────────────────────────────────────────
async function loadRooms() {
  const wrap = document.getElementById('rooms-table-wrap');
  try {
    const roomsList = await api('GET', 'list-rooms');
    const select = document.getElementById('pred-room-select');
    // 更新房間下拉
    select.innerHTML = '<option value="">選擇房間…</option>' +
      roomsList.map(r => `<option value="${r.roomId}">${r.name}（${r.roomId}）</option>`).join('');

    if (roomsList.length === 0) {
      wrap.innerHTML = '<p class="text-slate-400 text-sm">尚無房間，請在下方新增。</p>';
      return;
    }
    wrap.innerHTML = `
      <table>
        <thead><tr>
          <th>顯示名稱</th><th>房間 ID</th><th>建立時間</th><th></th>
        </tr></thead>
        <tbody>
          ${roomsList.map(r => `
            <tr>
              <td class="font-semibold">${esc(r.name)}</td>
              <td><span class="tag bg-cyan-900 text-cyan-200">${esc(r.roomId)}</span></td>
              <td class="text-slate-400 text-sm">${new Date(r.createdAt).toLocaleString('zh-TW')}</td>
              <td>
                <button onclick="deleteRoom('${esc(r.id)}')" class="btn btn-danger text-xs py-1 px-3">刪除</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    wrap.innerHTML = `<p class="text-red-400">載入失敗：${e.message}</p>`;
  }
}

document.getElementById('btn-create-room').addEventListener('click', async () => {
  const pw   = document.getElementById('new-room-pw').value.trim();
  const id   = document.getElementById('new-room-id').value.trim().toLowerCase();
  const name = document.getElementById('new-room-name').value.trim();
  const err  = document.getElementById('room-error');

  if (!pw || !id || !name) { err.textContent = '❌ 請填寫全部欄位'; err.classList.remove('hidden'); return; }
  if (!/^[a-z0-9_-]{2,20}$/.test(id)) { err.textContent = '❌ 房間 ID 只能小寫英數 _-，2–20 字元'; err.classList.remove('hidden'); return; }
  err.classList.add('hidden');

  try {
    await api('POST', 'add-room', { password: pw, roomId: id, name });
    document.getElementById('new-room-pw').value = '';
    document.getElementById('new-room-id').value = '';
    document.getElementById('new-room-name').value = '';
    toast('✅ 房間建立成功');
    await loadRooms();
  } catch (e) { toast(`❌ ${e.message}`, true); }
});

window.deleteRoom = async function(hash) {
  if (!confirm('確定要刪除這個房間嗎？（不會刪除玩家預測）')) return;
  try {
    await api('DELETE', `del-room?hash=${encodeURIComponent(hash)}`);
    toast('🗑️ 房間已刪除');
    await loadRooms();
  } catch (e) { toast(`❌ ${e.message}`, true); }
};

// ── ② 賽果管理 ──────────────────────────────────────────
async function loadResultsForm() {
  try {
    const data = await fetch('/api/results').then(r => r.json());
    if (Array.isArray(data)) currentResults = data;
  } catch {}
  renderResultsForm();
}

function renderResultsForm() {
  const form = document.getElementById('results-form');
  form.innerHTML = '';
  for (let i = 0; i < 6; i++) form.appendChild(buildStageSection(i));
}

function buildStageSection(stageIdx) {
  const name = STAGE_NAMES[stageIdx];
  const size = STAGE_SIZES[stageIdx];
  const selected = new Set(currentResults[stageIdx] || []);
  const count = selected.size;

  // 可選隊伍：第0階段全部48隊；之後只顯示上一階段的晉級隊伍
  let availableTeams = [];
  if (stageIdx === 0) {
    availableTeams = TEAMS;
  } else {
    availableTeams = (currentResults[stageIdx - 1] || [])
      .map(code => TEAMS.find(t => t.code === code)).filter(Boolean);
  }

  const countColor = count === size ? 'text-green-400' : count > 0 ? 'text-orange-400' : 'text-slate-400';

  const section = document.createElement('div');
  section.className = 'border border-slate-700 rounded-lg p-4';

  // 標題列
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-3';
  header.innerHTML = `
    <div class="flex items-center gap-3">
      <h3 class="font-bold text-white">▶ ${name}（應選 ${size} 隊）</h3>
      <span class="text-sm ${countColor}" id="stage-count-${stageIdx}">${count} / ${size} 已選</span>
    </div>
    <button class="btn btn-primary text-sm py-1 px-3" onclick="saveStage(${stageIdx})">儲存 ${name}</button>
  `;
  section.appendChild(header);

  // 勾選區
  const body = document.createElement('div');
  if (stageIdx > 0 && availableTeams.length === 0) {
    body.innerHTML = `<p class="text-slate-500 text-sm">⬆️ 請先儲存「${STAGE_NAMES[stageIdx - 1]}」的晉級隊伍</p>`;
  } else if (stageIdx === 0) {
    // 按組別分開顯示
    GROUPS.forEach(g => {
      const groupTeams = TEAMS.filter(t => t.group === g);
      const groupWrap = document.createElement('div');
      groupWrap.className = 'mb-2';
      groupWrap.innerHTML = `<div class="text-xs text-slate-500 font-bold mb-1">分組 ${g}</div>`;
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-2 sm:grid-cols-4 gap-1';
      groupTeams.forEach(team => grid.appendChild(makeCheckbox(stageIdx, team, selected.has(team.code))));
      groupWrap.appendChild(grid);
      body.appendChild(groupWrap);
    });
  } else {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 sm:grid-cols-4 gap-1';
    availableTeams.forEach(team => grid.appendChild(makeCheckbox(stageIdx, team, selected.has(team.code))));
    body.appendChild(grid);
  }
  section.appendChild(body);
  return section;
}

function makeCheckbox(stageIdx, team, checked) {
  const label = document.createElement('label');
  label.className = 'flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-slate-700/50 transition-colors';
  label.innerHTML = `
    <input type="checkbox" data-stage="${stageIdx}" data-code="${team.code}"
           ${checked ? 'checked' : ''} class="w-4 h-4 accent-cyan-500 cursor-pointer"
           onchange="updateStageCount(${stageIdx})" />
    <img src="https://flagcdn.com/w20/${team.iso2}.png" class="w-5 h-3.5 object-cover rounded-sm" onerror="this.style.display='none'" />
    <span class="text-sm text-slate-200">${team.name}</span>
  `;
  return label;
}

function updateStageCount(stageIdx) {
  const count = document.querySelectorAll(`input[data-stage="${stageIdx}"]:checked`).length;
  const size = STAGE_SIZES[stageIdx];
  const el = document.getElementById(`stage-count-${stageIdx}`);
  if (!el) return;
  el.textContent = `${count} / ${size} 已選`;
  el.className = `text-sm ${count === size ? 'text-green-400' : count > 0 ? 'text-orange-400' : 'text-slate-400'}`;
}

async function saveStage(stageIdx) {
  currentResults[stageIdx] = Array.from(
    document.querySelectorAll(`input[data-stage="${stageIdx}"]:checked`)
  ).map(cb => cb.dataset.code);

  try {
    await api('POST', 'save-results', { stageResults: currentResults });
    toast(`✅ ${STAGE_NAMES[stageIdx]} 賽果已儲存`);
    // 重新渲染下一階段（更新可選隊伍）
    renderResultsForm();
  } catch (e) { toast(`❌ ${e.message}`, true); }
}

// ES module 中 onclick 需掛到 window
window.saveStage = saveStage;
window.updateStageCount = updateStageCount;

// ── ③ 玩家預測查看 ──────────────────────────────────────
document.getElementById('btn-load-preds').addEventListener('click', loadPredictions);

async function loadPredictions() {
  const roomId = document.getElementById('pred-room-select').value;
  const wrap   = document.getElementById('preds-table-wrap');
  if (!roomId) { wrap.innerHTML = '<p class="text-slate-400 text-sm">請先選擇房間</p>'; return; }

  try {
    const preds = await api('GET', `list-preds?roomId=${encodeURIComponent(roomId)}`);
    if (preds.length === 0) { wrap.innerHTML = '<p class="text-slate-400 text-sm">此房間尚無預測</p>'; return; }

    wrap.innerHTML = `
      <p class="text-slate-400 text-sm mb-2">共 ${preds.length} 人已提交預測</p>
      <table>
        <thead><tr>
          <th>代號</th><th>顯示名稱</th><th>提交時間</th>
          ${STAGE_NAMES.map(n => `<th>${n}</th>`).join('')}
          <th>操作</th>
        </tr></thead>
        <tbody>
          ${preds.map(p => `
            <tr>
              <td class="text-cyan-300">${esc(p.alias)}</td>
              <td class="font-semibold">${esc(p.userName)}</td>
              <td class="text-slate-400 text-xs">${new Date(p.submittedAt).toLocaleString('zh-TW')}</td>
              ${(p.picks || []).map(stage => `<td class="text-xs text-slate-300">${(stage||[]).join(', ')}</td>`).join('')}
              <td><button onclick="deletePrediction('${esc(p.id)}','${esc(p.roomId)}')" class="btn btn-danger text-xs py-1 px-2">刪除</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) { wrap.innerHTML = `<p class="text-red-400">載入失敗：${e.message}</p>`; }
}

// ── 刪除使用者預測 ──────────────────────────────────────
window.deletePrediction = async function(id, roomId) {
  if (!confirm(`確定要刪除這筆預測嗎？（此人可重新提交）`)) return;
  try {
    await api('DELETE', `del-pred?id=${encodeURIComponent(id)}&roomId=${encodeURIComponent(roomId)}`);
    toast('🗑️ 預測已刪除');
    await loadPredictions();
  } catch (e) { toast(`❌ ${e.message}`, true); }
};

// ── XSS escape ──────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
