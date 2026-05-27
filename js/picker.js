// picker.js - 6階段勾選UI元件

import { TEAMS, TEAMS_BY_GROUP, GROUPS, STAGE_SIZES, STAGE_NAMES, STAGE_POINTS } from './data.js';
import { saveDraft } from './draft.js';

// 當前預測 picks[0..5] 每個是 Set<code>
let picks = Array.from({ length: 6 }, () => new Set());
let isLocked = false;
let onPicksChangedCallback = null;

/** 初始化 picker，傳入父元素 id 和初始 picks 陣列（可為 null） */
function initPicker(containerId, initialPicks, locked) {
  isLocked = locked;
  if (initialPicks) {
    picks = initialPicks.map(arr => new Set(arr));
  }
  renderAll(containerId);
}

/** 重新渲染整個 picker */
function renderAll(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  // 階段 0：分組列出全部48隊，選32強
  container.appendChild(buildStage0());

  // 階段 1-5：從上一階段選出的隊伍中再選
  for (let s = 1; s < 6; s++) {
    container.appendChild(buildStageN(s));
  }
}

/** 建立進度標頭 */
function buildStageHeader(stageIdx) {
  const expected = STAGE_SIZES[stageIdx];
  const selected = picks[stageIdx].size;
  const name = STAGE_NAMES[stageIdx];
  const pts = STAGE_POINTS[stageIdx];

  let countColor = 'text-orange-500';
  if (selected === expected) countColor = 'text-green-500';
  else if (selected > expected) countColor = 'text-red-500';

  const header = document.createElement('div');
  header.className = 'stage-header flex items-center gap-3 mb-3';
  header.innerHTML = `
    <h2 class="text-lg font-bold text-white">
      ${stageIdx === 0 ? '■' : '▶'} 選${name}
    </h2>
    <span class="text-sm ${countColor} font-semibold">
      已選 <span id="count-s${stageIdx}">${selected}</span> / 應選 ${expected}
    </span>
    <span class="text-xs text-gray-400 ml-auto">每隊 ${pts} 分</span>
  `;
  return header;
}

/** 階段0：按組顯示全部48隊 */
function buildStage0() {
  const section = document.createElement('section');
  section.id = 'stage-0';
  section.className = 'stage-section mb-8';
  section.appendChild(buildStageHeader(0));

  const note = document.createElement('p');
  note.className = 'text-xs text-gray-400 mb-3';
  note.textContent = '依照規則每組可能晉級2到3隊，12組共選出32強。預測遊戲實際只需確保合計選到32隊即可。';
  section.appendChild(note);

  const grid = document.createElement('div');
  grid.className = 'groups-grid';

  for (const g of GROUPS) {
    const groupBox = document.createElement('div');
    groupBox.className = 'group-box bg-gray-800 rounded-lg p-3 mb-3';
    groupBox.innerHTML = `<h3 class="text-xs font-bold text-yellow-400 mb-2 uppercase">分組 ${g}</h3>`;

    const teamList = document.createElement('div');
    teamList.className = 'flex flex-col gap-1';

    for (const team of TEAMS_BY_GROUP[g]) {
      teamList.appendChild(buildTeamCard(team, 0));
    }
    groupBox.appendChild(teamList);
    grid.appendChild(groupBox);
  }
  section.appendChild(grid);
  return section;
}

/** 階段 1-5：從上一階段已選隊伍中選 */
function buildStageN(stageIdx) {
  const section = document.createElement('section');
  section.id = `stage-${stageIdx}`;
  section.className = 'stage-section mb-8';
  section.appendChild(buildStageHeader(stageIdx));

  const prevPicks = [...picks[stageIdx - 1]];

  if (prevPicks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-gray-500 text-sm italic';
    empty.textContent = `請先完成上一階段的選擇`;
    section.appendChild(empty);
    return section;
  }

  // 按FIFA排名排序顯示
  const teamObjects = prevPicks
    .map(code => TEAMS.find(t => t.code === code))
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank);

  const grid = document.createElement('div');
  grid.className = 'teams-grid';
  for (const team of teamObjects) {
    grid.appendChild(buildTeamCard(team, stageIdx));
  }
  section.appendChild(grid);
  return section;
}

