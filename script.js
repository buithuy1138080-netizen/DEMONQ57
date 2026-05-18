var APP = {
token   : null,
user    : null,
perms   : {},
vanBan  : [],
duAn    : [],
nhiemVu : [],
nhanSu  : [],
donVi   : [],
tienDo  : [],
stats   : {},
notifications  : [],
reminders      : [],
currentSection : 'overview',
modalType      : null,
editId         : null,
rpTab          : 'all',
charts         : {},
_modalSubmitFn : null
};
var COLORS = [
'#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
'#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'
];
window.addEventListener('load', function () {
initTheme();
initNav();
initSearch();
initKeyboard();
var saved=localStorage.getItem('nq57_token');
var savedUser=_loadUserCache();
if(saved){
APP.token=saved;
if(savedUser){
APP.user=savedUser;APP.perms=savedUser._perms||{};
APP.vanBan=savedUser._vanBan||[];APP.duAn=savedUser._duAn||[];
APP.nhiemVu=savedUser._nhiemVu||[];APP.nhanSu=savedUser._nhanSu||[];
APP.donVi=savedUser._donVi||[];APP.stats=savedUser._stats||{};
applyPermissions();renderUserInfo();
if(APP.nhiemVu.length||APP.vanBan.length){
try{renderAll();}catch(e){console.error('renderAll cache',e);}
}
}
loadData(true);
}else{showLogin();}
});
function _saveUserCache(user,perms){
try{
var o=Object.assign({},user,{
_perms:perms,_vanBan:APP.vanBan||[],_duAn:APP.duAn||[],
_nhiemVu:APP.nhiemVu||[],_nhanSu:APP.nhanSu||[],
_donVi:APP.donVi||[],_stats:APP.stats||{}
});
var s=JSON.stringify(o);
localStorage.setItem('nq57_user',s.length<800000?s:JSON.stringify(Object.assign({},user,{_perms:perms})));
}catch(e){}
}
function _loadUserCache() {
try {
var s = localStorage.getItem('nq57_user');
return s ? JSON.parse(s) : null;
} catch(e) { return null; }
}
function _clearUserCache() {
localStorage.removeItem('nq57_user');
}
function doLogin() {
var email = val('login-email');
var pw    = val('login-password');
if (!email || !pw) return showError('login-error', 'Vui lòng nhập email và mật khẩu');
setBtn('login-submit', true, '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...');
_hideLoginError();
gs('authenticateUser', [email, pw], function (res) {
setBtn('login-submit', false, '<i class="fas fa-sign-in-alt"></i>Đăng nhập');
if (res.success) {
APP.token = res.sessionToken;
APP.user  = res.user;
localStorage.setItem('nq57_token', APP.token);
el('login-modal').classList.remove('active');
loadData();
} else {
_showLoginError(res.error || 'Sai email hoặc mật khẩu');
}
});
}
function doLogout() {
gs('logout', [APP.token], function () {});
APP.token = null;
APP.user  = null;
localStorage.removeItem('nq57_token');
_clearUserCache();
resetAppState();
showLogin();
}
function showLogin() {
el('login-modal').classList.add('active');
el('user-info').style.display = 'none';
setTimeout(function () { el('login-email').focus(); }, 100);
}
function loadData(quiet) {
if (!quiet) {
_showSkeletonStats();
showLoading('Đang kết nối hệ thống...');
}
gs('getDataForUser', [APP.token], function (res) {
hideLoading();
if (!res.success) {
if (res.requireLogin) {
_clearUserCache();
showLogin();
return;
}
toast('Lỗi: ' + (res.error || 'Không thể tải dữ liệu'), 'error');
return;
}
APP.token         = res.sessionToken || APP.token;
// Nếu server trả vanBan nhiều hơn cache → xóa cache cũ để render mới
if(res.vanBan && APP.vanBan && res.vanBan.length > APP.vanBan.length) {
try{localStorage.removeItem('nq57_user');}catch(e){}
}
APP.user          = res.user;
APP.perms         = res.permissions  || {};
APP.vanBan        = res.vanBan       || [];
APP.duAn          = res.duAn         || [];
APP.nhiemVu       = res.nhiemVu      || [];
APP.nhanSu        = res.nhanSu       || [];
APP.donVi         = res.donVi        || [];
APP.tienDo        = res.tienDoMucTieu|| [];
APP.stats         = res.stats        || {};
APP.notifications = res.notifications|| [];
localStorage.setItem('nq57_token', APP.token);
_saveUserCache(APP.user, APP.perms); // Cache để F5 không cần login
applyPermissions();
renderUserInfo();
renderAll();
// Re-render section đang xem nếu cần cập nhật dữ liệu mới
try{
if(APP.currentSection==='vanban') renderVanBan();
if(APP.currentSection==='duan') renderDuAn();
if(APP.currentSection==='nhiemvu') renderNhiemVu();
}catch(e){}
if(typeof loadReminders==="function")loadReminders();
});
}
function _showSkeletonStats() {
var ids = ['s-vanban','s-duan','s-nhiemvu','s-hoanThanh','s-quaHan','s-giaiNgan','s-tyLeGN','s-canhBao'];
ids.forEach(function(id){
var e = el(id);
if (e && e.textContent === '—') e.innerHTML = '<span style="display:inline-block;width:32px;height:16px;background:var(--border);border-radius:4px;animation:shimmer 1.2s infinite linear"></span>';
});
}
function renderAll() {
try{renderStats();}catch(e){console.error('stats',e);}
try{if(typeof Chart!=='undefined')renderCharts();}catch(e){}
try{renderRecentTasks();}catch(e){}
try{renderVanBan();}catch(e){console.error('vb',e);}
try{renderDuAn();}catch(e){console.error('da',e);}
try{renderNhiemVu();}catch(e){console.error('nv',e);}
try{renderTaiChinh();}catch(e){}
try{if(typeof renderMucTieu==='function')renderMucTieu();}catch(e){}
try{renderDonVi();}catch(e){}
try{renderNhanSu();}catch(e){}
try{if(typeof renderIOC==='function')renderIOC();}catch(e){}
try{populateAllFilters();}catch(e){}
}
function resetAppState() {
APP.vanBan = []; APP.duAn = []; APP.nhiemVu = [];
APP.nhanSu = []; APP.donVi = []; APP.tienDo = [];
APP.stats  = {}; APP.notifications = []; APP.reminders = [];
el('user-info').style.display = 'none';
}
function applyPermissions() {
var p = APP.perms;
showEl('add-vanban-btn',  p.canEditVanBan);
showEl('add-duan-btn',    p.canEditDuAn);
showEl('add-donvi-btn',   p.canManageDonVi);
showEl('add-nhansu-btn',  p.canManageStaff || p.isManager);
showEl('nav-nhansu',      p.canManageStaff || p.isManager);
showEl('nav-donvi',       p.canManageDonVi || p.isManager);
showEl('quick-vanban',    p.canEditVanBan);
showEl('quick-duan',      p.canEditDuAn);
showEl('quick-donvi',     p.canManageDonVi);
showEl('quick-nhansu',    p.canManageStaff || p.isManager);
}
function renderUserInfo() {
var u = APP.user; if (!u) return;
var av = el('user-avatar');
if (av) av.textContent = (u.name || '?').charAt(0).toUpperCase();
setText('user-name', u.name || u.email);
setText('user-role', u.role || '');
el('user-info').style.display = 'block';
el('logout-btn').onclick = doLogout;
}
function renderStats() {
var s = APP.stats;
setText('s-vanban',    s.soVanBan  || 0);
setText('s-duan',      s.soDuAn    || 0);
setText('s-nhiemvu',   s.soNhiemVu || 0);
var htCount = APP.nhiemVu.filter(function (n) {
return /ho[àa]n/i.test(n.Trang_Thai || '');
}).length;
setText('s-hoanThanh', htCount);
setText('s-quaHan',    s.quaHan || 0);
setText('s-quaHanRate',
s.soNhiemVu ? Math.round((s.quaHan || 0) / s.soNhiemVu * 100) + '%' : '0%');
setText('s-giaiNgan',  fmtMoney(s.tongKpGiaiNgan || 0));
setText('s-tyLeGN',    (s.tyLeGiaiNgan || 0) + '%');
var today = new Date(); today.setHours(0, 0, 0, 0);
var sapHan = APP.nhiemVu.filter(function (n) {
var due = n.Han_Chot ? new Date(n.Han_Chot) : null;
if (!due || isNaN(due)) return false;
due.setHours(0, 0, 0, 0);
var diff = Math.round((due - today) / 86400000);
return diff >= 0 && diff <= 7 && !/ho[àa]n/i.test(n.Trang_Thai || '');
}).length;
setText('s-canhBao', sapHan);
var _tS=new Date();_tS.setHours(0,0,0,0);
var _daHT=APP.duAn.filter(function(d){return /ho[àa]n/i.test(d.Trang_Thai_DA||'');}).length;
var _daQH=APP.duAn.filter(function(d){var kt=d.Ngay_Ket_Thuc?new Date(d.Ngay_Ket_Thuc):null;if(!kt||isNaN(kt))return false;kt.setHours(0,0,0,0);return kt<_tS&&!/ho[àa]n/i.test(d.Trang_Thai_DA||'');}).length;
try{setText('s-duan2',APP.stats.soDuAn||APP.duAn.length||0);}catch(e){}
try{setText('s-da-hoan-thanh',_daHT);}catch(e){}
try{setText('s-da-qua-han',_daQH);}catch(e){}
var badge = el('reminder-count-badge');
if (badge) {
badge.style.display = sapHan > 0 ? 'flex' : 'none';
badge.textContent   = sapHan;
}
}
function renderCharts() {
renderLinhVucChart();
renderTrangThaiChart();
renderDonViChart();
}
function renderLinhVucChart() {
var m = APP.stats.linhVucChart || {};
var labels = Object.keys(m);
var data   = labels.map(function (k) { return m[k]; });
if (!labels.length) return;
destroyChart('linhVucChart');
APP.charts.linhVuc = new Chart(el('linhVucChart'), {
type: 'doughnut',
data: {
labels: labels,
datasets: [{
data: data,
backgroundColor: COLORS.slice(0, labels.length),
borderWidth: 2,
borderColor: '#ffffff'
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
plugins: {
legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12 } }
}
}
});
}
function renderTrangThaiChart() {
var m = APP.stats.trangThaiNV || {};
var labels = Object.keys(m);
var data   = labels.map(function (k) { return m[k]; });
if (!labels.length) return;
destroyChart('trangThaiChart');
APP.charts.trangThai = new Chart(el('trangThaiChart'), {
type: 'bar',
data: {
labels: labels,
datasets: [{
data: data,
backgroundColor: COLORS,
borderWidth: 0,
borderRadius: 6
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
plugins: { legend: { display: false } },
scales: {
y: { beginAtZero: true, ticks: { font: { size: 10 } } },
x: { ticks: { font: { size: 10 } } }
}
}
});
}
function renderDonViChart() {
var dvMap = {};
APP.donVi.forEach(function (d) { dvMap[d.ID_Don_Vi] = d.Ten_Don_Vi || d.ID_Don_Vi; });
var counts = {};
APP.nhiemVu.forEach(function (n) {
var k = dvMap[n.ID_Don_Vi_Chu_Tri] || n.ID_Don_Vi_Chu_Tri || 'Chưa gán';
counts[k] = (counts[k] || 0) + 1;
});
var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
var labels = sorted.slice(0, 8);
var data   = labels.map(function (l) { return counts[l]; });
if (!labels.length) return;
destroyChart('donViChart');
APP.charts.donVi = new Chart(el('donViChart'), {
type: 'bar',
data: {
labels: labels,
datasets: [{
data: data,
backgroundColor: 'rgba(59,130,246,.75)',
borderWidth: 0,
borderRadius: 6
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
indexAxis: 'y',
plugins: { legend: { display: false } },
scales: {
x: { beginAtZero: true, ticks: { font: { size: 10 } } },
y: { ticks: { font: { size: 10 } } }
}
}
});
}
function renderRecentTasks() {
var c = el('recent-tasks-list'); if (!c) return;
var tasks = APP.nhiemVu.slice(-8).reverse();
if (!tasks.length) { c.innerHTML = emptyState('Chưa có nhiệm vụ nào'); return; }
c.innerHTML = tasks.map(function (nv) {
var da  = findById(APP.duAn, 'ID_Du_An', nv.ID_Du_An);
var pct = parseInt(nv.Tien_Do_Phan_Tram || 0);
var cb  = nv.Muc_Canh_Bao || '';
return taskCardHtml(nv, da, pct, cb, true);
}).join('');
}
function initNav() {
document.querySelectorAll('.nav-link').forEach(function (a) {
a.addEventListener('click', function () {
var sec = this.getAttribute('data-section');
if (sec) navigateTo(sec);
});
});
}
function navigateTo(section) {
document.querySelectorAll('.section').forEach(function (s) {
s.classList.remove('active');
});
var target = el(section + '-section');
if (target) target.classList.add('active');
document.querySelectorAll('.nav-link').forEach(function (a) {
a.classList.toggle('active', a.getAttribute('data-section') === section);
});
APP.currentSection = section;
var titles = {
overview: 'Tổng Quan',    vanban:   'Văn Bản',
duan:     'Dự Án',        nhiemvu:  'Nhiệm Vụ',
taichinh: 'Tài Chính',    muctieu:  'Mục Tiêu Tháng',
gantt:    'Sơ Đồ Gantt',  report:   'Báo Cáo',
thongke:  'Thống Kê Phòng Ban',
ioc:      'IOC NQ57',     donvi:    'Đơn Vị',
nhansu:   'Nhân Sự'
};
setText('page-title', titles[section] || section);
if(section==='gantt'){try{if(typeof renderGantt==='function')renderGantt();}catch(e){}}
if(section==='ioc'){try{if(typeof renderIOC==='function')renderIOC();}catch(e){}}
if(section==='report'){try{if(typeof loadReportData==='function')loadReportData();}catch(e){}}
if(section==='taichinh'){try{renderTaiChinh();}catch(e){}}
if(section==='muctieu'){try{if(typeof renderMucTieu==='function')renderMucTieu();}catch(e){}}
if(section==='thongke'){try{if(typeof renderThongKe==='function')renderThongKe();}catch(e){}}
if (window.innerWidth < 768) closeSidebar();
}
function toggleSidebar() {
el('sidebar').classList.toggle('open');
el('mobile-overlay').classList.toggle('show');
}
function closeSidebar() {
el('sidebar').classList.remove('open');
el('mobile-overlay').classList.remove('show');
}
function initTheme() {
var saved = localStorage.getItem('nq57_theme') || 'light';
document.documentElement.setAttribute('data-theme', saved);
updateThemeIcon(saved);
}
function toggleDarkMode() {
var cur  = document.documentElement.getAttribute('data-theme') || 'light';
var next = cur === 'dark' ? 'light' : 'dark';
document.documentElement.setAttribute('data-theme', next);
localStorage.setItem('nq57_theme', next);
updateThemeIcon(next);
}
function updateThemeIcon(theme) {
var icon  = el('darkmode-icon');
var label = el('darkmode-label');
if (icon)  icon.className  = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
if (label) label.textContent = theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối';
}
function initSearch() {
var inp = el('search-input');
if (!inp) return;
var timer;
inp.addEventListener('input', function () {
clearTimeout(timer);
timer = setTimeout(function () { globalSearch(inp.value.trim()); }, 300);
});
}
function globalSearch(q) {
if (!q) return;
var ql = q.toLowerCase();
var found = APP.nhiemVu.filter(function (n) {
return (n.Ten_Nhiem_Vu || '').toLowerCase().includes(ql) ||
(n.ID_Nhiem_Vu  || '').toLowerCase().includes(ql);
});
if (found.length) {
navigateTo('nhiemvu');
el('nv-search').value = q;
renderNhiemVu();
return;
}
var daFound = APP.duAn.filter(function (d) {
return (d.Ten_Du_An || '').toLowerCase().includes(ql);
});
if (daFound.length) {
navigateTo('duan');
el('da-search').value = q;
renderDuAn();
return;
}
toast('Không tìm thấy kết quả cho "' + q + '"', 'info');
}
function initKeyboard() {
document.addEventListener('keydown', function (e) {
if (e.key === 'Escape') {
closeModal();
closeDetail();
closeReminderPanel();
}
if (e.ctrlKey && e.key === 'r' && !e.shiftKey) {
e.preventDefault();
loadData(true);
toast('Đã làm mới dữ liệu', 'info');
}
});
}
function populateAllFilters() {
populateSelect('da-vb-filter', APP.vanBan, 'ID_Van_Ban', 'Ten_Van_Ban_Trich_Yeu', 'Tất cả văn bản');
populateSelect('nv-vb-filter', APP.vanBan, 'ID_Van_Ban', 'Ten_Van_Ban_Trich_Yeu', 'Tất cả văn bản');
populateSelect('nv-da-filter', APP.duAn, 'ID_Du_An', 'Ten_Du_An', 'Tất cả dự án');
var _lv0=['Chỉ đạo, điều hành','Hạ tầng, thiết bị','Chuyển đổi số - DVC, ĐA06','Khoa học, Đổi mới sáng tạo','Nhân lực, kỹ năng số','An toàn thông tin'];
var linhVucs=_lv0.concat([...new Set(APP.nhiemVu.map(function(n){return n.Linh_Vuc_NQ57;}).filter(Boolean))].filter(function(lv){return _lv0.indexOf(lv)===-1;}));
var lvEl = el('nv-linh-vuc');
if (lvEl) {
lvEl.innerHTML = '<option value="">Tất cả lĩnh vực</option>' +
linhVucs.map(function (lv) { return '<option value="' + esc(lv) + '">' + esc(lv) + '</option>'; }).join('');
}
populateSelect('ns-dv-filter', APP.donVi, 'ID_Don_Vi', 'Ten_Don_Vi', 'Tất cả đơn vị');
populateSelect('gantt-filter-vb', APP.vanBan, 'ID_Van_Ban', 'Ten_Van_Ban_Trich_Yeu', 'Tất cả văn bản');
var nhoms = [...new Set(APP.tienDo.map(function (t) { return t.Nhom_Linh_Vuc; }).filter(Boolean))];
var nhomEl = el('mt-nhom');
if (nhomEl) {
nhomEl.innerHTML = '<option value="">Tất cả nhóm</option>' +
nhoms.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('');
}
}
function populateSelect(elId, arr, valKey, labelKey, placeholder) {
var sel = el(elId); if (!sel) return;
sel.innerHTML = '<option value="">' + placeholder + '</option>' +
arr.map(function (item) {
var v = item[valKey] || '';
var l = item[labelKey] || v;
return '<option value="' + esc(String(v)) + '">' + esc(String(l)) + '</option>';
}).join('');
}
function toggleDropdown(id) {
var dd = el(id);
if (!dd) return;
var isOpen = dd.classList.contains('open');
closeDropdowns();
if (!isOpen) dd.classList.add('open');
}
function closeDropdowns() {
document.querySelectorAll('.dropdown-menu').forEach(function (d) {
d.classList.remove('open');
});
}
document.addEventListener('click', function (e) {
if (!e.target.closest('.dropdown-wrap')) closeDropdowns();
});
function toast(msg, type, duration) {
var icons = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
var t = document.createElement('div');
t.className = 'toast ' + (type || 'info');
t.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + esc(msg) + '</span>';
el('toast-container').appendChild(t);
setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; setTimeout(function () { t.remove(); }, 300); }, duration || 3000);
}
function showLoading(msg) {
var ov = el('loading-overlay');
if (ov) { setText('loading-text', msg || 'Đang xử lý...'); ov.style.display = 'flex'; }
}
function hideLoading() {
var ov = el('loading-overlay');
if (ov) ov.style.display = 'none';
}
// ── API base URL — trỏ đến Google Apps Script Web App ──────────
function gs(fn, args, cb) {
  var params = new URLSearchParams();
  params.append('fn', fn);
  params.append('args', JSON.stringify(args || []));

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })
  .then(function(res) { return res.json(); })
  .then(function(r) { cb(r || {}); })
  .catch(function(e) {
    console.error('API Error [' + fn + ']:', e);
    cb({ success: false, error: e.message || String(e) });
  });
}
function gs(fn, args, cb) {
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn: fn, args: args || [] })
  })
  .then(function(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  })
  .then(function(r) { cb(r || {}); })
  .catch(function(e) {
    console.error('API Error [' + fn + ']:', e);
    cb({ success: false, error: e.message || String(e) });
  });
}
function el(id)           { return document.getElementById(id); }
function val(id)          { var e = el(id); return e ? e.value.trim() : ''; }
function setText(id, txt) { var e = el(id); if (e) e.textContent = txt; }
function hide(id)         { var e = el(id); if (e) e.style.display = 'none'; }
function showEl(id, show) {
var e = el(id); if (!e) return;
e.style.display = (show === undefined ? true : show) ? '' : 'none';
}
function setBtn(id, disabled, html) {
var e = el(id); if (!e) return;
e.disabled = disabled;
if (html !== undefined) e.innerHTML = html;
}
function showError(id, msg) {
var e = el(id); if (!e) return;
e.textContent    = msg;
e.style.display  = 'block';
}
function getPhiHopNames(str) {
if(!str) return '';
var ids=String(str).split(',').map(function(x){return x.trim();}).filter(Boolean);
return ids.map(function(id){var dv=findById(APP.donVi,'ID_Don_Vi',id);return dv?(dv.Ten_Don_Vi||id):id;}).join(', ');
}
function esc(s) {
return String(s || '')
.replace(/&/g,'&amp;').replace(/</g,'&lt;')
.replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function findById(arr, key, id) {
for (var i = 0; i < arr.length; i++) {
if (String(arr[i][key]) === String(id)) return arr[i];
}
return null;
}
function destroyChart(canvasId) {
var key = canvasId.replace('Chart','');
if (APP.charts[key]) { try { APP.charts[key].destroy(); } catch(e){} APP.charts[key] = null; }
if (APP.charts[canvasId]) { try { APP.charts[canvasId].destroy(); } catch(e){} APP.charts[canvasId] = null; }
var c = el(canvasId);
if (c) {
var existing = Chart.getChart(c);
if (existing) existing.destroy();
}
}
function fmtMoney(n) {
// Dữ liệu lưu theo đơn vị Trđ (triệu đồng)
n = parseFloat(n) || 0;
if (n === 0) return '0 Trđ';
if (n >= 1000) return (Math.round(n / 10) / 100).toFixed(1) + ' tỷ';
if (n >= 1)    return n.toLocaleString('vi-VN') + ' Trđ';
return n.toFixed(2) + ' Trđ';
}
function fmtDate(s) {
if (!s) return '';
var d = new Date(s);
if (isNaN(d)) return String(s);
return ('0'+d.getDate()).slice(-2) + '/' + ('0'+(d.getMonth()+1)).slice(-2) + '/' + d.getFullYear();
}
function fmtNum(n) { return Number(n).toLocaleString('vi-VN'); }
function daysDiff(dateStr) {
if (!dateStr) return null;
var due   = new Date(dateStr); if (isNaN(due)) return null;
var today = new Date(); today.setHours(0,0,0,0); due.setHours(0,0,0,0);
return Math.round((due - today) / 86400000);
}
function isOverdue(nv) {
var diff = daysDiff(nv.Han_Chot);
return diff !== null && diff < 0 && !/ho[àa]n/i.test(nv.Trang_Thai || '');
}
function badge(text, cls) {
var map = {
'Hoan thanh':'green','Dang thuc hien':'blue','Chua bat dau':'gray',
'Qua han':'red','Admin':'red','Quan Ly':'purple','Nhan Vien':'gray'
};
var c = cls || map[text] || 'gray';
return '<span class="badge badge-' + c + '">' + esc(text) + '</span>';
}
function caBadge(cb) {
if (cb === 'DO')   return '<span title="Cảnh báo đỏ" style="color:#ef4444;font-size:14px">🔴</span>';
if (cb === 'VANG') return '<span title="Cảnh báo vàng" style="color:#f59e0b;font-size:14px">🟡</span>';
return '<span title="Đúng tiến độ" style="color:#10b981;font-size:14px">✅</span>';
}
function statusBadge(tt) {
if (!tt) return badge('Chưa rõ','gray');
if (/ho[àa]n/i.test(tt))  return badge(tt,'green');
if (/d[aă]ng/i.test(tt))  return badge(tt,'blue');
if (/chu[aă]/i.test(tt))  return badge(tt,'gray');
if (/t[aạ]m/i.test(tt))  return badge(tt,'yellow');
return badge(tt,'gray');
}
function priorityBadge(up) {
if (!up) return '';
if (/cao/i.test(up))   return '<span class="badge badge-red">' + esc(up) + '</span>';
if (/trung/i.test(up)) return '<span class="badge badge-yellow">' + esc(up) + '</span>';
return '<span class="badge badge-gray">' + esc(up) + '</span>';
}
function emptyState(msg) {
return '<div class="empty-state"><i class="fas fa-inbox"></i>' + esc(msg) + '</div>';
}
function taskCardHtml(nv, da, pct, cb, compact) {
var borderCls = cb==='DO'?'border-red': cb==='VANG'?'border-yellow':'border-blue';
var overdueFlag = isOverdue(nv);
var diff = daysDiff(nv.Han_Chot);
var ns  = findById(APP.nhanSu, 'ID_Nhan_Su', nv.ID_Nguoi_Thuc_Hien);
var html = '<div class="task-card ' + borderCls + '">';
html += '<div class="task-card-head">';
html += caBadge(cb);
html += '<span class="task-card-title" onclick="openNhiemVuDetail(\'' + esc(nv.ID_Nhiem_Vu) + '\')" style="cursor:pointer">' + esc(nv.Ten_Nhiem_Vu || '') + '</span>';
html += statusBadge(nv.Trang_Thai || '');
html += '</div>';
html += '<div class="task-card-meta">';
var nvVb = nv.ID_Van_Ban ? findById(APP.vanBan, 'ID_Van_Ban', nv.ID_Van_Ban) : null;
if (nvVb) html += '<span class="chip" style="background:#ede9fe;color:#6d28d9;border-color:#c4b5fd" title="' + esc(nvVb.Ten_Van_Ban_Trich_Yeu||'') + '"><i class="fas fa-file-alt" style="font-size:9px"></i>' + esc(nvVb.So_Ky_Hieu || nvVb.Ten_Van_Ban_Trich_Yeu || '') + '</span>';
if (da) html += '<span class="chip"><i class="fas fa-folder" style="font-size:9px"></i>' + esc(da.Ten_Du_An || da.ID_Du_An || '') + '</span>';
if (ns) html += '<span class="chip"><i class="fas fa-user" style="font-size:9px"></i>' + esc(ns.Ho_Ten || '') + '</span>';
if (nv.Han_Chot) {
var dueCls = overdueFlag ? 'color:#ef4444;font-weight:600' : (diff !== null && diff <= 3 ? 'color:#f59e0b' : '');
html += '<span class="chip" style="' + dueCls + '">' + (overdueFlag ? '❌' : '📅') + fmtDate(nv.Han_Chot) + '</span>';
}
if (nv.Linh_Vuc_NQ57) html += '<span class="chip">' + esc(nv.Linh_Vuc_NQ57) + '</span>';
html += '</div>';
html += '<div class="kp-bar-wrap"><div class="progress-wrap" style="flex:1"><div class="progress-bar ' + (pct >= 100 ? 'green' : overdueFlag ? 'red' : '') + '" style="width:' + pct + '%"></div></div><span>' + pct + '%</span></div>';
if (nv.Kinh_Phi_Du_Toan_NV && parseFloat(nv.Kinh_Phi_Du_Toan_NV) > 0) {
html += '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">💰 ' + fmtMoney(nv.Kinh_Phi_Da_Giai_Ngan_NV || 0) + ' / ' + fmtMoney(nv.Kinh_Phi_Du_Toan_NV) + '</div>';
}
if (nv.Kho_Khan_Vuong_Mac) {
html += '<div style="font-size:11px;color:#d97706;margin-top:4px">⚠️ ' + esc(String(nv.Kho_Khan_Vuong_Mac).substring(0, 80)) + '</div>';
}
if (!compact) {
html += '<div class="task-card-actions">';
html += '<button class="btn btn-outline btn-sm" onclick="openBaoCaoModal(\'' + esc(nv.ID_Nhiem_Vu) + '\')"><i class="fas fa-clipboard-list"></i>Báo cáo</button>';
if (APP.perms.canEditDuAn || APP.perms.isAdmin) {
html += '<button class="btn btn-outline btn-sm" onclick="editNhiemVu(\'' + esc(nv.ID_Nhiem_Vu) + '\')"><i class="fas fa-edit"></i>Sửa</button>';
}
html += '<button class="btn btn-outline btn-sm" onclick="openFutureTaskFromNv(\'' + esc(nv.ID_Nhiem_Vu) + '\')"><i class="fas fa-calendar-plus"></i>Tuần tới</button>';
if (APP.perms.isAdmin) {
html += '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteNhiemVu(\'' + esc(nv.ID_Nhiem_Vu) + '\')" title="Xóa"><i class="fas fa-trash"></i></button>';
}
html += '</div>';
}
html += '</div>';
return html;
}
function updateVanBanLink() {
var vbId = val('f-da-vb');
var linkEl = el('f-da-vb-link');
if (!linkEl) return;
if (!vbId) { linkEl.style.display = 'none'; return; }
var vb = findById(APP.vanBan, 'ID_Van_Ban', vbId);
var link = vb && vb.Link_File_Goc ? vb.Link_File_Goc : '';
if (link) { linkEl.href = link; linkEl.style.display = ''; }
else { linkEl.style.display = 'none'; }
}
function updateNvDirectVbLink() {
var vbId = val('f-nv-vb');
var linkEl = el('f-nv-direct-vb-link');
if (!linkEl) return;
if (!vbId) { linkEl.style.display = 'none'; return; }
var link = getVbLink(vbId);
if (link) { linkEl.href = link; linkEl.style.display = ''; }
else { linkEl.style.display = 'none'; }
}
function updateNvVanBanLink() {
var daId = val('f-nv-da');
var linkEl = el('f-nv-vb-link');
if (!linkEl) return;
if (!daId) { linkEl.style.display = 'none'; return; }
var da = findById(APP.duAn, 'ID_Du_An', daId);
var vb = da ? findById(APP.vanBan, 'ID_Van_Ban', da.ID_Van_Ban_Goc) : null;
var link = vb && vb.Link_File_Goc ? vb.Link_File_Goc : '';
if (link) { linkEl.href = link; linkEl.style.display = ''; }
else { linkEl.style.display = 'none'; }
}
// Helper: tạo nút Xem văn bản nhỏ gọn
function vbLinkBtn(link, label, small) {
if (!link) return '';
var lbl = label || '<i class="fas fa-external-link-alt"></i> Xem VB';
var cls = small ? 'btn btn-outline btn-sm btn-icon' : 'btn btn-outline btn-sm';
return '<a href="' + esc(link) + '" target="_blank" onclick="event.stopPropagation()" class="' + cls + '" style="white-space:nowrap" title="Xem văn bản gốc">' + lbl + '</a>';
}
// Lấy link văn bản từ VB object
function getVbLink(vbId) {
var vb = findById(APP.vanBan, 'ID_Van_Ban', vbId);
return vb && vb.Link_File_Goc ? vb.Link_File_Goc : '';
}
// Lấy link văn bản từ DA object (qua ID_Van_Ban_Goc)
function getDaVbLink(daId) {
var da = findById(APP.duAn, 'ID_Du_An', daId);
return da ? getVbLink(da.ID_Van_Ban_Goc) : '';
}
function canEditThisVanBan(vb) {
if (!vb || !APP.user) return false;
if (APP.perms.isAdmin) return true;
// Đơn vị chủ trì
if (vb.ID_Don_Vi_Chu_Tri && vb.ID_Don_Vi_Chu_Tri === APP.user.deptId) return true;
// Người theo dõi chính
if (vb.ID_Nguoi_Theo_Doi_Chinh && vb.ID_Nguoi_Theo_Doi_Chinh === APP.user.id) return true;
return false;
}
function renderVanBan() {
var c = el('vanban-list'); if (!c) return;
var search = val('vb-search').toLowerCase();
var cap    = val('vb-cap');
var loai   = val('vb-loai');
var list = APP.vanBan.filter(function (vb) {
if (cap  && !(vb.Cap_Ban_Hanh  || '').includes(cap))  return false;
if (loai && !(vb.Loai_Van_Ban  || '').includes(loai)) return false;
if (search && !(vb.Ten_Van_Ban_Trich_Yeu || '').toLowerCase().includes(search) &&
!(vb.So_Ky_Hieu           || '').toLowerCase().includes(search)) return false;
return true;
});
var _todayVB=new Date();_todayVB.setHours(0,0,0,0);
// Pre-build: vbId → có NV quá hạn không
var _vbQH={};
APP.nhiemVu.forEach(function(n){
var due=n.Han_Chot?new Date(n.Han_Chot):null;
if(!due||isNaN(due)||/ho[àa]n/i.test(n.Trang_Thai||''))return;
due.setHours(0,0,0,0);
if(due>=_todayVB)return;
var da2=findById(APP.duAn,'ID_Du_An',n.ID_Du_An);
if(da2&&da2.ID_Van_Ban_Goc) _vbQH[da2.ID_Van_Ban_Goc]=true;
});
list.sort(function(a,b){
var aQH=!!_vbQH[a.ID_Van_Ban];
var bQH=!!_vbQH[b.ID_Van_Ban];
if(aQH&&!bQH)return -1;if(!aQH&&bQH)return 1;
var da=new Date(a.Ngay_Cap_Nhat||a.Ngay_Ban_Hanh||'2000-01-01');
var db=new Date(b.Ngay_Cap_Nhat||b.Ngay_Ban_Hanh||'2000-01-01');
return db-da;
});
if (!list.length) { c.innerHTML = emptyState('Không có văn bản nào phù hợp'); return; }
c.innerHTML = list.map(function (vb) {
var daList = APP.duAn.filter(function (d) { return d.ID_Van_Ban_Goc === vb.ID_Van_Ban; });
var pct    = vb._pctTongHop || parseInt(vb.Tien_Do_Tong_The_VB || 0);
var capMap = { TW:'badge-red', Tinh:'badge-purple', Huyen:'badge-blue', Xa:'badge-green' };
var capCls = capMap[vb.Cap_Ban_Hanh] || 'badge-gray';
var kpDT   = vb._kpTongHop_DT || 0;
var kpGN   = vb._kpTongHop_GN || 0;
return '<div class="tree-card">'
+ '<div class="tree-card-head" onclick="toggleTreeBody(\'vb-body-' + vb.ID_Van_Ban + '\')" style="cursor:pointer">'
+ '<div class="tree-card-icon" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff"><i class="fas fa-file-alt"></i></div>'
+ '<div class="tree-card-info">'
+ '<div class="tree-card-title">' + esc(vb.Ten_Van_Ban_Trich_Yeu || vb.ID_Van_Ban) + '</div>'
+ '<div class="tree-card-sub">' + esc(vb.So_Ky_Hieu || '') + ' &nbsp;•&nbsp; '
+ fmtDate(vb.Ngay_Ban_Hanh) + ' &nbsp; <span class="badge ' + capCls + '">'
+ esc(vb.Cap_Ban_Hanh || '') + '</span></div>'
+ '</div>'
+ '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'
+ '<div class="progress-wrap" style="width:60px"><div class="progress-bar" style="width:' + pct + '%"></div></div>'
+ '<span style="font-size:10px;color:var(--text-muted)">' + pct + '%</span>'
+ '<i class="fas fa-chevron-right tree-chevron" id="chev-vb-body-' + vb.ID_Van_Ban + '"></i>'
+ '</div>'
+ (canEditThisVanBan(vb)
? '<div class="tree-card-actions" onclick="event.stopPropagation()">'
+ (vb.Link_File_Goc ? '<a href="' + esc(vb.Link_File_Goc) + '" target="_blank" class="btn btn-outline btn-sm btn-icon" title="Xem văn bản gốc" onclick="event.stopPropagation()"><i class="fas fa-external-link-alt"></i></a>' : '')
+ '<button class="btn btn-outline btn-sm btn-icon" onclick="editVanBan(\'' + vb.ID_Van_Ban + '\')" title="Sửa"><i class="fas fa-edit"></i></button>'
+ (APP.perms.isAdmin ? '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteVanBan(\'' + vb.ID_Van_Ban + '\')" title="Xóa"><i class="fas fa-trash"></i></button>' : '')
+ '</div>'
: (vb.Link_File_Goc
? '<div class="tree-card-actions" onclick="event.stopPropagation()"><a href="' + esc(vb.Link_File_Goc) + '" target="_blank" class="btn btn-outline btn-sm" title="Xem văn bản gốc" onclick="event.stopPropagation()"><i class="fas fa-external-link-alt"></i> Xem VB</a></div>'
: ''))
+ '</div>'
+ '<div class="tree-card-body" id="vb-body-' + vb.ID_Van_Ban + '">'
+ '<div class="tree-card-stats">'
+ '<span class="tree-stat"><i class="fas fa-folder" style="color:#3b82f6"></i>' + daList.length + ' dự án</span>'
+ '<span class="tree-stat"><i class="fas fa-coins" style="color:#10b981"></i>'
+ fmtMoney(kpGN) + ' / ' + fmtMoney(kpDT) + '</span>'
+ (vb._tyLeGiaiNgan ? '<span class="tree-stat"><i class="fas fa-percent" style="color:#f59e0b"></i>' + vb._tyLeGiaiNgan + '% giải ngân</span>' : '')
+ '</div>'
+ (daList.length
? '<div class="tree-children">' + daList.map(function (da) { return duAnMiniCard(da); }).join('') + '</div>'
: '<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:10px">Chưa có dự án liên kết — <a href="#" onclick="openModal(\'duan\');return false" style="color:#3b82f6">Thêm dự án</a></p>')
+ '</div>'
+ '</div>';
}).join('');
}
function duAnMiniCard(da) {
var nvList = APP.nhiemVu.filter(function (n) { return n.ID_Du_An === da.ID_Du_An; });
var pct    = da._pctTongHop || 0;
return '<div class="tree-card" style="margin:0;border-radius:8px;box-shadow:none">'
+ '<div class="tree-card-head" style="padding:8px 12px;cursor:pointer" onclick="openDuAnDetail(\'' + da.ID_Du_An + '\')">'
+ '<div class="tree-card-icon" style="width:28px;height:28px;border-radius:7px;font-size:11px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff"><i class="fas fa-folder-open"></i></div>'
+ '<div class="tree-card-info">'
+ '<div class="tree-card-title" style="font-size:12px">' + esc(da.Ten_Du_An || da.ID_Du_An) + '</div>'
+ '<div class="tree-card-sub">' + nvList.length + ' nhiệm vụ &nbsp;|&nbsp; ' + fmtMoney(da._kpTongHop_GN || 0) + ' / ' + fmtMoney(da._kpTongHop_DT || 0) + '</div>'
+ '</div>'
+ '<div class="progress-wrap" style="width:60px"><div class="progress-bar" style="width:' + pct + '%"></div></div>'
+ '<span style="font-size:10px;color:var(--text-muted);margin-left:4px">' + pct + '%</span>'
+ '</div>'
+ '</div>';
}
function toggleTreeBody(id) {
var b = el(id); if (!b) return;
var isOpen = b.classList.contains('open');
b.classList.toggle('open', !isOpen);
var chev = el('chev-' + id);
if (chev) chev.classList.toggle('open', !isOpen);
}
function renderDuAn() {
var c = el('duan-list'); if (!c) return;
var search = val('da-search').toLowerCase();
var vbF    = val('da-vb-filter');
var stF    = val('da-status');
var list = APP.duAn.filter(function (da) {
if (vbF && da.ID_Van_Ban_Goc !== vbF) return false;
if (stF && !(da.Trang_Thai_DA || '').toLowerCase().includes(stF.toLowerCase())) return false;
if (search && !(da.Ten_Du_An || '').toLowerCase().includes(search)) return false;
return true;
});
var _tDA=new Date();_tDA.setHours(0,0,0,0);
list.sort(function(a,b){
function _rDA(d){var tt=(d.Trang_Thai_DA||'').toLowerCase(),kt=d.Ngay_Ket_Thuc?new Date(d.Ngay_Ket_Thuc):null;
if(kt&&!isNaN(kt)){kt.setHours(0,0,0,0);if(kt<_tDA&&!/ho[àa]n/i.test(tt))return 0;}
if(/d[aă]ng/i.test(tt))return 1;if(/chu[aă]/i.test(tt))return 2;if(/ho[àa]n/i.test(tt))return 4;return 3;}
return _rDA(a)-_rDA(b);});
if (!list.length) { c.innerHTML = emptyState('Không có dự án nào phù hợp'); return; }
c.innerHTML = list.map(function (da) {
var vb     = findById(APP.vanBan, 'ID_Van_Ban', da.ID_Van_Ban_Goc);
var nvList = APP.nhiemVu.filter(function (n) { return n.ID_Du_An === da.ID_Du_An; });
var pct    = da._pctTongHop || 0;
var stCls  = /ho[àa]n/i.test(da.Trang_Thai_DA || '') ? 'badge-green'
: /d[aă]ng/i.test(da.Trang_Thai_DA || '') ? 'badge-blue' : 'badge-gray';
var ns     = findById(APP.nhanSu, 'ID_Nhan_Su', da.ID_Nguoi_Quan_Ly_DA);
return '<div class="tree-card">'
+ '<div class="tree-card-head" onclick="toggleTreeBody(\'da-body-' + da.ID_Du_An + '\')">'
+ '<div class="tree-card-icon" style="background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff"><i class="fas fa-folder-open"></i></div>'
+ '<div class="tree-card-info">'
+ '<div class="tree-card-title">' + esc(da.Ten_Du_An || da.ID_Du_An) + '</div>'
+ '<div class="tree-card-sub">'
+ (vb ? esc(vb.So_Ky_Hieu || vb.Ten_Van_Ban_Trich_Yeu || '') : esc(da.ID_Van_Ban_Goc || ''))
+ (ns ? ' &nbsp;|&nbsp; 👤 ' + esc(ns.Ho_Ten || '') : '')
+ '</div>'
+ '</div>'
+ '<span class="badge ' + stCls + '">' + esc(da.Trang_Thai_DA || '') + '</span>'
+ '<div class="progress-wrap" style="width:70px;margin:0 6px"><div class="progress-bar" style="width:' + pct + '%"></div></div>'
+ '<span style="font-size:10px;color:var(--text-muted)">' + pct + '%</span>'
+ '<i class="fas fa-chevron-right tree-chevron" id="chev-da-body-' + da.ID_Du_An + '"></i>'
+ (APP.perms.canEditDuAn
? '<div class="tree-card-actions" onclick="event.stopPropagation()">'
+ (vb && vb.Link_File_Goc ? vbLinkBtn(vb.Link_File_Goc, '<i class="fas fa-file-alt"></i> Xem VB') : '')
+ '<button class="btn btn-outline btn-sm btn-icon" onclick="editDuAn(\'' + da.ID_Du_An + '\')"><i class="fas fa-edit"></i></button>'
+ '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteDuAn(\'' + da.ID_Du_An + '\')"><i class="fas fa-trash"></i></button>'
+ '</div>'
: (vb && vb.Link_File_Goc ? '<div class="tree-card-actions" onclick="event.stopPropagation()">' + vbLinkBtn(vb.Link_File_Goc, '<i class="fas fa-file-alt"></i> Xem VB') + '</div>' : ''))
+ '</div>'
+ '<div class="tree-card-body" id="da-body-' + da.ID_Du_An + '">'
+ '<div class="tree-card-stats">'
+ '<span class="tree-stat"><i class="fas fa-tasks" style="color:#3b82f6"></i>' + nvList.length + ' nhiệm vụ</span>'
+ '<span class="tree-stat"><i class="fas fa-coins" style="color:#10b981"></i>' + fmtMoney(da._kpTongHop_GN || 0) + ' / ' + fmtMoney(da._kpTongHop_DT || 0) + '</span>'
+ (da.Ngay_Bat_Dau ? '<span class="tree-stat"><i class="fas fa-calendar"></i>' + fmtDate(da.Ngay_Bat_Dau) + ' → ' + fmtDate(da.Ngay_Ket_Thuc) + '</span>' : '')
+ '</div>'
+ (nvList.length
? '<div class="tree-children">'
+ nvList.slice(0, 5).map(function (nv) {
var pct2 = parseInt(nv.Tien_Do_Phan_Tram || 0);
var cb   = nv.Muc_Canh_Bao || '';
return taskCardHtml(nv, da, pct2, cb, true);
}).join('')
+ (nvList.length > 5 ? '<p style="font-size:11px;color:var(--text-muted);text-align:center;padding:6px">...và ' + (nvList.length - 5) + ' nhiệm vụ khác</p>' : '')
+ '</div>'
: '<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px">Chưa có nhiệm vụ</p>')
+ '</div>'
+ '</div>';
}).join('');
}
function renderNhiemVu() {
var c = el('nhiemvu-list'); if (!c) return;
var search = val('nv-search').toLowerCase();
var vbF    = val('nv-vb-filter');
var daF    = val('nv-da-filter');
var stF    = val('nv-status');
var lvF    = val('nv-linh-vuc');
var cbF    = val('nv-canh-bao');
var today  = new Date(); today.setHours(0, 0, 0, 0);
var list = APP.nhiemVu.filter(function (nv) {
if (vbF && nv.ID_Van_Ban !== vbF) return false;
if (daF && nv.ID_Du_An !== daF) return false;
if (lvF && (nv.Linh_Vuc_NQ57 || '') !== lvF) return false;
if (cbF && (nv.Muc_Canh_Bao || '') !== cbF) return false;
if (stF === 'Qua han') {
var due = nv.Han_Chot ? new Date(nv.Han_Chot) : null;
if (!due || isNaN(due)) return false;
due.setHours(0, 0, 0, 0);
if (due >= today || /ho[àa]n/i.test(nv.Trang_Thai || '')) return false;
} else if (stF) {
if (!(nv.Trang_Thai || '').toLowerCase().includes(stF.toLowerCase())) return false;
}
if (search && !(nv.Ten_Nhiem_Vu || '').toLowerCase().includes(search)
&& !(nv.ID_Nhiem_Vu  || '').toLowerCase().includes(search)) return false;
return true;
});
if (!list.length) { c.innerHTML = emptyState('Không có nhiệm vụ nào phù hợp'); return; }
list.sort(function (a, b) {
function rank(n) {
var tt  = (n.Trang_Thai || '').toLowerCase();
var due = n.Han_Chot ? new Date(n.Han_Chot) : null;
if (due && !isNaN(due)) { due.setHours(0,0,0,0); if (due < today && !/ho[àa]n/i.test(tt)) return 0; }
if (/d[aă]ng/i.test(tt)) return 1;
if (/chu[aă]/i.test(tt)) return 2;
if (/ho[àa]n/i.test(tt)) return 3;
if (/t[aạ]m/i.test(tt))  return 4;
return 2;
}
return rank(a) - rank(b);
});
c.innerHTML = list.map(function (nv) {
var da  = findById(APP.duAn, 'ID_Du_An', nv.ID_Du_An);
var pct = parseInt(nv.Tien_Do_Phan_Tram || 0);
var cb  = nv.Muc_Canh_Bao || '';
return taskCardHtml(nv, da, pct, cb, false);
}).join('');
}
function filterOverdue() {
navigateTo('nhiemvu');
el('nv-status').value = 'Qua han';
renderNhiemVu();
}
function renderTaiChinh() {
// Dùng stats từ server (đã tính đầy đủ từ cả NV + DA) cho stat cards tổng quan
var tongDT = APP.stats.tongKpDuToan || 0;
var tongGN = APP.stats.tongKpGiaiNgan || 0;
// Nếu stats không có (fallback), tính từ client
if (!tongDT && !tongGN) {
APP.duAn.forEach(function (da) { tongDT += da._kpTongHop_DT || 0; tongGN += da._kpTongHop_GN || 0; });
APP.nhiemVu.forEach(function (nv) {
if (!nv.ID_Du_An) {
tongDT += parseFloat(String(nv.Kinh_Phi_Du_Toan_NV || '').replace(/,/g, '')) || 0;
tongGN += parseFloat(String(nv.Kinh_Phi_Da_Giai_Ngan_NV || '').replace(/,/g, '')) || 0;
}
});
}
var tyLe = tongDT > 0 ? Math.round(tongGN / tongDT * 100) : 0;
el('taichinh-stats').innerHTML =
tcStatCard('Tổng dự toán', '💰', fmtMoney(tongDT), '#3b82f6') +
tcStatCard('Đã giải ngân', '✅', fmtMoney(tongGN), '#10b981') +
tcStatCard('Tỷ lệ giải ngân', '📊', tyLe + '%', tyLe >= 80 ? '#10b981' : tyLe >= 50 ? '#f59e0b' : '#ef4444') +
tcStatCard('Số dự án', '📁', APP.duAn.length, '#8b5cf6');
var tbody  = el('taichinh-tbody');
var dvMap  = {};
APP.donVi.forEach(function (d) { dvMap[d.ID_Don_Vi] = d.Ten_Don_Vi || d.ID_Don_Vi; });
var rows = APP.duAn.filter(function (da) {
var dt = (da._kpTongHop_DT || 0) || (parseFloat(String(da.Kinh_Phi_Du_Toan_DA || '').replace(/,/g, '')) || 0);
var gn = (da._kpTongHop_GN || 0) || (parseFloat(String(da.Kinh_Phi_Da_Giai_Ngan_DA || '').replace(/,/g, '')) || 0);
return dt > 0 || gn > 0;
});
if (!rows.length) {
tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Chưa có dữ liệu tài chính</td></tr>';
} else {
tbody.innerHTML = rows.map(function (da) {
var vb = findById(APP.vanBan, 'ID_Van_Ban', da.ID_Van_Ban_Goc);
var tl = da._tyLeGiaiNgan || 0;
var barColor = tl >= 100 ? 'green' : tl < 30 ? 'red' : '';
return '<tr>'
+ '<td><strong>' + esc(da.Ten_Du_An || da.ID_Du_An) + '</strong></td>'
+ '<td style="font-size:11px">' + esc(vb ? vb.So_Ky_Hieu || vb.Ten_Van_Ban_Trich_Yeu || '' : da.ID_Van_Ban_Goc || '') + '</td>'
+ '<td>' + esc(dvMap[da.ID_Don_Vi_Chu_Tri] || da.ID_Don_Vi_Chu_Tri || '') + '</td>'
+ '<td style="text-align:right">' + fmtMoney(da._kpTongHop_DT || 0) + '</td>'
+ '<td style="text-align:right;color:#10b981">' + fmtMoney(da._kpTongHop_GN || 0) + '</td>'
+ '<td><div class="kp-bar-wrap"><div class="progress-wrap" style="width:80px"><div class="progress-bar ' + barColor + '" style="width:' + tl + '%"></div></div><span>' + tl + '%</span></div></td>'
+ '<td>' + statusBadge(da.Trang_Thai_DA || '') + '</td>'
+ '</tr>';
}).join('');
}
renderGiaiNganChart(rows);
}
function tcStatCard(label, icon, value, color) {
return '<div class="tc-stat">'
+ '<div class="tc-stat-lbl">' + icon + ' ' + label + '</div>'
+ '<div class="tc-stat-val" style="color:' + color + '">' + value + '</div>'
+ '</div>';
}
function renderGiaiNganChart(rows) {
destroyChart('giaiNganChart');
var labels = rows.slice(0, 8).map(function (da) { return (da.Ten_Du_An || '').substring(0, 20); });
var dtData = rows.slice(0, 8).map(function (da) { return Math.round((da._kpTongHop_DT || 0) * 10) / 10; });
var gnData = rows.slice(0, 8).map(function (da) { return Math.round((da._kpTongHop_GN || 0) * 10) / 10; });
if (!labels.length) return;
APP.charts.giaiNgan = new Chart(el('giaiNganChart'), {
type: 'bar',
data: {
labels: labels,
datasets: [
{ label: 'Dự toán (Trđ)', data: dtData, backgroundColor: 'rgba(59,130,246,.5)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 4 },
{ label: 'Giải ngân (Trđ)', data: gnData, backgroundColor: 'rgba(16,185,129,.7)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 }
]
},
options: {
responsive: true, maintainAspectRatio: false,
plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
scales: {
y: { beginAtZero: true, ticks: { font: { size: 10 } } },
x: { ticks: { font: { size: 10 } } }
}
}
});
}
function renderDonVi() {
var c = el('donvi-list'); if (!c) return;
var search = val('dv-search').toLowerCase();
var list   = APP.donVi.filter(function (dv) {
return !search || (dv.Ten_Don_Vi || '').toLowerCase().includes(search);
});
if (!list.length) { c.innerHTML = emptyState('Không có đơn vị nào'); return; }
c.innerHTML = list.map(function (dv) {
var nvCount = APP.nhiemVu.filter(function (n) { return n.ID_Don_Vi_Chu_Tri === dv.ID_Don_Vi; }).length;
var truong  = findById(APP.nhanSu, 'ID_Nhan_Su', dv.ID_Truong_Don_Vi);
return '<div class="task-card border-blue">'
+ '<div class="task-card-head">'
+ '<div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#7c3aed,#5b21b6);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-building" style="color:#fff;font-size:14px"></i></div>'
+ '<div style="flex:1;min-width:0">'
+ '<div style="font-size:14px;font-weight:700">' + esc(dv.Ten_Don_Vi || '') + '</div>'
+ '<div style="font-size:11px;color:var(--text-secondary)">ID: ' + esc(dv.ID_Don_Vi || '')
+ (truong ? ' &nbsp;|&nbsp; Trưởng: ' + esc(truong.Ho_Ten || '') : '') + '</div>'
+ '</div>'
+ '<span class="badge badge-blue">' + nvCount + ' NV</span>'
+ '</div>'
+ (APP.perms.canManageDonVi
? '<div class="task-card-actions">'
+ '<button class="btn btn-outline btn-sm" onclick="editDonVi(\'' + dv.ID_Don_Vi + '\')"><i class="fas fa-edit"></i>Sửa</button>'
+ '<button class="btn btn-danger btn-sm" onclick="deleteDonVi(\'' + dv.ID_Don_Vi + '\')"><i class="fas fa-trash"></i>Xóa</button>'
+ '</div>' : '')
+ '</div>';
}).join('');
}
function renderNhanSu() {
var c = el('nhansu-list'); if (!c) return;
var search  = val('ns-search').toLowerCase();
var dvF     = val('ns-dv-filter');
var roleF   = val('ns-role-filter');
var dvMap   = {};
APP.donVi.forEach(function (d) { dvMap[d.ID_Don_Vi] = d.Ten_Don_Vi || d.ID_Don_Vi; });
var list = APP.nhanSu.filter(function (ns) {
if (dvF && ns.ID_Don_Vi !== dvF) return false;
if (roleF && !(ns.Phan_Quyen || '').includes(roleF)) return false;
if (search && !(ns.Ho_Ten || '').toLowerCase().includes(search)
&& !(ns.Email  || '').toLowerCase().includes(search)) return false;
return true;
});
if (!list.length) { c.innerHTML = emptyState('Không có nhân sự nào'); return; }
var roleColor = { Admin:'red', 'Quan Ly':'purple', 'Nhan Vien':'gray' };
c.innerHTML = list.map(function (ns) {
var roleCls = roleColor[ns.Phan_Quyen] || 'gray';
var nvCount = APP.nhiemVu.filter(function (n) { return n.ID_Nguoi_Thuc_Hien === ns.ID_Nhan_Su; }).length;
return '<div class="task-card border-blue">'
+ '<div class="task-card-head">'
+ '<div class="avatar" style="width:38px;height:38px;font-size:15px;flex-shrink:0">' + esc((ns.Ho_Ten || '?').charAt(0).toUpperCase()) + '</div>'
+ '<div style="flex:1;min-width:0">'
+ '<div style="font-size:13px;font-weight:700">' + esc(ns.Ho_Ten || '') + '</div>'
+ '<div style="font-size:11px;color:var(--text-secondary)">'
+ esc(ns.Chuc_Vu || '') + ' &nbsp;|&nbsp; ' + esc(dvMap[ns.ID_Don_Vi] || ns.ID_Don_Vi || '')
+ (ns.Email ? ' &nbsp;|&nbsp; ' + esc(ns.Email) : '') + '</div>'
+ '</div>'
+ '<span class="badge badge-' + roleCls + '">' + esc(ns.Phan_Quyen || '') + '</span>'
+ '<span class="badge badge-blue" style="margin-left:4px">' + nvCount + ' NV</span>'
+ '</div>'
+ ((APP.perms.canManageStaff || (APP.perms.isManager && ns.ID_Don_Vi === APP.user.deptId))
? '<div class="task-card-actions">'
+ '<button class="btn btn-outline btn-sm" onclick="editNhanSu(\'' + ns.ID_Nhan_Su + '\')"><i class="fas fa-edit"></i>Sửa</button>'
+ (APP.perms.canManageStaff ? '<button class="btn btn-danger btn-sm" onclick="deleteNhanSu(\'' + ns.ID_Nhan_Su + '\')"><i class="fas fa-trash"></i>Xóa</button>' : '')
+ '</div>' : '')
+ '</div>';
}).join('');
}
function openModal(type, prefill) {
APP.modalType = type;
APP.editId    = null;
var cfg = getModalConfig(type, prefill || {});
el('modal-title').textContent = cfg.title;
el('modal-body').innerHTML    = cfg.body;
el('modal-overlay').classList.add('active');
APP._modalSubmitFn = cfg.submit;
setTimeout(function () {
var first = el('modal-body').querySelector('input,select,textarea');
if (first) first.focus();
}, 100);
}
function closeModal() {
el('modal-overlay').classList.remove('active');
APP.modalType = null; APP.editId = null;
}
function handleOverlayClick(e) {
if (e.target === el('modal-overlay')) closeModal();
}
function submitModal() {
if (APP._modalSubmitFn) APP._modalSubmitFn();
}
function getModalConfig(type, data) {
data = data || {};
switch (type) {
case 'vanban':    return modalVanBan(data);
case 'duan':      return modalDuAn(data);
case 'nhiemvu':   return modalNhiemVu(data);
case 'baocao':    return modalBaoCao(data);
case 'muctieu':   return modalMucTieu(data);
case 'donvi':     return modalDonVi(data);
case 'nhansu':    return modalNhanSu(data);
case 'futuretask':return modalFutureTask(data);
default: return { title: 'Modal', body: '', submit: function(){} };
}
}
function modalVanBan(d) {
var dvOpts = APP.donVi.map(function (dv) {
return '<option value="' + esc(dv.ID_Don_Vi) + '" '
+ (d.chuTriId === dv.ID_Don_Vi ? 'selected' : '') + '>'
+ esc(dv.Ten_Don_Vi || dv.ID_Don_Vi) + '</option>';
}).join('');
var nsOpts = APP.nhanSu.map(function (ns) {
return '<option value="' + esc(ns.ID_Nhan_Su) + '" '
+ (d.nguoiTheoDoiId === ns.ID_Nhan_Su ? 'selected' : '') + '>'
+ esc(ns.Ho_Ten || ns.ID_Nhan_Su) + '</option>';
}).join('');
var body = formRow(
formGroup('Loại văn bản *', '<select id="f-vb-loai" class="form-select">'
+ opt('Nghi quyet',   'Nghị quyết',    d.loai)
+ opt('Chi thi',      'Chỉ thị',       d.loai)
+ opt('Ke hoach',     'Kế hoạch',      d.loai)
+ opt('Quyet dinh',   'Quyết định',    d.loai)
+ opt('Cong van',     'Công văn',      d.loai)
+ opt('Thong bao KL', 'Thông báo KL',  d.loai)
+ opt('Bao cao',      'Báo cáo',       d.loai)
+ opt('Giay moi',     'Giấy mời',      d.loai)
+ '</select>'),
formGroup('Cấp ban hành *', '<select id="f-vb-cap" class="form-select">'
+ opt('TW',   'Trung ương', d.cap)
+ opt('Tinh', 'Tỉnh',      d.cap)
+ opt('Xa',   'Xã',        d.cap)
+ '</select>')
) + formRow(
formGroup('Số/Ký hiệu', '<input id="f-vb-so" class="form-input" value="' + esc(d.so||'') + '" placeholder="02-KH/BCĐTW">'),
formGroup('Ngày ban hành', '<input id="f-vb-ngay" type="date" class="form-input" value="' + esc(d.ngay||'') + '">')
) + formGroup('Tên văn bản / Trích yếu *',
'<textarea id="f-vb-ten" class="form-textarea" rows="2" placeholder="Tên đầy đủ hoặc trích yếu nội dung...">' + esc(d.ten||'') + '</textarea>')
+ formRow(
formGroup('Đơn vị chủ trì', '<select id="f-vb-chu-tri" class="form-select"><option value="">-- Chọn đơn vị --</option>' + dvOpts + '</select>'),
formGroup('Người theo dõi chính', '<select id="f-vb-nguoi-td" class="form-select"><option value="">-- Chọn nhân sự --</option>' + nsOpts + '</select>')
) + formGroup('Link file gốc', '<input id="f-vb-link" class="form-input" value="' + esc(d.link||'') + '" placeholder="https://drive.google.com/...">');
return {
title: d.id ? 'Cập nhật văn bản' : 'Thêm văn bản mới',
body: body,
submit: function () {
var payload = {
loai:           val('f-vb-loai'),
cap:            val('f-vb-cap'),
so:             val('f-vb-so'),
ngay:           val('f-vb-ngay'),
ten:            val('f-vb-ten'),
chuTriId:       val('f-vb-chu-tri'),
nguoiTheoDoiId: val('f-vb-nguoi-td'),   // ← trường mới
link:           val('f-vb-link')
};
if (!payload.ten) return toast('Vui lòng nhập tên văn bản', 'warning');
showLoading('Đang lưu...');
if (d.id) {
gs('updateVanBanWithAuth', [APP.token, d.id, payload], afterSave);
} else {
gs('addVanBanWithAuth', [APP.token, payload], afterSave);
}
}
};
}
function modalDuAn(d) {
var vbOpts = APP.vanBan.map(function (vb) {
return '<option value="' + esc(vb.ID_Van_Ban) + '" ' + (d.vanBanId === vb.ID_Van_Ban ? 'selected':'') + '>' + esc(vb.So_Ky_Hieu || vb.Ten_Van_Ban_Trich_Yeu || vb.ID_Van_Ban) + '</option>';
}).join('');
var dvOpts = APP.donVi.map(function (dv) {
return '<option value="' + esc(dv.ID_Don_Vi) + '" ' + (d.chuTriId === dv.ID_Don_Vi ? 'selected':'') + '>' + esc(dv.Ten_Don_Vi||dv.ID_Don_Vi) + '</option>';
}).join('');
var nsOpts = APP.nhanSu.map(function (ns) {
return '<option value="' + esc(ns.ID_Nhan_Su) + '" ' + (d.quanLyId === ns.ID_Nhan_Su ? 'selected':'') + '>' + esc(ns.Ho_Ten||ns.ID_Nhan_Su) + '</option>';
}).join('');
var vbLink = d.vanBanId ? (function(){ var vb = findById(APP.vanBan,'ID_Van_Ban',d.vanBanId); return vb&&vb.Link_File_Goc ? vb.Link_File_Goc : ''; })() : '';
var body = formGroup('Văn bản gốc',
'<div style="display:flex;gap:6px;align-items:center"><select id="f-da-vb" class="form-select" style="flex:1" onchange="updateVanBanLink()">' +
'<option value="">-- Liên kết văn bản --</option>' + vbOpts + '</select>' +
'<a id="f-da-vb-link" href="' + esc(vbLink) + '" target="_blank" class="btn btn-outline btn-sm" style="white-space:nowrap;' + (vbLink?'':'display:none') + '"><i class="fas fa-external-link-alt"></i> Xem VB</a>' +
'</div>')
+ formGroup('Tên dự án *',
'<input id="f-da-ten" class="form-input" value="' + esc(d.ten||'') + '" placeholder="Tên dự án...">',
true)
+ formGroup('Mô tả',
'<textarea id="f-da-mo-ta" class="form-textarea" rows="2">' + esc(d.moTa||'') + '</textarea>')
+ formRow(
formGroup('Đơn vị chủ trì *', '<select id="f-da-chu-tri" class="form-select"><option value="">-- Chọn --</option>' + dvOpts + '</select>'),
formGroup('Đơn vị phối hợp', (function(){
var pIds=(d.phoiHopId||'').toString().split(',').map(function(x){return x.trim();}).filter(Boolean);
var opts=APP.donVi.map(function(dv){
var sel=pIds.indexOf(dv.ID_Don_Vi)!==-1?'selected':'';
return '<option value="'+esc(dv.ID_Don_Vi)+'" '+sel+'>'+esc(dv.Ten_Don_Vi||dv.ID_Don_Vi)+'</option>';
}).join('');
return '<select id="f-da-phoi-hop" class="form-select" multiple size="4" style="height:auto;min-height:80px"><option value="">-- Không chọn --</option>'+opts+'</select>'
+'<p style="font-size:11px;color:var(--text-secondary);margin-top:3px"><i class="fas fa-info-circle"></i> Giữ Ctrl để chọn nhiều đơn vị</p>';
})())
) + formGroup('Quản lý dự án',
'<select id="f-da-quan-ly" class="form-select"><option value="">-- Chọn --</option>' + nsOpts + '</select>')
+ formRow(
formGroup('Ngày bắt đầu', '<input id="f-da-ngay-bd" type="date" class="form-input" value="' + esc(d.ngayBatDau||'') + '">'),
formGroup('Ngày kết thúc', '<input id="f-da-ngay-kt" type="date" class="form-input" value="' + esc(d.ngayKetThuc||'') + '">')
) + formRow(
formGroup('Kinh phí dự toán (Trđ)', '<input id="f-da-kp-dt" class="form-input" value="' + esc(d.kpDuToan||'') + '" placeholder="0">'),
formGroup('Đã giải ngân (Trđ)', '<input id="f-da-kp-gn" class="form-input" value="' + esc(d.kpGiaiNgan||'') + '" placeholder="0">')
) + formGroup('Trạng thái',
'<select id="f-da-tt" class="form-select">'
+ opt('Chua bat dau','Chưa bắt đầu',d.trangThai) + opt('Dang thuc hien','Đang thực hiện',d.trangThai)
+ opt('Hoan thanh','Hoàn thành',d.trangThai) + opt('Tam dung','Tạm dừng',d.trangThai) + '</select>');
return {
title: d.id ? 'Cập nhật dự án' : 'Thêm dự án mới',
body: body,
submit: function () {
var payload = {
vanBanId: val('f-da-vb'), ten: val('f-da-ten'), moTa: val('f-da-mo-ta'),
chuTriId: val('f-da-chu-tri'), phoiHopId: (function(){
var sel=document.getElementById('f-da-phoi-hop');
if(!sel) return '';
var vals=[];
for(var i=0;i<sel.options.length;i++){
if(sel.options[i].selected&&sel.options[i].value)vals.push(sel.options[i].value);
}
return vals.join(',');
})(),
quanLyId: val('f-da-quan-ly'), ngayBatDau: val('f-da-ngay-bd'),
ngayKetThuc: val('f-da-ngay-kt'), trangThai: val('f-da-tt'),
kpDuToan: val('f-da-kp-dt'), kpGiaiNgan: val('f-da-kp-gn')
};
if (!payload.ten) return toast('Vui lòng nhập tên dự án', 'warning');
showLoading('Đang lưu...');
if (d.id) gs('updateDuAnWithAuth', [APP.token, d.id, payload], afterSave);
else      gs('addDuAnWithAuth',    [APP.token, payload],        afterSave);
}
};
}
function modalNhiemVu(d) {
var daOpts = APP.duAn.map(function (da) {
return '<option value="' + esc(da.ID_Du_An) + '" ' + (d.duAnId === da.ID_Du_An ? 'selected':'') + '>' + esc(da.Ten_Du_An||da.ID_Du_An) + '</option>';
}).join('');
var vbOpts = APP.vanBan.map(function (vb) {
return '<option value="' + esc(vb.ID_Van_Ban) + '" ' + (d.vanBanId === vb.ID_Van_Ban ? 'selected':'') + '>' + esc((vb.So_Ky_Hieu ? vb.So_Ky_Hieu + ' — ' : '') + (vb.Ten_Van_Ban_Trich_Yeu||vb.ID_Van_Ban)) + '</option>';
}).join('');
var dvOpts = APP.donVi.map(function (dv) {
return '<option value="' + esc(dv.ID_Don_Vi) + '" ' + (d.chuTriId === dv.ID_Don_Vi ? 'selected' : ((!d.chuTriId && dv.ID_Don_Vi === APP.user.deptId) ? 'selected' : '')) + '>' + esc(dv.Ten_Don_Vi||dv.ID_Don_Vi) + '</option>';
}).join('');
var nsOpts = APP.nhanSu.map(function (ns) {
return '<option value="' + esc(ns.ID_Nhan_Su) + '" ' + (d.thucHienId === ns.ID_Nhan_Su ? 'selected' : ((!d.thucHienId && ns.ID_Nhan_Su === APP.user.id) ? 'selected' : '')) + '>' + esc(ns.Ho_Ten||ns.ID_Nhan_Su) + '</option>';
}).join('');
var lvList = [...new Set(APP.nhiemVu.map(function(n){ return n.Linh_Vuc_NQ57; }).filter(Boolean))];
var lvOpts = lvList.map(function(lv){ return '<option value="'+esc(lv)+'" '+(d.linhVuc===lv?'selected':'')+'>'+esc(lv)+'</option>'; }).join('');
// Link VB hiện tại từ ID_Van_Ban của NV
var nvVbLink = d.vanBanId ? getVbLink(d.vanBanId) : '';
// Link VB từ dự án (fallback nếu NV chưa chọn VB riêng)
var nvDaLink = d.duAnId ? (function(){
var da2 = findById(APP.duAn,'ID_Du_An',d.duAnId);
if (!da2) return '';
var vb2 = findById(APP.vanBan,'ID_Van_Ban',da2.ID_Van_Ban_Goc);
return vb2&&vb2.Link_File_Goc ? vb2.Link_File_Goc : '';
})() : '';
var isAdmin = APP.perms.isAdmin, isMgr = APP.perms.isManager;
var isFullEdit = isAdmin || isMgr;
var body = '';
if (isFullEdit) {
// Chọn Văn bản trực tiếp cho NV
body += formGroup('Văn bản liên quan',
'<div style="display:flex;gap:6px;align-items:center">' +
'<select id="f-nv-vb" class="form-select" style="flex:1" onchange="updateNvDirectVbLink()">' +
'<option value="">-- Chọn văn bản (nếu có) --</option>' + vbOpts + '</select>' +
'<a id="f-nv-direct-vb-link" href="' + esc(nvVbLink) + '" target="_blank" class="btn btn-outline btn-sm btn-icon" style="flex-shrink:0;' + (nvVbLink?'':'display:none') + '" title="Xem văn bản"><i class="fas fa-external-link-alt"></i></a>' +
'</div>');
body += formGroup('Dự án',
'<div style="display:flex;gap:6px;align-items:center">' +
'<select id="f-nv-da" class="form-select" style="flex:1" onchange="updateNvVanBanLink()">' +
'<option value="">-- Chọn dự án --</option>' + daOpts + '</select>' +
'<a id="f-nv-vb-link" href="' + esc(nvDaLink) + '" target="_blank" class="btn btn-outline btn-sm btn-icon" style="flex-shrink:0;' + (nvDaLink?'':'display:none') + '" title="Xem VB của dự án"><i class="fas fa-folder-open"></i></a>' +
'</div>');
body += formRow(
formGroup('Đơn vị chủ trì *', '<select id="f-nv-chu-tri" class="form-select"><option value="">-- Chọn --</option>' + dvOpts + '</select>'),
formGroup('Đơn vị phối hợp', (function(){
var pIds=(d.phoiHopId||'').toString().split(',').map(function(x){return x.trim();}).filter(Boolean);
var opts=APP.donVi.map(function(dv){
var sel=pIds.indexOf(dv.ID_Don_Vi)!==-1?'selected':'';
return '<option value="'+esc(dv.ID_Don_Vi)+'" '+sel+'>'+esc(dv.Ten_Don_Vi||dv.ID_Don_Vi)+'</option>';
}).join('');
return '<select id="f-nv-phoi-hop" class="form-select" multiple size="4" style="height:auto;min-height:80px"><option value="">-- Không chọn --</option>'+opts+'</select>'
+'<p style="font-size:11px;color:var(--text-secondary);margin-top:3px"><i class="fas fa-info-circle"></i> Giữ Ctrl để chọn nhiều đơn vị</p>';
})())
);
}
body += formGroup('Tên nhiệm vụ *',
'<input id="f-nv-ten" class="form-input" value="' + esc(d.ten||'') + '" placeholder="Tên nhiệm vụ..." ' + (isFullEdit?'':'readonly') + '>');
if (isFullEdit) {
body += formGroup('Mô tả chi tiết', '<textarea id="f-nv-mo-ta" class="form-textarea" rows="2">' + esc(d.moTa||'') + '</textarea>');
body += formGroup('Lĩnh vực NQ57',
'<select id="f-nv-linh-vuc" class="form-select"><option value="">-- Chọn lĩnh vực --</option>' + lvOpts + '</select>');
}
body += formRow(
formGroup('Người thực hiện', '<select id="f-nv-thuc-hien" class="form-select"><option value="">-- Chọn --</option>' + nsOpts + '</select>'),
formGroup('Ưu tiên', '<select id="f-nv-uu-tien" class="form-select">'
+ opt('Thap','Thấp',d.uuTien) + opt('Trung binh','Trung bình',d.uuTien) + opt('Cao','Cao',d.uuTien) + '</select>')
);
body += formRow(
formGroup('Ngày bắt đầu', '<input id="f-nv-ngay-bd" type="date" class="form-input" value="' + esc(d.ngayBatDau||'') + '">'),
formGroup('Hạn chót', '<input id="f-nv-han-chot" type="date" class="form-input" value="' + esc(d.hanChot||'') + '">')
);
body += formRow(
formGroup('Tiến độ (%)', '<input id="f-nv-tien-do" type="number" min="0" max="100" class="form-input" value="' + esc(d.tienDo||'0') + '">'),
formGroup('Trạng thái', '<select id="f-nv-tt" class="form-select">'
+ opt('Chua bat dau','Chưa bắt đầu',d.trangThai) + opt('Dang thuc hien','Đang thực hiện',d.trangThai)
+ opt('Hoan thanh','Hoàn thành',d.trangThai) + opt('Tam dung','Tạm dừng',d.trangThai) + '</select>')
);
if (isFullEdit) {
body += formRow(
formGroup('Kinh phí dự toán (Trđ)', '<input id="f-nv-kp-dt" class="form-input" value="' + esc(d.kpDuToan||'') + '" placeholder="0">'),
formGroup('Đã giải ngân (Trđ)', '<input id="f-nv-kp-gn" class="form-input" value="' + esc(d.kpGiaiNgan||'') + '" placeholder="0">')
);
}
body += formGroup('Link minh chứng',
'<input id="f-nv-minh-chung" class="form-input" value="' + esc(d.minhChung||'') + '" placeholder="https://...">');
return {
title: d.id ? 'Cập nhật nhiệm vụ' : 'Thêm nhiệm vụ mới',
body: body,
submit: function () {
var payload = {
vanBanId: isFullEdit ? val('f-nv-vb') : (d.vanBanId||''),
duAnId: isFullEdit ? val('f-nv-da') : (d.duAnId||''),
chuTriId: isFullEdit ? val('f-nv-chu-tri') : APP.user.deptId,
phoiHopId: isFullEdit ? (function(){
var sel=document.getElementById('f-nv-phoi-hop');
if(!sel) return '';
var vals=[];
for(var i=0;i<sel.options.length;i++){
if(sel.options[i].selected&&sel.options[i].value)vals.push(sel.options[i].value);
}
return vals.join(',');
})() : '',
linhVuc: isFullEdit ? val('f-nv-linh-vuc') : (d.linhVuc||''),
ten: val('f-nv-ten'), moTa: isFullEdit ? val('f-nv-mo-ta') : (d.moTa||''),
thucHienId: val('f-nv-thuc-hien'), uuTien: val('f-nv-uu-tien'),
ngayBatDau: val('f-nv-ngay-bd'), hanChot: val('f-nv-han-chot'),
tienDo: val('f-nv-tien-do'), trangThai: val('f-nv-tt'),
kpDuToan: isFullEdit ? val('f-nv-kp-dt') : (d.kpDuToan||0),
kpGiaiNgan: val('f-nv-kp-gn')||d.kpGiaiNgan||0,
minhChung: val('f-nv-minh-chung')
};
if (!payload.ten) return toast('Vui lòng nhập tên nhiệm vụ', 'warning');
showLoading('Đang lưu...');
if (d.id) gs('updateNhiemVuWithAuth', [APP.token, d.id, payload], afterSave);
else      gs('addNhiemVuWithAuth',    [APP.token, payload],        afterSave);
}
};
}
function modalDonVi(d) {
var nsOpts = APP.nhanSu.map(function (ns) {
return '<option value="' + esc(ns.ID_Nhan_Su) + '" ' + (d.truongId === ns.ID_Nhan_Su ? 'selected':'') + '>' + esc(ns.Ho_Ten||'') + '</option>';
}).join('');
var body = formGroup('Tên đơn vị *', '<input id="f-dv-ten" class="form-input" value="' + esc(d.ten||'') + '" placeholder="Tên đơn vị...">')
+ formGroup('Trưởng đơn vị', '<select id="f-dv-truong" class="form-select"><option value="">-- Chọn --</option>' + nsOpts + '</select>');
return {
title: d.id ? 'Cập nhật đơn vị' : 'Thêm đơn vị mới',
body: body,
submit: function () {
var payload = { ten: val('f-dv-ten'), truongId: val('f-dv-truong') };
if (!payload.ten) return toast('Vui lòng nhập tên đơn vị', 'warning');
showLoading('Đang lưu...');
if (d.id) gs('updateDonViWithAuth', [APP.token, d.id, payload], afterSave);
else      gs('addDonViWithAuth',    [APP.token, payload],        afterSave);
}
};
}
function modalNhanSu(d) {
var dvOpts = APP.donVi.map(function (dv) {
return '<option value="' + esc(dv.ID_Don_Vi) + '" ' + (d.donViId === dv.ID_Don_Vi ? 'selected':'') + '>' + esc(dv.Ten_Don_Vi||dv.ID_Don_Vi) + '</option>';
}).join('');
var isAdmin2 = APP.perms.isAdmin;
var isMgrMode = APP.perms.isManager && !isAdmin2;
// Quản lý chỉ thêm NV cho đơn vị mình, không đổi được sang Admin/Quản lý
var dvOptsFiltered = isAdmin2 ? dvOpts : APP.donVi.filter(function(dv){return dv.ID_Don_Vi===APP.user.deptId;}).map(function(dv){return '<option value="'+esc(dv.ID_Don_Vi)+'" selected>'+esc(dv.Ten_Don_Vi||dv.ID_Don_Vi)+'</option>';}).join('');
var pqOpts = isAdmin2
? opt('Nhan Vien','Nhân viên',d.phanQuyen) + opt('Quan Ly','Quản lý',d.phanQuyen) + opt('Admin','Admin',d.phanQuyen)
: opt('Nhan Vien','Nhân viên',d.phanQuyen);
var body = formRow(
formGroup('Họ tên *', '<input id="f-ns-ten" class="form-input" value="' + esc(d.hoTen||'') + '">'),
formGroup('Chức vụ', '<input id="f-ns-cv" class="form-input" value="' + esc(d.chucVu||'') + '">')
) + formRow(
formGroup('Email *', '<input id="f-ns-email" type="email" class="form-input" value="' + esc(d.email||'') + '">'),
formGroup('Số điện thoại', '<input id="f-ns-sdt" class="form-input" value="' + esc(d.sdt||'') + '">')
) + formGroup('Đơn vị',
isMgrMode
? '<select id="f-ns-dv" class="form-select" disabled>' + dvOptsFiltered + '</select><p style="font-size:11px;color:var(--text-secondary);margin-top:3px"><i class="fas fa-lock"></i> Chỉ thêm nhân viên cho đơn vị của bạn</p>'
: '<select id="f-ns-dv" class="form-select"><option value="">-- Chọn đơn vị --</option>' + dvOpts + '</select>'
) + formRow(
formGroup('Phân quyền', '<select id="f-ns-pq" class="form-select">' + pqOpts + '</select>'),
formGroup('Mật khẩu', '<input id="f-ns-mk" type="password" class="form-input" placeholder="' + (d.id?'(để trống = không đổi)':'Mật khẩu...') + '">')
);
return {
title: d.id ? 'Cập nhật nhân sự' : 'Thêm nhân sự mới',
body: body,
submit: function () {
var _dvVal = val('f-ns-dv') || APP.user.deptId;
var _pqVal = val('f-ns-pq');
// Quản lý không được đặt quyền cao hơn Nhân viên
if(!APP.perms.isAdmin && _pqVal !== 'Nhan Vien') _pqVal = 'Nhan Vien';
var payload = {
hoTen: val('f-ns-ten'), chucVu: val('f-ns-cv'),
email: val('f-ns-email'), sdt: val('f-ns-sdt'),
donViId: _dvVal, phanQuyen: _pqVal,
matKhau: val('f-ns-mk')
};
if (!payload.hoTen) return toast('Vui lòng nhập họ tên', 'warning');
if (!payload.email) return toast('Vui lòng nhập email', 'warning');
showLoading('Đang lưu...');
if (d.id) gs('updateNhanSuWithAuth', [APP.token, d.id, payload], afterSave);
else      gs('addNhanSuWithAuth',    [APP.token, payload],        afterSave);
}
};
}
function afterSave(res) {
hideLoading();
if (res.success) {
toast('Đã lưu thành công!', 'success');
closeModal();
loadData(true);
} else {
toast('Lỗi: ' + (res.error || 'Không xác định'), 'error');
}
}
function editVanBan(id) {
var vb = findById(APP.vanBan, 'ID_Van_Ban', id); if (!vb) return;
openModal('vanban', {
id:             id,
loai:           vb.Loai_Van_Ban,
cap:            vb.Cap_Ban_Hanh,
so:             vb.So_Ky_Hieu,
ngay:           vb.Ngay_Ban_Hanh,
ten:            vb.Ten_Van_Ban_Trich_Yeu,
chuTriId:       vb.ID_Don_Vi_Chu_Tri,
nguoiTheoDoiId: vb.ID_Nguoi_Theo_Doi_Chinh,
link:           vb.Link_File_Goc
});
}
function editDuAn(id) {
var da = findById(APP.duAn, 'ID_Du_An', id); if (!da) return;
openModal('duan', { id:id, vanBanId:da.ID_Van_Ban_Goc, ten:da.Ten_Du_An, moTa:da.Mo_Ta_Du_An,
chuTriId:da.ID_Don_Vi_Chu_Tri, phoiHopId:da.ID_Don_Vi_Phoi_Hop, quanLyId:da.ID_Nguoi_Quan_Ly_DA,
ngayBatDau:da.Ngay_Bat_Dau, ngayKetThuc:da.Ngay_Ket_Thuc, trangThai:da.Trang_Thai_DA,
kpDuToan:da.Kinh_Phi_Du_Toan_DA, kpGiaiNgan:da.Kinh_Phi_Da_Giai_Ngan_DA });
}
function editNhiemVu(id) {
var nv = findById(APP.nhiemVu, 'ID_Nhiem_Vu', id); if (!nv) return;
openModal('nhiemvu', { id:id, duAnId:nv.ID_Du_An, chuTriId:nv.ID_Don_Vi_Chu_Tri,
phoiHopId:nv.ID_Don_Vi_Phoi_Hop, linhVuc:nv.Linh_Vuc_NQ57, ten:nv.Ten_Nhiem_Vu,
moTa:nv.Mo_Ta_Chi_Tiet, thucHienId:nv.ID_Nguoi_Thuc_Hien, quanLyId:nv.ID_Nguoi_Quan_Ly_Truoc_Tiep,
uuTien:nv.Uu_Tien, ngayBatDau:nv.Ngay_Bat_Dau, hanChot:nv.Han_Chot,
tienDo:nv.Tien_Do_Phan_Tram, trangThai:nv.Trang_Thai,
kpDuToan:nv.Kinh_Phi_Du_Toan_NV, kpGiaiNgan:nv.Kinh_Phi_Da_Giai_Ngan_NV,
minhChung:nv.Link_Minh_Chung });
}
function editDonVi(id) {
var dv = findById(APP.donVi, 'ID_Don_Vi', id); if (!dv) return;
openModal('donvi', { id:id, ten:dv.Ten_Don_Vi, truongId:dv.ID_Truong_Don_Vi });
}
function editNhanSu(id) {
var ns = findById(APP.nhanSu, 'ID_Nhan_Su', id); if (!ns) return;
openModal('nhansu', { id:id, hoTen:ns.Ho_Ten, chucVu:ns.Chuc_Vu, email:ns.Email,
sdt:ns.So_Dien_Thoai, donViId:ns.ID_Don_Vi, phanQuyen:ns.Phan_Quyen });
}
function deleteVanBan(id) {
if (!confirm('Xóa văn bản này? Lưu ý: các dự án liên kết sẽ mất liên kết.')) return;
gs('deleteVanBanWithAuth', [APP.token, id], afterSave);
}
function deleteDuAn(id) {
if (!confirm('Xóa dự án này?')) return;
gs('deleteDuAnWithAuth', [APP.token, id], afterSave);
}
function deleteNhiemVu(id) {
if (!confirm('Xóa nhiệm vụ này?')) return;
gs('deleteNhiemVuWithAuth', [APP.token, id], afterSave);
}
function deleteDonVi(id) {
if (!confirm('Xóa đơn vị này?')) return;
gs('deleteDonViWithAuth', [APP.token, id], afterSave);
}
function deleteNhanSu(id) {
if (!confirm('Xóa nhân sự này?')) return;
gs('deleteNhanSuWithAuth', [APP.token, id], afterSave);
}
function formGroup(label, inputHtml, required) {
return '<div class="form-group"><label class="form-label">' + label + (required ? ' <span style="color:#ef4444">*</span>' : '') + '</label>' + inputHtml + '</div>';
}
function formRow(a, b) {
return '<div class="form-row">' + a + b + '</div>';
}
function opt(value, label, selected) {
return '<option value="' + esc(value) + '" ' + (selected === value ? 'selected' : '') + '>' + esc(label) + '</option>';
}
function generateReport() {
var btn = el('report-btn');
if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...'; }
gs('taoBaoCaoTuanWithAuth', [APP.token], function (res) {
if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-word"></i> Tạo báo cáo tuần (.docx)'; }
var r = el('report-result');
if (res.success) {
// Tự động download file Word về máy
try {
var byteChars = atob(res.base64);
var byteArr = new Uint8Array(byteChars.length);
for (var i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
var blob = new Blob([byteArr], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
var url = URL.createObjectURL(blob);
var a = document.createElement('a');
a.href = url; a.download = res.fileName || (res.docTitle + '.docx');
document.body.appendChild(a); a.click();
setTimeout(function(){ URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
} catch(e) { console.error('Download error:', e); }
if (r) {
r.style.display = 'block';
r.innerHTML = '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px">'
+ '<p style="font-weight:700;color:#15803d;margin-bottom:4px">✅ Tạo báo cáo thành công!</p>'
+ '<p style="font-size:13px;color:#166534"><i class="fas fa-download"></i> File <b>' + esc(res.fileName || '') + '</b> đã được tải về máy.</p>'
+ '</div>';
}
toast('Báo cáo Word đã tải về máy!', 'success');
} else {
if (r) {
r.style.display = 'block';
r.innerHTML = '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:14px;color:#b91c1c">'
+ '❌ Lỗi: ' + esc(res.error || '') + '</div>';
}
toast('Lỗi tạo báo cáo: ' + (res.error || ''), 'error');
}
});
}
function loadReportData() {
var period = val('rpt-period') || 'week';
gs('getReportDataWithAuth', [APP.token, period], function (res) {
var c = el('report-stats'); if (!c) return;
if (!res.success) { c.innerHTML = '<p style="color:red">' + esc(res.error||'') + '</p>'; return; }
c.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px">'
+ tcStatCard('Tổng nhiệm vụ',   '📋', res.total,       '#3b82f6')
+ tcStatCard('Hoàn thành',       '✅', res.hoanThanh,   '#10b981')
+ tcStatCard('Quá hạn',          '❌', res.quaHan,      '#ef4444')
+ tcStatCard('Tỷ lệ hoàn thành', '📊', res.tyLe + '%',  res.tyLe >= 80 ? '#10b981' : '#f59e0b')
+ '</div>'
+ '<p style="font-size:12px;color:var(--text-secondary)">Kỳ: ' + esc(res.startDate||'') + ' → ' + esc(res.endDate||'') + '</p>';
});
}
function modalBaoCao(d) {
var nv = findById(APP.nhiemVu, 'ID_Nhiem_Vu', d.nvId);
if (!nv) return { title:'Báo cáo', body:'Không tìm thấy nhiệm vụ', submit:function(){} };
var body = '<div style="background:var(--bg-hover);border-radius:10px;padding:12px;margin-bottom:14px">'
+ '<p style="font-size:13px;font-weight:700">' + esc(nv.Ten_Nhiem_Vu||'') + '</p>'
+ '<p style="font-size:11px;color:var(--text-secondary)">ID: ' + esc(nv.ID_Nhiem_Vu) + ' &nbsp;|&nbsp; Hạn: ' + fmtDate(nv.Han_Chot) + '</p>'
+ '</div>'
+ formRow(
formGroup('Tiến độ (%)', '<input id="f-bc-tienDo" type="number" min="0" max="100" class="form-input" value="' + esc(nv.Tien_Do_Phan_Tram||0) + '">'),
formGroup('Trạng thái', '<select id="f-bc-tt" class="form-select">'
+ opt('Chua bat dau','Chưa bắt đầu',nv.Trang_Thai) + opt('Dang thuc hien','Đang thực hiện',nv.Trang_Thai)
+ opt('Hoan thanh','Hoàn thành',nv.Trang_Thai) + opt('Tam dung','Tạm dừng',nv.Trang_Thai) + '</select>')
)
+ formGroup('Báo cáo tuần', '<textarea id="f-bc-baoCao" class="form-textarea" rows="3" placeholder="Kết quả thực hiện trong tuần...">' + esc(nv.Bao_Cao_Tuan||'') + '</textarea>')
+ formGroup('Khó khăn / Vướng mắc', '<textarea id="f-bc-khoKhan" class="form-textarea" rows="2" placeholder="Ghi các khó khăn nếu có...">' + esc(nv.Kho_Khan_Vuong_Mac||'') + '</textarea>')
+ formGroup('Kiến nghị / Đề xuất', '<textarea id="f-bc-kienNghi" class="form-textarea" rows="2" placeholder="Kiến nghị lên cấp trên...">' + esc(nv.Kien_Nghi_De_Xuat||'') + '</textarea>')
+ formGroup('Nhiệm vụ tuần tới', '<textarea id="f-bc-tuanToi" class="form-textarea" rows="2" placeholder="Dự kiến thực hiện tuần tới...">' + esc(nv.Nhiem_Vu_Tuan_Toi||'') + '</textarea>')
+ formGroup('Kinh phí đã giải ngân (Trđ)', '<input id="f-bc-kpGN" class="form-input" value="' + esc(nv.Kinh_Phi_Da_Giai_Ngan_NV||0) + '">')
+ formGroup('Link minh chứng', '<input id="f-bc-minhChung" class="form-input" value="' + esc(nv.Link_Minh_Chung||'') + '" placeholder="https://...">')
+ '<div style="margin-top:8px;padding:10px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe">'
+ '<p style="font-size:12px;font-weight:600;margin-bottom:6px"><i class="fas fa-calendar-plus" style="color:#3b82f6"></i> Thêm việc mới cho tuần tới</p>'
+ '<div style="display:flex;gap:6px">'
+ '<input id="f-bc-newTask" class="form-input" placeholder="Nhập tên việc mới phát sinh..." style="flex:1">'
+ '<button class="btn btn-primary btn-sm" onclick="addQuickTaskFromBaoCao(\'' + esc(nv.ID_Nhiem_Vu) + '\')">Thêm</button>'
+ '</div>'
+ '</div>';
return {
title: 'Báo cáo tuần — ' + esc((nv.Ten_Nhiem_Vu||'').substring(0,40)),
body: body,
submit: function () {
var payload = {
tienDo: val('f-bc-tienDo'), trangThai: val('f-bc-tt'),
baoCao: val('f-bc-baoCao'), khoKhan: val('f-bc-khoKhan'),
kienNghi: val('f-bc-kienNghi'), nhiemVuTuanToi: val('f-bc-tuanToi'),
kpGiaiNgan: val('f-bc-kpGN'), minhChung: val('f-bc-minhChung')
};
showLoading('Đang lưu báo cáo...');
gs('updateNhiemVuWithAuth', [APP.token, nv.ID_Nhiem_Vu, payload], afterSave);
}
};
}
function openBaoCaoModal(nvId) { openModal('baocao', { nvId: nvId }); }
function addQuickTaskFromBaoCao(sourceNvId) {
var ten = val('f-bc-newTask');
if (!ten) return toast('Vui lòng nhập tên việc mới', 'warning');
var nv = findById(APP.nhiemVu, 'ID_Nhiem_Vu', sourceNvId);
gs('addQuickFutureTask', [APP.token, {
ten: ten,
duAnId:    nv ? nv.ID_Du_An : '',
chuTriId:  nv ? nv.ID_Don_Vi_Chu_Tri : APP.user.deptId,
thucHienId: APP.user.id
}], function (res) {
if (res.success) { toast('Đã thêm việc mới: ' + ten, 'success'); el('f-bc-newTask').value = ''; loadData(true); }
else toast('Lỗi: ' + (res.error||''), 'error');
});
}
function modalFutureTask(d) {
var nv = findById(APP.nhiemVu, 'ID_Nhiem_Vu', d.sourceNvId);
var defaultTen = nv ? (nv.Nhiem_Vu_Tuan_Toi || '') : '';
var body = nv ? '<div style="background:var(--bg-hover);border-radius:8px;padding:10px;margin-bottom:12px;font-size:12px">'
+ '📌 Từ nhiệm vụ: <strong>' + esc(nv.Ten_Nhiem_Vu||'') + '</strong></div>' : ''
+ formGroup('Nội dung nhiệm vụ tuần tới *',
'<textarea id="f-ft-ten" class="form-textarea" rows="3">' + esc(defaultTen) + '</textarea>')
+ formGroup('Hạn chót dự kiến',
'<input id="f-ft-han" type="date" class="form-input">')
+ formGroup('Ghi chú',
'<input id="f-ft-mo-ta" class="form-input" placeholder="Ghi chú thêm...">');
return {
title: 'Tạo nhiệm vụ tuần tới',
body: body,
submit: function () {
var ten = val('f-ft-ten');
if (!ten) return toast('Vui lòng nhập nội dung', 'warning');
showLoading('Đang tạo nhiệm vụ...');
if (d.sourceNvId) {
gs('handleFutureTasks', [APP.token, d.sourceNvId, { ten: ten, hanChot: val('f-ft-han'), moTa: val('f-ft-mo-ta') }], function (res) {
hideLoading();
if (res.success) { toast('Đã tạo nhiệm vụ tuần tới!', 'success'); closeModal(); loadData(true); }
else if (res.alreadyExists) {
if (confirm('Nhiệm vụ này đã được tạo trước đó (ID: ' + res.existingId + ').\nBạn có muốn tạo thêm nhiệm vụ mới không?')) {
gs('addQuickFutureTask', [APP.token, { ten: ten, duAnId: d.duAnId, chuTriId: APP.user.deptId, hanChot: val('f-ft-han') }], function(r2) {
hideLoading();
if (r2.success) { toast('Đã tạo việc mới!', 'success'); closeModal(); loadData(true); }
else toast('Lỗi: ' + (r2.error||''), 'error');
});
}
} else toast('Lỗi: ' + (res.error||''), 'error');
});
} else {
gs('addQuickFutureTask', [APP.token, { ten: ten, duAnId: d.duAnId||'', chuTriId: APP.user.deptId, hanChot: val('f-ft-han') }], function (res) {
hideLoading();
if (res.success) { toast('Đã thêm việc mới!', 'success'); closeModal(); loadData(true); }
else toast('Lỗi: ' + (res.error||''), 'error');
});
}
}
};
}
function openFutureTaskFromNv(nvId) {
var nv = findById(APP.nhiemVu, 'ID_Nhiem_Vu', nvId);
openModal('futuretask', { sourceNvId: nvId, duAnId: nv ? nv.ID_Du_An : '' });
}
function openQuickFutureTask() {
openModal('futuretask', {});
}
function loadReminders() {
gs('getUpcomingReminders', [APP.token], function (res) {
if (!res.success) return;
APP.reminders = res.reminders || [];
renderReminderPanel();
var cnt = APP.reminders.filter(function (r) { return r.type === 'QUA_HAN' || r.type === 'HOM_NAY' || r.type === 'SAP_HAN'; }).length;
var badge = el('reminder-count-badge');
if (badge) { badge.style.display = cnt > 0 ? 'flex' : 'none'; badge.textContent = cnt; }
setText('s-canhBao', cnt);
if (res.triggerStatus) {
var txt = el('cfg-trigger-txt');
if (txt) txt.textContent = res.triggerStatus.active ? '✅ Đang hoạt động (' + res.triggerStatus.count + ' trigger)' : '❌ Chưa bật';
}
});
}
function renderReminderPanel() {
renderRpCounters();
renderRpItems();
}
function renderRpCounters() {
var items = APP.reminders;
setText('rp-cnt-overdue', items.filter(function(r){return r.type==='QUA_HAN';}).length + ' quá hạn');
setText('rp-cnt-today',   items.filter(function(r){return r.type==='HOM_NAY';}).length + ' hôm nay');
setText('rp-cnt-soon',    items.filter(function(r){return r.type==='SAP_HAN';}).length + ' sắp đến');
}
function renderRpItems() {
var c = el('rp-body'); if (!c) return;
var tab   = APP.rpTab;
var items = APP.reminders.filter(function (r) {
if (tab === 'all') return true;
return r.type === tab;
});
if (!items.length) {
c.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:13px"><i class="fas fa-check-circle" style="font-size:24px;display:block;margin-bottom:8px;color:#10b981"></i>Không có nhiệm vụ nào</div>';
return;
}
c.innerHTML = items.map(function (r) {
var cls = r.type==='QUA_HAN'?'overdue': r.type==='HOM_NAY'?'today':'soon';
var icon = r.type==='QUA_HAN'?'❌': r.type==='HOM_NAY'?'🚨': r.type==='SAP_HAN'?'⏰':'⏳';
var diffLabel = r.diff < 0 ? 'Quá hạn ' + Math.abs(r.diff) + ' ngày'
: r.diff === 0 ? 'Hôm nay' : 'Còn ' + r.diff + ' ngày';
return '<div class="rp-item ' + cls + '" onclick="openNhiemVuDetail(\'' + esc(r.nvId) + '\')">'
+ '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'
+ '<span>' + icon + '</span>'
+ '<span style="font-size:12px;font-weight:700;flex:1">' + esc(r.ten || '') + '</span>'
+ '<span style="font-size:10px;color:var(--text-muted)">' + diffLabel + '</span>'
+ '</div>'
+ '<div style="font-size:11px;color:var(--text-secondary)">'
+ (r.duAnTen ? '📁 ' + esc(r.duAnTen) + '  ' : '')
+ '📅 ' + fmtDate(r.hanChot)
+ '</div>'
+ (r.khoKhan ? '<div style="font-size:11px;color:#d97706;margin-top:3px">⚠️ ' + esc(r.khoKhan.substring(0,60)) + '</div>' : '')
+ '<div class="progress-wrap" style="margin-top:5px"><div class="progress-bar" style="width:' + (r.tienDo||0) + '%"></div></div>'
+ '</div>';
}).join('');
}
function setRpTab(tab, el2) {
APP.rpTab = tab;
document.querySelectorAll('.rp-tab').forEach(function (t) { t.classList.remove('on'); });
if (el2) el2.classList.add('on');
renderRpItems();
}
function openReminderPanel() {
el('rp-overlay').style.display = 'block';
el('reminder-panel').classList.add('open');
loadReminders();
}
function closeReminderPanel() {
el('rp-overlay').style.display = 'none';
el('reminder-panel').classList.remove('open');
}
function openReminderConfig() {
gs('getReminderConfig', [APP.token], function (res) {
if (!res.success) return;
if (res.emailEnabled) el('tgl-email').classList.add('on');
else el('tgl-email').classList.remove('on');
el('cfg-zalo').value = res.zaloWebhook || '';
var txt = el('cfg-trigger-txt');
if (txt) txt.textContent = res.triggerStatus && res.triggerStatus.active ? '✅ Đang bật' : '❌ Chưa bật';
el('cfg-backdrop').classList.add('open');
});
}
function closeCfg() { el('cfg-backdrop').classList.remove('open'); }
function closeCfgOnBackdrop(e) { if (e.target === el('cfg-backdrop')) closeCfg(); }
function toggleCfg(id) {
if (id === 'email') el('tgl-email').classList.toggle('on');
}
function saveReminderConfig() {
var cfg = {
emailEnabled: el('tgl-email').classList.contains('on'),
zaloWebhook:  el('cfg-zalo').value
};
gs('saveReminderConfig', [APP.token, cfg], function (res) {
if (res.success) { toast('Đã lưu cài đặt nhắc việc', 'success'); closeCfg(); }
else toast('Lỗi: ' + (res.error||''), 'error');
});
}
function setupTrigger() {
gs('setupDailyReminderTrigger', [APP.token], function (res) {
toast(res.success ? res.message : 'Lỗi: '+(res.error||''), res.success?'success':'error');
loadReminders();
});
}
function removeTrigger() {
gs('removeDailyReminderTrigger', [APP.token], function (res) {
toast(res.success ? res.message : 'Lỗi: '+(res.error||''), res.success?'info':'error');
loadReminders();
});
}
function testReminders() {
showLoading('Đang gửi nhắc việc thử...');
gs('testSendReminders', [APP.token], function (res) {
hideLoading();
if (res.success) toast('Đã gửi: ' + (res.results ? res.results.email + ' email' : ''), 'success');
else toast('Lỗi: ' + (res.error||''), 'error');
});
}
function renderMucTieu() {
var thead = el('mt-thead');
if (thead) {
thead.innerHTML = '<th>ID</th><th>Nhóm</th><th>Tên mục tiêu</th><th>Đơn vị đo</th><th>Chỉ tiêu 2026</th>'
+ ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'].map(function(t){ return '<th class="mt-cell-month">' + t + '</th>'; }).join('')
+ '<th class="mt-total">Lũy kế</th><th>Trạng thái</th><th style="width:80px">Thao tác</th>';
}
var nhomF = val('mt-nhom');
var list  = APP.tienDo.filter(function (td) {
return !nhomF || (td.Nhom_Linh_Vuc || '') === nhomF;
});
var tbody = el('muctieu-tbody');
if (!list.length) {
if (tbody) tbody.innerHTML = '<tr><td colspan="20" style="text-align:center;padding:24px;color:var(--text-muted)">Chưa có mục tiêu nào</td></tr>';
return;
}
if (tbody) tbody.innerHTML = list.map(function (td) {
var tts  = td.Trang_Thai_MT || '';
var ttCls = /hoan/i.test(tts)?'badge-green': /dang/i.test(tts)?'badge-blue':'badge-gray';
var months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'].map(function (t) {
var v = parseFloat(td[t] || 0);
return '<td class="mt-cell-val" onclick="editMucTieuCell(\'' + esc(td.ID_Muc_Tieu) + '\',\'' + t + '\',' + v + ')" title="Nhấn để chỉnh sửa">' + (v || '') + '</td>';
}).join('');
return '<tr>'
+ '<td style="font-size:11px">' + esc(td.ID_Muc_Tieu||'') + '</td>'
+ '<td>' + esc(td.Nhom_Linh_Vuc||'') + '</td>'
+ '<td style="font-weight:600">' + esc(td.Ten_Muc_Tieu||'') + '</td>'
+ '<td>' + esc(td.Don_Vi_Do||'') + '</td>'
+ '<td style="text-align:right">' + (td.Chi_Tieu_2026||'') + '</td>'
+ months
+ '<td class="mt-total" style="text-align:right">' + (td.Luy_Ke_Nam||0) + '</td>'
+ '<td><span class="badge ' + ttCls + '">' + esc(tts) + '</span></td>'
+ '<td><button class="btn btn-outline btn-sm btn-icon" onclick="editMucTieu(\'' + esc(td.ID_Muc_Tieu) + '\')" title="Sửa"><i class="fas fa-edit"></i></button>'
+ '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteMucTieu(\'' + esc(td.ID_Muc_Tieu) + '\')" title="Xóa"><i class="fas fa-trash"></i></button></td>'
+ '</tr>';
}).join('');
renderMucTieuChart(list);
}
function editMucTieuCell(id, month, curVal) {
var newVal = prompt('Nhập giá trị tháng ' + month + ' (hiện tại: ' + curVal + '):', curVal);
if (newVal === null) return;
var td = findById(APP.tienDo, 'ID_Muc_Tieu', id);
if (!td) return;
var payload = { id: id, ten: td.Ten_Muc_Tieu, chuTriId: td.ID_Don_Vi_Chu_Tri,
nhom: td.Nhom_Linh_Vuc, chiTieu: td.Chi_Tieu_2026, donViDo: td.Don_Vi_Do };
['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'].forEach(function(t){
payload[t] = t === month ? parseFloat(newVal)||0 : parseFloat(td[t]||0)||0;
});
showLoading('Đang lưu...');
gs('saveTienDoMucTieuWithAuth', [APP.token, payload], afterSave);
}
function editMucTieu(id) {
var td = findById(APP.tienDo, 'ID_Muc_Tieu', id);
if (!td) return;
openModal('muctieu', { id:id, ten:td.Ten_Muc_Tieu, nhom:td.Nhom_Linh_Vuc,
chuTriId:td.ID_Don_Vi_Chu_Tri, chiTieu:td.Chi_Tieu_2026, donViDo:td.Don_Vi_Do,
T1:td.T1,T2:td.T2,T3:td.T3,T4:td.T4,T5:td.T5,T6:td.T6,
T7:td.T7,T8:td.T8,T9:td.T9,T10:td.T10,T11:td.T11,T12:td.T12 });
}
function deleteMucTieu(id) {
if (!confirm('Xóa mục tiêu này?')) return;
gs('deleteTienDoWithAuth', [APP.token, id], afterSave);
}
function modalMucTieu(d) {
var dvOpts = APP.donVi.map(function(dv){
return '<option value="'+esc(dv.ID_Don_Vi)+'" '+(d.chuTriId===dv.ID_Don_Vi?'selected':'')+'>'+esc(dv.Ten_Don_Vi||dv.ID_Don_Vi)+'</option>';
}).join('');
var months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
var monthInputs = months.reduce(function(html, t, i) {
if (i % 4 === 0) html += '<div class="form-row" style="grid-template-columns:repeat(4,1fr);">';
html += '<div class="form-group"><label class="form-label">' + t + '</label><input id="f-mt-' + t.toLowerCase() + '" type="number" class="form-input" value="' + esc(d[t]||0) + '" step="any"></div>';
if (i % 4 === 3 || i === months.length - 1) html += '</div>';
return html;
}, '');
var body = formRow(
formGroup('Tên mục tiêu *', '<input id="f-mt-ten" class="form-input" value="' + esc(d.ten||'') + '">'),
formGroup('Nhóm lĩnh vực', '<input id="f-mt-nhom" class="form-input" value="' + esc(d.nhom||'') + '">')
) + formRow(
formGroup('Đơn vị chủ trì', '<select id="f-mt-chu-tri" class="form-select"><option value="">--</option>' + dvOpts + '</select>'),
formGroup('Đơn vị đo', '<input id="f-mt-don-vi-do" class="form-input" value="' + esc(d.donViDo||'') + '" placeholder="%, triệu, dự án...">')
) + formGroup('Chỉ tiêu 2026', '<input id="f-mt-chi-tieu" type="number" class="form-input" value="' + esc(d.chiTieu||0) + '">')
+ '<p class="form-label" style="margin-bottom:8px">Kết quả từng tháng:</p>' + monthInputs;
return {
title: d.id ? 'Cập nhật mục tiêu' : 'Thêm mục tiêu mới',
body: body,
submit: function () {
var payload = { id: d.id||'', ten: val('f-mt-ten'), nhom: val('f-mt-nhom'),
chuTriId: val('f-mt-chu-tri'), donViDo: val('f-mt-don-vi-do'), chiTieu: val('f-mt-chi-tieu') };
if (!payload.ten) return toast('Vui lòng nhập tên mục tiêu', 'warning');
['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'].forEach(function(t){
payload[t] = val('f-mt-' + t.toLowerCase()) || 0;
});
showLoading('Đang lưu...');
gs('saveTienDoMucTieuWithAuth', [APP.token, payload], afterSave);
}
};
}
function renderMucTieuChart(list) {
destroyChart('mucTieuChart');
if (!list.length) return;
var months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
var datasets = list.slice(0, 5).map(function (td, i) {
var vals = months.map(function (t) { return parseFloat(td[t] || 0) || 0; });
var cumul = [];
vals.reduce(function (sum, v, idx) { cumul[idx] = sum + v; return sum + v; }, 0);
return {
label: (td.Ten_Muc_Tieu || '').substring(0, 20),
data: cumul,
borderColor: COLORS[i], backgroundColor: COLORS[i] + '20',
fill: false, tension: 0.4, borderWidth: 2, pointRadius: 4
};
});
APP.charts.mucTieu = new Chart(el('mucTieuChart'), {
type: 'line',
data: { labels: months, datasets: datasets },
options: {
responsive: true, maintainAspectRatio: false,
plugins: { legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 12 } } },
scales: {
y: { beginAtZero: true, ticks: { font: { size: 10 } } },
x: { ticks: { font: { size: 10 } } }
}
}
});
}
function renderGantt() {
var c = el('gantt-container'); if (!c) return;
var viewMode = val('gantt-view') || 'all';
var vbFilter = val('gantt-filter-vb');
var allDates = [];
APP.nhiemVu.forEach(function (nv) {
if (nv.Ngay_Bat_Dau) allDates.push(new Date(nv.Ngay_Bat_Dau));
if (nv.Han_Chot)     allDates.push(new Date(nv.Han_Chot));
});
APP.duAn.forEach(function (da) {
if (da.Ngay_Bat_Dau) allDates.push(new Date(da.Ngay_Bat_Dau));
if (da.Ngay_Ket_Thuc) allDates.push(new Date(da.Ngay_Ket_Thuc));
});
var today    = new Date(); today.setHours(0,0,0,0);
var minDate  = allDates.length ? new Date(Math.min.apply(null, allDates)) : new Date(today.getFullYear(), 0, 1);
var maxDate  = allDates.length ? new Date(Math.max.apply(null, allDates)) : new Date(today.getFullYear(), 11, 31);
minDate.setDate(minDate.getDate() - 7);
maxDate.setDate(maxDate.getDate() + 14);
var totalDays   = Math.ceil((maxDate - minDate) / 86400000);
var DAY_W       = 28; // px per day
var CHART_W     = totalDays * DAY_W;
var LABEL_W     = 240;
var ROW_H       = 36;
var rows = [];
var vbList = APP.vanBan.filter(function (vb) { return !vbFilter || vb.ID_Van_Ban === vbFilter; });
vbList.forEach(function (vb) {
if (viewMode !== 'nhiemvu') rows.push({ type:'vb', data:vb, indent:0 });
var daList = APP.duAn.filter(function (d) { return d.ID_Van_Ban_Goc === vb.ID_Van_Ban; });
daList.forEach(function (da) {
if (viewMode !== 'nhiemvu' && viewMode !== 'vanban') rows.push({ type:'da', data:da, indent:1 });
var nvList = APP.nhiemVu.filter(function (n) { return n.ID_Du_An === da.ID_Du_An; });
nvList.forEach(function (nv) {
if (viewMode !== 'vanban' && viewMode !== 'duan') rows.push({ type:'nv', data:nv, indent:2 });
});
});
});
if (!rows.length) { c.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Không có dữ liệu Gantt</div>'; return; }
var months = [];
var cur = new Date(minDate);
while (cur <= maxDate) {
var key = cur.getFullYear() + '-' + cur.getMonth();
if (!months.length || months[months.length-1].key !== key) {
months.push({ key:key, label:('0'+(cur.getMonth()+1)).slice(-2)+'/'+cur.getFullYear(), startDay: Math.round((cur - minDate)/86400000) });
}
cur.setDate(cur.getDate() + 1);
}
var todayOffset = Math.round((today - minDate) / 86400000);
var labelHtml = '', barHtml = '', headerHtml = '';
headerHtml = '<div class="gantt-header-row" style="height:26px">';
months.forEach(function (m) {
var w = DAY_W * 30; // approx
headerHtml += '<div class="gantt-header-cell" style="width:' + w + 'px;min-width:' + w + 'px">' + m.label + '</div>';
});
headerHtml += '</div>';
rows.forEach(function (row) {
var d    = row.data;
var type = row.type;
var indent = row.indent;
var icon = type==='vb' ? '📄' : type==='da' ? '📁' : '📌';
var name = type==='vb' ? (d.Ten_Van_Ban_Trich_Yeu||'').substring(0,28)
: type==='da' ? (d.Ten_Du_An||'').substring(0,28)
: (d.Ten_Nhiem_Vu||'').substring(0,28);
var indentPx = indent * 18;
labelHtml += '<div class="gantt-label-row" style="padding-left:' + (10 + indentPx) + 'px;font-size:' + (type==='nv'?'11':'12') + 'px;font-weight:' + (type==='vb'?'700':type==='da'?'600':'400') + '">'
+ '<span style="margin-right:4px">' + icon + '</span>'
+ '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">' + esc(name) + '</span>'
+ '</div>';
var startDate = null, endDate = null;
if (type === 'vb') {
if (d.Ngay_Ban_Hanh) startDate = new Date(d.Ngay_Ban_Hanh);
} else if (type === 'da') {
if (d.Ngay_Bat_Dau) startDate = new Date(d.Ngay_Bat_Dau);
if (d.Ngay_Ket_Thuc) endDate = new Date(d.Ngay_Ket_Thuc);
} else {
if (d.Ngay_Bat_Dau) startDate = new Date(d.Ngay_Bat_Dau);
if (d.Han_Chot)     endDate   = new Date(d.Han_Chot);
}
var barHtmlRow = '<div class="gantt-row" style="width:' + CHART_W + 'px">';
if (startDate && endDate) {
var left   = Math.round((startDate - minDate) / 86400000) * DAY_W;
var width  = Math.max(Math.round((endDate - startDate) / 86400000) * DAY_W, DAY_W);
var pct    = type==='nv' ? parseInt(d.Tien_Do_Phan_Tram||0) : (d._pctTongHop||0);
var barClr = type==='vb'?'#8b5cf6': type==='da'?'#3b82f6':'#10b981';
var cb     = d.Muc_Canh_Bao||'';
if (cb==='DO')   barClr = '#ef4444';
if (cb==='VANG') barClr = '#f59e0b';
var label  = pct + '%' + (type==='nv'?' '+esc((d.Ten_Nhiem_Vu||'').substring(0,15)):'');
barHtmlRow += '<div class="gantt-bar" style="left:' + left + 'px;width:' + width + 'px;background:' + barClr + '" title="' + esc(name) + ' (' + pct + '%)">' + esc(label) + '</div>';
}
if (todayOffset >= 0 && todayOffset <= totalDays) {
barHtmlRow += '<div class="gantt-today-line" style="left:' + (todayOffset * DAY_W) + 'px"></div>';
}
barHtmlRow += '</div>';
barHtml += barHtmlRow;
});
c.innerHTML = '<div class="gantt-wrap">'
+ '<div class="gantt-labels" style="width:' + LABEL_W + 'px">'
+ '<div style="height:26px;background:var(--bg-hover);border-bottom:2px solid var(--border)"></div>'
+ labelHtml + '</div>'
+ '<div class="gantt-chart-area" style="overflow-x:auto">'
+ headerHtml + barHtml + '</div>'
+ '</div>';
}
function ganttScrollToday() {
var area = document.querySelector('.gantt-chart-area');
if (area) area.scrollLeft = Math.max(0, area.scrollLeft + 200);
}
function renderIOC() {
gs('getDashboardKPIWithAuth', [APP.token], function (res) {
if (!res.success) return;
var kpi  = res.kpi   || {};
var stats= res.stats || {};
renderIOCCards(kpi);
renderIOCCharts(stats);
renderIOCAlerts();
});
}
function renderIOCCards(kpi) {
var c = el('ioc-cards'); if (!c) return;
c.innerHTML = iocCard(kpi.soVanBan,  'Văn bản',  '#8b5cf6')
+ iocCard(kpi.soDuAn,    'Dự án',    '#3b82f6')
+ iocCard(kpi.soNhiemVu, 'Nhiệm vụ','#10b981')
+ iocCard(kpi.hoanThanh, 'Hoàn thành','#16a34a')
+ iocCard(kpi.quaHan,    'Quá hạn',  '#ef4444')
+ iocCard((kpi.tyLeHt||0)+'%', 'Tỷ lệ HT', kpi.tyLeHt>=80?'#10b981':kpi.tyLeHt>=50?'#f59e0b':'#ef4444')
+ iocCard((kpi.avgPct||0)+'%', 'TB tiến độ','#6366f1');
}
function iocCard(num, label, color) {
return '<div class="ioc-card"><div class="ioc-num" style="color:' + color + '">' + esc(String(num)) + '</div><div class="ioc-lbl">' + esc(label) + '</div></div>';
}
function renderIOCCharts(stats) {
destroyChart('iocCanhBaoChart');
var cbMap = { 'DO': 0, 'VANG': 0, 'XANH': 0 };
APP.nhiemVu.forEach(function (n) { var k = n.Muc_Canh_Bao || 'XANH'; cbMap[k] = (cbMap[k]||0)+1; });
APP.charts.iocCanhBao = new Chart(el('iocCanhBaoChart'), {
type: 'doughnut',
data: { labels:['🔴 Đỏ','🟡 Vàng','✅ Xanh'], datasets:[{ data:[cbMap.DO,cbMap.VANG,cbMap.XANH], backgroundColor:['#ef4444','#f59e0b','#10b981'], borderWidth:0 }] },
options: { responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12}}} }
});
var lv = stats.linhVucChart || {};
var lvLabels = Object.keys(lv), lvData = lvLabels.map(function(k){return lv[k];});
if (lvLabels.length) {
destroyChart('iocLinhVucChart');
APP.charts.iocLinhVuc = new Chart(el('iocLinhVucChart'), {
type:'doughnut',
data:{labels:lvLabels,datasets:[{data:lvData,backgroundColor:COLORS.slice(0,lvLabels.length),borderWidth:0}]},
options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12}}}}
});
}
var dvMap = {};
APP.donVi.forEach(function(d){dvMap[d.ID_Don_Vi]=d.Ten_Don_Vi||d.ID_Don_Vi;});
var dvStats = {};
APP.nhiemVu.forEach(function(n){
var k = dvMap[n.ID_Don_Vi_Chu_Tri]||n.ID_Don_Vi_Chu_Tri||'Chưa gán';
if(!dvStats[k]) dvStats[k]={total:0,done:0};
dvStats[k].total++;
if(/ho[àa]n/i.test(n.Trang_Thai||'')) dvStats[k].done++;
});
var dvKeys = Object.keys(dvStats).slice(0,8);
var dvPct  = dvKeys.map(function(k){return dvStats[k].total?Math.round(dvStats[k].done/dvStats[k].total*100):0;});
if (dvKeys.length) {
destroyChart('iocDonViChart');
APP.charts.iocDonVi = new Chart(el('iocDonViChart'), {
type:'bar',
data:{labels:dvKeys,datasets:[{data:dvPct,backgroundColor:COLORS,borderWidth:0,borderRadius:4}]},
options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100,ticks:{font:{size:9},callback:function(v){return v+'%';}}},x:{ticks:{font:{size:9}}}}}
});
}
}
function renderIOCAlerts() {
var today = new Date(); today.setHours(0,0,0,0);
var doList = [], vangList = [];
APP.nhiemVu.forEach(function(nv){
var cb = nv.Muc_Canh_Bao||'';
if(cb!=='DO'&&cb!=='VANG') return;
var _d=daysDiff(nv.Han_Chot);
var _dt=_d===null?'':(_d<0?'Quá '+Math.abs(_d)+' ngày':_d===0?'Hôm nay':'Còn '+_d+' ngày');
var item='<div class="alert-item '+(cb==='DO'?'red':'yellow')+'" data-nvid="'+esc(nv.ID_Nhiem_Vu)+'" style="cursor:pointer">'
+'<div style="display:flex;justify-content:space-between;gap:6px">'
+'<p style="font-size:12px;font-weight:700;flex:1">'+esc(nv.Ten_Nhiem_Vu||'')+'</p>'
+'<span style="font-size:10px;color:'+(_d!==null&&_d<0?'#ef4444':'#f59e0b')+'">'+_dt+'</span>'
+'</div>'
+'<p style="font-size:11px;color:var(--text-secondary)">📅 '+fmtDate(nv.Han_Chot)+' | '+(nv.Tien_Do_Phan_Tram||0)+'%</p>'
+(nv.Kho_Khan_Vuong_Mac?'<p style="font-size:11px;color:#d97706">⚠️ '+esc(String(nv.Kho_Khan_Vuong_Mac).substring(0,60))+'</p>':'')
+'</div>';
if(cb==='DO') doList.push(item);
else vangList.push(item);
});
function _setupList(el2,list2){
if(!el2)return;
el2.innerHTML=list2.length?list2.join(''):'<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px">Không có ✅</p>';
el2.onclick=function(e){
var card=e.target.closest('[data-nvid]');
if(card){var id=card.getAttribute('data-nvid');if(typeof openNhiemVuDetail==='function')openNhiemVuDetail(id);}
};
}
_setupList(el('ioc-do-list'),doList);
_setupList(el('ioc-vang-list'),vangList);
}

