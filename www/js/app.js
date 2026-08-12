const SUPABASE_URL = 'https://ytltbzoefmuoqpycgudr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bHRiem9lZm11b3FweWNndWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODYwMDQsImV4cCI6MjEwMDQ2MjAwNH0.G_IVvhAvO9dzn6tTY1D-Rp4d8n_50CG8M77MCYGlUyg';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── I18N ───────────────────────────────────
const I18N = {
  ko: {
    appName: 'FAMILY PLAN',
    alert: '알림',
    save: '저장',
    cancel: '취소',
    logout: 'LogOut',
    errorNetwork: '네트워크 오류',
    pushSchedule: '{0}님 일정',
    pushRead: '{0}님이 읽음',
    pushReadDetail: '"{0}" 확인함',
    header: { main: '메인', timetable: '시간표', my: 'MY' },
    dayNames: ['일', '월', '화', '수', '목', '금', '토'],
    calendar: { day: '일', week: '주', month: '월', year: '년' },
    filter: { search: '일정 검색 (제목, 요청자, 소요시간)', allStatus: '전체 상태', done: '완료', pending: '미완료', from: '시작일', to: '종료일', allMembers: '모두' },
    schedule: { add: '+ 추가', save: '저장', saving: '저장 중...', edit: '일정 수정', new: '일정 추가', editBtn: '수정', deleteBtn: '삭제', title: '일정명', requester: '요청자', target: '대상자', progress: '진행률', recurring: '반복 일정', noRecur: '없음', daily: '매일', weekly: '매주', monthly: '매월', yearly: '매년', recurEnd: '반복 종료일', confirmDelete: '일정을 삭제하시겠습니까?' },
    settings: { group: '그룹 설정', groupName: '그룹명', namePlaceholder: '가족 그룹 이름 (예: 김씨 가족)' },
    familyPanel: { title: '가족 구성원 관리', joinKey: '참여 키', share: '가족원 초대 시 공유', toggle: '펼치기', hide: '접기', creator: '그룹장', kickRight: '추방권한' },
    alertBadge: { today: '오늘의 일정', thisWeek: '이번주 일정' },
    mypage: { title: '마이페이지', changePass: '비밀번호 변경', currentPass: '현재 비밀번호', newPass: '새 비밀번호', changePassBtn: '비밀번호 변경', deleteAccount: '회원 탈퇴', deleteWarn: '탈퇴 시 모든 데이터가 삭제됩니다. 그룹 생성자는 탈퇴할 수 없습니다.', theme: '커스텀 테마', themePreset: '프리셋', accent: '강조색', bgColor: '배경색', font: '글꼴', fontSize: '폰트 크기', saveTheme: '테마 저장', themeSaved: '테마가 저장되었습니다.', errorAll: '모두 입력하세요.', errorPassLen: '새 비밀번호는 4자 이상이어야 합니다.', passMismatch: '현재 비밀번호가 일치하지 않습니다.', passChanged: '비밀번호가 변경되었습니다.' },
    groupSwitcher: { newGroup: '새 그룹 만들기', joinGroup: '그룹 참여하기', createTitle: '새 그룹 만들기', joinTitle: '그룹 참여하기', groupNameInput: '가족 그룹 이름', joinKeyInput: '4자리 키 입력', defaultName: '우리가족', invalidKey: '존재하지 않는 그룹 키입니다.', alreadyJoined: '이미 가입된 그룹입니다.' },
    login: { title: '회원가입', signupId: '아이디', signupPass: '비밀번호', signupName: '이름', signupMode: '가입 방식', createGroup: '그룹 생성 (4자리 키)', joinGroup: '그룹 참여 (4자리 키)', submit: '회원가입', hasAccount: '이미 계정이 있으신가요?', toLogin: '로그인', signupDone: '회원가입 완료!', loginSuccess: '로그인 완료!', loginTitle: 'FAMILY PLAN - 로그인', loginId: '아이디', loginPass: '비밀번호', noAccount: '계정이 없으신가요?', toSignup: '회원가입' },
    timetable: { title: '시간표', viewStyle: '보기', vertical: '세로형', horizontal: '가로형', card: '카드형' },
    emptyState: { noSchedule: '등록된 일정이 없습니다.', addHint: '위 입력창에 일정을 추가해보세요.' },
    detail: { detailOption: '상세 옵션' },
    tooltip: { time: '시간', req: '요청', creator: '작성', progress: '진행률', recurring: '반복' },
    language: { ko: '한국어', en: 'English', confirmChange: '언어를 변경하면 페이지가 새로고침됩니다.' },
    graph: { completed: '완료', inProgress: '진행 중', notStarted: '미시작', stats: '통계' },
    signupKey: { groupKey: '그룹 키 (4자리)', joinKey: '참여 키 (4자리)' },
    self: '본인',
    proxy: '대리',
    recurIcon: '반복 일정',
  },
  en: {
    appName: 'FAMILY PLAN',
    alert: 'Notice',
    save: 'Save',
    cancel: 'Cancel',
    logout: 'LogOut',
    errorNetwork: 'Network error',
    pushSchedule: '{0}\'s schedule',
    pushRead: '{0} read it',
    pushReadDetail: '"{0}" confirmed',
    header: { main: 'Home', timetable: 'Timetable', my: 'MY' },
    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    calendar: { day: 'Day', week: 'Week', month: 'Month', year: 'Year' },
    filter: { search: 'Search (title, requester)', allStatus: 'All', done: 'Done', pending: 'Pending', from: 'From', to: 'To', allMembers: 'All' },
    schedule: { add: '+ Add', save: 'Save', saving: 'Saving...', edit: 'Edit Schedule', new: 'Add Schedule', editBtn: 'Edit', deleteBtn: 'Delete', title: 'Title', requester: 'Requester', target: 'Target', progress: 'Progress', recurring: 'Recurring', noRecur: 'None', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly', recurEnd: 'End Date', confirmDelete: 'Delete this schedule?' },
    settings: { group: 'Group Settings', groupName: 'Group Name', namePlaceholder: 'Group name (e.g. Kim Family)' },
    familyPanel: { title: 'Members', joinKey: 'Join Key', share: 'Share with family', toggle: 'Expand', hide: 'Collapse', creator: 'Admin', kickRight: 'Kick' },
    alertBadge: { today: 'Today', thisWeek: 'This Week' },
    mypage: { title: 'My Page', changePass: 'Change Password', currentPass: 'Current Password', newPass: 'New Password', changePassBtn: 'Change', deleteAccount: 'Delete Account', deleteWarn: 'All data will be deleted. Group creator cannot delete.', theme: 'Custom Theme', themePreset: 'Presets', accent: 'Accent', bgColor: 'Background', font: 'Font', fontSize: 'Font Size', saveTheme: 'Save Theme', themeSaved: 'Theme saved.', errorAll: 'Please fill in all fields.', errorPassLen: 'Password must be at least 4 characters.', passMismatch: 'Current password is incorrect.', passChanged: 'Password changed.' },
    groupSwitcher: { newGroup: '+ New Group', joinGroup: '+ Join Group', createTitle: 'Create Group', joinTitle: 'Join Group', groupNameInput: 'Group Name', joinKeyInput: 'Enter 4-digit key', defaultName: 'My Family', invalidKey: 'Invalid group key.', alreadyJoined: 'Already a member.' },
    login: { title: 'Sign Up', signupId: 'ID', signupPass: 'Password', signupName: 'Name', signupMode: 'Join Mode', createGroup: 'Create Group', joinGroup: 'Join Group', submit: 'Sign Up', hasAccount: 'Already have an account?', toLogin: 'Login', signupDone: 'Sign up complete!', loginSuccess: 'Login complete!', loginTitle: 'FAMILY PLAN - Login', loginId: 'ID', loginPass: 'Password', noAccount: 'No account?', toSignup: 'Sign Up' },
    timetable: { title: 'Timetable', viewStyle: 'View', vertical: 'Vertical', horizontal: 'Horizontal', card: 'Card' },
    emptyState: { noSchedule: 'No schedules found.', addHint: 'Add a schedule using the input above.' },
    detail: { detailOption: 'Details' },
    tooltip: { time: 'Time', req: 'Request', creator: 'Created', progress: 'Progress', recurring: 'Recurring' },
    language: { ko: '한국어', en: 'English', confirmChange: 'The page will reload when language is changed.' },
    graph: { completed: 'Done', inProgress: 'In Progress', notStarted: 'Pending', stats: 'Stats' },
    signupKey: { groupKey: 'Group Key (4 chars)', joinKey: 'Join Key (4 chars)' },
    self: 'Self',
    proxy: 'Proxy',
    recurIcon: 'Recurring',
  }
};

function t(key, params) {
  var keys = key.split('.');
  var val = (getLanguage() === 'en' ? I18N.en : I18N.ko);
  for (var i = 0; i < keys.length; i++) val = val && val[keys[i]];
  if (typeof val !== 'string') return key;
  if (params) {
    for (var k in params) val = val.replace('{' + k + '}', params[k]);
  }
  return val;
}

var LANG_DAY = I18N.ko.dayNames;

async function getLanguage() {
  try {
    var v = await Capacitor.Plugins.Preferences.get({ key: 'fp_lang' });
    if (v && v.value) return v.value;
  } catch {}
  return localStorage.getItem('fp_lang') || 'ko';
}

async function setLanguage(lang) {
  localStorage.setItem('fp_lang', lang);
  try { await Capacitor.Plugins.Preferences.set({ key: 'fp_lang', value: lang }); } catch {}
  window.location.reload();
}

(async function initLang() {
  var lang = await getLanguage();
  LANG_DAY = (I18N[lang] && I18N[lang].dayNames) || I18N.ko.dayNames;
})();
// ──────────────────────────────────────────

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
  if (typeof Capacitor === 'undefined') return;
  try {
    var PN = Capacitor.Plugins.PushNotifications;
    if (!PN) return;
    var perm = await PN.requestPermissions();
    if (perm.receive !== 'granted') return;
    await PN.register();
    PN.addListener('registration', async function(token) {
      await sb.from('device_tokens').upsert({
        user_id: userId,
        fcm_token: token.value,
        updated_at: new Date().toISOString()
      });
    });
    PN.addListener('registrationError', function(err) {});
    PN.addListener('pushNotificationReceived', function(notif) {
      var title = notif.title || t('alert');
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
      document.dispatchEvent(new CustomEvent('pushReceived', { detail: notif }));
    });
  } catch(e) {}
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

async function getGroupName() {
  var cached = localStorage.getItem('fp_group_name');
  if (cached) return cached;
  var s = await getSession();
  if (!s || !s.familyId) return 'FAMILY PLAN';
  var r = await sb.from('families').select('group_name').eq('family_id', s.familyId).maybeSingle();
  var name = (r.data && r.data.group_name) ? r.data.group_name : 'FAMILY PLAN';
  localStorage.setItem('fp_group_name', name);
  return name;
}

function saveGroupName(name) {
  localStorage.setItem('fp_group_name', name || 'FAMILY PLAN');
}

async function switchFamily(familyId) {
  var s = await getSession();
  if (!s || !s.id) return;
  await sb.from('users').update({ family_id: familyId }).eq('id', s.id);
  await saveSession({ id: s.id, name: s.name, familyId: familyId });
  window.location.reload();
}

function generateUniqueKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var result = '';
  var values = new Uint32Array(4);
  crypto.getRandomValues(values);
  for (var i = 0; i < 4; i++) result += chars[values[i] % chars.length];
  return result;
}

async function getUniqueFamilyKey() {
  for (var i = 0; i < 10; i++) {
    var key = generateUniqueKey();
    var r = await sb.from('families').select('family_id').eq('family_id', key).maybeSingle();
    if (!r.data) return key;
  }
  return generateUniqueKey();
}
// ──────────────────────────────────────────
