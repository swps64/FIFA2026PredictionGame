/**
 * dev-seed.js — 測試用假資料注入器
 * 在瀏覽器 Console 執行 seedFakePlayers() 來注入多人假提交
 * 執行 clearFakePlayers() 可清除所有假資料
 *
 * 選取邏輯：
 *   picks[0] = 32強 (從48隊選32) — 每組前2名 + 8個第三名
 *   picks[1] = 16強 (從32選16)
 *   picks[2] = 8強  (從16選8)
 *   picks[3] = 4強  (從8選4)
 *   picks[4] = 決賽 (從4選2)
 *   picks[5] = 冠軍 (從2選1)
 */

// 所有48隊的 code（按 data.js 定義）
const ALL_TEAMS = [
  // A組
  'MEX','RSA','KOR','CZE',
  // B組
  'CAN','BIH','QAT','SUI',
  // C組
  'BRA','MAR','HAI','SCO',
  // D組
  'USA','PAR','AUS','TUR',
  // E組
  'GER','CUW','CIV','ECU',
  // F組
  'NED','JPN','SWE','TUN',
  // G組
  'BEL','EGY','IRN','NZL',
  // H組
  'ESP','CPV','KSA','URU',
  // I組
  'FRA','SEN','IRQ','NOR',
  // J組
  'ARG','ALG','AUT','JOR',
  // K組
  'POR','COD','UZB','COL',
  // L組
  'ENG','CRO','GHA','PAN',
];

// 各組「強隊」（每組前兩名優先晉級）
const STRONG_PER_GROUP = {
  A: ['MEX','KOR'], B: ['CAN','SUI'], C: ['BRA','MAR'], D: ['USA','AUS'],
  E: ['GER','ECU'], F: ['NED','JPN'], G: ['BEL','IRN'], H: ['ESP','URU'],
  I: ['FRA','SEN'], J: ['ARG','AUT'], K: ['POR','COL'], L: ['ENG','CRO'],
};
// 每組「弱隊」
const WEAK_PER_GROUP = {
  A: ['RSA','CZE'], B: ['BIH','QAT'], C: ['HAI','SCO'], D: ['PAR','TUR'],
  E: ['CUW','CIV'], F: ['SWE','TUN'], G: ['EGY','NZL'], H: ['CPV','KSA'],
  I: ['IRQ','NOR'], J: ['ALG','JOR'], K: ['COD','UZB'], L: ['GHA','PAN'],
};

// 固定的8個第三名晉級（可根據口味調整）
const THIRD_PLACE_STRONG = ['SCO','TUR','CIV','SWE','EGY','NOR','AUT','CRO'];
const THIRD_PLACE_UPSET  = ['RSA','QAT','HAI','PAR','CUW','TUN','NZL','CPV'];

/**
 * 從 pool 隨機選 n 個（不改動原陣列）
 */
