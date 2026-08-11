const SUPABASE_URL = 'https://ytltbzoefmuoqpycgudr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bHRiem9lZm11b3FweWNndWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODYwMDQsImV4cCI6MjEwMDQ2MjAwNH0.G_IVvhAvO9dzn6tTY1D-Rp4d8n_50CG8M77MCYGlUyg';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function saveSession(user) {
  var data = JSON.stringify(user);
  localStorage.setItem('fp_session', data);
  try {
    await Capacitor.Plugins.Preferences.set({ key: 'fp_session', value: data });
  } catch {}
}

async function getSession() {
  try {
    var v = await Capacitor.Plugins.Preferences.get({ key: 'fp_session' });
    if (v && v.value) return JSON.parse(v.value);
  } catch {}
  var raw = localStorage.getItem('fp_session');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

async function clearSession() {
  localStorage.removeItem('fp_session');
  try {
    await Capacitor.Plugins.Preferences.remove({ key: 'fp_session' });
  } catch {}
}

function isLoggedIn() {
  return !!localStorage.getItem('fp_session');
}

function mapSchedule(s) {
  return {
    scheduleId: s.schedule_id,
    familyId: s.family_id,
    title: s.title,
    requester: s.requester,
    targetUserId: s.target_user_id,
    from: s.scheduled_from || '',
    to: s.scheduled_to || '',
    date: (s.scheduled_from || s.scheduled_date || '').substring(0, 10),
    progress: s.progress,
    completed: s.completed,
    isRecurring: s.is_recurring,
    recurringType: s.recurring_type,
    recurringEndDate: s.recurring_end_date,
    createdBy: s.created_by,
    createdAt: s.created_at
  };
}

function showError(el, msg) {
  if (!el) el = document.getElementById('errorMsg');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

function showSuccess(el, msg) {
  if (!el) el = document.getElementById('successMsg');
  if (!el) return;
  el.innerHTML = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    dates.push(localDateStr(dd));
  }
  return dates;
}

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function localDateStr(date) {
  return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
}

async function registerFCM(userId) {
  if (typeof Capacitor === 'undefined') { showDebugToast('Capacitor undefined'); return; }
  try {
    var PN = Capacitor.Plugins.PushNotifications;
    if (!PN) { showDebugToast('PushNotifications plugin 없음'); return; }
    showDebugToast('FCM 권한 요청 중...');
    var perm = await PN.requestPermissions();
    showDebugToast('FCM 권한: ' + perm.receive);
    if (perm.receive !== 'granted') return;
    showDebugToast('FCM 등록 중...');
    await PN.register();
    PN.addListener('registration', async function(token) {
      showDebugToast('FCM 토큰: ' + token.value.substring(0,10) + '...');
      var r = await sb.from('device_tokens').upsert({
        user_id: userId,
        fcm_token: token.value,
        updated_at: new Date().toISOString()
      });
      if (r.error) { showDebugToast('토큰 저장 오류: ' + r.error.message); }
      else { showDebugToast('토큰 저장 완료'); }
    });
    PN.addListener('registrationError', function(err) {
      showDebugToast('FCM 등록 오류: ' + err.error);
    });
    PN.addListener('pushNotificationReceived', function(notif) {
      var title = notif.title || '알림';
      var body = notif.body || '';
      var el = document.getElementById('pushBanner');
      if (!el) {
        el = document.createElement('div');
        el.id = 'pushBanner';
        el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#3b82f6;color:#fff;padding:12px 16px;font-size:14px;z-index:9999;text-align:center;animation:slideDown .3s ease;cursor:pointer';
        document.body.appendChild(el);
        el.addEventListener('click', function() { el.remove(); });
      }
      el.textContent = (title + ': ' + body).trim();
      setTimeout(function() { if (el.parentNode) el.remove(); }, 5000);
    });
  } catch(e) { showDebugToast('FCM 오류: ' + e.message); }
}

function showDebugToast(msg) {
  var el = document.getElementById('debugToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'debugToast';
    el.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;background:#333;color:#fff;padding:8px 12px;border-radius:6px;font-size:11px;z-index:9999;text-align:center;max-height:60px;overflow-y:auto';
    document.body.appendChild(el);
  }
  var time = new Date().toLocaleTimeString();
  el.textContent = '[' + time + '] ' + msg;
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.style.opacity = '0.5'; }, 3000);
  el.style.opacity = '1';
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

// ─── THEME ──────────────────────────────────
var FONTS = {
  'default': "'Nanum Gothic', NanumGothic, 'Malgun Gothic', Dotum, 'Apple SD Gothic Neo', sans-serif",
  'sans-serif': 'sans-serif',
  'serif': 'serif',
  'monospace': 'monospace'
};
var FONT_NAMES = { 'default': '기본(나눔고딕)', 'sans-serif': '고딕', 'serif': '명조', 'monospace': '코딩체' };
const THEME_DEFAULTS = { accent: '#03c75a', bgColor: '#f6f6f7', fontSize: 12, fontFamily: 'default' };

function adjustBrightness(hex, amount) {
  var num = parseInt(hex.replace('#', ''), 16);
  var r = Math.min(255, Math.max(0, (num >> 16) + amount));
  var g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  var b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

async function loadTheme() {
  var theme = THEME_DEFAULTS;
  try {
    var v = await Capacitor.Plugins.Preferences.get({ key: 'fp_theme' });
    if (v && v.value) {
      var parsed = JSON.parse(v.value);
      theme = { accent: parsed.accent || THEME_DEFAULTS.accent, bgColor: parsed.bgColor || THEME_DEFAULTS.bgColor, fontSize: Number(parsed.fontSize) || THEME_DEFAULTS.fontSize, fontFamily: parsed.fontFamily || THEME_DEFAULTS.fontFamily };
    }
  } catch {}
  applyTheme(theme);
  return theme;
}

function applyTheme(theme) {
  if (!theme) return;
  var root = document.documentElement.style;
  if (theme.accent) {
    root.setProperty('--color-accent', theme.accent);
    root.setProperty('--color-accent-hover', adjustBrightness(theme.accent, -10));
  }
  if (theme.bgColor) root.setProperty('--color-surface-raised', theme.bgColor);
  if (theme.fontFamily && FONTS[theme.fontFamily]) {
    root.setProperty('--font-family-primary', FONTS[theme.fontFamily]);
  }
  if (theme.fontSize) {
    var scale = theme.fontSize / 12;
    root.setProperty('--font-size-base', Math.round(12 * scale) + 'px');
    root.setProperty('--font-size-xs', Math.round(10 * scale) + 'px');
    root.setProperty('--font-size-sm', Math.round(11 * scale) + 'px');
    root.setProperty('--font-size-md', Math.round(12 * scale) + 'px');
    root.setProperty('--font-size-lg', Math.round(13 * scale) + 'px');
    root.setProperty('--font-size-xl', Math.round(14 * scale) + 'px');
    root.setProperty('--font-size-2xl', Math.round(15 * scale) + 'px');
    root.setProperty('--font-size-3xl', Math.round(16 * scale) + 'px');
    root.setProperty('--font-size-4xl', Math.round(18 * scale) + 'px');
    root.setProperty('--line-height-base', Math.round(14.4 * scale) + 'px');
  }
}

async function saveTheme(theme) {
  try {
    await Capacitor.Plugins.Preferences.set({ key: 'fp_theme', value: JSON.stringify(theme) });
  } catch {}
  applyTheme(theme);
}
// ──────────────────────────────────────────
