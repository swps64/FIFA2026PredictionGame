// app.js - 主流程：分頁切換、用戶名稱、提交

import { loadDraft, saveDraft, loadUser, saveUser, loadProfile, saveProfile } from './draft.js';
import { initPicker, getPicksArray, isComplete, getValidationErrors, onPicksChanged, resetPicks, randomPicks } from './picker.js';
import { LOCK_TIME, TEAMS, STAGE_NAMES, STAGE_SIZES, STAGE_POINTS } from './data.js';
import { calcScore } from './scoring.js';

// ───────────────── 初始化 ─────────────────
document.addEventListener('DOMContentLoaded', () => {
  promptUser();
  initTabs();
  checkLockStatus();

  document.getElementById('btn-random-picks')?.addEventListener('click', () => {
    if (isLocked()) return;
    const compliments = [
      '哇！您的選擇充滿了宇宙級的隨機智慧，連 AI 都甘拜下風 🤖',
      '根據最新量子力學運算，這組預測有 0.01% 的機率完全正確！',
      '球探界失去了一位天才，隨機界多了一位宗師 🎯',
      '就算猴子亂射飛鏢也能中幾個，但你不一樣——你有系統地亂 🐒',
      '這份預測已獲得「最具創意獎」，理由：人類無法理解 🏆',
      '您的選擇打破了足球界所有定律，物理學家正在開緊急會議 🔬',
      '恭喜！您成功選出了一組讓教練直接辭職的陣容 👏',
      '大膽！霸氣！完全不在乎！這才是真正的世界盃精神 💪',
    ];
    const msg = compliments[Math.floor(Math.random() * compliments.length)];
    randomPicks('picker-container');
    showModal('🎲 神祕力量已降臨', msg);
  });

  document.getElementById('btn-reset-picks')?.addEventListener('click', () => {
    if (isLocked()) return;
    if (!confirm('確定要清除所有已選的隊伍嗎？')) return;
    resetPicks('picker-container');
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (!confirm('確定要登出嗎？\n（預測草稿會保留，下次用同樣代號登入可繼續）')) return;
    localStorage.removeItem('wc2026_user');
    location.reload();
  });
});

