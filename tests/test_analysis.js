const fs=require('fs');const A=require('../src/analysis.js');
const h=fs.readFileSync(__dirname+'/../src/params.template.html','utf8');const DEFS=eval(h.match(/const DEFS=(\[[\s\S]*?\n\]);/)[1]);
let fail=0;const eq=(n,a,b,tol=1e-6)=>{const ok=Math.abs(a-b)<=tol;if(!ok)fail++;console.log((ok?'OK  ':'FAIL')+' '+n+': '+a+' vs '+b);};
const F=[
 {src:'SWOT',q:'S',text:'Место с трафиком',weight:5},
 {src:'SWOT',q:'W',text:'Нет опыта',weight:3,target:'volume',deltaPct:-10},
 {src:'SWOT',q:'O',text:'Доставка',weight:4,prob:0.5,target:'volume',deltaPct:20},
 {src:'SWOT',q:'T',text:'Рост аренды',weight:4,prob:0.5,target:'fixed',deltaPct:20},
 {src:'PEST',q:'T',group:'E',text:'Инфляция закупок',impact:3,prob:0.6,target:'varCostPct',deltaPct:10},
];
const s=A.scoreSwot(F);eq('S',s.score.S,5);eq('W',s.score.W,3);eq('O',s.score.O,2);eq('T',s.score.T,2);console.log(' pos',s.pos.code);
const inp={volume:1000,fixed:100,varCostPct:30};
const p=A.applyImpacts(inp,F,'PESS').inp;eq('PESS volume',p.volume*p.volumeMult,900);eq('PESS fixed',p.fixed,120);eq('PESS var',p.varCostPct*p.varMult,33,1e-9);
const o=A.applyImpacts(inp,F,'OPT').inp;eq('OPT volume',o.volume*o.volumeMult,1200);eq('OPT fixed',o.fixed,100);
const e=A.applyImpacts(inp,F,'EXP').inp;eq('EXP volume',e.volume*e.volumeMult,1000*0.9*1.1,1e-9);eq('EXP fixed',e.fixed,110);eq('EXP var',e.varCostPct*e.varMult,30*1.06,1e-9);
const pe=A.scorePest(F);eq('PEST score',pe.list[0].score,1.8);
console.log(A.lint(F));
console.log(A.lint([{src:'SWOT',q:'T',text:'x',target:'price',deltaPct:15}]));
console.log(fail?fail+' FAILED':'ALL PASSED');if(fail)process.exit(1);
