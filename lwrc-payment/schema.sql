-- LWRC 收費記錄系統 Database Schema v2
-- Group Payment Support: 一張圖多人繳費

-- 會員資料
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,  -- 例如 LWR001
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 繳費記錄（group payment，一張圖可以有多個人）
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,  -- e.g. "2026-04"
  amount INTEGER DEFAULT 0,
  image_url TEXT,
  ai_result TEXT,  -- JSON: {names: [], amounts: [], confidence: float, extractedText: string, matches: []}
  status TEXT DEFAULT 'pending',  -- pending/confirmed/flagged
  paid_by_member_id TEXT,  -- 主要付款人（系統入面有 account 嗰個）
  other_members TEXT,  -- JSON array: ["陳大明", "李小華"] 其他一起付款的人名
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paid_by_member_id) REFERENCES members(id)
);

-- 續會記錄
CREATE TABLE IF NOT EXISTS renewals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id TEXT NOT NULL,
  month TEXT NOT NULL,  -- 例如 "2026-04"
  status TEXT DEFAULT 'pending',  -- pending/paid
  paid_at TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(month);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_by ON payments(paid_by_member_id);
CREATE INDEX IF NOT EXISTS idx_renewals_member ON renewals(member_id);
CREATE INDEX IF NOT EXISTS idx_renewals_month ON renewals(month);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

-- Insert sample members (for testing)
INSERT OR IGNORE INTO members (id, name, phone) VALUES 
  ('LWR001', '陳大明', '61234567'),
  ('LWR002', '李小華', '69876543'),
  ('LWR003', '張志偉', '63456789');
