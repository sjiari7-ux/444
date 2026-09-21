/* ---------------- Character creation ---------------- */
function renderLogin(){
  return `
  <div class="login-card">
    <div class="brand-mark" style="margin:0 auto 12px; width:44px; height:44px;">${icon('crown','style="width:100%;height:100%;stroke:var(--brass-bright)"')}</div>
    <h1 style="font-size:24px; margin-bottom:6px;">ARCADIA</h1>
    <p class="faint" style="margin-bottom:4px;">Sign in to play against real players — PvP, kingdoms and the market are shared.</p>
    <button class="login-btn" id="login-google-btn" data-action="signin-google">
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="">
      <span>Sign in with Google</span>
    </button>
    <div class="login-divider">or</div>
    <button class="login-btn" id="login-guest-btn" data-action="signin-guest">${icon('user','style="width:16px;height:16px"')}<span>Continue as Guest</span></button>
    <div class="login-err" id="login-err"></div>
  </div>`;
}

function renderCreate(){
  const state = S._create || (S._create = {username:'', classId:null});
  const cards = Object.values(CLASSES).map(cls=>{
    const sel = state.classId===cls.id;
    return `<div class="class-card ${sel?'selected':''}" data-action="pick-class" data-class="${cls.id}">
      ${imgIcon(CLASS_ICONS[cls.id], cls.name, 'class-icon')}
      <h3>${cls.name}</h3>
      <div class="res">Resource: ${cls.resource}</div>
      <div class="faint">${cls.tagline}</div>
      <ul>${cls.skills.map(s=>`<li>${s.name}</li>`).join('')}</ul>
    </div>`;
  }).join('');
  return `
  <div class="loader-wrap" style="min-height:100vh; padding:20px;">
    <div style="max-width:760px; width:100%;">
      <div style="text-align:center; margin-bottom:26px;">
        <div class="brand-mark" style="margin:0 auto 10px; width:42px; height:42px;">${icon('crown','style="width:100%;height:100%;stroke:var(--brass-bright)"')}</div>
        <h1 style="font-size:30px;">ARCADIA</h1>
        <p class="muted" style="margin-top:6px;">Create your character and enter the fight.</p>
      </div>
      <div class="panel" style="margin-bottom:16px;">
        <label class="field">Username</label>
        <input type="text" id="username-input" maxlength="18" placeholder="Choose a name" value="${esc(state.username)}">
      </div>
      <div class="panel-title" style="margin-bottom:10px;">Choose your class</div>
      <div class="grid grid-3" style="margin-bottom:20px;">${cards}</div>
      <button class="btn btn-primary btn-block" data-action="create-character" ${(!state.classId)?'disabled':''} style="padding:14px;">Begin your journey</button>
    </div>
  </div>`;
}

