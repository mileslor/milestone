/**
 * LWRC 會員繳費追蹤系統 v4 - Cloudflare Worker
 * 
 * Endpoints:
 * - GET  /                      - 參加者頁面
 * - POST /api/login             - 電話登入
 * - GET  /api/months            - 可選月份
 * - POST /api/payments          - 提交繳費
 * - GET  /api/payments/ocr       - AI OCR 圖片
 * 
 * - GET  /dashboard             - Staff Dashboard
 * - GET  /api/dashboard/stats
 * - GET  /api/dashboard/members
 * - POST /api/dashboard/members
 * - DELETE /api/dashboard/members/:id
 * - GET  /api/dashboard/months
 * - POST /api/dashboard/months
 * - PUT  /api/dashboard/months/:id
 * - DELETE /api/dashboard/months/:id
 * - GET  /api/dashboard/payments
 * - PATCH /api/dashboard/payments/:id
 * - GET  /api/dashboard/images/:key  - proxy R2 image
 * - GET  /api/health
 */

const WHATSAPP_STAFF = "85261789563";

// ─────────────────────────────────────────────────────────────────
// HTML: 參加者頁面
// ─────────────────────────────────────────────────────────────────
const HTML_MEMBER = [
  '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>LWRC 繳費</title>',
  '<style>',
  '*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f0f4f8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}',
  '.container{background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1);padding:36px;max-width:520px;width:100%}',
  '.logo{text-align:center;margin-bottom:20px}.logo-emoji{font-size:48px}',
  'h1{color:#1a73e8;margin-bottom:6px;text-align:center;font-size:24px}',
  '.subtitle{color:#666;text-align:center;margin-bottom:28px;font-size:14px}',
  '.steps{display:flex;justify-content:center;gap:6px;margin-bottom:30px}',
  '.step{display:flex;align-items:center;gap:6px;font-size:13px;color:#aaa;font-weight:500}',
  '.step.active{color:#1a73e8}.step.done{color:#34a853}',
  '.step-num{width:24px;height:24px;border-radius:50%;background:#e0e0e0;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}',
  '.step.active .step-num{background:#1a73e8}.step.done .step-num{background:#34a853}',
  '.step-line{width:20px;height:2px;background:#e0e0e0;align-self:center}.step.done+.step-line,.step.active+.step-line{background:#34a853}',
  '.step-page{display:none}.step-page.active{display:block}',
  '.form-group{margin-bottom:20px}',
  'label{display:block;margin-bottom:8px;color:#333;font-weight:500;font-size:14px}',
  'input[type="tel"],input[type="text"]{width:100%;padding:12px;border:1.5px solid #ddd;border-radius:8px;font-size:16px;transition:border-color 0.2s}',
  'input:focus{outline:none;border-color:#1a73e8}input.error{border-color:#ea4335}',
  '.error-msg{color:#ea4335;font-size:12px;margin-top:4px;display:none}',
  '.month-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px}',
  '.month-chip{padding:12px 8px;border:2px solid #e0e0e0;border-radius:10px;text-align:center;cursor:pointer;transition:all 0.2s;font-size:14px}',
  '.month-chip:hover{border-color:#1a73e8;background:#f0f4ff}.month-chip.selected{border-color:#1a73e8;background:#e8f0fe}',
  '.month-chip .month-label{font-weight:600;font-size:15px;margin-bottom:3px}',
  '.month-chip .month-meta{font-size:12px;color:#888}',
  '.month-chip.selected .month-label{color:#1a73e8}',
  '.month-chip input{display:none}',
  '.summary{background:#f8f9fa;border-radius:10px;padding:14px;margin-bottom:20px}',
  '.summary-row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px}.summary-row:last-child{margin-bottom:0;font-weight:700;color:#1a73e8;font-size:17px}',
  '.summary-label{color:#666}',
  '.upload-zone{border:2px dashed #ccc;border-radius:12px;padding:30px;text-align:center;cursor:pointer;transition:all 0.2s;position:relative}',
  '.upload-zone:hover{border-color:#1a73e8;background:#f8f9ff}.upload-zone.dragover{border-color:#1a73e8;background:#e8f0fe}',
  '.upload-zone input{position:absolute;inset:0;opacity:0;cursor:pointer}',
  '.upload-icon{font-size:40px;margin-bottom:8px}.upload-text{color:#666;font-size:14px}.upload-text strong{color:#1a73e8}',
  '#imagePreview{margin-top:16px;text-align:center;display:none}#imagePreview img{max-width:100%;max-height:220px;border-radius:8px;border:2px solid #e0e0e0}#imagePreview .preview-name{font-size:12px;color:#888;margin-top:4px}',
  '.ocr-result{background:#e8f5e9;border:2px solid #a5d6a7;border-radius:10px;padding:14px;margin-bottom:16px;font-size:14px;display:none}',
  '.ocr-result.show{display:block}',
  '.ocr-result .ocr-title{font-weight:600;color:#2e7d32;margin-bottom:8px;font-size:15px}',
  '.ocr-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #c8e6c9}.ocr-row:last-child{border-bottom:none}',
  '.ocr-label{color:#555}.ocr-value{font-weight:600;color:#333}',
  '.ocr-loading{text-align:center;padding:20px;color:#888}',
  '.ocr-loading .spinner{display:inline-block;width:24px;height:24px;border:3px solid #e0e0e0;border-top-color:#1a73e8;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px}',
  '@keyframes spin{to{transform:rotate(360deg)}}',
  '.btn-primary{width:100%;padding:14px;background:#1a73e8;color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:background 0.2s}',
  '.btn-primary:hover{background:#1557b0}.btn-primary:disabled{background:#ccc;cursor:not-allowed}',
  '.btn-wa{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;background:#25D366;color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;text-decoration:none;transition:background 0.2s}',
  '.btn-wa:hover{background:#1fb855}',
  '.message{margin-top:16px;padding:14px;border-radius:8px;text-align:center;display:none;font-size:14px}',
  '.message.success{background:#d4edda;color:#155724;display:block}',
  '.message.error{background:#f8d7da;color:#721c24;display:block}',
  '.member-bar{background:#e8f0fe;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px;font-size:14px}',
  '.member-bar .avatar{width:36px;height:36px;border-radius:50%;background:#1a73e8;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px}',
  '.member-bar .info{flex:1}.member-bar .name{font-weight:600;color:#333}.member-bar .phone{color:#888;font-size:12px}',
  '.btn-logout{background:none;border:none;color:#ea4335;font-size:13px;cursor:pointer}',
  '.hint{font-weight:400;color:#888;font-size:12px}',
  '.back-link{display:inline-flex;align-items:center;gap:4px;color:#666;font-size:13px;text-decoration:none;margin-bottom:16px;cursor:pointer}.back-link:hover{color:#1a73e8}',
  '.wa-divider{text-align:center;color:#888;font-size:13px;margin:16px 0;position:relative}',
  '.wa-divider::before,.wa-divider::after{content:"";position:absolute;top:50%;width:35%;height:1px;background:#ddd}.wa-divider::before{left:0}.wa-divider::after{right:0}',
  '.already-paid{margin-top:16px;padding:12px;background:#fff3e0;border-radius:8px;font-size:14px;color:#e65100;text-align:center;display:none}',
  '.already-paid.show{display:block}',
  '</style></head><body>',
  '<div class="container">',
  '<div class="logo"><div class="logo-emoji">🏋️</div></div>',
  '<h1>LWRC 繳費</h1>',
  '<p class="subtitle">剔月份・上傳截圖・完成</p>',
  '<div class="steps" id="stepIndicator">',
  '<div class="step active" id="step1Ind"><div class="step-num">1</div><span>登入</span></div>',
  '<div class="step-line"></div>',
  '<div class="step" id="step2Ind"><div class="step-num">2</div><span>剔月份</span></div>',
  '<div class="step-line"></div>',
  '<div class="step" id="step3Ind"><div class="step-num">3</div><span>上傳</span></div>',
  '</div>',
  // Step 1: Phone Login
  '<div class="step-page active" id="step1">',
  '<div class="form-group">',
  '<label for="phone">電話號碼 <span class="hint">（8位數字）</span></label>',
  '<input type="tel" id="phone" placeholder="61234567" maxlength="8" autocomplete="tel">',
  '<div class="error-msg" id="phoneError">請輸入有效8位電話號碼</div>',
  '</div>',
  '<button class="btn-primary" id="btnLogin" onclick="step1Login()">確認身份</button>',
  '<div class="message" id="step1Msg"></div>',
  '</div>',
  // Step 2: Select Months
  '<div class="step-page" id="step2">',
  '<div class="member-bar" id="memberBar" style="display:none;">',
  '<div class="avatar" id="memberAvatar">?</div>',
  '<div class="info"><div class="name" id="memberName">-</div><div class="phone" id="memberPhone">-</div></div>',
  '<button class="btn-logout" onclick="logout()">登出</button>',
  '</div>',
  '<div id="alreadyPaidMsg" class="already-paid"></div>',
  '<div class="form-group">',
  '<label>選擇月份 <span class="hint">（剔你想要繳的月份）</span></label>',
  '<div class="month-grid" id="monthGrid"></div>',
  '</div>',
  '<div class="summary" id="summary" style="display:none;">',
  '<div class="summary-row"><span class="summary-label">已選月份</span><span class="summary-value" id="summaryMonths">-</span></div>',
  '<div class="summary-row"><span class="summary-label">總金額</span><span class="summary-value" id="summaryTotal">-</span></div>',
  '</div>',
  '<button class="btn-primary" id="btnNextStep3" onclick="goToStep(3)" disabled>下一步：上傳截圖</button>',
  '<a class="back-link" onclick="goToStep(1)">&larr; 重新選擇</a>',
  '</div>',
  // Step 3: Upload
  '<div class="step-page" id="step3">',
  '<div class="summary" id="step3Summary" style="display:none;"></div>',
  '<div class="form-group">',
  '<label>上傳繳費截圖</label>',
  '<div class="upload-zone" id="uploadZone">',
  '<input type="file" id="imageInput" accept="image/*" onchange="previewImage(this)">',
  '<div class="upload-icon">📷</div>',
  '<div class="upload-text">點擊上傳截圖<br><strong>或拖放圖片</strong></div>',
  '</div>',
  '<div id="imagePreview"><img id="previewImg" src="" alt="預覽"><div class="preview-name" id="previewName"></div></div>',
  '</div>',
  '<div class="ocr-result" id="ocrResult">',
  '<div class="ocr-title">🔍 AI 識別結果</div>',
  '<div id="ocrContent"></div>',
  '</div>',
  '<div class="ocr-loading" id="ocrLoading" style="display:none;">',
  '<div class="spinner"></div>',
  '<div>AI 識別中...</div>',
  '</div>',
  '<div class="wa-divider">或</div>',
  '<a class="btn-wa" id="btnWaStaff" href="#" target="_blank">',
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
  'WhatsApp 聯絡職員',
  '</a>',
  '<button class="btn-primary" id="btnSubmit" onclick="submitPayment()" disabled style="margin-top:16px;">確認提交</button>',
  '<a class="back-link" onclick="goToStep(2)">&larr; 上一步</a>',
  '<div class="message" id="step3Msg"></div>',
  '</div>',
  '</div>',
  '<script>',
  "let currentMember=null;let availableMonths=[];let selectedMonths=new Set();let uploadedImageFile=null;let ocrData=null;",
  "function goToStep(n){",
  "document.querySelectorAll('.step-page').forEach(el=>el.classList.remove('active'));",
  "document.getElementById('step'+n).classList.add('active');",
  "document.querySelectorAll('.step').forEach((el,i)=>{",
  "el.classList.remove('active','done');",
  "if(i+1<n)el.classList.add('done');else if(i+1===n)el.classList.add('active');",
  "});}",
  "function logout(){currentMember=null;selectedMonths.clear();uploadedImageFile=null;ocrData=null;",
  "document.getElementById('imagePreview').style.display='none';",
  "document.getElementById('btnSubmit').disabled=true;",
  "document.getElementById('ocrResult').classList.remove('show');",
  "goToStep(1);}",
  "async function step1Login(){",
  "const phone=document.getElementById('phone').value.trim();",
  "const errorEl=document.getElementById('phoneError');",
  "const msgEl=document.getElementById('step1Msg');",
  "if(!/^\\d{8}$/.test(phone)){",
  "document.getElementById('phone').classList.add('error');errorEl.style.display='block';return;}",
  "document.getElementById('phone').classList.remove('error');errorEl.style.display='none';",
  "try{",
  "const res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});",
  "const data=await res.json();",
  "if(res.ok){currentMember=data.member;",
  "document.getElementById('memberBar').style.display='flex';",
  "document.getElementById('memberAvatar').textContent=currentMember.name.charAt(0);",
  "document.getElementById('memberName').textContent=currentMember.name;",
  "document.getElementById('memberPhone').textContent=currentMember.phone;",
  "await loadMonths();}else{",
  "msgEl.textContent='❌ '+(data.error||'找不到此電話號碼');msgEl.className='message error';}",
  "}catch(err){msgEl.textContent='❌ 網絡錯誤，請稍後再試';msgEl.className='message error';}}",
  "async function loadMonths(){try{",
  "const[monthsRes,paymentsRes]=await Promise.all([",
  "fetch('/api/months'),",
  "fetch('/api/months/payments?member_id='+currentMember.id)",
  "]);",
  "const monthsData=await monthsRes.json();",
  "const paymentsData=await paymentsRes.json();",
  "availableMonths=monthsData.months||[];",
  "const paidMonths=new Set((paymentsData.payments||[]).filter(p=>p.status==='paid').map(p=>p.month_id));",
  "renderMonthGrid(paidMonths);",
  "goToStep(2);",
  "}catch(err){console.error(err);alert('載入月份失敗');}}",
  "function renderMonthGrid(paidMonths){",
  "const grid=document.getElementById('monthGrid');",
  "if(availableMonths.length===0){",
  "grid.innerHTML='<div style=\"text-align:center;color:#888;padding:20px;\">暫時沒有開放繳費的月份</div>';",
  "return;}",
  "grid.innerHTML=availableMonths.map(m=>{",
  "const[y,mo]=m.id.split('-');",
  "const d=new Date(y,parseInt(mo)-1);",
  "const label=d.toLocaleDateString('zh-HK',{year:'numeric',month:'long'});",
  "const isPaid=paidMonths.has(m.id);",
  "return '<div class=\"month-chip'+ (isPaid?' paid':'') +'\" data-month=\"'+m.id+'\" onclick=\"toggleMonth(\\''+m.id+'\\',event)\">'+",
  "'<div class=\"month-label\">'+label+'</div>'+",
  "'<div class=\"month-meta\">'+m.classes+'堂 · HK$ '+m.price+'</div>'+",
  "(isPaid?<div style=\"color:#2e7d32;font-size:12px;margin-top:4px;font-weight:600;\">PAID<\/div>:\"\")+\","
  "'</div>';}).join('');}",
  "function toggleMonth(monthId,event){",
  "event.stopPropagation();",
  "const chip=document.querySelector('.month-chip[data-month=\"'+monthId+'\"]');",
  "if(chip.classList.contains('paid'))return;",
  "if(selectedMonths.has(monthId)){",
  "selectedMonths.delete(monthId);chip.classList.remove('selected');",
  "}else{selectedMonths.add(monthId);chip.classList.add('selected');}",
  "updateSummary();",
  "document.getElementById('btnNextStep3').disabled=selectedMonths.size===0;",
  "document.getElementById('alreadyPaidMsg').classList.remove('show');",
  "if(selectedMonths.size>0){",
  "document.getElementById('alreadyPaidMsg').classList.remove('show');",
  "}else{",
  "const paidList=Array.from(availableMonths.filter(m=>{",
  "return document.querySelector('.month-chip[data-month=\"'+m.id+'\"]')?.classList.contains('paid');",
  "}).map(m=>{const[y,mo]=m.id.split('-');return new Date(y,parseInt(mo)-1).toLocaleDateString('zh-HK',{year:'numeric',month:'long'});}));",
  "if(paidList.length>0){",
  "document.getElementById('alreadyPaidMsg').textContent='已繳月份：'+paidList.join('、');",
  "document.getElementById('alreadyPaidMsg').classList.add('show');",
  "}",
  "}",
  "}",
  "function updateSummary(){",
  "const sel=Array.from(selectedMonths);",
  "if(sel.length===0)return;",
  "const total=sel.reduce((sum,mid)=>{const m=availableMonths.find(x=>x.id===mid);return sum+(m?m.price:0);},0);",
  "const monthsDisplay=sel.map(mid=>{const[y,mo]=mid.split('-');return new Date(y,parseInt(mo)-1).toLocaleDateString('zh-HK',{year:'numeric',month:'short'});}).join('、');",
  "document.getElementById('summaryMonths').textContent=monthsDisplay;",
  "document.getElementById('summaryTotal').textContent='HK$ '+total;",
  "document.getElementById('summary').style.display='block';}",
  "function previewImage(input){",
  "const file=input.files[0];if(!file)return;",
  "uploadedImageFile=file;",
  "ocrData=null;",
  "document.getElementById('ocrResult').classList.remove('show');",
  "const reader=new FileReader();",
  "reader.onload=(e)=>{",
  "document.getElementById('previewImg').src=e.target.result;",
  "document.getElementById('previewName').textContent=file.name;",
  "document.getElementById('imagePreview').style.display='block';",
  "runOCR(file);};",
  "reader.readAsDataURL(file);}",
  "async function runOCR(file){",
  "const loading=document.getElementById('ocrLoading');",
  "const resultEl=document.getElementById('ocrResult');",
  "const contentEl=document.getElementById('ocrContent');",
  "loading.style.display='block';",
  "resultEl.classList.remove('show');",
  "document.getElementById('btnSubmit').disabled=true;",
  "try{",
  "const formData=new FormData();",
  "formData.append('image',file);",
  "const res=await fetch('/api/payments/ocr',{method:'POST',body:formData});",
  "const data=await res.json();",
  "loading.style.display='none';",
  "if(res.ok&&data.success){",
  "ocrData=data;",
  "const info=data.data||{};",
  "contentEl.innerHTML=",
  "'<div class=\"ocr-row\"><span class=\"ocr-label\">姓名</span><span class=\"ocr-value\">'+(info.name||'未識別')+'</span></div>'+",
  "'<div class=\"ocr-row\"><span class=\"ocr-label\">銀行</span><span class=\"ocr-value\">'+(info.bank||'未識別')+'</span></div>'+",
  "'<div class=\"ocr-row\"><span class=\"ocr-label\">金額</span><span class=\"ocr-value\">'+(info.amount?('HK$ '+info.amount):'未識別')+'</span></div>'+",
  "'<div class=\"ocr-row\"><span class=\"ocr-label\">日期</span><span class=\"ocr-value\">'+(info.date||'未識別')+'</span></div>';",
  "resultEl.classList.add('show');",
  "document.getElementById('btnSubmit').disabled=false;",
  "}else{",
  "contentEl.innerHTML='<div style="color:#e65100;">識別失敗：'+(data.error||'請稍後再試')+'</div>';",
  "resultEl.classList.add('show');",
  "document.getElementById('btnSubmit').disabled=false;",
  "}",
  "}catch(err){",
  "loading.style.display='none';",
  "contentEl.innerHTML='<div style="color:#e65100;">網絡錯誤，請稍後再試</div>';",
  "resultEl.classList.add('show');",
  "document.getElementById('btnSubmit').disabled=false;",
  "}}",
  "async function submitPayment(){",
  "if(!uploadedImageFile||selectedMonths.size===0)return;",
  "const btn=document.getElementById('btnSubmit');",
  "btn.disabled=true;btn.textContent='提交中...';",
  "const msgEl=document.getElementById('step3Msg');msgEl.style.display='none';",
  "const formData=new FormData();",
  "formData.append('member_id',currentMember.id);",
  "formData.append('months',JSON.stringify(Array.from(selectedMonths)));",
  "formData.append('image',uploadedImageFile);",
  "if(ocrData&&ocrData.data){",
  "formData.append('ai_result',JSON.stringify(ocrData.data));",
  "}",
  "try{",
  "const res=await fetch('/api/payments',{method:'POST',body:formData});",
  "const data=await res.json();",
  "if(res.ok){",
  "msgEl.innerHTML='✅ 提交成功！<br><small>我們會盡快審批，請留意通知。</small>';",
  "msgEl.className='message success';",
  "uploadedImageFile=null;ocrData=null;",
  "document.getElementById('imagePreview').style.display='none';",
  "document.getElementById('ocrResult').classList.remove('show');",
  "btn.textContent='已提交';",
  "selectedMonths.clear();",
  "goToStep(2);",
  "// Reload months after 1s",
  "setTimeout(()=>loadMonths(),1000);",
  "}else{",
  "msgEl.textContent='❌ '+(data.error||'提交失敗');",
  "msgEl.className='message error';",
  "btn.disabled=false;btn.textContent='確認提交';}",
  "}catch(err){",
  "msgEl.textContent='❌ 網絡錯誤，請稍後再試';",
  "msgEl.className='message error';",
  "btn.disabled=false;btn.textContent='確認提交';}}",
  "// Setup upload zone drag events",
  "const uploadZone=document.getElementById('uploadZone');",
  "uploadZone.addEventListener('dragover',e=>{e.preventDefault();uploadZone.classList.add('dragover');});",
  "uploadZone.addEventListener('dragleave',()=>uploadZone.classList.remove('dragover'));",
  "uploadZone.addEventListener('drop',e=>{e.preventDefault();uploadZone.classList.remove('dragover');",
  "const file=e.dataTransfer.files[0];if(file&&file.type.startsWith('image/')){",
  "document.getElementById('imageInput').files=e.dataTransfer.files;previewImage(document.getElementById('imageInput'));}});",
  "document.getElementById('phone').addEventListener('keydown',e=>{if(e.key==='Enter')step1Login();});",
  // WA link builder
  "function buildWaLink(){",
  "const sel=Array.from(selectedMonths);",
  "const total=sel.reduce((sum,mid)=>{const m=availableMonths.find(x=>x.id===mid);return sum+(m?m.price:0);},0);",
  "const monthsDisplay=sel.map(mid=>{const[y,mo]=mid.split('-');return new Date(y,parseInt(mo)-1).toLocaleDateString('zh-HK',{year:'numeric',month:'long'});}).join('、');",
  "const waText=encodeURIComponent('LWRC 繳費\\n姓名：'+currentMember.name+'\\n月份：'+monthsDisplay+'\\n金額：HK$ '+total);",
  "document.getElementById('btnWaStaff').href='https://wa.me/"+WHATSAPP_STAFF+"?text='+waText;",
  "}",
  "function goToStep(n){",
  "if(n===3)buildWaLink();",
  "document.querySelectorAll('.step-page').forEach(el=>el.classList.remove('active'));",
  "document.getElementById('step'+n).classList.add('active');",
  "document.querySelectorAll('.step').forEach((el,i)=>{",
  "el.classList.remove('active','done');",
  "if(i+1<n)el.classList.add('done');else if(i+1===n)el.classList.add('active');",
  "});}",
  '</script></body></html>'
].join("");

