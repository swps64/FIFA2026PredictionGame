// POST /api/predictions  → 提交或更新預測
// GET  /api/predictions  → 取得自己的預測（?roomId=xxx&alias=xxx）
import { app } from '@azure/functions';
import { predictions, json, CORS } from '../db.js';

const ALIAS_RE = /^[A-Za-z0-9_-]{2,20}$/;
const LOCK_TIME = new Date('2026-06-11T01:00:00Z');

app.http('predictions', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'predictions',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 204, headers: CORS };

    if (req.method === 'GET') {
      const roomId = req.query.get('roomId');
      const alias  = req.query.get('alias');
      if (!roomId || !alias) return json({ error: 'missing roomId or alias' }, 400);
      try {
        const { resource } = await predictions.item(`${roomId}_${alias}`, roomId).read();
        return json(resource || null);
      } catch { return json(null); }
    }

    // POST
    if (new Date() > LOCK_TIME) return json({ error: '預測時間已截止' }, 403);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }

    const { roomId, alias, userName, picks } = body;
    if (!roomId || !alias || !userName || !picks) return json({ error: 'missing fields' }, 400);
    if (!ALIAS_RE.test(alias)) return json({ error: 'invalid alias' }, 400);
    if (userName.length > 20 || /[<>"'`]/.test(userName)) return json({ error: 'invalid userName' }, 400);
    if (!Array.isArray(picks) || picks.length !== 6) return json({ error: 'invalid picks' }, 400);

    const doc = {
      id: `${roomId}_${alias}`,
      roomId,
      alias,
      userName,
      picks,
      submittedAt: new Date().toISOString(),
    };

    await predictions.items.upsert(doc);
    return json({ ok: true });
  },
});
