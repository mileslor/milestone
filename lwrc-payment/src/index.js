/**
 * LWRC 收費記錄系統 - Cloudflare Worker
 * 
 * Endpoints:
 * - GET  /              - 會員上傳頁面
 * - POST /api/upload    - 上傳截圖 + 資料
 * - GET  /api/members   - 會員列表
 * - GET  /api/payments  - 繳費記錄
 * - POST /api/analyze   - AI 分析圖片
 * - GET  /dashboard     - Staff Dashboard
 * - GET  /api/dashboard  - Dashboard JSON API
 */

const HTML_UPLOAD_PAGE = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LWRC 繳費上傳</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { background: white; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); padding: 40px; max-width: 500px; width: 100%; }
    h1 { color: #1a73e8; margin-bottom: 30px; text-align: center; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; }
    input[type="text"], input[type="tel"], input[type="file"] { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
    input[type="file"] { padding: 10px; }
    button { width: 100%; padding: 14px; background: #1a73e8; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #1557b0; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .message { margin-top: 20px; padding: 15px; border-radius: 8px; text-align: center; display: none; }
    .message.success { background: #d4edda; color: #155724; display: block; }
    .message.error { background: #f8d7da; color: #721c24; display: block; }
    .preview { margin-top: 15px; text-align: center; }
    .preview img { max-width: 100%; max-height: 200px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>💳 LWRC 繳費上傳</h1>
    <form id="uploadForm">
      <div class="form-group">
        <label for="phone">電話號碼</label>
        <input type="tel" id="phone" name="phone" placeholder="61234567" required pattern="[0-9]{8}">
      </div>
      <div class="form-group">
        <label for="name">姓名</label>
        <input type="text" id="name" name="name" placeholder="陳大文" required>
      </div>
      <div class="form-group">
        <label for="month">繳費月份</label>
        <input type="text" id="month" name="month" placeholder="2026-04" required pattern="[0-9]{4}-[0-9]{2}">
      </div>
      <div class="form-group">
        <label for="image">繳費截圖</label>
        <input type="file" id="image" name="image" accept="image/*" required>
        <div class="preview" id="preview"></div>
      </div>
      <button type="submit" id="submitBtn">上傳</button>
      <div class="message" id="message"></div>
    </form>
  </div>
  <script>
    const form = document.getElementById('uploadForm');
    const preview = document.getElementById('preview');
    const message = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn');

    // Set default month to current month
    const now = new Date();
    document.getElementById('month').value = now.toISOString().slice(0, 7);

    // Image preview
    document.getElementById('image').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.innerHTML = '<img src="' + e.target.result + '" alt="Preview">';
        };
        reader.readAsDataURL(file);
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = '上傳中...';
      message.className = 'message';
      message.style.display = 'none';

      const formData = new FormData();
      formData.append('phone', document.getElementById('phone').value);
      formData.append('name', document.getElementById('name').value);
      formData.append('month', document.getElementById('month').value);
      formData.append('image', document.getElementById('image').files[0]);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (res.ok) {
          message.textContent = '✅ 上傳成功！我們會盡快確認您的繳費。';
          message.className = 'message success';
          form.reset();
          preview.innerHTML = '';
        } else {
          message.textContent = '❌ ' + (data.error || '上傳失敗');
          message.className = 'message error';
        }
      } catch (err) {
        message.textContent = '❌ 網絡錯誤，請稍後再試';
        message.className = 'message error';
      }

      submitBtn.disabled = false;
      submitBtn.textContent = '上傳';
    });
  </script>
</body>
</html>
`;

const HTML_DASHBOARD_PAGE = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LWRC Staff Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f4f8; min-height: 100vh; }
    .header { background: #1a73e8; color: white; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 24px; }
    .header-right { font-size: 14px; opacity: 0.9; }
    .container { padding: 30px; max-width: 1400px; margin: 0 auto; }
    .filters { display: flex; gap: 10px; margin-bottom: 25px; flex-wrap: wrap; }
    .filter-btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: white; color: #333; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .filter-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
    .filter-btn.active { background: #1a73e8; color: white; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .stat-card .number { font-size: 36px; font-weight: 700; color: #1a73e8; }
    .stat-card .label { color: #666; margin-top: 5px; font-size: 14px; }
    .stat-card.paid .number { color: #34a853; }
    .stat-card.unpaid .number { color: #ea4335; }
    .stat-card.flagged .number { color: #fbbc04; }
    .members-table { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8f9fa; padding: 15px 20px; text-align: left; font-weight: 600; color: #333; font-size: 14px; border-bottom: 2px solid #e9ecef; }
    td { padding: 15px 20px; border-bottom: 1px solid #e9ecef; font-size: 14px; }
    tr:hover { background: #f8f9fa; }
    .status { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status.paid { background: #d4edda; color: #155724; }
    .status.unpaid { background: #f8d7da; color: #721c24; }
    .status.pending { background: #fff3cd; color: #856404; }
    .status.flagged { background: #ffeeba; color: #856404; }
    .phone-link { color: #1a73e8; text-decoration: none; font-weight: 500; }
    .phone-link:hover { text-decoration: underline; }
    .btn-view { padding: 6px 12px; background: #e9ecef; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .btn-view:hover { background: #dee2e6; }
    .empty { text-align: center; padding: 60px; color: #666; }
    .loading { text-align: center; padding: 40px; color: #666; }
    .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
    .modal.show { display: flex; }
    .modal-content { background: white; border-radius: 12px; max-width: 600px; width: 90%; max-height: 90vh; overflow: auto; }
    .modal-header { padding: 20px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { font-size: 18px; }
    .modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; }
    .modal-body { padding: 20px; }
    .modal-image { width: 100%; border-radius: 8px; margin-bottom: 15px; }
    .ai-result { background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 LWRC Staff Dashboard</h1>
    <div class="header-right">收費記錄系統</div>
  </div>
  <div class="container">
    <div class="filters">
      <button class="filter-btn active" data-filter="all">全部</button>
      <button class="filter-btn" data-filter="paid">已繳</button>
      <button class="filter-btn" data-filter="unpaid">未繳</button>
      <button class="filter-btn" data-filter="pending">待確認</button>
      <button class="filter-btn" data-filter="flagged">有問題</button>
    </div>
    <div class="stats">
      <div class="stat-card"><div class="number" id="totalCount">-</div><div class="label">總會員</div></div>
      <div class="stat-card paid"><div class="number" id="paidCount">-</div><div class="label">已繳</div></div>
      <div class="stat-card unpaid"><div class="number" id="unpaidCount">-</div><div class="label">未繳</div></div>
      <div class="stat-card flagged"><div class="number" id="flaggedCount">-</div><div class="label">有問題</div></div>
    </div>
    <div class="members-table">
      <div id="loading" class="loading">載入中...</div>
      <table id="membersTable" style="display:none;">
        <thead><tr><th>電話</th><th>姓名</th><th>當月狀態</th><th>操作</th></tr></thead>
        <tbody id="membersBody"></tbody>
      </table>
    </div>
  </div>
  <div class="modal" id="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>繳費詳情</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>
  <script>
    let allData = [];
    let currentFilter = 'all';

    async function loadData() {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        allData = data.members;
        updateStats(data.stats);
        renderTable();
      } catch (err) {
        document.getElementById('loading').textContent = '載入失敗';
      }
    }

    function updateStats(stats) {
      document.getElementById('totalCount').textContent = stats.total;
      document.getElementById('paidCount').textContent = stats.paid;
      document.getElementById('unpaidCount').textContent = stats.unpaid;
      document.getElementById('flaggedCount').textContent = stats.flagged;
    }

    function renderTable() {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const filtered = currentFilter === 'all' ? allData : allData.filter(m => {
        const status = m.currentMonthStatus || 'unpaid';
        return status === currentFilter;
      });

      const tbody = document.getElementById('membersBody');
      document.getElementById('loading').style.display = 'none';
      document.getElementById('membersTable').style.display = 'table';

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">沒有資料</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(m => {
        const status = m.currentMonthStatus || 'unpaid';
        const statusLabels = { paid: '✅ 已繳', unpaid: '❌ 未繳', pending: '⏳ 待確認', flagged: '⚠️ 有問題' };
        const phone = m.phone.startsWith('852') ? m.phone : '852' + m.phone;
        return '<tr>' +
          '<td><a class="phone-link" href="https://wa.me/' + phone + '" target="_blank">' + m.phone + '</a></td>' +
          '<td>' + m.name + '</td>' +
          '<td><span class="status ' + status + '">' + statusLabels[status] + '</span></td>' +
          '<td><button class="btn-view" onclick="viewDetails(\\'' + m.id + '\\')">詳情</button></td>' +
        '</tr>';
      }).join('');
    }

    function viewDetails(memberId) {
      const member = allData.find(m => m.id === memberId);
      if (!member) return;
      const phone = member.phone.startsWith('852') ? member.phone : '852' + member.phone;
      const modalBody = document.getElementById('modalBody');
      let html = '<p><strong>姓名:</strong> ' + member.name + '</p>';
      html += '<p><strong>電話:</strong> <a href="https://wa.me/' + phone + '" target="_blank">' + member.phone + '</a></p>';
      html += '<p><strong>當月狀態:</strong> ' + (member.currentMonthStatus || 'unpaid') + '</p>';
      if (member.latestPayment) {
        const p = member.latestPayment;
        if (p.image_url) html += '<img class="modal-image" src="' + p.image_url + '" alt="截圖">';
        if (p.ai_result) {
          const ai = JSON.parse(p.ai_result);
          html += '<div class="ai-result"><strong>AI 分析結果:</strong><br>';
          html += '比對會員: ' + (ai.matchedMember || '無') + '<br>';
          html += '置信度: ' + (ai.confidence || 0) + '%<br>';
          html += '提取文字: ' + (ai.extractedText || '無') + '</div>';
        }
      }
      document.getElementById('modalBody').innerHTML = html;
      document.getElementById('modal').classList.add('show');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('show');
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTable();
      });
    });

    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') closeModal();
    });

    loadData();
  </script>
</body>
</html>
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Routes
      if (path === '/' || path === '/payment') {
        return new Response(HTML_UPLOAD_PAGE, { headers: { 'Content-Type': 'text/html' } });
      }

      if (path === '/dashboard') {
        return new Response(HTML_DASHBOARD_PAGE, { headers: { 'Content-Type': 'text/html' } });
      }

      // API: Upload
      if (path === '/api/upload' && request.method === 'POST') {
        return await handleUpload(request, env);
      }

      // API: Dashboard data
      if (path === '/api/dashboard' && request.method === 'GET') {
        return await handleDashboard(request, env);
      }

      // API: Analyze (for manual trigger)
      if (path === '/api/analyze' && request.method === 'POST') {
        return await handleAnalyze(request, env);
      }

      // API: Members list
      if (path === '/api/members' && request.method === 'GET') {
        return await handleGetMembers(request, env);
      }

      // API: Health check
      if (path === '/api/health' && request.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Handle file upload
async function handleUpload(request, env) {
  const formData = await request.formData();
  const phone = formData.get('phone');
  const name = formData.get('name');
  const month = formData.get('month');
  const image = formData.get('image');

  if (!phone || !name || !month || !image) {
    return new Response(JSON.stringify({ error: '缺少必要資料' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate unique ID
  const memberId = 'm_' + Date.now();
  const imageKey = `${month}/${memberId}_${image.name}`;

  // Upload to R2
  await env.PAYMENT_IMAGES.put(imageKey, image);

  // Get public URL
  const imageUrl = `https://lwrc-payment-images.<ACCOUNT>.r2.dev/${imageKey}`;

  // Insert into D1
  // First check if member exists
  let member = await env.DB.prepare('SELECT * FROM members WHERE phone = ?').bind(phone).first();
  
  if (!member) {
    // Create new member
    await env.DB.prepare('INSERT INTO members (id, name, phone) VALUES (?, ?, ?)').bind(memberId, name, phone).run();
    member = { id: memberId, name, phone };
  }

  // Insert payment record
  await env.DB.prepare(`
    INSERT INTO payments (member_id, month, image_url, status)
    VALUES (?, ?, ?, 'pending')
  `).bind(member.id, month, imageUrl).run();

  // Trigger AI analysis
  await analyzeImage(member.id, imageUrl, env);

  return new Response(JSON.stringify({
    success: true,
    member: { id: member.id, name: member.name, phone: member.phone },
    imageUrl
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Analyze image with MiniMax Vision
async function analyzeImage(memberId, imageUrl, env) {
  if (!env.MINIMAX_API_KEY) {
    console.log('MiniMax API key not configured');
    return;
  }

  try {
    // Fetch image from R2
    const imageObject = await env.PAYMENT_IMAGES.get(imageUrl.split('/').pop());
    if (!imageObject) return;

    const imageBuffer = await imageObject.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    // Call MiniMax Vision API
    const response = await fetch('https://api.minimaxi.com/v1/images/describe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'image-01',
        image_url: imageUrl,
        prompt: '請識別這張繳費截圖中的文字內容，包括：姓名、日期、金額，並以JSON格式回傳。'
      })
    });

    if (!response.ok) {
      console.error('MiniMax API error:', await response.text());
      return;
    }

    const result = await response.json();
    
    // Extract and parse AI result
    const extractedText = result.data?.description || '';
    
    // Match against member data
    const member = await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(memberId).first();
    let confidence = 0;
    let matchedName = null;

    if (member && extractedText) {
      // Simple name matching
      if (extractedText.includes(member.name)) {
        confidence = 90;
        matchedName = member.name;
      }
    }

    // Update payment with AI result
    const aiResult = JSON.stringify({
      extractedText,
      matchedMember: matchedName,
      confidence,
      rawResponse: result
    });

    // Determine status based on confidence
    let status = 'pending';
    if (confidence >= 80) status = 'confirmed';
    if (confidence < 50) status = 'flagged';

    // Update the latest payment for this member
    await env.DB.prepare(`
      UPDATE payments 
      SET ai_result = ?, status = ?
      WHERE member_id = ? AND status = 'pending'
      ORDER BY uploaded_at DESC LIMIT 1
    `).bind(aiResult, status, memberId).run();

  } catch (err) {
    console.error('AI analysis error:', err);
  }
}

// Handle manual analyze request
async function handleAnalyze(request, env) {
  const { memberId, imageUrl } = await request.json();
  await analyzeImage(memberId, imageUrl, env);
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Dashboard data
async function handleDashboard(request, env) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Get all members with their current month payment status
  const members = await env.DB.prepare(`
    SELECT m.*, 
      (SELECT status FROM payments WHERE member_id = m.id AND month = ? ORDER BY uploaded_at DESC LIMIT 1) as currentMonthStatus,
      (SELECT ai_result FROM payments WHERE member_id = m.id ORDER BY uploaded_at DESC LIMIT 1) as latestAiResult
    FROM members m
    ORDER BY m.created_at DESC
  `).bind(currentMonth).all();

  // Get all members
  const allMembers = await env.DB.prepare('SELECT * FROM members').all();

  // Calculate stats
  let paid = 0, unpaid = allMembers.results?.length || 0, flagged = 0, pending = 0;

  members.results?.forEach(m => {
    if (m.currentMonthStatus === 'confirmed') { paid++; unpaid--; }
    else if (m.currentMonthStatus === 'flagged') flagged++;
    else if (m.currentMonthStatus === 'pending') pending++;
  });

  // Get latest payment for each member
  const membersWithPayments = await Promise.all(members.results?.map(async (m) => {
    const latestPayment = await env.DB.prepare(`
      SELECT * FROM payments WHERE member_id = ? ORDER BY uploaded_at DESC LIMIT 1
    `).bind(m.id).first();
    return { ...m, latestPayment };
  }) || []);

  return new Response(JSON.stringify({
    members: membersWithPayments,
    stats: { total: allMembers.results?.length || 0, paid, unpaid, flagged, pending }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Get all members
async function handleGetMembers(request, env) {
  const members = await env.DB.prepare('SELECT * FROM members ORDER BY created_at DESC').all();
  return new Response(JSON.stringify({ members: members.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