// ─────────────────────────────────────────────────────────────────
// HTML: Staff Dashboard
// ─────────────────────────────────────────────────────────────────
const HTML_DASHBOARD = [
  '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>LWRC Staff - 繳費管理</title>',
  '<style>',
  '*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f0f4f8;min-height:100vh}',
  '.header{background:#1a73e8;color:white;padding:18px 30px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}',
  '.header h1{font-size:20px;font-weight:600}',
  '.header-right{font-size:13px;opacity:0.85}',
  '.nav{background:white;border-bottom:1px solid #e0e0e0;padding:0 30px;display:flex;flex-wrap:wrap}',
  '.nav-tab{padding:14px 22px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:500;color:#666;border-bottom:3px solid transparent;transition:all 0.2s}',
  '.nav-tab:hover{color:#1a73e8}.nav-tab.active{color:#1a73e8;border-bottom-color:#1a73e8}',
  '.container{padding:28px 30px;max-width:1400px;margin:0 auto}.tab-content{display:none}.tab-content.active{display:block}',
  '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px;margin-bottom:28px}',
  '.stat-card{background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center}',
  '.stat-card .number{font-size:30px;font-weight:700;color:#1a73e8}.stat-card .label{color:#666;margin-top:3px;font-size:12px}',
  '.stat-card.green .number{color:#34a853}.stat-card.red .number{color:#ea4335}.stat-card.yellow .number{color:#fbbc04}',
  '.card{background:white;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);padding:24px;margin-bottom:24px}',
  '.card h3{font-size:16px;margin-bottom:16px;color:#333}',
  '.form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:14px}',
  '.form-group{display:flex;flex-direction:column;gap:4px}',
  '.form-group label{font-size:13px;color:#555;font-weight:500}',
  '.form-group input,.form-group select{padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:14px}',
  '.form-group input:focus,.form-group select:focus{outline:none;border-color:#1a73e8}',
  '.btn{padding:9px 18px;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s}',
  '.btn-primary{background:#1a73e8;color:white}.btn-primary:hover{background:#1557b0}',
  '.btn-success{background:#34a853;color:white}.btn-success:hover{background:#2d8f47}',
  '.btn-danger{background:#ea4335;color:white}.btn-danger:hover{background:#d33828}',
  '.btn-secondary{background:#f0f0f0;color:#333}.btn-secondary:hover{background:#e0e0e0}',
  '.btn:disabled{opacity:0.5;cursor:not-allowed}',
  '.form-actions{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}',
  '.tbl{width:100%;border-collapse:collapse;font-size:14px}',
  '.tbl th{padding:10px 12px;text-align:left;color:#666;font-weight:600;border-bottom:2px solid #e0e0e0;white-space:nowrap}',
  '.tbl td{padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:middle}',
  '.tbl tr:hover{background:#f8f9ff}',
  '.tbl .month-cell{font-weight:500}',
  '.tbl .price-cell{color:#1a73e8;font-weight:600}',
  '.tbl .status-cell{white-space:nowrap}',
  '.status-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}',
  '.dot-green{background:#34a853}.dot-red{background:#ea4335}.dot-yellow{background:#fbbc04}',
  '.tbl input[type="number"]{padding:6px 8px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;width:80px}',
  '.tbl input:focus{outline:none;border-color:#1a73e8}',
  '.payment-matrix{overflow-x:auto}',
  '.matrix-table{width:100%;border-collapse:collapse;font-size:13px}',
  '.matrix-table th{position:sticky;top:0;background:white;padding:8px 10px;border:1px solid #e0e0e0;text-align:center;font-weight:600;color:#333;white-space:nowrap}',
  '.matrix-table td{border:1px solid #e0e0e0;padding:6px 8px;text-align:center;vertical-align:middle}',
  '.matrix-table .member-col{text-align:left!important;font-weight:500;white-space:nowrap;background:#f8f9ff;position:sticky;left:0;min-width:100px}',
  '.matrix-table .member-col.sticky-header{position:sticky;left:0;z-index:2}',
  '.cell-paid{background:#d4edda;color:#2e7d32;font-size:18px}.cell-unpaid{background:#ffebee;color:#c62828;font-size:18px}.cell-problem{background:#fff8e1;color:#f57f17;font-size:18px}.cell-none{color:#ccc}',
  '.cell-click{cursor:pointer;transition:all 0.15s}.cell-click:hover{opacity:0.7;transform:scale(1.1)}',
  '.filter-bar{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}',
  '.filter-btn{padding:8px 16px;border:1.5px solid #ddd;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;background:white;color:#666;transition:all 0.2s}',
  '.filter-btn:hover{border-color:#1a73e8;color:#1a73e8}.filter-btn.active{background:#1a73e8;color:white;border-color:#1a73e8}',
  '.badge{padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600}',
  '.badge-open{background:#d4edda;color:#155724}.badge-closed{background:#e9ecef;color:#666}',
  '.badge-paid{background:#d4edda;color:#155724}.badge-pending{background:#fff3cd;color:#856404}.badge-problem{background:#fff8e1;color:#856404}',
  '.btn-sm{padding:5px 10px;font-size:12px;border-radius:6px}',
  '.empty{text-align:center;padding:50px;color:#888}.empty-icon{font-size:48px;margin-bottom:12px}',
  '.loading{text-align:center;padding:40px;color:#888}',
  '.modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center}',
  '.modal.show{display:flex}.modal-content{background:white;border-radius:12px;max-width:700px;width:95%;max-height:88vh;overflow:auto}',
  '.modal-header{padding:18px 22px;border-bottom:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center}',
  '.modal-header h2{font-size:17px}.modal-close{background:none;border:none;font-size:26px;cursor:pointer;color:#888}',
  '.modal-body{padding:22px}',
  '.modal-footer{padding:14px 22px;border-top:1px solid #e9ecef;display:flex;gap:10px;justify-content:flex-end}',
  '.img-thumb{max-width:160px;max-height:120px;border-radius:6px;border:1px solid #e0e0e0;cursor:pointer;transition:transform 0.2s}.img-thumb:hover{transform:scale(1.05)}',
  '.msg-success{background:#d4edda;color:#155724;padding:12px;border-radius:8px;margin-bottom:16px;display:none}',
  '.msg-success.show{display:block}',
  '.tab-badge{background:#ea4335;color:white;border-radius:10px;padding:2px 7px;font-size:11px;font-weight:700;margin-left:6px}',
  '.tab-badge.active-tab{background:#ea4335}',
  '.help-text{font-size:12px;color:#888;margin-top:4px}',
  '</style></head><body>',
  '<div class="header"><h1>📊 LWRC 繳費管理</h1><div class="header-right">v4 · 月份制</div></div>',
  '<div class="nav">',
  '<button class="nav-tab active" data-tab="payments" onclick="switchTab(\'payments\')">💰 繳費列表</button>',
  '<button class="nav-tab" data-tab="months" onclick="switchTab(\'months\')">📅 月份管理</button>',
  '<button class="nav-tab" data-tab="members" onclick="switchTab(\'members\')">👥 參加者</button>',
  '</div>',
  '<div class="container">',
  // ── Payments Tab ──
  '<div class="tab-content active" id="tab-payments">',
  '<div class="stats">',
  '<div class="stat-card green"><div class="number" id="statPaid">-</div><div class="label">🟢 已繳</div></div>',
  '<div class="stat-card red"><div class="number" id="statUnpaid">-</div><div class="label">🔴 未繳</div></div>',
  '<div class="stat-card yellow"><div class="number" id="statProblem">-</div><div class="label">🟡 有問題</div></div>',
  '<div class="stat-card"><div class="number" id="statTotal">-</div><div class="label">總記錄</div></div>',
  '</div>',
  '<div class="msg-success" id="successMsg"></div>',
  '<div class="card">',
  '<h3>📋 繳費狀態矩陣 <span style="font-weight:400;font-size:13px;color:#888">（點擊格仔切換狀態）</span></h3>',
  '<div class="filter-bar" id="paymentFilterBar">',
  '<button class="filter-btn active" data-filter="all" onclick="filterPayments(\'all\')">全部</button>',
  '<button class="filter-btn" data-filter="paid" onclick="filterPayments(\'paid\')">🟢 已繳</button>',
  '<button class="filter-btn" data-filter="pending" onclick="filterPayments(\'pending\')">🔴 未繳</button>',
  '<button class="filter-btn" data-filter="problem" onclick="filterPayments(\'problem\')">🟡 有問題</button>',
  '</div>',
  '<div class="payment-matrix" id="paymentMatrix"><div class="loading">載入中...</div></div>',
  '</div>',
  '<div class="card">',
  '<h3>📝 待處理上傳</h3>',
  '<div id="pendingList"><div class="loading">載入中...</div></div>',
  '</div>',
  '</div>',
  // ── Months Tab ──
  '<div class="tab-content" id="tab-months">',
  '<div class="card">',
  '<h3 id="monthFormTitle">➕ 新增月份</h3>',
  '<div id="monthFormSuccess" class="msg-success"></div>',
  '<div class="form-row">',
  '<div class="form-group"><label>月份 ID</label><input type="month" id="inputMonthId" placeholder="2026-05"><div class="help-text">系統自動生成 ID，如 2026-05</div></div>',
  '<div class="form-group"><label>顯示名稱</label><input type="text" id="inputMonthName" placeholder="五月"></div>',
  '</div>',
  '<div class="form-row">',
  '<div class="form-group"><label>價格 (HK$)</label><input type="number" id="inputPrice" placeholder="500" min="0"></div>',
  '<div class="form-group"><label>堂數</label><input type="number" id="inputClasses" placeholder="8" min="1"></div>',
  '<div class="form-group"><label>狀態</label><select id="inputMonthStatus"><option value="open">🟢 開放</option><option value="closed">⚫ 關閉</option></select></div>',
  '</div>',
  '<div class="form-actions">',
  '<button class="btn btn-primary" id="btnSaveMonth" onclick="saveMonth()">儲存</button>',
  '<button class="btn btn-secondary" onclick="cancelMonthEdit()">取消</button>',
  '</div>',
  '</div>',
  '<div class="card">',
  '<h3>月份列表</h3>',
  '<div id="monthsList"><div class="loading">載入中...</div></div>',
  '</div>',
  '</div>',
  // ── Members Tab ──
  '<div class="tab-content" id="tab-members">',
  '<div class="card">',
  '<h3>➕ 新增參加者</h3>',
  '<div id="memberFormSuccess" class="msg-success"></div>',
  '<div class="form-row">',
  '<div class="form-group"><label>姓名</label><input type="text" id="inputMemName" placeholder="陳大明"></div>',
  '<div class="form-group"><label>電話（8位數字）</label><input type="tel" id="inputMemPhone" placeholder="61234567" maxlength="8"></div>',
  '</div>',
  '<div class="form-actions">',
  '<button class="btn btn-primary" onclick="addMember()">新增參加者</button>',
  '</div>',
  '</div>',
  '<div class="card">',
  '<h3>參加者列表</h3>',
  '<div id="membersList"><div class="loading">載入中...</div></div>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  // Image modal
  '<div class="modal" id="imgModal">',
  '<div class="modal-content">',
  '<div class="modal-header"><h2>截圖詳情</h2><button class="modal-close" onclick="closeImgModal()">&times;</button></div>',
  '<div class="modal-body" id="imgModalBody"></div>',
  '</div>',
  '</div>',
  '<script>',
  "let allPayments=[];let allMonths=[];let allMembers=[];let currentFilter='all';let editingMonthId=null;",
  "function switchTab(tab){",
  "document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));",
  "document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));",
  "document.querySelector('.nav-tab[data-tab=\"'+tab+'\"]').classList.add('active');",
  "document.getElementById('tab-'+tab).classList.add('active');",
  "}",
  "async function loadAll(){",
  "try{",
  "const[statsRes,paymentsRes,monthsRes,membersRes]=await Promise.all([",
  "fetch('/api/dashboard/stats'),",
  "fetch('/api/dashboard/payments'),",
  "fetch('/api/dashboard/months'),",
  "fetch('/api/dashboard/members')",
  "]);",
  "const stats=await statsRes.json();",
  "allPayments=await paymentsRes.json();",
  "allMonths=(await monthsRes.json()).months||[];",
  "allMembers=(await membersRes.json()).members||[];",
  "renderStats(stats);renderPaymentMatrix();renderPendingList();renderMonthsList();renderMembersList();",
  "}catch(err){console.error('Load error:',err);}}",
  "function renderStats(stats){",
  "document.getElementById('statPaid').textContent=stats.paid||0;",
  "document.getElementById('statUnpaid').textContent=stats.unpaid||0;",
  "document.getElementById('statProblem').textContent=stats.problem||0;",
  "document.getElementById('statTotal').textContent=stats.total||0;}",
  "function filterPayments(f){currentFilter=f;",
  "document.querySelectorAll('#paymentFilterBar .filter-btn').forEach(b=>b.classList.remove('active'));",
  "document.querySelector('#paymentFilterBar .filter-btn[data-filter=\"'+f+'\"]').classList.add('active');",
  "renderPaymentMatrix();}",
  "function renderPaymentMatrix(){",
  "const container=document.getElementById('paymentMatrix');",
  "const openMonths=allMonths.filter(m=>m.status==='open');",
  "if(allMembers.length===0||openMonths.length===0){",
  "container.innerHTML='<div class=\"empty\"><div class=\"empty-icon\">💰</div>暫時沒有數據</div>';return;}",
  "let headerRow='<th class=\"member-col\">參加者</th>';",
  "headerRow+=openMonths.map(m=>{const[y,mo]=m.id.split('-');const label=new Date(y,parseInt(mo)-1).toLocaleDateString('zh-HK',{year:'numeric',month:'short'});return'<th>'+label+'<br><span style=\"font-size:11px;color:#888\">$'+m.price+'</span></th>';}).join('');",
  "let rows='';",
  "allMembers.filter(m=>m.status==='active').forEach(mem=>{",
  "const phone=mem.phone.startsWith('852')?mem.phone:'852'+mem.phone;",
  "const waLink='https://wa.me/'+phone;",
  "let cells='<td class=\"member-col\"><a href=\"'+waLink+'\" target=\"_blank\" style=\"color:#1a73e8;text-decoration:none;\">'+mem.name+'</a><br><span style=\"font-size:11px;color:#888;\">'+mem.phone+'</span></td>';",
  "cells+=openMonths.map(m=>{",
  "const pay=allPayments.find(p=>p.member_id===mem.id&&p.month_id===m.id);",
  "let cls,icon,title;",
  "if(!pay){cls='cell-unpaid';icon='⬜';title='未繳 - 點擊標記';}",
  "else if(pay.status==='paid'){cls='cell-paid';icon='🟢';title='已繳';}",
  "else if(pay.status==='problem'){cls='cell-problem';icon='🟡';title='有問題';}",
  "else{cls='cell-unpaid';icon='🔴';title='待處理';}",
  "return'<td class=\"'+cls+' cell-click\" onclick=\"togglePayment(\\''+mem.id+'\',\\''+m.id+ '\\','+(pay?pay.id:'null')+',\\''+pay?pay.status:'pending'+'\\')\" title=\"'+title+'\">'+icon+'</td>';",
  "}).join('');",
  "rows+='<tr>'+cells+'</tr>';",
  "});",
  "container.innerHTML='<table class=\"matrix-table\"><thead><tr>'+headerRow+'</tr></thead><tbody>'+rows+'</tbody></table>';",
  "}",
  "async function togglePayment(memberId,monthId,payId,currentStatus){",
  "let newStatus;",
  "if(currentStatus==='paid')newStatus='pending';",
  "else if(currentStatus==='problem')newStatus='paid';",
  "else newStatus='paid';",
  "if(payId===null){",
  "const res=await fetch('/api/dashboard/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({member_id:memberId,month_id:monthId,status:newStatus})});",
  "if(res.ok){await loadAll();return;}",
  "}else{",
  "const res=await fetch('/api/dashboard/payments/'+payId,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:newStatus})});",
  "if(res.ok){await loadAll();return;}",
  "}",
  "alert('更新失敗');",
  "}",
  "function renderPendingList(){",
  "const container=document.getElementById('pendingList');",
  "const pending=allPayments.filter(p=>p.status==='pending'&&p.image_url);",
  "if(pending.length===0){container.innerHTML='<div class=\"empty\"><div class=\"empty-icon\">✅</div>沒有待處理上傳</div>';return;}",
  "container.innerHTML=pending.map(p=>{",
  "const mem=allMembers.find(m=>m.id===p.member_id)||{};",
  "const month=allMonths.find(m=>m.id===p.month_id)||{};",
  "const[y,mo]=p.month_id?p.month_id.split('-'):['?','?'];",
  "const monthLabel=new Date(y,parseInt(mo)-1).toLocaleDateString('zh-HK',{year:'numeric',month:'long'});",
  "const imgHtml=p.image_url?'<img class=\"img-thumb\" src=\"/api/dashboard/images/'+encodeURIComponent(p.image_url)+'\" onclick=\"openImgModal(\\''+encodeURIComponent(p.image_url)+'\\')\" alt=\"截圖\">':'';",
  "const phone=(mem.phone||'').startsWith('852')?mem.phone:'852'+(mem.phone||'');",
  "const waLink='https://wa.me/'+phone;",
  "let aiInfo='';",
  "if(p.ai_result){try{const r=JSON.parse(p.ai_result);aiInfo='<div style=\"font-size:12px;color:#555;margin-top:4px\">AI: '+Object.entries(r).map(([k,v])=>k+':'+v).join(' | ')+'</div>';}catch(e){}}",
  "return '<div style=\"background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap\">'+",
  "'<div style=\"flex:1;min-width:200px\">'+",
  "'<div style=\"font-weight:600;margin-bottom:4px\">'+(mem.name||'?')+' <span style=\"font-size:12px;color:#888\">'+monthLabel+'</span></div>'+",
  "'<div style=\"font-size:13px;color:#555\">'+month.name+' · HK$ '+(month.price||p.amount)+'</div>'+",
  aiInfo+",
  "'<div style=\"font-size:12px;color:#888;margin-top:4px\">'+new Date(p.uploaded_at).toLocaleString('zh-HK')+'</div>'+",
  "'</div>'+",
  "'<div style=\"display:flex;flex-direction:column;gap:6px;align-items:center\">'+",
  imgHtml+",
  "'<div style=\"display:flex;gap:4px\">'+",
  "'<button class=\"btn btn-success btn-sm\" onclick=\"updatePayStatus('+p.id+',\\'paid\\')\">✅ 已繳</button>'+",
  "'<button class=\"btn btn-danger btn-sm\" onclick=\"updatePayStatus('+p.id+',\\'problem\\')\">🟡 有問題</button>'+",
  "'<a class=\"btn btn-sm\" style=\"background:#25D366;color:white;text-decoration:none;\" href=\"'+waLink+'\" target=\"_blank\">📱</a>'+",
  "'</div></div></div>';",
  "}).join('');}",
  "async function updatePayStatus(id,status){",
  "const res=await fetch('/api/dashboard/payments/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});",
  "if(res.ok){await loadAll();}",
  "}",
  "// ── Months ──",
  "function renderMonthsList(){",
  "const container=document.getElementById('monthsList');",
  "if(allMonths.length===0){container.innerHTML='<div class=\"empty\"><div class=\"empty-icon\">📅</div>暫時沒有月份，請新增</div>';return;}",
  "container.innerHTML='<table class=\"tbl\"><thead><tr><th>月份</th><th>名稱</th><th>價格</th><th>堂數</th><th>狀態</th><th>操作</th></tr></thead><tbody>'+",
  "allMonths.map(m=>{",
  "const[y,mo]=m.id.split('-');",
  "const label=new Date(y,parseInt(mo)-1).toLocaleDateString('zh-HK',{year:'numeric',month:'long'});",
  "return '<tr>'+",
  "'<td class=\"month-cell\">'+label+'</td>'+",
  "'<td>'+(m.name||'-')+'</td>'+",
  "'<td class=\"price-cell\">HK$ '+m.price+'</td>'+",
  "'<td>'+m.classes+'堂</td>'+",
  "'<td><span class=\"badge badge-'+m.status+'\">'+(m.status==='open'?'🟢 開放':'⚫ 關閉')+'</span></td>'+",
  "'<td><button class=\"btn btn-secondary btn-sm\" onclick=\"editMonth(\\''+m.id+'\\')\">編輯</button> <button class=\"btn btn-danger btn-sm\" onclick=\"deleteMonth(\\''+m.id+'\\')\">刪除</button></td>'+",
  "'</tr>';",
  "}).join('')+'</tbody></table>';}",
  "function editMonth(id){",
  "const m=allMonths.find(x=>x.id===id);if(!m)return;",
  "editingMonthId=id;",
  "document.getElementById('monthFormTitle').textContent='✏️ 編輯月份';",
  "document.getElementById('inputMonthId').value=m.id;",
  "document.getElementById('inputMonthName').value=m.name||'';",
  "document.getElementById('inputPrice').value=m.price;",
  "document.getElementById('inputClasses').value=m.classes;",
  "document.getElementById('inputMonthStatus').value=m.status;",
  "document.getElementById('inputMonthId').disabled=true;",
  "document.getElementById('btnSaveMonth').textContent='更新';",
  "}",
  "function cancelMonthEdit(){",
  "editingMonthId=null;",
  "document.getElementById('monthFormTitle').textContent='➕ 新增月份';",
  "document.getElementById('inputMonthId').value='';",
  "document.getElementById('inputMonthId').disabled=false;",
  "document.getElementById('inputMonthName').value='';",
  "document.getElementById('inputPrice').value='';",
  "document.getElementById('inputClasses').value='';",
  "document.getElementById('inputMonthStatus').value='open';",
  "document.getElementById('btnSaveMonth').textContent='儲存';",
  "document.getElementById('monthFormSuccess').classList.remove('show');",
  "}",
  "async function saveMonth(){",
  "const id=document.getElementById('inputMonthId').value.trim();",
  "const name=document.getElementById('inputMonthName').value.trim();",
  "const price=parseInt(document.getElementById('inputPrice').value);",
  "const classes=parseInt(document.getElementById('inputClasses').value);",
  "const status=document.getElementById('inputMonthStatus').value;",
  "if(!id||!price||!classes){alert('請填寫月份、價格和堂數');return;}",
  "if(!/^\\d{4}-\\d{2}$/.test(id)){alert('月份 ID 格式需為 YYYY-MM');return;}",
  "const payload={id,name,price,classes,status};",
  "let res;",
  "if(editingMonthId){",
  "res=await fetch('/api/dashboard/months/'+editingMonthId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});",
  "}else{",
  "res=await fetch('/api/dashboard/months',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}",
  "const data=await res.json();",
  "if(res.ok){",
  "const msg=document.getElementById('monthFormSuccess');",
  "msg.textContent='✅ '+(editingMonthId?'更新':'新增')+'成功！';msg.classList.add('show');",
  "cancelMonthEdit();await loadAll();",
  "}else{alert('失敗：'+(data.error||'未知錯誤'));}}}",
  "async function deleteMonth(id){",
  "if(!confirm('確定刪除此月份？'))return;",
  "const res=await fetch('/api/dashboard/months/'+id,{method:'DELETE'});",
  "if(res.ok)await loadAll();}",
  "// ── Members ──",
  "function renderMembersList(){",
  "const container=document.getElementById('membersList');",
  "if(allMembers.length===0){container.innerHTML='<div class=\"empty\"><div class=\"empty-icon\">👥</div>暫時沒有參加者</div>';return;}",
  "container.innerHTML='<table class=\"tbl\"><thead><tr><th>姓名</th><th>電話</th><th>狀態</th><th>操作</th></tr></thead><tbody>'+",
  "allMembers.map(m=>{",
  "const phone=m.phone.startsWith('852')?m.phone:'852'+m.phone;",
  "const waLink='https://wa.me/'+phone;",
  "return '<tr>'+",
  "'<td style=\"font-weight:500\">'+m.name+'</td>'+",
  "'<td><a href=\"'+waLink+'\" target=\"_blank\" style=\"color:#1a73e8;text-decoration:none;\">'+m.phone+'</a></td>'+",
  "'<td><span class=\"badge badge-'+(m.status==='active'?'open':'closed')+'\">'+(m.status==='active'?'🟢 活躍':'⚫ 停用')+'</span></td>'+",
  "'<td><button class=\"btn btn-secondary btn-sm\" onclick=\"toggleMemberStatus(\\''+m.id+'\\',\\''+m.status+ '\\')\">'+(m.status==='active'?'停用':'啟用')+'</button> <button class=\"btn btn-danger btn-sm\" onclick=\"deleteMember(\\''+m.id+'\\')\">刪除</button></td>'+",
  "'</tr>';",
  "}).join('')+'</tbody></table>';}",
  "async function addMember(){",
  "const name=document.getElementById('inputMemName').value.trim();",
  "const phone=document.getElementById('inputMemPhone').value.trim();",
  "if(!name||!/^\\d{8}$/.test(phone)){alert('請填寫姓名和有效電話');return;}",
  "const res=await fetch('/api/dashboard/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phone})});",
  "const data=await res.json();",
  "if(res.ok){",
  "document.getElementById('inputMemName').value='';",
  "document.getElementById('inputMemPhone').value='';",
  "const msg=document.getElementById('memberFormSuccess');",
  "msg.textContent='✅ 新增成功！';msg.classList.add('show');",
  "setTimeout(()=>msg.classList.remove('show'),3000);",
  "await loadAll();",
  "}else{alert('失敗：'+(data.error||'未知錯誤'));}}",
  "async function toggleMemberStatus(id,currentStatus){",
  "const newStatus=currentStatus==='active'?'inactive':'active';",
  "const res=await fetch('/api/dashboard/members/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:newStatus})});",
  "if(res.ok)await loadAll();}",
  "async function deleteMember(id){",
  "if(!confirm('確定刪除此參加者？'))return;",
  "const res=await fetch('/api/dashboard/members/'+id,{method:'DELETE'});",
  "if(res.ok)await loadAll();}",
  "// Image modal",
  "function openImgModal(key){",
  "document.getElementById('imgModalBody').innerHTML='<img src=\"/api/dashboard/images/'+encodeURIComponent(key)+'\" style=\"width:100%;border-radius:8px;\" alt=\"截圖\">';",
  "document.getElementById('imgModal').classList.add('show');}",
  "function closeImgModal(){document.getElementById('imgModal').classList.remove('show');}",
  "document.getElementById('imgModal').addEventListener('click',e=>{if(e.target.id==='imgModal')closeImgModal();});",
  "loadAll();",
  '</script></body></html>'
].join("");

