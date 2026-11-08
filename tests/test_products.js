const fs=require('fs');const F=require('../src/finmodel.js'),A=require('../src/analysis.js');
const h=fs.readFileSync(__dirname+'/../src/params.template.html','utf8');const DEFS=eval(h.match(/const DEFS=(\[[\s\S]*?\n\]);/)[1]);
let fail=0;const eq=(n,a,b,tol=0.05)=>{const ok=Math.abs(a-b)<=tol;if(!ok)fail++;console.log((ok?'OK  ':'FAIL')+' '+n+': '+a+' vs '+b);};
const ok=(n,c)=>{if(!c)fail++;console.log((c?'OK  ':'FAIL')+' '+n);};const sum=a=>a.reduce((s,x)=>s+x,0);
const base={startYear:2026,horizon:36,growthPct:0,rampMonths:0,season:Array(12).fill(1),fixed:200000,staff:2,salary:50000,ownFunds:3e6,discountRatePct:25,physSharePct:100,investments:[{name:'x',month:1,amount:1.2e6,lifeMonths:60}]};
// старый формат = один продукт
for(const reg of ['USN6','USN15']){const a=F.runModel({...base,price:380,volume:3300,varCostPct:33},DEFS,{},reg),b=F.runModel({...base,products:[{name:'p',price:380,volume:3300,varCostPct:33}]},DEFS,{},reg);eq(reg+' legacy = 1 product',a.kpi.npv,b.kpi.npv,0.01);}
const P=[{name:'Кофе',price:250,volume:3000,varCostPct:25},{name:'Выпечка',price:200,volume:1000,varCostPct:60}];
const r=F.runModel({...base,products:P},DEFS,{},'USN6');
eq('revenue/month',r.months[0].rev,250*3000+200*1000);eq('var cost/month',r.months[0].varCost,750000*0.25+200000*0.6);
// ТБУ: FC/ (1 − 307500/950000)
const fc=r.months.slice(0,12).reduce((s,m)=>s+m.fixed+m.salaries+m.payroll,0)/12;eq('BE weighted',r.kpi.beRevMonth,fc/(1-307500/950000),0.5);
ok('BE units hidden for 2+ products',r.kpi.beUnitsMonth==null);
eq('product margins sum',sum(r.kpi.products.map(p=>p.margin)),sum(r.months.map(m=>m.rev-m.varCost)),0.5);
eq('pnl byP year1 rev',sum(r.pnl[0].byP.map(p=>p.rev)),r.pnl[0].rev,0.5);
// сценарии/чувствительность: множители на все продукты
const pe=A.applyImpacts({...base,products:P},[{src:'SWOT',q:'T',text:'t',weight:3,prob:1,target:'price',deltaPct:-10}],'PESS').inp;
eq('scenario price −10% → revenue',F.runModel(pe,DEFS,{},'USN6').months[0].rev,950000*0.9,0.5);
const s=F.sensitivity({...base,products:P},DEFS,{},'USN6');ok('sensitivity has price/volume/var',['price','volume','varCostPct'].every(k=>s.some(x=>x.key===k)));
// остаточная стоимость
const n0=F.runModel({...base,products:P},DEFS,{},'USN6'),n1=F.runModel({...base,products:P,terminalMode:'book'},DEFS,{},'USN6'),n2=F.runModel({...base,products:P,terminalMode:'sale',terminalPct:50},DEFS,{},'USN6');
eq('terminal book value',n1.kpi.terminalValue,1.2e6-1.2e6/60*36,0.01);eq('terminal sale 50%',n2.kpi.terminalValue,(1.2e6-1.2e6/60*36)/2,0.01);
const rm=Math.pow(1.25,1/12)-1;eq('NPV gain = PV(TV)',n1.kpi.npv-n0.kpi.npv,n1.kpi.terminalValue/Math.pow(1+rm,36),0.5);
console.log(fail?fail+' FAILED':'ALL PASSED');if(fail)process.exit(1);
