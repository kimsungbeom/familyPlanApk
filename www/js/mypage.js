(async function() {
  var session = await getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const changePassForm = document.getElementById('changePassForm');
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');

  const header = document.getElementById('header');
  if (header) {
    header.innerHTML = `<div class="header" style="margin-bottom:0">
      <h1>FAMILY PLAN</h1>
      <div class="header-nav">
        <span style="font-weight:700;font-size:var(--font-size-lg)">${session.name}님</span>
        <a href="dashboard.html">대시보드</a>
        <a href="mypage.html">마이페이지</a>
        <button id="mypageLogoutBtn">로그아웃</button>
      </div></div>`;
    document.getElementById('mypageLogoutBtn').addEventListener('click', async () => {
      await clearSession();
      window.location.href = 'login.html';
    });
  }

  if (changePassForm) {
    changePassForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPass = document.getElementById('currentPass').value;
      const newPass = document.getElementById('newPass').value;
      if (!currentPass || !newPass) { showError(null, '모두 입력하세요.'); return; }
      if (newPass.length < 4) { showError(null, '새 비밀번호는 4자 이상이어야 합니다.'); return; }

      const { data: profile } = await sb.from('users').select('pass').eq('id', session.id).maybeSingle();
      if (!profile || !bcryptjs.compareSync(currentPass, profile.pass)) {
        showError(null, '현재 비밀번호가 일치하지 않습니다.');
        return;
      }
      const hashed = bcryptjs.hashSync(newPass, 10);
      await sb.from('users').update({ pass: hashed }).eq('id', session.id);
      showSuccess(null, '비밀번호가 변경되었습니다.');
      document.getElementById('currentPass').value = '';
      document.getElementById('newPass').value = '';
    });
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
      if (!confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

      const fid = session.familyId;
      if (fid) {
        const { data: memberInfo } = await sb.from('family_members').select('family_id').eq('user_id', session.id).maybeSingle();
        if (memberInfo) {
          const { data: family } = await sb.from('families').select('*').eq('family_id', fid).maybeSingle();
          if (family && family.created_by === session.id) {
            const { count } = await sb.from('family_members').select('*', { count: 'exact', head: true }).eq('family_id', fid);
            if (count > 1) {
              alert('그룹 생성자는 탈퇴할 수 없습니다. 먼저 다른 멤버에게 생성자 권한을 양도하세요.');
              return;
            }
            await sb.from('schedules').delete().eq('family_id', fid);
            await sb.from('family_members').delete().eq('family_id', fid);
            await sb.from('families').delete().eq('family_id', fid);
          } else {
            await sb.from('family_members').delete().eq('family_id', fid).eq('user_id', session.id);
          }
        }
      }
      await sb.from('users').delete().eq('id', session.id);
      await clearSession();
      alert('회원 탈퇴가 완료되었습니다.');
      window.location.href = 'login.html';
    });
  }
})();