/** 建立單一隊伍卡片 */
function buildTeamCard(team, stageIdx) {
  const selected = picks[stageIdx].has(team.code);
  const card = document.createElement('button');
  card.type = 'button';
  card.dataset.code = team.code;
  card.dataset.stage = stageIdx;
  card.className = `team-card ${selected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`;
  card.disabled = isLocked;

  // 旗幟 + 名稱 + 排名
  const flagUrl = `https://flagcdn.com/w40/${team.iso2.toLowerCase()}.png`;
  card.innerHTML = `
    <img src="${flagUrl}" alt="${team.name}" class="flag"
         onerror="this.style.visibility='hidden'">
    <span class="team-name">${team.name}</span>
    <span class="team-rank">#${team.rank}</span>
  `;

  if (!isLocked) {
    card.addEventListener('click', () => togglePick(team.code, stageIdx));
  }
  return card;
}

/** 切換勾選 */
function togglePick(code, stageIdx) {
  if (isLocked) return;
  if (picks[stageIdx].has(code)) {
    picks[stageIdx].delete(code);
    // 往後階段若有此隊，一併移除 (cascade)
    cascadeDeselect(code, stageIdx + 1);
  } else {
    picks[stageIdx].add(code);
  }
  afterChange();
}

/** 往後 cascade 刪除 */
function cascadeDeselect(code, fromStage) {
  for (let s = fromStage; s < 6; s++) {
    if (picks[s].has(code)) {
      picks[s].delete(code);
      // 若此隊在更後面的階段也有，繼續 cascade
    }
  }
}

/** 每次更改後刷新UI、存草稿、回調 */
function afterChange() {
  // 更新所有階段的計數標籤
  for (let s = 0; s < 6; s++) {
    const el = document.getElementById(`count-s${s}`);
    if (el) el.textContent = picks[s].size;
  }

  // 更新各卡片的 selected 樣式
  document.querySelectorAll('.team-card').forEach(card => {
    const code = card.dataset.code;
    const s = parseInt(card.dataset.stage, 10);
    if (picks[s].has(code)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // 更新計數標籤顏色
  for (let s = 0; s < 6; s++) {
    const el = document.getElementById(`count-s${s}`);
    if (!el) continue;
    const expected = STAGE_SIZES[s];
    const selected = picks[s].size;
    el.className = '';
    if (selected === expected) el.className = 'text-green-400 font-bold';
    else if (selected > expected) el.className = 'text-red-400 font-bold';
    else el.className = 'text-orange-400 font-semibold';
  }

  // 重新渲染第 1~5 階段（因為可用隊伍可能變了）
  for (let s = 1; s < 6; s++) {
    const section = document.getElementById(`stage-${s}`);
    if (!section) continue;
    const newSection = buildStageN(s);
    section.replaceWith(newSection);
  }

  // 存草稿
  saveDraft(picks.map(set => [...set]));

  // 回調通知 app.js
  if (onPicksChangedCallback) onPicksChangedCallback(getPicksArray());
}

/** 取得 picks 為 string[][] */
function getPicksArray() {
  return picks.map(set => [...set]);
}

/** 驗證是否完整 */
function isComplete() {
  return STAGE_SIZES.every((size, i) => picks[i].size === size);
}

/** 驗證錯誤訊息 */
function getValidationErrors() {
  const errors = [];
  for (let i = 0; i < 6; i++) {
    const expected = STAGE_SIZES[i];
    const selected = picks[i].size;
    if (selected !== expected) {
      const name = STAGE_NAMES[i];
      errors.push(`「選${name}」需選 ${expected} 隊，目前已選 ${selected} 隊`);
    }
  }
  return errors;
}

/** 設定回調 */
function onPicksChanged(cb) {
  onPicksChangedCallback = cb;
}

/** 清除所有選項（重置為空） */
function resetPicks(containerId) {
  picks = Array.from({ length: 6 }, () => new Set());
  saveDraft(picks.map(s => [...s]));
  renderAll(containerId);
  if (onPicksChangedCallback) onPicksChangedCallback(getPicksArray());
}

/** 隨機幫你選完整六個階段 */
function randomPicks(containerId) {
  function pickN(pool, n) {
    const arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n);
  }

  // 階段0：從48隊選32
  const allCodes = TEAMS.map(t => t.code);
  const r32 = pickN(allCodes, 32);
  picks[0] = new Set(r32);

  // 各階段依序從上一階段選
  for (let i = 1; i < 6; i++) {
    const prev = [...picks[i - 1]];
    picks[i] = new Set(pickN(prev, STAGE_SIZES[i]));
  }

  saveDraft(picks.map(s => [...s]));
  renderAll(containerId);
  if (onPicksChangedCallback) onPicksChangedCallback(getPicksArray());
}

export { initPicker, getPicksArray, isComplete, getValidationErrors, onPicksChanged, resetPicks, randomPicks };