// ───────────────── 用戶登入 ─────────────────
function promptUser() {
  const user = loadUser();
  if (user) {
    document.getElementById('user-display').textContent = user.nickname;
    loadPickerTab();
    return;
  }

  const modal = document.getElementById('modal-name');
  modal.classList.remove('hidden');

  // ─ Step 1：通關密語 ─
  const pwInput  = document.getElementById('input-password');
  const pwError  = document.getElementById('password-error');
  let currentRoomId = null;

  async function checkPassword() {
    const val = pwInput.value.trim().toUpperCase();
    if (!val) { pwError.classList.remove('hidden'); pwInput.focus(); return; }
    try {
      const res = await fetch('/api/validate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: val }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      currentRoomId = data.roomId;
    } catch {
      pwError.classList.remove('hidden');
      pwInput.focus();
      return;
    }
    pwError.classList.add('hidden');
    document.getElementById('modal-step-password').classList.add('hidden');
    document.getElementById('modal-step-alias').classList.remove('hidden');
    document.getElementById('input-alias').focus();
  }
  document.getElementById('btn-check-password').addEventListener('click', () => checkPassword());
  pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkPassword(); });

  // ─ Step 2：輸入代號 ─
  const aliasInput      = document.getElementById('input-alias');
  const aliasError      = document.getElementById('alias-error');
  const returningBox    = document.getElementById('alias-returning');
  const returningName   = document.getElementById('alias-returning-name');

  // 即時顯示是否為舊用戶（本機 localStorage）
  aliasInput.addEventListener('input', () => {
    const alias = aliasInput.value.trim();
    const profile = /^[A-Za-z0-9_-]{2,20}$/.test(alias) ? loadProfile(alias) : null;
    if (profile) {
      returningName.textContent = `你的顯示名稱：${profile.nickname}，預測紀錄將自動帶入`;
      returningBox.classList.remove('hidden');
    } else {
      returningBox.classList.add('hidden');
    }
  });

  async function goToNextFromAlias() {
    const alias = aliasInput.value.trim();
    if (!alias) {
      aliasError.textContent = '❌ 請輸入代號';
      aliasError.classList.remove('hidden');
      return;
    }
    if (!/^[A-Za-z0-9_-]{2,20}$/.test(alias)) {
      aliasError.textContent = '❌ 代號只能用英文、數字、_ 或 -，長度 2–20 字元';
      aliasError.classList.remove('hidden');
      return;
    }
    aliasError.classList.add('hidden');

    // 先查本機 localStorage
    const localProfile = loadProfile(alias);

    // 再查伺服器：此 alias 在此房間是否已有提交紀錄
    let serverNickname = null;
    let serverPicks = null;
    try {
      const res = await fetch(`/api/predictions?roomId=${encodeURIComponent(currentRoomId)}&alias=${encodeURIComponent(alias)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.userName) {
          serverNickname = data.userName;
          serverPicks = data.picks || null;
        }
      }
    } catch { /* 網路錯誤時 fallback 到本機判斷 */ }

    if (serverNickname) {
      // 伺服器有此 alias 的提交紀錄 → 視為回頭用戶，採用 DB 裡的暱稱（防止暱稱被竄改）
      const nickname = serverNickname;
      saveProfile(alias, nickname);
      saveUser({ alias, nickname, roomId: currentRoomId });
      if (serverPicks) saveDraft(serverPicks);  // 把伺服器的 picks 存到本機草稿
      document.getElementById('user-display').textContent = nickname;
      modal.classList.add('hidden');
      loadPickerTab();
      showModal(`👋 歡迎回來，${nickname}！`, '你的預測草稿已自動載入，可以繼續修改或重新提交。');
    } else if (localProfile) {
      // 本機有紀錄但伺服器無提交（曾登入但未提交）→ 允許繼續
      saveProfile(alias, localProfile.nickname);
      saveUser({ alias, nickname: localProfile.nickname, roomId: currentRoomId });
      document.getElementById('user-display').textContent = localProfile.nickname;
      modal.classList.add('hidden');
      loadPickerTab();
      showModal(`👋 歡迎回來，${localProfile.nickname}！`, '找到你的本機紀錄，繼續填寫預測吧！');
    } else {
      // 全新用戶：進到暱稱步驟
      document.getElementById('modal-step-alias').classList.add('hidden');
      document.getElementById('modal-step-nickname').classList.remove('hidden');
      document.getElementById('input-nickname').focus();
    }
  }
  document.getElementById('btn-alias-next').addEventListener('click', goToNextFromAlias);
  aliasInput.addEventListener('keydown', e => { if (e.key === 'Enter') goToNextFromAlias(); });

  // ─ Step 3：新用戶設定暱稱 ─
  const nickInput  = document.getElementById('input-nickname');
  const regError   = document.getElementById('register-error');

  function doRegister() {
    const alias    = aliasInput.value.trim();
    const nickname = nickInput.value.trim();
    if (!nickname) {
      regError.textContent = '❌ 請填寫顯示名稱';
      regError.classList.remove('hidden');
      return;
    }
    if (nickname.length > 20 || /[<>"'`]/.test(nickname)) {
      regError.textContent = '❌ 不可含特殊符號（< > " \' `），最多 20 字';
      regError.classList.remove('hidden');
      nickInput.focus();
      return;
    }
    regError.classList.add('hidden');
    saveProfile(alias, nickname);
    saveUser({ alias, nickname, roomId: currentRoomId });
    document.getElementById('user-display').textContent = nickname;
    modal.classList.add('hidden');
    loadPickerTab();
  }
  document.getElementById('btn-save-name').addEventListener('click', doRegister);
  nickInput.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
}

// ───────────────── 分頁 ─────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      activateTab(target);
    });
  });
}

function activateTab(tabName) {
  // 更新按鈕樣式
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('tab-active', b.dataset.tab === tabName);
  });
  // 切換內容
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('hidden', p.id !== `panel-${tabName}`);
  });

  if (tabName === 'results') loadResultsTab();
  if (tabName === 'leaderboard') loadLeaderboardTab();
}

