// GET /api/leaderboard?roomId=xxx
import { app } from '@azure/functions';
import { predictions, results, json, CORS } from '../db.js';

app.http('leaderboard', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 204, headers: CORS };

    const roomId = req.query.get('roomId');
    if (!roomId) return json({ error: 'missing roomId' }, 400);

    // 取得該房間所有預測
    const { resources: preds } = await predictions.items
      .query({ query: 'SELECT * FROM c WHERE c.roomId = @r', parameters: [{ name: '@r', value: roomId }] })
      .fetchAll();

    // 取得目前賽果
    let actual = null;
    try {
      const { resource } = await results.item('current', 'current').read();
      actual = resource?.stageResults || null;
    } catch { /* no results yet */ }

    return json({ predictions: preds, actual });
  },
});
