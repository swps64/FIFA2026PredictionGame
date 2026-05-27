// GET  /api/results       â†’ å–å¾—ç›®å‰è³½æžœï¼ˆå…¬é–‹ï¼‰
// POST /api/save-results  â†’ æ›´æ–°è³½æžœï¼ˆéœ€ adminï¼‰
// GET  /api/list-rooms    â†’ åˆ—å‡ºæ‰€æœ‰æˆ¿é–“ï¼ˆéœ€ adminï¼‰
// POST /api/add-room      â†’ æ–°å¢žæˆ¿é–“ï¼ˆéœ€ adminï¼‰
// DELETE /api/del-room?hash=  â†’ åˆªé™¤æˆ¿é–“ï¼ˆéœ€ adminï¼‰
// GET  /api/list-preds?roomId= â†’ å–å¾—é æ¸¬ï¼ˆéœ€ adminï¼‰
// DELETE /api/del-pred?id=&roomId= â†’ åˆªé™¤é æ¸¬ï¼ˆéœ€ adminï¼‰
import { app } from '@azure/functions';
import { rooms, predictions, results, sha256hex, json, isAdmin, CORS } from '../db.js';

// â”€â”€ å…¬é–‹ï¼šå–å¾—è³½æžœ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.http('getResults', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'results',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 204, headers: CORS };
    try {
      const { resource } = await results.item('current', 'current').read();
      return json(resource?.stageResults || [[], [], [], [], [], []]);
    } catch { return json([[], [], [], [], [], []]); }
  },
});

// â”€â”€ Adminï¼šæ›´æ–°è³½æžœ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.http('postResults', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'save-results',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 204, headers: CORS };
    if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }
    const { stageResults } = body;
    if (!Array.isArray(stageResults) || stageResults.length !== 6) return json({ error: 'invalid stageResults' }, 400);

    await results.items.upsert({ id: 'current', stageResults, updatedAt: new Date().toISOString() });
    return json({ ok: true });
  },
});

// â”€â”€ Adminï¼šåˆ—å‡ºæˆ¿é–“ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.http('listRooms', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'list-rooms',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 204, headers: CORS };
    if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);

    const { resources } = await rooms.items.query('SELECT c.id, c.roomId, c.name, c.createdAt FROM c').fetchAll();
    return json(resources);
  },
});

// â”€â”€ Adminï¼šæ–°å¢žæˆ¿é–“ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.http('createRoom', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'add-room',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 204, headers: CORS };
    if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }
    const { password, roomId, name } = body;

    if (!password || !roomId || !name) return json({ error: 'missing fields: password, roomId, name' }, 400);
    if (!/^[a-z0-9_-]{2,20}$/.test(roomId)) return json({ error: 'roomId must be lowercase alphanumeric' }, 400);
    if (password.trim().length < 4) return json({ error: 'password too short (min 4 chars)' }, 400);

    const hash = await sha256hex(password.trim().toUpperCase());
    const doc = { id: hash, roomId, name, createdAt: new Date().toISOString() };
    await rooms.items.upsert(doc);
    return json({ ok: true, roomId, hash });
  },
});

// â”€â”€ Adminï¼šåˆªé™¤æˆ¿é–“ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.http('deleteRoom', {
  methods: ['DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'del-room',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 204, headers: CORS };
    if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);

    const hash = req.query.get('hash');
    if (!hash) return json({ error: 'missing hash' }, 400);
    try {
      await rooms.item(hash, hash).delete();
      return json({ ok: true });
    } catch { return json({ error: 'room not found' }, 404); }
  },
});

// â”€â”€ Adminï¼šåˆ—å‡ºæŸæˆ¿é–“æ‰€æœ‰é æ¸¬ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.http('listPredictions', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'list-preds',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 204, headers: CORS };
    if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);

    const roomId = req.query.get('roomId');
    if (!roomId) return json({ error: 'missing roomId' }, 400);

    const { resources } = await predictions.items
      .query({ query: 'SELECT * FROM c WHERE c.roomId = @r', parameters: [{ name: '@r', value: roomId }] })
      .fetchAll();
    return json(resources);
  },
});

// â”€â”€ Adminï¼šåˆªé™¤æŸä½¿ç”¨è€…é æ¸¬ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.http('deletePrediction', {
  methods: ['DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'del-pred',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 204, headers: CORS };
    if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);

    const id     = req.query.get('id');
    const roomId = req.query.get('roomId');
    if (!id || !roomId) return json({ error: 'missing id or roomId' }, 400);
    try {
      await predictions.item(id, roomId).delete();
      return json({ ok: true });
    } catch { return json({ error: 'prediction not found' }, 404); }
  },
});
