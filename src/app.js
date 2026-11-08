const E=TaxEngine,F=FinModel,$=id=>document.getElementById(id);
const fmt=x=>{if(x==null||!isFinite(x))return"—";const r=Math.round(x);return(r===0?0:r).toLocaleString("ru-RU");};
const fmtR=x=>x==null||!isFinite(x)?"—":fmt(x)+" ₽";
let UNITS=null;const narrow=()=>window.innerWidth<640;const units=()=>UNITS||(narrow()?"K":"R");
const fmtU=x=>{if(x==null||!isFinite(x))return"—";const d=units()==="K"?(Math.abs(x)<1e4?1:0):0,v=units()==="K"?x/1000:x,f=Math.pow(10,d),r=Math.round(v*f)/f;return(r===0?0:r).toLocaleString("ru-RU",{maximumFractionDigits:d});};
const fmtM=x=>x==null?"—":(Math.abs(x)>=1e6?(x/1e6).toLocaleString("ru-RU",{maximumFractionDigits:2})+" млн ₽":fmtR(x));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const parse=s=>{s=String(s).replace(/\s/g,"").replace(",",".");return s===""?null:Number(s);};
const SEASONS={"Без сезонности":[1,1,1,1,1,1,1,1,1,1,1,1],"Кафе (летний спад)":[.9,.9,1,1,1,.85,.8,.85,1.05,1.1,1.15,1.4],"Туризм (лето)":[.5,.5,.7,.8,1.1,1.5,1.7,1.6,1.1,.8,.6,1.1],"Образование (сентябрь)":[1.1,1.1,1.1,1,.9,.5,.4,.8,1.5,1.3,1.2,1.1]};
const FIELDS=[
 ["Продажи",[["growthPct","Рост продаж, % в месяц"],["rampMonths","Выход на мощность, мес."],["delayDays","Отсрочка оплаты клиентов, дней"],["season","Сезонность","season"]]],
 ["Затраты",[["fixed","Постоянные расходы, ₽/мес (аренда, услуги…)"],["fixedIndexPct","Рост постоянных, % в год"]]],
 ["Персонал",[["staff","Работников, чел."],["salary","Зарплата, ₽/мес (до НДФЛ)"],["salaryIndexPct","Индексация зарплаты, % в год"],["msp","ОКВЭД в перечне льготы МСП","chk"]]],
 ["Инвестиции и финансирование",[["ownFunds","Собственные средства на старте, ₽"]]],
 ["Налоги",[["prevIncome","Доход за год до старта, ₽"],["physSharePct","Доля дохода от физлиц, %"],["vatExpSharePct","Доля расходов с входящим НДС, %"],["psnPotential","Потенциальный доход по патенту, ₽/год"],["usnRegionalIncome","Ставка УСН «Доходы» в регионе, % (пусто — 6)"],["usnRegionalProfit","Ставка УСН «Д−Р» в регионе, % (пусто — 15)"],["resale","Перепродажа товаров","chk"],["ausnRegion","АУСН введена в регионе","chk"]]],
 ["Горизонт и ставка",[["startYear","Год старта","sel",[2026,2027]],["horizon","Горизонт, мес.","sel",[12,24,36,60]],["discountRatePct","Ставка дисконтирования, % годовых"],["terminalMode","Остаточная стоимость активов в NPV","opt",[["none","не учитывать"],["book","по остаточной стоимости"],["sale","продажа за % от остаточной"]]],["terminalPct","Цена продажи, % от остаточной"]]],
];
const PRESETS={
 "Кофейня":{fin:{products:[{name:"Кофе и напитки",price:300,volume:3000,varCostPct:25},{name:"Выпечка и десерты",price:230,volume:1300,varCostPct:55},{name:"Зерно и мерч",price:900,volume:60,varCostPct:60}],investments:[{name:"Оборудование и мебель",month:1,amount:2500000,lifeMonths:60},{name:"Ремонт помещения",month:1,amount:1000000,lifeMonths:0}],loans:[{month:1,amount:2000000,ratePct:24,termMonths:36,type:"ANN",graceMonths:0}]},startYear:2026,horizon:36,price:380,volume:3300,growthPct:0.5,rampMonths:6,delayDays:0,season:"Кафе (летний спад)",varCostPct:33,fixed:260000,fixedIndexPct:7,staff:4,salary:55000,salaryIndexPct:8,msp:true,capex:3500000,lifeMonths:60,ownFunds:2000000,loanAmount:2000000,loanRate:24,loanTerm:36,prevIncome:0,physSharePct:100,vatExpSharePct:30,psnPotential:1500000,resale:false,ausnRegion:true,discountRatePct:25},
 "Онлайн-услуги, один ИП":{fin:{products:[{name:"Консультация",price:8000,volume:10,varCostPct:5},{name:"Проект под ключ",price:45000,volume:2,varCostPct:15}],investments:[{name:"Ноутбук и ПО",month:1,amount:200000,lifeMonths:36}],loans:[]},startYear:2026,horizon:24,price:15000,volume:12,growthPct:2,rampMonths:3,delayDays:15,season:"Без сезонности",varCostPct:10,fixed:25000,fixedIndexPct:5,staff:0,salary:0,salaryIndexPct:0,msp:false,capex:200000,lifeMonths:36,ownFunds:250000,loanAmount:0,loanRate:0,loanTerm:12,prevIncome:0,physSharePct:70,vatExpSharePct:0,psnPotential:800000,resale:false,ausnRegion:true,discountRatePct:20},
 "Мини-производство":{fin:{products:[{name:"Изделие А",price:1500,volume:1500,varCostPct:45},{name:"Изделие Б",price:750,volume:1000,varCostPct:55}],investments:[{name:"Производственная линия",month:1,amount:7500000,lifeMonths:84},{name:"Подготовка цеха",month:1,amount:1500000,lifeMonths:0},{name:"Вторая линия",month:25,amount:4000000,lifeMonths:84}],loans:[{month:1,amount:6000000,ratePct:22,termMonths:48,type:"ANN",graceMonths:0}]},startYear:2026,horizon:60,price:1200,volume:2500,growthPct:1,rampMonths:9,delayDays:45,season:"Без сезонности",varCostPct:48,fixed:350000,fixedIndexPct:6,staff:7,salary:60000,salaryIndexPct:7,msp:true,capex:9000000,lifeMonths:84,ownFunds:9000000,loanAmount:6000000,loanRate:22,loanTerm:48,prevIncome:0,physSharePct:10,vatExpSharePct:70,psnPotential:0,resale:false,ausnRegion:true,discountRatePct:25},
};
let OVR={},tab="sum",regime="AUTO",inp={};
const FIN0=()=>({products:[],investments:[],loans:[],injections:[],line:{on:false,limit:1000000,ratePct:26,reserve:0}});let FIN=FIN0();
const DEFAULT=PRESETS["Кофейня"];
function buildForm(){
 $("form").innerHTML="<h2>Данные проекта</h2>"+FIELDS.map(([g,fs],i)=>`<details class="g" ${i<2?"open":""}><summary>${g}</summary><div class="grid" style="margin-top:8px">`+fs.map(([k,l,t,opts])=>{
  if(t==="chk")return`<div class="chk"><input type="checkbox" id="f_${k}"><label for="f_${k}">${l}</label></div>`;
  if(t==="sel")return`<div><label>${l}</label><select id="f_${k}">${opts.map(o=>`<option>${o}</option>`).join("")}</select></div>`;
  if(t==="season")return`<div><label>${l}</label><select id="f_${k}">${Object.keys(SEASONS).map(o=>`<option>${o}</option>`).join("")}</select></div>`;
  if(t==="opt")return`<div><label>${l} ${qi("terminal")}</label><select id="f_${k}">${opts.map(([v,n])=>`<option value="${v}">${n}</option>`).join("")}</select></div>`;
  return`<div><label>${l}</label><input type="text" inputmode="decimal" id="f_${k}"></div>`;}).join("")+`</div>${g==="Инвестиции и финансирование"?'<div id="finEd"></div>':g==="Продажи"?'<div id="prodEd"></div>':""}</details>`).join("")+`<div id="fErr" class="err"></div>`;
 $("form").addEventListener("input",e=>{if(!e.target.closest("#finEd,#prodEd"))calc();});$("form").addEventListener("change",e=>{if(!e.target.closest("#finEd,#prodEd"))calc();});
}
function opts0(k){for(const[,fs]of FIELDS)for(const f of fs)if(f[0]===k)return f[3][0][0];}
function setForm(p){if(p.fin){FIN=Object.assign(FIN0(),JSON.parse(JSON.stringify(p.fin)));}renderFin();renderProd();for(const[,fs]of FIELDS)for(const[k,,t]of fs){const el=$("f_"+k);if(t==="chk")el.checked=k==="ausnRegion"?p[k]!==false:!!p[k];else if(t==="sel"||t==="season")el.value=String(p[k]);else if(t==="opt")el.value=p[k]||opts0(k);else el.value=p[k]==null?"":Number(p[k]).toLocaleString("ru-RU");}calc();}
function readForm(){const o={},bad=[];for(const[,fs]of FIELDS)for(const[k,l,t]of fs){const el=$("f_"+k);
  if(t==="chk")o[k]=el.checked;else if(t==="sel")o[k]=+el.value;else if(t==="opt")o[k]=el.value;else if(t==="season")o.season=SEASONS[el.value];
  else{const v=parse(el.value);if(v!=null&&(isNaN(v)||v<0))bad.push(l);o[k]=v==null||isNaN(v)?null:v;}}
 for(const k of["growthPct","rampMonths","delayDays","fixed","fixedIndexPct","staff","salary","salaryIndexPct","ownFunds","prevIncome","vatExpSharePct","psnPotential","discountRatePct"])if(o[k]==null)o[k]=0;
 if(o.physSharePct==null)o.physSharePct=100;o.staff=Math.round(o.staff);o.products=FIN.products;o.investments=FIN.investments;o.loans=FIN.loans;o.injections=FIN.injections;o.creditLine=FIN.line;
 if(o.terminalPct==null)o.terminalPct=100;if(FIN.products.some(p=>p.varCostPct>100))bad.push("переменные затраты продукта больше 100%");if(!FIN.products.length)bad.push("добавьте хотя бы один продукт");
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
 const T={sum:"Итоги",reg:"Режимы",pnl:"БДР",cf:"БДДС",sens:"Чувствительность",swot:"SWOT",pest:"PEST",scen:"Сценарии",gl:"Справочник"};
 $("tabs").innerHTML=Object.entries(T).map(([k,v])=>`<button data-t="${k}" class="${k===tab?"on":""}">${v}</button>`).join("");
 const R=window._R;if(!R)return;
 $("out").innerHTML=({sum:vSum,reg:vReg,pnl:vPnl,cf:vCf,sens:vSens,swot:vSwot,pest:vPest,scen:vScen,gl:vGl})[tab](R);
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
function vSens(R){
 const S=F.sensitivity(inp,DEFS,EFF(),window._id);if(!S.length)return"<div class='small'>Нет факторов для анализа.</div>";
 const base=S[0].base,ext=Math.max(...S.map(s=>Math.max(Math.abs(s.lo-base),Math.abs(s.hi-base))),1);
 const pos=v=>50+50*(v-base)/ext;
 return`<div class="small" style="margin-bottom:8px">Как меняется NPV (база ${fmtM(base)}), если фактор отклонится на ±20%. Красное — неблагоприятная сторона, зелёное — благоприятная. Сверху — факторы, от которых проект зависит сильнее всего.</div><div class="tor">`+
 S.map(s=>{const a=Math.min(s.lo,s.hi),b=Math.max(s.lo,s.hi),bad=Math.min(pos(s.lo),pos(s.hi)),good=Math.max(pos(s.lo),pos(s.hi));
  const thr=s.threshold==null?"NPV не меняет знак в диапазоне 0–300%":`NPV = 0 при ${s.threshold<1?"снижении":"росте"} на ${Math.abs((s.threshold-1)*100).toLocaleString("ru-RU",{maximumFractionDigits:0})}%`;
  return`<div>${esc(s.name)}</div><div><div class="tb"><i class="lo" style="left:${bad}%;width:${50-bad}%"></i><i class="hi" style="left:50%;width:${good-50}%"></i><span class="mid" style="left:50%"></span></div><div class="small">${fmtM(a)} … ${fmtM(b)} · ${thr}</div></div>`;}).join("")+`</div>`;
}

// ---------- Финансирование: кредиты, вложения, кредитная линия ----------
const MONTHS_RU=["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
function monthOpts(cur){const H=+($("f_horizon")?.value||36),y0=+($("f_startYear")?.value||2026);let s="";for(let m=1;m<=H;m++)s+=`<option value="${m}" ${m===+cur?"selected":""}>${m} · ${MONTHS_RU[(m-1)%12]} ${y0+Math.floor((m-1)/12)}</option>`;return s;}
const numIn=(k,v,ph="")=>`<input type="text" inputmode="decimal" data-fk="${k}" value="${v==null?"":Number(v).toLocaleString("ru-RU")}" placeholder="${ph}">`;
function renderFin(){
 const el=$("finEd");if(!el)return;const L=FIN.line;
 el.innerHTML=`<div class="fin"><div class="fh"><b>Инвестиции</b>${qi("invest")}</div>
 ${FIN.investments.map((x,i)=>`<div class="frow" data-inv="${i}"><div style="grid-column:1/-1"><label>Что покупаем</label><input type="text" data-fk="name" value="${esc(x.name||"")}" placeholder="Оборудование, ремонт…"></div><div><label>Месяц оплаты</label><select data-fk="month">${monthOpts(x.month)}</select></div><div><label>Сумма, ₽</label>${numIn("amount",x.amount)}</div><div><label>Срок службы, мес. ${qi("amort")}</label>${numIn("lifeMonths",x.lifeMonths,"0 — не амортиз.")}</div><button class="x xw" data-rm="inv:${i}" title="Удалить">✕ удалить</button></div>`).join("")||'<div class="small">Инвестиций нет.</div>'}
 <button class="add" data-fin="addInv">+ инвестиция</button>
 <div class="fh" style="margin-top:12px"><b>Кредиты</b>${qi("annuity")}</div>
 ${FIN.loans.map((l,i)=>`<div class="frow" data-loan="${i}"><div><label>Месяц выдачи</label><select data-fk="month">${monthOpts(l.month)}</select></div><div><label>Сумма, ₽</label>${numIn("amount",l.amount)}</div><div><label>Ставка, %</label>${numIn("ratePct",l.ratePct)}</div><div><label>Срок, мес.</label>${numIn("termMonths",l.termMonths)}</div><div><label>Платёж</label><select data-fk="type"><option value="ANN" ${l.type!=="DIFF"?"selected":""}>аннуитет</option><option value="DIFF" ${l.type==="DIFF"?"selected":""}>дифференц.</option></select></div><div><label>Отсрочка тела, мес. ${qi("grace")}</label>${numIn("graceMonths",l.graceMonths||0)}</div><button class="x xw" data-rm="loan:${i}" title="Удалить кредит">✕ удалить</button></div>`).join("")||'<div class="small">Кредитов нет.</div>'}
 <button class="add" data-fin="addLoan">+ кредит</button>
 <div class="fh" style="margin-top:12px"><b>Вложения собственника</b>${qi("injection")}</div>
 ${FIN.injections.map((x,i)=>`<div class="frow two" data-inj="${i}"><div><label>Месяц${x.auto?' <span class="tagA">подобрано</span>':""}</label><select data-fk="month">${monthOpts(x.month)}</select></div><div><label>Сумма, ₽</label>${numIn("amount",x.amount)}</div><button class="x xw" data-rm="inj:${i}" title="Удалить вложение">✕ удалить</button></div>`).join("")||'<div class="small">Дополнительных вложений нет (стартовые — в поле выше).</div>'}
 <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="add" data-fin="addInj">+ вложение</button><button class="add" data-fin="suggest">Подобрать вложения под разрывы</button>${FIN.injections.some(x=>x.auto)?'<button class="add" data-fin="clearAuto">Убрать подобранные</button>':""}</div>
 <div class="fh" style="margin-top:12px"><label class="chk" style="margin:0"><input type="checkbox" data-fk="lineOn" ${L.on?"checked":""}> <b>Кредитная линия (овердрафт)</b></label>${qi("creditLine")}</div>
 <div class="frow three" data-line="1"><div><label>Лимит, ₽</label>${numIn("limit",L.limit)}</div><div><label>Ставка, %</label>${numIn("ratePct",L.ratePct)}</div><div><label>Неснижаемый остаток, ₽ ${qi("reserve")}</label>${numIn("reserve",L.reserve)}</div></div>
 <div class="small">Линия сама берёт деньги, когда остаток падает ниже неснижаемого, и гасит долг из излишка. Неснижаемый остаток учитывается и при подборе вложений.</div></div>`;
}
function finChanged(rerender){if(rerender)renderFin();calc();scheduleSave();}
$("form").addEventListener("change",e=>{const t=e.target,ed=t.closest("#finEd");if(!ed)return;
 const k=t.dataset.fk,lo=t.closest("[data-loan]"),ij=t.closest("[data-inj]"),li=t.closest("[data-line]"),iv=t.closest("[data-inv]");
 const val=k==="name"?t.value:k==="type"?t.value:k==="lineOn"?t.checked:k==="month"?+t.value:(v=>v==null||isNaN(v)?0:Math.max(0,v))(parse(t.value));
 if(iv)FIN.investments[+iv.dataset.inv][k]=val;else if(lo)FIN.loans[+lo.dataset.loan][k]=val;else if(ij){FIN.injections[+ij.dataset.inj][k]=val;delete FIN.injections[+ij.dataset.inj].auto;}else if(k==="lineOn")FIN.line.on=val;else if(li)FIN.line[k]=val;
 finChanged(k==="lineOn"||!!ij);});
$("form").addEventListener("click",e=>{const t=e.target;if(!t.closest("#finEd"))return;
 if(t.dataset.qi){showG(t.dataset.qi);return;}
 const a=t.dataset.fin,rm=t.dataset.rm;
 if(a==="addInv")FIN.investments.push({name:"",month:1,amount:500000,lifeMonths:60});
 else if(a==="addLoan")FIN.loans.push({month:1,amount:1000000,ratePct:22,termMonths:24,type:"ANN",graceMonths:0});
 else if(a==="addInj")FIN.injections.push({month:1,amount:100000});
 else if(a==="clearAuto")FIN.injections=FIN.injections.filter(x=>!x.auto);
 else if(a==="suggest"){const before=FIN.injections.length;FIN.injections=F.suggestInjections({...inp,injections:FIN.injections.filter(x=>!x.auto)},DEFS,EFF(),window._id,FIN.line.reserve||0);
   if(!FIN.injections.some(x=>x.auto))status("Разрывов нет — вложения не нужны.");}
 else if(rm){const[kind,i]=rm.split(":");(kind==="loan"?FIN.loans:kind==="inv"?FIN.investments:FIN.injections).splice(+i,1);}
 else return;
 finChanged(true);});

// ---------- Продукты ----------
function renderProd(){
 const el=$("prodEd");if(!el)return;const P=FIN.products;
 const tot=P.reduce((s,p)=>s+p.price*p.volume,0),mar=P.reduce((s,p)=>s+p.price*p.volume*(1-p.varCostPct/100),0);
 el.innerHTML=`<div class="fin"><div class="fh"><b>Продукты и услуги</b>${qi("products")}</div>
 ${P.map((x,i)=>{const r=x.price*x.volume,mg=r*(1-x.varCostPct/100);return`<div class="frow" data-prod="${i}"><div style="grid-column:1/-1"><label>Название</label><input type="text" data-fk="name" value="${esc(x.name||"")}" placeholder="Продукт или услуга"></div><div><label>Цена, ₽</label>${numIn("price",x.price)}</div><div><label>Продаж в месяц</label>${numIn("volume",x.volume)}</div><div><label>Переменные затраты, % ${qi("varC")}</label>${numIn("varCostPct",x.varCostPct)}</div><div class="small" style="grid-column:1/-1">Выручка ${fmtR(r)}/мес · маржа ${fmtR(mg)} (${r?Math.round(mg/r*100):0}%)${tot?` · ${Math.round(mg/(mar||1)*100)}% всей маржи`:""}</div>${P.length>1?`<button class="x xw" data-rmp="${i}" title="Удалить">✕ удалить</button>`:""}</div>`;}).join("")}
 <button class="add" data-padd="1">+ продукт</button>
 <div class="small" style="margin-top:4px">Итого на полной мощности: выручка ${fmtR(tot)}/мес, средняя доля маржи ${tot?Math.round(mar/tot*100):0}%. Рост, сезонность и выход на мощность ниже применяются ко всем продуктам.</div></div>`;
}
$("form").addEventListener("change",e=>{const t=e.target,row=t.closest("[data-prod]");if(!row)return;const k=t.dataset.fk,x=FIN.products[+row.dataset.prod];
 x[k]=k==="name"?t.value:(v=>v==null||isNaN(v)?0:Math.max(0,v))(parse(t.value));renderProd();calc();scheduleSave();});
$("form").addEventListener("click",e=>{const t=e.target;if(!t.closest("#prodEd"))return;
 if(t.dataset.qi){showG(t.dataset.qi);return;}
 if(t.dataset.padd)FIN.products.push({name:"",price:1000,volume:100,varCostPct:30});else if(t.dataset.rmp!=null)FIN.products.splice(+t.dataset.rmp,1);else return;
 renderProd();calc();scheduleSave();});

// ---------- Справочник ----------
const qi=k=>GLOSSARY[k]?`<button class="qi" data-qi="${k}" title="Что это?" aria-label="Что это?">?</button>`:"";
function gBody(k){const g=GLOSSARY[k];return`${g.s?`<p>${esc(g.s)}</p>`:""}${g.f?`<p><b>Как считается.</b> ${esc(g.f)}</p>`:""}${g.i?`<p><b>Как читать.</b> ${esc(g.i)}</p>`:""}${g.c?`<p class="small"><b>Осторожно.</b> ${esc(g.c)}</p>`:""}`;}
function showG(k){const g=GLOSSARY[k];if(!g)return;sheet(`<h3>${esc(g.t)}</h3>${gBody(k)}<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn" id="gAll">Весь справочник</button><button class="btn pri" id="gC">Понятно</button></div>`);
 $("gC").onclick=closeSheet;$("gAll").onclick=()=>{closeSheet();tab="gl";render();};}
let gq="";
function vGl(){const groups=[...new Set(Object.values(GLOSSARY).map(g=>g.g))];const q=gq.trim().toLowerCase();
 return`<input type="search" id="gq" placeholder="Поиск: NPV, кассовый разрыв, EBITDA…" value="${esc(gq)}" style="margin-bottom:8px">`+groups.map(gr=>{
  const items=Object.entries(GLOSSARY).filter(([k,g])=>g.g===gr&&(!q||(g.t+" "+g.s+" "+g.f).toLowerCase().includes(q)));if(!items.length)return"";
  return`<h2 style="margin:12px 0 4px">${esc(gr)}</h2>`+items.map(([k,g])=>`<details class="gl"><summary>${esc(g.t)}</summary>${gBody(k)}</details>`).join("");}).join("")+
  `<div class="small" style="margin-top:10px">Нормативы — ориентиры, а не требования закона: у банков, инвесторов и отраслей свои пороги.</div>`;}

// ---------- Итоги ----------
function vSum(R){
 const k=R.kpi,w=[];let actions="";
 if(k.cashGapMonth){w.push(`Кассовый разрыв в ${k.cashGapMonth}-м месяце: денег на счёте не хватает (минимум ${fmtR(k.cashMin)}).`);
  actions=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 4px"><button class="btn" data-act="suggest">Подобрать вложения собственника</button>${FIN.line.on?"":'<button class="btn" data-act="line">Включить кредитную линию</button>'}${qi("cashGap")}</div>`;}
 if(FIN.line.on&&k.lineBalEnd>0.5)w.push(`На конец горизонта долг по кредитной линии ${fmtR(k.lineBalEnd)} не погашен.`);
 if(k.dscrMin!=null&&k.dscrMin<1)w.push(`DSCR ниже 1 (минимум ${k.dscrMin.toLocaleString("ru-RU",{maximumFractionDigits:2})}): в каком-то году заработанного не хватает на платежи по кредитам.`);
 if(k.irrMultiple)w.push("Поток меняет знак несколько раз — IRR может быть не единственной, ориентируйтесь на NPV.");
 if(k.npv<0)w.push("NPV отрицательный: при выбранной ставке дисконтирования проект не окупает вложения.");
 const card=(v,l,g,cls="")=>`<div class="k ${cls}"><b>${v}</b><span>${l} ${qi(g)}</span></div>`;
 const pp=x=>x==null?"не окупается":x===0?"сразу":x+" мес.";
 const pct=x=>x==null?"—":x.toLocaleString("ru-RU",{maximumFractionDigits:1})+" %";
 return(w.length?`<div class="warn" style="margin-bottom:4px">${w.map(esc).join("<br>")}</div>`:"")+actions+
 `<div class="kpis">${card(fmtM(k.npv),"NPV","npv",k.npv>=0?"good":"badv")}${card(k.irrYear==null?"—":k.irrYear>1000?"> 1000 %":pct(k.irrYear),"IRR, годовых","irr")}${card(pp(k.pp),"Срок окупаемости","pp")}${card(pp(k.dpp),"Дисконт. окупаемость","dpp")}
 ${card(k.pi==null?"—":k.pi.toLocaleString("ru-RU",{maximumFractionDigits:2}),"Индекс доходности PI","pi")}${card(fmtM(k.maxNeed),"Макс. потребность в деньгах","maxNeed")}${card(k.beRevMonth?fmtM(k.beRevMonth):"—","Точка безубыточности, выручка/мес","be")}${card(pct(k.safety),"Запас фин. прочности","safety",k.safety!=null&&k.safety<0?"badv":"")}
 ${card(k.cashGapMonth?k.cashGapMonth+"-й мес.":"нет","Кассовый разрыв","cashGap",k.cashGapMonth?"badv":"good")}${card(fmtM(k.cashMin),"Мин. остаток на счёте","reserve")}${card(k.dscrMin==null?"—":k.dscrMin.toLocaleString("ru-RU",{maximumFractionDigits:2}),"Мин. DSCR","dscr",k.dscrMin!=null&&k.dscrMin<1?"badv":"")}${card(fmtM(k.interestTotal),"Проценты за горизонт","annuity")}
 ${card(fmtM(k.totalTaxes),"Налоги и взносы","burden")}${card(fmtM(k.netTotal),"Чистая прибыль","net")}${card(fmtM(k.investTotal),"Инвестиции за горизонт","invest")}${k.terminalValue?card(fmtM(k.terminalValue),"Остаточная стоимость в NPV","terminal"):""}${card(fmtM(k.injectionsTotal),"Вложения собственника","injection")}${card(FIN.line.on?fmtM(k.lineMax):"выкл.","Макс. долг по линии","creditLine")}</div>`+
 chart(R)+`<div class="small">Синяя линия — накопленный поток проекта (без финансирования): где пересекает ноль — окупаемость. Зелёная — остаток денег на счёте с учётом вложений и кредитов: ниже нуля — кассовый разрыв.</div>`;
}

// ---------- Таблицы: широкий экран — все периоды; телефон — один период, две колонки ----------
let pnlPer=0,cfPer=0,cfMonthly=false;
function unitsBtn(){return`<button class="btn sm" data-units="1">${units()==="K"?"тыс. ₽":"₽"} ⇄</button>`;}
function perChips(list,cur,key){return`<div class="chips">${list.map((l,i)=>`<button data-per="${key}:${i}" class="${i===cur?"on":""}">${esc(l)}</button>`).join("")}</div>`;}
function table(title,cols,rows){ // cols: [{l, get(row)}], rows: [{n, g, cls, f:(col)=>value, pct}]
 const cell=(v,pct)=>{if(v==null)return"<td>—</td>";const s=pct?v.toLocaleString("ru-RU",{maximumFractionDigits:2}):fmtU(v);return`<td class="${v<-0.5&&!pct?"neg":""}">${s}</td>`;};
 return`<div class="tw"><table class="rep"><tr><th>${title}</th>${cols.map(c=>`<th>${esc(c.l)}</th>`).join("")}</tr>`+rows.map(r=>`<tr class="${r.cls||""}"><td>${esc(r.n)} ${qi(r.g)}</td>${cols.map(c=>cell(r.f(c),r.pct)).join("")}</tr>`).join("")+`</table></div>`;
}
function vPnl(R){
 const P=R.pnl,s=(k,sg=1)=>c=>c.all?P.reduce((a,p)=>a+sg*p[k],0):sg*c.p[k];
 const rows=[{n:"Выручка",g:"rev",f:s("rev")},{n:"НДС к уплате",f:s("vat",-1)},{n:"Выручка без НДС",g:"netRev",cls:"sub",f:s("netRev")},{n:"Переменные затраты",g:"varC",f:s("varC",-1)},{n:"Маржинальный доход",g:"margin",cls:"sub",f:s("margin")},{n:"Постоянные расходы",g:"fixed",f:s("fixed",-1)},{n:"Зарплата",f:s("sal",-1)},{n:"Взносы за работников",f:s("pay",-1)},{n:"Взносы ИП за себя",f:s("ip",-1)},{n:"EBITDA",g:"ebitda",cls:"sub",f:s("ebitda")},{n:"Амортизация",g:"amort",f:s("amort",-1)},{n:"EBIT",g:"ebit",cls:"sub",f:s("ebit")},{n:"Проценты по кредитам",f:s("interest",-1)},{n:"Прибыль до налога",g:"ebt",cls:"sub",f:s("ebt")},{n:"Налог режима",f:s("tax",-1)},{n:"Чистая прибыль",g:"net",cls:"tot",f:s("net")},
  {n:"Рентабельность продаж, %",g:"ros",pct:1,f:c=>c.all?(()=>{const nr=P.reduce((a,p)=>a+p.netRev,0);return nr?P.reduce((a,p)=>a+p.net,0)/nr*100:null;})():c.p.ros},
  {n:"Налоговая нагрузка, %",g:"burden",pct:1,f:c=>c.all?null:c.p.burdenPct},{n:"DSCR, раз",g:"dscr",pct:1,f:c=>c.all?null:c.p.dscr}];
 const all=[...P.map(p=>({l:String(p.year),p})),{l:"Итого",all:1}];
 if(pnlPer>=all.length)pnlPer=0;
 const cols=narrow()?[all[pnlPer]]:all;
 const sel=narrow()?all[pnlPer]:all[all.length-1];
 const byP=sel.all?R.kpi.products:sel.p.byP,tm=byP.reduce((a,x)=>a+x.margin,0);
 const ptab=byP.length>1?`<h2 style="margin:14px 0 6px">Маржа по продуктам · ${esc(sel.l)} ${qi("products")}</h2><div class="tw"><table class="pt"><tr><th>Продукт</th><th>Маржа, ${units()==="K"?"тыс.":"₽"}</th><th>%</th><th>Доля</th></tr>${[...byP].sort((a,b)=>b.margin-a.margin).map(x=>`<tr><td>${esc(x.name)}</td><td class="${x.margin<0?"neg":""}">${fmtU(x.margin)}</td><td>${x.rev?Math.round(x.margin/x.rev*100):0}</td><td>${tm?Math.round(x.margin/tm*100):0}%</td></tr>`).join("")}</table></div>`:"";
 return`<div class="tbar">${narrow()?perChips(all.map(c=>c.l),pnlPer,"pnl"):""}${unitsBtn()}${qi("pnlRep")}</div>`+table(`БДР, ${units()==="K"?"тыс. ₽":"₽"}`,cols,rows)+ptab+
 `<div class="small" style="margin-top:6px">Метод начисления. НДС вычтен из выручки как «к уплате» (упрощение). Взносы ИП показаны расходом, потому что для ИП это затраты бизнеса.</div>`;
}
function vCf(R){
 const M=R.months,years=[...new Set(M.map(m=>m.yi))];
 let all=cfMonthly?M.map(m=>({l:`${MONTHS_RU[m.mi]} ${String(m.year).slice(2)}`,ms:[m]})):years.map(yi=>({l:String(M.find(m=>m.yi===yi).year),ms:M.filter(m=>m.yi===yi)}));
 if(cfPer>=all.length)cfPer=0;
 const s=f=>c=>c.ms.reduce((a,m)=>a+f(m),0),last=f=>c=>f(c.ms[c.ms.length-1]);
 const rows=[{n:"Поступления от клиентов",f:s(m=>m.cashIn)},{n:"Переменные затраты",f:s(m=>-m.varCost)},{n:"Постоянные расходы",f:s(m=>-m.fixed)},{n:"Зарплата",f:s(m=>-m.salaries)},{n:"Взносы за работников",f:s(m=>-m.payrollPay)},{n:"Налог режима",f:s(m=>-m.taxPay)},{n:"НДС",f:s(m=>-m.vatPay)},{n:"Взносы ИП за себя",f:s(m=>-m.ipPay)},{n:"Операционный поток",g:"opCF",cls:"sub",f:s(m=>m.opCF)},
  {n:"Инвестиции",g:"invCF",cls:"sub",f:s(m=>m.invCF)},
  {n:"Вложения собственника",g:"injection",f:s(m=>m.injection)},{n:"Кредиты получены",f:s(m=>m.loanDraw)},{n:"Погашение кредитов",f:s(m=>-m.principal)},{n:"Проценты по кредитам",f:s(m=>-m.interest)},
  ...(FIN.line.on?[{n:"Линия: получено",g:"creditLine",f:s(m=>m.lineDraw)},{n:"Линия: погашено",f:s(m=>-m.lineRepay)},{n:"Линия: проценты",f:s(m=>-m.lineInt)}]:[]),
  {n:"Финансовый поток",g:"finCF",cls:"sub",f:s(m=>m.finCF)},{n:"Остаток на конец",g:"cashGap",cls:"tot",f:last(m=>m.cashEnd)},
  {n:"Долг по кредитам на конец",f:last(m=>m.loanBal)},...(FIN.line.on?[{n:"Долг по линии на конец",f:last(m=>m.lineBal)}]:[])];
 const cols=narrow()?[all[cfPer]]:all;
 const per=narrow()?(cfMonthly?`<select data-per-sel="cf" style="width:auto">${all.map((c,i)=>`<option value="${i}" ${i===cfPer?"selected":""}>${c.l}</option>`).join("")}</select>`:perChips(all.map(c=>c.l),cfPer,"cf")):"";
 return`<div class="tbar">${per}<button class="btn sm" id="cfT">${cfMonthly?"По годам":"По месяцам"}</button>${unitsBtn()}${qi("cfRep")}</div>`+table(`БДДС, ${units()==="K"?"тыс. ₽":"₽"}`,cols,rows)+
 `<div class="small" style="margin-top:6px">Кассовый метод: деньги — в месяце фактической оплаты, налоги — в месяцах уплаты.</div>`;
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
function setFormRaw(o){for(const[,fs]of FIELDS)for(const[k,,tp]of fs){const el=$("f_"+k);if(!(k in o)){if(tp==="opt")el.value=opts0(k);else if(k==="terminalPct")el.value="100";continue;}if(tp==="chk")el.checked=!!o[k];else el.value=o[k];}calc();}
function snapshot(){if(!CUR)return;CUR.name=$("projName").value.trim()||"Без названия";CUR.form=getFormRaw();CUR.factors=JSON.parse(JSON.stringify(FACTORS));CUR.tows={...TOWS};CUR.regime=regime;CUR.overrides=OVR;CUR.fin=JSON.parse(JSON.stringify(FIN));}
function scheduleSave(){if(!CUR)return;clearTimeout(saveT);status("Изменено…");saveT=setTimeout(saveNow,700);}
function saveNow(){if(!CUR)return;snapshot();try{STORE.save(CUR);lastSaved=new Date();}catch(e){status("Не удалось сохранить: "+(e.message||e)+". Сохраните через «Экспорт».",true);return;}refreshList();status();}
function status(txt,bad){const el=$("pStatus");const mem=STORE.kind==="memory"?" Хранилище браузера недоступно — проект живёт до закрытия страницы, сохраняйте через «Экспорт».":"";
 el.style.color=bad||mem?"var(--warn)":"";el.textContent=(txt||(lastSaved?"Сохранено в "+lastSaved.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})+" · автосохранение":""))+mem;}
function refreshList(){const L=STORE.list();$("projSel").innerHTML=L.map(x=>`<option value="${x.id}" ${CUR&&x.id===CUR.id?"selected":""}>${esc(x.name)}</option>`).join("")||"<option>—</option>";}
function openProject(p){CUR=p;$("projName").value=p.name;FACTORS=p.factors||[];fid=FACTORS.reduce((m,f)=>Math.max(m,f.id||0),0)+1;TOWS=Object.assign({SO:"",ST:"",WO:"",WT:""},p.tows);regime=p.regime||"AUTO";OVR=p.overrides||{};
 FIN=Object.assign(FIN0(),p.fin?JSON.parse(JSON.stringify(p.fin)):{});
 if(!p.fin&&p.form&&parse(p.form.loanAmount)>0)FIN.loans=[{month:1,amount:parse(p.form.loanAmount),ratePct:parse(p.form.loanRate)||0,termMonths:parse(p.form.loanTerm)||12,type:"ANN",graceMonths:0}]; // проекты v0.3
 if(!p.fin||!Array.isArray(p.fin.investments)){const c=p.form&&parse(p.form.capex);FIN.investments=c>0?[{name:"Стартовые инвестиции",month:1,amount:c,lifeMonths:parse(p.form.lifeMonths)||0}]:[];} // проекты v0.3–v0.4
 if(!p.fin||!Array.isArray(p.fin.products)||!p.fin.products.length){const f=p.form||{};FIN.products=[{name:"Основной продукт",price:parse(f.price)||0,volume:parse(f.volume)||0,varCostPct:parse(f.varCostPct)||0}];} // проекты до v0.6
 renderFin();renderProd();
 $("m0msg").textContent=Object.keys(OVR).length?"Правок параметров в проекте: "+Object.keys(OVR).length:"";setFormRaw(p.form);refreshList();status();}
function newFromTemplate(name){clearTimeout(saveT);loadFactors(name);regime="AUTO";OVR={};FIN=FIN0();setForm(PRESETS[name]);const p=PS.makeProject(name,{form:getFormRaw(),factors:FACTORS,tows:TOWS});CUR=p;$("projName").value=p.name;saveNow();}
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
$("form").addEventListener("change",e=>{if(e.target.id==="f_horizon"||e.target.id==="f_startYear")renderFin();});
$("form").addEventListener("input",scheduleSave);$("form").addEventListener("change",scheduleSave);
$("out").addEventListener("input",scheduleSave);$("out").addEventListener("change",scheduleSave);
$("out").addEventListener("click",e=>{if(e.target.dataset.add||e.target.dataset.del)scheduleSave();});

$("tabs").onclick=e=>{const t=e.target.dataset.t;if(t){tab=t;render();}};
$("out").addEventListener("click",e=>{const t=e.target;
 if(t.id==="cfT"){cfMonthly=!cfMonthly;cfPer=0;render();return;}
 if(t.dataset.units){UNITS=units()==="K"?"R":"K";render();return;}
 if(t.dataset.per){const[k,i]=t.dataset.per.split(":");if(k==="pnl")pnlPer=+i;else cfPer=+i;render();return;}
 if(t.dataset.qi){showG(t.dataset.qi);return;}
 if(t.dataset.act==="suggest"){FIN.injections=F.suggestInjections({...inp,injections:FIN.injections.filter(x=>!x.auto)},DEFS,EFF(),window._id,FIN.line.reserve||0);finChanged(true);document.querySelector("#finEd")?.closest("details")?.setAttribute("open","");return;}
 if(t.dataset.act==="line"){FIN.line.on=true;finChanged(true);document.querySelector("#finEd")?.closest("details")?.setAttribute("open","");return;}});
$("out").addEventListener("change",e=>{if(e.target.dataset.perSel){cfPer=+e.target.value;render();}});
$("out").addEventListener("input",e=>{if(e.target.id==="gq"){gq=e.target.value;const pos=e.target.selectionStart;render();const g=$("gq");g.focus();g.setSelectionRange(pos,pos);}});
let rzT=null,wasNarrow=narrow();window.addEventListener("resize",()=>{clearTimeout(rzT);rzT=setTimeout(()=>{if(narrow()!==wasNarrow){wasNarrow=narrow();render();}},200);});
$("regime").onchange=e=>{regime=e.target.value;calc();scheduleSave();};
$("presets").innerHTML=Object.keys(PRESETS).map((n,i)=>`<button data-p="${esc(n)}">${esc(n)}</button>`).join("");
$("presets").onclick=e=>{const n=e.target.dataset.p;if(!n)return;saveNow();newFromTemplate(n);};
$("applyM0").onclick=()=>{try{const j=JSON.parse($("m0json").value);if(j.format!=="biz-calc-params")throw new Error("Это не экспорт из M0.");const o={};let n=0;for(const y of Object.keys(j.years))for(const p of j.years[y]){const s=p.project||p.user;if(s&&typeof s.value==="number"){o[p.code+"@"+y]=s;n++;}}OVR=o;$("m0msg").textContent="Применено правок: "+n;calc();scheduleSave();}catch(e){$("m0msg").textContent=e.message||"Ошибка JSON";}};
$("clearM0").onclick=()=>{OVR={};$("m0json").value="";$("m0msg").textContent="Значения по закону";calc();scheduleSave();};
buildForm();{const L=STORE.list();const p=L.length&&STORE.load(L[0].id);if(p)openProject(p);else newFromTemplate("Кофейня");}
