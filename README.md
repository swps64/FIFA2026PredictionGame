# ⚽ 2026 世界盃預測遊戲

> **100% 由 GitHub Copilot AI Agent 生成** — 從前端 UI、API 邏輯、資料庫設計到雲端部署，全程零手寫程式碼。

一個多人世界盃預測遊戲，支援多房間隔離、即時排行榜、管理員後台，部署於 Azure Static Web Apps + Cosmos DB。

---

## 功能特色

- 🔐 **房間密語** — 不同密語對應不同房間，排行榜完全隔離
- 🏆 **六階段預測** — 32強 → 16強 → 8強 → 4強 → 準決賽 → 冠軍
- 📊 **即時排行榜** — 依計分規則自動計算
- 🔒 **鎖定機制** — 截止時間後自動禁止修改
- 🛡️ **管理員後台** — 新增/刪除房間、輸入賽事結果、查看所有預測

## 技術架構

| 層次 | 技術 |
|------|------|
| 前端 | Vanilla JS + Tailwind CSS（CDN） |
| 後端 API | Azure Functions v4（Node.js 20）|
| 資料庫 | Azure Cosmos DB（NoSQL，Free Tier Serverless）|
| 部署 | Azure Static Web Apps + Azure Developer CLI（azd）|

---

## 部署步驟

### 前置需求

- [Node.js 20+](https://nodejs.org/)
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- [Azure Developer CLI (azd)](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- Azure 訂閱（免費帳號即可，Cosmos DB Free Tier + SWA Free Plan）

### 1. Clone 並安裝

```bash
git clone https://github.com/swps64/FIFA2026PredictionGame.git
cd FIFA2026PredictionGame
npm install
cd api && npm install && cd ..
```

### 2. 決定 Admin 密碼並產生 Hash

Admin 後台以 SHA-256 hash 驗證，**絕不儲存明文密碼**。

用以下任一方式產生你的 admin 密碼 hash：

**PowerShell：**
```powershell
$pw = "你的密碼"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($pw)
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
[BitConverter]::ToString($hash).Replace("-","").ToLower()
```

**Node.js：**
```bash
node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('你的密碼').digest('hex'))"
```

記下輸出的 64 字元 hex 字串，下一步會用到。

### 3. 登入 Azure 並部署

```bash
# 登入
az login
azd auth login

# 初始化環境（第一次）
azd env new <你的環境名稱>          # 例如：worldcup2026

# 設定必要的環境變數
azd env set ADMIN_PASSWORD_HASH <上一步產生的 hash>

# 部署（自動建立 Cosmos DB + SWA）
azd up
```

`azd up` 完成後會輸出你的網站 URL。

### 4. 建立房間

部署完成後，用腳本新增遊戲房間。

建立 `.env` 檔（可複製 `.env.example`）：

```env
COSMOS_ENDPOINT=https://<你的cosmos帳號>.documents.azure.com:443/
COSMOS_KEY=<Cosmos DB Primary Key>
COSMOS_DATABASE=worldcup2026
```

> **取得 Cosmos DB 金鑰：**  
> Azure Portal → 你的 Cosmos DB 帳號 → Keys → Primary Key

編輯 `create-rooms.mjs`，在 `roomsToCreate` 陣列填入房間資料：

```js
const roomsToCreate = [
  { password: 'ROOM1', roomId: 'room1', name: '第一組' },
  { password: 'ROOM2', roomId: 'room2', name: '第二組' },
];
```

執行腳本：

```bash
node --env-file=.env create-rooms.mjs
```

---

## 管理員後台

訪問 `https://<你的網站>/admin.html`，輸入**原始密碼**（非 hash）登入。

### 後台功能

| 功能 | 說明 |
|------|------|
| **查看所有房間** | 顯示現有房間清單，可刪除 |
| **新增房間** | 直接在後台新增密語 + 房間名稱 |
| **輸入賽事結果** | 逐階段選出晉級隊伍，儲存後自動觸發計分 |
| **查看所有預測** | 可切換房間查看每位玩家的預測內容 |

> ⚠️ **重要**：Admin 後台完全開放於前端路由，安全性依靠 `ADMIN_PASSWORD_HASH` 環境變數。請設定一個強密碼，並**不要**把 hash 公開分享。

---

## 修改鎖定時間

開啟 `js/data.js`（同步更新 `dist/js/data.js`），找到：

```js
export const LOCK_TIME = new Date('2026-06-11T01:00:00Z'); // UTC，= 台北時間 09:00
```

改為你的比賽開始時間（UTC）。

---

## 本機開發

```bash
# 安裝 Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# 建立本機 API 設定
cp api/local.settings.json.example api/local.settings.json
# 填入 COSMOS_ENDPOINT、COSMOS_KEY、ADMIN_PASSWORD_HASH

# 啟動本機開發環境
npx @azure/static-web-apps-cli start . --api-location api --run "npx serve . -p 3000" --app-dev-server-url http://localhost:3000
```

---

## 環境變數說明

| 變數名稱 | 說明 | 必填 |
|----------|------|------|
| `COSMOS_ENDPOINT` | Cosmos DB 帳號 URI | ✅ |
| `COSMOS_KEY` | Cosmos DB Primary Key | ✅（本機用）|
| `COSMOS_DATABASE` | 資料庫名稱，預設 `worldcup2026` | ❌ |
| `ADMIN_PASSWORD_HASH` | Admin 密碼的 SHA-256 hex hash | ✅ |

> 部署到 Azure 後，`COSMOS_ENDPOINT` 和 `COSMOS_KEY` 由 `azd` 自動注入，不需手動設定。

---

## 授權

MIT License — 歡迎 fork 自行改造。

---

*Built with 🤖 [GitHub Copilot](https://github.com/features/copilot) · Azure Static Web Apps · 2026*