// ───────────────── 預測分頁 ─────────────────
function loadPickerTab() {
  const locked = isLocked();
  const savedPicks = loadDraft();
  initPicker('picker-container', savedPicks, locked);

  onPicksChanged((picks) => {
    updateSubmitButton();
    updateProgress(picks);
  });
  updateSubmitButton();

  submitBtns().forEach(btn => btn.addEventListener('click', handleSubmit));
}

function submitBtns() {
  return ['btn-submit', 'btn-submit-mobile'].map(id => document.getElementById(id)).filter(Boolean);
}

function isLocked() {
  return new Date() >= LOCK_TIME;
}

function checkLockStatus() {
  if (isLocked()) {
    document.getElementById('lock-banner').classList.remove('hidden');
    submitBtns().forEach(btn => {
      btn.disabled = true;
      btn.textContent = '已鎖定（比賽已開始）';
    });
    document.getElementById('btn-reset-picks')?.classList.add('hidden');
  }
}

function updateSubmitButton() {
  if (isLocked()) return;
  const complete = isComplete();
  submitBtns().forEach(btn => {
    btn.disabled = !complete;
    btn.classList.toggle('btn-primary', complete);
    btn.classList.toggle('btn-disabled', !complete);
  });
}

function updateProgress(picks) {
  const total = picks.reduce((sum, arr) => sum + arr.length, 0);
  const el = document.getElementById('progress-text');
  if (el) {
    const allSizes = [32, 16, 8, 4, 2, 1];
    const totalNeeded = allSizes.reduce((a, b) => a + b, 0);
    el.textContent = `進度：${total} / ${totalNeeded}`;
  }
}

// ───────────────── 提交 ─────────────────
async function handleSubmit() {
  const errors = getValidationErrors();
  if (errors.length > 0) {
    showModal('提交前請確認', errors.map(e => `• ${e}`).join('\n'));
    return;
  }

  const user  = loadUser();
  const picks = getPicksArray();

  const submission = {
    roomId:   user.roomId,
    alias:    user.alias,
    userName: user.nickname,
    picks,
  };

  try {
    const resp = await fetch('/api/predictions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(submission),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok) {
      showModal('提交成功！', `${user.nickname} 的預測已儲存。\n記得告訴朋友也來填！`);
      return;
    }
    throw new Error(data.error || `HTTP ${resp.status}`);
  } catch (e) {
    // API 不可用時 fallback 到 localStorage
    const key = `wc2026_submitted_${user.roomId}_${user.alias}`;
    localStorage.setItem(key, JSON.stringify({ ...submission, submittedAt: new Date().toISOString() }));
    showModal('已暫存！', `${user.nickname} 的預測已暫存於本機。\n部署後將同步至雲端。\n（${e.message}）`);
  }
}

