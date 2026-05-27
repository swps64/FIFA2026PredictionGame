// api/src/db.js — Cosmos DB 共用連線
import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key:      process.env.COSMOS_KEY,
});

const db = client.database(process.env.COSMOS_DATABASE || 'worldcup2026');

export const rooms       = db.container('rooms');
export const predictions = db.container('predictions');
export const results     = db.container('results');

/** 計算 SHA-256 hex（Node.js 內建 crypto） */
export async function sha256hex(str) {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(str).digest('hex');
}

/** CORS headers 統一 */
export const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

/** JSON response 快捷 */
export function json(body, status = 200) {
  return { status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

/** 驗證 Admin token (使用自定義 header 避免 Azure SWA 攔截 Authorization) */
export function isAdmin(req) {
  // 優先用 X-Admin-Token，再 fallback 到 Authorization Bearer
  const token =
    req.headers.get?.('x-admin-token') ||
    req.headers['x-admin-token'] ||
    (req.headers.get?.('authorization') || req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  return token === process.env.ADMIN_PASSWORD_HASH;
}
