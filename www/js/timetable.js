(async function() {
  var session = await getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  var currentFamilyId = session.familyId;
  var currentUserId = session.id;
  var currentDate = new Date();
  var viewStyle = 'o';
  var members = [];
  var selectedTargets = new Set();

  const header = document.getElementById('header');
  if (header) {
    header.innerHTML = `<div class="header" style="margin-bottom:0">
      <h1>FAMILY PLAN</h1>
      <div class="header-nav">
        <a href="dashboard.html">메인</a>
        <a href="timetable.html" style="font-weight:700;color:var(--color-accent)">시간표</a>
        <a href="mypage.html">MY</a>
        <button id="ttLogoutBtn">LogOut</button>
        ${renderBellIcon()}
      </div></div>`;
    document.getElementById('ttLogoutBtn').addEventListener('click', async () => {
      await clearSession();
      window.location.href = 'login.html';
    });
    loadUnreadCount();
  }

  function accentColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#03c75a';
  }

  async function loadMembers() {
    if (!currentFamilyId) return;
    const { data: memberRows } = await sb.from('family_members').select('user_id').eq('family_id', currentFamilyId);
    const userIds = (memberRows || []).map(m => m.user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await sb.from('users').select('id, name').in('id', userIds);
      members = (memberRows || []).map(m => {
        const p = (profiles || []).find(u => u.id === m.user_id);
        return { id: m.user_id, name: p ? p.name : m.user_id };
      });
    }
    selectedTargets.clear();
    members.forEach(m => selectedTargets.add(m.id));
    renderTargetButtons();
  }

  function renderTargetButtons() {
    const filterDiv = document.getElementById('ttTargetFilter');
    filterDiv.innerHTML = '';
    if (members.length <= 1) return;
    members.forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tbtn' + (selectedTargets.has(m.id) ? ' active' : '');
      btn.dataset.id = m.id;
      btn.textContent = m.name;
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        if (btn.classList.contains('active')) selectedTargets.add(m.id);
        else selectedTargets.delete(m.id);
        if (selectedTargets.size === 0) { selectedTargets.add(m.id); btn.classList.add('active'); }
        syncAllBtn();
        loadTimetable();
      });
      filterDiv.appendChild(btn);
    });
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'tbtn' + (selectedTargets.size === members.length ? ' active' : '');
    allBtn.textContent = '모두';
    allBtn.addEventListener('click', () => {
      if (selectedTargets.size === members.length) {
        selectedTargets.clear();
        selectedTargets.add(currentUserId);
      } else {
        members.forEach(m => selectedTargets.add(m.id));
      }
      renderTargetButtons();
      loadTimetable();
    });
    filterDiv.appendChild(allBtn);
  }

  function syncAllBtn() {
    const allBtn = document.getElementById('ttTargetFilter').querySelector('.tbtn:last-child');
    if (!allBtn || allBtn.textContent !== '모두') return;
    if (selectedTargets.size === members.length) allBtn.classList.add('active');
    else allBtn.classList.remove('active');
  }

  function getName(uid) {
    const m = members.find(m => m.id === uid);
    return m ? m.name : uid;
  }

  async function loadTimetable() {
    const dateStr = localDateStr(currentDate);
    document.getElementById('ttDate').textContent = dateStr + ' (' + DAY_KO[currentDate.getDay()] + ')';
    if (!currentFamilyId || selectedTargets.size === 0) return;

    const ds = dateStr.replace(/-/g,'');
    const targetIds = Array.from(selectedTargets);
    const { data } = await sb.from('schedules').select('*')
      .eq('family_id', currentFamilyId)
      .in('target_user_id', targetIds)
      .gte('scheduled_from', ds+'0000').lte('scheduled_from', ds+'2359')
      .order('scheduled_from');

    const schedules = (data || []).map(mapSchedule);

    if (schedules.length === 0) {
      document.getElementById('ttContent').innerHTML = '<div class="tt-empty">등록된 일정이 없습니다</div>';
      return;
    }

    if (viewStyle === 'h') renderHorizontal(schedules);
    else if (viewStyle === 'v') renderVertical(schedules);
    else if (viewStyle === 'c') renderCard(schedules);
    else if (viewStyle === 'o') renderCircle(schedules);
  }

  function renderHorizontal(schedules) {
    function f24(v) { if(!v||v.length<12)return'';return v.substring(0,4)+'-'+v.substring(4,6)+'-'+v.substring(6,8)+' '+v.substring(8,10)+':'+v.substring(10,12); }
    const accent = accentColor();
    const colorPalette = ['#03c75a','#3498db','#e74c3c','#f39c12','#9b59b6','#1abc9c','#e67e22','#2ecc71'];
    let html = '<div class="tt-time-labels">';
    for (let h = 0; h <= 24; h += 3) html += '<span>' + h + '시</span>';
    html += '</div>';
    schedules.forEach((s, idx) => {
      const fh = parseInt(s.from.substring(8,10)) + parseInt(s.from.substring(10,12))/60;
      const th = parseInt(s.to.substring(8,10)) + parseInt(s.to.substring(10,12))/60;
      const left = (fh / 24) * 100;
      const width = Math.max(1, ((th - fh) / 24) * 100);
      let bg = colorPalette[idx % colorPalette.length];
      html += '<div class="tt-block-row"><div class="tt-block-h tt-hbar" data-idx="' + idx + '" style="left:' + left + '%;width:' + width + '%;background:' + bg + '" title="' + s.title + ' ' + f24(s.from) + '~' + f24(s.to) + '">[' + getName(s.targetUserId) + '] ' + s.title + '</div></div>';
    });
    html += '<div class="tt-circle-legend" style="margin-top:12px">';
    schedules.forEach((s, idx) => {
      let bg = colorPalette[idx % colorPalette.length];
      html += '<div class="tt-leg-item" data-idx="' + idx + '"><div class="tt-leg-dot" style="background:' + bg + '"></div><span>' + getName(s.targetUserId) + ' ' + s.title + '</span><span class="tt-leg-time">' + s.from.substring(8,10) + ':' + s.from.substring(10,12) + '~' + s.to.substring(8,10) + ':' + s.to.substring(10,12) + '</span></div>';
    });
    html += '</div>';
    document.getElementById('ttContent').innerHTML = html;

    document.querySelectorAll('.tt-leg-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        const idx = item.dataset.idx;
        document.querySelectorAll('.tt-hbar').forEach(bar => {
          bar.style.opacity = bar.dataset.idx === idx ? '1' : '0.2';
        });
      });
      item.addEventListener('mouseleave', () => {
        document.querySelectorAll('.tt-hbar').forEach(bar => { bar.style.opacity = '1'; });
      });
    });
  }

  function renderVertical(schedules) {
    const colorPalette = ['#03c75a','#3498db','#e74c3c','#f39c12','#9b59b6','#1abc9c','#e67e22','#2ecc71'];
    let html = '';
    schedules.forEach((s, idx) => {
      const ft = s.from.substring(8,10) + ':' + s.from.substring(10,12);
      const tt = s.to.substring(8,10) + ':' + s.to.substring(10,12);
      let bg = colorPalette[idx % colorPalette.length];
      html += '<div class="tt-v-item"><div class="tt-v-time">' + ft + '</div><div class="tt-v-info"><div class="tt-v-title">[' + getName(s.targetUserId) + '] ' + s.title + '</div><div class="tt-v-detail">' + ft + ' ~ ' + tt + ' | ' + (s.requester || '') + '</div><div class="tt-v-bar"><div class="tt-v-bar-fill" style="width:' + s.progress + '%;background:' + bg + '"></div></div></div></div>';
    });
    document.getElementById('ttContent').innerHTML = html;
  }

  function renderCard(schedules) {
    const colorPalette = ['#03c75a','#3498db','#e74c3c','#f39c12','#9b59b6','#1abc9c','#e67e22','#2ecc71'];
    let html = '';
    schedules.forEach((s, idx) => {
      const ft = s.from.substring(8,10) + ':' + s.from.substring(10,12);
      const tt = s.to.substring(8,10) + ':' + s.to.substring(10,12);
      let bg = colorPalette[idx % colorPalette.length];
      html += '<div class="tt-card"><div class="tt-card-title">' + s.title + ' <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);font-weight:400">' + getName(s.targetUserId) + '</span></div><div class="tt-card-time">' + ft + ' ~ ' + tt + (s.requester ? ' | ' + s.requester : '') + '</div><div class="tt-card-bar"><div class="tt-card-bar-fill" style="width:' + s.progress + '%;background:' + bg + '"></div></div><div style="font-size:10px;color:var(--color-text-secondary);margin-top:2px">' + s.progress + '%</div></div>';
    });
    document.getElementById('ttContent').innerHTML = html;
  }

  function renderCircle(schedules) {
    const accent = accentColor();
    const colorPalette = ['#03c75a','#3498db','#e74c3c','#f39c12','#9b59b6','#1abc9c','#e67e22','#2ecc71'];
    const cx = 140, cy = 140, outerR = 120, innerR = 85;
    let svg = '<svg viewBox="0 0 280 280" style="max-width:280px;width:100%">';
    svg += '<defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#fff" stroke-width="2" opacity="0.5"/></pattern></defs>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + outerR + '" stroke="#e0e0e0" stroke-width="2" fill="none"/>';
    for (let h = 0; h < 24; h++) {
      const angle = (h / 24) * 360 - 90;
      const rad = angle * Math.PI / 180;
      const x1 = cx + (outerR - 6) * Math.cos(rad);
      const y1 = cy + (outerR - 6) * Math.sin(rad);
      const x2 = cx + (outerR + 2) * Math.cos(rad);
      const y2 = cy + (outerR + 2) * Math.sin(rad);
      svg += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (h % 3 === 0 ? '#999' : '#ddd') + '" stroke-width="' + (h % 3 === 0 ? 1.5 : 0.5) + '"/>';
    }
    for (let h = 0; h < 24; h += 3) {
      const angle = (h / 24) * 360 - 90;
      const rad = angle * Math.PI / 180;
      const tx = cx + (outerR + 14) * Math.cos(rad);
      const ty = cy + (outerR + 14) * Math.sin(rad) + 4;
      svg += '<text x="' + tx + '" y="' + ty + '" text-anchor="middle" font-size="10" fill="#666">' + h + '</text>';
    }
    schedules.forEach((s, idx) => {
      const fh = parseInt(s.from.substring(8,10)) + parseInt(s.from.substring(10,12))/60;
      const th = parseInt(s.to.substring(8,10)) + parseInt(s.to.substring(10,12))/60;
      const startAngle = (fh / 24) * 360 - 90;
      const endAngle = (th / 24) * 360 - 90;
      const largeArc = (th - fh) > 12 ? 1 : 0;
      const sr = startAngle * Math.PI / 180;
      const er = endAngle * Math.PI / 180;
      const x1 = cx + outerR * Math.cos(sr);
      const y1 = cy + outerR * Math.sin(sr);
      const x2 = cx + outerR * Math.cos(er);
      const y2 = cy + outerR * Math.sin(er);
      const ix1 = cx + innerR * Math.cos(sr);
      const iy1 = cy + innerR * Math.sin(sr);
      const ix2 = cx + innerR * Math.cos(er);
      const iy2 = cy + innerR * Math.sin(er);
      let bg = colorPalette[idx % colorPalette.length];
      if (s.completed) bg = colorPalette[idx % colorPalette.length];

      const pathD = 'M' + x1 + ',' + y1 + ' A' + outerR + ',' + outerR + ' 0 ' + largeArc + ' 1 ' + x2 + ',' + y2 + ' L' + ix2 + ',' + iy2 + ' A' + innerR + ',' + innerR + ' 0 ' + largeArc + ' 0 ' + ix1 + ',' + iy1 + ' Z';
      svg += '<path class="tt-arc" data-idx="' + idx + '" d="' + pathD + '" fill="' + bg + '" opacity="0.8"/>';
      if (s.progress > 0 && !s.completed) {
        const midAngle = startAngle + (endAngle - startAngle) * (s.progress / 100);
        const mr = midAngle * Math.PI / 180;
        const mx1 = cx + outerR * Math.cos(mr);
        const my1 = cy + outerR * Math.sin(mr);
        const mx2 = cx + innerR * Math.cos(mr);
        const my2 = cy + innerR * Math.sin(mr);
        const midLarge = (midAngle - startAngle) > 180 ? 1 : 0;
        const hatchD = 'M' + x1 + ',' + y1 + ' A' + outerR + ',' + outerR + ' 0 ' + midLarge + ' 1 ' + mx1 + ',' + my1 + ' L' + mx2 + ',' + my2 + ' A' + innerR + ',' + innerR + ' 0 ' + midLarge + ' 0 ' + ix1 + ',' + iy1 + ' Z';
        svg += '<path class="tt-arc" data-idx="' + idx + '" d="' + hatchD + '" fill="url(#hatch)"/>';
      }
    });
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + innerR + '" fill="#fff"/>';
    const now = new Date();
    const nowH = now.getHours() + now.getMinutes()/60;
    const nowAngle = (nowH / 24) * 360 - 90;
    const nr = nowAngle * Math.PI / 180;
    const nx = cx + (innerR - 20) * Math.cos(nr);
    const ny = cy + (innerR - 20) * Math.sin(nr);
    svg += '<text x="' + nx + '" y="' + (ny + 6) + '" text-anchor="middle" font-size="20" font-weight="800" fill="' + accent + '">' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + '</text>';
    svg += '</svg>';

    let legend = '<div class="tt-circle-legend">';
    schedules.forEach((s, idx) => {
      let bg = colorPalette[idx % colorPalette.length];
      if (s.completed) bg = colorPalette[idx % colorPalette.length];
      legend += '<div class="tt-leg-item" data-idx="' + idx + '"><div class="tt-leg-dot" style="background:' + bg + '"></div><span>' + getName(s.targetUserId) + ' ' + s.title + '</span><span class="tt-leg-time">' + s.from.substring(8,10) + ':' + s.from.substring(10,12) + '~' + s.to.substring(8,10) + ':' + s.to.substring(10,12) + '</span></div>';
    });
    legend += '</div>';

    document.getElementById('ttContent').innerHTML = '<div class="tt-circle-wrap">' + svg + legend + '</div>';

    document.querySelectorAll('.tt-leg-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        const idx = item.dataset.idx;
        document.querySelectorAll('.tt-arc').forEach(arc => {
          arc.style.opacity = arc.dataset.idx === idx ? '1' : '0.2';
        });
      });
      item.addEventListener('mouseleave', () => {
        document.querySelectorAll('.tt-arc').forEach(arc => {
          arc.style.opacity = '0.8';
        });
      });
    });
  }

  document.getElementById('ttPrev').addEventListener('click', () => { currentDate.setDate(currentDate.getDate()-1); loadTimetable(); });
  document.getElementById('ttNext').addEventListener('click', () => { currentDate.setDate(currentDate.getDate()+1); loadTimetable(); });
  document.getElementById('ttToday').addEventListener('click', () => { currentDate = new Date(); loadTimetable(); });

  document.getElementById('ttStyleTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-style]');
    if (!btn) return;
    viewStyle = btn.dataset.style;
    document.querySelectorAll('#ttStyleTabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadTimetable();
  });

  await loadMembers();
  loadTimetable();
})();
