/* ============================================================
   UTIL
   ============================================================ */
function rnd(min,max){ return Math.random()*(max-min)+min; }
function rndInt(min,max){ return Math.floor(rnd(min,max+1)); }
function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function pick(arr){ return arr[rndInt(0, arr.length-1)]; }
function uid(){ return 'x'+Math.random().toString(36).slice(2,10)+Date.now().toString(36); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtNum(n){ return Math.round(n).toLocaleString('en-US'); }
function fmtMs(ms){
  if(ms<=0) return '0:00';
  const s = Math.ceil(ms/1000);
  const m = Math.floor(s/60), r = s%60;
  return m+':'+String(r).padStart(2,'0');
}

