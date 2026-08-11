(function() {
  const path = window.location.pathname.replace(/\/$/, '').split('/').pop() || 'index.html';

  if (path === 'login.html' || path === 'login' || path === '') {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('loginId').value.trim();
        const pass = document.getElementById('loginPass').value;
        if (!id || !pass) {
          showError(null, '아이디와 비밀번호를 입력하세요.');
          return;
        }
        try {
          if (typeof sb === 'undefined') { showError(null, 'DB 연결 준비 중... 잠시 후 다시 시도해주세요.'); return; }
          const { data: user, error } = await sb.from('users').select('*').eq('id', id).maybeSingle();
          if (error) { showError(null, '로그인 오류: ' + error.message); return; }
          if (!user) { showError(null, 'ID 또는 비밀번호가 일치하지 않습니다.'); return; }
          if (!bcryptjs.compareSync(pass, user.pass)) {
            showError(null, 'ID 또는 비밀번호가 일치하지 않습니다.');
            return;
          }
          await saveSession({ id: user.id, name: user.name, familyId: user.family_id });
          window.location.href = 'dashboard.html';
        } catch (err) {
          showError(null, '네트워크 오류: ' + (err.message || '연결 실패'));
        }
      });
    }
  }

  if (path === 'signup.html' || path === 'signup') {
    let mode = 'create';
    const modeTabs = document.getElementById('modeTabs');
    getUniqueFamilyKey().then(k => { document.getElementById('keyInput').value = k; });
    if (modeTabs) {
      modeTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-mode]');
        if (!btn) return;
        mode = btn.dataset.mode;
        modeTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const label = document.getElementById('keyLabel');
        const hint = document.getElementById('keyHint');
        if (mode === 'create') {
          label.textContent = '그룹 키 (4자리)';
          hint.textContent = '자동 생성되는 그룹 키입니다. 가족원에게 이 키를 공유하세요.';
          document.getElementById('keyInput').readOnly = true;
          getUniqueFamilyKey().then(k => { document.getElementById('keyInput').value = k; });
        } else {
          label.textContent = '참여 키 (4자리)';
          hint.textContent = '가족 그룹 생성자에게 받은 4자리 키를 입력하세요.';
          document.getElementById('keyInput').readOnly = false;
          document.getElementById('keyInput').value = '';
          document.getElementById('keyInput').focus();
        }
      });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const id = document.getElementById('signupId').value.trim();
        const pass = document.getElementById('signupPass').value;
        const name = document.getElementById('signupName').value.trim();
        const key = document.getElementById('keyInput').value.trim().toUpperCase();
        if (!id || !pass || !name || !key) {
          showError(null, '모든 항목을 입력하세요.');
          return;
        }
        if (key.length !== 4) {
          showError(null, '4자리 키를 입력하세요.');
          return;
        }

        const { data: existing } = await sb.from('users').select('id').eq('id', id).maybeSingle();
        if (existing) {
          showError(null, '이미 사용 중인 ID입니다.');
          return;
        }

        const hashedPass = bcryptjs.hashSync(pass, 10);

        if (mode === 'create') {
          const { data: existingFamily } = await sb.from('families').select('family_id').eq('family_id', key).maybeSingle();
          if (existingFamily) {
            showError(null, '이미 사용 중인 그룹 키입니다.');
            return;
          }

          const { error: uErr } = await sb.from('users').insert({ id, pass: hashedPass, name, family_id: key });
          if (uErr) { showError(null, '사용자 등록 실패: ' + uErr.message); return; }

          const { error: fErr } = await sb.from('families').insert({ family_id: key, join_key: key, created_by: id });
          if (fErr) { showError(null, '그룹 생성 실패: ' + fErr.message); return; }

          const { error: mErr } = await sb.from('family_members').insert({ family_id: key, user_id: id });
          if (mErr) { showError(null, '멤버 등록 실패: ' + mErr.message); return; }

          showSuccess(null, `회원가입 완료! 그룹 키: <strong>${key}</strong> (가족원에게 공유하세요)`);
          setTimeout(() => { window.location.href = 'login.html'; }, 2500);
          return;
        }

        if (mode === 'join') {
          const { data: family } = await sb.from('families').select('*').eq('family_id', key).maybeSingle();
          if (!family) {
            showError(null, '존재하지 않는 그룹 키입니다.');
            return;
          }
          const { data: existingMember } = await sb.from('family_members').select('user_id').eq('family_id', family.family_id).eq('user_id', id).maybeSingle();
          if (existingMember) {
            showError(null, '이미 해당 그룹에 참여 중입니다.');
            return;
          }
          const { error: uErr } = await sb.from('users').insert({ id, pass: hashedPass, name, family_id: family.family_id });
          if (uErr) { showError(null, '사용자 등록 실패: ' + uErr.message); return; }

          const { error: mErr } = await sb.from('family_members').insert({ family_id: family.family_id, user_id: id });
          if (mErr) { showError(null, '멤버 등록 실패: ' + mErr.message); return; }

          showSuccess(null, '회원가입 완료! 로그인 페이지로 이동합니다.');
          setTimeout(() => { window.location.href = 'login.html'; }, 2000);
          return;
        }

        showError(null, 'mode는 create 또는 join이어야 합니다.');
        } catch (err) {
          showError(null, '오류: ' + (err.message || '네트워크 연결 실패'));
        }
      });
    }
  }
})();
