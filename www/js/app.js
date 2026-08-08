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

// ─── NOTIFICATION BELL ──────────────────────
function renderBellIcon() {
  return '<span id="notiBell" class="bell-icon" onclick="showNotificationsModal()" title="알림">🔔<span id="notiBadge" class="bell-badge" style="display:none">0</span></span>';
}

async function loadUnreadCount() {
  var session = await getSession();
  if (!session || !session.user) return;
  var r = await sb.from('notifications').select('id', { count: 'exact' }).eq('user_id', session.user.id).eq('is_read', false);
  var count = r.count || 0;
  var badge = document.getElementById('notiBadge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
  return count;
}

async function showNotificationsModal() {
  var session = await getSession();
  if (!session || !session.user) return;
  var r = await sb.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50);
  var list = r.data || [];
  var html = '<div class="noti-overlay" id="notiOverlay" onclick="closeNotificationsModal(event)">';
  html += '<div class="noti-panel" onclick="event.stopPropagation()">';
  html += '<div class="noti-header"><h3>알림</h3><button class="noti-close" onclick="closeNotificationsModal()">&times;</button></div>';
  html += '<div class="noti-list">';
  if (list.length === 0) {
    html += '<div class="noti-empty">알림이 없습니다</div>';
  }
  for (var i = 0; i < list.length; i++) {
    var n = list[i];
    html += '<div class="noti-item' + (n.is_read ? '' : ' noti-unread') + '" onclick="markAsRead(' + n.id + ')">';
    html += '<div class="noti-title">' + escapeHtml(n.title) + '</div>';
    html += '<div class="noti-body">' + escapeHtml(n.body) + '</div>';
    html += '<div class="noti-time">' + new Date(n.created_at).toLocaleString() + '</div>';
    html += '</div>';
  }
  html += '</div></div></div>';
  var el = document.createElement('div');
  el.id = 'notiContainer';
  el.innerHTML = html;
  document.body.appendChild(el);
}

function closeNotificationsModal(e) {
  if (e && e.target !== document.getElementById('notiOverlay')) return;
  var el = document.getElementById('notiContainer');
  if (el) el.remove();
  loadUnreadCount();
}

async function markAsRead(id) {
  await sb.from('notifications').update({ is_read: true }).eq('id', id);
  loadUnreadCount();
  closeNotificationsModal();
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}
// ──────────────────────────────────────────
