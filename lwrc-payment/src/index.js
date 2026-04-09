/**
 * LWRC 繳費系統 v6 - 參加者一頁流程
 */
const WHATSAPP_STAFF = "85261789563";

// ─────────────────────────────────────────────────────────────────
// Pages
// ─────────────────────────────────────────────────────────────────
const PAGE_UPLOAD = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LWRC 繳費上傳</title>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f4;min-height:100vh;padding:20px}
.container{max-width:600px;margin:0 auto}
.card{background:white;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
h1{color:#1a73e8;text-align:center;margin-bottom:20px;font-size:22px}
.step{margin-bottom:24px}
.step-num{background:#1a73e8;color:white;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;margin-right:8px}
.step-title{font-size:16px;font-weight:600;color:#333;display:inline}
.upload-zone{border:2px dashed #ccc;border-radius:12px;padding:40px;text-align:center;cursor:pointer;transition:border-color .2s}
.upload-zone:hover{border-color:#1a73e8}
.upload-zone input{display:none}
.upload-zone .icon{font-size:48px;color:#ccc}
.upload-zone .text{color:#666;margin-top:8px;font-size:14px}
.preview{text-align:center;margin-top:16px}
.preview img{max-width:100%;max-height:300px;border-radius:8px;border:2px solid #eee}
.ocr-result{border:2px solid #28a745;border-radius:12px;padding:16px;background:#f8fff8;margin-top:16px;display:none}
.ocr-result.show{display:block}
.ocr-result h3{color:#28a745;font-size:14px;margin-bottom:12px}
.ocr-field{margin-bottom:10px}
.ocr-field label{font-size:12px;color:#666;font-weight:500}
.ocr-field span{font-size:16px;color:#333;margin-left:8px}
.split-section{margin-top:16px;display:none}
.split-section.show{display:block}
.person-card{border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:8px}
.person-header{display:flex;justify-content:space-between;align-items:center}
.person-name{font-weight:600;font-size:15px}
.person-phone{font-size:13px;color:#666}
.person-remove{background:none;border:none;color:#dc3545;font-size:13px;cursor:pointer}
.add-person-btn{width:100%;padding:10px;border:1px dashed #1a73e8;border-radius:8px;background:none;color:#1a73e8;font-size:14px;cursor:pointer;margin-top:8px}
.months-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.month-chip{border:1px solid #ddd;border-radius:20px;padding:6px 14px;font-size:13px;cursor:pointer;transition:all .2s;user-select:none}
.month-chip:hover{border-color:#1a73e8}
.month-chip.selected{background:#1a73e8;color:white;border-color:#1a73e8}
.month-chip.paid{background:#e8f5e9;color:#2e7d32;opacity:.7;cursor:default}
.total-row{margin-top:16px;padding:12px;background:#f8f8f8;border-radius:8px;font-size:15px}
.total-row .label{color:#666}
.total-row .amount{font-weight:bold;color:#333;margin-left:8px}
.match-ok{color:#28a745;font-weight:600}
.match-fail{color:#dc3545;font-weight:600}
.btn-submit{width:100%;padding:14px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-top:16px;transition:background .2s}
.btn-submit.ready{background:#28a745;color:white}
.btn-submit.ready:hover{background:#1e7e34}
.btn-submit.disabled{background:#ccc;color:#666;cursor:not-allowed}
.btn-whatsapp{width:100%;padding:12px;border:2px solid #25d366;border-radius:8px;background:none;color:#25d366;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px;display:none;text-align:center}
.btn-whatsapp.show{display:block}
.btn-whatsapp:hover{background:#25d366;color:white}
.loading{border:2px solid #ffc107;border-top-color:#transparent;border-radius:50%;width:24px;height:24px;animation:spin .8s linear infinite;margin:20px auto;display:none}
.loading.show{display:block}
@keyframes spin{to{transform:rotate(360deg)}
.info{background:#fff3cd;border-radius:8px;padding:12px;font-size:13px;color:#856404;margin-top:12px}
.hidden{display:none}
</style>
</head>
<body>
<div class="container">
<h1>LWRC 繳費上傳</h1>

<!-- STEP 1: Upload -->
<div class="card" id="step1">
<div class="step">
<span class="step-num">1</span>
<span class="step-title">上傳轉帳截圖</span>
</div>
<label class="upload-zone" id="uploadZone">
<input type="file" accept="image/*" id="fileInput">
<div class="icon">📷</div>
<div class="text">點擊選擇圖片或拍照</div>
</label>
<div class="preview hidden" id="preview"></div>
<div class="loading" id="loading"></div>
</div>

<!-- STEP 2: OCR Result -->
<div class="card hidden" id="step2">
<div class="step">
<span class="step-num">2</span>
<span class="step-title">AI 識別結果</span>
</div>
<div class="ocr-result" id="ocrResult">
<p>姓名：<span id="ocrName">-</span></p>
<p>金額：<span id="ocrAmount">-</span></p>
<p>銀行：<span id="ocrBank">-</span></p>
</div>
<div class="info">請確認識別結果，如有需要可修改。</div>
</div>

<!-- STEP 3: Split & Check -->
<div class="card hidden" id="step3">
<div class="step">
<span class="step-num">3</span>
<span class="step-title">分拆參加者</span>
</div>

<div id="personsList"></div>
<button class="add-person-btn" id="addPersonBtn">+ 加入另一人</button>

<div class="split-section" id="monthsSection" style="margin-top:20px;">
<p style="font-size:14px;color:#666;margin-bottom:10px;">請剔選要繳的月份：</p>
<div class="months-grid" id="monthsGrid"></div>
<div class="total-row">
<span class="label">已選合計：</span>
<span class="amount" id="totalAmount">HK$0</span>
<span id="matchStatus"></span>
</div>
</div>
</div>

<!-- STEP 4: Submit -->
<div class="card hidden" id="step4">
<button class="btn-submit disabled" id="btnSubmit" disabled>請先確認月份</button>
<button class="btn-whatsapp" id="btnWhatsapp" onclick="window.open('https://wa.me/{{whatsapp}}','_blank')">WhatsApp 聯絡職員</button>
</div>
</div>

<script>
const WHATSAPP = "{{whatsapp}}";
const MONTHS_PRICE = {{monthsPrice}};

let ocrData = null;
let persons = [];
let selectedMonths = new Set();
let aiTotal = 0;

const fileInput = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');
const preview = document.getElementById('preview');
const loading = document.getElementById('loading');
const ocrResult = document.getElementById('ocrResult');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');
const personsList = document.getElementById('personsList');
const addPersonBtn = document.getElementById('addPersonBtn');
const monthsSection = document.getElementById('monthsSection');
const monthsGrid = document.getElementById('monthsGrid');
const totalAmount = document.getElementById('totalAmount');
const matchStatus = document.getElementById('matchStatus');
const btnSubmit = document.getElementById('btnSubmit');
const btnWhatsapp = document.getElementById('btnWhatsapp');

fileInput.addEventListener('change', handleUpload);
addPersonBtn.addEventListener('click', addPerson);

async function handleUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    preview.innerHTML = '<img src="' + ev.target.result + '" alt="preview">';
    preview.classList.remove('hidden');
    uploadZone.querySelector('.text').textContent = file.name;
    loading.classList.add('show');
    loading.textContent = "OCR 識別中...";

    try {
      if (typeof Tesseract === 'undefined') {
        alert('OCR 載入中，請稍後再試');
        loading.classList.remove('show');
        return;
      }
      const result = await Tesseract.recognize(ev.target.result, 'eng+chi_tra', {
        logger: m => { if(m.status === 'recognizing text') loading.textContent = "OCR 識別中... " + Math.round(m.progress * 100) + "%"; }
      });
      loading.classList.remove('show');
      const text = result.data.text;
      // Extract amount (HK$) and name from text
      const amountMatch = text.match(/HK\$\s*([0-9,]+)|([0-9,]+)\s*HK|HK\$?([0-9,]+)/);
      const amount = amountMatch ? (amountMatch[1] || amountMatch[2] || amountMatch[3]).replace(/,/g, "") : null;
      const nameMatch = text.match(/[\u4e00-\u9fff]{2,4}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/);
      const name = nameMatch ? nameMatch[0].trim() : null;
      ocrData = { name, amount, bank: "OCR", raw: text.slice(0, 300) };
      aiTotal = parseInt(amount) || 0;
      document.getElementById('ocrName').textContent = name || '-';
      document.getElementById('ocrAmount').textContent = amount ? 'HK$' + amount : '-';
      document.getElementById('ocrBank').textContent = 'OCR';
      step2.classList.remove('hidden');
      step3.classList.remove('hidden');
      step4.classList.remove('hidden');
      persons = [{name: name || '', phone: ''}];
      renderPersons();
      renderMonths();
      if (Object.keys(MONTHS_PRICE).length === 0) {
        alert('系統尚未設定月份，請聯絡職員');
      }
    } catch(err) {
      loading.classList.remove('show');
      alert('OCR 失敗：' + err.message);
    }
  };
  reader.readAsDataURL(file);
}

function addPerson() {
  persons.push({name: '', phone: ''});
  renderPersons();
}

function removePerson(i) {
  persons.splice(i, 1);
  renderPersons();
  updateTotal();
}

function renderPersons() {
  personsList.innerHTML = persons.map((p, i) => '
    <div class="person-card">
      <div class="person-header">
        <span class="person-name">' + (i === 0 ? '主要付款人' : '同行人 ' + i) + '</span>
        ' + (i > 0 ? '<button class="person-remove" onclick="removePerson(' + i + ')">移除</button>' : '') + '
      </div>
      <input type="text" placeholder="姓名" value="' + (p.name||'').replace(/"/g,'&quot;') + '" onchange="persons[' + i + '].name=this.value" style="width:100%;margin-top:8px;padding:8px;border:1px solid #ddd;border-radius:6px">
      <input type="tel" placeholder="電話" value="' + (p.phone||'').replace(/"/g,'&quot;') + '" onchange="persons[' + i + '].phone=this.value" style="width:100%;margin-top:8px;padding:8px;border:1px solid #ddd;border-radius:6px">
    </div>
  ').join('');
}

function renderMonths() {
  monthsGrid.innerHTML = Object.entries(MONTHS_PRICE).map(([id, info]) => '
    <div class="month-chip" data-month="' + id + '" onclick="toggleMonth(\'' + id + '\')">
      ' + info.name + ' $' + info.price + '
    </div>
  ').join('');
}

function toggleMonth(monthId) {
  const chip = monthsGrid.querySelector('[data-month="' + monthId + '"]');
  if (chip.classList.contains('paid')) return;
  if (selectedMonths.has(monthId)) {
    selectedMonths.delete(monthId);
    chip.classList.remove('selected');
  } else {
    selectedMonths.add(monthId);
    chip.classList.add('selected');
  }
  updateTotal();
}

function updateTotal() {
  let sum = 0;
  selectedMonths.forEach(m => { sum += MONTHS_PRICE[m]?.price || 0; });
  totalAmount.textContent = 'HK$' + sum;
  if (aiTotal > 0 && sum === aiTotal) {
    matchStatus.innerHTML = ' <span class="match-ok">✓ 金額符合</span>';
    btnSubmit.className = 'btn-submit ready';
    btnSubmit.disabled = false;
    btnSubmit.textContent = '確認上傳';
    btnWhatsapp.classList.remove('show');
  } else if (sum > 0) {
    matchStatus.innerHTML = ' <span class="match-fail">✗ 金額不符 (AI:HK$' + aiTotal + ')</span>';
    btnSubmit.className = 'btn-submit disabled';
    btnSubmit.disabled = true;
    btnSubmit.textContent = '金額不符';
    btnWhatsapp.classList.add('show');
  } else {
    matchStatus.innerHTML = '';
    btnSubmit.className = 'btn-submit disabled';
    btnSubmit.disabled = true;
    btnSubmit.textContent = '請先剔選月份';
    btnWhatsapp.classList.remove('show');
  }
}

btnSubmit.addEventListener('click', async () => {
  const formData = new FormData();
  formData.append('persons', JSON.stringify(persons));
  formData.append('months', JSON.stringify([...selectedMonths]));
  formData.append('ai_total', aiTotal);
  const file = fileInput.files[0];
  if (file) formData.append('image', file);
  btnSubmit.textContent = '上傳中...';
  btnSubmit.disabled = true;
  try {
    const resp = await fetch('/api/submit', { method: 'POST', body: formData });
    const data = await resp.json();
    if (data.success) {
      btnSubmit.textContent = '✓ 已上傳';
      btnSubmit.className = 'btn-submit ready';
      alert('成功上傳！');
    } else {
      btnSubmit.textContent = '上傳失敗';
      btnSubmit.disabled = false;
      alert('上傳失敗：' + (data.error || ''));
    }
  } catch(err) {
    btnSubmit.textContent = '上傳失敗';
    btnSubmit.disabled = false;
    alert('上傳失敗：' + err.message);
  }
});
</script>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────
// Dashboard (keep from v5)
// ─────────────────────────────────────────────────────────────────
const PAGE_DASHBOARD = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LWRC 管理後台</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f4;padding:20px}
.container{max-width:900px;margin:0 auto}
h1{color:#1a73e8;margin-bottom:20px;font-size:22px}
.card{background:white;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.tabs{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.tab{padding:8px 16px;border:1px solid #ddd;border-radius:8px;background:none;cursor:pointer;font-size:14px}
.tab.active{background:#1a73e8;color:white;border-color:#1a73e8}
.tab-content{display:none}
.tab-content.active{display:block}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{padding:10px 8px;border-bottom:1px solid #eee;text-align:left}
th{background:#f8f8f8;font-weight:600;color:#333}
.status-green{padding:2px 8px;background:#e8f5e9;color:#2e7d32;border-radius:10px;font-size:12px}
.status-red{padding:2px 8px;background:#ffebee;color:#c62828;border-radius:10px;font-size:12px}
.status-yellow{padding:2px 8px;background:#fff8e1;color:#f57f17;border-radius:10px;font-size:12px}
.badge{margin-top:4px;display:block;font-size:11px;color:#888}
input,select{padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px}
.btn{padding:6px 14px;border:none;border-radius:6px;cursor:pointer;font-size:13px}
.btn-primary{background:#1a73e8;color:white}
.btn-danger{background:#dc3545;color:white}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:16px}
.stat-card{background:#f8f9fa;border-radius:8px;padding:16px;text-align:center}
.stat-num{font-size:32px;font-weight:bold;color:#1a73e8}
.stat-label{font-size:13px;color:#666;margin-top:4px}
.form-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.form-row input,.form-row select{padding:8px;border:1px solid #ddd;border-radius:6px}
.form-row label{font-size:14px;font-weight:500}
</style>
</head>
<body>
<div class="container">
<h1>LWRC 管理後台</h1>
<div class="tabs">
<button class="tab active" onclick="showTab('stats')">📊 概覽</button>
<button class="tab" onclick="showTab('members')">👥 參加者</button>
<button class="tab" onclick="showTab('months')">📅 月份</button>
<button class="tab" onclick="showTab('payments')">💰 繳費</button>
</div>

<div id="tab-stats" class="tab-content active">
<div class="grid" id="statsGrid"></div>
</div>

<div id="tab-members" class="tab-content">
<form class="form-row" onsubmit="addMember(event)">
<input type="text" id="newName" placeholder="姓名" required>
<input type="tel" id="newPhone" placeholder="電話" required>
<button type="submit" class="btn btn-primary">新增參加者</button>
</form>
<table id="membersTable">
<thead><tr><th>姓名</th><th>電話</th><th>狀態</th><th>操作</th></tr></thead>
<tbody></tbody>
</table>
</div>

<div id="tab-months" class="tab-content">
<form class="form-row" onsubmit="addMonth(event)">
<input type="text" id="newMonthName" placeholder="月份名稱 (如: 六月)" required>
<input type="number" id="newMonthPrice" placeholder="價錢 (HK$)" required>
<input type="number" id="newMonthClasses" placeholder="堂數" required>
<button type="submit" class="btn btn-primary">新增月份</button>
</form>
<table id="monthsTable">
<thead><tr><th>名稱</th><th>價錢</th><th>堂數</th><th>狀態</th><th>操作</th></tr></thead>
<tbody></tbody>
</table>
</div>

<div id="tab-payments" class="tab-content">
<select id="filterMonth" onchange="loadPayments()" style="margin-bottom:12px">
<option value="">全部月份</option>
</select>
<table id="paymentsTable">
<thead><tr><th>參加者</th><th>月份</th><th>金額</th><th>狀態</th><th>操作</th></tr></thead>
<tbody></tbody>
</table>
</div>
</div>
<script>
let allMembers=[], allMonths=[], allPayments=[];
function showTab(n){document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active'));document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));document.getElementById('tab-'+n).classList.add('active');event.target.classList.add('active')}
async function loadStats(){const r=await fetch('/api/dashboard/stats');const d=await r.json();document.getElementById('statsGrid').innerHTML='<div class="stat-card"><div class="stat-num">'+d.total+'</div><div class="stat-label">參加者</div></div><div class="stat-card"><div class="stat-num">'+d.paid+'</div><div class="stat-label">已繳</div></div><div class="stat-card"><div class="stat-num">'+d.unpaid+'</div><div class="stat-label">未繳</div></div><div class="stat-card"><div class="stat-num">'+d.problem+'</div><div class="stat-label">有問題</div></div>';}
async function loadMembers(){const r=await fetch('/api/dashboard/members');allMembers=await r.json();document.querySelector('#membersTable tbody').innerHTML=allMembers.map(m=>'<tr><td>'+m.name+'</td><td>'+m.phone+'</td><td><span class="status-'+(m.status==='active'?'green':'red')+'">'+(m.status==='active'?'active':'inactive')+'</span></td><td><button class="btn btn-danger" onclick="delMember(\''+m.id+'\')">刪除</button></td></tr>').join('');}
async function loadMonths(){const r=await fetch('/api/dashboard/months');allMonths=await r.json();document.querySelector('#monthsTable tbody').innerHTML=allMonths.map(m=>'<tr><td>'+m.name+'</td><td>HK$'+m.price+'</td><td>'+m.classes+'</td><td><span class="status-'+(m.status==='open'?'green':'red')+'">'+m.status+'</span></td><td><button class="btn btn-danger" onclick="delMonth(\''+m.id+'\')">刪除</button></td></tr>').join('');document.getElementById('filterMonth').innerHTML='<option value="">全部月份</option>'+allMonths.map(m=>'<option value="'+m.id+'">'+m.name+'</option>').join('');}
async function loadPayments(){const mid=document.getElementById('filterMonth').value;const r=await fetch('/api/dashboard/payments'+(mid?'?month='+mid:''));allPayments=await r.json();document.querySelector('#paymentsTable tbody').innerHTML=allPayments.map(p=>'<tr><td>'+p.member_name+'</td><td>'+p.month_name+'</td><td>HK$'+p.amount+'</td><td><span class="status-'+(p.status==='paid'?'green':p.status==='problem'?'yellow':'red')+'">'+p.status+'</span></td><td><button class="btn btn-primary" onclick="setPaid(\''+p.id+'\')">✓</button> <button class="btn btn-danger" onclick="setProblem(\''+p.id+'\')">!</button></td></tr>').join('');}
async function addMember(e){e.preventDefault();await fetch('/api/dashboard/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('newName').value,phone:document.getElementById('newPhone').value})});loadMembers();loadStats();}
async function delMember(id){if(!confirm('確定刪除?'))return;await fetch('/api/dashboard/members/'+id,{method:'DELETE'});loadMembers();loadStats();}
async function addMonth(e){e.preventDefault();await fetch('/api/dashboard/months',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('newMonthName').value,price:parseInt(document.getElementById('newMonthPrice').value),classes:parseInt(document.getElementById('newMonthClasses').value)})});loadMonths();loadStats();}
async function delMonth(id){if(!confirm('確定刪除?'))return;await fetch('/api/dashboard/months/'+id,{method:'DELETE'});loadMonths();loadStats();}
async function setPaid(id){await fetch('/api/dashboard/payments/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'paid'})});loadPayments();loadStats();}
async function setProblem(id){await fetch('/api/dashboard/payments/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'problem'})});loadPayments();loadStats();}
loadStats();loadMembers();loadMonths();
</script>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      // API routes
      if (path.startsWith("/api/")) return await handleApi(req, env, url);

      // Pages
      if (path === "/" || path === "/upload") {
        const months = await env.DB.prepare("SELECT id, name, price, classes FROM months WHERE status='open' ORDER BY id").all();
        const mp = {};
        for (const m of months.results || []) {
          mp[m.id] = { name: m.name, price: m.price };
        }
        const html = PAGE_UPLOAD
          .replace(/{{whatsapp}}/g, WHATSAPP_STAFF)
          .replace(/{{monthsPrice}}/g, JSON.stringify(mp));
        return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8" } });
      }

      if (path === "/dashboard") {
        return new Response(PAGE_DASHBOARD, { headers: { "Content-Type": "text/html;charset=utf-8" } });
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      return new Response("Error: " + e.message, { status: 500 });
    }
  }
};

// ─────────────────────────────────────────────────────────────────
// API Handlers
// ─────────────────────────────────────────────────────────────────
async function handleApi(req, env, url) {
  const path = url.pathname;
  const method = req.method;

  // Health
  if (path === "/api/health") {
    return json({ status: "ok", version: "v6" });
  }

  // OCR - image upload
  if (path === "/api/ocr" && method === "POST") {
    const formData = await req.formData();
    const image = formData.get("image");
    if (!image) return json({ success: false, error: "No image" });

    const imageBuffer = await image.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    try {
      // Browser-side OCR using Tesseract.js - image never leaves browser
      loading.textContent = "OCR 識別中...";
      if (typeof Tesseract === 'undefined') {
        alert('OCR 載入中，請稍後再試');
        loading.classList.remove('show');
        return;
      }
      const result = await Tesseract.recognize(ev.target.result, 'eng+chi_tra', {
        logger: m => { if(m.status === 'recognizing text') loading.textContent = "OCR 識別中... " + Math.round(m.progress * 100) + "%"; }
      });
      loading.classList.remove('show');
      const text = result.data.text;
      // Extract amount (HK$) and name from text
      const amountMatch = text.match(/HK\$\s*([0-9,]+)|([0-9,]+)\s*HK|HK\$?([0-9,]+)/);
      const amount = amountMatch ? (amountMatch[1] || amountMatch[2] || amountMatch[3]).replace(/,/g, "") : null;
      // Find Chinese or English names
      const nameMatch = text.match(/[\u4e00-\u9fff]{2,4}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/);
      const name = nameMatch ? nameMatch[0].trim() : null;
      return { success: true, data: { name, amount, bank: "OCR", raw: text.slice(0, 300) } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Submit payment
  if (path === "/api/submit" && method === "POST") {
    const formData = await req.formData();
    const persons = JSON.parse(formData.get("persons") || "[]");
    const months = JSON.parse(formData.get("months") || "[]");
    const ai_total = parseInt(formData.get("ai_total")) || 0;
    const image = formData.get("image");

    // Upload image to R2
    let imageKey = null;
    if (image) {
      imageKey = `payments/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      await env.IMAGES.put(imageKey, await image.arrayBuffer());
    }

    // For each month selected, create/update payment record
    for (const monthId of months) {
      const monthRes = await env.DB.prepare("SELECT price FROM months WHERE id=? AND status='open'").bind(monthId).first();
      if (!monthRes) continue;
      const amount = monthRes.price;

      // Find or create member
      const mainPerson = persons[0];
      let memberId = null;
      if (mainPerson.phone) {
        const existing = await env.DB.prepare("SELECT id FROM members WHERE phone=?").bind(mainPerson.phone).first();
        if (existing) memberId = existing.id;
      }

      await env.DB.prepare(`
        INSERT INTO payments (member_id, month_id, amount, image_url, status) VALUES (?,?,?,?,?)
      `).bind(memberId, monthId, amount, imageKey, "pending").run();
    }

    return json({ success: true });
  }

  // Dashboard APIs
  if (path === "/api/dashboard/stats" && method === "GET") {
    const total = await env.DB.prepare("SELECT COUNT(*) as c FROM members WHERE status='active'").first();
    const paid = await env.DB.prepare("SELECT COUNT(DISTINCT member_id||'-'||month_id) as c FROM payments WHERE status='paid'").first();
    const unpaid = await env.DB.prepare("SELECT COUNT(*) as c FROM months WHERE status='open'").first();
    return json({ total: total?.c || 0, paid: paid?.c || 0, unpaid: unpaid?.c || 0, problem: 0 });
  }

  if (path === "/api/dashboard/members") {
    if (method === "GET") {
      const rows = await env.DB.prepare("SELECT * FROM members ORDER BY name").all();
      return json(rows.results || []);
    }
    if (method === "POST") {
      const { name, phone } = await req.json();
      const id = "M" + Date.now();
      await env.DB.prepare("INSERT INTO members (id,name,phone) VALUES (?,?,?)").bind(id, name, phone).run();
      return json({ success: true, id });
    }
    if (method === "DELETE" && path.includes("/members/")) {
      const id = path.split("/").pop();
      await env.DB.prepare("DELETE FROM members WHERE id=?").bind(id).run();
      return json({ success: true });
    }
  }

  if (path === "/api/dashboard/months") {
    if (method === "GET") {
      const rows = await env.DB.prepare("SELECT * FROM months ORDER BY id").all();
      return json(rows.results || []);
    }
    if (method === "POST") {
      const { name, price, classes } = await req.json();
      const id = new Date().toISOString().slice(0, 7);
      await env.DB.prepare("INSERT OR REPLACE INTO months (id,name,price,classes,status) VALUES (?,?,?,?,'open')").bind(id, name, price, classes).run();
      return json({ success: true, id });
    }
    if (method === "DELETE" && path.includes("/months/")) {
      const id = path.split("/").pop();
      await env.DB.prepare("DELETE FROM months WHERE id=?").bind(id).run();
      return json({ success: true });
    }
  }

  if (path === "/api/dashboard/payments") {
    const monthFilter = url.searchParams.get("month");
    let sql = `SELECT p.*, m.name as member_name, mo.name as month_name FROM payments p LEFT JOIN members m ON p.member_id=m.id LEFT JOIN months mo ON p.month_id=mo.id`;
    if (monthFilter) sql += " WHERE p.month_id='" + monthFilter + "'";
    sql += " ORDER BY p.uploaded_at DESC";
    const rows = await env.DB.prepare(sql).all();
    return json(rows.results || []);
  }

  if (path.startsWith("/api/dashboard/payments/") && method === "PATCH") {
    const id = path.split("/").pop();
    const { status } = await req.json();
    await env.DB.prepare("UPDATE payments SET status=? WHERE id=?").bind(status, id).run();
    return json({ success: true });
  }

  return json({ error: "Not found" }, 404);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
}
