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

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
