/**
 * LWRC 收費記錄系統 v2 - Cloudflare Worker
 * Group Payment: 一張圖多人繳費
 * 
 * Endpoints:
 * - GET  /              - 會員上傳頁面（Group Payment）
 * - POST /api/upload    - 上傳截圖 + 資料
 * - GET  /api/members   - 會員列表
 * - GET  /api/payments  - 繳費記錄
 * - POST /api/analyze   - AI 分析圖片
 * - GET  /dashboard     - Staff Dashboard
 * - GET  /api/dashboard  - Dashboard JSON API
 * - GET  /api/renewals  - 續會記錄
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
    .container { background: white; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); padding: 40px; max-width: 560px; width: 100%; }
    h1 { color: #1a73e8; margin-bottom: 8px; text-align: center; }
    .subtitle { color: #666; text-align: center; margin-bottom: 30px; font-size: 14px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; font-size: 14px; }
    label .hint { font-weight: 400; color: #888; font-size: 12px; }
    input[type="text"], input[type="tel"], input[type="month"], input[type="file"], input[type="number"] { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
    input[type="file"] { padding: 10px; }
    .image-preview { margin-top: 15px; text-align: center; position: relative; }
    .image-preview img { max-width: 100%; max-height: 280px; border-radius: 8px; border: 2px dashed #ddd; }
    .image-preview .placeholder { color: #aaa; padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .image-preview .placeholder span { font-size: 40px; }

    /* OCR Loading */
    .ocr-loading { margin-top: 10px; padding: 12px; border-radius: 8px; font-size: 13px; background: #fff3cd; color: #856404; display: none; }
    .ocr-loading.show { display: block; }

    /* OCR Result Card */
    .ocr-card { margin-top: 16px; border: 2px solid #28a745; border-radius: 12px; padding: 16px; background: #f8fff8; display: none; }
    .ocr-card.show { display: block; }
    .ocr-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .ocr-card-title { font-size: 14px; font-weight: 600; color: #28a745; }
    .ocr-card-badge { background: #28a745; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
    .ocr-field { margin-bottom: 12px; }
    .ocr-field label { font-size: 12px; color: #666; margin-bottom: 4px; font-weight: 500; }
    .ocr-field input { padding: 8px 10px; font-size: 14px; background: #fff; }
    .ocr-field input:focus { border-color: #28a745; outline: none; }
    .ocr-original { font-size: 11px; color: #aaa; margin-top: 2px; }

    .other-member-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .other-member-row input { flex: 1; }
    .btn-remove { background: #ff4444; color: white; border: none; border-radius: 8px; padding: 0 12px; cursor: pointer; font-size: 18px; line-height: 1; }
    .btn-add { width: 100%; padding: 10px; background: #f0f0f0; color: #333; border: 1px dashed #ccc; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .btn-add:hover { background: #e8e8e8; }

    /* Confirm step */
    .confirm-section { margin-top: 20px; display: none; }
    .confirm-section.show { display: block; }
    .btn-confirm { width: 100%; padding: 14px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-confirm:hover { background: #218838; }

    button[type="submit"] { width: 100%; padding: 14px; background: #1a73e8; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button[type="submit"]:hover { background: #1557b0; }
    button[type="submit"]:disabled { background: #ccc; cursor: not-allowed; }
    .message { margin-top: 20px; padding: 15px; border-radius: 8px; text-align: center; display: none; }
    .message.success { background: #d4edda; color: #155724; display: block; }
    .message.error { background: #f8d7da; color: #721c24; display: block; }
    .section-title { font-size: 13px; color: #888; margin-bottom: 10px; padding-left: 4px; border-left: 3px solid #1a73e8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>💳 LWRC 繳費上傳</h1>
    <p class="subtitle">一張圖多人繳費</p>
    <form id="uploadForm">
      <!-- 繳費截圖 -->
      <div class="form-group">
        <label>繳費截圖</label>
        <input type="file" id="image" name="image" accept="image/*" required>
        <div class="image-preview" id="imagePreview">
          <div class="placeholder" id="placeholder">
            <span>📷</span>
            <span>上傳圖片自動 OCR</span>
          </div>
        </div>
        <div class="ocr-loading" id="ocrLoading">🔄 AI 識別中...</div>

        <!-- OCR 識別結果卡片 -->
        <div class="ocr-card" id="ocrCard">
          <div class="ocr-card-header">
            <span class="ocr-card-title">✅ AI 識別結果</span>
            <span class="ocr-card-badge" id="ocrConfidence"></span>
          </div>
          <div class="ocr-field">
            <label>姓名 <span class="ocr-original" id="ocrNameOrig"></span></label>
            <input type="text" id="ocrName" placeholder="陳大明">
          </div>
          <div class="ocr-field">
            <label>金額（HKD）<span class="ocr-original" id="ocrAmountOrig"></span></label>
            <input type="text" id="ocrAmount" placeholder="HK$500">
          </div>
          <div class="ocr-field">
            <label>銀行 <span class="ocr-original" id="ocrBankOrig"></span></label>
            <input type="text" id="ocrBank" placeholder="HSBC">
          </div>
          <div class="ocr-field">
            <label>過數編號 <span class="ocr-original" id="ocrRefOrig"></span></label>
            <input type="text" id="ocrRef" placeholder="ABC123">
          </div>
        </div>
      </div>

      <!-- 繳費月份 -->
      <div class="form-group">
        <label for="month">繳費月份 <span class="hint">（要續的月份）</span></label>
        <input type="month" id="month" name="month" required>
      </div>

      <!-- 主要付款人 -->
      <p class="section-title">主要付款人（系統會員）</p>
      <div class="form-group">
        <label for="phone">電話號碼 <span class="hint">（主要付款人）</span></label>
        <input type="tel" id="phone" name="phone" placeholder="61234567" required pattern="[0-9]{8}">
      </div>
      <div class="form-group">
        <label for="name">姓名</label>
        <input type="text" id="name" name="name" placeholder="陳大明" required>
      </div>

      <!-- 其他一起付款的人 -->
      <p class="section-title">其他一起付款的人（可選）</p>
      <div id="otherMembersContainer">
        <div class="other-member-row" data-index="0">
          <input type="text" name="other_name_0" placeholder="其他人的姓名" class="other-name-input">
          <button type="button" class="btn-remove" onclick="removeOtherMember(this)" style="display:none;">×</button>
        </div>
      </div>
      <button type="button" class="btn-add" id="btnAddMember" onclick="addOtherMember()">+ 加入其他人</button>

      <!-- 確認按鈕（解鎖後可按） -->
      <div class="confirm-section" id="confirmSection">
        <button type="button" class="btn-confirm" id="confirmBtn" onclick="confirmOcr()">✅ 確認無誤，上傳</button>
      </div>

      <button type="submit" id="submitBtn" style="margin-top: 16px;" disabled>上傳</button>
      <div class="message" id="message"></div>
    </form>
  </div>
  <script>
    const form = document.getElementById('uploadForm');
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('placeholder');
    const ocrLoading = document.getElementById('ocrLoading');
    const ocrCard = document.getElementById('ocrCard');
    const confirmSection = document.getElementById('confirmSection');
    const submitBtn = document.getElementById('submitBtn');
    const message = document.getElementById('message');
    let uploadedImageUrl = null;
    let ocrConfirmed = false;

    // Set default month to next month
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    document.getElementById('month').value = now.toISOString().slice(0, 7);

    let otherMemberCount = 0;

    function addOtherMember() {
      otherMemberCount++;
      const container = document.getElementById('otherMembersContainer');
      const row = document.createElement('div');
      row.className = 'other-member-row';
      row.dataset.index = otherMemberCount;
      row.innerHTML = \`
        <input type="text" name="other_name_\${otherMemberCount}" placeholder="其他人的姓名" class="other-name-input">
        <button type="button" class="btn-remove" onclick="removeOtherMember(this)">×</button>
      \`;
      container.appendChild(row);
    }

    function removeOtherMember(btn) {
      btn.parentElement.remove();
    }

    // User clicks "確認無誤，上傳"
    function confirmOcr() {
      ocrConfirmed = true;
      // Copy OCR fields to form fields
      const ocrName = document.getElementById('ocrName').value.trim();
      if (ocrName) {
        document.getElementById('name').value = ocrName;
      }
      confirmSection.style.display = 'none';
      ocrCard.style.borderColor = '#888';
      submitBtn.disabled = false;
      submitBtn.textContent = '📤 確認上傳';
    }

    // Image preview + auto OCR
    document.getElementById('image').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Reset state
      ocrConfirmed = false;
      ocrCard.classList.remove('show');
      confirmSection.classList.remove('show');
      submitBtn.disabled = true;
      submitBtn.textContent = '上傳';

      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        placeholder.style.display = 'none';
        const img = document.createElement('img');
        img.src = e.target.result;
        img.id = 'previewImg';
        preview.innerHTML = '';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);

      // Show loading
      ocrLoading.classList.add('show');

      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await fetch('/api/analyze', { method: 'POST', body: formData });
        const data = await res.json();

        ocrLoading.classList.remove('show');

        if (res.ok && data.success) {
          uploadedImageUrl = data.imageUrl;
          const ai = data.aiResult;

          // Populate OCR card
          document.getElementById('ocrName').value = ai.name || '';
          document.getElementById('ocrAmount').value = ai.amount || '';
          document.getElementById('ocrBank').value = ai.bank || '';
          document.getElementById('ocrRef').value = ai.reference || '';

          // Show original values as hint
          document.getElementById('ocrNameOrig').textContent = ai.name ? '(辨識: ' + ai.name + ')' : '';
          document.getElementById('ocrAmountOrig').textContent = ai.amount ? '(辨識: ' + ai.amount + ')' : '';
          document.getElementById('ocrBankOrig').textContent = ai.bank ? '(辨識: ' + ai.bank + ')' : '';
          document.getElementById('ocrRefOrig').textContent = ai.reference ? '(辨識: ' + ai.reference + ')' : '';

          const conf = ai.confidence !== undefined ? ai.confidence + '%' : '—';
          document.getElementById('ocrConfidence').textContent = '置信度: ' + conf;

          ocrCard.classList.add('show');
          confirmSection.classList.add('show');

          // Pre-fill name field if OCR detected one
          if (ai.name) {
            document.getElementById('name').value = ai.name;
          }
        } else {
          // Show card with empty fields for manual entry
          ocrCard.classList.add('show');
          confirmSection.classList.add('show');
          document.getElementById('ocrConfidence').textContent = '置信度: —';
        }
      } catch (err) {
        ocrLoading.classList.remove('show');
        ocrCard.classList.add('show');
        confirmSection.classList.add('show');
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!ocrConfirmed) return;
      submitBtn.disabled = true;
      submitBtn.textContent = '上傳中...';
      message.className = 'message';
      message.style.display = 'none';

      // Collect other members
      const otherNames = [];
      document.querySelectorAll('.other-name-input').forEach(input => {
        if (input.value.trim()) otherNames.push(input.value.trim());
      });

      // Gather OCR data
      const ocrData = {
        name: document.getElementById('ocrName').value.trim(),
        amount: document.getElementById('ocrAmount').value.trim(),
        bank: document.getElementById('ocrBank').value.trim(),
        reference: document.getElementById('ocrRef').value.trim()
      };

      const formData = new FormData();
      formData.append('phone', document.getElementById('phone').value);
      formData.append('name', document.getElementById('name').value);
      formData.append('month', document.getElementById('month').value);
      formData.append('image', document.getElementById('image').files[0]);
      formData.append('other_members', JSON.stringify(otherNames));
      formData.append('ocr_data', JSON.stringify(ocrData));

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (res.ok) {
          let msg = '✅ 上傳成功！';
          if (data.renewalsCreated) msg += ' 已建立 ' + data.renewalsCreated + ' 筆續會記錄。';
          message.textContent = msg;
          message.className = 'message success';
          form.reset();
          preview.innerHTML = '<div class="placeholder" id="placeholder"><span>📷</span><span>上傳圖片自動 OCR</span></div>';
          ocrCard.classList.remove('show');
          ocrLoading.classList.remove('show');
          confirmSection.classList.remove('show');
          submitBtn.disabled = true;
          submitBtn.textContent = '上傳';
          ocrConfirmed = false;
          // Reset other members
          document.getElementById('otherMembersContainer').innerHTML = \`
            <div class="other-member-row" data-index="0">
              <input type="text" name="other_name_0" placeholder="其他人的姓名" class="other-name-input">
              <button type="button" class="btn-remove" onclick="removeOtherMember(this)" style="display:none;">×</button>
            </div>
          \`;
          otherMemberCount = 0;
        } else {
          message.textContent = '❌ ' + (data.error || '上傳失敗');
          message.className = 'message error';
          submitBtn.disabled = false;
          submitBtn.textContent = '📤 確認上傳';
        }
      } catch (err) {
        message.textContent = '❌ 網絡錯誤，請稍後再試';
        message.className = 'message error';
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 確認上傳';
      }
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
    .header { background: #1a73e8; color: white; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .header h1 { font-size: 22px; }
    .header-right { font-size: 13px; opacity: 0.9; }
    .nav { background: white; border-bottom: 1px solid #e0e0e0; padding: 0 30px; display: flex; gap: 0; }
    .nav-tab { padding: 15px 24px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #666; border-bottom: 3px solid transparent; transition: all 0.2s; }
    .nav-tab:hover { color: #1a73e8; }
    .nav-tab.active { color: #1a73e8; border-bottom-color: #1a73e8; }
    .container { padding: 30px; max-width: 1400px; margin: 0 auto; }
    .filters { display: flex; gap: 10px; margin-bottom: 25px; flex-wrap: wrap; }
    .filter-btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: white; color: #333; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .filter-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
    .filter-btn.active { background: #1a73e8; color: white; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 30px; }
    .stat-card { background: white; padding: 18px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .stat-card .number { font-size: 32px; font-weight: 700; color: #1a73e8; }
    .stat-card .label { color: #666; margin-top: 4px; font-size: 13px; }
    .stat-card.confirmed .number { color: #34a853; }
    .stat-card.pending .number { color: #fbbc04; }
    .stat-card.flagged .number { color: #ea4335; }
    .month-section { margin-bottom: 40px; }
    .month-title { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e0e0e0; display: flex; align-items: center; gap: 10px; }
    .month-title .badge { background: #1a73e8; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .payment-card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 16px; }
    .payment-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px; }
    .payment-header .left { display: flex; flex-direction: column; gap: 4px; }
    .payment-header .month { font-weight: 600; font-size: 15px; color: #333; }
    .payment-header .date { font-size: 12px; color: #888; }
    .payment-header .right { display: flex; align-items: center; gap: 10px; }
    .status { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status.confirmed { background: #d4edda; color: #155724; }
    .status.pending { background: #fff3cd; color: #856404; }
    .status.flagged { background: #ffeeba; color: #856404; }
    .members-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .member-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 13px; background: #e9ecef; color: #333; }
    .member-chip.main { background: #e3f2fd; color: #1565c0; font-weight: 500; }
    .member-chip .phone { font-size: 11px; color: #888; }
    .payment-image { margin-top: 12px; }
    .payment-image img { max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #e0e0e0; cursor: pointer; transition: transform 0.2s; }
    .payment-image img:hover { transform: scale(1.05); }
    .ai-info { margin-top: 10px; font-size: 13px; color: #666; }
    .ai-info .confidence { color: #2e7d32; font-weight: 600; }
    .renewals-list { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .renewal-item { padding: 14px 20px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
    .renewal-item:last-child { border-bottom: none; }
    .renewal-item .info { display: flex; flex-direction: column; gap: 2px; }
    .renewal-item .name { font-weight: 500; color: #333; }
    .renewal-item .phone { font-size: 12px; color: #888; }
    .renewal-item .month-tag { background: #fff3cd; color: #856404; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .empty { text-align: center; padding: 60px; color: #666; }
    .loading { text-align: center; padding: 40px; color: #666; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center; }
    .modal.show { display: flex; }
    .modal-content { background: white; border-radius: 12px; max-width: 800px; width: 95%; max-height: 90vh; overflow: auto; }
    .modal-header { padding: 20px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { font-size: 18px; }
    .modal-close { background: none; border: none; font-size: 28px; cursor: pointer; color: #666; }
    .modal-body { padding: 20px; }
    .modal-image { width: 100%; border-radius: 8px; margin-bottom: 15px; }
    .ai-result { background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.7; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-action { padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; }
    .btn-confirm { background: #34a853; color: white; }
    .btn-flag { background: #ea4335; color: white; }
    .btn-reset { background: #fbbc04; color: #333; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 LWRC Staff Dashboard</h1>
    <div class="header-right">Group Payment · 續會管理</div>
  </div>
  <div class="nav">
    <button class="nav-tab active" data-tab="payments" onclick="switchTab('payments')">💰 繳費記錄</button>
    <button class="nav-tab" data-tab="renewals" onclick="switchTab('renewals')">📅 待續會員</button>
  </div>
  <div class="container">
    <!-- Payments Tab -->
    <div class="tab-content active" id="tab-payments">
      <div class="filters">
        <button class="filter-btn active" data-filter="all">全部</button>
        <button class="filter-btn" data-filter="confirmed">已確認</button>
        <button class="filter-btn" data-filter="pending">待確認</button>
        <button class="filter-btn" data-filter="flagged">有問題</button>
      </div>
      <div class="stats">
        <div class="stat-card"><div class="number" id="totalPayments">-</div><div class="label">總記錄</div></div>
        <div class="stat-card confirmed"><div class="number" id="confirmedCount">-</div><div class="label">已確認</div></div>
        <div class="stat-card pending"><div class="number" id="pendingCount">-</div><div class="label">待確認</div></div>
        <div class="stat-card flagged"><div class="number" id="flaggedCount">-</div><div class="label">有問題</div></div>
      </div>
      <div id="paymentsList"><div class="loading">載入中...</div></div>
    </div>

    <!-- Renewals Tab -->
    <div class="tab-content" id="tab-renewals">
      <div id="renewalsList"><div class="loading">載入中...</div></div>
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
    let allPayments = [];
    let allRenewals = [];
    let currentFilter = 'all';

    async function loadData() {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        allPayments = data.payments || [];
        allRenewals = data.renewals || [];
        updateStats(data.stats);
        renderPayments();
        renderRenewals();
      } catch (err) {
        document.getElementById('paymentsList').innerHTML = '<div class="empty">載入失敗</div>';
      }
    }

    function updateStats(stats) {
      document.getElementById('totalPayments').textContent = stats.total;
      document.getElementById('confirmedCount').textContent = stats.confirmed;
      document.getElementById('pendingCount').textContent = stats.pending;
      document.getElementById('flaggedCount').textContent = stats.flagged;
    }

    function renderPayments() {
      const filtered = currentFilter === 'all' 
        ? allPayments 
        : allPayments.filter(p => p.status === currentFilter);

      const container = document.getElementById('paymentsList');
      if (filtered.length === 0) {
        container.innerHTML = '<div class="empty">沒有資料</div>';
        return;
      }

      // Group by month
      const byMonth = {};
      filtered.forEach(p => {
        if (!byMonth[p.month]) byMonth[p.month] = [];
        byMonth[p.month].push(p);
      });

      const months = Object.keys(byMonth).sort().reverse();
      container.innerHTML = months.map(month => {
        const payments = byMonth[month];
        return '<div class="month-section">' +
          '<div class="month-title">' + month + ' <span class="badge">' + payments.length + ' 筆</span></div>' +
          payments.map(p => renderPaymentCard(p)).join('') +
        '</div>';
      }).join('');
    }

    function renderPaymentCard(p) {
      const statusLabels = { confirmed: '✅ 已確認', pending: '⏳ 待確認', flagged: '⚠️ 有問題' };
      const statusClass = p.status;
      const date = new Date(p.uploaded_at).toLocaleDateString('zh-HK');

      let membersHtml = '';
      if (p.mainMember) {
        membersHtml += '<span class="member-chip main">' + p.mainMember.name + ' <span class="phone">' + p.mainMember.phone + '</span></span>';
      }
      if (p.other_members && p.other_members.length > 0) {
        p.other_members.forEach(n => {
          membersHtml += '<span class="member-chip">' + n + '</span>';
        });
      }

      let aiHtml = '';
      if (p.ai_result) {
        const ai = typeof p.ai_result === 'string' ? JSON.parse(p.ai_result) : p.ai_result;
        if (ai.confidence !== undefined) {
          aiHtml += '<div class="ai-info">置信度: <span class="confidence">' + ai.confidence + '%</span></div>';
        }
      }

      return '<div class="payment-card">' +
        '<div class="payment-header">' +
          '<div class="left">' +
            '<div class="month">📅 ' + p.month + '</div>' +
            '<div class="date">上傳: ' + date + '</div>' +
          '</div>' +
          '<div class="right">' +
            '<span class="status ' + statusClass + '">' + statusLabels[statusClass] + '</span>' +
            '<div class="actions">' +
              '<button class="btn-action btn-confirm" onclick="updateStatus(' + p.id + ', \'confirmed\')">✅ 確認</button>' +
              '<button class="btn-action btn-flag" onclick="updateStatus(' + p.id + ', \'flagged\')">⚠️ 標記</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="members-row">' + membersHtml + '</div>' +
        (p.image_url ? '<div class="payment-image"><img src="' + p.image_url + '" onclick="openModal(' + p.id + ')" alt="截圖"></div>' : '') +
        aiHtml +
      '</div>';
    }

    function renderRenewals() {
      const container = document.getElementById('renewalsList');
      if (allRenewals.length === 0) {
        container.innerHTML = '<div class="empty">沒有待續會員 🎉</div>';
        return;
      }

      // Group by month
      const byMonth = {};
      allRenewals.forEach(r => {
        if (!byMonth[r.month]) byMonth[r.month] = [];
        byMonth[r.month].push(r);
      });

      const months = Object.keys(byMonth).sort();
      container.innerHTML = months.map(month => {
        const renewals = byMonth[month];
        return '<div class="month-section">' +
          '<div class="month-title">' + month + ' <span class="badge">' + renewals.length + ' 人待續</span></div>' +
          '<div class="renewals-list">' +
          renewals.map(r => {
            const phone = r.member.phone.startsWith('852') ? r.member.phone : '852' + r.member.phone;
            return '<div class="renewal-item">' +
              '<div class="info">' +
                '<div class="name">' + r.member.name + '</div>' +
                '<div class="phone"><a href="https://wa.me/' + phone + '" target="_blank" style="color:#1a73e8;text-decoration:none;">' + r.member.phone + '</a></div>' +
              '</div>' +
              '<span class="month-tag">' + month + '</span>' +
            '</div>';
          }).join('') +
          '</div>' +
        '</div>';
      }).join('');
    }

    async function updateStatus(id, status) {
      try {
        const res = await fetch('/api/payments/' + id + '/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          const p = allPayments.find(x => x.id === id);
          if (p) p.status = status;
          renderPayments();
        }
      } catch (err) {
        alert('更新失敗');
      }
    }

    function openModal(paymentId) {
      const p = allPayments.find(x => x.id === paymentId);
      if (!p) return;
      let html = '';
      if (p.image_url) html += '<img class="modal-image" src="' + p.image_url + '" alt="截圖">';
      if (p.ai_result) {
        const ai = typeof p.ai_result === 'string' ? JSON.parse(p.ai_result) : p.ai_result;
        html += '<div class="ai-result"><strong>AI 分析結果:</strong><br>';
        if (ai.names && ai.names.length > 0) html += '識別到名字: ' + ai.names.join(', ') + '<br>';
        if (ai.confidence !== undefined) html += '置信度: ' + ai.confidence + '%<br>';
        if (ai.extractedText) html += '提取文字: ' + ai.extractedText + '</div>';
      }
      document.getElementById('modalBody').innerHTML = html;
      document.getElementById('modal').classList.add('show');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('show');
    }

    function switchTab(tab) {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelector('.nav-tab[data-tab="' + tab + '"]').classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderPayments();
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

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
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

      // API: Analyze (auto OCR)
      if (path === '/api/analyze' && request.method === 'POST') {
        return await handleAnalyze(request, env);
      }

      // API: Members list
      if (path === '/api/members' && request.method === 'GET') {
        return await handleGetMembers(request, env);
      }

      // API: Renewals
      if (path === '/api/renewals' && request.method === 'GET') {
        return await handleGetRenewals(request, env);
      }

      // API: Update payment status
      if (path.match(/^\/api\/payments\/(\d+)\/status$/) && request.method === 'PATCH') {
        const id = parseInt(path.match(/^\/api\/payments\/(\d+)\/status$/)[1]);
        return await handleUpdatePaymentStatus(request, env, id);
      }

      // API: Health check
      if (path === '/api/health' && request.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Generate member ID like LWR001, LWR002...
async function generateMemberId(env) {
  const members = await env.DB.prepare('SELECT id FROM members ORDER BY id DESC LIMIT 1').first();
  if (!members) return 'LWR001';
  const num = parseInt(members.id.replace('LWR', '')) + 1;
  return 'LWR' + String(num).padStart(3, '0');
}

// Handle file upload
async function handleUpload(request, env) {
  const formData = await request.formData();
  const phone = formData.get('phone');
  const name = formData.get('name');
  const month = formData.get('month');
  const image = formData.get('image');
  const otherMembersRaw = formData.get('other_members');
  const other_members = otherMembersRaw ? JSON.parse(otherMembersRaw) : [];

  if (!phone || !name || !month || !image) {
    return new Response(JSON.stringify({ error: '缺少必要資料' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Find or create main member
  let member = await env.DB.prepare('SELECT * FROM members WHERE phone = ?').bind(phone).first();
  if (!member) {
    const memberId = await generateMemberId(env);
    await env.DB.prepare('INSERT INTO members (id, name, phone) VALUES (?, ?, ?)').bind(memberId, name, phone).run();
    member = { id: memberId, name, phone };
  }

  // Upload image to R2
  const imageKey = `${month}/${member.id}_${Date.now()}_${image.name}`;
  await env.IMAGES.put(imageKey, image);

  const imageUrl = imageKey; // Use key, not full URL

  // Perform AI analysis first to get results
  const aiResult = await analyzeImageGetResult(image, env);
  
  // Determine status based on confidence
  let status = 'pending';
  if (aiResult && aiResult.confidence >= 80) status = 'confirmed';
  if (aiResult && aiResult.confidence < 50) status = 'flagged';

  // Insert payment record
  const result = await env.DB.prepare(`
    INSERT INTO payments (month, amount, image_url, ai_result, status, paid_by_member_id, other_members, uploaded_at)
    VALUES (?, 0, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(month, imageUrl, JSON.stringify(aiResult || {}), status, member.id, JSON.stringify(other_members)).run();

  // Create renewal records for main member and other members
  const allNames = [name, ...other_members];
  const renewalsCreated = [];

  for (const n of allNames) {
    // Try to find member by name (case-insensitive)
    let m = await env.DB.prepare('SELECT * FROM members WHERE LOWER(name) = LOWER(?)').bind(n).first();
    
    if (!m && n === name) {
      // Main payer not found by phone (rare), use the member we just created
      m = member;
    }

    if (m) {
      // Check if renewal already exists for this member+month
      const existing = await env.DB.prepare(
        'SELECT * FROM renewals WHERE member_id = ? AND month = ?'
      ).bind(m.id, month).first();

      if (!existing) {
        await env.DB.prepare(`
          INSERT INTO renewals (member_id, month, status, paid_at)
          VALUES (?, ?, 'paid', datetime('now'))
        `).bind(m.id, month).run();
        renewalsCreated.push(m.name);
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    member: { id: member.id, name: member.name, phone: member.phone },
    imageUrl: imageUrl,
    status,
    aiResult,
    renewalsCreated: renewalsCreated.length
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Analyze image and return structured result (name, amount, bank, reference)
async function analyzeImageGetResult(imageFile, env) {
  if (!env.MINIMAX_API_KEY) {
    return { error: 'MiniMax API key not configured', confidence: 0 };
  }

  try {
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    // Get all member names for matching
    const members = await env.DB.prepare('SELECT name FROM members').all();
    const memberNames = members.results?.map(m => m.name) || [];

    // Build prompt for structured extraction
    const prompt = `請仔細分析這張銀行轉帳截圖，從圖片中識別並提取以下資訊，以JSON格式回覆：
{
  "name": "付款人姓名",
  "amount": "金額（港幣）",
  "bank": "銀行名稱",
  "reference": "過數編號/轉帳參考號"
}
規則：
- name: 付款人姓名（中文或英文）
- amount: 金額，只需數字，例如 "500"
- bank: 銀行名稱，例如 "HSBC", "恒生", "中銀"
- reference: 轉帳參考編號或交易編號
- extractedText: 圖片中所有識別到的文字（完整原文）
- 如果某項資訊無法識別，該欄位留空字串
- 只回覆JSON，不要其他文字`;

    // Try minimax.com first, then minimaxi.com
    let result;
    const requestBody = {
      model: 'image-01',
      image_base64: base64Image,
      prompt
    };

    let apiResponse = await fetch('https://api.minimax.com/v1/images/describe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      // Try alternative endpoint
      apiResponse = await fetch('https://api.minimaxi.com/v1/images/describe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!apiResponse.ok) {
        console.error('MiniMax API error:', await apiResponse.text());
        return { confidence: 0, name: '', amount: '', bank: '', reference: '' };
      }
    }

    result = await apiResponse.json();
    const extractedText = result.data?.description || result.data?.text || '';

    // Parse structured result
    let name = '', amount = '', bank = '', reference = '';
    try {
      const parsed = JSON.parse(extractedText);
      name = parsed.name || '';
      amount = parsed.amount || '';
      bank = parsed.bank || '';
      reference = parsed.reference || '';
    } catch {
      // Fallback: try to extract from raw text
      const text = extractedText;

      // Extract amount - look for HK$ or numbers near "HKD" or amount keywords
      const amountMatch = text.match(/HK\$\s*([\d,]+)|HKD[:\s]*([\d,]+)|金額[:\s]*([\d,]+)|([\d,]+)\s*元/);
      if (amountMatch) {
        amount = (amountMatch[1] || amountMatch[2] || amountMatch[3] || amountMatch[4] || '').replace(/,/g, '');
      }

      // Extract bank names
      const bankPatterns = ['HSBC', '恒生', '中國銀行', '中銀', 'BOCHK', 'Citibank', '滙豐', '渣打', 'SCB', '東亞', 'BEA', '招商銀行', 'CMB'];
      for (const bp of bankPatterns) {
        if (text.includes(bp)) { bank = bp; break; }
      }

      // Extract reference - usually has keywords like 參考, reference, 編號, ID
      const refMatch = text.match(/參考[號碼]*[:\s]*([A-Z0-9]{6,})|reference[:\s]*([A-Z0-9]{6,})|編號[:\s]*([A-Z0-9]{6,})/i);
      if (refMatch) {
        reference = (refMatch[1] || refMatch[2] || refMatch[3] || '').toUpperCase();
      }

      // Extract name - usually Chinese 2-4 characters
      const nameMatch = text.match(/[\u4e00-\u9fa5]{2,4}/);
      if (nameMatch) name = nameMatch[0];
    }

    // Match name against member list
    const matches = [];
    if (name) {
      const matched = memberNames.find(mn => mn.includes(name) || name.includes(mn));
      if (matched) matches.push(name);
    }

    // Confidence based on how many fields were filled
    const filledCount = [name, amount, bank, reference].filter(v => v).length;
    const confidence = Math.min(95, filledCount * 20 + (matches.length > 0 ? 20 : 0));

    return {
      name,
      amount,
      bank,
      reference,
      extractedText,
      names: name ? [name] : [],
      matches,
      confidence,
      raw: result.data || {}
    };
  } catch (err) {
    console.error('AI analysis error:', err);
    return { confidence: 0, name: '', amount: '', bank: '', reference: '', names: [], matches: [] };
  }
}

// Handle analyze request
async function handleAnalyze(request, env) {
  const formData = await request.formData();
  const image = formData.get('image');

  if (!image) {
    return new Response(JSON.stringify({ error: 'No image provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Upload image temporarily
  const imageKey = `temp/${Date.now()}_${image.name}`;
  await env.IMAGES.put(imageKey, image);

  const aiResult = await analyzeImageGetResult(image, env);

  return new Response(JSON.stringify({
    success: true,
    imageUrl: imageKey,
    aiResult
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Dashboard data
async function handleDashboard(request, env) {
  // Get all payments with member info
  const payments = await env.DB.prepare(`
    SELECT p.*, m.name as main_member_name, m.phone as main_member_phone
    FROM payments p
    LEFT JOIN members m ON p.paid_by_member_id = m.id
    ORDER BY p.uploaded_at DESC
    LIMIT 100
  `).all();

  // Get pending renewals (members who haven't paid for current or next month)
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 7);

  const pendingRenewals = await env.DB.prepare(`
    SELECT r.*, m.name, m.phone
    FROM renewals r
    JOIN members m ON r.member_id = m.id
    WHERE r.status = 'pending'
    AND (r.month = ? OR r.month = ?)
    ORDER BY r.month ASC
  `).bind(currentMonth, nextMonth).all();

  // Also get all members who don't have a renewal record for next month
  const allMembers = await env.DB.prepare('SELECT * FROM members ORDER BY created_at DESC').all();
  const membersWithRenewal = await env.DB.prepare(
    'SELECT DISTINCT member_id FROM renewals WHERE month = ?'
  ).bind(nextMonth).all();
  const renewedMemberIds = new Set(membersWithRenewal.results?.map(r => r.member_id) || []);

  const missingRenewals = allMembers.results?.filter(m => !renewedMemberIds.has(m.id)).map(m => ({
    member_id: m.id,
    month: nextMonth,
    status: 'pending',
    member: { id: m.id, name: m.name, phone: m.phone }
  })) || [];

  // Calculate stats
  let confirmed = 0, pending = 0, flagged = 0;
  payments.results?.forEach(p => {
    if (p.status === 'confirmed') confirmed++;
    else if (p.status === 'pending') pending++;
    else if (p.status === 'flagged') flagged++;
  });

  // Enrich payments with member data
  const enrichedPayments = (payments.results || []).map(p => {
    let mainMember = null;
    if (p.main_member_name) {
      mainMember = { name: p.main_member_name, phone: p.main_member_phone };
    }
    let other_members = [];
    try {
      other_members = JSON.parse(p.other_members || '[]');
    } catch {}
    return { ...p, mainMember, other_members };
  });

  return new Response(JSON.stringify({
    payments: enrichedPayments,
    renewals: [...(pendingRenewals.results || []).map(r => ({
      ...r,
      member: { id: r.member_id, name: r.name, phone: r.phone }
    })), ...missingRenewals],
    stats: {
      total: payments.results?.length || 0,
      confirmed,
      pending,
      flagged
    }
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

// Get renewals
async function handleGetRenewals(request, env) {
  const renewals = await env.DB.prepare(`
    SELECT r.*, m.name, m.phone
    FROM renewals r
    JOIN members m ON r.member_id = m.id
    ORDER BY r.month ASC
  `).all();
  return new Response(JSON.stringify({ renewals: renewals.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Update payment status
async function handleUpdatePaymentStatus(request, env, id) {
  const { status } = await request.json();
  if (!['pending', 'confirmed', 'flagged'].includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await env.DB.prepare('UPDATE payments SET status = ? WHERE id = ?').bind(status, id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
