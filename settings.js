/* ---------------- Settings ---------------- */
function renderSettings(){
  const c = S.char;
  return `
  <div class="view-header"><h2>Settings</h2></div>
  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Account</div>
    <div class="stat-list">
      <div><span>Player ID</span><b style="font-size:11px;">${esc(MY_ID.slice(0,14))}&hellip;</b></div>
      <div><span>Storage</span><b>${HAS_DB?'Shared (real players)':'Local to this browser'}</b></div>
    </div>
    <p class="faint" style="margin-top:10px; line-height:1.6;">
      ${HAS_DB
        ? 'Your character is saved to shared storage, so other players can be matched against you in the PvP Arena, and kingdoms/market are shared too.'
        : 'Could not reach shared storage — you are playing a local-only run, and PvP opponents are simulated.'}
      Combat is resolved locally rather than by a trusted server, so treat this as a feel-the-loop demo, not a cheat-proof build.
    </p>
    ${fbAuth ? `<button class="btn" style="margin-top:12px;" data-action="sign-out">Sign out</button>` : ''}
  </div>
  <div class="panel">
    <div class="panel-title">Danger zone</div>
    <p class="faint" style="margin-bottom:10px;">Delete this character and start over.</p>
    <button class="btn btn-danger" data-action="reset-character">Delete character</button>
  </div>`;
}

