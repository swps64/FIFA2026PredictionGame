// POST /api/validate-room
// Body: { password: "YOUR_ROOM_PASSWORD" }
// 回傳: { roomId: "room-id", name: "Room Name" }  或 401
import { app } from '@azure/functions';
import { rooms, sha256hex, json, CORS } from '../db.js';

app.http('validateRoom', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'validate-room',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 204, headers: CORS };

    let body;
    try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }

    const password = (body.password || '').trim().toUpperCase();
    if (!password) return json({ error: 'missing password' }, 400);

    const hash = await sha256hex(password);
    let item;
    try {
      const { resource } = await rooms.item(hash, hash).read();
      item = resource;
    } catch { /* not found */ }

    if (!item) return json({ error: '通關密語錯誤' }, 401);

    return json({ roomId: item.roomId, name: item.name });
  },
});
