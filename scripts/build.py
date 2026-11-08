import re, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S=lambda n: open(os.path.join(ROOT,'src',n)).read()
eng=S('engine.js'); fm=S('finmodel.js'); an=S('analysis.js'); stj=S('storage.js')
m0=S('params.template.html'); defs=re.search(r'(const SYS_VERSION[\s\S]*?\n\];)',m0).group(1)
css='''
:root{--bg:#f4f5f7;--card:#fff;--ink:#1d2330;--mute:#6b7385;--line:#e3e6ec;--acc:#1f6feb;--ok:#1a7f37;--warn:#b35900;--bad:#c62828;--s1:#1f6feb;--s2:#1a7f37}
@media (prefers-color-scheme:dark){:root{--bg:#121418;--card:#1c1f26;--ink:#e8eaf0;--mute:#9aa2b3;--line:#2c313b;--acc:#5b9dff;--ok:#4ac26b;--warn:#f0a040;--bad:#ff6b6b;--s1:#5b9dff;--s2:#4ac26b}}
*{box-sizing:border-box}body{margin:0;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:860px;margin:0 auto;padding:calc(12px + env(safe-area-inset-top)) 12px calc(40px + env(safe-area-inset-bottom))}h1{font-size:18px;margin:4px 0 2px}h2{font-size:15px;margin:0 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:10px 0}
.small{font-size:12px;color:var(--mute)}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 12px}@media (max-width:640px){.grid{grid-template-columns:1fr 1fr}}
label{display:block;font-size:12px;color:var(--mute);margin-bottom:3px}
input[type=text],select,textarea{width:100%;font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:7px 9px}
.chk{display:flex;gap:8px;align-items:center;font-size:14px;margin:4px 0}.chk label{margin:0;color:var(--ink);font-size:14px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;flex-wrap:wrap}
.seg button{border:0;background:transparent;color:var(--ink);padding:7px 11px;font:inherit;cursor:pointer}.seg button.on{background:var(--acc);color:#fff}
details.g{border-top:1px solid var(--line);padding:8px 0}details.g:first-of-type{border-top:0}details.g>summary{cursor:pointer;font-weight:600;font-size:14px;padding:2px 0}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}@media (max-width:640px){.kpis{grid-template-columns:1fr 1fr}}
.k{background:var(--bg);border-radius:10px;padding:8px 10px}.k b{display:block;font-size:17px;font-variant-numeric:tabular-nums}.k span{font-size:12px;color:var(--mute)}
.k.good b{color:var(--ok)}.k.badv b{color:var(--bad)}
.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
th,td{padding:5px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left;position:sticky;left:0;background:var(--card)}
tr.sub td{font-weight:600}tr.tot td{font-weight:700;border-top:2px solid var(--line)}td.neg{color:var(--bad)}
.tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}.tabs button{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:6px 12px;font:inherit;font-size:14px;cursor:pointer}.tabs button.on{background:var(--acc);border-color:var(--acc);color:#fff}
.warn{color:var(--warn);font-size:13px}.err{color:var(--bad);font-size:13px}
.tor{display:grid;grid-template-columns:150px 1fr;gap:6px 10px;align-items:center;font-size:13px}@media (max-width:480px){.tor{grid-template-columns:100px 1fr}}
.tb{position:relative;height:22px;background:var(--bg);border-radius:4px}.tb i{position:absolute;top:3px;height:16px;border-radius:3px}.tb .lo{background:var(--bad);opacity:.75}.tb .hi{background:var(--ok);opacity:.75}.tb .mid{position:absolute;top:0;bottom:0;width:2px;background:var(--ink)}
.btn{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:10px;padding:7px 12px;font:inherit;cursor:pointer}
svg text{fill:var(--mute);font-size:11px}
.best{color:var(--ok);font-weight:600}
.sheet{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:flex-end;justify-content:center;z-index:20}.sheet.on{display:flex}
.box{background:var(--card);width:100%;max-width:560px;border-radius:18px 18px 0 0;padding:16px;max-height:90vh;overflow:auto}.box h3{margin:0 0 6px;font-size:16px}
.btn.pri{background:var(--acc);border-color:var(--acc);color:#fff}
.q{border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin:8px 0}.q h3{font-size:14px;margin:0 0 6px;display:flex;justify-content:space-between}
.q.S h3{color:var(--ok)}.q.W h3{color:var(--warn)}.q.O h3{color:var(--acc)}.q.T h3{color:var(--bad)}
.fr{display:grid;grid-template-columns:1fr 64px 64px;gap:4px 6px;padding:6px 0;border-top:1px dashed var(--line)}.fr:first-of-type{border-top:0}
.fr .txt{grid-column:1/-1}.fr .lnk{grid-column:1/-1;display:grid;grid-template-columns:1fr 80px 34px;gap:6px}
.fr select,.fr input{padding:5px 7px;font-size:13px}.x{border:1px solid var(--line);background:transparent;color:var(--bad);border-radius:8px;cursor:pointer}
.add{border:1px dashed var(--line);background:transparent;color:var(--acc);border-radius:8px;padding:5px 10px;cursor:pointer;font:inherit;font-size:13px;margin-top:6px}
.sw{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media (max-width:640px){.sw{grid-template-columns:1fr}}
.pos{border-radius:12px;padding:10px 12px;background:var(--bg);margin:8px 0}.pos b{font-size:16px}
.gb{display:grid;grid-template-columns:130px 1fr 60px;gap:4px 8px;align-items:center;font-size:13px}.gb .bar{height:10px;background:var(--line);border-radius:5px}.gb .bar i{display:block;height:100%;border-radius:5px;background:var(--acc)}
.hint{font-size:12px;color:var(--mute)}

'''
body='''<main>
<h1>Бизнес-калькулятор</h1><div class="small"><a href="params.html">Параметры (справочник)</a></div>
<div class="small">v0.3: проекты + модель + SWOT/PEST + сценарии · помесячно · ИП · налоги — движок v0.1, параметры M0 (НК РФ ред. с 01.10.2026)</div>
<div class="card"><h2>Проект</h2>
<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select id="projSel" style="flex:1;min-width:160px"></select><input type="text" id="projName" style="flex:1;min-width:160px" placeholder="Название проекта"></div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button class="btn" id="pNew">Новый</button><button class="btn" id="pDup">Копия</button><button class="btn" id="pDel" style="color:var(--bad)">Удалить</button><button class="btn" id="pExp">Экспорт</button><button class="btn" id="pImp">Импорт</button></div>
<div id="pStatus" class="small" style="margin-top:6px"></div>
<div class="small" style="margin-top:10px">Новый проект из шаблона:</div><div class="seg" id="presets" style="margin-top:4px"></div></div>
<div class="sheet" id="sh"><div class="box" id="shBox"></div></div>
<div class="card" id="form"></div>
<div class="card">
 <div class="row" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><span class="small">Режим:</span><select id="regime" style="width:auto"></select><span id="regNote" class="small"></span></div>
 <div class="tabs" id="tabs"></div><div id="out"></div>
</div>
<div class="card"><h2>Параметры расчёта</h2><div class="small">Справочник ставок и лимитов — на экране <a href="params.html">«Параметры»</a>; его правки применяются ко всем проектам. Ниже — правки только для этого проекта (вставьте экспорт JSON из «Параметров»).</div>
<textarea id="m0json" rows="3" style="margin-top:8px;font:12px ui-monospace,Menlo,monospace" placeholder='{"format":"biz-calc-params", …}'></textarea>
<div style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn" id="applyM0">Применить</button><button class="btn" id="clearM0">Сбросить на закон</button><span id="m0msg" class="small"></span></div></div>
<div class="card small"><b>Допущения v0.1.</b> Проект стартует в январе года начала. Выручка = цена × объём × рост × сезонность; первые месяцы — выход на мощность с 30%. Налоговый учёт кассовый (доход = поступления). Налоги считаются за календарный год и платятся по срокам: УСН и НДФЛ ИП — авансы в апреле, июле, октябре, за год — в апреле следующего года; НДС — тремя частями после квартала; НПД и АУСН — ежемесячно; патент — в декабре; взносы ИП — фиксированные в декабре, 1% — в июле следующего года; за работников — в следующем месяце. Платежи после конца горизонта перенесены в последний месяц. На УСН и АУСН «Д−Р» оборудование списывается в расходы в год покупки, на ОСНО — через амортизацию. Дебиторская задолженность на конец горизонта считается полученной (в потоке проекта). NPV — по потоку проекта без кредита (операционный + инвестиционный), с дисконтированием с 1-го месяца. <b>Модель — инструмент оценки, а не бизнес-план для банка и не налоговая консультация.</b></div>
</main>'''
js=r'''
const E=TaxEngine,F=FinModel,$=id=>document.getElementById(id);
const fmt=x=>x==null||!isFinite(x)?"—":Math.round(x).toLocaleString("ru-RU");
const fmtR=x=>x==null||!isFinite(x)?"—":fmt(x)+" ₽";
const fmtM=x=>x==null?"—":(Math.abs(x)>=1e6?(x/1e6).toLocaleString("ru-RU",{maximumFractionDigits:2})+" млн ₽":fmtR(x));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const parse=s=>{s=String(s).replace(/\s/g,"").replace(",",".");return s===""?null:Number(s);};
const SEASONS={"Без сезонности":[1,1,1,1,1,1,1,1,1,1,1,1],"Кафе (летний спад)":[.9,.9,1,1,1,.85,.8,.85,1.05,1.1,1.15,1.4],"Туризм (лето)":[.5,.5,.7,.8,1.1,1.5,1.7,1.6,1.1,.8,.6,1.1],"Образование (сентябрь)":[1.1,1.1,1.1,1,.9,.5,.4,.8,1.5,1.3,1.2,1.1]};
const FIELDS=[
 ["Продажи",[["price","Средний чек / цена, ₽"],["volume","Продаж в месяц (на старте мощности)"],["growthPct","Рост продаж, % в месяц"],["rampMonths","Выход на мощность, мес."],["delayDays","Отсрочка оплаты клиентов, дней"],["season","Сезонность","season"]]],
 ["Затраты",[["varCostPct","Переменные затраты, % выручки"],["fixed","Постоянные расходы, ₽/мес (аренда, услуги…)"],["fixedIndexPct","Рост постоянных, % в год"]]],
 ["Персонал",[["staff","Работников, чел."],["salary","Зарплата, ₽/мес (до НДФЛ)"],["salaryIndexPct","Индексация зарплаты, % в год"],["msp","ОКВЭД в перечне льготы МСП","chk"]]],
 ["Инвестиции и финансирование",[["capex","Инвестиции на старте (оборудование, ремонт), ₽"],["lifeMonths","Срок службы оборудования, мес."],["ownFunds","Собственные средства, ₽"],["loanAmount","Кредит, ₽"],["loanRate","Ставка кредита, % годовых"],["loanTerm","Срок кредита, мес."]]],
 ["Налоги",[["prevIncome","Доход за год до старта, ₽"],["physSharePct","Доля дохода от физлиц, %"],["vatExpSharePct","Доля расходов с входящим НДС, %"],["psnPotential","Потенциальный доход по патенту, ₽/год"],["usnRegionalIncome","Ставка УСН «Доходы» в регионе, % (пусто — 6)"],["usnRegionalProfit","Ставка УСН «Д−Р» в регионе, % (пусто — 15)"],["resale","Перепродажа товаров","chk"],["ausnRegion","АУСН введена в регионе","chk"]]],
 ["Горизонт и ставка",[["startYear","Год старта","sel",[2026,2027]],["horizon","Горизонт, мес.","sel",[12,24,36,60]],["discountRatePct","Ставка дисконтирования, % годовых"]]],
];
const PRESETS={
 "Кофейня":{startYear:2026,horizon:36,price:380,volume:3300,growthPct:0.5,rampMonths:6,delayDays:0,season:"Кафе (летний спад)",varCostPct:33,fixed:260000,fixedIndexPct:7,staff:4,salary:55000,salaryIndexPct:8,msp:true,capex:3500000,lifeMonths:60,ownFunds:2000000,loanAmount:2000000,loanRate:24,loanTerm:36,prevIncome:0,physSharePct:100,vatExpSharePct:30,psnPotential:1500000,resale:false,ausnRegion:true,discountRatePct:25},
 "Онлайн-услуги, один ИП":{startYear:2026,horizon:24,price:15000,volume:12,growthPct:2,rampMonths:3,delayDays:15,season:"Без сезонности",varCostPct:10,fixed:25000,fixedIndexPct:5,staff:0,salary:0,salaryIndexPct:0,msp:false,capex:200000,lifeMonths:36,ownFunds:250000,loanAmount:0,loanRate:0,loanTerm:12,prevIncome:0,physSharePct:70,vatExpSharePct:0,psnPotential:800000,resale:false,ausnRegion:true,discountRatePct:20},
 "Мини-производство":{startYear:2026,horizon:60,price:1200,volume:2500,growthPct:1,rampMonths:9,delayDays:45,season:"Без сезонности",varCostPct:48,fixed:350000,fixedIndexPct:6,staff:7,salary:60000,salaryIndexPct:7,msp:true,capex:9000000,lifeMonths:84,ownFunds:9000000,loanAmount:6000000,loanRate:22,loanTerm:48,prevIncome:0,physSharePct:10,vatExpSharePct:70,psnPotential:0,resale:false,ausnRegion:true,discountRatePct:25},
};
let OVR={},tab="sum",regime="AUTO",inp={};
const DEFAULT=PRESETS["Кофейня"];
function buildForm(){
 $("form").innerHTML="<h2>Данные проекта</h2>"+FIELDS.map(([g,fs],i)=>`<details class="g" ${i<2?"open":""}><summary>${g}</summary><div class="grid" style="margin-top:8px">`+fs.map(([k,l,t,opts])=>{
  if(t==="chk")return`<div class="chk"><input type="checkbox" id="f_${k}"><label for="f_${k}">${l}</label></div>`;
  if(t==="sel")return`<div><label>${l}</label><select id="f_${k}">${opts.map(o=>`<option>${o}</option>`).join("")}</select></div>`;
  if(t==="season")return`<div><label>${l}</label><select id="f_${k}">${Object.keys(SEASONS).map(o=>`<option>${o}</option>`).join("")}</select></div>`;
  return`<div><label>${l}</label><input type="text" inputmode="decimal" id="f_${k}"></div>`;}).join("")+`</div></details>`).join("")+`<div id="fErr" class="err"></div>`;
 $("form").addEventListener("input",calc);$("form").addEventListener("change",calc);
}
function setForm(p){for(const[,fs]of FIELDS)for(const[k,,t]of fs){const el=$("f_"+k);if(t==="chk")el.checked=k==="ausnRegion"?p[k]!==false:!!p[k];else if(t==="sel"||t==="season")el.value=String(p[k]);else el.value=p[k]==null?"":Number(p[k]).toLocaleString("ru-RU");}calc();}
function readForm(){const o={},bad=[];for(const[,fs]of FIELDS)for(const[k,l,t]of fs){const el=$("f_"+k);
  if(t==="chk")o[k]=el.checked;else if(t==="sel")o[k]=+el.value;else if(t==="season")o.season=SEASONS[el.value];
  else{const v=parse(el.value);if(v!=null&&(isNaN(v)||v<0))bad.push(l);o[k]=v==null||isNaN(v)?null:v;}}
 for(const k of["price","volume","growthPct","rampMonths","delayDays","varCostPct","fixed","fixedIndexPct","staff","salary","salaryIndexPct","capex","lifeMonths","ownFunds","loanAmount","loanRate","loanTerm","prevIncome","vatExpSharePct","psnPotential","discountRatePct"])if(o[k]==null)o[k]=0;
 if(o.physSharePct==null)o.physSharePct=100;o.staff=Math.round(o.staff);if(!o.loanTerm)o.loanTerm=1;
 if(o.varCostPct>100)bad.push("переменные затраты больше 100%");
 return{o,bad};}
function calc(){
 const{o,bad}=readForm();inp=o;$("fErr").textContent=bad.length?"Проверьте: "+bad.join("; "):"";
 let cmp;try{cmp=F.compareOverHorizon(o,DEFS,EFF());}catch(e){$("out").innerHTML=`<div class="err">${esc(e.message)}</div>`;return;}
 const avail=cmp.filter(x=>x.available);
 const sel=$("regime"),cur=regime;
 sel.innerHTML=`<option value="AUTO">Лучший доступный${avail[0]?" — "+esc(avail[0].regimeName):""}</option>`+cmp.map(x=>`<option value="${x.regimeId}">${esc(x.regimeName)}${x.available?"":" (недоступен)"}</option>`).join("");
 sel.value=cur;
 const id=cur==="AUTO"?(avail[0]?avail[0].regimeId:"OSNO"):cur;
 const R=cmp.find(x=>x.regimeId===id);
 $("regNote").innerHTML=R.available?"":`<span class="err">Режим недоступен — ${esc(R.unavailable)}. Расчёт показан для сравнения.</span>`;
 window._R=R;window._cmp=cmp;window._id=id;render();
}
function render(){
 const T={sum:"Итоги",reg:"Режимы",pnl:"БДР",cf:"БДДС",sens:"Чувствительность",swot:"SWOT",pest:"PEST",scen:"Сценарии"};
 $("tabs").innerHTML=Object.entries(T).map(([k,v])=>`<button data-t="${k}" class="${k===tab?"on":""}">${v}</button>`).join("");
 const R=window._R;if(!R)return;
 $("out").innerHTML=({sum:vSum,reg:vReg,pnl:vPnl,cf:vCf,sens:vSens,swot:vSwot,pest:vPest,scen:vScen})[tab](R);
}
function vSum(R){
 const k=R.kpi,w=[];
 if(k.cashGapMonth)w.push(`Кассовый разрыв в ${k.cashGapMonth}-м месяце: денег на счёте не хватает (минимум ${fmtR(k.cashMin)}). Нужно больше собственных средств или кредита.`);
 if(k.irrMultiple)w.push("Поток меняет знак несколько раз — IRR может быть не единственной, ориентируйтесь на NPV.");
 if(k.npv<0)w.push("NPV отрицательный: при выбранной ставке дисконтирования проект не окупает вложения.");
 const card=(v,l,cls="")=>`<div class="k ${cls}"><b>${v}</b><span>${l}</span></div>`;
 const pp=x=>x==null?"не окупается":x===0?"сразу":x+" мес.";
 return(w.length?`<div class="warn" style="margin-bottom:8px">${w.map(esc).join("<br>")}</div>`:"")+
 `<div class="kpis">${card(fmtM(k.npv),"NPV (чистая приведённая стоимость)",k.npv>=0?"good":"badv")}${card(k.irrYear==null?"—":k.irrYear>1000?"> 1000 %":k.irrYear.toLocaleString("ru-RU",{maximumFractionDigits:1})+" %","IRR, годовых")}${card(pp(k.pp),"Срок окупаемости")}${card(pp(k.dpp),"Дисконт. срок окупаемости")}
 ${card(k.pi==null?"—":k.pi.toLocaleString("ru-RU",{maximumFractionDigits:2}),"PI (индекс доходности)")}${card(fmtM(k.maxNeed),"Макс. потребность в деньгах")}${card(k.beRevMonth?fmtM(k.beRevMonth):"—","Точка безубыточности, выручка/мес")}${card(k.beUnitsMonth?fmt(k.beUnitsMonth)+" прод.":"—","…то же в продажах/мес")}
 ${card(fmtM(k.totalTaxes),"Налоги и взносы за горизонт")}${card(fmtM(k.netTotal),"Чистая прибыль за горизонт")}${card(k.loanPay?fmtR(k.loanPay):"—","Платёж по кредиту/мес")}${card(esc(R.regimeName),"Режим")}</div>`+
 chart(R)+`<div class="small">Синяя линия — накопленный поток проекта (без кредита): где пересекает ноль — окупаемость. Зелёная — остаток денег на счёте с учётом кредита: ниже нуля — кассовый разрыв.</div>`;
}
function chart(R){
 const M=R.months,W=760,H=220,pl=58,pr=10,pt=10,pb=24;
 const a=M.map(m=>m.cumCF),b=M.map(m=>m.cashEnd),all=[...a,...b,0];
 const mn=Math.min(...all),mx=Math.max(...all),sp=mx-mn||1;
 const x=i=>pl+(W-pl-pr)*i/(M.length-1||1),y=v=>pt+(H-pt-pb)*(1-(v-mn)/sp);
 const line=(arr,c)=>`<polyline fill="none" stroke="${c}" stroke-width="2" points="${arr.map((v,i)=>x(i).toFixed(1)+","+y(v).toFixed(1)).join(" ")}"/>`;
 let ticks="";for(let k=0;k<=4;k++){const v=mn+sp*k/4;ticks+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl-6}" y="${y(v)+4}" text-anchor="end">${(v/1e6).toLocaleString("ru-RU",{maximumFractionDigits:1})} млн</text>`;}
 let xt="";for(let i=0;i<M.length;i+=12)xt+=`<text x="${x(i)}" y="${H-6}" text-anchor="start">${M[i].year}</text><line x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${H-pb}" stroke="var(--line)" stroke-dasharray="3 3"/>`;
 return`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin-top:12px" role="img" aria-label="Накопленный денежный поток">${ticks}${xt}<line x1="${pl}" x2="${W-pr}" y1="${y(0)}" y2="${y(0)}" stroke="var(--ink)" stroke-width="1"/>${line(a,"var(--s1)")}${line(b,"var(--s2)")}</svg>`;
}
function vReg(){
 const c=window._cmp;const best=c.find(x=>x.available);
 return`<div class="tw"><table><tr><th>Режим</th><th>NPV</th><th>Налоги и взносы за горизонт</th><th>Чистая прибыль</th><th>Доступность</th></tr>`+c.map(x=>`<tr><td class="${x===best?"best":""}">${esc(x.regimeName)}</td><td class="${x.kpi.npv<0?"neg":""}">${fmtR(x.kpi.npv)}</td><td>${fmtR(x.kpi.totalTaxes)}</td><td>${fmtR(x.kpi.netTotal)}</td><td style="text-align:left;white-space:normal;max-width:280px">${x.available?"доступен":`<span class="err">${esc(x.unavailable)}</span>`}</td></tr>`).join("")+`</table></div>
 <div class="small" style="margin-top:6px">Режим проверяется по каждому году горизонта. Если в каком-то году условия нарушены (лимит дохода, численность, конец эксперимента АУСН/НПД), режим помечается недоступным — в жизни пришлось бы перейти на другой.</div>`;
}
function vPnl(R){
 const P=R.pnl,rows=[["Выручка","rev"],["НДС к уплате","vat",-1],["Выручка без НДС","netRev",0,"sub"],["Переменные затраты","varC",-1],["Маржинальный доход","margin",0,"sub"],["Постоянные расходы","fixed",-1],["Зарплата","sal",-1],["Взносы за работников","pay",-1],["Взносы ИП за себя","ip",-1],["EBITDA","ebitda",0,"sub"],["Амортизация","amort",-1],["EBIT","ebit",0,"sub"],["Проценты по кредиту","interest",-1],["Прибыль до налога","ebt",0,"sub"],["Налог режима","tax",-1],["Чистая прибыль","net",0,"tot"]];
 return`<div class="tw"><table><tr><th>БДР, ₽</th>${P.map(p=>`<th>${p.year}</th>`).join("")}<th>Итого</th></tr>`+rows.map(([n,k,s,cls])=>{const v=P.map(p=>s===-1?-p[k]:p[k]);const t=v.reduce((a,b)=>a+b,0);return`<tr class="${cls||""}"><td>${n}</td>${v.map(x=>`<td class="${x<0?"neg":""}">${fmt(x)}</td>`).join("")}<td class="${t<0?"neg":""}">${fmt(t)}</td></tr>`;}).join("")+
 `<tr><td>Рентабельность продаж (ROS)</td>${P.map(p=>`<td>${p.ros.toLocaleString("ru-RU",{maximumFractionDigits:1})} %</td>`).join("")}<td></td></tr><tr><td>Налоговая нагрузка, % поступлений</td>${P.map(p=>`<td>${p.burdenPct.toLocaleString("ru-RU",{maximumFractionDigits:1})} %</td>`).join("")}<td></td></tr></table></div>
 <div class="small" style="margin-top:6px">Метод начисления. НДС вычтен из выручки как «к уплате» (упрощение). Взносы ИП показаны расходом, потому что для ИП это затраты бизнеса.</div>`;
}
let cfMonthly=false;
function vCf(R){
 const M=R.months,cols=cfMonthly?M.map(m=>({l:`${String(m.mi+1).padStart(2,"0")}.${String(m.year).slice(2)}`,ms:[m]})):[...new Set(M.map(m=>m.yi))].map(yi=>({l:String(M.find(m=>m.yi===yi).year),ms:M.filter(m=>m.yi===yi)}));
 const s=(ms,f)=>ms.reduce((a,m)=>a+f(m),0);
 const rows=[["Поступления от клиентов",m=>m.cashIn],["Оплата переменных затрат",m=>-m.varCost],["Постоянные расходы",m=>-m.fixed],["Зарплата",m=>-m.salaries],["Взносы за работников",m=>-m.payrollPay],["Налог режима",m=>-m.taxPay],["НДС",m=>-m.vatPay],["Взносы ИП за себя",m=>-m.ipPay],["Операционный поток",m=>m.opCF,"sub"],["Инвестиции",m=>m.invCF],["Инвестиционный поток",m=>m.invCF,"sub"],["Собственные средства и кредит",m=>m.t===0?(inp.ownFunds||0)+(inp.loanAmount||0):0],["Погашение кредита",m=>-m.principal],["Проценты",m=>-m.interest],["Финансовый поток",m=>m.finCF,"sub"],["Остаток на конец",null,"tot"]];
 return`<div style="margin-bottom:6px"><button class="btn" id="cfT">${cfMonthly?"Показать по годам":"Показать по месяцам"}</button></div><div class="tw"><table><tr><th>БДДС, ₽</th>${cols.map(c=>`<th>${c.l}</th>`).join("")}</tr>`+rows.map(([n,f,cls])=>`<tr class="${cls||""}"><td>${n}</td>${cols.map(c=>{const v=f?s(c.ms,f):c.ms[c.ms.length-1].cashEnd;return`<td class="${v<-0.5?"neg":""}">${fmt(v)}</td>`;}).join("")}</tr>`).join("")+`</table></div>
 <div class="small" style="margin-top:6px">Кассовый метод: деньги — в месяце фактической оплаты, налоги — в месяцах уплаты.</div>`;
}
function vSens(R){
 const S=F.sensitivity(inp,DEFS,EFF(),window._id);if(!S.length)return"<div class='small'>Нет факторов для анализа.</div>";
 const base=S[0].base,ext=Math.max(...S.map(s=>Math.max(Math.abs(s.lo-base),Math.abs(s.hi-base))),1);
 const pos=v=>50+50*(v-base)/ext;
 return`<div class="small" style="margin-bottom:8px">Как меняется NPV (база ${fmtM(base)}), если фактор отклонится на ±20%. Красное — неблагоприятная сторона, зелёное — благоприятная. Сверху — факторы, от которых проект зависит сильнее всего.</div><div class="tor">`+
 S.map(s=>{const a=Math.min(s.lo,s.hi),b=Math.max(s.lo,s.hi),bad=Math.min(pos(s.lo),pos(s.hi)),good=Math.max(pos(s.lo),pos(s.hi));
  const thr=s.threshold==null?"NPV не меняет знак в диапазоне 0–300%":`NPV = 0 при ${s.threshold<1?"снижении":"росте"} на ${Math.abs((s.threshold-1)*100).toLocaleString("ru-RU",{maximumFractionDigits:0})}%`;
  return`<div>${esc(s.name)}</div><div><div class="tb"><i class="lo" style="left:${bad}%;width:${50-bad}%"></i><i class="hi" style="left:50%;width:${good-50}%"></i><span class="mid" style="left:50%"></span></div><div class="small">${fmtM(a)} … ${fmtM(b)} · ${thr}</div></div>`;}).join("")+`</div>`;
}

// ---------- SWOT / PEST / сценарии ----------
const A=Analysis;let FACTORS=[],TOWS={SO:"",ST:"",WO:"",WT:""},fid=1;
const PROBS=[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1];
const FPRESETS={
 "Кофейня":[
  ["SWOT","S","Помещение на проходной улице у метро",5],["SWOT","S","Бариста с опытом и своей аудиторией",3],
  ["SWOT","W","Нет опыта управления общепитом",4,null,"volume",-10],["SWOT","W","Маленький зал — 12 мест",2],
  ["SWOT","O","Доставка через агрегаторы",3,0.5,"volume",15],["SWOT","O","Корпоративные заказы у соседних офисов",3,0.3,"volume",8],
  ["SWOT","T","Сетевая кофейня откроется рядом",4,0.4,"price",-10],["SWOT","T","Арендодатель поднимет ставку",4,0.5,"fixed",15],
  ["PEST","T","Рост закупочных цен на кофе и молоко","E",3,0.6,"varCostPct",10],["PEST","T","Ключевая ставка останется высокой","E",2,0.5,"loanRate",15],
  ["PEST","T","Снижение реальных доходов населения","S",2,0.3,"volume",-8],["PEST","O","Рост привычки брать кофе с собой","S",2,0.6],
  ["PEST","T","Обязательная маркировка молочной продукции","L",1,0.9],["PEST","O","Онлайн-кассы и QR-оплата без комиссии","T",1,0.5,"varCostPct",-1]],
 "Онлайн-услуги, один ИП":[
  ["SWOT","S","Портфолио и отзывы",4],["SWOT","W","Всё держится на одном человеке",4,null,"volume",-15],
  ["SWOT","O","Выход на маркетплейс фриланса",3,0.5,"volume",20],["SWOT","T","Демпинг конкурентов и ИИ-сервисов",4,0.5,"price",-15],
  ["PEST","T","Клиенты-компании требуют работать с НДС","L",2,0.3,"price",-5],["PEST","O","Спрос на цифровизацию малого бизнеса","E",2,0.6,"growthPct",30]],
 "Мини-производство":[
  ["SWOT","S","Своя технология и оборудование",5],["SWOT","W","Зависимость от двух крупных покупателей",4,null,"delayDays",30],
  ["SWOT","O","Импортозамещение — уход иностранных поставщиков",4,0.6,"volume",15],["SWOT","T","Рост цен на сырьё",4,0.6,"varCostPct",10],
  ["SWOT","T","Дефицит рабочих",3,0.7,"salary",15],["PEST","T","Высокая ключевая ставка","E",3,0.6,"loanRate",15],
  ["PEST","O","Региональные субсидии на оборудование","P",2,0.3,"capex",-20],["PEST","T","Ужесточение экологических требований","Ecol",1,0.4,"capex",5]],
};
function loadFactors(name){fid=1;FACTORS=(FPRESETS[name]||[]).map(a=>a[0]==="SWOT"?{id:fid++,src:"SWOT",q:a[1],text:a[2],weight:a[3],prob:a[4]??0.5,target:a[5]||"",deltaPct:a[6]||0}:{id:fid++,src:"PEST",q:a[1],text:a[2],group:a[3],impact:a[4],prob:a[5],target:a[6]||"",deltaPct:a[7]||0});TOWS={SO:"",ST:"",WO:"",WT:""};}
const opt=(arr,cur,lab=x=>x)=>arr.map(v=>`<option value="${v}" ${String(v)===String(cur)?"selected":""}>${lab(v)}</option>`).join("");
function frow(f){
 const ext=f.src==="PEST"||f.q==="O"||f.q==="T";
 return`<div class="fr" data-id="${f.id}"><input class="txt" data-k="text" value="${esc(f.text)}" placeholder="Фактор">
 ${f.src==="SWOT"?`<select data-k="weight" title="Важность 1–5">${opt([1,2,3,4,5],f.weight,v=>"вес "+v)}</select>`:`<select data-k="impact" title="Сила влияния 1–3">${opt([1,2,3],f.impact,v=>"сила "+v)}</select>`}
 ${ext?`<select data-k="prob" title="Вероятность">${opt(PROBS,f.prob,v=>Math.round(v*100)+"%")}</select>`:"<span></span>"}
 ${f.src==="PEST"?`<select data-k="q" style="grid-column:1/-1">${opt(["O","T"],f.q,v=>v==="O"?"возможность":"угроза")}</select>`:""}
 <div class="lnk"><select data-k="target"><option value="">— не влияет на модель —</option>${opt(Object.keys(A.TARGETS),f.target,v=>"меняет: "+A.TARGETS[v])}</select>
 <input data-k="deltaPct" inputmode="decimal" value="${f.target?String(f.deltaPct).replace(".",","):""}" placeholder="±%" ${f.target?"":"disabled"}><button class="x" data-del="${f.id}" title="Удалить">×</button></div></div>`;
}
function vSwot(){
 const s=A.scoreSwot(FACTORS);
 const quad=q=>`<div class="q ${q}"><h3><span>${A.SWOT_Q[q]}</span><span>${s.score[q].toLocaleString("ru-RU",{maximumFractionDigits:1})}</span></h3>${FACTORS.filter(f=>f.src==="SWOT"&&f.q===q).map(frow).join("")}<button class="add" data-add="SWOT:${q}">+ добавить</button></div>`;
 return`<div class="hint">Вес — насколько фактор важен (1–5). Для возможностей и угроз — вероятность. Чтобы фактор участвовал в сценариях, выберите, какой параметр модели он меняет и на сколько процентов (минус — уменьшает).</div>
 <div class="sw">${["S","W","O","T"].map(quad).join("")}</div>
 <div class="pos" id="swPos"><b>${s.pos.code} · ${s.pos.name}</b><div class="small">Внутренний баланс S − W = ${s.internal.toLocaleString("ru-RU",{maximumFractionDigits:1})}, внешний O − T = ${s.external.toLocaleString("ru-RU",{maximumFractionDigits:1})}</div><div style="margin-top:4px">${s.pos.text}</div></div>
 <h2 style="margin-top:12px">Матрица стратегий (TOWS)</h2><div class="sw">${[["SO","Сильные × возможности — наступать"],["ST","Сильные × угрозы — защищаться"],["WO","Слабые × возможности — укрепляться"],["WT","Слабые × угрозы — выживать"]].map(([k,l])=>`<div><label>${l}</label><textarea data-tows="${k}" rows="2">${esc(TOWS[k])}</textarea></div>`).join("")}</div>`;
}
function vPest(){
 const p=A.scorePest(FACTORS);const mx=Math.max(...Object.values(p.byGroup),0.0001);
 return`<div class="hint">PESTEL — внешняя среда. Сила влияния 1–3, вероятность 10–100%. Значимость = сила × вероятность.</div>
 ${Object.keys(A.PEST_G).map(g=>`<div class="q"><h3><span>${A.PEST_G[g]}</span><span>${p.byGroup[g].toLocaleString("ru-RU",{maximumFractionDigits:2})}</span></h3>${FACTORS.filter(f=>f.src==="PEST"&&f.group===g).map(frow).join("")}<button class="add" data-add="PEST:${g}">+ добавить</button></div>`).join("")}
 <h2 style="margin-top:12px">Самые значимые факторы</h2><div class="gb">${p.list.slice(0,7).map(f=>`<span>${esc(A.PEST_G[f.group])}</span><div><div class="bar"><i style="width:${(f.score/(p.list[0].score||1)*100).toFixed(0)}%;background:${f.q==="T"?"var(--bad)":"var(--ok)"}"></i></div><div class="small">${esc(f.text)}</div></div><span>${Math.round(f.share*100)}%</span>`).join("")}</div>`;
}
function vScen(){
 const S=A.scenarios(inp,FACTORS,DEFS,EFF(),window._id),L=A.lint(FACTORS);
 const pp=x=>x==null?"не окуп.":x+" мес.";
 const tgt=Object.keys(A.TARGETS).filter(k=>S.some(s=>s.mult[k]));
 return(L.length?`<div class="warn" style="margin-bottom:8px">${L.map(esc).join("<br>")}</div>`:"")+
 `<div class="tw"><table><tr><th>Сценарий (${esc(window._R.regimeName)})</th><th>NPV</th><th>IRR</th><th>Окупаемость</th><th>Мин. остаток</th><th>Кассовый разрыв</th></tr>`+
 S.map(s=>`<tr class="${s.id==="BASE"?"sub":""}"><td>${s.name}</td><td class="${s.kpi.npv<0?"neg":""}">${fmtM(s.kpi.npv)}</td><td>${s.kpi.irrYear==null?"—":s.kpi.irrYear>1000?">1000%":s.kpi.irrYear.toFixed(1)+"%"}</td><td>${pp(s.kpi.pp)}</td><td class="${s.kpi.cashMin<0?"neg":""}">${fmtM(s.kpi.cashMin)}</td><td>${s.kpi.cashGapMonth?s.kpi.cashGapMonth+"-й мес.":"нет"}</td></tr>`).join("")+`</table></div>
 ${tgt.length?`<h2 style="margin-top:12px">Как меняются параметры</h2><div class="tw"><table><tr><th>Параметр</th>${S.filter(s=>s.id!=="BASE").map(s=>`<th>${s.name.split(" ")[0]}</th>`).join("")}</tr>${tgt.map(k=>`<tr><td>${A.TARGETS[k]}</td>${S.filter(s=>s.id!=="BASE").map(s=>{const m=s.mult[k];return`<td class="${m&&m<1&&["price","volume","growthPct"].includes(k)||m>1&&!["price","volume","growthPct"].includes(k)?"neg":""}">${m?((m-1)*100>0?"+":"")+((m-1)*100).toLocaleString("ru-RU",{maximumFractionDigits:1})+"%":"—"}</td>`;}).join("")}</tr>`).join("")}</table></div>`:""}
 <div class="small" style="margin-top:6px">Пессимистичный — сработали все угрозы и слабости. Оптимистичный — все возможности и сильные стороны. Ожидаемый — каждое влияние умножено на вероятность (у слабых и сильных сторон вероятность 100%). Несколько влияний на один параметр перемножаются.${S[0].kpi.npv<0?' <b style="color:var(--bad)">В пессимистичном сценарии проект убыточен — стоит заранее решить, что делать, если угрозы сработают.</b>':""}</div>`;
}
function swUpdateScore(){const box=document.getElementById("swPos");if(box&&tab==="swot"){const s=A.scoreSwot(FACTORS);box.innerHTML=`<b>${s.pos.code} · ${s.pos.name}</b><div class="small">Внутренний баланс S − W = ${s.internal.toLocaleString("ru-RU",{maximumFractionDigits:1})}, внешний O − T = ${s.external.toLocaleString("ru-RU",{maximumFractionDigits:1})}</div><div style="margin-top:4px">${s.pos.text}</div>`;}}
$("out").addEventListener("input",e=>{
 const t=e.target;if(t.dataset.tows){TOWS[t.dataset.tows]=t.value;return;}
 const row=t.closest(".fr");if(!row)return;const f=FACTORS.find(x=>x.id===+row.dataset.id);if(!f)return;const k=t.dataset.k;
 if(k==="text")f.text=t.value;else if(k==="deltaPct"){const v=parse(t.value);f.deltaPct=v==null||isNaN(v)?0:v;}
});
$("out").addEventListener("change",e=>{
 const t=e.target,row=t.closest(".fr");if(!row)return;const f=FACTORS.find(x=>x.id===+row.dataset.id);if(!f)return;const k=t.dataset.k;
 if(["weight","impact"].includes(k))f[k]=+t.value;else if(k==="prob")f.prob=+t.value;else if(k==="q")f.q=t.value;else if(k==="target"){f.target=t.value;if(!f.target)f.deltaPct=0;}
 else if(k==="text"||k==="deltaPct")return;
 render();
});
$("out").addEventListener("click",e=>{
 const a=e.target.dataset.add,d=e.target.dataset.del;
 if(a){const[src,x]=a.split(":");FACTORS.push(src==="SWOT"?{id:fid++,src,q:x,text:"",weight:3,prob:0.5,target:"",deltaPct:0}:{id:fid++,src,q:"T",group:x,text:"",impact:2,prob:0.5,target:"",deltaPct:0});render();
   const rows=document.querySelectorAll(".fr input.txt");rows[rows.length-1]&&[...rows].find(r=>r.closest(".fr").dataset.id==String(fid-1))?.focus();}
 if(d){FACTORS=FACTORS.filter(f=>f.id!==+d);render();}
});
$("out").addEventListener("input",()=>{if(tab==="swot")swUpdateScore();});


// ---------- Проекты ----------
const PS=ProjectStore,STORE=PS.createStore();
const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
// правки справочника из экрана «Параметры» (M0, уровень «для всех проектов»); правки проекта — поверх
function m0User(){try{const o=JSON.parse(localStorage.getItem("m0_overrides_v1")||"{}");return o.USER||{};}catch(e){return{};}}
function EFF(){return Object.assign({},m0User(),OVR);}
async function nativeSave(name,txt){const P=window.Capacitor.Plugins;const path=(name||"project").replace(/[\\/:*?"<>|]/g,"_")+".json";
 const r=await P.Filesystem.writeFile({path,data:txt,directory:"CACHE",encoding:"utf8"});await P.Share.share({title:path,url:r.uri,dialogTitle:"Сохранить проект"});}let CUR=null,saveT=null,lastSaved=null;
function getFormRaw(){const o={};for(const[,fs]of FIELDS)for(const[k,,tp]of fs){const el=$("f_"+k);o[k]=tp==="chk"?el.checked:el.value;}return o;}
function setFormRaw(o){for(const[,fs]of FIELDS)for(const[k,,tp]of fs){const el=$("f_"+k);if(!(k in o))continue;if(tp==="chk")el.checked=!!o[k];else el.value=o[k];}calc();}
function snapshot(){if(!CUR)return;CUR.name=$("projName").value.trim()||"Без названия";CUR.form=getFormRaw();CUR.factors=JSON.parse(JSON.stringify(FACTORS));CUR.tows={...TOWS};CUR.regime=regime;CUR.overrides=OVR;}
function scheduleSave(){if(!CUR)return;clearTimeout(saveT);status("Изменено…");saveT=setTimeout(saveNow,700);}
function saveNow(){if(!CUR)return;snapshot();try{STORE.save(CUR);lastSaved=new Date();}catch(e){status("Не удалось сохранить: "+(e.message||e)+". Сохраните через «Экспорт».",true);return;}refreshList();status();}
function status(txt,bad){const el=$("pStatus");const mem=STORE.kind==="memory"?" Хранилище браузера недоступно — проект живёт до закрытия страницы, сохраняйте через «Экспорт».":"";
 el.style.color=bad||mem?"var(--warn)":"";el.textContent=(txt||(lastSaved?"Сохранено в "+lastSaved.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})+" · автосохранение":""))+mem;}
function refreshList(){const L=STORE.list();$("projSel").innerHTML=L.map(x=>`<option value="${x.id}" ${CUR&&x.id===CUR.id?"selected":""}>${esc(x.name)}</option>`).join("")||"<option>—</option>";}
function openProject(p){CUR=p;$("projName").value=p.name;FACTORS=p.factors||[];fid=FACTORS.reduce((m,f)=>Math.max(m,f.id||0),0)+1;TOWS=Object.assign({SO:"",ST:"",WO:"",WT:""},p.tows);regime=p.regime||"AUTO";OVR=p.overrides||{};
 $("m0msg").textContent=Object.keys(OVR).length?"Правок параметров в проекте: "+Object.keys(OVR).length:"";setFormRaw(p.form);refreshList();status();}
function newFromTemplate(name){clearTimeout(saveT);loadFactors(name);regime="AUTO";OVR={};setForm(PRESETS[name]);const p=PS.makeProject(name,{form:getFormRaw(),factors:FACTORS,tows:TOWS});CUR=p;$("projName").value=p.name;saveNow();}
function sheet(html){$("shBox").innerHTML=html;$("sh").classList.add("on");}
function closeSheet(){$("sh").classList.remove("on");}
$("sh").onclick=e=>{if(e.target.id==="sh")closeSheet();};
$("projSel").onchange=e=>{const id=e.target.value;saveNow();const p=STORE.load(id);if(p)openProject(p);};
$("projName").oninput=scheduleSave;
$("pNew").onclick=()=>{saveNow();newFromTemplate("Кофейня");$("projName").value="Новый проект";saveNow();$("projName").focus();$("projName").select();};
$("pDup").onclick=()=>{saveNow();const c=STORE.duplicate(CUR.id);if(c)openProject(c);};
$("pDel").onclick=()=>sheet(`<h3>Удалить проект «${esc(CUR.name)}»?</h3><div class="small">Это нельзя отменить. Если проект может понадобиться — сначала сделайте экспорт.</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn" id="dC">Отмена</button><button class="btn pri" id="dOk" style="background:var(--bad);border-color:var(--bad)">Удалить</button></div>`)
 ||($("dC").onclick=closeSheet,$("dOk").onclick=()=>{clearTimeout(saveT);STORE.remove(CUR.id);closeSheet();const L=STORE.list();if(L.length)openProject(STORE.load(L[0].id));else newFromTemplate("Кофейня");});
$("pExp").onclick=()=>{saveNow();const txt=PS.toJSON(CUR);sheet(`<h3>Экспорт проекта</h3><div class="small">${NATIVE?"«Сохранить файл» откроет меню: Файлы, Диск, мессенджер. Или ":""}Скопируйте и сохраните в файл <code>${esc(CUR.name)}.json</code> — его можно открыть через «Импорт» на другом устройстве или в Android-версии.</div><textarea id="xT" rows="12" readonly style="margin-top:8px;font:12px ui-monospace,Menlo,monospace">${esc(txt)}</textarea><div id="xM" class="small"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn" id="xC">Закрыть</button>${NATIVE?'<button class="btn" id="xSv">Сохранить файл…</button>':""}<button class="btn pri" id="xCp">Копировать</button></div>`);
 if(NATIVE)$("xSv").onclick=async()=>{try{await nativeSave(CUR.name,$("xT").value);$("xM").textContent="Готово.";}catch(e){$("xM").textContent="Не удалось сохранить: "+(e.message||e);}};
 $("xC").onclick=closeSheet;$("xCp").onclick=async()=>{const ta=$("xT");try{await navigator.clipboard.writeText(ta.value);$("xM").textContent="Скопировано.";}catch(e){ta.select();$("xM").textContent="Буфер обмена недоступен — текст выделен, скопируйте вручную.";}};};
$("pImp").onclick=()=>{sheet(`<h3>Импорт проекта</h3><div class="small">Выберите файл .json или вставьте текст экспорта. Проект добавится в список, текущий не изменится.</div><input type="file" id="iF" accept=".json,application/json" style="margin:10px 0"><textarea id="iT" rows="8" style="font:12px ui-monospace,Menlo,monospace" placeholder='{"format":"biz-calc-project", …}'></textarea><div id="iM" class="small"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn" id="iC">Отмена</button><button class="btn pri" id="iOk">Импортировать</button></div>`);
 $("iF").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>$("iT").value=r.result;r.readAsText(f);};
 $("iC").onclick=closeSheet;
 $("iOk").onclick=()=>{try{saveNow();const{project:p,warnings:w}=PS.fromJSON($("iT").value);if(STORE.list().some(x=>x.id===p.id)){p.id=PS.uid();p.name+=" (импорт)";}STORE.save(p);openProject(p);closeSheet();status("Импортировано"+(w.length?": "+w.join(" "):""));}catch(e){$("iM").innerHTML=`<span class="err">${esc(e.message)}</span>`;}};};
$("form").addEventListener("input",scheduleSave);$("form").addEventListener("change",scheduleSave);
$("out").addEventListener("input",scheduleSave);$("out").addEventListener("change",scheduleSave);
$("out").addEventListener("click",e=>{if(e.target.dataset.add||e.target.dataset.del)scheduleSave();});

$("tabs").onclick=e=>{const t=e.target.dataset.t;if(t){tab=t;render();}};
$("out").addEventListener("click",e=>{if(e.target.id==="cfT"){cfMonthly=!cfMonthly;render();}});
$("regime").onchange=e=>{regime=e.target.value;calc();scheduleSave();};
$("presets").innerHTML=Object.keys(PRESETS).map((n,i)=>`<button data-p="${esc(n)}">${esc(n)}</button>`).join("");
$("presets").onclick=e=>{const n=e.target.dataset.p;if(!n)return;saveNow();newFromTemplate(n);};
$("applyM0").onclick=()=>{try{const j=JSON.parse($("m0json").value);if(j.format!=="biz-calc-params")throw new Error("Это не экспорт из M0.");const o={};let n=0;for(const y of Object.keys(j.years))for(const p of j.years[y]){const s=p.project||p.user;if(s&&typeof s.value==="number"){o[p.code+"@"+y]=s;n++;}}OVR=o;$("m0msg").textContent="Применено правок: "+n;calc();scheduleSave();}catch(e){$("m0msg").textContent=e.message||"Ошибка JSON";}};
$("clearM0").onclick=()=>{OVR={};$("m0json").value="";$("m0msg").textContent="Значения по закону";calc();scheduleSave();};
buildForm();{const L=STORE.list();const p=L.length&&STORE.load(L[0].id);if(p)openProject(p);else newFromTemplate("Кофейня");}
'''
html=f'''<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Бизнес-калькулятор — прототип v0.3</title><style>{css}</style></head><body>{body}
<script>
{defs}
{eng}
{fm}
{an}
{stj}
{js}
</script></body></html>'''


os.makedirs(os.path.join(ROOT,'www'),exist_ok=True)
open(os.path.join(ROOT,'www','index.html'),'w').write(html)
# экран параметров: только уровень «для всех проектов», ссылка назад
p=m0
p=p.replace('<title>M0 · Мастер-данные — прототип</title>','<title>Параметры — Бизнес-калькулятор</title>')
p=p.replace('<h1>Мастер-данные · параметры расчёта</h1>','<h1><a href="index.html" style="text-decoration:none">←</a> Параметры расчёта</h1>')
p=p.replace('<div class="seg" id="levels">','<div class="seg" id="levels" style="display:none">')
p=p.replace('<meta name="viewport" content="width=device-width, initial-scale=1">','<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">')
p=p.replace('header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:12px 14px 10px}','header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:calc(12px + env(safe-area-inset-top)) 14px 10px}')
p=p.replace('footer{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);padding:8px 12px;','footer{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);padding:8px 12px calc(8px + env(safe-area-inset-bottom));')
open(os.path.join(ROOT,'www','params.html'),'w').write(p)
print('built www/index.html, www/params.html')
