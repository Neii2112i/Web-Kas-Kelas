/* =========================================================================
   KAS KELAS — script.js
   HTML + CSS + Vanilla JavaScript (localStorage, GSAP + ScrollTrigger,
   Lenis Smooth Scroll, QRCode.js, Lucide Icons)
   ========================================================================= */

/* =========================================================================
   KONFIGURASI UTAMA — SILAKAN UBAH SESUAI KEBUTUHAN KELAS ANDA
   =========================================================================
   1. BENDAHARA_WA_DEFAULT : Nomor WhatsApp Bendahara (format internasional
                             tanpa tanda '+' atau spasi, awali dengan 62).
                             Contoh: '6281234567890'
   2. DEFAULT_PASSWORD     : Password / PIN awal untuk membuka Panel Bendahara.
                             Contoh: 'kas2026'
                             (Bendahara juga bisa mengganti Nomor WA & Password
                             langsung lewat menu Pengaturan di dalam aplikasi).
   ========================================================================= */
const CONFIG = {
  BENDAHARA_WA_DEFAULT: '6281234567890', // <-- GANTI NOMOR WA BENDAHARA DI SINI
  DEFAULT_PASSWORD: 'kas2026',           // <-- GANTI PASSWORD DEFAULT DI SINI
  CLASS_NAME_DEFAULT: 'XE 3',
  WEEKLY_FEE: 5000,                      // Nominal kas per minggu (Rp 5.000)
  STORAGE_KEY: 'kas_kelas_app_v1',
  AUTH_KEY: 'kas_kelas_auth_v1',
  MAX_LOGIN_ATTEMPTS: 3,                 // Batas salah password sebelum cooldown
  COOLDOWN_SECONDS: 20,                  // Durasi cooldown (detik) saat salah 3x
  AUTO_LOCK_MINUTES: 25                  // Kunci otomatis jika tidak aktif (menit)
};

/* ---------- Kategori Pengeluaran ---------- */
const EXPENSE_CATEGORIES = {
  atk:        { label: 'ATK & Fotokopi',        icon: 'pen-tool',        color: '#4FA9A0', bg: '#DDF0ED' },
  kebersihan: { label: 'Kebersihan Kelas',      icon: 'sparkles',        color: '#5E9C6E', bg: '#E3EEE4' },
  acara:      { label: 'Acara & Konsumsi',      icon: 'party-popper',    color: '#E07A48', bg: '#FDE6D6' },
  sosial:     { label: 'Dana Sosial & Kasih',   icon: 'heart-handshake', color: '#D2634A', bg: '#FBE3DC' },
  dekorasi:   { label: 'Dekorasi & Inventaris', icon: 'palette',         color: '#B58918', bg: '#FFF5D6' },
  lainnya:    { label: 'Keperluan Lainnya',     icon: 'package',         color: '#6C7D75', bg: '#EAEFE9' }
};

/* ---------- Palet Warna Avatar Siswa ---------- */
const AVATAR_PALETTES = [
  { bg: '#DDF0ED', fg: '#236862' },
  { bg: '#E3EEE4', fg: '#3B6A49' },
  { bg: '#FDE6D6', fg: '#9D4F27' },
  { bg: '#FFF3C9', fg: '#85620A' },
  { bg: '#E5E9F8', fg: '#394B8C' },
  { bg: '#F7E2EE', fg: '#8B3B68' }
];

/* ---------- State Aplikasi ---------- */
let state = null;
let authState = null;
let currentPanel = 'siswa';
let isAdminUnlocked = false;
let cooldownTimer = null;
let idleTimer = null;
let lenisInstance = null;
let confirmCallback = null;
let isNavClickScrolling = false;
let navClickScrollTimer = null;

/* ---------- State Bento & Interactive Landing ---------- */
let activeBentoSlide = 0;
let bentoAutoTimer = null;
let activePerfPeriod = 'all';
const BENTO_SLIDE_META = [
  { kicker: 'SLIDE 01 · STATUS KELUNASAN', title: 'Siswa Lunas & Tag Disiplin' },
  { kicker: 'SLIDE 02 · GRAFIK MINGGUAN',  title: 'Persentase Lunas per Minggu' },
  { kicker: 'SLIDE 03 · TREN GELOMBANG',   title: 'Arus Kas Masuk Mingguan' }
];

/* =========================================================================
   1. UTILITAS & FORMATTER
   ========================================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function formatRupiah(num) {
  const n = Math.round(Number(num) || 0);
  const sign = n < 0 ? '-' : '';
  return sign + 'Rp ' + Math.abs(n).toLocaleString('id-ID');
}

function formatRupiahCompact(num) {
  const n = Math.round(Number(num) || 0);
  const sign = n < 0 ? '-' : '+';
  const abs = Math.abs(n);
  if (abs >= 1000000) {
    const jt = (abs / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 1).replace('.', ',');
    return `${sign}Rp ${jt}jt`;
  }
  if (abs >= 1000) {
    return `${sign}Rp ${Math.round(abs / 1000)}rb`;
  }
  return `${sign}Rp ${abs}`;
}

function formatNumber(num) {
  return Math.round(Number(num) || 0).toLocaleString('id-ID');
}

function formatDateID(isoStr, short = false) {
  if (!isoStr) return '-';
  const parts = String(isoStr).split('-');
  if (parts.length !== 3) return isoStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return isoStr;
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthsLong = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${d.getDate()} ${short ? monthsShort[d.getMonth()] : monthsLong[d.getMonth()]} ${d.getFullYear()}`;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('8')) digits = '62' + digits;
  return digits;
}

function formatPhoneDisplay(phone) {
  const p = normalizePhone(phone);
  if (!p) return '-';
  return '+' + p.replace(/^(\d{2})(\d{3,4})(\d{4})(\d+)$/, '$1 $2-$3-$4');
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarStyle(idOrName) {
  let hash = 0;
  const s = String(idOrName || '');
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const pal = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  return `background:${pal.bg};color:${pal.fg};`;
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function simpleHash(str) {
  const salted = `kasKelasSalt::${str}::2026`;
  let h1 = 0xdeadbeef ^ salted.length;
  let h2 = 0x41c6ce57 ^ salted.length;
  for (let i = 0; i < salted.length; i++) {
    const ch = salted.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'h$' + (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

const FALLBACK_ICON_PATHS = {
  'wallet': '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  'qr-code': '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'lock-open': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  'lock-keyhole': '<circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/>',
  'sparkles': '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'eye': '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  'check-circle-2': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'
};

function refreshIcons(root = document) {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try {
      window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
    } catch (e) {
      console.warn('Lucide createIcons warning:', e);
    }
  }
  $$('i[data-lucide]', root).forEach(el => {
    const name = (el.getAttribute('data-lucide') || '').toLowerCase();
    const inner = FALLBACK_ICON_PATHS[name] || FALLBACK_ICON_PATHS['sparkles'];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', `lucide lucide-${name}`);
    svg.innerHTML = inner;
    el.replaceWith(svg);
  });
}

function showToast(message, type = 'info') {
  const stack = $('#toastStack');
  if (!stack) return;
  const iconMap = {
    success: 'check-circle-2',
    error: 'alert-circle',
    warn: 'alert-triangle',
    info: 'sparkles'
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i data-lucide="${iconMap[type] || 'sparkles'}"></i><span>${escapeHTML(message)}</span>`;
  stack.appendChild(el);
  refreshIcons(el);

  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 360);
  }, 3200);
}

/* =========================================================================
   2. DATA AWAL (18 SISWA, 8 MINGGU, RIWAYAT PENGELUARAN) & LOCALSTORAGE
   ========================================================================= */
function buildDemoData() {
  const weeks = [
    { id: 'w1', label: 'Minggu 1', date: '2026-01-05' },
    { id: 'w2', label: 'Minggu 2', date: '2026-01-12' },
    { id: 'w3', label: 'Minggu 3', date: '2026-01-19' },
    { id: 'w4', label: 'Minggu 4', date: '2026-01-26' },
    { id: 'w5', label: 'Minggu 5', date: '2026-02-02' },
    { id: 'w6', label: 'Minggu 6', date: '2026-02-09' },
    { id: 'w7', label: 'Minggu 7', date: '2026-02-16' },
    { id: 'w8', label: 'Minggu 8', date: '2026-02-23' }
  ];

  const rawStudents = [
    { id: 's01', name: 'Alya Putri Ramadhani',  phone: '6281234500001', paidWeeks: 8, onTimeOffset: 0 },
    { id: 's02', name: 'Bagas Pratama Wijaya',  phone: '6281234500002', paidWeeks: 8, onTimeOffset: 1 },
    { id: 's03', name: 'Citra Kirana Lestari',  phone: '6281234500003', paidWeeks: 8, onTimeOffset: 0 },
    { id: 's04', name: 'Dimas Arya Saputra',    phone: '6281234500004', paidWeeks: 6, onTimeOffset: 2 },
    { id: 's05', name: 'Eka Nabila Azzahra',    phone: '6281234500005', paidWeeks: 8, onTimeOffset: 0 },
    { id: 's06', name: 'Fajar Nugroho Hidayat', phone: '6281234500006', paidWeeks: 5, onTimeOffset: 3 },
    { id: 's07', name: 'Gita Permata Sari',     phone: '6281234500007', paidWeeks: 8, onTimeOffset: 1 },
    { id: 's08', name: 'Hafiz Maulana Akbar',   phone: '6281234500008', paidWeeks: 7, onTimeOffset: 1 },
    { id: 's09', name: 'Indah Cahyani Putri',   phone: '6281234500009', paidWeeks: 8, onTimeOffset: 0 },
    { id: 's10', name: 'Joko Susilo Wibowo',    phone: '6281234500010', paidWeeks: 4, onTimeOffset: 5 },
    { id: 's11', name: 'Karina Maharani',       phone: '6281234500011', paidWeeks: 8, onTimeOffset: 2 },
    { id: 's12', name: 'Luthfi Hakim Prasetyo', phone: '6281234500012', paidWeeks: 6, onTimeOffset: 2 },
    { id: 's13', name: 'Maya Safitri Ningrum',  phone: '6281234500013', paidWeeks: 8, onTimeOffset: 0 },
    { id: 's14', name: 'Naufal Rizky Aditya',   phone: '6281234500014', paidWeeks: 7, onTimeOffset: 1 },
    { id: 's15', name: 'Olivia Natasya',        phone: '6281234500015', paidWeeks: 8, onTimeOffset: 1 },
    { id: 's16', name: 'Pandu Satria Utama',    phone: '6281234500016', paidWeeks: 5, onTimeOffset: 4 },
    { id: 's17', name: 'Qori Aulia Rahma',      phone: '6281234500017', paidWeeks: 8, onTimeOffset: 0 },
    { id: 's18', name: 'Raka Danuarta',         phone: '6281234500018', paidWeeks: 6, onTimeOffset: 2 }
  ];

  const students = rawStudents.map(st => ({
    id: st.id,
    name: st.name,
    phone: st.phone
  }));

  const payments = {};
  rawStudents.forEach(st => {
    payments[st.id] = {};
    for (let i = 0; i < st.paidWeeks; i++) {
      const wk = weeks[i];
      const baseDate = new Date(wk.date + 'T08:00:00');
      baseDate.setDate(baseDate.getDate() + st.onTimeOffset);
      payments[st.id][wk.id] = baseDate.toISOString().slice(0, 10);
    }
  });

  const expenses = [
    {
      id: 'e1',
      amount: 35000,
      purpose: 'Spidol Snowman 4 pcs + Tinta Refill Papan Tulis',
      date: '2026-01-14',
      category: 'atk'
    },
    {
      id: 'e2',
      amount: 45000,
      purpose: 'Sapu Ijuk, Pengki & Pengharum Ruangan Kelas',
      date: '2026-01-24',
      category: 'kebersihan'
    },
    {
      id: 'e3',
      amount: 25000,
      purpose: 'Fotokopi Kisi-Kisi & Lembar Latihan Ujian',
      date: '2026-02-04',
      category: 'atk'
    },
    {
      id: 'e4',
      amount: 60000,
      purpose: 'Konsumsi Rapat Kerja Kelompok & Dekorasi Mading',
      date: '2026-02-14',
      category: 'acara'
    },
    {
      id: 'e5',
      amount: 50000,
      purpose: 'Buah tangan menjenguk teman kelas yang sakit',
      date: '2026-02-20',
      category: 'sosial'
    }
  ];

  return {
    settings: {
      className: CONFIG.CLASS_NAME_DEFAULT,
      bendaharaWa: '',
      weeklyFee: CONFIG.WEEKLY_FEE
    },
    students,
    weeks,
    payments,
    expenses,
    updatedAt: new Date().toISOString()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.weeks)) {
        parsed.settings = Object.assign({
          className: CONFIG.CLASS_NAME_DEFAULT,
          bendaharaWa: '',
          weeklyFee: CONFIG.WEEKLY_FEE
        }, parsed.settings || {});
        if (parsed.settings.className === 'XI RPL 1') {
          parsed.settings.className = CONFIG.CLASS_NAME_DEFAULT;
        }
        parsed.payments = parsed.payments || {};
        parsed.expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
        state = parsed;
        return;
      }
    }
  } catch (err) {
    console.warn('Gagal memuat data localStorage, menggunakan data awal:', err);
  }
  state = buildDemoData();
  saveState(false);
}

function saveState(touchTimestamp = true) {
  if (touchTimestamp) {
    state.updatedAt = new Date().toISOString();
  }
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Gagal menyimpan ke localStorage:', err);
    showToast('Gagal menyimpan data ke localStorage.', 'error');
  }
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(CONFIG.AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const now = Date.now();
        const lockUntil = Number(parsed.lockUntil) || 0;
        authState = {
          customHash: parsed.customHash || null,
          failedAttempts: lockUntil > now ? (Number(parsed.failedAttempts) || 0) : 0,
          lockUntil: lockUntil > now ? lockUntil : 0
        };
        return;
      }
    }
  } catch (e) {
    console.warn('Auth storage reset:', e);
  }
  authState = { customHash: null, failedAttempts: 0, lockUntil: 0 };
  saveAuth();
}

function saveAuth() {
  try {
    localStorage.setItem(CONFIG.AUTH_KEY, JSON.stringify(authState));
  } catch (e) {
    console.warn('Gagal menyimpan authState:', e);
  }
}

function verifyPassword(inputPw) {
  const clean = String(inputPw ?? '').trim();
  if (!clean) return false;
  if (clean.toLowerCase() === CONFIG.DEFAULT_PASSWORD.toLowerCase()) {
    return true;
  }
  if (authState && authState.customHash) {
    return simpleHash(clean) === authState.customHash;
  }
  return false;
}

function getActiveWaNumber() {
  const custom = normalizePhone(state?.settings?.bendaharaWa || '');
  return custom || normalizePhone(CONFIG.BENDAHARA_WA_DEFAULT);
}

