const fs=require('fs');const F=require('../src/finmodel.js');
const h=fs.readFileSync(__dirname+'/../src/params.template.html','utf8');const DEFS=eval(h.match(/const DEFS=(\[[\s\S]*?\n\]);/)[1]);
let fail=0;const eq=(n,a,b,tol=0.01)=>{const ok=Math.abs(a-b)<=tol;if(!ok)fail++;console.log((ok?'OK  ':'FAIL')+' '+n+': '+a+' vs '+b);};
const sum=a=>a.reduce((s,x)=>s+x,0);
eq('IRR simple',F.irr([-100,110]),0.1,1e-6);
eq('Annuity 1m 12% 12m',F.loanSchedule(1e6,12,12,12).pay,88848.79,0.01);
const ls=F.loanSchedule(1e6,12,12,24);eq('Loan repaid',sum(ls.rows.map(r=>r.principal)),1e6,0.01);
const inp={startYear:2026,horizon:36,price:2500,volume:400,growthPct:1,season:Array(12).fill(1),rampMonths:6,varCostPct:35,
 fixed:180000,fixedIndexPct:7,staff:3,salary:50000,salaryIndexPct:8,delayDays:0,capex:1500000,lifeMonths:60,ownFunds:800000,
 loanAmount:1000000,loanRate:22,loanTerm:24,discountRatePct:25,physSharePct:100,vatExpSharePct:30,msp:true,prevIncome:0,psnPotential:1500000};
for(const reg of ['USN6','USN15','PSN','AUSN20','OSNO']){
  const r=F.runModel(inp,DEFS,{},reg),M=r.months;
  const paid=sum(M.map(m=>m.taxPay+m.vatPay+m.ipPay+m.payrollPay));
  const acc=sum(r.years.map(y=>y.tax+y.vat+y.ip+y.payroll));
  eq(reg+' taxes paid = accrued',paid,acc,0.05);
  const last=M[M.length-1];
  const ident=inp.ownFunds+inp.loanAmount+sum(M.map(m=>m.opCF+m.invCF))-sum(M.map(m=>m.principal+m.interest));
  eq(reg+' cash identity',last.cashEnd,ident,0.05);
  // NPV вручную
  const rm=Math.pow(1.25,1/12)-1;const npv=sum(M.map((m,t)=>m.projectCF/Math.pow(1+rm,t+1)));
  eq(reg+' NPV formula',r.kpi.npv,npv,0.05);
  console.log('   ',reg,'avail',r.available,r.unavailable||'','NPV',Math.round(r.kpi.npv),'IRR',r.kpi.irrYear&&r.kpi.irrYear.toFixed(1),'PP',r.kpi.pp,'need',Math.round(r.kpi.maxNeed),'gap',r.kpi.cashGapMonth);
}
const cmp=F.compareOverHorizon(inp,DEFS,{});console.log(cmp.map(x=>x.regimeId+':'+Math.round(x.kpi.npv)+(x.available?'':'(n/a)')).join(' '));
const s=F.sensitivity(inp,DEFS,{},'USN6');console.log(s.map(x=>x.name+' '+Math.round(x.lo)+'..'+Math.round(x.hi)+' thr '+(x.threshold&&x.threshold.toFixed(2))).join('\n'));
// без отсрочки: поступления = выручка
const r0=F.runModel(inp,DEFS,{},'USN6');eq('cashIn=rev (lag0)',sum(r0.months.map(m=>m.cashIn)),sum(r0.months.map(m=>m.rev)),0.01);
const r1=F.runModel({...inp,delayDays:30},DEFS,{},'USN6');eq('cashIn lag + AR',sum(r1.months.map(m=>m.cashIn))+r1.kpi.unpaidAR,sum(r1.months.map(m=>m.rev)),0.01);
console.log(fail?fail+' FAILED':'ALL PASSED');if(fail)process.exit(1);
