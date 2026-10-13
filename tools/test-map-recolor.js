#!/usr/bin/env node
"use strict";
/* Tests that the world map (js/map.js renderer) paints a CONQUERED region in its new owner's hue and the gold own-country overlay follows
   ownership. Runs the real renderer against a stub canvas. Usage: node tools/test-map-recolor.js */
const fs=require("fs"),vm=require("vm");
const src=fs.readFileSync(""+__dirname+"/../js/map.js","utf8")+"\nthis.WM=WorldMap;this.MM=WORLD_MAP;";
const fills=[]; 
const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(()=>{}),set:(t,k,v)=>{t[k]=v;return true;}});
const origFill=()=>{};
const strokes=[];
const mkctx=()=>{const c={_fs:null,fill(p){fills.push([c.fillStyle,p&&p.__d]);},stroke(p){strokes.push([c.strokeStyle,p&&p.__d]);}};return new Proxy(c,{get:(t,k)=>k in t?t[k]:(()=>({addColorStop(){}})),set:(t,k,v)=>{t[k]=v;return true;}});};
const C=mkctx();
const el=()=>{const t={style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},children:[],getContext:()=>C,getBoundingClientRect:()=>({width:800,height:500,left:0,top:0}),querySelector:()=>el(),querySelectorAll:()=>[],appendChild(){},addEventListener(){},setPointerCapture(){},releasePointerCapture(){},hidden:false,innerHTML:"",width:800,height:500};return new Proxy(t,{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});};
let raf=[];
const g={document:{createElement:()=>el(),head:el(),body:el(),getElementById:()=>el()},window:{devicePixelRatio:1,addEventListener(){}},performance:{now:()=>1000},requestAnimationFrame:f=>{raf.push(f);return 1;},cancelAnimationFrame(){},Path2D:class{constructor(d){this.__d=d;}},ResizeObserver:class{observe(){}},Map,Set,Math,JSON,Object,Array,String,Number,console,Image:class{},setTimeout(){},clearTimeout(){},getComputedStyle:()=>({})};
g.window.document=g.document; vm.createContext(g); 
try{vm.runInContext(src,g);}catch(e){console.log("load err",e.message);process.exit(1)}
const M=g.MM; const c=M.c.find(x=>x.id==="france"), r=c.r[0]; 
let owners=null,colors=null;
g.WM.attach(el(),{myId:"germany",wars:()=>[],owners:()=>owners,colors:()=>colors,sheetHtml:()=>"",terr:()=>null});
const run=()=>{fills.length=0;strokes.length=0;const q=raf.splice(0);q.forEach(f=>f(2000));};
run();
const colorOf=()=>{const f=fills.find(x=>x[1]===r.d);return f&&f[0];};
const before=colorOf(); 
owners={[r.rid]:"germany"}; g.WM.update(); run();
const after=colorOf(); 
const ger=M.c.find(x=>x.id==="germany");

let pass=0,failn=0;const check=(n,c,x)=>{c?pass++:failn++;console.log((c?"  ok   ":"  FAIL ")+n+(c?"":"  -> "+JSON.stringify(x)));};
const fr=M.c.find(x=>x.id==="france");
const hslOf=v=>{const m=/^hsl\((\d+) (\d+)% (\d+)%\)$/.exec(v||"");return m&&{h:+m[1],s:+m[2],l:+m[3]};};
const gerFill=()=>{const gr=M.c.find(x=>x.id==="germany").r[0],f=fills.find(x=>x[1]===gr.d);return f&&hslOf(f[0]);};
const b0=hslOf(before), g0=gerFill();
check("a region held by its own country is painted in an earth-tone hsl with a lightness taken from its own shade",!!b0&&b0.s<45&&b0.l>=26&&b0.l<=55,before);
const a0=hslOf(after);
check("a conquered region (server owners map) takes the new owner's hue and keeps its own shade",!!a0&&!!g0&&a0.h===g0.h&&a0.s===g0.s&&a0.l===b0.l&&before!==after,[before,after,g0]);
owners=null;g.WM.update();run();check("without owner data the original colour is back",colorOf()===before,colorOf());
{ // the Leader's ONE colour: every region of that owner (its own AND a conquered one) gets exactly that colour; other countries keep their shades
  const other=fr.r[1]||fr.r[0], gerR=M.c.find(x=>x.id==="germany").r[0];
  const col=(rr)=>{const f=fills.find(x=>x[1]===rr.d);return f&&f[0];};
  owners={[r.rid]:"germany"};colors={germany:"#ff8800"};g.WM.update();run();
  check("a country colour paints its own regions and a conquered one in the same colour",col(r)==="#ff8800"&&col(gerR)==="#ff8800",[col(r),col(gerR)]);
  check("a country without a chosen colour keeps its shades",col(other)!==undefined&&col(other)!=="#ff8800"&&/^hsl/.test(col(other)),col(other));
  owners=null;colors={france:"#123456"};g.WM.update();run();
  check("the colour belongs to the OWNER: france's colour paints france's regions again once nothing is conquered",col(r)==="#123456"&&col(gerR)!=="#123456",[col(r),col(gerR)]);
  colors=null;
}
{ // sea lanes: every water-crossing link in the map data points at two known regions and carries the two coast points the lane is drawn between
  const ids=new Set();M.c.forEach(x=>x.r.forEach(rr=>rr.rid&&ids.add(rr.rid)));M.p.forEach(q=>ids.add(q[1]));
  const num=n=>typeof n==="number"&&isFinite(n);
  check("the map carries the sea links (sea hops + bridges + hand-picked crossings) with coast points",Array.isArray(M.s)&&M.s.length>=100&&M.s.every(l=>l.length===7&&(l[2]==="sea"||l[2]==="bridge")&&l.slice(3).every(num)),M.s&&M.s.length);
  check("every sea link joins two known regions",M.s.every(l=>ids.has(l[0])&&ids.has(l[1])),M.s.filter(l=>!ids.has(l[0])||!ids.has(l[1])).slice(0,3));
  const has=(a,b)=>M.s.some(l=>(l[0]===a&&l[1]===b)||(l[0]===b&&l[1]===a));
  check("Africa is joined to Europe across the sea (Tunis-Sicily, Northern Morocco-Algarve, Laayoune-Canary Islands)",has("tunisia_3","italy_6")&&has("morocco_5","portugal_1")&&has("morocco_4","spain_1"),null);
  check("straits inside one land mass and island nations are linked (Funen-Zealand, Djibouti-Aden, Southern Finland-Northern Estonia, Fiji-Vanuatu, Iceland-Scotland)",has("denmark_1","denmark_3")&&has("djibouti_1","yemen_1")&&has("finland_4","estonia_2")&&has("fiji_1","vanuatu_1")&&has("iceland_2","united_kingdom_3"),null);
}
{ // the gold outline is the outer edge of what we hold NOW: a conquered region joins it, the country's original shape no longer does
  const gold=()=>new Set(strokes.filter(x=>x[0]==="#e8c766").map(x=>x[1]));
  owners=null;g.WM.update();run();const g0=gold();
  check("own outline (no conquests) is drawn region by region, a foreign region is not in it",g0.size>=1&&g0.has(ger.r[0].d)&&!g0.has(r.d)&&!g0.has(ger.d),[...g0].length);
  owners={[r.rid]:"germany"};g.WM.update();run();const g1=gold();
  check("a conquered region (owners map) is part of the own outline",g1.has(r.d)&&g1.has(ger.r[0].d),[...g1].length);
  owners=null;g.WM.update();run();
}
console.log("\n"+pass+" passed, "+failn+" failed");process.exit(failn?1:0);