function openDuAnDetail(daId) {
var da  = findById(APP.duAn, 'ID_Du_An', daId); if (!da) return;
var vb  = findById(APP.vanBan, 'ID_Van_Ban', da.ID_Van_Ban_Goc);
var nvs = APP.nhiemVu.filter(function(n){ return n.ID_Du_An === daId; });
var ns  = findById(APP.nhanSu, 'ID_Nhan_Su', da.ID_Nguoi_Quan_Ly_DA);
var dv  = findById(APP.donVi, 'ID_Don_Vi', da.ID_Don_Vi_Chu_Tri);
el('detail-title').textContent = '📁 ' + (da.Ten_Du_An||'');
el('detail-body').innerHTML = detailBlock([
['ID', da.ID_Du_An], ['Văn bản gốc', vb?vb.Ten_Van_Ban_Trich_Yeu||vb.So_Ky_Hieu:'—'],
['Đơn vị chủ trì', dv?dv.Ten_Don_Vi:'—'], ['Quản lý', ns?ns.Ho_Ten:'—'],
['Ngày BĐ', fmtDate(da.Ngay_Bat_Dau)], ['Ngày KT', fmtDate(da.Ngay_Ket_Thuc)],
['Trạng thái', da.Trang_Thai_DA], ['Tiến độ tổng hợp', (da._pctTongHop||0)+'%'],
['Dự toán', fmtMoney(da._kpTongHop_DT||0)], ['Giải ngân', fmtMoney(da._kpTongHop_GN||0)],
['Tỷ lệ giải ngân', (da._tyLeGiaiNgan||0)+'%']
]) + '<div class="sep"></div>'
+ '<p style="font-weight:700;margin-bottom:8px">Nhiệm vụ (' + nvs.length + '):</p>'
+ (nvs.length ? nvs.map(function(nv){
var pct=parseInt(nv.Tien_Do_Phan_Tram||0), cb=nv.Muc_Canh_Bao||'';
return taskCardHtml(nv, da, pct, cb, false);
}).join('') : '<p style="color:var(--text-muted);font-size:13px">Chưa có nhiệm vụ</p>');
var _dov=el('detail-overlay');if(_dov){_dov.style.display='flex';_dov.classList.add('active');}
}
function openNhiemVuDetail(nvId) {
var nv = findById(APP.nhiemVu, 'ID_Nhiem_Vu', nvId); if (!nv) return;
var da = findById(APP.duAn, 'ID_Du_An', nv.ID_Du_An);
var vb = nv.ID_Van_Ban ? findById(APP.vanBan, 'ID_Van_Ban', nv.ID_Van_Ban) : null;
var ns = findById(APP.nhanSu, 'ID_Nhan_Su', nv.ID_Nguoi_Thuc_Hien);
var ql = findById(APP.nhanSu, 'ID_Nhan_Su', nv.ID_Nguoi_Quan_Ly_Truoc_Tiep);
var dv = findById(APP.donVi, 'ID_Don_Vi', nv.ID_Don_Vi_Chu_Tri);
var pct= parseInt(nv.Tien_Do_Phan_Tram||0);
el('detail-title').textContent = '📌 ' + (nv.Ten_Nhiem_Vu||'');
el('detail-body').innerHTML = detailBlock([
['ID', nv.ID_Nhiem_Vu],
['Văn bản', vb ? (vb.So_Ky_Hieu ? vb.So_Ky_Hieu + ' — ' : '') + (vb.Ten_Van_Ban_Trich_Yeu||'') : null],
['Dự án', da?da.Ten_Du_An:'—'],
['Lĩnh vực', nv.Linh_Vuc_NQ57], ['Đơn vị CT', dv?dv.Ten_Don_Vi:'—'],
['Người TH', ns?ns.Ho_Ten:'—'], ['Quản lý', ql?ql.Ho_Ten:'—'],
['Ngày BĐ', fmtDate(nv.Ngay_Bat_Dau)], ['Hạn chót', fmtDate(nv.Han_Chot)],
['Tiến độ', pct+'%'], ['Trạng thái', nv.Trang_Thai],
['Ưu tiên', nv.Uu_Tien], ['Cảnh báo', nv.Muc_Canh_Bao],
['Dự toán', fmtMoney(nv.Kinh_Phi_Du_Toan_NV||0)], ['Giải ngân', fmtMoney(nv.Kinh_Phi_Da_Giai_Ngan_NV||0)]
])
+ '<div class="sep"></div>'
+ '<div class="progress-wrap" style="margin:8px 0"><div class="progress-bar" style="width:' + pct + '%"></div></div>'
+ (vb && vb.Link_File_Goc ? '<div class="form-group"><label class="form-label"><i class="fas fa-file-alt" style="color:#8b5cf6"></i> Văn bản gốc</label><a href="' + esc(vb.Link_File_Goc) + '" target="_blank" class="btn btn-outline btn-sm"><i class="fas fa-external-link-alt"></i> Xem văn bản: ' + esc(vb.So_Ky_Hieu || vb.Ten_Van_Ban_Trich_Yeu || '') + '</a></div>' : '')
+ (nv.Bao_Cao_Tuan ? '<div class="form-group"><label class="form-label">Báo cáo tuần</label><p style="font-size:13px">' + esc(nv.Bao_Cao_Tuan) + '</p></div>' : '')
+ (nv.Kho_Khan_Vuong_Mac ? '<div class="form-group"><label class="form-label" style="color:#d97706">⚠️ Khó khăn</label><p style="font-size:13px">' + esc(nv.Kho_Khan_Vuong_Mac) + '</p></div>' : '')
+ (nv.Kien_Nghi_De_Xuat ? '<div class="form-group"><label class="form-label">Kiến nghị</label><p style="font-size:13px">' + esc(nv.Kien_Nghi_De_Xuat) + '</p></div>' : '')
+ (nv.Nhiem_Vu_Tuan_Toi ? '<div class="form-group"><label class="form-label">Nhiệm vụ tuần tới</label><p style="font-size:13px">' + esc(nv.Nhiem_Vu_Tuan_Toi) + '</p></div>' : '')
+ (nv.Link_Minh_Chung ? '<div class="form-group"><label class="form-label">Minh chứng</label><a href="' + esc(nv.Link_Minh_Chung) + '" target="_blank" class="btn btn-outline btn-sm"><i class="fas fa-external-link-alt"></i>Xem</a></div>' : '')
+ '<div class="modal-foot" style="padding:12px 0 0;border:none">'
+ '<button class="btn btn-outline" onclick="closeDetail()">Đóng</button>'
+ '<button class="btn btn-primary" onclick="closeDetail();openBaoCaoModal(\'' + esc(nvId) + '\')"><i class="fas fa-clipboard-list"></i>Báo cáo tuần</button>'
+ (APP.perms.canEditDuAn||APP.perms.isAdmin ? '<button class="btn btn-outline" onclick="closeDetail();editNhiemVu(\'' + esc(nvId) + '\')"><i class="fas fa-edit"></i>Sửa</button>' : '')
+ '</div>';
var _dov=el('detail-overlay');if(_dov){_dov.style.display='flex';_dov.classList.add('active');}
}
function closeDetail() { var _dov2=el('detail-overlay');if(_dov2){_dov2.classList.remove('active');_dov2.style.display='none';} }
function handleDetailOverlay(e) { if (e.target === el('detail-overlay')) closeDetail(); }
function detailBlock(pairs) {
return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:12px">'
+ pairs.filter(function(p){ return p[1]; }).map(function(p) {
return '<div><span class="form-label">' + esc(p[0]) + '</span><p style="font-size:13px;font-weight:500">' + esc(String(p[1]||'—')) + '</p></div>';
}).join('') + '</div>';
}
function tcStatCard(label, icon, value, color) {
return '<div class="tc-stat">'
+ '<div class="tc-stat-lbl">' + icon + ' ' + label + '</div>'
+ '<div class="tc-stat-val" style="color:' + (color || 'var(--text-primary)') + '">' + String(value) + '</div>'
+ '</div>';
}
function refreshData() {
loadData(true);
toast('Đang làm mới dữ liệu...', 'info', 1500);
}
function filterOverdue() {
navigateTo('nhiemvu');
var sel = el('nv-status');
if (sel) { sel.value = 'Qua han'; renderNhiemVu(); }
}
function setupSheets() {
if (!APP.perms.isAdmin) return toast('Chỉ Admin mới được thiết lập sheet', 'warning');
showLoading('Đang tạo cấu trúc sheet...');
gs('setupAllSheets', [APP.token], function (res) {
hideLoading();
if (res.success) toast('Đã thiết lập xong tất cả sheet Demo!', 'success');
else toast('Lỗi: ' + (res.error || ''), 'error');
});
}
function clearNotifications() {
APP.notifications = [];
var nl = el('notif-list');
if (nl) nl.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px">Không có thông báo</div>';
var badge = el('notif-badge');
if (badge) badge.style.display = 'none';
}
function renderNotifications() {
var nl = el('notif-list'); if (!nl) return;
if (!APP.notifications.length) {
nl.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px">Không có thông báo</div>';
return;
}
nl.innerHTML = APP.notifications.slice(-10).reverse().map(function (tb) {
return '<div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px">'
+ '<p style="font-weight:600;margin-bottom:2px">' + esc(tb.Noi_Dung || '') + '</p>'
+ '<p style="color:var(--text-muted)">' + fmtDate(tb.Thoi_Gian) + '</p>'
+ '</div>';
}).join('');
}
function updateCanhBao() {
showLoading('Đang cập nhật cảnh báo...');
gs('updateCanhBaoWithAuth', [APP.token], function (res) {
hideLoading();
if (res.success) { toast('Đã cập nhật ' + (res.updated || 0) + ' cảnh báo', 'success'); loadData(true); }
else toast('Lỗi: ' + (res.error || ''), 'error');
});
}
function openVanBanDetail(vbId) {
var vb = findById(APP.vanBan, 'ID_Van_Ban', vbId); if (!vb) return;
var daList = APP.duAn.filter(function (d) { return d.ID_Van_Ban_Goc === vbId; });
var dv     = findById(APP.donVi, 'ID_Don_Vi', vb.ID_Don_Vi_Chu_Tri);
el('detail-title').textContent = '📄 ' + (vb.Ten_Van_Ban_Trich_Yeu || '');
el('detail-body').innerHTML = detailBlock([
['ID', vb.ID_Van_Ban], ['Loại', vb.Loai_Van_Ban], ['Cấp', vb.Cap_Ban_Hanh],
['Số/Ký hiệu', vb.So_Ky_Hieu], ['Ngày ban hành', fmtDate(vb.Ngay_Ban_Hanh)],
['Đơn vị CT', dv ? dv.Ten_Don_Vi : '—'],
['Tiến độ tổng hợp', (vb._pctTongHop || 0) + '%'],
['Dự toán tổng', fmtMoney(vb._kpTongHop_DT || 0)],
['Giải ngân tổng', fmtMoney(vb._kpTongHop_GN || 0)]
])
+ (vb.Link_File_Goc ? '<div class="form-group"><label class="form-label">Link file gốc</label><a href="' + esc(vb.Link_File_Goc) + '" target="_blank" class="btn btn-outline btn-sm"><i class="fas fa-external-link-alt"></i>Mở file</a></div>' : '')
+ '<div class="sep"></div>'
+ '<p style="font-weight:700;margin-bottom:8px">Danh sách dự án (' + daList.length + '):</p>'
+ (daList.length
? daList.map(function (da) { return duAnMiniCard(da); }).join('')
: '<p style="color:var(--text-muted);font-size:13px">Chưa có dự án liên kết</p>')
+ '<div class="modal-foot" style="padding:12px 0 0;border:none">'
+ '<button class="btn btn-outline" onclick="closeDetail()">Đóng</button>'
+ (canEditThisVanBan(vb) ? '<button class="btn btn-primary" onclick="closeDetail();editVanBan(\'' + esc(vbId) + '\')"><i class="fas fa-edit"></i>Chỉnh sửa</button>' : '')
+ '</div>';
var _dov=el('detail-overlay');if(_dov){_dov.style.display='flex';_dov.classList.add('active');}
}
function filterMucTieu() { renderMucTieu(); }
function onGanttFilterChange() { renderGantt(); }
function quickCreateVanBan()  { openModal('vanban');   closeDropdowns(); }
function quickCreateDuAn()    { openModal('duan');     closeDropdowns(); }
function quickCreateNhiemVu() { openModal('nhiemvu');  closeDropdowns(); }
function quickCreateDonVi()   { openModal('donvi');    closeDropdowns(); }
function quickCreateNhanSu()  { openModal('nhansu');   closeDropdowns(); }
function exportNhiemVuCSV() {
var headers = ['ID','Tên nhiệm vụ','Dự án','Đơn vị CT','Trạng thái','Tiến độ (%)','Hạn chót','Người TH','Kinh phí DT','Giải ngân','Cảnh báo'];
var dvMap = {}, nsMap = {}, daMap = {};
APP.donVi.forEach(function(d){dvMap[d.ID_Don_Vi]=d.Ten_Don_Vi||d.ID_Don_Vi;});
APP.nhanSu.forEach(function(s){nsMap[s.ID_Nhan_Su]=s.Ho_Ten||s.ID_Nhan_Su;});
APP.duAn.forEach(function(d){daMap[d.ID_Du_An]=d.Ten_Du_An||d.ID_Du_An;});
var rows = APP.nhiemVu.map(function(nv){
return [
nv.ID_Nhiem_Vu, nv.Ten_Nhiem_Vu,
daMap[nv.ID_Du_An]||nv.ID_Du_An,
dvMap[nv.ID_Don_Vi_Chu_Tri]||nv.ID_Don_Vi_Chu_Tri,
nv.Trang_Thai, nv.Tien_Do_Phan_Tram||0,
fmtDate(nv.Han_Chot),
nsMap[nv.ID_Nguoi_Thuc_Hien]||nv.ID_Nguoi_Thuc_Hien,
nv.Kinh_Phi_Du_Toan_NV||0, nv.Kinh_Phi_Da_Giai_Ngan_NV||0,
nv.Muc_Canh_Bao
].map(function(v){ return '"' + String(v||'').replace(/"/g,'""') + '"'; }).join(',');
});
var csv  = [headers.join(',')].concat(rows).join('\n');
var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
var url  = URL.createObjectURL(blob);
var a    = document.createElement('a');
a.href   = url; a.download = 'NhiemVu_NQ57_' + new Date().toISOString().slice(0,10) + '.csv';
a.click(); URL.revokeObjectURL(url);
toast('Đã xuất CSV nhiệm vụ', 'success');
}
document.addEventListener('keydown', function (e) {
if (e.key === '?' && !e.ctrlKey && !e.target.matches('input,textarea,select')) {
toast('Phím tắt: Esc=Đóng | Ctrl+R=Làm mới | Ctrl+N=Nhiệm vụ mới', 'info', 5000);
}
if (e.ctrlKey && e.key === 'n') {
e.preventDefault();
openModal('nhiemvu');
}
});
window.addEventListener('resize', function () {
if (APP.currentSection === 'gantt') {
clearTimeout(window._ganttResizeTimer);
window._ganttResizeTimer = setTimeout(renderGantt, 300);
}
});
(function checkInit() {
var loginForm = el('login-email');
if (loginForm) {
el('login-email').addEventListener('keydown', function (e) {
if (e.key === 'Enter') { e.preventDefault(); el('login-password').focus(); }
});
el('login-password').addEventListener('keydown', function (e) {
if (e.key === 'Enter') { e.preventDefault(); doLogin(); }
});
}
var logoutBtn = el('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
})();
function renderThongKe() {
var dvFilter = val('tk-donvi')  || '';
var period   = val('tk-period') || 'all';
var today    = new Date(); today.setHours(0,0,0,0);
function inPeriod(dateStr) {
if (period==='all'||!dateStr) return true;
var d=new Date(dateStr); if(isNaN(d)) return true;
var y=today.getFullYear(),m=today.getMonth();
if(period==='month')   return d.getFullYear()===y&&d.getMonth()===m;
if(period==='quarter') return d.getFullYear()===y&&Math.floor(d.getMonth()/3)===Math.floor(m/3);
if(period==='year')    return d.getFullYear()===y;
return true;
}
var dvMap={};
APP.donVi.forEach(function(d){ dvMap[d.ID_Don_Vi]=d.Ten_Don_Vi||d.ID_Don_Vi; });
var dvSel=el('tk-donvi');
if(dvSel&&dvSel.options.length<=1){
APP.donVi.forEach(function(d){
var o=document.createElement('option');
o.value=d.ID_Don_Vi; o.textContent=d.Ten_Don_Vi||d.ID_Don_Vi;
dvSel.appendChild(o);
});
}
var dvList = dvFilter
? APP.donVi.filter(function(d){return d.ID_Don_Vi===dvFilter;})
: APP.donVi.slice();
// Nếu không có đơn vị hoặc nhiemVu dùng ID không khớp, tự build từ nhiemVu
if(!dvFilter) {
var dvIdsFromNV=[...new Set(APP.nhiemVu.map(function(n){return n.ID_Don_Vi_Chu_Tri;}).filter(Boolean))];
dvIdsFromNV.forEach(function(id){
if(!dvList.some(function(d){return d.ID_Don_Vi===id;})){
dvList.push({ID_Don_Vi:id,Ten_Don_Vi:dvMap[id]||id});
}
});
var nvChuaGan=APP.nhiemVu.filter(function(n){return !n.ID_Don_Vi_Chu_Tri;});
if(nvChuaGan.length) dvList.push({ID_Don_Vi:'__chuagan__',Ten_Don_Vi:'Chưa gán đơn vị'});
}
var rows=[];
dvList.forEach(function(dv){
var dvId=dv.ID_Don_Vi;
var nvDv = dvId==='__chuagan__'
? APP.nhiemVu.filter(function(n){return !n.ID_Don_Vi_Chu_Tri;})
: APP.nhiemVu.filter(function(n){return n.ID_Don_Vi_Chu_Tri===dvId;});
var daDv = dvId==='__chuagan__'?[]:APP.duAn.filter(function(d){return d.ID_Don_Vi_Chu_Tri===dvId;});
if(!nvDv.length&&!daDv.length) return;
var nvPeriod = nvDv.filter(function(n){return inPeriod(n.Ngay_Bat_Dau||n.Han_Chot);});
var total     = nvPeriod.length||nvDv.length;
var hoanThanh = (nvPeriod.length?nvPeriod:nvDv).filter(function(n){return /ho[àa]n/i.test(n.Trang_Thai||'')||parseInt(n.Tien_Do_Phan_Tram||0)>=100;}).length;
var dangTH    = (nvPeriod.length?nvPeriod:nvDv).filter(function(n){return /d[aă]ng/i.test(n.Trang_Thai||'');}).length;
var quaHan    = (nvPeriod.length?nvPeriod:nvDv).filter(function(n){
var due=n.Han_Chot?new Date(n.Han_Chot):null; if(!due||isNaN(due)) return false;
due.setHours(0,0,0,0);
return due<today&&!/ho[àa]n/i.test(n.Trang_Thai||'');
}).length;
var avgPct  = total?Math.round(nvDv.reduce(function(s,n){return s+parseInt(n.Tien_Do_Phan_Tram||0);},0)/total):0;
var tyLeHt  = total?Math.round(hoanThanh/total*100):0;
var kpDT    = nvDv.reduce(function(s,n){return s+(parseFloat(String(n.Kinh_Phi_Du_Toan_NV||'').replace(/,/g,''))||0);},0)
+ daDv.reduce(function(s,d){return s+(parseFloat(String(d.Kinh_Phi_Du_Toan_DA||'').replace(/,/g,''))||0);},0);
var kpGN    = nvDv.reduce(function(s,n){return s+(parseFloat(String(n.Kinh_Phi_Da_Giai_Ngan_NV||'').replace(/,/g,''))||0);},0)
+ daDv.reduce(function(s,d){return s+(parseFloat(String(d.Kinh_Phi_Da_Giai_Ngan_DA||'').replace(/,/g,''))||0);},0);
var doCB    = nvDv.filter(function(n){return n.Muc_Canh_Bao==='DO';}).length;
var vangCB  = nvDv.filter(function(n){return n.Muc_Canh_Bao==='VANG';}).length;
rows.push({dvId:dvId,ten:dv.Ten_Don_Vi||dvId,soDuAn:daDv.length,
total:total,hoanThanh:hoanThanh,dangTH:dangTH,quaHan:quaHan,
tyLeHt:tyLeHt,avgPct:avgPct,kpDT:kpDT,kpGN:kpGN,doCB:doCB,vangCB:vangCB});
});
rows.sort(function(a,b){return b.total-a.total;});
var totals=rows.reduce(function(acc,r){acc.nv+=r.total;acc.ht+=r.hoanThanh;acc.qh+=r.quaHan;acc.kpDT+=r.kpDT;acc.kpGN+=r.kpGN;return acc;},{nv:0,ht:0,qh:0,kpDT:0,kpGN:0});
var sr=el('tk-stats-row');
if(sr) sr.innerHTML=
tkStat('Tổng NV','📋',totals.nv,'#3b82f6')+tkStat('Hoàn thành','✅',totals.ht,'#10b981')
+tkStat('Quá hạn','❌',totals.qh,'#ef4444')+tkStat('Phòng ban','🏢',rows.length,'#8b5cf6')
+tkStat('Dự toán','💰',fmtMoney(totals.kpDT),'#f59e0b')+tkStat('Giải ngân','📤',fmtMoney(totals.kpGN),'#06b6d4');
var tbody=el('tk-tbody');
if(!tbody) return;
if(!rows.length){tbody.innerHTML='<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text-muted)">Không có dữ liệu</td></tr>';return;}
var tbody2=tbody;
tbody2.innerHTML=rows.map(function(r){
var bw=Math.min(r.tyLeHt,100);
var bc=r.tyLeHt>=80?'green':r.tyLeHt>=50?'':'red';
var cb=(r.doCB?'<span class="badge badge-red" style="margin-right:2px">🔴 '+r.doCB+'</span>':'')
+(r.vangCB?'<span class="badge badge-yellow">🟡 '+r.vangCB+'</span>':'')
+((!r.doCB&&!r.vangCB)?'<span style="color:#10b981;font-size:13px">✅</span>':'');
return '<tr data-dvid="'+esc(r.dvId)+'" style="cursor:pointer">'
+'<td><strong style="font-size:13px">'+esc(r.ten)+'</strong></td>'
+'<td style="text-align:center"><span class="badge badge-blue">'+r.soDuAn+'</span></td>'
+'<td style="text-align:center;font-weight:700">'+r.total+'</td>'
+'<td style="text-align:center;color:#10b981;font-weight:600">'+r.hoanThanh+'</td>'
+'<td style="text-align:center;color:#3b82f6;font-weight:600">'+r.dangTH+'</td>'
+'<td style="text-align:center;color:'+(r.quaHan?'#ef4444':'#94a3b8')+';font-weight:600">'+r.quaHan+'</td>'
+'<td><div class="kp-bar-wrap"><div class="progress-wrap" style="width:80px"><div class="progress-bar '+bc+'" style="width:'+bw+'%"></div></div><span>'+r.tyLeHt+'%</span></div></td>'
+'<td style="text-align:right">'+fmtMoney(r.kpDT)+'</td>'
+'<td style="text-align:right;color:#10b981">'+fmtMoney(r.kpGN)+'</td>'
+'<td style="text-align:center">'+cb+'</td></tr>';
}).join('');
_renderTkNvChart(rows); _renderTkHtChart(rows);
_renderTkKpChart(rows); _renderTkCbChart(rows);
// Click delegation - không dùng onclick inline
if(tbody){
tbody.onclick=function(e){
var tr=e.target.closest('tr[data-dvid]');
if(tr){var id=tr.getAttribute('data-dvid');if(typeof openThongKeDonVi==='function')openThongKeDonVi(id);}
};
}
}
function tkStat(label,icon,value,color){
return '<div class="stat-card" style="cursor:default">'
+'<div class="stat-card-top" style="background:'+color+'"></div>'
+'<div class="stat-card-body">'
+'<div class="stat-icon" style="background:'+color+'22;font-size:18px">'+icon+'</div>'
+'<div class="stat-num" style="font-size:20px">'+value+'</div>'
+'<div class="stat-lbl">'+label+'</div>'
+'</div></div>';
}
function openThongKeDonVi(dvId){
var dv=findById(APP.donVi,'ID_Don_Vi',dvId);
var nvs=APP.nhiemVu.filter(function(n){return n.ID_Don_Vi_Chu_Tri===dvId;});
var card=el('tk-detail-card'), body=el('tk-detail-body'), ttl=el('tk-detail-title');
if(!card||!body) return;
if(ttl) ttl.textContent=' '+(dv?dv.Ten_Don_Vi:dvId);
card.style.display='block';
body.innerHTML='<div class="task-list-container">'
+nvs.slice(0,15).map(function(nv){
var da=findById(APP.duAn,'ID_Du_An',nv.ID_Du_An);
return taskCardHtml(nv,da,parseInt(nv.Tien_Do_Phan_Tram||0),nv.Muc_Canh_Bao||'',false);
}).join('')
+(nvs.length>15?'<p style="text-align:center;padding:8px;font-size:12px;color:var(--text-muted)">...và '+(nvs.length-15)+' nhiệm vụ khác</p>':'')
+'</div>';
card.scrollIntoView({behavior:'smooth',block:'start'});
}
function _renderTkNvChart(rows){
destroyChart('tk-nv-chart');
if(!rows.length) return;
var labels=rows.slice(0,10).map(function(r){return r.ten.substring(0,14);});
APP.charts['tk-nv-chart']=new Chart(el('tk-nv-chart'),{type:'bar',data:{labels:labels,datasets:[
{label:'Hoàn thành',data:rows.slice(0,10).map(function(r){return r.hoanThanh;}),backgroundColor:'#10b981',borderRadius:4,borderWidth:0},
{label:'Đang TH',   data:rows.slice(0,10).map(function(r){return r.dangTH;}),   backgroundColor:'#3b82f6',borderRadius:4,borderWidth:0},
{label:'Quá hạn',   data:rows.slice(0,10).map(function(r){return r.quaHan;}),   backgroundColor:'#ef4444',borderRadius:4,borderWidth:0}
]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:10}}},
scales:{x:{stacked:true,ticks:{font:{size:9}}},y:{stacked:true,beginAtZero:true,ticks:{font:{size:10}}}}}});
}
function _renderTkHtChart(rows){
destroyChart('tk-ht-chart');
if(!rows.length) return;
var top=rows.filter(function(r){return r.total>0;}).slice(0,8);
APP.charts['tk-ht-chart']=new Chart(el('tk-ht-chart'),{type:'doughnut',data:{
labels:top.map(function(r){return r.ten.substring(0,14);}),
datasets:[{data:top.map(function(r){return r.tyLeHt;}),backgroundColor:COLORS.slice(0,top.length),borderWidth:2,borderColor:'#fff'}]
},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:10},boxWidth:10}},
tooltip:{callbacks:{label:function(c){return c.label+': '+c.parsed+'%';}}}}}});
}
function _renderTkKpChart(rows){
destroyChart('tk-kp-chart');
if(!rows.length) return;
var top=rows.filter(function(r){return r.kpDT>0||r.kpGN>0;}).slice(0,8);
if(!top.length) return;
APP.charts['tk-kp-chart']=new Chart(el('tk-kp-chart'),{type:'bar',data:{
labels:top.map(function(r){return r.ten.substring(0,14);}),
datasets:[
{label:'Dự toán (Trđ)',  data:top.map(function(r){return Math.round(r.kpDT*10)/10;}),backgroundColor:'rgba(59,130,246,.5)',borderColor:'#3b82f6',borderWidth:1,borderRadius:4},
{label:'Giải ngân (Trđ)',data:top.map(function(r){return Math.round(r.kpGN*10)/10;}),backgroundColor:'rgba(16,185,129,.7)',borderColor:'#10b981',borderWidth:1,borderRadius:4}
]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:10}}},
scales:{y:{beginAtZero:true,ticks:{font:{size:10}}},x:{ticks:{font:{size:10}}}}}});
}
function _renderTkCbChart(rows){
destroyChart('tk-cb-chart');
if(!rows.length) return;
var top=rows.slice(0,10);
APP.charts['tk-cb-chart']=new Chart(el('tk-cb-chart'),{type:'bar',data:{
labels:top.map(function(r){return r.ten.substring(0,14);}),
datasets:[
{label:'🔴 Đỏ',  data:top.map(function(r){return r.doCB;}),  backgroundColor:'#ef4444',borderRadius:4,borderWidth:0},
{label:'🟡 Vàng',data:top.map(function(r){return r.vangCB;}),backgroundColor:'#f59e0b',borderRadius:4,borderWidth:0}
]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:10}}},
scales:{x:{stacked:true,ticks:{font:{size:9}}},y:{stacked:true,beginAtZero:true,ticks:{font:{size:10}}}}}});
}
function exportThongKeCSV(){
var h=['Phong ban','Du an','Tong NV','Hoan thanh','Dang TH','Qua han','Ty le HT','DT(tr)','GN(tr)'],rows=[];
var _t3=new Date();_t3.setHours(0,0,0,0);
APP.donVi.forEach(function(dv){
var id=dv.ID_Don_Vi,nvs=APP.nhiemVu.filter(function(n){return n.ID_Don_Vi_Chu_Tri===id;}),das=APP.duAn.filter(function(d){return d.ID_Don_Vi_Chu_Tri===id;});
if(!nvs.length&&!das.length)return;
var tot=nvs.length,ht=nvs.filter(function(n){return /ho[àa]n/i.test(n.Trang_Thai||'')||parseInt(n.Tien_Do_Phan_Tram||0)>=100;}).length;
var dt=nvs.filter(function(n){return /d[aă]ng/i.test(n.Trang_Thai||'');}).length;
var qh=nvs.filter(function(n){var d=n.Han_Chot?new Date(n.Han_Chot):null;if(!d||isNaN(d))return false;d.setHours(0,0,0,0);return d<_t3&&!/ho[àa]n/i.test(n.Trang_Thai||'');}).length;
var tl=tot?Math.round(ht/tot*100):0;
var kpDT=nvs.reduce(function(s,n){return s+(parseFloat(String(n.Kinh_Phi_Du_Toan_NV||'').replace(/,/g,''))||0);},0);
var kpGN=nvs.reduce(function(s,n){return s+(parseFloat(String(n.Kinh_Phi_Da_Giai_Ngan_NV||'').replace(/,/g,''))||0);},0);
rows.push([dv.Ten_Don_Vi||id,das.length,tot,ht,dt,qh,tl+'%',Math.round(kpDT),Math.round(kpGN)]);
});
var csv=[h.join(',')].concat(rows.map(function(r){return r.map(function(v){return '"'+String(v||'').replace(/"/g,'""')+'"';}).join(',');})).join('\n');
var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob);
var a=document.createElement('a');a.href=url;a.download='ThongKe_'+new Date().toISOString().slice(0,10)+'.csv';
a.style.display='none';document.body.appendChild(a);a.click();
setTimeout(function(){if(a.parentNode)a.parentNode.removeChild(a);URL.revokeObjectURL(url);},300);
toast('Đã xuất báo cáo thống kê!','success');
}