function pick(pool, n) {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

/**
 * 產生一組合法的 picks[6]
 * bias: 'favorite' | 'upset' | 'random'
 */
function generatePicks(bias = 'favorite') {
  // ── 32強：每組前2 + 8個第三名 ──
  const top2 = Object.values(STRONG_PER_GROUP).flat();   // 24隊
  const thirdPool = bias === 'upset' ? THIRD_PLACE_UPSET : THIRD_PLACE_STRONG;
  // 隨機混一點變化
  const third = bias === 'random'
    ? pick([...THIRD_PLACE_STRONG, ...THIRD_PLACE_UPSET], 8)
    : thirdPool;
  // 偶爾把一個強隊換成弱隊
  let r32 = [...top2, ...third];
  if (bias === 'upset' || (bias === 'random' && Math.random() > 0.5)) {
    const groups = Object.keys(WEAK_PER_GROUP);
    const g = groups[Math.floor(Math.random() * groups.length)];
    const weakTeam = WEAK_PER_GROUP[g][Math.floor(Math.random() * 2)];
    const strongTeam = STRONG_PER_GROUP[g][Math.floor(Math.random() * 2)];
    const idx = r32.indexOf(strongTeam);
    if (idx !== -1) r32[idx] = weakTeam;
  }

  // ── 16強：從r32選16 ──
  const r16Pool = bias === 'favorite'
    ? [...top2.slice(0, 16), ...pick(top2.slice(16), 0), ...pick(third, 0)]
    : r32;
  const r16 = pick(r32, 16);

  // ── 8強 ──
  const qf = pick(r16, 8);

  // ── 4強 ──
  const sf = pick(qf, 4);

  // ── 決賽 ──
  const final = pick(sf, 2);

  // ── 冠軍 ──
  const champ = [final[0]];

  return [r32, r16, qf, sf, final, champ];
}

/**
 * 8位假玩家定義（名字 + bias + 時間偏移分鐘）
 */
const FAKE_PLAYERS = [
  { name: '阿輝', bias: 'favorite', minsAgo: 120 },
  { name: '小美', bias: 'favorite', minsAgo: 95  },
  { name: '大衛', bias: 'random',   minsAgo: 80  },
  { name: '信芳', bias: 'random',   minsAgo: 60  },
  { name: 'Jason', bias: 'upset',  minsAgo: 45  },
  { name: '佳琪', bias: 'random',   minsAgo: 30  },
  { name: 'Tony', bias: 'favorite', minsAgo: 15  },
  { name: '子涵', bias: 'upset',    minsAgo: 5   },
];

/**
 * 注入假資料到 localStorage（注入到當前登入者的房間）
 */
window.seedFakePlayers = function () {
  let roomId = 'default';
  try {
    const raw = localStorage.getItem('wc2026_user');
    if (raw) roomId = JSON.parse(raw).roomId || 'default';
  } catch {}

  let count = 0;
  FAKE_PLAYERS.forEach(p => {
    const key = `wc2026_submitted_${roomId}_${p.name}`;
    const submittedAt = new Date(Date.now() - p.minsAgo * 60 * 1000).toISOString();
    const picks = generatePicks(p.bias);
    const submission = { alias: p.name, userName: p.name, picks, submittedAt };
    localStorage.setItem(key, JSON.stringify(submission));
    count++;
  });
  console.log(`✅ 已注入 ${count} 位假玩家到房間「${roomId}」`);
};

/**
 * 清除所有假玩家資料（保留真實使用者）
 */
window.clearFakePlayers = function () {
  let roomId = 'default';
  try {
    const raw = localStorage.getItem('wc2026_user');
    if (raw) roomId = JSON.parse(raw).roomId || 'default';
  } catch {}

  const fakeNames = FAKE_PLAYERS.map(p => p.name);
  let count = 0;
  fakeNames.forEach(name => {
    const key = `wc2026_submitted_${roomId}_${name}`;
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      count++;
    }
  });
  console.log(`🗑️ 已清除房間「${roomId}」的 ${count} 位假玩家`);
};

/**
 * 清除所有 wc2026_submitted_* 資料（包含真實自己）
 */
window.clearAllSubmissions = function () {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i).startsWith('wc2026_submitted_')) keys.push(localStorage.key(i));
  }
  keys.forEach(k => localStorage.removeItem(k));
  console.log(`🗑️ 已清除全部 ${keys.length} 筆提交`);
};

console.log('🌍 Dev Seed 已載入。可用指令：');
console.log('  seedFakePlayers()    — 注入 8 位假玩家');
console.log('  clearFakePlayers()   — 清除假玩家');
console.log('  clearAllSubmissions() — 清除所有提交（含自己）');
console.log('  seedResults("r32")   — 模擬至32強（也可 r16/qf/sf/final/champ）');
console.log('  clearResults()       — 清除比賽結果');

// ─── 比賽結果假資料 ───────────────────────────────────────────
// 各階段累積結果（每個階段包含前面所有結果）

