// 2026 FIFA World Cup - 48支參賽隊伍資料
// FIFA排名來源：2025年11月19日排名 (抽籤使用)
// 旗幟圖片：https://flagcdn.com/w80/{iso2}.png

const TEAMS = [
  // 分組 A
  { code: 'MEX', name: '墨西哥',     iso2: 'mx',     group: 'A', rank: 15 },
  { code: 'RSA', name: '南非',       iso2: 'za',     group: 'A', rank: 67 },
  { code: 'KOR', name: '南韓',       iso2: 'kr',     group: 'A', rank: 22 },
  { code: 'CZE', name: '捷克',       iso2: 'cz',     group: 'A', rank: 37 },

  // 分組 B
  { code: 'CAN', name: '加拿大',     iso2: 'ca',     group: 'B', rank: 27 },
  { code: 'BIH', name: '波赫',       iso2: 'ba',     group: 'B', rank: 53 },
  { code: 'QAT', name: '卡達',       iso2: 'qa',     group: 'B', rank: 51 },
  { code: 'SUI', name: '瑞士',       iso2: 'ch',     group: 'B', rank: 17 },

  // 分組 C
  { code: 'BRA', name: '巴西',       iso2: 'br',     group: 'C', rank: 5  },
  { code: 'MAR', name: '摩洛哥',     iso2: 'ma',     group: 'C', rank: 11 },
  { code: 'HAI', name: '海地',       iso2: 'ht',     group: 'C', rank: 83 },
  { code: 'SCO', name: '蘇格蘭',     iso2: 'gb-sct', group: 'C', rank: 36 },

  // 分組 D
  { code: 'USA', name: '美國',       iso2: 'us',     group: 'D', rank: 14 },
  { code: 'PAR', name: '巴拉圭',     iso2: 'py',     group: 'D', rank: 39 },
  { code: 'AUS', name: '澳洲',       iso2: 'au',     group: 'D', rank: 26 },
  { code: 'TUR', name: '土耳其',     iso2: 'tr',     group: 'D', rank: 28 },

  // 分組 E
  { code: 'GER', name: '德國',       iso2: 'de',     group: 'E', rank: 9  },
  { code: 'CUW', name: '古拉索',     iso2: 'cw',     group: 'E', rank: 163 },
  { code: 'CIV', name: '象牙海岸',   iso2: 'ci',     group: 'E', rank: 42 },
  { code: 'ECU', name: '厄瓜多',     iso2: 'ec',     group: 'E', rank: 23 },

  // 分組 F
  { code: 'NED', name: '荷蘭',       iso2: 'nl',     group: 'F', rank: 7  },
  { code: 'JPN', name: '日本',       iso2: 'jp',     group: 'F', rank: 18 },
  { code: 'SWE', name: '瑞典',       iso2: 'se',     group: 'F', rank: 33 },
  { code: 'TUN', name: '突尼西亞',   iso2: 'tn',     group: 'F', rank: 40 },

  // 分組 G
  { code: 'BEL', name: '比利時',     iso2: 'be',     group: 'G', rank: 8  },
  { code: 'EGY', name: '埃及',       iso2: 'eg',     group: 'G', rank: 34 },
  { code: 'IRN', name: '伊朗',       iso2: 'ir',     group: 'G', rank: 20 },
  { code: 'NZL', name: '紐西蘭',     iso2: 'nz',     group: 'G', rank: 91 },

  // 分組 H
  { code: 'ESP', name: '西班牙',     iso2: 'es',     group: 'H', rank: 1  },
  { code: 'CPV', name: '維德角',     iso2: 'cv',     group: 'H', rank: 77 },
  { code: 'KSA', name: '沙烏地阿拉伯', iso2: 'sa',  group: 'H', rank: 55 },
  { code: 'URU', name: '烏拉圭',     iso2: 'uy',     group: 'H', rank: 16 },

  // 分組 I
  { code: 'FRA', name: '法國',       iso2: 'fr',     group: 'I', rank: 3  },
  { code: 'SEN', name: '塞內加爾',   iso2: 'sn',     group: 'I', rank: 19 },
  { code: 'IRQ', name: '伊拉克',     iso2: 'iq',     group: 'I', rank: 63 },
  { code: 'NOR', name: '挪威',       iso2: 'no',     group: 'I', rank: 29 },

  // 分組 J
  { code: 'ARG', name: '阿根廷',     iso2: 'ar',     group: 'J', rank: 2  },
  { code: 'ALG', name: '阿爾及利亞', iso2: 'dz',     group: 'J', rank: 35 },
  { code: 'AUT', name: '奧地利',     iso2: 'at',     group: 'J', rank: 24 },
  { code: 'JOR', name: '約旦',       iso2: 'jo',     group: 'J', rank: 75 },

  // 分組 K
  { code: 'POR', name: '葡萄牙',     iso2: 'pt',     group: 'K', rank: 6  },
  { code: 'COD', name: '剛果民主共和國', iso2: 'cd', group: 'K', rank: 59 },
  { code: 'UZB', name: '烏茲別克',   iso2: 'uz',     group: 'K', rank: 50 },
  { code: 'COL', name: '哥倫比亞',   iso2: 'co',     group: 'K', rank: 13 },

  // 分組 L
  { code: 'ENG', name: '英格蘭',     iso2: 'gb-eng', group: 'L', rank: 4  },
  { code: 'CRO', name: '克羅埃西亞', iso2: 'hr',     group: 'L', rank: 10 },
  { code: 'GHA', name: '迦納',       iso2: 'gh',     group: 'L', rank: 56 },
  { code: 'PAN', name: '巴拿馬',     iso2: 'pa',     group: 'L', rank: 30 },
];

// 按組別分群
const TEAMS_BY_GROUP = {};
for (const team of TEAMS) {
  if (!TEAMS_BY_GROUP[team.group]) TEAMS_BY_GROUP[team.group] = [];
  TEAMS_BY_GROUP[team.group].push(team);
}

// 各組字母列表
const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// 各階段應選人數
const STAGE_SIZES = [32, 16, 8, 4, 2, 1];
const STAGE_NAMES = [
  '32強',   // 從48選32 (含16個組第1、16個組第2、8個最佳第3)
  '16強',   // 從32選16
  '8強',    // 從16選8
  '4強',    // 從8選4
  '準決賽', // 從4選2
  '冠軍',   // 從2選1
];

// 各階段每支隊伍得分
const STAGE_POINTS = [1, 2, 4, 8, 16, 32];

// 鎖定時間：2026年6月11日 01:00 UTC (Estadio Azteca 開賽前)
const LOCK_TIME = new Date('2026-06-11T01:00:00Z');

export { TEAMS, TEAMS_BY_GROUP, GROUPS, STAGE_SIZES, STAGE_NAMES, STAGE_POINTS, LOCK_TIME };
