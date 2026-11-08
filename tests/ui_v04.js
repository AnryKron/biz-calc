const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(__dirname+'/../www/index.html','utf8');
let fail=0;const ok=(n,c)=>{if(!c)fail++;console.log((c?'OK  ':'FAIL')+' '+n);};
const mk=(w,ls)=>new JSDOM(html,{runScripts:'dangerously',url:'https://t.test/',beforeParse(win){Object.defineProperty(win,'innerWidth',{value:w,configurable:true});for(const k in (ls||{}))win.localStorage.setItem(k,ls[k]);}}).window;
const w=mk(380),d=w.document,$=id=>d.getElementById(id);w.addEventListener('error',e=>{fail++;console.log('ERR',e.message)});
const tab=t=>d.querySelector('#tabs button[data-t='+t+']').click();
tab('pnl');const ths=d.querySelectorAll('#out table.rep tr:first-child th').length;ok('narrow БДР: 2 columns',ths===2);
ok('period chips',d.querySelectorAll('#out .chips button').length===4);ok('units тыс.',/тыс/.test(d.querySelector('#out table.rep th').textContent));
const neg=[...d.querySelectorAll('#out table.rep td.neg')].map(x=>x.textContent);ok('negatives keep minus sign',neg.length>0&&neg.every(s=>/^[-−]/.test(s.trim())));
d.querySelector('#out .chips button:last-child').click();ok('Итого column',d.querySelector('#out table.rep th:last-child').textContent==='Итого');
tab('cf');ok('cf narrow',d.querySelectorAll('#out table.rep tr:first-child th').length===2);$('cfT').click();ok('monthly select',!!d.querySelector('[data-per-sel]'));
tab('gl');ok('glossary rendered',d.querySelectorAll('details.gl').length>30);
tab('sum');d.querySelector('#out .qi[data-qi=npv]').click();ok('qi opens sheet',$('sh').classList.contains('on')&&/NPV/.test($('shBox').textContent));w.eval('closeSheet()');
const gap0=w._R.kpi.cashGapMonth;console.log('   coffee gap',gap0);
const sbtn=d.querySelector('[data-act=suggest]');ok('suggest button shown',!!sbtn);sbtn.click();
ok('gap closed by injections',w._R.kpi.cashGapMonth==null);ok('auto injections listed',d.querySelectorAll('#finEd [data-inj]').length>0);
console.log('   injections',w.eval('JSON.stringify(FIN.injections)'));
d.querySelector('[data-fin=clearAuto]').click();ok('auto cleared → gap back',w._R.kpi.cashGapMonth!=null);
d.querySelector('[data-act=line]').click();ok('line closes gap',w._R.kpi.cashGapMonth==null);
tab('cf');ok('line rows in БДДС',/Линия: получено/.test(d.getElementById('out').textContent));
// add loan and edit amount
d.querySelector('[data-fin=addLoan]').click();const rows=d.querySelectorAll('#finEd [data-loan]');ok('loan added',rows.length===2);
const npv1=w._R.kpi.interestTotal;const a=rows[1].querySelector('[data-fk=amount]');a.value='3 000 000';a.dispatchEvent(new w.Event('change',{bubbles:true}));
ok('loan amount affects interest',w._R.kpi.interestTotal>npv1);
setTimeout(()=>{const ls={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);ls[k]=w.localStorage.getItem(k);}
 const w2=mk(1200,ls);ok('reload: FIN persisted',w2.eval('FIN.loans.length')===2&&w2.eval('FIN.line.on')===true);
 const d2=w2.document;d2.querySelector('#tabs button[data-t=pnl]').click();ok('wide: all years columns',d2.querySelectorAll('#out table.rep tr:first-child th').length===5);
 // import old v0.3 project
 const old={format:'biz-calc-project',schema:1,id:'old1',name:'Старый',form:{price:'380',volume:'3300',loanAmount:'1 500 000',loanRate:'20',loanTerm:'24',horizon:'36',startYear:'2026',season:'Без сезонности'},factors:[],tows:{}};
 d2.getElementById('pImp').click();d2.getElementById('iT').value=JSON.stringify(old);d2.getElementById('iOk').click();
 ok('v0.3 loan migrated',w2.eval('FIN.loans.length')===1&&w2.eval('FIN.loans[0].amount')===1500000);
 console.log(fail?fail+' FAILED':'ALL PASSED');},900);
