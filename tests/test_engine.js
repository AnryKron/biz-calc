const fs=require('fs');const E=require('../src/engine.js');
const h=fs.readFileSync(__dirname+'/../src/params.template.html','utf8');const DEFS=eval(h.match(/const DEFS=(\[[\s\S]*?\n\]);/)[1]);
const P=E.makeParams(DEFS,2026,{});
let fail=0;const eq=(name,a,b,tol=0.6)=>{const ok=Math.abs(a-b)<=tol;if(!ok)fail++;console.log((ok?'OK  ':'FAIL')+' '+name+': '+a+' vs '+b);};
// Case A: ИП без работников, 1,2 млн дохода, 300 тыс. расходов, всё от физлиц, патент 1 млн
const A={income:1.2e6,expenses:3e5,prevIncome:0,physShare:1,staff:0,salary:0,psnPotential:1e6,vatExpShare:0};
const r=Object.fromEntries(E.compareRegimes(P,A).list.map(x=>[x.id,x]));
eq('NPD tax',r.NPD.tax,38000);
eq('USN6 tax',r.USN6.tax,5610); eq('USN6 burden',r.USN6.burden,72000);
eq('USN15 ip',r.USN15.ipContrib,63390); eq('USN15 tax',r.USN15.tax,125491.5); 
eq('PSN tax',r.PSN.tax,0); eq('PSN burden',r.PSN.burden,64390);
eq('AUSN8',r.AUSN8.burden,96000);
eq('OSNO vat',r.OSNO.vat,216393.44); eq('OSNO ip',r.OSNO.ipContrib,61226.07,0.02);
eq('OSNO ndfl',r.OSNO.tax,80909.46,0.05);
// НДФЛ шкала: 6 млн → 2.4*13% + 2.6*15% + 1*18% = 312000+390000+180000
eq('NDFL 6m',E.ndflProgressive(6e6),882000);
eq('NDFL 60m',E.ndflProgressive(60e6),9402000+2.2e6);
// НДС на УСН: доход 36 млн, прошлый год 10 млн → порог 20 млн превышен в 7-м мес. (3 млн/мес) → НДС с 8-го, 5 месяцев
const vm=E.usnVatMonths(P,{income:36e6,prevIncome:10e6});eq('VAT months',vm.months,5);eq('VAT from',vm.from,8);
const B={income:36e6,expenses:20e6,prevIncome:10e6,staff:3,salary:60000,msp:false,vatExpShare:0.5};
const rb=Object.fromEntries(E.compareRegimes(P,B).list.map(x=>[x.id,x]));
// 5%: 36e6*5/12 * 5/105 = 714285.71
eq('USN6 VAT5',rb.USN6.vat,714285.71,0.02);
// взносы за работников: 3*720000*30% = 648000 + травм 0.2%*2160000=4320
eq('payroll',rb.USN6.payroll,652320);
console.log('NPD avail',rb.NPD.available,rb.NPD.why);console.log('AUSN avail',rb.AUSN8.available);
console.log('USN15 vat mode',rb.USN15.vatMode,rb.USN15.vat);
// МСП: зарплата 60000 → 30%*40639.5 + 15%*19360.5 = 12191.85+2904.075=15095.925/мес
const pm=E.payrollContrib(P,{staff:1,salary:60000,msp:true});eq('MSP payroll',pm.contrib,15095.925*12,0.02);
console.log(fail?fail+' FAILED':'ALL PASSED');if(fail)process.exit(1);
