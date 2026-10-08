#!/usr/bin/env node
"use strict";
/* UI smoke test for region-targeted wars: renders the real js/ui.js helpers (region list, Wars-tab picker, history rows) in a vm.
   Usage: node tools/test-ui-region-war.js */
// Smoke-test the new region-war UI helpers: load the real js/ui.js pieces in a vm with minimal stubs.
const fs=require('fs'),vm=require('vm');
const ui=fs.readFileSync(require('path').join(__dirname,'../js/ui.js'),'utf8');
const grab=(startMarker,endMarker)=>{const a=ui.indexOf(startMarker),b=ui.indexOf(endMarker,a);if(a<0||b<0)throw new Error('marker '+startMarker);return ui.slice(a,b);};
const code=[
 grab('function regionWarStatus','function renderRegionTargets'),
 grab('function renderRegionTargets','function renderMapPanel'.length?'/* Region panel:':'x'),
 grab('const REGION_WHY','function renderWarHistoryRow'),
 grab('function renderWarHistoryRow','function renderWar(c, kv){').replace(/function renderWar\(c, kv\)\{[\s\S]*$/,''),
 grab('function renderRegionWarPicker','function renderWar(c, kv){'),
].join('\n');
const now=Date.now();
const S={char:{kingdomId:'germany'},serverOffset:0,countryState:{data:{countryId:'germany',isLeader:true,activeWar:null,cooldownUntil:0}},mapRegions:{},_warCountry:'france',_warTarget:'france_1'};
const ctx={S,esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),srvNow:()=>now,fmtClock:ms=>Math.ceil(ms/1000)+'s',
 fmtNum:n=>Math.round(n).toString(),kingdomFlag:()=>'[F]',countryName:id=>({france:'France',germany:'Germany',spain:'Spain'}[id]||id),resName:r=>r,KINGDOMS:[{id:'france',name:'France'},{id:'germany',name:'Germany'},{id:'spain',name:'Spain'}],
 loadMapRegions:()=>{},Date,Math,console};
vm.createContext(ctx); vm.runInContext(code,ctx);
const d={enabled:true,ownerWar:{atWar:false,cooldownUntil:0},regions:[
 {id:'france_1',name:'Northern France',resource:'iron',production:3.5,reservedByWarId:null},
 {id:'france_2',name:'Southern France',resource:'wood',production:2,reservedByWarId:'war_x'},
 {id:'france_3',name:'Eastern France',resource:'wood',production:2,reservedByWarId:null}]};
const out=vm.runInContext('renderRegionTargets("france",'+JSON.stringify(d)+')',ctx);
const ck=(n,c)=>{console.log((c?'  ok   ':'  FAIL ')+n); if(!c)process.exitCode=1;};
ck('one declare button per AVAILABLE region only (2 regions free, 1 reserved)',(out.match(/data-action="map-declare-war"/g)||[]).length===2);
ck('buttons carry the REGION id, never a country id',/data-region="france_1"/.test(out)&&!/data-id=/.test(out));
ck('shows the current owner and the reserved status',/Current owner: \[F\] France/.test(out)&&/Already targeted by an active war/.test(out));
// non-leader
S.countryState.data.isLeader=false;
ck('non-leader sees the status but no button',!/map-declare-war/.test(vm.runInContext('renderRegionTargets("france",'+JSON.stringify(d)+')',ctx)));
S.countryState.data.isLeader=true;
// own region
S.char.kingdomId='france';
ck('own region: no button, labelled as own',!/map-declare-war/.test(vm.runInContext('renderRegionTargets("france",'+JSON.stringify(d)+')',ctx))&&/Your country&#39;s region|Your country's region/.test(vm.runInContext('renderRegionTargets("france",'+JSON.stringify(d)+')',ctx)));
S.char.kingdomId='germany';
// owner at war / last region
const d2=JSON.parse(JSON.stringify(d)); d2.ownerWar.atWar=true;
ck('owner at war: no button',!/map-declare-war/.test(vm.runInContext('renderRegionTargets("france",'+JSON.stringify(d2)+')',ctx)));
const d3={enabled:true,ownerWar:{atWar:false,cooldownUntil:0},regions:[d.regions[0]]};
ck('a country with a single region can be targeted (no last-region protection)',/map-declare-war/.test(vm.runInContext('renderRegionTargets("france",'+JSON.stringify(d3)+')',ctx)));
// wars tab picker
S.mapRegions={france:{at:Date.now(),data:d}};
const pick=vm.runInContext('renderRegionWarPicker("germany")',ctx);
ck('wars-tab picker: summary names defender + region and Declare enabled',/Northern France/.test(pick)&&/declaring war on/.test(pick)&&!/data-action="declare-war" disabled/.test(pick));
S._warTarget='';
ck('wars-tab picker: Declare disabled until a region is chosen',/data-action="declare-war" disabled/.test(vm.runInContext('renderRegionWarPicker("germany")',ctx)));
// history rows
const row=vm.runInContext('renderWarHistoryRow('+JSON.stringify({attackerCountryId:'germany',defenderCountryId:'france',finalScore:{germany:2,france:0},result:'victory',targetRegionName:'Northern France',territory:{status:'captured',regionName:'Northern France',fromCountryId:'france',toCountryId:'germany'}})+',"germany")',ctx);
ck('history: names the region and who transferred to whom',/Over Northern France/.test(row)&&/control passed from France to Germany/.test(row));
const row2=vm.runInContext('renderWarHistoryRow('+JSON.stringify({attackerCountryId:'germany',defenderCountryId:'france',finalScore:{germany:0,france:2},result:'defeat',targetRegionName:'Northern France',territory:{status:'held',regionName:'Northern France',ownerCountryId:'france'}})+',"germany")',ctx);
ck('history: defender held the region',/stayed under France control/.test(row2));
const row3=vm.runInContext('renderWarHistoryRow('+JSON.stringify({attackerCountryId:'germany',defenderCountryId:'france',finalScore:{germany:2,france:0},result:'victory',territory:{status:'none',reason:'LEGACY_NO_TARGET'}})+',"germany")',ctx);
ck('history: legacy war (no target) shows an explicit no-transfer result',/No region changed hands/.test(row3));