function getFee() {
  return Number(state?.settings?.weeklyFee) || CONFIG.WEEKLY_FEE;
}

/* =========================================================================
   3. KALKULASI STATISTIK & STATUS PEMBAYARAN
   ========================================================================= */
function isStudentPaidWeek(studentId, weekId) {
  return Boolean(state.payments?.[studentId]?.[weekId]);
}

function getStudentUnpaidWeeks(studentId) {
  return state.weeks.filter(w => !isStudentPaidWeek(studentId, w.id));
}

function getStudentPaidWeeks(studentId) {
  return state.weeks.filter(w => isStudentPaidWeek(studentId, w.id));
}

function computeSummary() {
  const fee = getFee();
  const totalStudents = state.students.length;
  const totalWeeks = state.weeks.length;

  let paidCheckCount = 0;
  let lunasStudentsCount = 0;
  const arrearsStudents = [];
  const lunasStudents = [];

  state.students.forEach(stu => {
    const unpaid = [];
    let paidCount = 0;
    state.weeks.forEach(wk => {
      if (isStudentPaidWeek(stu.id, wk.id)) {
        paidCount++;
        paidCheckCount++;
      } else {
        unpaid.push(wk);
      }
    });

    if (totalWeeks > 0 && unpaid.length === 0) {
      lunasStudentsCount++;
      lunasStudents.push(stu);
    }
    if (unpaid.length > 0) {
      arrearsStudents.push({
        student: stu,
        unpaidWeeks: unpaid,
        unpaidCount: unpaid.length,
        paidCount,
        totalDebt: unpaid.length * fee
      });
    }
  });

  arrearsStudents.sort((a, b) => b.unpaidCount - a.unpaidCount || a.student.name.localeCompare(b.student.name));

  const totalIncome = paidCheckCount * fee;
  const totalExpense = state.expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const balance = totalIncome - totalExpense;
  const totalExpected = totalStudents * totalWeeks * fee;
  const totalDebt = Math.max(0, totalExpected - totalIncome);

  // Statistik per minggu (untuk Bento Chart)
  const weeklyStats = state.weeks.map(wk => {
    let paid = 0;
    state.students.forEach(s => {
      if (isStudentPaidWeek(s.id, wk.id)) paid++;
    });
    const pct = totalStudents > 0 ? Math.round((paid / totalStudents) * 100) : 0;
    return {
      week: wk,
      paidCount: paid,
      totalStudents,
      pct,
      nominal: paid * fee
    };
  });

  // Target Minggu Ini (minggu paling akhir)
  const latestWeek = totalWeeks > 0 ? state.weeks[totalWeeks - 1] : null;
  let latestWeekPaidCount = 0;
  if (latestWeek) {
    state.students.forEach(stu => {
      if (isStudentPaidWeek(stu.id, latestWeek.id)) latestWeekPaidCount++;
    });
  }
  const weekTargetNominal = totalStudents * fee;
  const weekCollectedNominal = latestWeekPaidCount * fee;
  const weekPct = weekTargetNominal > 0 ? Math.round((weekCollectedNominal / weekTargetNominal) * 100) : 0;

  // Target Bulan Ini (4 minggu terakhir)
  const monthWeeks = state.weeks.slice(-4);
  let monthPaidChecks = 0;
  monthWeeks.forEach(wk => {
    state.students.forEach(stu => {
      if (isStudentPaidWeek(stu.id, wk.id)) monthPaidChecks++;
    });
  });
  const monthTargetNominal = totalStudents * monthWeeks.length * fee;
  const monthCollectedNominal = monthPaidChecks * fee;
  const monthPct = monthTargetNominal > 0 ? Math.round((monthCollectedNominal / monthTargetNominal) * 100) : 0;

  return {
    fee,
    totalStudents,
    totalWeeks,
    paidCheckCount,
    lunasStudentsCount,
    lunasStudents,
    arrearsStudents,
    weeklyStats,
    totalIncome,
    totalExpense,
    balance,
    totalExpected,
    totalDebt,
    latestWeek,
    latestWeekPaidCount,
    weekTargetNominal,
    weekCollectedNominal,
    weekPct,
    monthWeeks,
    monthPaidChecks,
    monthTargetNominal,
    monthCollectedNominal,
    monthPct
  };
}

function computeLeaderboard() {
  const totalWeeks = state.weeks.length;
  const fee = getFee();

  const ranked = state.students.map(stu => {
    let paidCount = 0;
    let onTimeCount = 0;
    let totalDelayDays = 0;

    state.weeks.forEach(wk => {
      const paidVal = state.payments?.[stu.id]?.[wk.id];
      if (paidVal) {
        paidCount++;
        if (typeof paidVal === 'string' && wk.date) {
          const dWeek = new Date(wk.date + 'T00:00:00');
          const dPaid = new Date(paidVal + 'T00:00:00');
          const diffDays = Math.max(0, Math.round((dPaid - dWeek) / 86400000));
          totalDelayDays += diffDays;
          if (diffDays <= 7) onTimeCount++;
        } else {
          onTimeCount++;
        }
      }
    });

    const isAllPaid = totalWeeks > 0 && paidCount === totalWeeks;
    const score = paidCount * 100 + onTimeCount * 15 - Math.min(totalDelayDays, 60);

    return {
      student: stu,
      paidCount,
      onTimeCount,
      totalWeeks,
      totalPaidNominal: paidCount * fee,
      isAllPaid,
      score
    };
  });

  ranked.sort((a, b) => {
    if (b.isAllPaid !== a.isAllPaid) return b.isAllPaid ? 1 : -1;
    if (b.score !== a.score) return b.score - a.score;
    return a.student.name.localeCompare(b.student.name);
  });

  return ranked;
}

/* =========================================================================
   4. RENDER PANEL SISWA & PANEL BENDAHARA
   ========================================================================= */
const numberCache = new Map();

function animateNumber(el, newValue, formatter = formatRupiah) {
  if (!el) return;
  const prev = numberCache.get(el);
  numberCache.set(el, newValue);

  if (prev === undefined || prev === newValue || !window.gsap) {
    el.textContent = formatter(newValue);
    return;
  }

  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');

  const obj = { val: prev };
  window.gsap.to(obj, {
    val: newValue,
    duration: 0.75,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = formatter(Math.round(obj.val));
    }
  });
}

function renderAll(options = {}) {
  const summary = computeSummary();
  renderBindings();
  renderHeroStats(summary);
  renderBentoDashboard(summary);
  renderBigRollingCounters(summary);
  renderArrearsSection(summary);
  renderPaySection(summary, options.preservePaySelection);
  renderLeaderboardSection(summary);
  renderExpensesPublic(summary);

  // Admin panel sections
  renderAdminStats(summary);
  renderKasTable(summary);
  renderStudentCards(summary);
  renderAdminExpenses(summary);
  renderSettingsInfo(summary);

  refreshIcons();
}

