# LWRC 收費記錄系統 - Cloudflare 設定指引

## ⚠️ 重要發現
Cloudflare API token (`cfut_wuZjkMA7zvB5DQM2qVyKi8jdxT3I5rKA7R1FmTpjd46e2627`) 只有 DNS 讀寫權限，**無法創建 R2 bucket 或 D1 database**。

**需要**: 新增以下權限到 token:
- `Cloudflare Workers: Edit`
- `Cloudflare R2: Edit`  
- `Cloudflare D1: Edit`
- `Account Settings: Read`

## 📁 交付的 Code
位於 `/lwrc-payment/`:
- `src/index.js` - Cloudflare Worker 主代碼
- `schema.sql` - D1 Database Schema
- `wrangler.toml` - Wrangler 配置
- `package.json` - Node.js 配置
- `.github/workflows/deploy.yml` - GitHub Actions CI/CD

## 🔧 手動 Cloudflare 設定步驟

### 1. 建立 R2 Bucket
```bash
# 方法一: 使用 Wrangler CLI
wrangler login  # 使用 Cloudflare API token
wrangler r2 bucket create lwrc-payment-images

# 方法二: 在 Cloudflare Dashboard
# R2 → Create bucket → 名稱: lwrc-payment-images
```

### 2. 建立 D1 Database
```bash
wrangler d1 create lwrc-payment

# 會輸出 database_id，例如: x1234567-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# 記下這個 ID
```

### 3. 套用 Database Schema
```bash
wrangler d1 execute lwrc-payment --file=./schema.sql --remote
```

### 4. 更新 wrangler.toml
編輯 `wrangler.toml`，將 `database_id` 替換為實際值:
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

# 確認 R2 bucket 名稱
wrangler secret put R2_BUCKET_NAME
# 輸入: lwrc-payment-images
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
- 會員上傳: `https://lwrc.hkmilestone.com/payment` 或 `https://lwrc.hkmilestone.com/`
- Staff Dashboard: `https://lwrc.hkmilestone.com/dashboard`
- API Health: `https://lwrc.hkmilestone.com/api/health`

## 📱 Staff Dashboard 功能
- 顯示所有會員當月繳費狀態
- Filter: 全部 / 已繳 / 未繳 / 有問題
- 點擊電話號碼 → 開啟 WhatsApp wa.me link
- 點擊「詳情」→ 查看截圖 + AI 分析結果

## 🤖 AI 分析流程
1. 會員上傳截圖 → 存入 R2
2. Worker 調用 MiniMax Vision API (`/v1/images/describe`)
3. 提取文字（姓名、日期、金額）
4. 比對會員資料，計算置信度
5. 自動更新 status: `pending` → `confirmed` / `flagged`

## 🔐 安全考量
- MiniMax API key 存於 Cloudflare Secrets
- 所有 API 需加入 proper CORS headers
- 建議在 Dashboard 加入簡單密碼保護