// ───────────────── 結果分頁 ─────────────────
function loadResultsTab() {
  const container = document.getElementById('results-container');
  if (!container) return;
  container.innerHTML = '<p class="text-gray-500 text-sm py-8 text-center">載入中...</p>';

  getResults().then(actual => {
  const currentStage = actual.reduce((last, a, i) => a && a.length > 0 ? i : last, -1);

  container.innerHTML = '';

  // ── 標題列 ──
  const header = document.createElement('div');
  header.className = 'flex flex-wrap items-center gap-3 mb-5';
  header.innerHTML = `
    <h2 class="text-base font-bold text-white">⚽ 賽事晉級結果</h2>
    <span class="text-xs text-gray-500 flex-1">
      ${currentStage < 0 ? '比賽尚未開始，以下為預覽版面' : `目前進度：${STAGE_NAMES[currentStage]}出爐`}
    </span>
    <button id="btn-refresh-results" class="text-xs text-blue-400 hover:text-blue-300 underline">重新整理</button>
  `;
  container.appendChild(header);
  document.getElementById('btn-refresh-results')?.addEventListener('click', loadResultsTab);

  // ── 各階段區塊 ──
  STAGE_NAMES.forEach((name, i) => {
    const teams = actual[i] || [];
    const hasData = teams.length > 0;
    const isFuture = i > currentStage + 1;

    const section = document.createElement('div');
    section.className = 'mb-6';

    // 階段標題
    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center gap-3 mb-3';
    titleRow.innerHTML = `
      <span class="text-xs font-bold px-2 py-0.5 rounded-full ${hasData ? 'bg-green-700 text-green-200' : isFuture ? 'bg-gray-800 text-gray-600' : 'bg-yellow-900 text-yellow-400'}">
        ${hasData ? '✓ 已出爐' : isFuture ? '未到' : '進行中'}
      </span>
      <h3 class="text-sm font-bold ${hasData ? 'text-white' : 'text-gray-500'}">${name}（${STAGE_SIZES[i]} 隊）</h3>
      ${hasData ? `<span class="text-xs text-gray-500 ml-auto">${teams.length} 隊晉級</span>` : ''}
    `;
    section.appendChild(titleRow);

    if (!hasData) {
      const placeholder = document.createElement('div');
      placeholder.className = 'flex flex-wrap gap-2 pb-3 border-b border-gray-800';
      // 顯示空白佔位格
      for (let j = 0; j < STAGE_SIZES[i]; j++) {
        placeholder.innerHTML += `<span class="inline-flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-700" style="min-width:80px">—</span>`;
      }
      section.appendChild(placeholder);
    } else {
      const grid = document.createElement('div');
      grid.className = 'flex flex-wrap gap-2 pb-4 border-b border-gray-800';
      teams.forEach(code => {
        const team = teamByCode(code);
        if (!team) return;
        const iso = team.iso2.toLowerCase();
        const card = document.createElement('span');
        card.className = 'inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1.5 text-xs text-gray-200';
        card.innerHTML = `
          <img src="https://flagcdn.com/w40/${iso}.png" alt="${team.name}"
            style="width:22px;height:15px;object-fit:cover;border-radius:2px"
            onerror="this.style.visibility='hidden'">
          <span>${team.name}</span>
        `;
        grid.appendChild(card);
      });
      section.appendChild(grid);
    }

    container.appendChild(section);
  });
  }); // end getResults().then
}

// ───────────────── 排行榜分頁 ─────────────────

// 讀取本機所有已提交預測（僅当前房間）
function getLocalSubmissions() {
  const roomId = loadUser()?.roomId || 'default';
  const prefix = `wc2026_submitted_${roomId}_`;
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith(prefix)) continue;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data && data.userName && data.picks) entries.push(data);
    } catch { /* skip */ }
  }
  return entries;
}

// 取得隊伍物件
function teamByCode(code) {
  return TEAMS.find(t => t.code === code);
}

// 旗幟 img tag
function flagImg(code, size = 24) {
  const team = teamByCode(code);
  if (!team) return '';
  const iso = team.iso2.toLowerCase();
  return `<img src="https://flagcdn.com/w40/${iso}.png" alt="${team.name}"
    style="width:${size}px;height:${Math.round(size*0.7)}px;object-fit:cover;border-radius:2px;vertical-align:middle"
    onerror="this.style.visibility='hidden'">`;
}

