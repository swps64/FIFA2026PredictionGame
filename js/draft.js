// draft.js - localStorage 自動存草稿

const USER_KEY = 'wc2026_user';

/** 取得目前登入者的草稿 key（含 roomId） */
function draftKey() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return 'wc2026_draft';
    const data = JSON.parse(raw);
    const alias  = typeof data === 'string' ? data : data.alias;
    const roomId = data.roomId || 'default';
    return `wc2026_draft_${roomId}_${alias}`;
  } catch { return 'wc2026_draft'; }
}

/** 讀取草稿 picks (string[][] 或 null) */
function loadDraft() {
  try {
    const raw = localStorage.getItem(draftKey());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** 儲存草稿 */
function saveDraft(picks) {
  localStorage.setItem(draftKey(), JSON.stringify(picks));
}

/** 清除草稿 */
function clearDraft() {
  localStorage.removeItem(draftKey());
}

/** 讀取用戶資料（回傳 {alias, nickname, roomId} 或 null） */
function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data === 'string') return { alias: data, nickname: data, roomId: 'default' };
    return data;
  } catch { return null; }
}

/** 儲存用戶資料（含 roomId） */
function saveUser({ alias, nickname, roomId }) {
  localStorage.setItem(USER_KEY, JSON.stringify({
    alias: alias.trim(),
    nickname: nickname.trim(),
    roomId: roomId || 'default',
  }));
}

/** 讀取某 alias 的個人資料（跨 session 保存，不分房間）*/
function loadProfile(alias) {
  try {
    const raw = localStorage.getItem(`wc2026_profile_${alias}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** 儲存 alias 的個人資料（登出後仍保留）*/
function saveProfile(alias, nickname) {
  localStorage.setItem(`wc2026_profile_${alias}`, JSON.stringify({ alias, nickname }));
}

export { loadDraft, saveDraft, clearDraft, loadUser, saveUser, loadProfile, saveProfile };
