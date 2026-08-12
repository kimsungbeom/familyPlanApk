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
          showError(null, t('mypage.errorAll'));
          return;
        }
        try {
          if (typeof sb === 'undefined') { showError(null, t('errorNetwork')); return; }
          const { data: user, error } = await sb.from('users').select('*').eq('id', id).maybeSingle();
          if (error) { showError(null, t('errorNetwork') + ': ' + error.message); return; }
          if (!user) { showError(null, t('mypage.passMismatch')); return; }
          if (!bcryptjs.compareSync(pass, user.pass)) {
            showError(null, t('mypage.passMismatch'));
            return;
          }
          await saveSession({ id: user.id, name: user.name, familyId: user.family_id });
          window.location.href = 'dashboard.html';
        } catch (err) {
          showError(null, t('errorNetwork') + ': ' + (err.message || ''));
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
          label.textContent = t('groupSwitcher.createTitle');
          hint.textContent = t('groupSwitcher.createTitle');
          document.getElementById('keyInput').readOnly = true;
          getUniqueFamilyKey().then(k => { document.getElementById('keyInput').value = k; });
        } else {
          label.textContent = t('groupSwitcher.joinTitle');
          hint.textContent = t('groupSwitcher.joinGroup');
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
          showError(null, t('mypage.errorAll'));
          return;
        }
        if (key.length !== 4) {
          showError(null, t('mypage.errorAll'));
          return;
        }

        const { data: existing } = await sb.from('users').select('id').eq('id', id).maybeSingle();
        if (existing) {
          showError(null, t('groupSwitcher.alreadyJoined'));
          return;
        }

        const hashedPass = bcryptjs.hashSync(pass, 10);

        if (mode === 'create') {
          const { data: existingFamily } = await sb.from('families').select('family_id').eq('family_id', key).maybeSingle();
          if (existingFamily) {
            showError(null, t('groupSwitcher.invalidKey'));
            return;
          }

          const { error: uErr } = await sb.from('users').insert({ id, pass: hashedPass, name, family_id: key });
          if (uErr) { showError(null, t('errorNetwork') + ': ' + uErr.message); return; }

          const { error: fErr } = await sb.from('families').insert({ family_id: key, join_key: key, created_by: id });
          if (fErr) { showError(null, t('errorNetwork') + ': ' + fErr.message); return; }

          const { error: mErr } = await sb.from('family_members').insert({ family_id: key, user_id: id });
          if (mErr) { showError(null, t('errorNetwork') + ': ' + mErr.message); return; }

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
            showError(null, t('groupSwitcher.alreadyJoined'));
            return;
          }
          const { error: uErr } = await sb.from('users').insert({ id, pass: hashedPass, name, family_id: family.family_id });
          if (uErr) { showError(null, t('errorNetwork') + ': ' + uErr.message); return; }

          const { error: mErr } = await sb.from('family_members').insert({ family_id: family.family_id, user_id: id });
          if (mErr) { showError(null, t('errorNetwork') + ': ' + mErr.message); return; }

          showSuccess(null, t('mypage.passChanged'));
          setTimeout(() => { window.location.href = 'login.html'; }, 2000);
          return;
        }

        showError(null, t('errorNetwork'));
        } catch (err) {
          showError(null, t('errorNetwork') + ': ' + (err.message || ''));
        }
      });
    }
  }
})();
