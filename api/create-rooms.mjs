// 一次性腳本：在 Cosmos DB 建立房間
// 使用方式：
//   1. 複製 .env.example 為 .env 並填入你的 Cosmos DB 設定
//   2. node --env-file=.env api/create-rooms.mjs
import { CosmosClient } from '@azure/cosmos';
import { createHash } from 'crypto';

const endpoint = process.env.COSMOS_ENDPOINT;
const key      = process.env.COSMOS_KEY;
const dbName   = process.env.COSMOS_DATABASE || 'worldcup2026';

if (!endpoint || !key) {
  console.error('❌ 請先設定 COSMOS_ENDPOINT 和 COSMOS_KEY 環境變數（參考 .env.example）');
  process.exit(1);
}

const client = new CosmosClient({ endpoint, key });
const rooms = client.database(dbName).container('rooms');

async function createRoom(password, roomId, name) {
  const hash = createHash('sha256').update(password.toUpperCase()).digest('hex');
  const doc = { id: hash, roomId, name, createdAt: new Date().toISOString() };
  const { resource } = await rooms.items.upsert(doc);
  console.log(`✓ ${name} (${roomId}): hash=${hash}`);
  return resource;
}

// 在此新增你要建立的房間，格式：createRoom('密語', 'roomId', '顯示名稱')
// 密語會以 SHA-256 hash 儲存，不會明文存入資料庫
const roomsToCreate = [
  // { password: 'YOUR_ROOM_PASSWORD', roomId: 'your-room-id', name: '房間名稱' },
];

if (roomsToCreate.length === 0) {
  console.warn('⚠️  roomsToCreate 為空，請先在腳本中填入要建立的房間');
  process.exit(0);
}

try {
  for (const { password, roomId, name } of roomsToCreate) {
    await createRoom(password, roomId, name);
  }
  console.log('\n✅ 所有房間都建立成功！');
} catch (err) {
  console.error('❌ 錯誤:', err.message);
  process.exit(1);
}
