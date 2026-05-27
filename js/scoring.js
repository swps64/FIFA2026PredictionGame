// scoring.js - 純計分函式 (前端與 Azure Functions 共用)
// 計分方式：按隊伍存在於該輪計分，不管位置
// 各階段滿分：1/2/4/8/16/32 分 × 隊伍數 = 每階段32分，合計192分

import { STAGE_POINTS, STAGE_SIZES } from './data.js';

/**
 * 計算單位預測的得分
 * @param {string[][]} picks  - 用戶選擇，picks[i] 為第 i+1 階段已選隊伍 code 陣列
 * @param {string[][]} actual - 實際晉級，actual[i] 為第 i+1 階段實際晉級隊伍 code 陣列
 * @returns {{ stageScores: number[], totalScore: number, stageMaxes: number[] }}
 */
function calcScore(picks, actual) {
  const stageScores = [];
  const stageMaxes = [];

  for (let i = 0; i < STAGE_SIZES.length; i++) {
    const expected = STAGE_SIZES[i];
    const pts = STAGE_POINTS[i];
    const stageMax = expected * pts;
    stageMaxes.push(stageMax);

    if (!actual || !actual[i] || actual[i].length === 0) {
      // 尚未有結果
      stageScores.push(null);
    } else {
      const userPicks = new Set(picks[i] || []);
      const actualSet = new Set(actual[i]);
      let score = 0;
      for (const code of actualSet) {
        if (userPicks.has(code)) score += pts;
      }
      stageScores.push(score);
    }
  }

  const totalScore = stageScores.reduce((sum, s) => sum + (s ?? 0), 0);
  return { stageScores, totalScore, stageMaxes };
}

/**
 * 計算最終可能最高分（未結算階段全算）
 */
function calcMaxPossible(picks, actual) {
  let max = 0;
  for (let i = 0; i < STAGE_SIZES.length; i++) {
    if (!actual || !actual[i] || actual[i].length === 0) {
      // 未結算，假設全對
      max += STAGE_SIZES[i] * STAGE_POINTS[i];
    } else {
      const pts = STAGE_POINTS[i];
      const userPicks = new Set(picks[i] || []);
      const actualSet = new Set(actual[i]);
      for (const code of actualSet) {
        if (userPicks.has(code)) max += pts;
      }
    }
  }
  return max;
}

export { calcScore, calcMaxPossible };
