const fs=require('fs');const F=require('../src/finmodel.js'),A=require('../src/analysis.js');
const h=fs.readFileSync(__dirname+'/../src/params.template.html','utf8');const DEFS=eval(h.match(/const DEFS=(\[[\s\S]*?\n\]);/)[1]);
let fail=0;const eq=(n,a,b,tol=0.05)=>{const ok=Math.abs(a-b)<=tol;if(!ok)fail++;console.log((ok?'OK  ':'FAIL')+' '+n+': '+a+' vs '+b);};
const ok=(n,c)=>{if(!c)fail++;console.log((c?'OK  ':'FAIL')+' '+n);};const sum=a=>a.reduce((s,x)=>s+x,0);
const base={startYear:2026,horizon:36,price:380,volume:3300,growthPct:0.5,rampMonths:6,season:Array(12).fill(1),varCostPct:33,fixed:260000,staff:4,salary:55000,msp:true,ownFunds:2e6,discountRatePct:25,physSharePct:100,vatExpSharePct:30,loans:[{month:1,amount:2e6,ratePct:24,termMonths:36,type:'ANN'}]};
// старый формат = список из одной позиции
for(const reg of ['USN6','USN15','OSNO']){
 const a=F.runModel({...base,capex:3.5e6,lifeMonths:60},DEFS,{},reg),b=F.runModel({...base,investments:[{name:'x',month:1,amount:3.5e6,lifeMonths:60}]},DEFS,{},reg);
 eq(reg+' legacy capex = list',a.kpi.npv,b.kpi.npv,0.01);
}
const inv=[{name:'Кофемашина',month:1,amount:1.2e6,lifeMonths:60},{name:'Ремонт',month:1,amount:8e5,lifeMonths:0},{name:'Вторая точка',month:14,amount:2e6,lifeMonths:24},{name:'За горизонтом',month:40,amount:5e5,lifeMonths:12}];
const r=F.runModel({...base,investments:inv},DEFS,{},'OSNO'),M=r.months;
eq('invest in month 1',M[0].invest,2e6);eq('invest in month 14',M[13].invest,2e6);eq('beyond horizon ignored',r.kpi.investTotal,4e6);
eq('invCF = −invest',sum(M.map(m=>m.invCF)),-4e6);
// амортизация: 1.2m/60 × 36 + 2m/24 × 23 (мес. 14..36)
eq('amortization',sum(M.map(m=>m.amort)),1.2e6/60*36+2e6/24*23,0.01);
eq('book value end',r.kpi.bookValueEnd,4e6-(1.2e6/60*36+2e6/24*23),0.01);
eq('cash identity',M[35].cashEnd,sum(M.map(m=>m.opCF+m.invCF+m.finCF)));
// УСН Д−Р: инвестиции уменьшают налог в год оплаты
const u0=F.runModel({...base,investments:[]},DEFS,{},'USN15'),u1=F.runModel({...base,investments:[{name:'y',month:14,amount:2e6,lifeMonths:24}]},DEFS,{},'USN15');
ok('USN15: 2027 tax lower with 2027 capex',u1.years[1].tax<u0.years[1].tax&&Math.abs(u1.years[0].tax-u0.years[0].tax)<1);
// чувствительность и сценарии масштабируют весь список
const s=F.sensitivity({...base,investments:inv},DEFS,{},'USN6');ok('sensitivity has capex',s.some(x=>x.key==='capex'));
const pe=A.applyImpacts({...base,investments:inv},[{src:'SWOT',q:'T',text:'t',weight:3,prob:1,target:'capex',deltaPct:20}],'PESS').inp;
eq('scenario capexMult',pe.capexMult,1.2,1e-9);
eq('scaled invest',F.runModel(pe,DEFS,{},'USN6').kpi.investTotal,4.8e6,0.01);
console.log(fail?fail+' FAILED':'ALL PASSED');if(fail)process.exit(1);
