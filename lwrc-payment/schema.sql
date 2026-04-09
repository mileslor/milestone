-- LWRC 收費記錄系統 Database Schema

-- 會員資料
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 繳費記錄
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id TEXT NOT NULL,
  month TEXT NOT NULL,
  amount INTEGER DEFAULT 0,
  image_url TEXT,
  ai_result TEXT,
  status TEXT DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(month);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

-- Insert sample members (for testing)
INSERT OR IGNORE INTO members (id, name, phone) VALUES 
  ('m001', '測試會員1', '61234567'),
  ('m002', '測試會員2', '69876543');