const STAGE_RESULTS = {
  // 32強 出線（24個組內前2 + 8個最佳第3）
  r32: [
    // stage 0 — 32強
    ['MEX','KOR','CAN','SUI','BRA','MAR','USA','AUS',
     'GER','ECU','NED','JPN','BEL','IRN','ESP','URU',
     'FRA','SEN','ARG','AUT','POR','COL','ENG','CRO',
     'SCO','TUR','CIV','SWE','EGY','NOR','ALG','GHA'],
  ],
  // 16強 出線（從32強中晉級16隊）
  r16: [
    ['MEX','KOR','CAN','SUI','BRA','MAR','USA','AUS',
     'GER','ECU','NED','JPN','BEL','IRN','ESP','URU',
     'FRA','SEN','ARG','AUT','POR','COL','ENG','CRO',
     'SCO','TUR','CIV','SWE','EGY','NOR','ALG','GHA'],
    // stage 1 — 16強：大國為主，MAR/JPN/AUS 各一個爆冷
    ['BRA','MAR','USA','ESP','FRA','ARG','POR','ENG',
     'GER','NED','URU','KOR','JPN','SEN','AUS','CRO'],
  ],
  // 8強
  qf: [
    ['MEX','KOR','CAN','SUI','BRA','MAR','USA','AUS',
     'GER','ECU','NED','JPN','BEL','IRN','ESP','URU',
     'FRA','SEN','ARG','AUT','POR','COL','ENG','CRO',
     'SCO','TUR','CIV','SWE','EGY','NOR','ALG','GHA'],
    ['BRA','MAR','USA','ESP','FRA','ARG','POR','ENG',
     'GER','NED','URU','KOR','JPN','SEN','AUS','CRO'],
    // stage 2 — 8強：MAR 最大爆冷繼續晉級
    ['BRA','FRA','ARG','ENG','GER','ESP','MAR','JPN'],
  ],
  // 4強
  sf: [
    ['MEX','KOR','CAN','SUI','BRA','MAR','USA','AUS',
     'GER','ECU','NED','JPN','BEL','IRN','ESP','URU',
     'FRA','SEN','ARG','AUT','POR','COL','ENG','CRO',
     'SCO','TUR','CIV','SWE','EGY','NOR','ALG','GHA'],
    ['BRA','MAR','USA','ESP','FRA','ARG','POR','ENG',
     'GER','NED','URU','KOR','JPN','SEN','AUS','CRO'],
    ['BRA','FRA','ARG','ENG','GER','ESP','MAR','JPN'],
    // stage 3 — 4強
    ['BRA','ARG','FRA','ENG'],
  ],
  // 決賽
  final: [
    ['MEX','KOR','CAN','SUI','BRA','MAR','USA','AUS',
     'GER','ECU','NED','JPN','BEL','IRN','ESP','URU',
     'FRA','SEN','ARG','AUT','POR','COL','ENG','CRO',
     'SCO','TUR','CIV','SWE','EGY','NOR','ALG','GHA'],
    ['BRA','MAR','USA','ESP','FRA','ARG','POR','ENG',
     'GER','NED','URU','KOR','JPN','SEN','AUS','CRO'],
    ['BRA','FRA','ARG','ENG','GER','ESP','MAR','JPN'],
    ['BRA','ARG','FRA','ENG'],
    // stage 4 — 決賽兩隊
    ['BRA','ARG'],
  ],
  // 冠軍揭曉
  champ: [
    ['MEX','KOR','CAN','SUI','BRA','MAR','USA','AUS',
     'GER','ECU','NED','JPN','BEL','IRN','ESP','URU',
     'FRA','SEN','ARG','AUT','POR','COL','ENG','CRO',
     'SCO','TUR','CIV','SWE','EGY','NOR','ALG','GHA'],
    ['BRA','MAR','USA','ESP','FRA','ARG','POR','ENG',
     'GER','NED','URU','KOR','JPN','SEN','AUS','CRO'],
    ['BRA','FRA','ARG','ENG','GER','ESP','MAR','JPN'],
    ['BRA','ARG','FRA','ENG'],
    ['BRA','ARG'],
    // stage 5 — 冠軍（阿根廷三連冠！）
    ['ARG'],
  ],
};

/**
 * 注入指定階段的比賽結果到 localStorage
 * @param {'r32'|'r16'|'qf'|'sf'|'final'|'champ'} stage
 */
window.seedResults = function (stage) {
  const results = STAGE_RESULTS[stage];
  if (!results) { console.warn('未知 stage:', stage); return; }
  localStorage.setItem('wc2026_results', JSON.stringify(results));
  const names = { r32:'32強', r16:'16強', qf:'8強', sf:'4強', final:'決賽', champ:'冠軍' };
  console.log(`✅ 已模擬至 ${names[stage] || stage} 結果`);
};

/** 清除比賽結果 */
window.clearResults = function () {
  localStorage.removeItem('wc2026_results');
  console.log('🗑️ 已清除比賽結果');
};
