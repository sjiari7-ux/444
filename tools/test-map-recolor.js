#!/usr/bin/env node
"use strict";
/* Tests that the world map (js/map.js renderer) paints a CONQUERED region in its new owner's hue and the gold own-country overlay follows
   ownership. Runs the real renderer against a stub canvas. Usage: node tools/test-map-recolor.js */
const fs=require("fs"),vm=require("vm");
const src=fs.readFileSync(""+__dirname+"/../js/map.js","utf8")+"\nthis.WM=WorldMap;this.MM=WORLD_MAP;";
const fills=[]; 
const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(()=>{}),set:(t,k,v)=>{t[k]=v;return true;}});
const origFill=()=>{};
const mkctx=()=>{const c={_fs:null,fill(p){fills.push([c.fillStyle,p&&p.__d]);}};return new Proxy(c,{get:(t,k)=>k in t?t[k]:(()=>({addColorStop(){}})),set:(t,k,v)=>{t[k]=v;return true;}});};
const C=mkctx();
const el=()=>{const t={style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},children:[],getContext:()=>C,getBoundingClientRect:()=>({width:800,height:500,left:0,top:0}),querySelector:()=>el(),querySelectorAll:()=>[],appendChild(){},addEventListener(){},setPointerCapture(){},releasePointerCapture(){},hidden:false,innerHTML:"",width:800,height:500};return new Proxy(t,{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});};
let raf=[];
const g={document:{createElement:()=>el(),head:el(),body:el(),getElementById:()=>el()},window:{devicePixelRatio:1,addEventListener(){}},performance:{now:()=>1000},requestAnimationFrame:f=>{raf.push(f);return 1;},cancelAnimationFrame(){},Path2D:class{constructor(d){this.__d=d;}},ResizeObserver:class{observe(){}},Map,Set,Math,JSON,Object,Array,String,Number,console,Image:class{},setTimeout(){},clearTimeout(){},getComputedStyle:()=>({})};
g.window.document=g.document; vm.createContext(g); 
try{vm.runInContext(src,g);}catch(e){console.log("load err",e.message);process.exit(1)}
const M=g.MM; const c=M.c.find(x=>x.id==="france"), r=c.r[0]; 
let owners=null,colors=null;
g.WM.attach(el(),{myId:"germany",wars:()=>[],owners:()=>owners,colors:()=>colors,sheetHtml:()=>"",terr:()=>null});
const run=()=>{fills.length=0;const q=raf.splice(0);q.forEach(f=>f(2000));};
run();
const colorOf=()=>{const f=fills.find(x=>x[1]===r.d);return f&&f[0];};
const before=colorOf(); 
owners={[r.rid]:"germany"}; g.WM.update(); run();
const after=colorOf(); 
const ger=M.c.find(x=>x.id==="germany");

let pass=0,failn=0;const check=(n,c,x)=>{c?pass++:failn++;console.log((c?"  ok   ":"  FAIL ")+n+(c?"":"  -> "+JSON.stringify(x)));};
const fr=M.c.find(x=>x.id==="france");
check("a region held by its own country keeps the country's hue",before==="hsl("+fr.h+" 58% "+(r.l!=null?r.l:(fr.l||46))+"%)",before);
check("a conquered region (server owners map) takes the new owner's hue and keeps its own shade",after==="hsl("+ger.h+" 58% "+(r.l!=null?r.l:(fr.l||46))+"%)",after);
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
console.log("\n"+pass+" passed, "+failn+" failed");process.exit(failn?1:0);
