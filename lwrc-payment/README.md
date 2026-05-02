# LWRC 收費記錄系統

## 系統架構
```
會員 Browser → lwrc.hkmilestone.com/payment
    ↓
Cloudflare Workers（收到上傳 + call MiniMax Vision API）
    ↓
Cloudflare R2（存圖）+ D1（會員資料 + 繳費記錄）
    ↓
Staff Dashboard（睇結果、click WhatsApp）
```

## Cloudflare 資源設定

### 1. R2 Bucket
```bash
# Create R2 bucket
wrangler r2 bucket create lwrc-payment-images
```

### 2. D1 Database
```bash
# Create D1 database
wrangler d1 create lwrc-payment

# Apply schema (save as supabase/schema.sql first)
wrangler d1 execute lwrc-payment --file=./schema.sql --remote
```

### 3. Workers
```bash
# Deploy worker
wrangler deploy
```

### 4. DNS Subdomain
在 Cloudflare Dashboard:
- 建立 CNAME record: `lwrc.hkmilestone.com` → `lwrc-payment-worker.<account>.workers.dev`
- 或使用 Workers Routes

## 環境變量 (Secrets)
```bash
wrangler secret put MINIMAX_API_KEY
wrangler secret put R2_BUCKET_NAME  # lwrc-payment-images
wrangler secret put D1_DATABASE_ID  # from d1 create output
```

## MiniMax Vision API
使用 `/v1/images/describe` endpoint 進行視覺分析

## 會員上傳流程
1. 會員訪問 `/payment`
2. 填寫電話、名字
3. 上傳繳費截圖
4. AI 分析圖片 → 提取文字 → 比對會員
5. 存入 D1

## Staff Dashboard
- 訪問 `/dashboard`
- 顯示所有會員當月繳費狀態
- Filter: 全部/已繳/未繳/有問題
- Click 電話 → WhatsApp wa.me link
