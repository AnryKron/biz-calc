const fs=require('fs');const F=require('../src/finmodel.js');
const h=fs.readFileSync(__dirname+'/../src/params.template.html','utf8');const DEFS=eval(h.match(/const DEFS=(\[[\s\S]*?\n\]);/)[1]);
let fail=0;const eq=(n,a,b,tol=0.05)=>{const ok=Math.abs(a-b)<=tol;if(!ok)fail++;console.log((ok?'OK  ':'FAIL')+' '+n+': '+a+' vs '+b);};
const ok=(n,c)=>{if(!c)fail++;console.log((c?'OK  ':'FAIL')+' '+n);};const sum=a=>a.reduce((s,x)=>s+x,0);
// кредиты
const L1=F.buildLoans({loans:[{month:1,amount:1e6,ratePct:12,termMonths:12,type:'ANN'}]},24);
const L0=F.loanSchedule(1e6,12,12,24);
eq('ANN = loanSchedule interest',sum(L1.rows.map(r=>r.interest)),sum(L0.rows.map(r=>r.interest)),0.01);
const D=F.buildLoans({loans:[{month:3,amount:1.2e6,ratePct:12,termMonths:12,type:'DIFF',graceMonths:2}]},24);
eq('DIFF repaid',sum(D.rows.map(r=>r.principal)),1.2e6,0.01);
eq('grace: no principal in m3-4',D.rows[2].principal+D.rows[3].principal,0);
eq('grace: interest m3',D.rows[2].interest,12000,0.01);
eq('DIFF principal = 1.2m/10',D.rows[4].principal,120000,0.01);
eq('draw in m3',D.rows[2].draw,1.2e6);
const inp={startYear:2026,horizon:36,price:380,volume:3300,growthPct:0.5,rampMonths:6,season:Array(12).fill(1),varCostPct:33,fixed:260000,fixedIndexPct:7,
 staff:4,salary:55000,salaryIndexPct:8,msp:true,capex:3500000,lifeMonths:60,ownFunds:2000000,discountRatePct:25,physSharePct:100,vatExpSharePct:30,
 loans:[{month:1,amount:2e6,ratePct:24,termMonths:36,type:'ANN'},{month:7,amount:5e5,ratePct:20,termMonths:12,type:'DIFF',graceMonths:3}],
 injections:[{month:4,amount:300000}]};
for(const reg of ['USN6','USN15','OSNO']){
 const r=F.runModel(inp,DEFS,{},reg),M=r.months;
 const ident=sum(M.map(m=>m.opCF+m.invCF+m.finCF));eq(reg+' cash identity',M[M.length-1].cashEnd,ident);
}
// кредитная линия
const inpL={...inp,injections:[],creditLine:{on:true,limit:5e6,ratePct:26,reserve:100000}};
for(const reg of ['USN6','USN15']){
 const r=F.runModel(inpL,DEFS,{},reg),M=r.months;
 ok(reg+' line: cash never below reserve',Math.min(...M.map(m=>m.cashEnd))>=100000-0.5);
 eq(reg+' line balance = draws − repays',r.kpi.lineBalEnd,sum(M.map(m=>m.lineDraw-m.lineRepay)));
 eq(reg+' cash identity with line',M[M.length-1].cashEnd,sum(M.map(m=>m.opCF+m.invCF+m.finCF)));
 console.log('   ',reg,'lineMax',Math.round(r.kpi.lineMax),'interest',Math.round(r.kpi.interestTotal),'gap',r.kpi.cashGapMonth);
}
// УСН 15%: проценты по линии уменьшают налог (сходимость итераций)
const a=F.runModel({...inpL,creditLine:{...inpL.creditLine,ratePct:0}},DEFS,{},'USN15'),b=F.runModel(inpL,DEFS,{},'USN15');
ok('USN15: line interest lowers tax',sum(b.years.map(y=>y.tax))<=sum(a.years.map(y=>y.tax))+0.5);
// лимит мал → разрыв остаётся
const s=F.runModel({...inpL,ownFunds:5e5,creditLine:{on:true,limit:1e4,ratePct:26,reserve:0}},DEFS,{},'USN6');ok('small limit keeps gap',s.kpi.cashGapMonth!=null);
// подбор вложений
const base={...inp,loans:[{month:1,amount:1e6,ratePct:24,termMonths:36,type:'ANN'}],injections:[]};
const sug=F.suggestInjections(base,DEFS,{},'USN6',50000);
const r2=F.runModel({...base,injections:sug},DEFS,{},'USN6');
ok('suggest: no month below reserve',Math.min(...r2.months.map(m=>m.cashEnd))>=50000-0.5);
console.log('   suggested',sug.map(x=>x.month+':'+x.amount).join(' '));
const r0=F.runModel(base,DEFS,{},'USN6');ok('suggest only when needed',r0.kpi.cashGapMonth?sug.length>0:sug.length===0);
// DSCR
ok('DSCR present with loans',r0.pnl[0].dscr!=null);
console.log(fail?fail+' FAILED':'ALL PASSED');if(fail)process.exit(1);
