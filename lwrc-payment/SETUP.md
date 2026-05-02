# LWRC 收費記錄系統 v2 - Cloudflare 設定指引

## 🆕 v2 新功能
- **Group Payment**：一張截圖可記錄多人繳費
- **AI OCR 自動識別**：上傳時自動識別圖中姓名並比對會員
- **續會管理**：自動追蹤每月待續會員名單
- **Dashboard 增強**：按月份顯示繳費記錄、狀態快速更新

## ⚠️ 重要發現
Cloudflare API token (`cfut_wuZjkMA7zvB5DQM2qVyKi8jdxT3I5rKA7R1FmTpjd46e2627`) 只有 DNS 讀寫權限，**無法創建 R2 bucket 或 D1 database**。

**需要**: 新增以下權限到 token:
- `Cloudflare Workers: Edit`
- `Cloudflare R2: Edit`
- `Cloudflare D1: Edit`
- `Account Settings: Read`

## 📁 交付的 Code
位於 `/lwrc-payment/`:
- `src/index.js` - Cloudflare Worker 主代碼（含上傳頁面 + Dashboard）
- `schema.sql` - D1 Database Schema（已更新 v2）
- `wrangler.toml` - Wrangler 配置
- `package.json` - Node.js 配置

## 🔧 Cloudflare 設定步驟

### 1. 建立 R2 Bucket
```bash
wrangler login
wrangler r2 bucket create lwrc-payment-images
```

### 2. 建立 D1 Database
```bash
wrangler d1 create lwrc-payment
# 輸出 database_id，例如: x1234567-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3. 套用 Database Schema
```bash
wrangler d1 execute lwrc-payment --file=./schema.sql --remote
```

### 4. 更新 wrangler.toml
```toml
[[d1_databases]]
binding = "DB"
database_name = "lwrc-payment"
database_id = "YOUR_ACTUAL_DATABASE_ID"
```

### 5. 設定環境變量 Secrets
```bash
wrangler secret put MINIMAX_API_KEY
# 輸入 MiniMax API key
```

### 6. 部署 Worker
```bash
cd lwrc-payment
wrangler deploy
```

### 7. 設定 DNS Subdomain
在 Cloudflare Dashboard:
1. 前往 hkmilestone.com DNS settings
2. 新增 CNAME record:
   - Name: `lwrc`
   - Target: `lwrc-payment-worker.<ACCOUNT>.workers.dev`
   - Proxy: ✅ (enabled)

## 🌐 完成後的 URLs
- 會員上傳: `https://lwrc.hkmilestone.com/` 或 `https://lwrc.hkmilestone.com/payment`
- Staff Dashboard: `https://lwrc.hkmilestone.com/dashboard`
- API Health: `https://lwrc.hkmilestone.com/api/health`

## 📊 功能說明

### 會員上傳頁面 (`/`)
- 上傳截圖後 AI 自動 OCR 識別圖中姓名
- 顯示識別結果，高亮匹配/未匹配的姓名
- 輸入主要付款人電話（系統會員）
- 可加入其他一起付款的人名
- 自動建立續會記錄

### Staff Dashboard (`/dashboard`)

#### 💰 繳費記錄 Tab
- 按月份分組顯示所有繳費記錄
- 每筆記錄顯示：月份、所有人員晶片、狀態、截圖
- Status Filter：全部 / 已確認 / 待確認 / 有問題
- 快速操作：點擊「確認」或「標記」即時更新狀態
- 點擊截圖查看大圖 + AI 分析詳情

#### 📅 待續會員 Tab
- 按月份列出所有 pending 續會記錄
- 顯示會員姓名 + WhatsApp 連結
- 自動計算下個月待續名單

### AI 分析流程
1. 會員上傳截圖 → 存入 R2
2. Worker 調用 MiniMax Vision API
3. 提取文字（姓名、日期、金額）
4. 比對會員名單，計算置信度
5. 自動標記 confidence:
   - ≥80% → `confirmed`
   - 50-79% → `pending`
   - <50% → `flagged`

## 🗄️ Database Schema

### payments 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 主鍵 |
| month | TEXT | 繳費月份 (e.g. "2026-04") |
| amount | INTEGER | 金額 |
| image_url | TEXT | R2 圖片 key |
| ai_result | TEXT | JSON: {names, amounts, confidence, matches} |
| status | TEXT | pending/confirmed/flagged |
| paid_by_member_id | TEXT | 主要付款人 (members.id) |
| other_members | TEXT | JSON array: ["陳大明", "李小華"] |
| uploaded_at | TIMESTAMP | 上傳時間 |

### members 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | TEXT | 主鍵 (e.g. LWR001) |
| name | TEXT | 姓名 |
| phone | TEXT | 電話 (UNIQUE) |
| created_at | TIMESTAMP | 創建時間 |

### renewals 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 主鍵 |
| member_id | TEXT | 會員 ID |
| month | TEXT | 續會月份 |
| status | TEXT | pending/paid |
| paid_at | TIMESTAMP | 繳費時間 |

## 🔐 安全考量
- MiniMax API key 存於 Cloudflare Secrets
- 所有 API 加入 CORS headers
- 建議 Dashboard 加入簡單密碼保護（可在 wrangler.toml 加 `Basic Auth`）