function renderBindings() {
  const className = state.settings.className || CONFIG.CLASS_NAME_DEFAULT;
  $$('[data-bind="className"]').forEach(el => {
    el.textContent = className;
  });
  const yearEl = $('#footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  const waTarget = $('#waTarget');
  if (waTarget) waTarget.textContent = formatPhoneDisplay(getActiveWaNumber());
}

function renderHeroStats(summary) {
  animateNumber($('#statSaldo'), summary.balance, formatRupiah);
  animateNumber($('#statIncome'), summary.totalIncome, formatRupiah);
  animateNumber($('#statExpense'), summary.totalExpense, formatRupiah);

  const lunasEl = $('#statLunas');
  if (lunasEl) lunasEl.textContent = `${summary.lunasStudentsCount}/${summary.totalStudents}`;

  const updatedEl = $('#statUpdated');
  if (updatedEl) {
    const dt = state.updatedAt ? new Date(state.updatedAt) : new Date();
    const timeStr = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    updatedEl.textContent = `Diperbarui ${timeStr} WIB · Iuran ${formatRupiah(summary.fee)}/minggu`;
  }

  const incSub = $('#statIncomeSub');
  if (incSub) incSub.textContent = `${summary.paidCheckCount} setoran terkumpul dari ${summary.totalWeeks} minggu`;

  const expSub = $('#statExpenseSub');
  if (expSub) expSub.textContent = `${state.expenses.length} transaksi tercatat transparan`;

  const lunSub = $('#statLunasSub');
  if (lunSub) {
    const menunggak = summary.totalStudents - summary.lunasStudentsCount;
    lunSub.textContent = menunggak === 0
      ? 'Semua siswa sudah lunas 100%!'
      : `${menunggak} siswa masih memiliki tunggakan`;
  }

  // Progress bar mingguan
  const wkLabel = $('#weekTargetLabel');
  const wkPct = $('#weekTargetPct');
  const wkBar = $('#weekTargetBar');
  const wkCap = $('#weekTargetCaption');
  if (summary.latestWeek) {
    if (wkLabel) wkLabel.textContent = `${summary.latestWeek.label} (${formatDateID(summary.latestWeek.date, true)})`;
    if (wkPct) wkPct.textContent = `${summary.weekPct}%`;
    if (wkBar) wkBar.style.width = `${Math.min(100, summary.weekPct)}%`;
    if (wkCap) {
      wkCap.textContent = `${formatRupiah(summary.weekCollectedNominal)} dari target ${formatRupiah(summary.weekTargetNominal)} (${summary.latestWeekPaidCount}/${summary.totalStudents} siswa lunas)`;
    }
  } else {
    if (wkLabel) wkLabel.textContent = 'Belum ada jadwal minggu';
    if (wkPct) wkPct.textContent = '0%';
    if (wkBar) wkBar.style.width = '0%';
    if (wkCap) wkCap.textContent = 'Tambahkan kolom minggu di Panel Bendahara.';
  }

  // Progress bar bulanan (4 minggu terakhir)
  const moLabel = $('#monthTargetLabel');
  const moPct = $('#monthTargetPct');
  const moBar = $('#monthTargetBar');
  const moCap = $('#monthTargetCaption');
  if (summary.monthWeeks.length > 0) {
    const firstW = summary.monthWeeks[0];
    const lastW = summary.monthWeeks[summary.monthWeeks.length - 1];
    if (moLabel) moLabel.textContent = `${firstW.label} – ${lastW.label} (${summary.monthWeeks.length} minggu)`;
    if (moPct) moPct.textContent = `${summary.monthPct}%`;
    if (moBar) moBar.style.width = `${Math.min(100, summary.monthPct)}%`;
    if (moCap) {
      moCap.textContent = `${formatRupiah(summary.monthCollectedNominal)} terkumpul dari target ${formatRupiah(summary.monthTargetNominal)}`;
    }
  } else {
    if (moLabel) moLabel.textContent = 'Belum ada periode aktif';
    if (moPct) moPct.textContent = '0%';
    if (moBar) moBar.style.width = '0%';
    if (moCap) moCap.textContent = '-';
  }
}

/* =========================================================================
   4B. RENDER BENTO DASHBOARD (3 SLIDE AUTO-SWITCH + PERFORMA FILTER)
   ========================================================================= */
function renderBentoDashboard(summary) {
  renderBentoSlide1Pills(summary, false);
  renderBentoSlide2Bars(summary);
  renderBentoSlide3Wavy(summary);
  renderBentoPerformanceRight(summary);
}

function renderBentoSlide1Pills(summary, animateDrop = false) {
  const arena = $('#fallingPillsArena');
  if (!arena) return;

  const statusTags = [
    { text: '#Lunas100%', cls: 'fp-dark' },
    { text: '#PalingRajin', cls: 'fp-butter' },
    { text: '#TepatWaktu', cls: 'fp-teal' },
    { text: '#KasTransparan', cls: 'fp-sage' },
    { text: '#Rp5.000/Mgg', cls: 'fp-peach' }
  ];

  const colorClasses = ['fp-sage', 'fp-teal', 'fp-butter', 'fp-peach'];
  const studentPills = summary.lunasStudents.slice(0, 9).map((stu, idx) => {
    const shortName = stu.name.split(/\s+/).slice(0, 2).join(' ');
    return {
      text: `✓ ${shortName}`,
      cls: colorClasses[idx % colorClasses.length]
    };
  });

  const combined = [...statusTags, ...studentPills];
  arena.innerHTML = combined.map((item, i) => {
    const rot = ((i % 5) - 2) * 2.4;
    return `<span class="fall-pill ${item.cls}" data-rot="${rot}" style="transform:rotate(${rot}deg)">${escapeHTML(item.text)}</span>`;
  }).join('');

  if (animateDrop) {
    animateFallingPills();
  }
}

function animateFallingPills() {
  const pills = $$('#fallingPillsArena .fall-pill');
  if (!pills.length || !window.gsap) return;

  window.gsap.killTweensOf(pills);
  window.gsap.fromTo(
    pills,
    {
      y: -150,
      autoAlpha: 0,
      scale: 0.7,
      rotation: () => (Math.random() - 0.5) * 32
    },
    {
      y: 0,
      autoAlpha: 1,
      scale: 1,
      rotation: (i, target) => Number(target.dataset.rot) || 0,
      duration: 0.85,
      stagger: 0.045,
      ease: 'bounce.out'
    }
  );
}

function renderBentoSlide2Bars(summary) {
  const box = $('#bentoHorizBars');
  const avgBadge = $('#bentoAvgPaidBadge');
  if (!box) return;

  const recentWeeks = summary.weeklyStats.slice(-5);
  if (recentWeeks.length === 0) {
    box.innerHTML = `<div class="muted">Belum ada data minggu.</div>`;
    if (avgBadge) avgBadge.textContent = 'Rata-rata 0%';
    return;
  }

  const barGradients = [
    'linear-gradient(90deg, #8DB596, #4FA9A0)',
    'linear-gradient(90deg, #FFE39A, #F4AE85)',
    'linear-gradient(90deg, #74BFB7, #3E9A93)',
    'linear-gradient(90deg, #9AC4A3, #5E9C6E)',
    'linear-gradient(90deg, #F6BC98, #E07A48)'
  ];

  const avgPct = Math.round(
    recentWeeks.reduce((acc, w) => acc + w.pct, 0) / recentWeeks.length
  );
  if (avgBadge) avgBadge.textContent = `Rata-rata ${avgPct}% Lunas`;

  box.innerHTML = recentWeeks.map((item, idx) => {
    const bg = barGradients[idx % barGradients.length];
    return `
      <div class="hbar-row">
        <span class="hbar-label" title="${escapeHTML(item.week.label)}">${escapeHTML(item.week.label)}</span>
        <div class="hbar-track">
          <div class="hbar-fill" style="width:${item.pct}%;background:${bg}"></div>
        </div>
        <span class="hbar-pct">${item.pct}%</span>
      </div>
    `;
  }).join('');
}

function buildSmoothSvgPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
    const cpy1 = p0.y;
    const cpx2 = p0.x + (p1.x - p0.x) * 0.55;
    const cpy2 = p1.y;
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function renderBentoSlide3Wavy(summary) {
  const svg = $('#bentoWavySvg');
  const tooltip = $('#bentoWaveTooltip');
  const peakBadge = $('#bentoPeakWeekBadge');
  if (!svg) return;

  const stats = summary.weeklyStats;
  if (stats.length === 0) {
    svg.innerHTML = '';
    if (tooltip) tooltip.textContent = 'Belum ada data';
    return;
  }

  const width = 520;
  const height = 200;
  const padX = 32;
  const padTop = 36;
  const padBottom = 28;
  const usableW = width - padX * 2;
  const usableH = height - padTop - padBottom;

  const maxNom = Math.max(...stats.map(s => s.nominal), summary.fee * Math.max(1, summary.totalStudents));
  const points = stats.map((s, idx) => {
    const x = stats.length === 1 ? width / 2 : padX + (idx / (stats.length - 1)) * usableW;
    const ratio = maxNom > 0 ? s.nominal / maxNom : 0;
    const y = padTop + usableH - ratio * usableH;
    return { x: Math.round(x), y: Math.round(y), stat: s };
  });

  const linePath = buildSmoothSvgPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z`;

  // Cari minggu puncak
  let peakIdx = 0;
  points.forEach((p, idx) => {
    if (p.stat.nominal >= points[peakIdx].stat.nominal) peakIdx = idx;
  });
  const peakPoint = points[peakIdx];
  if (peakBadge && peakPoint) {
    peakBadge.textContent = `Puncak: ${peakPoint.stat.week.label} (${formatRupiah(peakPoint.stat.nominal)})`;
  }

  const circlesHTML = points.map((p, idx) => `
    <g class="wavy-node" data-idx="${idx}">
      <circle cx="${p.x}" cy="${p.y}" r="11" fill="rgba(79,169,160,0.18)" />
      <circle class="wavy-point" cx="${p.x}" cy="${p.y}" r="5.5" fill="#FFFFFF" stroke="#2F7F78" stroke-width="3"
        data-label="${escapeHTML(p.stat.week.label)}"
        data-nominal="${p.stat.nominal}"
        data-paid="${p.stat.paidCount}"
        data-x="${p.x}"
        data-y="${p.y}" />
      <text x="${p.x}" y="${height - 2}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#74817A">M${idx + 1}</text>
    </g>
  `).join('');

  svg.innerHTML = `
    <defs>
      <linearGradient id="wavyAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4FA9A0" stop-opacity="0.38" />
        <stop offset="100%" stop-color="#4FA9A0" stop-opacity="0.0" />
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#wavyAreaGrad)" />
    <path d="${linePath}" fill="none" stroke="#2F7F78" stroke-width="3.5" stroke-linecap="round" />
    ${circlesHTML}
  `;

  if (tooltip && peakPoint) {
    updateWavyTooltip(peakPoint.stat.week.label, peakPoint.stat.nominal, peakPoint.stat.paidCount, peakPoint.x);
  }
}

function updateWavyTooltip(label, nominal, paidCount, xCoord) {
  const tooltip = $('#bentoWaveTooltip');
  if (!tooltip) return;
  tooltip.textContent = `${label} · ${formatRupiah(nominal)} (${paidCount} siswa)`;
  const pctLeft = Math.min(82, Math.max(18, (xCoord / 520) * 100));
  tooltip.style.left = `${pctLeft}%`;
}

function setBentoSlide(index, resetTimer = true) {
  const slides = $$('.bento-slide');
  const bars = $$('.bento-bar-btn');
  if (!slides.length) return;

  activeBentoSlide = ((index % slides.length) + slides.length) % slides.length;

  slides.forEach((sl, idx) => {
    sl.classList.toggle('active', idx === activeBentoSlide);
  });

  bars.forEach((btn, idx) => {
    const isActive = idx === activeBentoSlide;
    btn.classList.toggle('active', isActive);
    // Restart CSS keyframe animation on the active indicator bar
    const fill = $('.bento-bar-fill', btn);
    if (fill) {
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.animation = '';
    }
  });

  const meta = BENTO_SLIDE_META[activeBentoSlide] || BENTO_SLIDE_META[0];
  const kickerEl = $('#bentoSlideKicker');
  const titleEl = $('#bentoSlideTitle');
  if (kickerEl) kickerEl.textContent = meta.kicker;
  if (titleEl) titleEl.textContent = meta.title;

  if (activeBentoSlide === 0) {
    animateFallingPills();
  }

  if (resetTimer) {
    restartBentoAutoTimer();
  }
}

function restartBentoAutoTimer() {
  clearInterval(bentoAutoTimer);
  bentoAutoTimer = setInterval(() => {
    if (currentPanel === 'siswa') {
      setBentoSlide(activeBentoSlide + 1, false);
    }
  }, 5500);
}

/* ---------- Kolom Kanan Bento: Ringkasan Performa Kas + Filter Waktu ---------- */
function renderBentoPerformanceRight(summary) {
  const stats = summary.weeklyStats;
  let sliceCount = stats.length;
  let periodName = 'seluruh minggu berjalan';

  if (activePerfPeriod === '1w') {
    sliceCount = 1;
    periodName = '1 minggu terakhir';
  } else if (activePerfPeriod === '1m') {
    sliceCount = 4;
    periodName = '4 minggu (1 bulan) terakhir';
  } else if (activePerfPeriod === '1s') {
    sliceCount = 6;
    periodName = '6 minggu (1 semester) berjalan';
  }

  const selectedStats = stats.slice(-Math.max(1, sliceCount));
  const totalPossibleChecks = selectedStats.length * summary.totalStudents;
  const totalPaidChecks = selectedStats.reduce((acc, s) => acc + s.paidCount, 0);
  const periodIncome = totalPaidChecks * summary.fee;
  const ratePct = totalPossibleChecks > 0 ? Math.round((totalPaidChecks / totalPossibleChecks) * 100) : 0;

  animateNumber($('#perfRateVal'), ratePct, v => `+${v}%`);
  animateNumber($('#perfGrowthVal'), periodIncome, formatRupiahCompact);

  const rateDesc = $('#perfRateDesc');
  if (rateDesc) rateDesc.textContent = `Rata-rata kelunasan siswa pada ${periodName}`;

  const growthDesc = $('#perfGrowthDesc');
  if (growthDesc) growthDesc.textContent = `Total ${formatRupiah(periodIncome)} terkumpul pada ${periodName}`;

  const rateBadge = $('#perfRateBadge');
  if (rateBadge) rateBadge.textContent = `${totalPaidChecks}/${totalPossibleChecks} Setoran`;

  const growthBadge = $('#perfGrowthBadge');
  if (growthBadge) growthBadge.textContent = `+${selectedStats.length} Minggu`;

  // Render SVG Sparklines
  const rateSeries = selectedStats.map(s => s.pct);
  const growthSeries = [];
  let running = 0;
  selectedStats.forEach(s => {
    running += s.nominal;
    growthSeries.push(running);
  });

  drawMiniSparkline($('#perfSpark1'), rateSeries, '#9A7414', 'rgba(154,116,20,0.18)');
  drawMiniSparkline($('#perfSpark2'), growthSeries, '#2F7F78', 'rgba(47,127,120,0.18)');
}

function drawMiniSparkline(svgEl, values, strokeColor, fillColor) {
  if (!svgEl) return;
  const series = values.length >= 2 ? values : [0, ...(values.length ? values : [0])];
  const w = 220;
  const h = 86;
  const padX = 12;
  const padY = 16;
  const minV = Math.min(...series, 0);
  const maxV = Math.max(...series, 1);

  const pts = series.map((v, i) => {
    const x = padX + (i / (series.length - 1)) * (w - padX * 2);
    const norm = maxV > minV ? (v - minV) / (maxV - minV) : 0.5;
    const y = padY + (1 - norm) * (h - padY * 2);
    return { x: Math.round(x), y: Math.round(y) };
  });

  const line = buildSmoothSvgPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${h - 4} L ${pts[0].x} ${h - 4} Z`;
  const last = pts[pts.length - 1];

  svgEl.innerHTML = `
    <path d="${area}" fill="${fillColor}" />
    <path d="${line}" fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" />
    <circle cx="${last.x}" cy="${last.y}" r="8" fill="${fillColor}" />
    <circle cx="${last.x}" cy="${last.y}" r="4.5" fill="#fff" stroke="${strokeColor}" stroke-width="2.5" />
  `;
}

/* =========================================================================
   4C. RENDER BARIS STATISTIK RAKSASA (BIG ROLLING COUNTERS)
   ========================================================================= */
function renderBigRollingCounters(summary) {
  animateNumber($('#bigCounterSaldo'), summary.balance, formatRupiah);
  animateNumber($('#bigCounterSiswa'), summary.totalStudents, v => `${v} Siswa`);
  animateNumber($('#bigCounterTransaksi'), summary.paidCheckCount, v => `${v} Setoran`);

  const saldoBadge = $('#bigSaldoBadge');
  if (saldoBadge) {
    const netPct = summary.totalIncome > 0
      ? Math.max(0, Math.round((summary.balance / summary.totalIncome) * 100))
      : 100;
    saldoBadge.textContent = `${netPct}% Dana Tersimpan`;
  }

  const siswaBadge = $('#bigSiswaBadge');
  if (siswaBadge) {
    siswaBadge.textContent = `${summary.lunasStudentsCount} Siswa Lunas Penuh`;
  }

  const trxBadge = $('#bigTransaksiBadge');
  if (trxBadge) {
    trxBadge.textContent = `Total ${formatRupiah(summary.totalIncome)}`;
  }
}

/* ---------- Daftar Belum Bayar (Tunggakan) ---------- */
function renderArrearsSection(summary) {
  const query = ($('#searchTunggakan')?.value || '').trim().toLowerCase();
  const summaryBox = $('#arrearsSummary');
  const listBox = $('#arrearsList');
  if (!listBox) return;

  if (summaryBox) {
    if (summary.arrearsStudents.length === 0) {
      summaryBox.innerHTML = `
        <span class="chip chip-sage"><i data-lucide="party-popper"></i>Semua Lunas 100%</span>
      `;
    } else {
      summaryBox.innerHTML = `
        <span class="chip chip-peach"><i data-lucide="users"></i>${summary.arrearsStudents.length} Siswa Menunggak</span>
        <span class="chip chip-butter"><i data-lucide="coins"></i>Total Belum Masuk: ${formatRupiah(summary.totalDebt)}</span>
      `;
    }
  }

  const filtered = summary.arrearsStudents.filter(item =>
    item.student.name.toLowerCase().includes(query)
  );

  if (summary.arrearsStudents.length === 0) {
    listBox.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="check-check"></i></div>
        <h4>Luar biasa! Tidak ada tunggakan kas</h4>
        <p>Seluruh siswa di kelas ${escapeHTML(state.settings.className)} sudah melunasi kas hingga minggu terakhir.</p>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    listBox.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="search-x"></i></div>
        <h4>Nama "${escapeHTML(query)}" tidak ditemukan di daftar tunggakan</h4>
        <p>Siswa tersebut mungkin sudah lunas atau coba kata kunci lain.</p>
      </div>
    `;
    return;
  }

  listBox.innerHTML = filtered.map(item => {
    const stu = item.student;
    const initials = getInitials(stu.name);
    const avStyle = getAvatarStyle(stu.id);
    const chipsHTML = item.unpaidWeeks.map(w =>
      `<span class="week-chip" title="${escapeHTML(formatDateID(w.date))}">${escapeHTML(w.label)}</span>`
    ).join('');

    return `
      <article class="arrear-card">
        <div class="arrear-top">
          <div class="avatar" style="${avStyle}">${escapeHTML(initials)}</div>
          <div class="arrear-name">
            <strong>${escapeHTML(stu.name)}</strong>
            <span>Lunas ${item.paidCount} dari ${summary.totalWeeks} minggu</span>
          </div>
          <span class="count-badge" title="Jumlah minggu belum dibayar">${item.unpaidCount}x</span>
        </div>
        <div class="week-chips">${chipsHTML}</div>
        <div class="arrear-bottom">
          <div>
            <small>Total Tunggakan</small>
            <b>${formatRupiah(item.totalDebt)}</b>
            <em>${item.unpaidCount} minggu × ${formatRupiah(summary.fee)}</em>
          </div>
          <button type="button" class="btn btn-sm btn-soft js-pay-for" data-student-id="${escapeHTML(stu.id)}">
            <i data-lucide="qr-code"></i>Bayar Sekarang
          </button>
        </div>
      </article>
    `;
  }).join('');
}

/* ---------- Pilih Nama & Bayar via QR WhatsApp ---------- */
let qrInstance = null;

function renderPaySection(summary, preserveSelection = false) {
  const select = $('#paySelect');
  if (!select) return;

  const previousStudentId = preserveSelection ? select.value : (select.value || '');
  const sortedStudents = [...state.students].sort((a, b) => a.name.localeCompare(b.name));

  let optionsHTML = `<option value="">— Pilih nama siswa (${sortedStudents.length} siswa) —</option>`;
  sortedStudents.forEach(stu => {
    const unpaidCount = getStudentUnpaidWeeks(stu.id).length;
    const statusText = unpaidCount > 0
      ? `Kurang ${unpaidCount} minggu (${formatRupiah(unpaidCount * summary.fee)})`
      : 'Sudah Lunas ✓';
    optionsHTML += `<option value="${escapeHTML(stu.id)}">${escapeHTML(stu.name)} — ${statusText}</option>`;
  });
  select.innerHTML = optionsHTML;

  if (previousStudentId && state.students.some(s => s.id === previousStudentId)) {
    select.value = previousStudentId;
  }

  const hint = $('#payHint');
  if (hint) hint.textContent = `Setiap minggu = ${formatRupiah(summary.fee)} (otomatis menghitung kelipatan)`;

  renderPayWeeksForStudent(select.value);
}

function renderPayWeeksForStudent(studentId, checkedWeekIds = null) {
  const weeksBox = $('#payWeeks');
  if (!weeksBox) return;

  const fee = getFee();
  const student = state.students.find(s => s.id === studentId);

  if (!student) {
    weeksBox.innerHTML = `
      <div class="pay-empty">
        <i data-lucide="hand-coins"></i>
        <div>
          <strong>Pilih namamu terlebih dahulu</strong>
          <div>Rincian minggu yang belum dibayar akan muncul di sini.</div>
        </div>
      </div>
    `;
    updatePaymentCalculation();
    refreshIcons(weeksBox);
    return;
  }

  const unpaidWeeks = getStudentUnpaidWeeks(student.id);

  if (unpaidWeeks.length === 0) {
    weeksBox.innerHTML = `
      <div class="pay-empty success">
        <i data-lucide="party-popper"></i>
        <div>
          <strong>Mantap, ${escapeHTML(student.name)} sudah LUNAS!</strong>
          <div>Semua ${state.weeks.length} minggu kas telah dibayar. Terima kasih sudah disiplin!</div>
        </div>
      </div>
    `;
    updatePaymentCalculation();
    refreshIcons(weeksBox);
    return;
  }

  weeksBox.innerHTML = unpaidWeeks.map(wk => {
    const shouldCheck = checkedWeekIds ? checkedWeekIds.includes(wk.id) : true;
    return `
      <label class="week-option">
        <input type="checkbox" class="js-pay-week-cb" value="${escapeHTML(wk.id)}" ${shouldCheck ? 'checked' : ''} />
        <span class="wo-box">
          <span class="wo-check">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </span>
          <span class="wo-label">${escapeHTML(wk.label)}</span>
          <span class="wo-date">${escapeHTML(formatDateID(wk.date, true))}</span>
          <span class="wo-amt">${formatRupiah(fee)}</span>
        </span>
      </label>
    `;
  }).join('');

  updatePaymentCalculation();
}

function buildWaPaymentMessage(student, selectedWeeks, totalNominal) {
  const className = state.settings.className || CONFIG.CLASS_NAME_DEFAULT;
  const fee = getFee();
  const weekDetails = selectedWeeks
    .map(w => `• ${w.label} (${formatDateID(w.date, true)})`)
    .join('\n');

  return [
    `Halo Bendahara Kas Kelas *${className}* 👋`,
    `Saya ingin konfirmasi pembayaran uang kas:`,
    ``,
    `👤 *Nama:* ${student.name}`,
    `🗓️ *Minggu Dibayar (${selectedWeeks.length} minggu):*`,
    weekDetails,
    `💵 *Rincian:* ${selectedWeeks.length} × ${formatRupiah(fee)}`,
    `💰 *Total Nominal:* *${formatRupiah(totalNominal)}*`,
    ``,
    `Terima kasih! 🙏`
  ].join('\n');
}

function updatePaymentCalculation() {
  const select = $('#paySelect');
  const student = state.students.find(s => s.id === (select?.value || ''));
  const checkedBoxes = $$('.js-pay-week-cb:checked');
  const fee = getFee();

  const selectedWeeks = checkedBoxes
    .map(cb => state.weeks.find(w => w.id === cb.value))
    .filter(Boolean);

  const count = selectedWeeks.length;
  const total = count * fee;

  const countEl = $('#payCount');
  const formulaEl = $('#payFormula');
  const totalEl = $('#payTotal');
  if (countEl) countEl.textContent = `${count} minggu`;
  if (formulaEl) formulaEl.textContent = `${count} × ${formatRupiah(fee)}`;
  animateNumber(totalEl, total, formatRupiah);

  const qrBox = $('#qrBox');
  const qrCaption = $('#qrCaption');
  const btnOpenWa = $('#btnOpenWa');
  const btnCopyMsg = $('#btnCopyMsg');
  const msgPreview = $('#msgPreview');

  if (!student || count === 0) {
    if (qrBox) {
      qrBox.innerHTML = `
        <div class="qr-placeholder">
          <i data-lucide="qr-code"></i>
          <span>${student ? 'Centang minimal 1 minggu untuk membuat QR Code' : 'Pilih nama & minggu untuk membuat QR Code'}</span>
        </div>
      `;
      refreshIcons(qrBox);
    }
    if (qrCaption) {
      qrCaption.innerHTML = student
        ? `Belum ada minggu yang dicentang untuk <b>${escapeHTML(student.name)}</b>.`
        : 'Pilih nama &amp; minggu untuk membuat QR.';
    }
    if (btnOpenWa) {
      btnOpenWa.removeAttribute('href');
      btnOpenWa.classList.add('disabled');
      btnOpenWa.setAttribute('aria-disabled', 'true');
    }
    if (btnCopyMsg) btnCopyMsg.disabled = true;
    if (msgPreview) msgPreview.textContent = 'Pesan konfirmasi akan muncul di sini…';
    return;
  }

  const waNumber = getActiveWaNumber();
  const message = buildWaPaymentMessage(student, selectedWeeks, total);
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

  if (msgPreview) msgPreview.textContent = message;
  if (qrCaption) {
    qrCaption.innerHTML = `Scan QR untuk konfirmasi <b>${escapeHTML(student.name)}</b> sebesar <b>${formatRupiah(total)}</b> (${count} minggu).`;
  }
  if (btnOpenWa) {
    btnOpenWa.href = waUrl;
    btnOpenWa.classList.remove('disabled');
    btnOpenWa.setAttribute('aria-disabled', 'false');
  }
  if (btnCopyMsg) btnCopyMsg.disabled = false;

  if (qrBox) {
    qrBox.innerHTML = '';
    if (typeof window.QRCode === 'function') {
      try {
        qrInstance = new window.QRCode(qrBox, {
          text: waUrl,
          width: 224,
          height: 224,
          colorDark: '#1E2B25',
          colorLight: '#FFFFFF',
          correctLevel: window.QRCode.CorrectLevel.M
        });
      } catch (err) {
        console.error('QRCode error:', err);
        qrBox.innerHTML = `<div class="qr-placeholder"><span>QR siap dibuka lewat tombol WhatsApp di bawah.</span></div>`;
      }
    } else {
      qrBox.innerHTML = `<div class="qr-placeholder"><span>Library QR tidak termuat, gunakan tombol Buka di WhatsApp.</span></div>`;
    }
  }
}

/* ---------- Badge & Leaderboard "Paling Rajin" ---------- */
function renderLeaderboardSection(summary) {
  const listEl = $('#leaderList');
  const sideEl = $('#leaderStats');
  if (!listEl) return;

  const ranked = computeLeaderboard();
  const topList = ranked.slice(0, 7);

  if (topList.length === 0) {
    listEl.innerHTML = `<li class="empty-state">Belum ada data siswa.</li>`;
    return;
  }

  const badgeTitles = [
    { label: 'Teladan Utama', icon: 'crown', cls: 'badge-gold' },
    { label: 'Disiplin Tinggi', icon: 'medal', cls: 'badge-gold' },
    { label: 'Tepat Waktu', icon: 'award', cls: 'badge-gold' }
  ];

  listEl.innerHTML = topList.map((item, idx) => {
    const rankNum = idx + 1;
    const rankClass = rankNum <= 3 ? `rank-${rankNum}` : '';
    const avStyle = getAvatarStyle(item.student.id);
    const initials = getInitials(item.student.name);

    let badgeHTML = '';
    if (item.isAllPaid && idx < 3) {
      const b = badgeTitles[idx];
      badgeHTML = `<span class="badge ${b.cls}"><i data-lucide="${b.icon}"></i>${b.label}</span>`;
    } else if (item.isAllPaid) {
      badgeHTML = `<span class="badge badge-sage"><i data-lucide="badge-check"></i>Lunas 100%</span>`;
    } else {
      badgeHTML = `<span class="badge badge-sage">${item.paidCount}/${item.totalWeeks} mgg</span>`;
    }

    return `
      <li class="leader-item">
        <span class="rank ${rankClass}">${rankNum}</span>
        <div class="avatar avatar-sm" style="${avStyle}">${escapeHTML(initials)}</div>
        <div class="leader-info">
          <strong>${escapeHTML(item.student.name)}</strong>
          <span class="leader-meta">Lunas ${item.paidCount}/${item.totalWeeks} minggu · ${item.onTimeCount}x tepat waktu (${formatRupiah(item.totalPaidNominal)})</span>
        </div>
        ${badgeHTML}
      </li>
    `;
  }).join('');

  if (sideEl) {
    const punctualCount = ranked.filter(r => r.isAllPaid).length;
    const disciplineRate = summary.totalExpected > 0
      ? Math.round((summary.totalIncome / summary.totalExpected) * 100)
      : 0;

    sideEl.innerHTML = `
      <div class="card side-stat">
        <div class="side-icon icon-butter"><i data-lucide="trophy"></i></div>
        <div>
          <b>${punctualCount} Siswa</b>
          <span>Status kas selalu lunas tanpa tunggakan</span>
        </div>
      </div>
      <div class="card side-stat">
        <div class="side-icon icon-teal"><i data-lucide="gauge"></i></div>
        <div>
          <b>${disciplineRate}%</b>
          <span>Tingkat kepatuhan pembayaran kas kelas</span>
        </div>
      </div>
      <div class="card tip-card">
        <i data-lucide="sparkles"></i>
        <p><b>Tips naik peringkat:</b> Bayar kas maksimal 7 hari sejak tanggal minggu berjalan agar tercatat sebagai pembayaran tepat waktu!</p>
      </div>
    `;
  }
}

/* ---------- Buku Pengeluaran Transparan ---------- */
function renderExpensesPublic(summary) {
  const totalEl = $('#expTotal');
  const countEl = $('#expCount');
  const ratioEl = $('#expRatio');
  const barEl = $('#expBar');
  const legendEl = $('#expLegend');
  const listEl = $('#expList');

  animateNumber(totalEl, summary.totalExpense, formatRupiah);
  if (countEl) countEl.textContent = `${state.expenses.length} transaksi`;
  if (ratioEl) {
    const pctUsed = summary.totalIncome > 0
      ? Math.round((summary.totalExpense / summary.totalIncome) * 100)
      : 0;
    ratioEl.textContent = `${pctUsed}% dari total pemasukan`;
  }

  const catTotals = {};
  state.expenses.forEach(exp => {
    const cat = EXPENSE_CATEGORIES[exp.category] ? exp.category : 'lainnya';
    catTotals[cat] = (catTotals[cat] || 0) + (Number(exp.amount) || 0);
  });

  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  if (barEl) {
    if (summary.totalExpense <= 0 || catEntries.length === 0) {
      barEl.innerHTML = `<span style="width:100%;background:var(--line)"></span>`;
    } else {
      barEl.innerHTML = catEntries.map(([catKey, amt]) => {
        const meta = EXPENSE_CATEGORIES[catKey] || EXPENSE_CATEGORIES.lainnya;
        const pct = Math.max(4, Math.round((amt / summary.totalExpense) * 100));
        return `<span style="width:${pct}%;background:${meta.color}" title="${escapeHTML(meta.label)}: ${formatRupiah(amt)}"></span>`;
      }).join('');
    }
  }

  if (legendEl) {
    if (catEntries.length === 0) {
      legendEl.innerHTML = `<li class="muted">Belum ada pengeluaran tercatat.</li>`;
    } else {
      legendEl.innerHTML = catEntries.map(([catKey, amt]) => {
        const meta = EXPENSE_CATEGORIES[catKey] || EXPENSE_CATEGORIES.lainnya;
        return `
          <li>
            <span class="dot" style="background:${meta.color}"></span>
            <span>${escapeHTML(meta.label)}</span>
            <b>${formatRupiah(amt)}</b>
          </li>
        `;
      }).join('');
    }
  }

  if (listEl) {
    if (state.expenses.length === 0) {
      listEl.innerHTML = `
        <li class="empty-state">
          <div class="empty-icon"><i data-lucide="receipt"></i></div>
          <h4>Belum ada pengeluaran kas</h4>
          <p>Seluruh saldo kas masih utuh tersimpan di bendahara.</p>
        </li>
      `;
    } else {
      const sortedExp = [...state.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      listEl.innerHTML = sortedExp.map(exp => {
        const meta = EXPENSE_CATEGORIES[exp.category] || EXPENSE_CATEGORIES.lainnya;
        return `
          <li class="expense-item">
            <div class="exp-icon" style="background:${meta.bg};color:${meta.color}">
              <i data-lucide="${meta.icon}"></i>
            </div>
            <div class="exp-info">
              <strong>${escapeHTML(exp.purpose)}</strong>
              <span>${escapeHTML(meta.label)} · ${escapeHTML(formatDateID(exp.date))}</span>
            </div>
            <span class="exp-amt">− ${formatRupiah(exp.amount)}</span>
          </li>
        `;
      }).join('');
    }
  }
}

/* =========================================================================
   5. RENDER PANEL BENDAHARA (ADMIN)
   ========================================================================= */
function renderAdminStats(summary) {
  animateNumber($('#aSaldo'), summary.balance, formatRupiah);
  animateNumber($('#aIncome'), summary.totalIncome, formatRupiah);
  animateNumber($('#aExpense'), summary.totalExpense, formatRupiah);
  animateNumber($('#aDebt'), summary.totalDebt, formatRupiah);

  const sSub = $('#aSaldoSub');
  if (sSub) sSub.textContent = `${summary.lunasStudentsCount}/${summary.totalStudents} siswa lunas`;
  const iSub = $('#aIncomeSub');
  if (iSub) iSub.textContent = `${summary.paidCheckCount} centang × ${formatRupiah(summary.fee)}`;
  const eSub = $('#aExpenseSub');
  if (eSub) eSub.textContent = `${state.expenses.length} item pengeluaran`;
  const dSub = $('#aDebtSub');
  if (dSub) dSub.textContent = `${summary.arrearsStudents.length} siswa belum lunas`;
}

function buildReminderWaUrl(student, unpaidWeeks) {
  const fee = getFee();
  const totalDebt = unpaidWeeks.length * fee;
  const className = state.settings.className || CONFIG.CLASS_NAME_DEFAULT;
  const listStr = unpaidWeeks.map(w => w.label).join(', ');
  const msg = [
    `Halo *${student.name}* 👋`,
    `Pengingat sopan dari Bendahara Kas Kelas *${className}*:`,
    ``,
    `Tercatat kas kamu masih belum lunas untuk *${unpaidWeeks.length} minggu* (${listStr}) dengan total *${formatRupiah(totalDebt)}* (${unpaidWeeks.length} × ${formatRupiah(fee)}).`,
    ``,
    `Yuk segera dilunasi ya supaya kas kelas kita lancar. Terima kasih banyak! 🙏✨`
  ].join('\n');

  const phone = normalizePhone(student.phone);
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

function renderKasTable(summary) {
  const headEl = $('#kasHead');
  const bodyEl = $('#kasBody');
  const footEl = $('#kasFoot');
  if (!headEl || !bodyEl || !footEl) return;

  const query = ($('#tableSearch')?.value || '').trim().toLowerCase();
  const fee = summary.fee;

  const weekHeadersHTML = state.weeks.map(wk => `
    <th class="th-week" data-week-id="${escapeHTML(wk.id)}">
      <div class="wk-head">
        <span class="wk-label">${escapeHTML(wk.label)}</span>
        <span class="wk-date">${escapeHTML(formatDateID(wk.date, true))}</span>
        <div class="wk-actions">
          <button type="button" class="wk-btn js-week-toggle-all" data-week-id="${escapeHTML(wk.id)}" title="Centang / kosongkan semua siswa di ${escapeHTML(wk.label)}">
            <i data-lucide="check-check"></i>
          </button>
          <button type="button" class="wk-btn js-week-edit" data-week-id="${escapeHTML(wk.id)}" title="Edit kolom minggu">
            <i data-lucide="pencil"></i>
          </button>
          <button type="button" class="wk-btn danger js-week-delete" data-week-id="${escapeHTML(wk.id)}" title="Hapus kolom minggu">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    </th>
  `).join('');

  headEl.innerHTML = `
    <tr>
      <th class="sticky-col th-name">Nama Siswa <span class="muted">(${state.students.length})</span></th>
      ${weekHeadersHTML}
      <th class="th-status">Status &amp; Total</th>
    </tr>
  `;

  const filteredStudents = state.students.filter(s => s.name.toLowerCase().includes(query));

  if (filteredStudents.length === 0) {
    bodyEl.innerHTML = `
      <tr class="empty-row">
        <td colspan="${state.weeks.length + 2}">Tidak ada siswa yang cocok dengan pencarian "${escapeHTML(query)}".</td>
      </tr>
    `;
  } else {
    bodyEl.innerHTML = filteredStudents.map((stu, idx) => {
      const unpaidWeeks = [];
      let paidCount = 0;

      const weekCellsHTML = state.weeks.map(wk => {
        const paid = isStudentPaidWeek(stu.id, wk.id);
        if (paid) paidCount++;
        else unpaidWeeks.push(wk);

        return `
          <td>
            <button
              type="button"
              class="check ${paid ? 'is-checked' : ''} js-toggle-check"
              data-student-id="${escapeHTML(stu.id)}"
              data-week-id="${escapeHTML(wk.id)}"
              aria-pressed="${paid ? 'true' : 'false'}"
              title="${escapeHTML(stu.name)} — ${escapeHTML(wk.label)} (${paid ? 'Sudah bayar ' + formatRupiah(fee) : 'Belum bayar'})">
              <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
          </td>
        `;
      }).join('');

      const avStyle = getAvatarStyle(stu.id);
      const initials = getInitials(stu.name);
      const isLunas = unpaidWeeks.length === 0;
      const tagihBtnHTML = !isLunas
        ? `<a href="${buildReminderWaUrl(stu, unpaidWeeks)}" target="_blank" rel="noopener" class="tagih-btn" title="Tagih ${escapeHTML(stu.name)} via WhatsApp (${unpaidWeeks.length} minggu)"><i data-lucide="message-circle"></i><span>Tagih</span></a>`
        : '';

      const statusHTML = isLunas
        ? `<span class="pill pill-ok">Lunas · ${formatRupiah(paidCount * fee)}</span>`
        : `<span class="pill pill-warn">−${unpaidWeeks.length} mgg (${formatRupiah(unpaidWeeks.length * fee)})</span>`;

      return `
        <tr>
          <td class="sticky-col">
            <div class="name-cell">
              <div class="avatar avatar-sm" style="${avStyle}">${escapeHTML(initials)}</div>
              <span class="nm" title="${escapeHTML(stu.name)}">${idx + 1}. ${escapeHTML(stu.name)}</span>
              ${tagihBtnHTML}
            </div>
          </td>
          ${weekCellsHTML}
          <td>${statusHTML}</td>
        </tr>
      `;
    }).join('');
  }

  const footCellsHTML = state.weeks.map(wk => {
    let count = 0;
    state.students.forEach(s => {
      if (isStudentPaidWeek(s.id, wk.id)) count++;
    });
    return `
      <td>
        <div class="foot-cell">
          <b>${count}/${state.students.length}</b>
          <span>${formatRupiah(count * fee)}</span>
        </div>
      </td>
    `;
  }).join('');

  footEl.innerHTML = `
    <tr>
      <td class="sticky-col foot-label">Total Terkumpul / Minggu</td>
      ${footCellsHTML}
      <td class="foot-total"><b>${formatRupiah(summary.totalIncome)}</b></td>
    </tr>
  `;
}

function renderStudentCards(summary) {
  const grid = $('#studentGrid');
  if (!grid) return;

  const query = ($('#studentSearch')?.value || '').trim().toLowerCase();
  const filtered = state.students.filter(s =>
    s.name.toLowerCase().includes(query) || (s.phone || '').includes(query)
  );

  const addCardHTML = `
    <button type="button" class="student-card add-card js-add-student">
      <span class="add-icon"><i data-lucide="user-plus"></i></span>
      <span>+ Tambah Siswa Baru</span>
    </button>
  `;

  const cardsHTML = filtered.map(stu => {
    const unpaid = getStudentUnpaidWeeks(stu.id);
    const paidCount = state.weeks.length - unpaid.length;
    const isLunas = unpaid.length === 0;
    const avStyle = getAvatarStyle(stu.id);
    const initials = getInitials(stu.name);

    const statusPill = isLunas
      ? `<span class="pill pill-ok">Lunas 100%</span>`
      : `<span class="pill pill-warn">Menunggak ${unpaid.length} mgg</span>`;

    const waBtn = !isLunas
      ? `<a href="${buildReminderWaUrl(stu, unpaid)}" target="_blank" rel="noopener" class="btn btn-xs btn-wa-soft" title="Kirim pengingat WA"><i data-lucide="message-circle"></i>Tagih WA</a>`
      : `<span class="sc-paid">Disiplin ✓</span>`;

    return `
      <article class="student-card">
        <div class="sc-top">
          <div class="avatar" style="${avStyle}">${escapeHTML(initials)}</div>
          <div class="sc-info">
            <strong>${escapeHTML(stu.name)}</strong>
            <span><i data-lucide="phone"></i>${escapeHTML(stu.phone ? formatPhoneDisplay(stu.phone) : 'Nomor WA belum diisi')}</span>
          </div>
        </div>
        <div class="sc-mid">
          ${statusPill}
          <span class="sc-paid">Bayar: <b>${formatRupiah(paidCount * summary.fee)}</b> (${paidCount}/${state.weeks.length})</span>
        </div>
        <div class="sc-actions">
          ${waBtn}
          <span class="spacer"></span>
          <button type="button" class="icon-btn icon-btn-sm js-edit-student" data-student-id="${escapeHTML(stu.id)}" title="Edit data siswa">
            <i data-lucide="pencil"></i>
          </button>
          <button type="button" class="icon-btn icon-btn-sm danger js-delete-student" data-student-id="${escapeHTML(stu.id)}" title="Hapus siswa">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </article>
    `;
  }).join('');

  grid.innerHTML = addCardHTML + cardsHTML;
}

function renderAdminExpenses(summary) {
  const balEl = $('#expFormBalance');
  if (balEl) balEl.textContent = formatRupiah(summary.balance);

  const totalBadge = $('#adminExpTotal');
  if (totalBadge) totalBadge.textContent = `Total: ${formatRupiah(summary.totalExpense)}`;

  const listEl = $('#adminExpList');
  if (!listEl) return;

  if (state.expenses.length === 0) {
    listEl.innerHTML = `
      <li class="empty-state">
        <div class="empty-icon"><i data-lucide="receipt"></i></div>
        <h4>Belum ada pengeluaran</h4>
        <p>Gunakan formulir di samping untuk mencatat penggunaan uang kas.</p>
      </li>
    `;
    return;
  }

  const sorted = [...state.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  listEl.innerHTML = sorted.map(exp => {
    const meta = EXPENSE_CATEGORIES[exp.category] || EXPENSE_CATEGORIES.lainnya;
    return `
      <li class="expense-item">
        <div class="exp-icon" style="background:${meta.bg};color:${meta.color}">
          <i data-lucide="${meta.icon}"></i>
        </div>
        <div class="exp-info">
          <strong>${escapeHTML(exp.purpose)}</strong>
          <span>${escapeHTML(meta.label)} · ${escapeHTML(formatDateID(exp.date))}</span>
        </div>
        <span class="exp-amt">− ${formatRupiah(exp.amount)}</span>
        <button type="button" class="icon-btn icon-btn-sm danger js-delete-expense" data-expense-id="${escapeHTML(exp.id)}" title="Hapus catatan pengeluaran">
          <i data-lucide="trash-2"></i>
        </button>
      </li>
    `;
  }).join('');
}

function renderSettingsInfo(summary) {
  const clsInput = $('#setClassName');
  const waInput = $('#setWa');
  if (clsInput && document.activeElement !== clsInput) {
    clsInput.value = state.settings.className || CONFIG.CLASS_NAME_DEFAULT;
  }
  if (waInput && document.activeElement !== waInput) {
    waInput.value = state.settings.bendaharaWa || '';
    waInput.placeholder = `Default: ${CONFIG.BENDAHARA_WA_DEFAULT}`;
  }

  const pwStatus = $('#pwStatus');
  if (pwStatus) {
    pwStatus.innerHTML = authState.customHash
      ? 'Status: Menggunakan <b>password kustom</b> yang telah diperbarui bendahara.'
      : `Status: Menggunakan password default (<code>${escapeHTML(CONFIG.DEFAULT_PASSWORD)}</code>).`;
  }

  const dataInfo = $('#dataInfo');
  if (dataInfo) {
    dataInfo.innerHTML = `Tersimpan <b>${summary.totalStudents} siswa</b>, <b>${summary.totalWeeks} minggu</b>, <b>${summary.paidCheckCount} centang pembayaran</b>, dan <b>${state.expenses.length} catatan pengeluaran</b> di browser ini.`;
  }
}

/* =========================================================================
   6. KEAMANAN PASSWORD, COOLDOWN & TRANSISI PANEL
   ========================================================================= */
function updateSwitcherIndicator() {
  const switcher = $('#switcher');
  const activeBtn = $(`.switch-btn[data-panel="${currentPanel}"]`);
  const indicator = $('#switchIndicator');
  if (!activeBtn || !indicator) return;
  const w = activeBtn.offsetWidth;
  if (w > 0) {
    switcher?.classList.add('is-ready');
    indicator.style.width = `${w}px`;
    indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
  }
}

function updateNavPillIndicator() {
  const navContainer = currentPanel === 'admin' ? $('#navAdmin') : $('#navSiswa');
  if (!navContainer || navContainer.classList.contains('hidden')) return;

  let indicator = $('.nav-pill-indicator', navContainer);
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'nav-pill-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    navContainer.prepend(indicator);
  }

  const activeLink = $('a.active', navContainer) || $('a', navContainer);
  if (!activeLink || activeLink.offsetWidth === 0) {
    indicator.style.opacity = '0';
    return;
  }

  navContainer.classList.add('is-ready');
  indicator.style.opacity = '1';
  indicator.style.width = `${activeLink.offsetWidth}px`;
  indicator.style.transform = `translateX(${activeLink.offsetLeft}px)`;
}

function setActiveNavLink(linkEl) {
  if (!linkEl) return;
  const navContainer = linkEl.closest('.nav-links');
  if (!navContainer) return;
  $$('a', navContainer).forEach(a => a.classList.toggle('active', a === linkEl));
  updateNavPillIndicator();
}

function switchPanel(targetPanel) {
  if (targetPanel === 'admin' && !isAdminUnlocked) {
    openLoginModal();
    return;
  }

  currentPanel = targetPanel;
  document.body.setAttribute('data-panel', targetPanel);

  $$('.switch-btn').forEach(btn => {
    const active = btn.dataset.panel === targetPanel;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  updateSwitcherIndicator();

  const panelSiswa = $('#panelSiswa');
  const panelAdmin = $('#panelAdmin');
  const navSiswa = $('#navSiswa');
  const navAdmin = $('#navAdmin');
  const btnLock = $('#btnLock');
  const calcFab = $('#calcFab');
  const calc = $('#calc');

  if (targetPanel === 'admin') {
    panelSiswa?.classList.add('hidden');
    panelAdmin?.classList.remove('hidden');
    navSiswa?.classList.add('hidden');
    navAdmin?.classList.remove('hidden');
    btnLock?.classList.remove('hidden');
    calcFab?.classList.remove('hidden');
    resetIdleTimer();

    if (window.gsap) {
      window.gsap.fromTo(panelAdmin, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    }
  } else {
    panelAdmin?.classList.add('hidden');
    panelSiswa?.classList.remove('hidden');
    navAdmin?.classList.add('hidden');
    navSiswa?.classList.remove('hidden');
    btnLock?.classList.add('hidden');
    calcFab?.classList.add('hidden');
    calc?.classList.remove('open');

    if (window.gsap) {
      window.gsap.fromTo(panelSiswa, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    }
  }

  scrollToTop();
  setTimeout(() => {
    updateSwitcherIndicator();
    updateNavPillIndicator();
    initSplitTitles();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }, 80);
}

function lockAdminPanel(reasonMessage = 'Panel Bendahara telah dikunci.') {
  isAdminUnlocked = false;
  clearTimeout(idleTimer);
  switchPanel('siswa');
  showToast(reasonMessage, 'info');
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (!isAdminUnlocked) return;
  idleTimer = setTimeout(() => {
    if (isAdminUnlocked) {
      lockAdminPanel('Panel Bendahara dikunci otomatis karena tidak aktif.');
    }
  }, CONFIG.AUTO_LOCK_MINUTES * 60 * 1000);
}

/* ---------- Modal Login & Cooldown ---------- */
function openLoginModal() {
  const modal = $('#loginModal');
  const input = $('#loginInput');
  const errEl = $('#loginError');
  if (!modal) return;

  if (errEl) errEl.textContent = '';
  if (input) input.value = '';
  renderAttemptDots();
  checkAndStartCooldown();

  openModal(modal);
  setTimeout(() => input?.focus(), 120);
}

function renderAttemptDots() {
  const box = $('#loginAttempts');
  if (!box) return;
  const remaining = Math.max(0, CONFIG.MAX_LOGIN_ATTEMPTS - (authState.failedAttempts || 0));
  let html = '';
  for (let i = 0; i < CONFIG.MAX_LOGIN_ATTEMPTS; i++) {
    html += `<span class="${i < remaining ? 'on' : ''}"></span>`;
  }
  box.innerHTML = html;
}

function checkAndStartCooldown() {
  const cdBox = $('#loginCooldown');
  const cdText = $('#loginCooldownText');
  const cdBar = $('#loginCooldownBar');
  const input = $('#loginInput');
  const submit = $('#loginSubmit');

  clearInterval(cooldownTimer);
  const now = Date.now();
  if (!authState.lockUntil || authState.lockUntil <= now) {
    if (authState.lockUntil && authState.lockUntil <= now) {
      authState.lockUntil = 0;
      authState.failedAttempts = 0;
      saveAuth();
      renderAttemptDots();
    }
    cdBox?.classList.add('hidden');
    if (input) input.disabled = false;
    if (submit) submit.disabled = false;
    return false;
  }

  cdBox?.classList.remove('hidden');
  if (input) input.disabled = true;
  if (submit) submit.disabled = true;

  const totalMs = CONFIG.COOLDOWN_SECONDS * 1000;
  const tick = () => {
    const remMs = Math.max(0, authState.lockUntil - Date.now());
    const secs = Math.ceil(remMs / 1000);
    if (cdText) cdText.textContent = `Terlalu banyak percobaan gagal. Coba lagi dalam ${secs} detik…`;
    if (cdBar) cdBar.style.width = `${Math.min(100, (remMs / totalMs) * 100)}%`;

    if (remMs <= 0) {
      clearInterval(cooldownTimer);
      authState.lockUntil = 0;
      authState.failedAttempts = 0;
      saveAuth();
      renderAttemptDots();
      cdBox?.classList.add('hidden');
      if (input) {
        input.disabled = false;
        input.focus();
      }
      if (submit) submit.disabled = false;
      const errEl = $('#loginError');
      if (errEl) errEl.textContent = '';
    }
  };
  tick();
  cooldownTimer = setInterval(tick, 200);
  return true;
}

function triggerShake(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

function handleLoginSubmit(e) {
  e.preventDefault();
  if (checkAndStartCooldown()) return;

  const input = $('#loginInput');
  const errEl = $('#loginError');
  const card = $('#loginCard');
  const val = input?.value || '';

  if (verifyPassword(val)) {
    authState.failedAttempts = 0;
    authState.lockUntil = 0;
    saveAuth();
    isAdminUnlocked = true;
    closeModal($('#loginModal'));
    switchPanel('admin');
    showToast('Selamat datang di Panel Bendahara!', 'success');
    return;
  }

  authState.failedAttempts = (authState.failedAttempts || 0) + 1;
  triggerShake(card);
  renderAttemptDots();

  if (authState.failedAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
    authState.lockUntil = Date.now() + CONFIG.COOLDOWN_SECONDS * 1000;
    saveAuth();
    if (errEl) errEl.textContent = 'Batas percobaan habis. Akses ditahan sementara.';
    checkAndStartCooldown();
  } else {
    saveAuth();
    const sisa = CONFIG.MAX_LOGIN_ATTEMPTS - authState.failedAttempts;
    if (errEl) errEl.textContent = `Password salah! (Default: ${CONFIG.DEFAULT_PASSWORD}) · Sisa: ${sisa}x.`;
    input?.select();
  }
}

/* =========================================================================
   7. MODAL GENERIK & KONFIRMASI
   ========================================================================= */
function openModal(modal) {
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  if (lenisInstance) lenisInstance.stop();

  const card = $('.modal-card', modal);
  if (card && window.gsap) {
    window.gsap.fromTo(card, { scale: 0.92, autoAlpha: 0, y: 16 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.32, ease: 'back.out(1.4)' });
  }
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (!$$('.modal.open').length) {
    document.body.classList.remove('modal-open');
    if (lenisInstance) lenisInstance.start();
  }
}

function askConfirm({ title = 'Yakin?', message = '', okText = 'Ya, Lanjutkan', danger = false, onConfirm }) {
  const modal = $('#confirmModal');
  const titleEl = $('#confirmTitle');
  const msgEl = $('#confirmMessage');
  const okBtn = $('#confirmOk');
  const iconEl = $('#confirmIcon');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (okBtn) {
    okBtn.textContent = okText;
    okBtn.className = danger ? 'btn btn-danger-solid' : 'btn btn-primary glass-btn';
  }
  if (iconEl) {
    iconEl.classList.toggle('danger', Boolean(danger));
    iconEl.innerHTML = `<i data-lucide="${danger ? 'alert-triangle' : 'circle-help'}"></i>`;
    refreshIcons(iconEl);
  }
  confirmCallback = onConfirm;
  openModal(modal);
}

/* =========================================================================
   8. AKSI BENDAHARA (CENTANG, MINGGU, SISWA, PENGELUARAN, EXPORT/IMPORT)
   ========================================================================= */
function togglePaymentCheck(studentId, weekId, buttonEl) {
  if (!state.payments[studentId]) state.payments[studentId] = {};
  const currentlyPaid = Boolean(state.payments[studentId][weekId]);

  if (currentlyPaid) {
    delete state.payments[studentId][weekId];
  } else {
    state.payments[studentId][weekId] = todayISO();
  }

  saveState();

  if (buttonEl && window.gsap) {
    window.gsap.fromTo(buttonEl, { scale: 0.78 }, { scale: 1, duration: 0.32, ease: 'back.out(2.4)' });
  }

  renderAll({ preservePaySelection: true });
}

function toggleAllWeekChecks(weekId) {
  const wk = state.weeks.find(w => w.id === weekId);
  if (!wk) return;

  const allChecked = state.students.every(s => isStudentPaidWeek(s.id, weekId));
  const today = todayISO();

  state.students.forEach(s => {
    if (!state.payments[s.id]) state.payments[s.id] = {};
    if (allChecked) {
      delete state.payments[s.id][weekId];
    } else if (!state.payments[s.id][weekId]) {
      state.payments[s.id][weekId] = today;
    }
  });

  saveState();
  renderAll({ preservePaySelection: true });
  showToast(
    allChecked
      ? `Semua centang pada ${wk.label} dikosongkan.`
      : `Semua siswa ditandai lunas untuk ${wk.label}.`,
    'success'
  );
}

/* ---------- Tambah / Edit / Hapus Minggu ---------- */
function openWeekModal(weekId = null) {
  const modal = $('#weekModal');
  const title = $('#weekModalTitle');
  const idInput = $('#weekId');
  const labelInput = $('#weekLabel');
  const dateInput = $('#weekDate');

  if (weekId) {
    const wk = state.weeks.find(w => w.id === weekId);
    if (!wk) return;
    if (title) title.textContent = 'Edit Kolom Minggu';
    if (idInput) idInput.value = wk.id;
    if (labelInput) labelInput.value = wk.label;
    if (dateInput) dateInput.value = wk.date;
  } else {
    const nextNum = state.weeks.length + 1;
    let suggestedDate = todayISO();
    if (state.weeks.length > 0) {
      const lastDateStr = state.weeks[state.weeks.length - 1].date;
      const lastD = new Date(lastDateStr + 'T08:00:00');
      if (!Number.isNaN(lastD.getTime())) {
        lastD.setDate(lastD.getDate() + 7);
        suggestedDate = lastD.toISOString().slice(0, 10);
      }
    }
    if (title) title.textContent = 'Tambah Kolom Minggu Baru';
    if (idInput) idInput.value = '';
    if (labelInput) labelInput.value = `Minggu ${nextNum}`;
    if (dateInput) dateInput.value = suggestedDate;
  }

  openModal(modal);
  setTimeout(() => labelInput?.focus(), 100);
}

function handleWeekFormSubmit(e) {
  e.preventDefault();
  const id = ($('#weekId')?.value || '').trim();
  const label = ($('#weekLabel')?.value || '').trim();
  const date = ($('#weekDate')?.value || '').trim();

  if (!label || !date) {
    showToast('Nama kolom dan tanggal wajib diisi.', 'warn');
    return;
  }

  if (id) {
    const wk = state.weeks.find(w => w.id === id);
    if (wk) {
      wk.label = label;
      wk.date = date;
      showToast(`Kolom "${label}" berhasil diperbarui.`, 'success');
    }
  } else {
    const newWeek = { id: uid('w'), label, date };
    state.weeks.push(newWeek);
    showToast(`Kolom "${label}" ditambahkan ke tabel kas.`, 'success');
  }

  saveState();
  closeModal($('#weekModal'));
  renderAll({ preservePaySelection: true });
}

function deleteWeekColumn(weekId) {
  const wk = state.weeks.find(w => w.id === weekId);
  if (!wk) return;

  askConfirm({
    title: `Hapus ${wk.label}?`,
    message: `Seluruh tanda centang pembayaran pada "${wk.label}" (${formatDateID(wk.date, true)}) juga akan ikut terhapus.`,
    okText: 'Ya, Hapus Kolom',
    danger: true,
    onConfirm: () => {
      state.weeks = state.weeks.filter(w => w.id !== weekId);
      Object.keys(state.payments).forEach(sId => {
        delete state.payments[sId][weekId];
      });
      saveState();
      renderAll({ preservePaySelection: true });
      showToast(`Kolom ${wk.label} telah dihapus.`, 'info');
    }
  });
}

/* ---------- Tambah / Edit / Hapus Siswa ---------- */
function openStudentModal(studentId = null) {
  const modal = $('#studentModal');
  const title = $('#studentModalTitle');
  const idInput = $('#stuId');
  const nameInput = $('#stuName');
  const phoneInput = $('#stuPhone');

  if (studentId) {
    const stu = state.students.find(s => s.id === studentId);
    if (!stu) return;
    if (title) title.textContent = 'Edit Data Siswa';
    if (idInput) idInput.value = stu.id;
    if (nameInput) nameInput.value = stu.name;
    if (phoneInput) phoneInput.value = stu.phone || '';
  } else {
    if (title) title.textContent = 'Tambah Siswa Baru';
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
  }

  openModal(modal);
  setTimeout(() => nameInput?.focus(), 100);
}

function handleStudentFormSubmit(e) {
  e.preventDefault();
  const id = ($('#stuId')?.value || '').trim();
  const name = ($('#stuName')?.value || '').trim();
  const phone = normalizePhone($('#stuPhone')?.value || '');

  if (!name) {
    showToast('Nama siswa tidak boleh kosong.', 'warn');
    return;
  }

  if (id) {
    const stu = state.students.find(s => s.id === id);
    if (stu) {
      stu.name = name;
      stu.phone = phone;
      showToast(`Data ${name} berhasil diperbarui.`, 'success');
    }
  } else {
    const newId = uid('s');
    state.students.push({ id: newId, name, phone });
    state.payments[newId] = {};
    showToast(`Siswa "${name}" berhasil ditambahkan.`, 'success');
  }

  saveState();
  closeModal($('#studentModal'));
  renderAll({ preservePaySelection: true });
}

function deleteStudent(studentId) {
  const stu = state.students.find(s => s.id === studentId);
  if (!stu) return;

  askConfirm({
    title: `Hapus ${stu.name}?`,
    message: `Data siswa beserta seluruh riwayat pembayaran kas atas nama "${stu.name}" akan dihapus permanen.`,
    okText: 'Ya, Hapus Siswa',
    danger: true,
    onConfirm: () => {
      state.students = state.students.filter(s => s.id !== studentId);
      delete state.payments[studentId];
      saveState();
      renderAll({ preservePaySelection: false });
      showToast(`Siswa ${stu.name} telah dihapus.`, 'info');
    }
  });
}

/* ---------- Pengeluaran Kas ---------- */
function populateExpenseCategories() {
  const select = $('#expCategory');
  if (!select) return;
  select.innerHTML = Object.entries(EXPENSE_CATEGORIES)
    .map(([key, meta]) => `<option value="${key}">${escapeHTML(meta.label)}</option>`)
    .join('');

  const dateInput = $('#expDate');
  if (dateInput && !dateInput.value) dateInput.value = todayISO();
}

function handleExpenseFormSubmit(e) {
  e.preventDefault();
  const amount = Math.round(Number($('#expAmount')?.value || 0));
  const purpose = ($('#expPurpose')?.value || '').trim();
  const date = ($('#expDate')?.value || todayISO()).trim();
  const category = $('#expCategory')?.value || 'lainnya';

  if (amount <= 0) {
    showToast('Masukkan nominal pengeluaran yang valid.', 'warn');
    return;
  }
  if (!purpose) {
    showToast('Tuliskan keperluan pengeluaran.', 'warn');
    return;
  }

  state.expenses.push({
    id: uid('e'),
    amount,
    purpose,
    date,
    category
  });

  saveState();
  $('#expAmount').value = '';
  $('#expPurpose').value = '';
  renderAll({ preservePaySelection: true });
  showToast(`Pengeluaran ${formatRupiah(amount)} berhasil dicatat.`, 'success');
}

function deleteExpense(expenseId) {
  const exp = state.expenses.find(e => e.id === expenseId);
  if (!exp) return;

  askConfirm({
    title: 'Hapus Catatan Pengeluaran?',
    message: `Hapus "${exp.purpose}" sebesar ${formatRupiah(exp.amount)}? Saldo kas akan otomatis bertambah kembali.`,
    okText: 'Ya, Hapus',
    danger: true,
    onConfirm: () => {
      state.expenses = state.expenses.filter(e => e.id !== expenseId);
      saveState();
      renderAll({ preservePaySelection: true });
      showToast('Catatan pengeluaran dihapus.', 'info');
    }
  });
}

/* ---------- Salin Rekap Grup, Export JSON/CSV & Import JSON ---------- */
function copyGroupSummary() {
  const summary = computeSummary();
  const className = state.settings.className || CONFIG.CLASS_NAME_DEFAULT;
  const arrearsLines = summary.arrearsStudents.length === 0
    ? ['Semua siswa sudah LUNAS 100%! 🎉']
    : summary.arrearsStudents.map((item, idx) =>
        `${idx + 1}. ${item.student.name} — kurang ${item.unpaidCount} mgg (${formatRupiah(item.totalDebt)})`
      );

  const text = [
    `📊 *REKAP KAS KELAS ${className.toUpperCase()}*`,
    `Update: ${formatDateID(todayISO())}`,
    ``,
    `💰 *Saldo Terkini:* ${formatRupiah(summary.balance)}`,
    `📈 *Total Pemasukan:* ${formatRupiah(summary.totalIncome)}`,
    `📉 *Total Pengeluaran:* ${formatRupiah(summary.totalExpense)}`,
    `✅ *Siswa Lunas:* ${summary.lunasStudentsCount}/${summary.totalStudents} siswa`,
    ``,
    `⏳ *Daftar Tunggakan (${formatRupiah(summary.fee)}/mgg):*`,
    ...arrearsLines,
    ``,
    `Terima kasih atas kerja samanya! 🙏✨`
  ].join('\n');

  copyTextToClipboard(text, 'Rekap kas grup WhatsApp berhasil disalin!');
}

function copyTextToClipboard(text, successMsg = 'Teks berhasil disalin!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast(successMsg, 'success'))
      .catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(successMsg, 'success');
  } catch (e) {
    showToast('Gagal menyalin teks.', 'error');
  }
  ta.remove();
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBackupJson() {
  const slug = (state.settings.className || 'kelas').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `backup-kas-${slug}-${todayISO()}.json`;
  const payload = JSON.stringify(state, null, 2);
  downloadBlob(payload, filename, 'application/json;charset=utf-8');
  showToast('File backup JSON berhasil diunduh.', 'success');
}

function handleImportJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ''));
      if (!parsed || !Array.isArray(parsed.students) || !Array.isArray(parsed.weeks)) {
        throw new Error('Format file JSON tidak sesuai struktur Kas Kelas.');
      }
      state = {
        settings: Object.assign({
          className: CONFIG.CLASS_NAME_DEFAULT,
          bendaharaWa: '',
          weeklyFee: CONFIG.WEEKLY_FEE
        }, parsed.settings || {}),
        students: parsed.students,
        weeks: parsed.weeks,
        payments: parsed.payments || {},
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        updatedAt: new Date().toISOString()
      };
      saveState();
      renderAll({ preservePaySelection: false });
      showToast('Data backup JSON berhasil dipulihkan!', 'success');
    } catch (err) {
      showToast(err.message || 'File JSON tidak valid.', 'error');
    }
  };
  reader.readAsText(file);
}

function exportCsvReport() {
  const summary = computeSummary();
  const fee = summary.fee;
  const escCsv = val => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const lines = [];
  const header = [
    'No',
    'Nama Siswa',
    'No WhatsApp',
    ...state.weeks.map(w => `${w.label} (${w.date})`),
    'Minggu Lunas',
    'Minggu Menunggak',
    'Total Dibayar (Rp)',
    'Total Tunggakan (Rp)',
    'Status'
  ];
  lines.push(header.map(escCsv).join(','));

  state.students.forEach((stu, idx) => {
    let paidCount = 0;
    const weekCols = state.weeks.map(wk => {
      const paid = isStudentPaidWeek(stu.id, wk.id);
      if (paid) paidCount++;
      return paid ? 'LUNAS' : 'BELUM';
    });
    const unpaidCount = state.weeks.length - paidCount;
    const row = [
      idx + 1,
      stu.name,
      stu.phone || '-',
      ...weekCols,
      paidCount,
      unpaidCount,
      paidCount * fee,
      unpaidCount * fee,
      unpaidCount === 0 ? 'LUNAS' : 'MENUNGGAK'
    ];
    lines.push(row.map(escCsv).join(','));
  });

  lines.push('');
  lines.push(['RINGKASAN KAS KELAS', state.settings.className].map(escCsv).join(','));
  lines.push(['Total Pemasukan (Rp)', summary.totalIncome].map(escCsv).join(','));
  lines.push(['Total Pengeluaran (Rp)', summary.totalExpense].map(escCsv).join(','));
  lines.push(['Saldo Akhir (Rp)', summary.balance].map(escCsv).join(','));
  lines.push(['Total Tunggakan (Rp)', summary.totalDebt].map(escCsv).join(','));

  if (state.expenses.length > 0) {
    lines.push('');
    lines.push(['RIWAYAT PENGELUARAN'].map(escCsv).join(','));
    lines.push(['Tanggal', 'Kategori', 'Keperluan', 'Nominal (Rp)'].map(escCsv).join(','));
    state.expenses.forEach(e => {
      const cat = EXPENSE_CATEGORIES[e.category]?.label || e.category;
      lines.push([e.date, cat, e.purpose, e.amount].map(escCsv).join(','));
    });
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const slug = (state.settings.className || 'kelas').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadBlob(csvContent, `laporan-kas-${slug}-${todayISO()}.csv`, 'text/csv;charset=utf-8');
  showToast('Laporan CSV (Excel) berhasil diunduh.', 'success');
}

/* =========================================================================
   9. KALKULATOR MELAYANG (FLOATING CALCULATOR)
   ========================================================================= */
const calcState = {
  expr: '',
  lastResult: 0
};

function initCalculator() {
  const fab = $('#calcFab');
  const calc = $('#calc');
  const closeBtn = $('#calcClose');
  const head = $('#calcHead');
  const keysBox = $('#calcKeys');

  fab?.addEventListener('click', () => {
    const isOpen = calc.classList.toggle('open');
    fab.classList.toggle('is-open', isOpen);
    calc.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    if (isOpen && window.gsap) {
      window.gsap.fromTo(calc, { scale: 0.9, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.28, ease: 'back.out(1.6)' });
    }
  });

  closeBtn?.addEventListener('click', () => {
    calc?.classList.remove('open');
    fab?.classList.remove('is-open');
    calc?.setAttribute('aria-hidden', 'true');
  });

  $$('.calc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      $$('.calc-tab').forEach(t => t.classList.toggle('active', t === tab));
      $$('.calc-body').forEach(body => {
        body.classList.toggle('hidden', body.dataset.tabPanel !== target);
      });
    });
  });

  $$('.calc-quick .key').forEach(btn => {
    btn.addEventListener('click', () => handleCalcKey(btn.dataset.key));
  });

  keysBox?.addEventListener('click', e => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    handleCalcKey(btn.dataset.key);
  });

  const chgTotal = $('#chgTotal');
  const chgPaid = $('#chgPaid');
  chgTotal?.addEventListener('input', updateChangeCalc);
  chgPaid?.addEventListener('input', updateChangeCalc);

  $('#chgWeeks')?.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.weeks) {
      const w = Number(btn.dataset.weeks) || 1;
      chgTotal.value = w * getFee();
    } else if (btn.dataset.fromCalc) {
      chgTotal.value = Math.max(0, Math.round(calcState.lastResult || 0));
    }
    updateChangeCalc();
  });

  $('#chgCash')?.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.cash === 'reset') {
      chgPaid.value = '';
    } else {
      const add = Number(btn.dataset.cash) || 0;
      chgPaid.value = (Number(chgPaid.value) || 0) + add;
    }
    updateChangeCalc();
  });

  if (head && calc) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origRight = 22;
    let origBottom = 92;

    head.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || window.innerWidth <= 640) return;
      dragging = true;
      calc.classList.add('dragging');
      head.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
      const style = window.getComputedStyle(calc);
      origRight = parseFloat(style.right) || 22;
      origBottom = parseFloat(style.bottom) || 92;
    });

    head.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = startX - e.clientX;
      const dy = startY - e.clientY;
      const nextRight = Math.min(window.innerWidth - 330, Math.max(10, origRight + dx));
      const nextBottom = Math.min(window.innerHeight - 420, Math.max(10, origBottom + dy));
      calc.style.right = `${nextRight}px`;
      calc.style.bottom = `${nextBottom}px`;
    });

    const stopDrag = () => {
      dragging = false;
      calc.classList.remove('dragging');
    };
    head.addEventListener('pointerup', stopDrag);
    head.addEventListener('pointercancel', stopDrag);
  }
}

function safeEvalMath(expr) {
  const cleaned = String(expr || '').replace(/[^0-9+\-*/.%()]/g, '');
  if (!cleaned) return 0;
  try {
    const fn = new Function(`return (${cleaned})`);
    const res = Number(fn());
    return Number.isFinite(res) ? res : 0;
  } catch {
    return null;
  }
}

function handleCalcKey(key) {
  if (!key) return;
  const exprEl = $('#calcExpr');
  const resEl = $('#calcResult');

  if (key === 'C') {
    calcState.expr = '';
    calcState.lastResult = 0;
  } else if (key === 'back') {
    calcState.expr = calcState.expr.slice(0, -1);
  } else if (key === 'add5k') {
    calcState.expr = (calcState.expr || String(calcState.lastResult || 0)) + '+5000';
  } else if (key === 'add10k') {
    calcState.expr = (calcState.expr || String(calcState.lastResult || 0)) + '+10000';
  } else if (key === 'mul5k') {
    calcState.expr = (calcState.expr || '1') + '*5000';
  } else if (key === '=') {
    const val = safeEvalMath(calcState.expr);
    if (val !== null) {
      calcState.lastResult = val;
      calcState.expr = String(Math.round(val * 100) / 100);
    }
  } else {
    const ops = ['+', '-', '*', '/', '%'];
    const lastChar = calcState.expr.slice(-1);
    if (ops.includes(key) && ops.includes(lastChar)) {
      calcState.expr = calcState.expr.slice(0, -1) + key;
    } else {
      calcState.expr += key;
    }
  }

  const liveVal = safeEvalMath(calcState.expr);
  if (liveVal !== null && calcState.expr !== '') {
    calcState.lastResult = liveVal;
  }

  const prettyExpr = calcState.expr
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/\+/g, ' + ')
    .replace(/-/g, ' − ');

  if (exprEl) exprEl.textContent = prettyExpr || '\u00A0';
  if (resEl) resEl.textContent = formatNumber(calcState.lastResult);
}

function updateChangeCalc() {
  const total = Number($('#chgTotal')?.value) || 0;
  const paid = Number($('#chgPaid')?.value) || 0;
  const diff = paid - total;

  const box = $('#chgResult');
  const label = $('#chgLabel');
  const val = $('#chgValue');
  if (!box || !label || !val) return;

  if (diff >= 0) {
    box.classList.remove('minus');
    label.textContent = 'Kembalian';
    val.textContent = formatRupiah(diff);
  } else {
    box.classList.add('minus');
    label.textContent = 'Kurang Bayar';
    val.textContent = formatRupiah(Math.abs(diff));
  }
}

/* =========================================================================
   10. ANIMASI (LENIS SMOOTH SCROLL + GSAP + SCROLLTRIGGER + EXPANDING HERO)
   ========================================================================= */
function initSmoothScrollAndGSAP() {
  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  // Inisialisasi Lenis dan sinkronkan dengan GSAP Ticker & ScrollTrigger.update
  if (typeof window.Lenis === 'function') {
    lenisInstance = new window.Lenis({
      duration: 1.1,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    if (window.gsap && window.ScrollTrigger) {
      lenisInstance.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(time => {
        lenisInstance.raf(time * 1000);
      });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = time => {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }

  initExpandingHeroScroll();
  initSplitTitles();
  initScrollReveals();
  initBigCountersScrollTrigger();
}

/**
 * Expanding Hero Visual Card on Scroll (GSAP ScrollTrigger scrub: true)
 * Kartu hero awalnya sedikit miring & bertumpuk, lalu melebar penuh saat di-scroll.
 */
function initExpandingHeroScroll() {
  const stage = $('#heroExpandStage');
  const card = $('#heroExpandCard');
  const stack1 = $('.hero-stack-back.stack-1');
  const stack2 = $('.hero-stack-back.stack-2');

  if (!stage || !card || !window.gsap || !window.ScrollTrigger) return;

  window.gsap.set(card, {
    scale: 0.91,
    rotateZ: -1.35,
    y: 14
  });

  const tl = window.gsap.timeline({
    scrollTrigger: {
      trigger: stage,
      start: 'top 82%',
      end: 'top 22%',
      scrub: 0.65
    }
  });

  tl.to(card, {
    scale: 1,
    rotateZ: 0,
    y: 0,
    ease: 'power2.out'
  }, 0);

  if (stack1 && stack2) {
    tl.to([stack1, stack2], {
      scale: 0.985,
      rotateZ: 0,
      y: 0,
      opacity: 0.25,
      ease: 'power2.out'
    }, 0);
  }
}

/**
 * ScrollTrigger untuk Baris Statistik Raksasa (Big Rolling Counters)
 * & Falling Pills saat Bento masuk viewport
 */
function initBigCountersScrollTrigger() {
  if (!window.gsap || !window.ScrollTrigger) return;

  const bentoCard = $('#bentoCarouselCard');
  if (bentoCard) {
    window.ScrollTrigger.create({
      trigger: bentoCard,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        if (activeBentoSlide === 0) animateFallingPills();
      }
    });
  }

  const bigSection = $('#big-counters');
  if (bigSection) {
    window.ScrollTrigger.create({
      trigger: bigSection,
      start: 'top 82%',
      onEnter: () => {
        const summary = computeSummary();
        numberCache.delete($('#bigCounterSaldo'));
        numberCache.delete($('#bigCounterSiswa'));
        numberCache.delete($('#bigCounterTransaksi'));
        numberCache.set($('#bigCounterSaldo'), 0);
        numberCache.set($('#bigCounterSiswa'), 0);
        numberCache.set($('#bigCounterTransaksi'), 0);
        renderBigRollingCounters(summary);
      }
    });
  }
}

function scrollToTop() {
  if (lenisInstance) {
    lenisInstance.scrollTo(0, { immediate: false, duration: 0.9 });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function scrollToTarget(selector) {
  const target = $(selector);
  if (!target) return;
  if (lenisInstance) {
    lenisInstance.scrollTo(target, { offset: -84, duration: 1.05 });
  } else {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Fungsi JavaScript murni (tanpa plugin SplitText berbayar) yang memecah
 * setiap judul .split-title menjadi elemen <span> per kata sambil menjaga
 * elemen child highlight (.hl) maupun badge inline (.inline-badge).
 */
function splitElementWords(node) {
  const children = Array.from(node.childNodes);
  node.innerHTML = '';

  children.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      const tokens = child.textContent.split(/(\s+)/);
      tokens.forEach(tok => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) {
          node.appendChild(document.createTextNode(' '));
        } else {
          const wrap = document.createElement('span');
          wrap.className = 'word-wrap';
          const word = document.createElement('span');
          word.className = 'word';
          word.textContent = tok;
          wrap.appendChild(word);
          node.appendChild(wrap);
        }
      });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (child.classList.contains('inline-badge')) {
        // Jaga keutuhan badge inline beserta ikon di dalamnya sebagai 1 unit animasi kata
        const wrap = document.createElement('span');
        wrap.className = 'word-wrap';
        const word = document.createElement('span');
        word.className = 'word';
        word.appendChild(child.cloneNode(true));
        wrap.appendChild(word);
        node.appendChild(wrap);
      } else {
        const clone = child.cloneNode(true);
        splitElementWords(clone);
        node.appendChild(clone);
      }
    }
  });
}

function initSplitTitles() {
  $$('.split-title').forEach(titleEl => {
    if (titleEl.closest('.panel.hidden')) return;

    if (!titleEl.dataset.splitDone) {
      splitElementWords(titleEl);
      titleEl.dataset.splitDone = '1';
      titleEl.classList.add('is-ready');
      refreshIcons(titleEl);
    }

    if (titleEl.dataset.animDone) return;
    titleEl.dataset.animDone = '1';

    const words = $$('.word', titleEl);
    if (!words.length || !window.gsap) return;

    window.gsap.fromTo(
      words,
      { yPercent: 115, autoAlpha: 0, rotateZ: 2 },
      {
        yPercent: 0,
        autoAlpha: 1,
        rotateZ: 0,
        duration: 0.78,
        stagger: 0.045,
        ease: 'power3.out',
        scrollTrigger: window.ScrollTrigger
          ? {
              trigger: titleEl,
              start: 'top 88%',
              toggleActions: 'play none none none'
            }
          : undefined
      }
    );
  });
}

function initScrollReveals() {
  if (!window.gsap) return;

  $$('[data-reveal]').forEach(el => {
    if (el.dataset.revealBound) return;
    el.dataset.revealBound = '1';

    window.gsap.fromTo(
      el,
      { y: 24, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: window.ScrollTrigger
          ? {
              trigger: el,
              start: 'top 90%',
              toggleActions: 'play none none none'
            }
          : undefined
      }
    );
  });

  $$('[data-stagger]').forEach(group => {
    if (group.dataset.staggerBound) return;
    group.dataset.staggerBound = '1';
    const items = Array.from(group.children);

    window.gsap.fromTo(
      items,
      { y: 26, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.65,
        stagger: 0.09,
        ease: 'power3.out',
        scrollTrigger: window.ScrollTrigger
          ? {
              trigger: group,
              start: 'top 88%',
              toggleActions: 'play none none none'
            }
          : undefined
      }
    );
  });
}

/* =========================================================================
   11. EVENT LISTENERS & INISIALISASI
   ========================================================================= */
function updateActiveNavOnScroll() {
  if (isNavClickScrolling) return;
  const navContainer = currentPanel === 'admin' ? $('#navAdmin') : $('#navSiswa');
  if (!navContainer) return;
  const links = $$('a[href^="#"]', navContainer);
  const scrollPos = window.scrollY + 180;

  let currentId = '';
  links.forEach(link => {
    const id = link.getAttribute('href');
    if (!id || id.length <= 1) return;
    const sec = $(id);
    if (sec && sec.offsetTop <= scrollPos) {
      currentId = id;
    }
  });

  if (currentId) {
    let changed = false;
    links.forEach(link => {
      const shouldBeActive = link.getAttribute('href') === currentId;
      if (link.classList.contains('active') !== shouldBeActive) {
        link.classList.toggle('active', shouldBeActive);
        changed = true;
      }
    });
    if (changed) updateNavPillIndicator();
  }
}

function bindEvents() {
  // Efek navbar saat scroll & highlight link aktif
  window.addEventListener('scroll', () => {
    const nav = $('#navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    updateActiveNavOnScroll();
  }, { passive: true });

  window.addEventListener('resize', () => {
    updateSwitcherIndicator();
    updateNavPillIndicator();
  });

  // Reset timer auto-lock saat bendahara berinteraksi
  ['click', 'keydown', 'pointermove'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (isAdminUnlocked) resetIdleTimer();
    }, { passive: true });
  });

  // Navigasi anchor smooth scroll + geser pill putih di navbar
  document.addEventListener('click', e => {
    const scrollLink = e.target.closest('[data-scroll]');
    if (scrollLink) {
      const href = scrollLink.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        if (scrollLink.closest('.nav-links')) {
          setActiveNavLink(scrollLink);
          isNavClickScrolling = true;
          clearTimeout(navClickScrollTimer);
          navClickScrollTimer = setTimeout(() => {
            isNavClickScrolling = false;
          }, 950);
        }
        if (href === '#top') scrollToTop();
        else scrollToTarget(href);
      }
    }
  });

  // Switcher Panel Siswa <-> Bendahara
  $$('.switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.panel;
      if (target) switchPanel(target);
    });
  });

  // Tombol Kunci Panel / Logout
  $('#btnLock')?.addEventListener('click', () => {
    lockAdminPanel('Panel Bendahara berhasil dikunci.');
  });

  // ---------------- BENTO DASHBOARD EVENTS ----------------
  $('#bentoPrevBtn')?.addEventListener('click', () => setBentoSlide(activeBentoSlide - 1));
  $('#bentoNextBtn')?.addEventListener('click', () => setBentoSlide(activeBentoSlide + 1));

  $('#bentoIndicatorBars')?.addEventListener('click', e => {
    const btn = e.target.closest('.bento-bar-btn');
    if (!btn) return;
    setBentoSlide(Number(btn.dataset.slideTo) || 0);
  });

  $('#btnReplayPills')?.addEventListener('click', () => {
    animateFallingPills();
  });

  // Interaksi klik/sentuh pada pill di Slide 1
  $('#fallingPillsArena')?.addEventListener('click', e => {
    const pill = e.target.closest('.fall-pill');
    if (!pill || !window.gsap) return;
    window.gsap.fromTo(pill, { scale: 0.85, y: -12 }, { scale: 1, y: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' });
  });

  // Interaksi titik grafik gelombang di Slide 3
  const handleWavePoint = e => {
    const pt = e.target.closest('.wavy-point');
    if (!pt) return;
    updateWavyTooltip(
      pt.dataset.label,
      Number(pt.dataset.nominal) || 0,
      Number(pt.dataset.paid) || 0,
      Number(pt.dataset.x) || 260
    );
  };
  $('#bentoWavySvg')?.addEventListener('pointerover', handleWavePoint);
  $('#bentoWavySvg')?.addEventListener('click', handleWavePoint);

  // Filter waktu di Kolom Kanan Bento
  $('#perfTimeFilter')?.addEventListener('click', e => {
    const btn = e.target.closest('.time-pill');
    if (!btn) return;
    activePerfPeriod = btn.dataset.period || 'all';
    $$('#perfTimeFilter .time-pill').forEach(b => b.classList.toggle('active', b === btn));
    renderBentoPerformanceRight(computeSummary());
  });

  // ---------------- FAQ ACCORDION EVENTS ----------------
  $('#faqAccordion')?.addEventListener('click', e => {
    const qBtn = e.target.closest('.faq-question');
    if (!qBtn) return;
    const item = qBtn.closest('.faq-item');
    const answer = $('.faq-answer', item);
    if (!item || !answer) return;

    const isOpen = item.classList.contains('is-open');

    // Tutup item lain
    $$('#faqAccordion .faq-item').forEach(other => {
      if (other !== item) {
        other.classList.remove('is-open');
        $('.faq-question', other)?.setAttribute('aria-expanded', 'false');
        const otherAns = $('.faq-answer', other);
        if (otherAns) otherAns.style.maxHeight = '0px';
      }
    });

    if (isOpen) {
      item.classList.remove('is-open');
      qBtn.setAttribute('aria-expanded', 'false');
      answer.style.maxHeight = '0px';
    } else {
      item.classList.add('is-open');
      qBtn.setAttribute('aria-expanded', 'true');
      answer.style.maxHeight = `${answer.scrollHeight + 24}px`;
    }
  });

  // Pencarian tunggakan
  $('#searchTunggakan')?.addEventListener('input', () => {
    renderArrearsSection(computeSummary());
    refreshIcons($('#arrearsList'));
  });

  // Klik "Bayar Sekarang" dari kartu tunggakan -> pilih siswa & scroll ke #bayar
  $('#arrearsList')?.addEventListener('click', e => {
    const btn = e.target.closest('.js-pay-for');
    if (!btn) return;
    const stuId = btn.dataset.studentId;
    const select = $('#paySelect');
    if (select && stuId) {
      select.value = stuId;
      renderPayWeeksForStudent(stuId);
      scrollToTarget('#bayar');
    }
  });

  // Dropdown pilih nama siswa untuk bayar via QR
  $('#paySelect')?.addEventListener('change', e => {
    renderPayWeeksForStudent(e.target.value);
  });

  // Checkbox minggu yang ingin dibayar
  $('#payWeeks')?.addEventListener('change', e => {
    if (e.target.classList.contains('js-pay-week-cb')) {
      updatePaymentCalculation();
    }
  });

  $('#btnSelectAll')?.addEventListener('click', () => {
    $$('.js-pay-week-cb').forEach(cb => { cb.checked = true; });
    updatePaymentCalculation();
  });

  $('#btnClearWeeks')?.addEventListener('click', () => {
    $$('.js-pay-week-cb').forEach(cb => { cb.checked = false; });
    updatePaymentCalculation();
  });

  $('#btnCopyMsg')?.addEventListener('click', () => {
    const text = $('#msgPreview')?.textContent || '';
    if (text) copyTextToClipboard(text, 'Pesan konfirmasi berhasil disalin!');
  });

  // Modal Login Bendahara
  $('#loginForm')?.addEventListener('submit', handleLoginSubmit);
  $('#loginToggle')?.addEventListener('click', () => {
    const input = $('#loginInput');
    const toggle = $('#loginToggle');
    if (!input || !toggle) return;
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    toggle.innerHTML = `<i data-lucide="${isPw ? 'eye-off' : 'eye'}"></i>`;
    refreshIcons(toggle);
  });
  $('#loginSubHint')?.addEventListener('click', () => {
    const input = $('#loginInput');
    if (input && !input.disabled) {
      input.value = CONFIG.DEFAULT_PASSWORD;
      input.focus();
    }
  });

  // Tutup modal lewat backdrop / tombol [data-close] / tombol Escape
  document.addEventListener('click', e => {
    const closeTrigger = e.target.closest('[data-close]');
    if (closeTrigger) {
      const modal = closeTrigger.closest('.modal');
      closeModal(modal);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const openModals = $$('.modal.open');
      if (openModals.length) closeModal(openModals[openModals.length - 1]);
    }
  });

  // Modal Konfirmasi
  $('#confirmCancel')?.addEventListener('click', () => {
    confirmCallback = null;
    closeModal($('#confirmModal'));
  });
  $('#confirmOk')?.addEventListener('click', () => {
    const cb = confirmCallback;
    confirmCallback = null;
    closeModal($('#confirmModal'));
    if (typeof cb === 'function') cb();
  });

  // Tabel Kas Bendahara (Delegasi Event)
  $('#kasTable')?.addEventListener('click', e => {
    const checkBtn = e.target.closest('.js-toggle-check');
    if (checkBtn) {
      togglePaymentCheck(checkBtn.dataset.studentId, checkBtn.dataset.weekId, checkBtn);
      return;
    }
    const toggleAllBtn = e.target.closest('.js-week-toggle-all');
    if (toggleAllBtn) {
      toggleAllWeekChecks(toggleAllBtn.dataset.weekId);
      return;
    }
    const editWeekBtn = e.target.closest('.js-week-edit');
    if (editWeekBtn) {
      openWeekModal(editWeekBtn.dataset.weekId);
      return;
    }
    const delWeekBtn = e.target.closest('.js-week-delete');
    if (delWeekBtn) {
      deleteWeekColumn(delWeekBtn.dataset.weekId);
    }
  });

  $('#tableSearch')?.addEventListener('input', () => {
    renderKasTable(computeSummary());
    refreshIcons($('#kasTable'));
  });

  $('#btnAddWeek')?.addEventListener('click', () => openWeekModal());
  $('#btnAddWeekHero')?.addEventListener('click', () => openWeekModal());
  $('#weekForm')?.addEventListener('submit', handleWeekFormSubmit);

  $('#btnCopyRekap')?.addEventListener('click', copyGroupSummary);
  $('#btnExportCsvTable')?.addEventListener('click', exportCsvReport);

  // Kelola Siswa
  document.addEventListener('click', e => {
    if (e.target.closest('.js-add-student')) {
      openStudentModal();
    }
  });

  $('#studentSearch')?.addEventListener('input', () => {
    renderStudentCards(computeSummary());
    refreshIcons($('#studentGrid'));
  });

  $('#studentGrid')?.addEventListener('click', e => {
    const editBtn = e.target.closest('.js-edit-student');
    if (editBtn) {
      openStudentModal(editBtn.dataset.studentId);
      return;
    }
    const delBtn = e.target.closest('.js-delete-student');
    if (delBtn) {
      deleteStudent(delBtn.dataset.studentId);
    }
  });

  $('#studentForm')?.addEventListener('submit', handleStudentFormSubmit);

  // Kelola Pengeluaran
  $('#quickAmounts')?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-amt]');
    if (!btn) return;
    const input = $('#expAmount');
    if (input) input.value = btn.dataset.amt;
  });

  $('#expenseForm')?.addEventListener('submit', handleExpenseFormSubmit);

  $('#adminExpList')?.addEventListener('click', e => {
    const delBtn = e.target.closest('.js-delete-expense');
    if (delBtn) deleteExpense(delBtn.dataset.expenseId);
  });

  // Pengaturan Kelas & Nomor WA
  $('#classForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const cls = ($('#setClassName')?.value || '').trim() || CONFIG.CLASS_NAME_DEFAULT;
    const wa = normalizePhone($('#setWa')?.value || '');
    state.settings.className = cls;
    state.settings.bendaharaWa = wa;
    saveState();
    renderAll({ preservePaySelection: true });
    showToast('Info kelas & nomor WhatsApp bendahara disimpan.', 'success');
  });

  // Ganti Password Bendahara
  $('#passwordForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const oldPw = $('#pwOld')?.value || '';
    const newPw = $('#pwNew')?.value || '';
    const confirmPw = $('#pwConfirm')?.value || '';

    if (!verifyPassword(oldPw)) {
      showToast('Password lama tidak sesuai!', 'error');
      return;
    }
    if (newPw.length < 4) {
      showToast('Password baru minimal 4 karakter.', 'warn');
      return;
    }
    if (newPw !== confirmPw) {
      showToast('Konfirmasi password baru tidak sama.', 'warn');
      return;
    }

    authState.customHash = simpleHash(newPw);
    authState.failedAttempts = 0;
    authState.lockUntil = 0;
    saveAuth();

    $('#pwOld').value = '';
    $('#pwNew').value = '';
    $('#pwConfirm').value = '';
    renderSettingsInfo(computeSummary());
    showToast('Password Panel Bendahara berhasil diperbarui!', 'success');
  });

  // Backup & Export / Import
  $('#btnExportJson')?.addEventListener('click', exportBackupJson);
  $('#btnImportJson')?.addEventListener('click', () => $('#importFile')?.click());
  $('#importFile')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) handleImportJsonFile(file);
    e.target.value = '';
  });
  $('#btnExportCsv')?.addEventListener('click', exportCsvReport);

  // Zona Berbahaya
  $('#btnResetDemo')?.addEventListener('click', () => {
    askConfirm({
      title: 'Muat Ulang Data Contoh?',
      message: 'Data siswa, minggu, dan pengeluaran saat ini akan diganti dengan 18 siswa contoh awal.',
      okText: 'Ya, Muat Data Contoh',
      danger: true,
      onConfirm: () => {
        const keepSettings = { ...state.settings };
        state = buildDemoData();
        state.settings.className = keepSettings.className || CONFIG.CLASS_NAME_DEFAULT;
        state.settings.bendaharaWa = keepSettings.bendaharaWa || '';
        saveState();
        renderAll({ preservePaySelection: false });
        showToast('Data contoh berhasil dimuat ulang.', 'success');
      }
    });
  });

  $('#btnWipe')?.addEventListener('click', () => {
    askConfirm({
      title: 'Kosongkan Seluruh Pembukuan?',
      message: 'Semua daftar siswa, kolom minggu, centang kas, dan riwayat pengeluaran akan dikosongkan dari awal.',
      okText: 'Ya, Hapus Semua',
      danger: true,
      onConfirm: () => {
        state.students = [];
        state.weeks = [{ id: uid('w'), label: 'Minggu 1', date: todayISO() }];
        state.payments = {};
        state.expenses = [];
        saveState();
        renderAll({ preservePaySelection: false });
        showToast('Seluruh data pembukuan telah dikosongkan.', 'info');
      }
    });
  });
}

/* ---------- Bootstrapping ---------- */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  loadAuth();
  populateExpenseCategories();
  renderAll();
  bindEvents();
  initCalculator();
  updateSwitcherIndicator();
  updateNavPillIndicator();
  restartBentoAutoTimer();
  initSmoothScrollAndGSAP();

  window.addEventListener('load', () => {
    updateSwitcherIndicator();
    updateNavPillIndicator();
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      updateSwitcherIndicator();
      updateNavPillIndicator();
    });
  }
});