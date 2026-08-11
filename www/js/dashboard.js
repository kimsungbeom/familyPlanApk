(async function() {
  var session = await getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  let currentView = 'day';
  let currentDate = new Date();
  let members = [];
  let allSchedules = [];
  let chartInstances = {};
  let currentUserId = session.id;
  let currentFamilyId = session.familyId;
  let selectedTargets = new Set();
  let isSaving = false;

  const container = document.getElementById('calendarContainer');
  const navLabel = document.getElementById('currentLabel');
  const scheduleListEl = document.getElementById('scheduleList');
  const emptyState = document.getElementById('emptyState');
  const modal = document.getElementById('scheduleModal');
  const progressSection = document.getElementById('progressSection');
  const searchInput = document.getElementById('searchInput');
  const filterTarget = document.getElementById('filterTarget');
  const filterDateFrom = document.getElementById('filterDateFrom');
  const filterDateTo = document.getElementById('filterDateTo');
  const filterStatus = document.getElementById('filterStatus');
  const schedRecurring = document.getElementById('schedRecurring');
  const recurEndGroup = document.getElementById('recurEndGroup');

  function accentColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#03c75a';
  }

  async function init() {
    await loadTheme();
    if (!currentFamilyId) {
      progressSection.innerHTML = '<div class="empty-state" style="padding:16px"><p>가족 그룹에 가입하면 진행률을 확인할 수 있습니다.</p></div>';
      return;
    }

    const hdr = document.getElementById('header');
    if (hdr) {
      var groupName = await getGroupName();
      hdr.innerHTML = `<div class="header" style="margin-bottom:0">
        <h1></h1>
        <div class="header-nav">
          <a href="dashboard.html" style="font-weight:700;color:var(--color-accent)">메인</a>
          <a href="timetable.html">시간표</a>
          <a href="mypage.html">MY</a>
          <button id="logoutBtn">LogOut</button>
        </div></div>`;
      hdr.querySelector('.header h1').textContent = groupName;
      document.getElementById('logoutBtn').addEventListener('click', async () => {
        await clearSession();
        window.location.href = 'login.html';
      });
    }

    await loadFamilyData();
    await loadSettings();
    await loadAll();

    document.getElementById('viewTabs').addEventListener('click', e => {
      const btn = e.target.closest('button[data-view]');
      if (!btn) return;
      currentView = btn.dataset.view;
      document.querySelectorAll('#viewTabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadAll();
    });

    document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
    document.getElementById('nextBtn').addEventListener('click', () => navigate(1));

    setupInlineAdd();
    setupModal();

    searchInput.addEventListener('input', debounce(loadSchedules, 300));
    filterDateFrom.addEventListener('change', loadSchedules);
    filterDateTo.addEventListener('change', loadSchedules);
    filterStatus.addEventListener('change', loadSchedules);

    document.getElementById('todayBadge').addEventListener('click', () => {
      currentView = 'day'; currentDate = new Date();
      document.querySelectorAll('#viewTabs button').forEach(b => b.classList.remove('active'));
      document.querySelector('#viewTabs button[data-view="day"]').classList.add('active');
      loadAll();
    });

    document.getElementById('weekBadge').addEventListener('click', () => {
      currentView = 'week'; currentDate = new Date();
      document.querySelectorAll('#viewTabs button').forEach(b => b.classList.remove('active'));
      document.querySelector('#viewTabs button[data-view="week"]').classList.add('active');
      loadAll();
    });

    document.getElementById('toggleFamilyBtn').addEventListener('click', () => {
      const list = document.getElementById('memberList');
      const toggleBtn = document.getElementById('toggleFamilyBtn');
      if (list.style.display === 'none') {
        list.style.display = 'flex'; toggleBtn.textContent = '접기';
      } else {
        list.style.display = 'none'; toggleBtn.textContent = '펼치기';
      }
    });

    setupSettingsModal();
    registerFCM(currentUserId);
  }

  async function loadFamilyData() {
    const { data: family } = await sb.from('families').select('*').eq('family_id', currentFamilyId).maybeSingle();
    if (!family) return;

    const { data: memberRows } = await sb.from('family_members').select('user_id, can_kick').eq('family_id', currentFamilyId);
    const userIds = (memberRows || []).map(m => m.user_id);
    const { data: profiles } = userIds.length > 0
      ? await sb.from('users').select('id, name').in('id', userIds)
      : { data: [] };

    members = (memberRows || []).map(m => {
      const p = (profiles || []).find(u => u.id === m.user_id);
      return { id: m.user_id, name: p ? p.name : m.user_id, isCreator: family.created_by === m.user_id, canKick: m.can_kick };
    });

    const kickDelegates = (memberRows || []).filter(m => m.can_kick).map(m => m.user_id);

    document.getElementById('joinKeyDisplay').textContent = family.join_key || '----';
    renderFamilyPanel(family, kickDelegates);

    if (members.length <= 3) {
      members.forEach(m => selectedTargets.add(m.id));
    } else {
      selectedTargets.add(currentUserId);
    }
    renderTargetButtons();
  }

  function renderTargetButtons() {
    filterTarget.innerHTML = '';
    if (members.length <= 1) return;
    members.forEach(m => {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tbtn' + (selectedTargets.has(m.id) ? ' active' : '');
      btn.dataset.id = m.id;
      btn.textContent = m.name;
      btn.addEventListener('click', function() {
        if (selectedTargets.has(m.id)) {
          if (selectedTargets.size <= 1) return;
          selectedTargets.delete(m.id);
        } else {
          selectedTargets.add(m.id);
        }
        renderTargetButtons();
        loadSchedules();
      });
      filterTarget.appendChild(btn);
    });
    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'tbtn' + (selectedTargets.size === members.length ? ' active' : '');
    allBtn.textContent = '모두';
    allBtn.addEventListener('click', function() {
      if (selectedTargets.size === members.length) {
        selectedTargets.clear();
        selectedTargets.add(currentUserId);
      } else {
        members.forEach(m => selectedTargets.add(m.id));
      }
      renderTargetButtons();
      loadSchedules();
    });
    filterTarget.appendChild(allBtn);
  }

  function renderFamilyPanel(family, kickDelegates) {
    const panel = document.getElementById('familyPanel');
    if (!members || members.length === 0) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    const isCreator = family.created_by === currentUserId;
    const canIKick = isCreator || kickDelegates.includes(currentUserId);

    const list = document.getElementById('memberList');
    list.innerHTML = members.map(m => {
      const isMe = m.id === currentUserId;
      const isMemberCreator = m.isCreator;
      const canKickThis = canIKick && !isMe && !isMemberCreator;
      const hasDelegate = kickDelegates.includes(m.id);
      return `<div class="member-item">
        <div class="member-info">
          <span class="member-name">${m.name}</span>
          <span class="member-role">${m.isCreator ? '(그룹장)' : ''}</span>
          ${hasDelegate ? '<span class="member-role" style="color:' + accentColor() + '">(추방권한)</span>' : ''}
        </div>
        <div class="member-actions">
          ${isCreator && !isMe && !isMemberCreator ? `<button class="btn btn-outline btn-sm delegate-btn" data-id="${m.id}">${hasDelegate ? '권한해제' : '추방권한'}</button>` : ''}
          ${canKickThis ? `<button class="btn btn-outline btn-sm kick-btn" data-id="${m.id}">추방</button>` : ''}
        </div></div>`;
    }).join('');
    list.style.display = 'none';
    document.getElementById('toggleFamilyBtn').textContent = '펼치기';

    list.querySelectorAll('.delegate-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const { data: member } = await sb.from('family_members').select('can_kick').eq('family_id', currentFamilyId).eq('user_id', btn.dataset.id).maybeSingle();
        const newVal = !(member && member.can_kick);
        await sb.from('family_members').update({ can_kick: newVal }).eq('family_id', currentFamilyId).eq('user_id', btn.dataset.id);
        await loadFamilyData();
      });
    });

    list.querySelectorAll('.kick-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('정말 추방하시겠습니까?')) return;
        await sb.from('family_members').delete().eq('family_id', currentFamilyId).eq('user_id', btn.dataset.id);
        await sb.from('users').update({ family_id: null }).eq('id', btn.dataset.id);
        window.location.reload();
      });
    });
  }

  async function loadSettings() {
    const { data: family } = await sb.from('families').select('*').eq('family_id', currentFamilyId).maybeSingle();
    if (!family) return;
    updateGroupName(family.group_name);
    if (family.created_by === currentUserId) {
      document.getElementById('settingsBtn').style.display = '';
    }
  }

  async function loadAll() {
    await loadSchedules();
    loadProgressStats();
    loadAlerts();

    const dateStr = localDateStr(currentDate);
    if (currentView === 'year') renderYearView();
    else if (currentView === 'day') {
      renderDayView();
      navLabel.textContent = `${currentDate.getFullYear()}년 ${currentDate.getMonth()+1}월 ${currentDate.getDate()}일 (${DAY_KO[currentDate.getDay()]})`;
    } else if (currentView === 'week') {
      renderWeekView();
      const weekDates = getWeekDates(currentDate);
      const d1 = new Date(weekDates[0]), d7 = new Date(weekDates[6]);
      navLabel.textContent = `${d1.getMonth()+1}월 ${d1.getDate()}일 - ${d7.getMonth()+1}월 ${d7.getDate()}일`;
    } else if (currentView === 'month') {
      renderMonthView();
      navLabel.textContent = `${currentDate.getFullYear()}년 ${currentDate.getMonth()+1}월`;
    }
    document.getElementById('inlineDateFrom').value = localDateStr(currentDate);
  }

  function navigate(dir) {
    switch (currentView) {
      case 'day': currentDate.setDate(currentDate.getDate() + dir); break;
      case 'week': currentDate.setDate(currentDate.getDate() + (dir * 7)); break;
      case 'month': currentDate.setMonth(currentDate.getMonth() + dir); break;
      case 'year': currentDate.setFullYear(currentDate.getFullYear() + dir); break;
    }
    loadAll();
  }

  async function loadSchedules() {
    if (!currentFamilyId) { allSchedules = []; renderScheduleList(); return; }
    const selectedUsers = Array.from(selectedTargets);
    const q = searchInput.value.trim();
    const dFrom = filterDateFrom.value;
    const dTo = filterDateTo.value;
    const status = filterStatus.value;

    let query = sb.from('schedules').select('*').eq('family_id', currentFamilyId);
    if (selectedUsers.length > 0 && selectedUsers.length < members.length) {
      query = query.in('target_user_id', selectedUsers);
    }
    if (dFrom) query = query.gte('scheduled_from', dFrom.replace(/-/g,'')+'0000');
    if (dTo) query = query.lte('scheduled_to', dTo.replace(/-/g,'')+'2359');
    if (q) query = query.or(`title.ilike.%${q}%,requester.ilike.%${q}%`);

    const { data } = await query;
    allSchedules = (data || []).map(mapSchedule);

    if (status) {
      allSchedules = allSchedules.filter(s => status === 'completed' ? s.completed : !s.completed);
    }

    const dateStr = localDateStr(currentDate);
    if (!q && !dFrom && !dTo) {
      let viewFiltered;
      if (currentView === 'day') {
        viewFiltered = allSchedules.filter(s => s.from.startsWith(dateStr.replace(/-/g,'')));
      } else if (currentView === 'week') {
        const weekDates = getWeekDates(currentDate);
        viewFiltered = allSchedules.filter(s => weekDates.some(wd => s.from.startsWith(wd.replace(/-/g,''))));
      } else if (currentView === 'month') {
        const ym = dateStr.substring(0, 7).replace(/-/g,'');
        viewFiltered = allSchedules.filter(s => s.from.startsWith(ym));
      } else {
        viewFiltered = allSchedules;
      }
      const excludedIncomplete = allSchedules.filter(s => !s.completed && s.from.substring(0,8) <= dateStr.replace(/-/g,'') && !viewFiltered.includes(s));
      allSchedules = [...viewFiltered, ...excludedIncomplete];
    }
    renderScheduleList();
  }

  function renderScheduleList() {
    scheduleListEl.innerHTML = '';
    emptyState.style.display = 'none';
    if (allSchedules.length === 0) { emptyState.style.display = 'block'; return; }
    allSchedules.sort((a, b) => a.from.localeCompare(b.from));
    allSchedules.forEach(s => {
      const targetMember = members.find(m => m.id === s.targetUserId);
      const targetName = targetMember ? targetMember.name : s.targetUserId;
      const creatorName = s.createdBy === s.targetUserId ? '본인' : (members.find(m => m.id === s.createdBy) || {}).name || '-';
      const isMine = s.targetUserId === currentUserId;
      const canEdit = s.createdBy === currentUserId || s.targetUserId === currentUserId;

      const div = document.createElement('div');
      div.className = 'schedule-item' + (s.completed ? ' completed' : '');
      const tipParts = [
        '<b>' + escapeHtml(s.title) + '</b>' + (s.isRecurring ? ' 🔄반복' : ''),
        '시간: ' + fmtDisplay24(s.from) + ' ~ ' + fmtDisplay24(s.to),
        '요청: ' + (s.requester || '-') + ' → ' + targetName + (!isMine ? ' (대리)' : ''),
        '작성: ' + creatorName,
        '진행률: ' + s.progress + '%'
      ];
      div.setAttribute('data-tooltip', tipParts.join('<br>'));
      var pressTimer;
      div.addEventListener('mousedown', function(e) { pressTimer = setTimeout(function() { showTip(div); }, 500); });
      div.addEventListener('mouseup', function() { clearTimeout(pressTimer); });
      div.addEventListener('mouseleave', function() { clearTimeout(pressTimer); });
      div.addEventListener('touchstart', function(e) { pressTimer = setTimeout(function() { showTip(div); }, 500); }, { passive: true });
      div.addEventListener('touchend', function() { clearTimeout(pressTimer); });
      div.addEventListener('touchcancel', function() { clearTimeout(pressTimer); });
      div.addEventListener('dblclick', function(e) {
        e.preventDefault();
        var input = document.getElementById('inlineTitle');
        if (input) { input.value = (input.value ? input.value + ' ' : '') + s.title; input.focus(); input.setSelectionRange(input.value.length, input.value.length); input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; }
      });
      div.innerHTML = `
        <div class="info">
          <div class="title">${s.title} ${s.isRecurring ? '<span class="recur-icon" title="반복 일정">&#x1F504;</span>' : ''}</div>
          <div class="meta">${fmtDisplay24(s.from)} ~ ${fmtDisplay24(s.to)} | ${s.requester || '-'} → ${targetName}${!isMine ? ' [대리]' : ''} | 작성: ${creatorName}</div>
        </div>
        <div class="progress-bar">
          <input type="range" min="0" max="100" value="${s.progress}" data-id="${s.scheduleId}" ${!canEdit ? 'disabled' : ''}>
          <span class="pct">${s.progress}%</span>
        </div>
        <div class="actions">
          ${canEdit ? `<button class="edit" data-id="${s.scheduleId}">수정</button>` : ''}
          ${s.createdBy === currentUserId ? `<button class="delete" data-id="${s.scheduleId}">삭제</button>` : ''}
        </div>`;
      scheduleListEl.appendChild(div);
    });

    scheduleListEl.querySelectorAll('.progress-bar input[type="range"]').forEach(r => {
      r.addEventListener('change', async () => {
        const id = r.dataset.id;
        const val = parseInt(r.value);
        const updates = { progress: val };
        if (val >= 100) updates.completed = true;
        await sb.from('schedules').update(updates).eq('schedule_id', id);
        const pct = r.parentElement.querySelector('.pct');
        if (pct) pct.textContent = val + '%';
        if (val >= 100) loadAll(); else loadProgressStats();
      });
    });

    scheduleListEl.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = allSchedules.find(s => s.scheduleId === btn.dataset.id);
        if (s) openModal(s);
      });
    });

    scheduleListEl.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('일정을 삭제하시겠습니까?')) return;
        await sb.from('schedules').delete().eq('schedule_id', btn.dataset.id);
        loadAll();
      });
    });
  }

  // ─── SCHEDULE TOOLTIP ─────────────────────
  function getTip() {
    var el = document.getElementById('scheduleTip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'scheduleTip';
      document.body.appendChild(el);
    }
    return el;
  }
  function showTip(el) {
    var tip = getTip();
    tip.innerHTML = el.getAttribute('data-tooltip');
    tip.classList.add('show');
    var rect = el.getBoundingClientRect();
    var x = Math.min(rect.left + 10, window.innerWidth - 310);
    var y = rect.bottom + 6;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() {
    var tip = getTip();
    tip.classList.remove('show');
  }
  if (!window._tipDismissSet) {
    window._tipDismissSet = true;
    document.addEventListener('mousedown', function() { hideTip(); });
    document.addEventListener('touchstart', function() { hideTip(); }, { passive: true });
  }

  async function loadProgressStats() {
    if (!currentFamilyId) return;
    const { data } = await sb.from('schedules').select('*').eq('family_id', currentFamilyId);
    let schedules = (data || []).map(mapSchedule);

    const today = new Date();
    let fromDate;
    switch (currentView) {
      case 'day': fromDate = currentDate; break;
      case 'week': fromDate = new Date(currentDate); fromDate.setDate(fromDate.getDate() - 7); break;
      case 'month': fromDate = new Date(currentDate); fromDate.setDate(fromDate.getDate() - 30); break;
      case 'year': fromDate = new Date(currentDate); fromDate.setDate(fromDate.getDate() - 365); break;
      default: fromDate = new Date(0); break;
    }
    const fromStr = localDateStr(fromDate);
    const toStr = localDateStr(currentView === 'day' ? currentDate : today);
    schedules = schedules.filter(s => s.from.substring(0,8) >= fromStr.replace(/-/g,'') && s.from.substring(0,8) <= toStr.replace(/-/g,''));
    progressSection.innerHTML = '';
    Object.values(chartInstances).forEach(c => c.destroy());
    chartInstances = {};

    if (members.length === 0) {
      progressSection.innerHTML = '<div class="empty-state" style="padding:16px"><p>가족 그룹에 가입하면 진행률을 확인할 수 있습니다.</p></div>';
      return;
    }

    const accent = accentColor();
    const personData = members.map(m => {
      const scheds = schedules.filter(s => s.targetUserId === m.id);
      const completed = scheds.filter(s => s.completed).length;
      const inProgress = scheds.filter(s => !s.completed && s.progress > 0).length;
      const notStarted = scheds.length - completed - inProgress;
      return { name: m.name, completed, inProgress, notStarted, total: scheds.length };
    });

    const names = personData.map(p => p.name);
    const periodLabel = currentView === 'day' ? localDateStr(currentDate) :
      currentView === 'week' ? `${fromStr} ~ ${toStr}` :
      currentView === 'month' ? `${fromStr} ~ ${toStr}` :
      `${fromStr} ~ ${toStr}`;
    progressSection.innerHTML = `<div class="progress-card" style="width:100%;max-width:600px;margin:0 auto"><div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:8px">${periodLabel} 통계</div><canvas id="chart-bar"></canvas></div>`;
    const ctx = document.getElementById('chart-bar');
    if (ctx) {
      Object.values(chartInstances).forEach(c => c.destroy());
      chartInstances = {};
      chartInstances.bar = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: names,
          datasets: [
            { label: '완료', data: personData.map(p => p.completed), backgroundColor: accent, borderRadius: 0 },
            { label: '진행중', data: personData.map(p => p.inProgress), backgroundColor: '#3498db', borderRadius: 0 },
            { label: '미시작', data: personData.map(p => p.notStarted), backgroundColor: '#e0e0e0', borderRadius: 0 }
          ]
        },
        options: {
          responsive: true,
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } },
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } } }
        }
      });
    }
  }

  async function loadAlerts() {
    if (!currentFamilyId) return;
    const today = getToday().replace(/-/g, '');
    const { data: todayData } = await sb.from('schedules').select('schedule_id').eq('family_id', currentFamilyId).gte('scheduled_from', today+'0000').lte('scheduled_from', today+'2359');
    document.getElementById('todayCount').textContent = (todayData || []).length;

    const weekDates = getWeekDates(new Date());
    const wFrom = weekDates[0].replace(/-/g,'')+'0000';
    const wTo = weekDates[6].replace(/-/g,'')+'2359';
    const { data: weekData } = await sb.from('schedules').select('schedule_id').eq('family_id', currentFamilyId).gte('scheduled_from', wFrom).lte('scheduled_from', wTo);
    document.getElementById('weekCount').textContent = (weekData || []).length;
  }

  function setupInlineAdd() {
    const inlineTarget = document.getElementById('inlineTarget');
    inlineTarget.innerHTML = '';
    members.forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tbtn' + (m.id === currentUserId ? ' active' : '');
      btn.dataset.id = m.id;
      btn.textContent = m.name;
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const activeCount = inlineTarget.querySelectorAll('.tbtn[data-id].active').length;
        if (activeCount === members.length) allBtn.classList.add('active');
        else allBtn.classList.remove('active');
      });
      inlineTarget.appendChild(btn);
    });
    const inlineTargetAll = document.getElementById('inlineTargetAll');
    inlineTargetAll.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'tbtn';
    allBtn.textContent = '모두';
    allBtn.addEventListener('click', () => {
      const active = inlineTarget.querySelectorAll('.tbtn.active');
      if (active.length === members.length) {
        inlineTarget.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
        inlineTarget.querySelector('.tbtn[data-id="' + currentUserId + '"]').classList.add('active');
        allBtn.classList.remove('active');
      } else {
        inlineTarget.querySelectorAll('.tbtn[data-id]').forEach(b => b.classList.add('active'));
        allBtn.classList.add('active');
      }
    });
    inlineTargetAll.appendChild(allBtn);
    document.getElementById('inlineDateFrom').value = getToday();

    async function refreshDefaultTime() {
      const today = getToday().replace(/-/g,'');
      const { data } = await sb.from('schedules').select('scheduled_to')
        .eq('family_id', currentFamilyId).eq('target_user_id', currentUserId)
        .gte('scheduled_from', today+'0000').lte('scheduled_from', today+'2359');
      let fromTime;
      if (data && data.length > 0) {
        const maxTo = data.reduce((max, s) => s.scheduled_to > max ? s.scheduled_to : max, '');
        fromTime = maxTo.substring(8,10) + ':' + maxTo.substring(10,12);
      } else {
        const now = new Date();
        fromTime = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      }
      document.getElementById('inlineTimeFrom').value = fromTime;
      const [h, m] = fromTime.split(':');
      const toDate = new Date(2026,0,1,parseInt(h),parseInt(m)+30);
      document.getElementById('inlineTimeTo').value = String(toDate.getHours()).padStart(2,'0')+':'+String(toDate.getMinutes()).padStart(2,'0');
    }
    refreshDefaultTime();

    var inlineTitle = document.getElementById('inlineTitle');
    inlineTitle.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });

    document.getElementById('inlineProgress').addEventListener('input', (e) => {
      document.getElementById('inlineProgressVal').textContent = e.target.value + '%';
    });

    document.getElementById('inlineRecurring').addEventListener('change', (e) => {
      document.getElementById('inlineRecurEnd').style.display = e.target.value ? 'inline' : 'none';
    });

    document.getElementById('inlineDateFrom').addEventListener('change', () => {
      document.getElementById('inlineDateTo').value = document.getElementById('inlineDateFrom').value;
    });
    document.getElementById('inlineDateTo').value = document.getElementById('inlineDateFrom').value;

    document.getElementById('toggleDetailBtn').addEventListener('click', () => {
      const detail = document.getElementById('inlineDetail');
      const btn = document.getElementById('toggleDetailBtn');
      if (detail.style.display === 'none') {
        detail.style.display = 'block'; btn.textContent = '\u25B2';
        document.getElementById('inlineDateTo').value = document.getElementById('inlineDateFrom').value;
      }
      else { detail.style.display = 'none'; btn.textContent = '\u25BC'; }
    });

    document.getElementById('inlineAddBtn').addEventListener('click', async () => {
      if (isSaving) return;
      const title = document.getElementById('inlineTitle').value.trim();
      if (!title) return;
      const recurring = document.getElementById('inlineRecurring').value;
      const targets = Array.from(document.querySelectorAll('#inlineTarget .tbtn.active[data-id]')).map(b => b.dataset.id);
      if (targets.length === 0) return;
      isSaving = true;
      var addBtn = document.getElementById('inlineAddBtn');
      addBtn.disabled = true;
      addBtn.textContent = '저장 중...';
      try {
        for (const uid of targets) {
          const row = buildScheduleRow(
            title, uid,
            document.getElementById('inlineRequester').value.trim(),
            document.getElementById('inlineDateFrom').value,
            document.getElementById('inlineTimeFrom').value,
            document.getElementById('inlineDateTo').value,
            document.getElementById('inlineTimeTo').value,
            parseInt(document.getElementById('inlineProgress').value),
            false, recurring,
            recurring ? document.getElementById('inlineRecurEnd').value : null
          );
          await saveRow(row, recurring, null);
        }
        document.getElementById('inlineTitle').value = '';
        document.getElementById('inlineRequester').value = '';
        document.getElementById('inlineProgress').value = 0;
        document.getElementById('inlineProgressVal').textContent = '0%';
        document.getElementById('inlineRecurring').value = '';
        document.getElementById('inlineRecurEnd').value = '';
        document.getElementById('inlineRecurEnd').style.display = 'none';
        await refreshDefaultTime();
        loadAll();
      } finally {
        isSaving = false;
        addBtn.disabled = false;
        addBtn.textContent = '+ 추가';
      }
    });
  }

  function fmt24(d, t) { return d.replace(/-/g, '') + (t || '0000').replace(':', ''); }
  function fmtDisplay24(v) { if (!v || v.length < 12) return ''; return v.substring(0,4)+'-'+v.substring(4,6)+'-'+v.substring(6,8)+' '+v.substring(8,10)+':'+v.substring(10,12); }
  function buildScheduleRow(title, target, requester, df, tf, dt, tt, progress, completed, recurring, recurEnd) {
    const now = new Date();
    const defaultFrom = String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0');
    const toDate = new Date(now.getTime() + 30 * 60000);
    const defaultTo = String(toDate.getHours()).padStart(2,'0') + String(toDate.getMinutes()).padStart(2,'0');
    const sf = fmt24(df || getToday(), tf || defaultFrom);
    const st = fmt24(dt || df || getToday(), tt || defaultTo);
    return {
      title, target_user_id: target, requester: requester || '',
      scheduled_from: sf, scheduled_to: st,
      scheduled_date: sf.substring(0,4)+'-'+sf.substring(4,6)+'-'+sf.substring(6,8),
      scheduled_time: sf.substring(8,10)+':'+sf.substring(10,12),
      duration: '',
      progress, completed,
      is_recurring: !!recurring, recurring_type: recurring || null, recurring_end_date: recurEnd || null
    };
  }

  function setupModal() {
    document.getElementById('modalCancelBtn').addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    document.getElementById('schedDateFrom').addEventListener('change', () => {
      document.getElementById('schedDateTo').value = document.getElementById('schedDateFrom').value;
    });
    document.querySelectorAll('.time-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var target = document.getElementById(this.dataset.target);
        var delta = parseInt(this.dataset.delta);
        var val = target.value;
        if (!val) val = '00:00';
        var parts = val.split(':');
        var h = parseInt(parts[0]), m = parseInt(parts[1]);
        var total = h * 60 + m + delta;
        if (total < 0) total += 24 * 60;
        if (total >= 24 * 60) total -= 24 * 60;
        var nh = Math.floor(total / 60), nm = total % 60;
        target.value = String(nh).padStart(2, '0') + ':' + String(nm).padStart(2, '0');
      });
    });
    document.getElementById('schedProgress').addEventListener('input', (e) => {
      document.getElementById('schedProgressVal').textContent = e.target.value + '%';
    });
    schedRecurring.addEventListener('change', () => {
      recurEndGroup.style.display = schedRecurring.value ? 'block' : 'none';
    });
    document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSaving) return;
      const editId = document.getElementById('editScheduleId').value;
      const recurring = document.getElementById('schedRecurring').value;
      const targets = Array.from(document.querySelectorAll('#schedTarget .tbtn.active')).map(b => b.dataset.id);
      if (targets.length === 0) return;
      isSaving = true;
      var submitBtn = document.querySelector('#scheduleForm button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '저장 중...';
      try {
        for (const uid of targets) {
          const row = buildScheduleRow(
            document.getElementById('schedTitle').value.trim(), uid,
            document.getElementById('schedRequester').value.trim(),
            document.getElementById('schedDateFrom').value,
            document.getElementById('schedTimeFrom').value,
            document.getElementById('schedDateTo').value,
            document.getElementById('schedTimeTo').value,
            parseInt(document.getElementById('schedProgress').value),
            false, recurring,
            recurring ? document.getElementById('schedRecurEnd').value : null
          );
          await saveRow(row, recurring, editId);
        }
        modal.style.display = 'none';
        loadAll();
      } finally {
        isSaving = false;
        submitBtn.disabled = false;
        submitBtn.textContent = '저장';
      }
    });
  }

  function openModal(schedule = null) {
    const targetDiv = document.getElementById('schedTarget');
    targetDiv.innerHTML = '';
    members.forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tbtn';
      btn.dataset.id = m.id;
      btn.textContent = m.name;
      btn.addEventListener('click', () => { btn.classList.toggle('active'); });
      targetDiv.appendChild(btn);
    });
    if (schedule) {
      document.getElementById('modalTitle').textContent = '일정 수정';
      document.getElementById('editScheduleId').value = schedule.scheduleId;
      document.getElementById('schedTitle').value = schedule.title;
      targetDiv.querySelector('.tbtn[data-id="' + schedule.targetUserId + '"]')?.classList.add('active');
      document.getElementById('schedRequester').value = schedule.requester;
      const f = schedule.from || '';
      document.getElementById('schedDateFrom').value = f.substring(0,4)+'-'+f.substring(4,6)+'-'+f.substring(6,8);
      document.getElementById('schedTimeFrom').value = f.substring(8,10)+':'+f.substring(10,12);
      const t = schedule.to || '';
      document.getElementById('schedDateTo').value = t.substring(0,4)+'-'+t.substring(4,6)+'-'+t.substring(6,8);
      document.getElementById('schedTimeTo').value = t.substring(8,10)+':'+t.substring(10,12);
      document.getElementById('schedProgress').value = schedule.progress;
      document.getElementById('schedProgressVal').textContent = schedule.progress + '%';
      document.getElementById('schedRecurring').value = '';
      document.getElementById('schedRecurEnd').value = '';
      recurEndGroup.style.display = 'none';
    } else {
      document.getElementById('modalTitle').textContent = '일정 추가';
      document.getElementById('editScheduleId').value = '';
      document.getElementById('scheduleForm').reset();
      targetDiv.querySelector('.tbtn[data-id="' + currentUserId + '"]')?.classList.add('active');
      document.getElementById('schedDateFrom').value = getToday();
      document.getElementById('schedDateTo').value = getToday();
      document.getElementById('schedProgress').value = 0;
      document.getElementById('schedProgressVal').textContent = '0%';
      document.getElementById('schedRecurring').value = '';
      document.getElementById('schedRecurEnd').value = '';
      recurEndGroup.style.display = 'none';
    }
    modal.style.display = 'flex';
  }

  async function saveRow(row, recurring, editId) {
    if (editId) {
      await sb.from('schedules').update(row).eq('schedule_id', editId);
    } else {
      function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c=='x'?r:(r&0x3|0x8)).toString(16); }); }
      row.schedule_id = uuid();
      row.family_id = currentFamilyId;
      row.created_by = currentUserId;
      if (recurring && row.recurring_end_date) {
        const rows = [];
        const endDate = new Date(row.recurring_end_date);
        const fromDate = row.scheduled_from.substring(0,8);
        let cur = new Date(fromDate.substring(0,4)+'-'+fromDate.substring(4,6)+'-'+fromDate.substring(6,8)+'T00:00:00');
        while (cur <= endDate) {
          const ds = localDateStr(cur).replace(/-/g,'');
          rows.push({ ...row, schedule_id: uuid(),
            scheduled_from: ds + row.scheduled_from.substring(8),
            scheduled_to: ds + row.scheduled_to.substring(8),
            scheduled_date: localDateStr(cur),
            scheduled_time: row.scheduled_from.substring(8,10)+':'+row.scheduled_from.substring(10,12)
          });
          switch (recurring) {
            case 'daily': cur.setDate(cur.getDate() + 1); break;
            case 'weekly': cur.setDate(cur.getDate() + 7); break;
            case 'monthly': cur.setMonth(cur.getMonth() + 1); break;
            case 'yearly': cur.setFullYear(cur.getFullYear() + 1); break;
            default: cur = new Date(endDate.getTime() + 86400000); break;
          }
        }
        await sb.from('schedules').insert(rows);
      } else {
        await sb.from('schedules').insert(row);
      }
    }
    if (!editId && row.target_user_id && row.target_user_id !== currentUserId) {
      fetch('https://ytltbzoefmuoqpycgudr.supabase.co/functions/v1/send-push', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ record: { target_user_id: row.target_user_id, created_by: currentUserId, title: row.title } })
      });
    }
  }

  // CALENDAR RENDERERS
  function renderDayView() { container.innerHTML = ''; }

  function renderWeekView() {
    const dates = getWeekDates(currentDate);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    container.innerHTML = `<div class="calendar-grid" style="grid-template-columns:repeat(7,1fr)">
      ${dayNames.map(d => `<div class="day-header">${d}</div>`).join('')}
      ${dates.map(d => {
        const dd = new Date(d); const isToday = d === getToday();
        const hasSch = allSchedules.some(s => s.from.startsWith(d.replace(/-/g,'')));
        const isSel = d === localDateStr(currentDate);
        return `<div class="calendar-day${isToday?' today':''}${hasSch?' has-schedule':''}${isSel?' selected':''}" data-date="${d}">${dd.getDate()}</div>`;
      }).join('')}</div>`;
    container.querySelectorAll('.calendar-day').forEach(el => {
      el.addEventListener('click', () => {
        currentDate = new Date(el.dataset.date + 'T00:00:00');
        loadAll();
      });
    });
  }

  function renderMonthView() {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(), totalDays = lastDay.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'], today = getToday();
    let html = '<div class="calendar-grid">' + dayNames.map(d => `<div class="day-header">${d}</div>`).join('');
    for (let i = 0; i < startPad; i++) html += '<div class="calendar-day other-month"></div>';
    for (let d = 1; d <= totalDays; d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = ds === today, hasSch = allSchedules.some(s => s.from.startsWith(ds.replace(/-/g,'')));
      const isSel = ds === localDateStr(currentDate);
      html += `<div class="calendar-day${isToday?' today':''}${hasSch?' has-schedule':''}${isSel?' selected':''}" data-date="${ds}">${d}</div>`;
    }
    html += '</div>'; container.innerHTML = html;
    container.querySelectorAll('.calendar-day').forEach(el => {
      el.addEventListener('click', () => { if (el.dataset.date) { currentDate = new Date(el.dataset.date + 'T00:00:00'); loadAll(); } });
    });
  }

  function renderYearView() {
    const year = currentDate.getFullYear();
    let html = '<div class="year-grid">';
    for (let m = 0; m < 12; m++) {
      const ms = `${year}-${String(m+1).padStart(2,'0')}`;
      const cnt = allSchedules.filter(s => s.date.startsWith(ms)).length;
      html += `<div class="year-month-card" data-month="${m+1}"><div class="month-name">${m+1}월</div><div class="month-count">${cnt}건</div></div>`;
    }
    html += '</div>'; container.innerHTML = html;
    navLabel.textContent = `${year}년`;
    container.querySelectorAll('.year-month-card').forEach(el => {
      el.addEventListener('click', () => {
        currentView = 'month'; currentDate = new Date(year, parseInt(el.dataset.month) - 1, 1);
        document.querySelectorAll('#viewTabs button').forEach(b => b.classList.remove('active'));
        document.querySelector('#viewTabs button[data-view="month"]').classList.add('active');
        loadAll();
      });
    });
  }

  function updateGroupName(name) {
    const title = document.getElementById('familyPanelTitle');
    const h1 = document.querySelector('.header h1');
    if (name) { if (title) title.textContent = name + ' 구성원 관리'; if (h1) h1.textContent = name; }
    saveGroupName(name);
  }

  // SETTINGS MODAL
  function setupSettingsModal() {
    const sm = document.getElementById('settingsModal');
    document.getElementById('settingsBtn')?.addEventListener('click', async () => {
      const { data: fam } = await sb.from('families').select('*').eq('family_id', currentFamilyId).maybeSingle();
      document.getElementById('settingsGroupName').value = (fam && fam.group_name) || '';
      sm.style.display = 'flex';
    });
    document.getElementById('settingsCancelBtn')?.addEventListener('click', () => { sm.style.display = 'none'; });
    sm?.addEventListener('click', e => { if (e.target === sm) sm.style.display = 'none'; });
    document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await sb.from('families').update({
        group_name: document.getElementById('settingsGroupName').value.trim().slice(0, 30)
      }).eq('family_id', currentFamilyId);
      const { data: fam } = await sb.from('families').select('*').eq('family_id', currentFamilyId).maybeSingle();
      if (fam) updateGroupName(fam.group_name);
      sm.style.display = 'none';
    });
  }

  function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }
  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  init();
})();