// ─────────────────────────────────────────────
// MiniMax OCR
// ─────────────────────────────────────────────
async function callMiniMaxOCR(imageBuffer, env) {
  const apiKey = env.MINIMAX_API_KEY;
  if (!apiKey) {
    return { success: false, error: "MiniMax API key not configured" };
  }

  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

  try {
    const response = await fetch("https://api.minimax.chat/v1/v1/vision", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "minimax/vision",
        messages: [{
          role: "user",
          content: [{
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          }, {
            type: "text",
            text: "請識別這張銀行轉帳截圖，提取以下資訊：1) 收款人姓名 2) 銀行名稱 3) 轉帳金額（港幣） 4) 轉帳日期。以JSON格式回覆，例如：{\"name\":\"張三\",\"bank\":\"HSBC\",\"amount\":\"500\",\"date\":\"2026-04-01\"}。如果找不到某項資訊則用null表示。"
          }]
        }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `MiniMax API error: ${response.status} - ${errText}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let parsed = null;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // JSON parse failed, try text extraction
    }

    return {
      success: true,
      data: parsed || {
        raw: content.substring(0, 500)
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// Main Worker Handler
// ─────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ── Pages ───────────────────────────────
      if (path === "/" || path === "/payment") {
        return new Response(HTML_MEMBER, { headers: { "Content-Type": "text/html" } });
      }
      if (path === "/dashboard") {
        return new Response(HTML_DASHBOARD, { headers: { "Content-Type": "text/html" } });
      }

      // ── API: Member login ──────────────────
      if (path === "/api/login" && request.method === "POST") {
        const { phone } = await request.json();
        if (!phone || !/^\d{8}$/.test(phone)) {
          return json({ error: "無效電話號碼" }, 400);
        }
        const member = await env.DB.prepare("SELECT * FROM members WHERE phone = ?").bind(phone).first();
        if (!member) {
          return json({ error: "找不到此電話號碼，請聯絡職員" }, 404);
        }
        return json({ member });
      }

      // ── API: Get open months ────────────────
      if (path === "/api/months" && request.method === "GET") {
        if (url.searchParams.has("payments")) {
          // Get payments for a specific member
          const memberId = url.searchParams.get("member_id");
          const payments = await env.DB.prepare(
            "SELECT * FROM payments WHERE member_id = ?"
          ).bind(memberId).all();
          return json({ payments: payments.results || [] });
        }
        const months = await env.DB.prepare(
          "SELECT * FROM months WHERE status = 'open' ORDER BY id ASC"
        ).all();
        return json({ months: months.results || [] });
      }

      // ── API: OCR ────────────────────────────
      if (path === "/api/payments/ocr" && request.method === "POST") {
        const formData = await request.formData();
        const image = formData.get("image");
        if (!image) {
          return json({ success: false, error: "No image provided" }, 400);
        }
        const imageBuffer = await image.arrayBuffer();
        const result = await callMiniMaxOCR(imageBuffer, env);
        return json(result);
      }

      // ── API: Submit payment ────────────────
      if (path === "/api/payments" && request.method === "POST") {
        const formData = await request.formData();
        const memberId = formData.get("member_id");
        const monthsRaw = formData.get("months");
        const aiResult = formData.get("ai_result");
        const image = formData.get("image");

        if (!memberId || !monthsRaw) {
          return json({ error: "缺少必要資料" }, 400);
        }
        const monthIds = JSON.parse(monthsRaw);

        // Verify member exists
        const member = await env.DB.prepare("SELECT * FROM members WHERE id = ?").bind(memberId).first();
        if (!member) {
          return json({ error: "會員不存在" }, 404);
        }

        // Upload image to R2
        let imageUrl = null;
        if (image) {
          const imageKey = `payments/${memberId}/${Date.now()}_${image.name}`;
          await env.IMAGES.put(imageKey, image);
          imageUrl = imageKey;
        }

        // Get month prices and create/update payment records
        const results = [];
        for (const monthId of monthIds) {
          const month = await env.DB.prepare("SELECT * FROM months WHERE id = ?").bind(monthId).first();
          if (!month) continue;

          // Check if payment already exists
          const existing = await env.DB.prepare(
            "SELECT * FROM payments WHERE member_id = ? AND month_id = ?"
          ).bind(memberId, monthId).first();

          if (existing) {
            // Update existing
            await env.DB.prepare(`
              UPDATE payments SET amount = ?, image_url = COALESCE(?, image_url),
              ai_result = COALESCE(?, ai_result), status = 'pending', uploaded_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(month.price, imageUrl, aiResult, existing.id).run();
            results.push({ month_id: monthId, id: existing.id, action: "updated" });
          } else {
            // Insert new
            const result = await env.DB.prepare(`
              INSERT INTO payments (member_id, month_id, amount, image_url, ai_result, status)
              VALUES (?, ?, ?, ?, ?, 'pending')
            `).bind(memberId, monthId, month.price, imageUrl, aiResult).run();
            results.push({ month_id: monthId, id: result.meta?.last_row_id, action: "created" });
          }
        }

        return json({ success: true, results });
      }

      // ── API: Dashboard stats ───────────────
      if (path === "/api/dashboard/stats" && request.method === "GET") {
        const openMonths = await env.DB.prepare("SELECT id FROM months WHERE status = 'open'").all();
        const openMonthIds = (openMonths.results || []).map(m => m.id);

        const allPayments = await env.DB.prepare("SELECT status FROM payments").all();
        const allPayStatuses = (allPayments.results || []).map(p => p.status);

        // Count unpaid = active members * open months - existing payments
        const activeMembers = await env.DB.prepare("SELECT COUNT(*) as cnt FROM members WHERE status = 'active'").first();
        const memberCount = activeMembers?.cnt || 0;
        const monthCount = openMonthIds.length;
        const totalExpected = memberCount * monthCount;
        const existingPayments = allPayStatuses.length;
        const unpaid = Math.max(0, totalExpected - existingPayments);

        return json({
          paid: allPayStatuses.filter(s => s === "paid").length,
          unpaid,
          problem: allPayStatuses.filter(s => s === "problem").length,
          total: existingPayments
        });
      }

      // ── API: Dashboard members ──────────────
      if (path === "/api/dashboard/members" && request.method === "GET") {
        const members = await env.DB.prepare("SELECT * FROM members ORDER BY created_at DESC").all();
        return json({ members: members.results || [] });
      }
      if (path === "/api/dashboard/members" && request.method === "POST") {
        const { name, phone } = await request.json();
        if (!name || !phone || !/^\d{8}$/.test(phone)) {
          return json({ error: "請填寫姓名和有效電話" }, 400);
        }
        // Check duplicate
        const existing = await env.DB.prepare("SELECT id FROM members WHERE phone = ?").bind(phone).first();
        if (existing) {
          return json({ error: "此電話已存在" }, 409);
        }
        // Generate ID
        const last = await env.DB.prepare("SELECT id FROM members ORDER BY id DESC LIMIT 1").first();
        let newId = "MBR001";
        if (last) {
          const num = parseInt(last.id.replace("MBR", "")) + 1;
          newId = "MBR" + String(num).padStart(3, "0");
        }
        await env.DB.prepare(
          "INSERT INTO members (id, name, phone, status) VALUES (?, ?, ?, 'active')"
        ).bind(newId, name, phone).run();
        const created = await env.DB.prepare("SELECT * FROM members WHERE id = ?").bind(newId).first();
        return json({ member: created });
      }
      if (path.match(/^\/api\/dashboard\/members\/([^\/]+)$/) && request.method === "PATCH") {
        const id = path.match(/^\/api\/dashboard\/members\/([^\/]+)$/)[1];
        const { status } = await request.json();
        await env.DB.prepare("UPDATE members SET status = ? WHERE id = ?").bind(status, id).run();
        return json({ success: true });
      }
      if (path.match(/^\/api\/dashboard\/members\/([^\/]+)$/) && request.method === "DELETE") {
        const id = path.match(/^\/api\/dashboard\/members\/([^\/]+)$/)[1];
        await env.DB.prepare("DELETE FROM payments WHERE member_id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM members WHERE id = ?").bind(id).run();
        return json({ success: true });
      }

      // ── API: Dashboard months ──────────────
      if (path === "/api/dashboard/months" && request.method === "GET") {
        const months = await env.DB.prepare("SELECT * FROM months ORDER BY id DESC").all();
        return json({ months: months.results || [] });
      }
      if (path === "/api/dashboard/months" && request.method === "POST") {
        const { id, name, price, classes, status } = await request.json();
        if (!id || !price || !classes) {
          return json({ error: "缺少必要欄位" }, 400);
        }
        // Generate display name from id if not provided
        const displayName = name || (() => {
          const [y, mo] = id.split("-");
          const d = new Date(y, parseInt(mo) - 1);
          return d.toLocaleDateString("zh-HK", { year: "numeric", month: "long" });
        })();

        const existing = await env.DB.prepare("SELECT id FROM months WHERE id = ?").bind(id).first();
        if (existing) {
          return json({ error: "此月份已存在" }, 409);
        }
        await env.DB.prepare(
          "INSERT INTO months (id, name, price, classes, status) VALUES (?, ?, ?, ?, ?)"
        ).bind(id, displayName, price, classes, status || "open").run();
        const created = await env.DB.prepare("SELECT * FROM months WHERE id = ?").bind(id).first();
        return json({ month: created });
      }
      if (path.match(/^\/api\/dashboard\/months\/([^\/]+)$/) && request.method === "PUT") {
        const id = path.match(/^\/api\/dashboard\/months\/([^\/]+)$/)[1];
        const { name, price, classes, status } = await request.json();
        await env.DB.prepare(
          "UPDATE months SET name = ?, price = ?, classes = ?, status = ? WHERE id = ?"
        ).bind(name, price, classes, status, id).run();
        const updated = await env.DB.prepare("SELECT * FROM months WHERE id = ?").bind(id).first();
        return json({ month: updated });
      }
      if (path.match(/^\/api\/dashboard\/months\/([^\/]+)$/) && request.method === "DELETE") {
        const id = path.match(/^\/api\/dashboard\/months\/([^\/]+)$/)[1];
        await env.DB.prepare("DELETE FROM payments WHERE month_id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM months WHERE id = ?").bind(id).run();
        return json({ success: true });
      }

      // ── API: Dashboard payments ─────────────
      if (path === "/api/dashboard/payments" && request.method === "GET") {
        const payments = await env.DB.prepare("SELECT * FROM payments ORDER BY uploaded_at DESC LIMIT 500").all();
        return json(payments.results || []);
      }
      if (path === "/api/dashboard/payments" && request.method === "POST") {
        const { member_id, month_id, status } = await request.json();
        if (!member_id || !month_id) {
          return json({ error: "缺少必要欄位" }, 400);
        }
        const month = await env.DB.prepare("SELECT * FROM months WHERE id = ?").bind(month_id).first();
        const amount = month?.price || 0;
        const existing = await env.DB.prepare(
          "SELECT * FROM payments WHERE member_id = ? AND month_id = ?"
        ).bind(member_id, month_id).first();
        if (existing) {
          await env.DB.prepare(
            "UPDATE payments SET status = ?, amount = ? WHERE id = ?"
          ).bind(status || "pending", amount, existing.id).run();
          return json({ success: true, id: existing.id });
        } else {
          const result = await env.DB.prepare(
            "INSERT INTO payments (member_id, month_id, amount, status) VALUES (?, ?, ?, ?)"
          ).bind(member_id, month_id, amount, status || "pending").run();
          return json({ success: true, id: result.meta?.last_row_id });
        }
      }
      if (path.match(/^\/api\/dashboard\/payments\/(\d+)$/) && request.method === "PATCH") {
        const id = parseInt(path.match(/^\/api\/dashboard\/payments\/(\d+)$/)[1]);
        const { status } = await request.json();
        await env.DB.prepare("UPDATE payments SET status = ? WHERE id = ?").bind(status, id).run();
        return json({ success: true });
      }

      // ── API: Image proxy ────────────────────
      if (path.startsWith("/api/dashboard/images/")) {
        const key = decodeURIComponent(path.replace("/api/dashboard/images/", ""));
        try {
          const img = await env.IMAGES.get(key);
          if (!img) {
            return new Response("Image not found", { status: 404 });
          }
          const data = await img.arrayBuffer();
          const contentType = img.httpMetadata?.contentType || "image/jpeg";
          return new Response(data, {
            headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" }
          });
        } catch (e) {
          return new Response("Image error: " + e.message, { status: 500 });
        }
      }

      // ── API: Health ─────────────────────────
      if (path === "/api/health" && request.method === "GET") {
        return json({ status: "ok", version: "v4", timestamp: new Date().toISOString() });
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: err.message }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