// 渲染排行榜主體
function renderLeaderboard(container, entries, actual) {
  const myAlias = loadUser()?.alias;

  // 計算分數並排序
  const rows = entries.map(e => {
    const { stageScores, totalScore } = calcScore(e.picks, actual);
    // 向下相容：舊資料沒有 alias 欄位時用 userName 當 alias
    const alias = e.alias || e.userName;
    return { ...e, alias, stageScores, totalScore };
  }).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return (a.submittedAt || '').localeCompare(b.submittedAt || '');
  });

  // 計算名次（同分同名）
  let rank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].totalScore !== rows[i - 1].totalScore) rank = i + 1;
    rows[i].rank = rank;
  }

  const hasResults = actual && actual.some(a => a && a.length > 0);
  const totalPossible = STAGE_SIZES.reduce((s, n, i) => s + n * STAGE_POINTS[i], 0);

  // 各階段滿分列表（用於表頭）
  const stageMaxes = STAGE_SIZES.map((n, i) => n * STAGE_POINTS[i]);

  container.innerHTML = '';

  // ── 統計列 ──
  const statsBar = document.createElement('div');
  // 目前進行到哪個階段
  const currentStage = actual.reduce((last, a, i) => a && a.length > 0 ? i : last, -1);
  const stageLabel = currentStage < 0 ? '比賽尚未開始' : `${STAGE_NAMES[currentStage]}出爐`;

  statsBar.className = 'flex flex-col gap-2 mb-4 text-sm text-gray-400';
  statsBar.innerHTML = `
    <div class="flex flex-wrap gap-4 items-center">
      <span>👥 共 <strong class="text-white">${rows.length}</strong> 人已提交</span>
      <span>🎯 滿分 <strong class="text-yellow-300">${totalPossible}</strong> 分</span>
      <span class="${hasResults ? 'text-green-400' : 'text-gray-500'}">
        ${hasResults ? `⚽ 目前進度：${stageLabel}` : '📅 比賽尚未開始（6/11 開幕）'}
      </span>
      <button id="btn-refresh-lb" class="ml-auto text-xs text-blue-400 hover:text-blue-300 underline">重新整理</button>
    </div>
    <div class="hidden flex flex-wrap gap-2 items-center border-t border-gray-800 pt-2">
      <span class="text-gray-600 text-xs">DEV 模擬：</span>
      <button data-seed="players" class="dev-btn text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded">注入假玩家</button>
      <button data-seed="r32"  class="dev-btn text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded">32強出爐</button>
      <button data-seed="r16"  class="dev-btn text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded">16強出爐</button>
      <button data-seed="qf"   class="dev-btn text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded">8強出爐</button>
      <button data-seed="sf"   class="dev-btn text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded">4強出爐</button>
      <button data-seed="final" class="dev-btn text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded">決賽出爐</button>
      <button data-seed="champ" class="dev-btn text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded">冠軍揭曉</button>
      <button data-seed="clear-results" class="dev-btn text-xs bg-red-900 hover:bg-red-800 px-2 py-0.5 rounded">清除結果</button>
      <button data-seed="clear-players" class="dev-btn text-xs bg-red-900 hover:bg-red-800 px-2 py-0.5 rounded">清除假玩家</button>
    </div>
  `;
  container.appendChild(statsBar);

  document.getElementById('btn-refresh-lb')?.addEventListener('click', loadLeaderboardTab);
  statsBar.querySelectorAll('.dev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.seed;
      if (action === 'players') {
        if (typeof window.seedFakePlayers === 'function') window.seedFakePlayers();
        else alert('dev-seed.js 未載入');
      } else if (action === 'clear-results') {
        localStorage.removeItem('wc2026_results');
      } else if (action === 'clear-players') {
        if (typeof window.clearFakePlayers === 'function') window.clearFakePlayers();
      } else {
        if (typeof window.seedResults === 'function') window.seedResults(action);
        else alert('dev-seed.js 未載入');
      }
      loadLeaderboardTab();
    });
  });

  // ── 計分說明 ──
  const rulesBar = document.createElement('div');
  rulesBar.className = 'flex flex-wrap gap-x-4 gap-y-1 mb-4 px-3 py-2 bg-gray-800/60 rounded-lg border border-gray-700 text-xs text-gray-400';
  rulesBar.innerHTML = `
    <span class="font-semibold text-gray-300 w-full mb-0.5">📐 計分規則：每猜中一隊晉級得分</span>
    ${STAGE_NAMES.map((n, i) => {
      const pts = STAGE_POINTS[i];
      const stageHappened = actual && actual[i] && actual[i].length > 0;
      return `<span class="${stageHappened ? 'text-yellow-300 font-semibold' : 'text-gray-500'}">${n} <strong>+${pts}</strong></span>`;
    }).join('<span class="text-gray-700">·</span>')}
    <span class="text-gray-600 ml-auto">滿分 ${totalPossible} 分</span>
  `;
  container.appendChild(rulesBar);

  if (rows.length === 0) {
    container.insertAdjacentHTML('beforeend', `
      <div class="text-center text-gray-500 py-16">
        <p class="text-4xl mb-3">📋</p>
        <p class="text-base">尚無提交紀錄</p>
        <p class="text-sm mt-1">完成預測後點「提交預測」即可出現在排行榜</p>
      </div>`);
    return;
  }

  // ── 表格 ──
  const wrapper = document.createElement('div');
  wrapper.className = 'overflow-x-auto rounded-xl border border-gray-700';

  const table = document.createElement('table');
  table.className = 'leaderboard-table w-full text-sm';

  // 表頭
  const stageHeaders = STAGE_NAMES.map((n, i) =>
    `<th class="text-right py-2 px-2 text-gray-500 font-semibold whitespace-nowrap" title="滿分${stageMaxes[i]}分">
      ${n}<br><span class="text-gray-600 font-normal text-xs">/${stageMaxes[i]}</span>
    </th>`
  ).join('');
  table.innerHTML = `
    <thead>
      <tr class="border-b border-gray-600">
        <th class="text-left py-2 px-3 text-gray-500 font-semibold w-10">#</th>
        <th class="text-left py-2 px-3 text-gray-500 font-semibold">玩家</th>
        <th class="text-left py-2 px-3 text-gray-500 font-semibold whitespace-nowrap">冠軍預測</th>
        ${stageHeaders}
        <th class="text-right py-2 px-3 text-yellow-400 font-bold whitespace-nowrap">總分</th>
        <th class="text-right py-2 px-3 text-gray-600 font-normal text-xs whitespace-nowrap">提交時間</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const isMe = row.alias === myAlias;
    const champion = row.picks?.[5]?.[0];
    const champTeam = champion ? teamByCode(champion) : null;
    const champCell = champTeam
      ? `<span class="flex items-center gap-1.5">${flagImg(champion, 22)}<span>${champTeam.name}</span></span>`
      : `<span class="text-gray-600">—</span>`;

    const stageCells = STAGE_NAMES.map((_, i) => {
      const score = row.stageScores[i];
      const max = stageMaxes[i];
      if (score === null || score === undefined) {
        // 尚未開始該階段：顯示 -
        return `<td class="text-right py-2 px-2 text-gray-700">-</td>`;
      }
      const pct = max > 0 ? score / max : 0;
      const color = pct >= 0.7 ? 'text-green-400' : pct >= 0.4 ? 'text-yellow-400' : 'text-gray-400';
      return `<td class="text-right py-2 px-2 ${color} font-semibold">${score}</td>`;
    }).join('');

    const rankBadge = row.rank <= 3
      ? ['🥇','🥈','🥉'][row.rank - 1]
      : `<span class="text-gray-500">${row.rank}</span>`;

    const submittedAt = row.submittedAt
      ? new Date(row.submittedAt).toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
      : '—';

    const tr = document.createElement('tr');
    tr.className = isMe ? 'my-row border-b border-gray-700' : 'border-b border-gray-800 hover:bg-gray-800/50';
    tr.dataset.userName = row.userName;
    tr.innerHTML = `
      <td class="py-2 px-3 text-center">${rankBadge}</td>
      <td class="py-2 px-3">
        <button class="lb-name-btn font-semibold text-left hover:underline ${isMe ? 'text-cyan-300' : 'text-gray-100'}" data-name="${row.userName}">
          ${row.userName}${isMe ? ' <span class="text-xs text-cyan-500">（我）</span>' : ''}
        </button>
      </td>
      <td class="py-2 px-3">${champCell}</td>
      ${stageCells}
      <td class="py-2 px-3 text-right font-bold ${hasResults ? 'text-yellow-300' : 'text-gray-500'}">
        ${hasResults ? row.totalScore : '—'}
      </td>
      <td class="py-2 px-3 text-right text-gray-600 text-xs">${submittedAt}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  container.appendChild(wrapper);

  // ── 點擊人名展開詳情 ──
  const detailPanel = document.createElement('div');
  detailPanel.id = 'lb-detail-panel';
  container.appendChild(detailPanel);

  // 預設展開我自己
  const myRow = rows.find(r => r.alias === myAlias);
  if (myRow) showPlayerDetail(myRow, actual, stageMaxes, detailPanel, rows);

  table.querySelectorAll('.lb-name-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const clickedRow = rows.find(r => r.userName === name);
      if (!clickedRow) return;
      showPlayerDetail(clickedRow, actual, stageMaxes, detailPanel, rows);
      detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

// 顯示任意玩家詳情到 detailPanel
function showPlayerDetail(row, actual, stageMaxes, panel) {
  panel.innerHTML = '';
  const myAlias = loadUser()?.alias;
  const isMe = row.alias === myAlias;
  const card = buildPlayerDetail(row, actual, stageMaxes, isMe);
  panel.appendChild(card);
}

// 玩家詳細預測卡片
function buildPlayerDetail(row, actual, stageMaxes, isMe) {
  const hasResults = actual && actual.some(a => a && a.length > 0);
  const card = document.createElement('div');
  card.className = 'mt-6 bg-gray-800 rounded-xl border border-gray-700 p-4';

  // 標題列：玩家名 + 名次 + 總分
  const rankLabel = row.rank <= 3 ? ['🥇','🥈','🥉'][row.rank - 1] : `第 ${row.rank} 名`;
  const nameColor = isMe ? 'text-cyan-300' : 'text-white';
  card.innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      <span class="text-xl">${rankLabel}</span>
      <h3 class="text-base font-bold ${nameColor}">${row.userName}${isMe ? ' （我）' : ''} 的預測</h3>
      ${hasResults
        ? `<span class="ml-auto text-yellow-300 font-bold text-sm">總分 ${row.totalScore}</span>`
        : `<span class="ml-auto text-gray-500 text-xs">比賽開始後計分</span>`
      }
    </div>
  `;

  const stageList = document.createElement('div');
  stageList.className = 'flex flex-col gap-3';

  STAGE_NAMES.forEach((name, i) => {
    const picks = row.picks?.[i] || [];
    const score = row.stageScores[i];
    const max = stageMaxes[i];

    const row2 = document.createElement('div');
    row2.className = 'flex flex-col gap-1';

    const scoreText = score !== null && score !== undefined
      ? `<span class="text-yellow-300 font-bold">${score}</span><span class="text-gray-500">/${max}</span>`
      : `<span class="text-gray-500">比賽未開始</span>`;

    row2.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-white w-16">選${name}</span>
        <span class="text-xs text-gray-400 flex-1">${picks.length} 隊</span>
        <span class="text-xs">${scoreText}</span>
      </div>
      <div class="flex flex-wrap gap-1">
        ${picks.map(code => {
          const t = teamByCode(code);
          if (!t) return '';
          const inActual = actual?.[i]?.includes(code);
          const dot = hasResults
            ? (inActual ? '✅' : '❌')
            : '';
          return `<span class="inline-flex items-center gap-1 bg-gray-700 rounded px-1.5 py-0.5 text-xs">
            ${flagImg(code, 16)}${t.name}${dot ? ' '+dot : ''}
          </span>`;
        }).join('')}
      </div>
    `;
    stageList.appendChild(row2);
  });

  card.appendChild(stageList);
  return card;
}


// 讀取比賽結果（API 優先，dev fallback 到 localStorage）
async function getResults() {
  try {
    const res = await fetch('/api/results');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch { /* fallback */ }
  try {
    const raw = localStorage.getItem('wc2026_results');
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function loadLeaderboardTab() {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;
  container.innerHTML = '<p class="text-gray-500 text-sm py-8 text-center">載入中...</p>';

  const roomId = loadUser()?.roomId || 'default';
  fetch(`/api/leaderboard?roomId=${encodeURIComponent(roomId)}`)
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(data => {
      if (data && Array.isArray(data.predictions)) {
        renderLeaderboard(container, data.predictions, data.actual || []);
      } else {
        // Dev fallback: localStorage
        const entries = getLocalSubmissions();
        getResults().then(actual => renderLeaderboard(container, entries, actual));
      }
    });
}

// ───────────────── 通用 Modal ─────────────────
function showModal(title, message) {
  document.getElementById('modal-msg-title').textContent = title;
  document.getElementById('modal-msg-body').textContent = message;
  document.getElementById('modal-message').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    document.getElementById('modal-message').classList.add('hidden');
  });
});
