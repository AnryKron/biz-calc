// Финансовая модель «Бизнес-калькулятор» · v0.1 · помесячно, ИП
// Зависит от TaxEngine (engine.js). Чистые функции, без UI.
(function (root) {
  "use strict";
  const E = typeof module !== "undefined" ? require("./engine.js") : root.TaxEngine;
  const r2 = x => Math.round(x * 100) / 100;
  const sum = a => a.reduce((s, x) => s + x, 0);

  const REGIMES = ["NPD", "PSN", "USN6", "USN15", "AUSN8", "AUSN20", "OSNO"];
  const REGIME_NAMES = { NPD: "НПД", PSN: "ПСН (патент)", USN6: "УСН «Доходы»", USN15: "УСН «Доходы − расходы»",
    AUSN8: "АУСН «Доходы»", AUSN20: "АУСН «Доходы − расходы»", OSNO: "ОСНО" };

  function calcRegime(P, id, d) {
    switch (id) {
      case "NPD": return E.calcNPD(P, d);
      case "PSN": return E.calcPSN(P, d);
      case "USN6": return E.calcUSN(P, d, "INCOME");
      case "USN15": return E.calcUSN(P, d, "PROFIT");
      case "AUSN8": return E.calcAUSN(P, d, "INCOME");
      case "AUSN20": return E.calcAUSN(P, d, "PROFIT");
      case "OSNO": return E.calcOSNO(P, d);
    }
    throw new Error("Неизвестный режим " + id);
  }

  // Аннуитет: платёж, проценты и тело по месяцам
  function loanSchedule(amount, ratePct, term, H) {
    const i = ratePct / 100 / 12, rows = [];
    const pay = !amount ? 0 : i === 0 ? amount / term : amount * i / (1 - Math.pow(1 + i, -term));
    let bal = amount;
    for (let t = 0; t < H; t++) {
      if (t >= term || bal <= 0.005) { rows.push({ interest: 0, principal: 0, balance: 0 }); continue; }
      const interest = bal * i, principal = Math.min(pay - interest, bal);
      bal -= principal;
      rows.push({ interest, principal, balance: bal });
    }
    return { pay, rows };
  }

  // Кредиты на горизонте: [{month (1..H), amount, ratePct, termMonths, type:'ANN'|'DIFF', graceMonths}]
  // Выдача — в месяце month; платежи — с того же месяца (как в loanSchedule); в отсрочку платятся только проценты.
  function normLoans(inp) {
    if (Array.isArray(inp.loans)) return inp.loans.filter(l => l && l.amount > 0);
    return inp.loanAmount > 0 ? [{ month: 1, amount: inp.loanAmount, ratePct: inp.loanRate || 0, termMonths: inp.loanTerm || 1, type: "ANN", graceMonths: 0 }] : [];
  }
  function buildLoans(inp, H) {
    const rows = Array.from({ length: H }, () => ({ interest: 0, principal: 0, draw: 0, balance: 0 }));
    const pays = [];
    for (const l of normLoans(inp)) {
      const s = Math.max(0, Math.min(H - 1, (l.month || 1) - 1)), n = Math.max(1, Math.round(l.termMonths || 1));
      const g = Math.min(n - 1, Math.max(0, Math.round(l.graceMonths || 0))), i = (l.ratePct || 0) / 100 / 12;
      let bal = l.amount, pay = 0;
      rows[s].draw += l.amount;
      for (let k = 0; k < n && s + k < H; k++) {
        const t = s + k, interest = bal * i;
        let principal = 0;
        if (k >= g) {
          const left = n - k;
          if (l.type === "DIFF") principal = l.amount / (n - g);
          else { if (k === g) pay = i === 0 ? bal / left : bal * i / (1 - Math.pow(1 + i, -left)); principal = pay - interest; }
          principal = Math.min(principal, bal);
        }
        bal -= principal;
        rows[t].interest += interest; rows[t].principal += principal;
      }
      pays.push({ month: s + 1, amount: l.amount, pay: l.type === "DIFF" ? null : pay });
    }
    let b = 0; for (const r of rows) { b += r.draw - r.principal; r.balance = b; }
    return { rows, pays, pay: pays.length === 1 ? pays[0].pay : null };
  }

  // ---------- Основной расчёт ----------
  // inp: см. DEFAULT_INPUT на странице. defs/overrides — справочник M0.
  // Кредитная линия меняет проценты → расходы → налоги → остаток денег. Считаем итерациями до сходимости.
  function runModel(inp, defs, overrides, regimeId) {
    let li = null, res = null;
    for (let pass = 0; pass < 6; pass++) {
      res = core(inp, defs, overrides, regimeId, li);
      const n = res._lineIntY;
      if (li && n.every((v, k) => Math.abs(v - li[k]) < 1)) break;
      if (!li && n.every(v => v === 0)) break;
      li = n;
    }
    return res;
  }

  function core(inp, defs, overrides, regimeId, lineIntY) {
    const H = inp.horizon, Y = Math.ceil(H / 12);
    const lag = Math.round((inp.delayDays || 0) / 30);
    const season = inp.season && inp.season.length === 12 ? inp.season : Array(12).fill(1);
    const g = (inp.growthPct || 0) / 100;

    // 1. Начисления по месяцам
    const M = [];
    for (let t = 0; t < H; t++) {
      const yi = Math.floor(t / 12), mi = t % 12;
      const ramp = inp.rampMonths && t < inp.rampMonths ? (0.3 + 0.7 * (t + 1) / inp.rampMonths) : 1; // выход на мощность от 30%
      const vol = inp.volume * Math.pow(1 + g, t) * season[mi] * ramp;
      const rev = inp.price * vol;
      const salary = (inp.salary || 0) * Math.pow(1 + (inp.salaryIndexPct || 0) / 100, yi);
      M.push({ t, yi, mi, year: inp.startYear + yi, vol, rev,
        varCost: rev * (inp.varCostPct || 0) / 100, fixed: (inp.fixed || 0) * Math.pow(1 + (inp.fixedIndexPct || 0) / 100, yi),
        salaries: (inp.staff || 0) * salary, salary,
        amort: inp.capex && inp.lifeMonths && t < inp.lifeMonths ? inp.capex / inp.lifeMonths : 0,
        cashIn: 0, payroll: 0, taxPay: 0, vatPay: 0, ipPay: 0, payrollPay: 0, tax: 0, vat: 0, ipContrib: 0 });
    }
    for (let t = 0; t < H; t++) if (t + lag < H) M[t + lag].cashIn += M[t].rev; // поступления с отсрочкой
    const unpaidAR = sum(M.slice(H - lag).map(m => m.rev)); // дебиторка на конец горизонта
    const loan = buildLoans(inp, H);

    // 2. Налоги по календарным годам (кассовый метод: доход = поступления)
    const years = [], tail = { tax: 0, vat: 0, ip: 0, payroll: 0 };
    let prevIncome = inp.prevIncome || 0, unavailable = null;
    const due = (t, key, amount) => { if (t < H) M[t][key] += amount; else tail[key === "taxPay" ? "tax" : key === "vatPay" ? "vat" : key === "ipPay" ? "ip" : "payroll"] += amount; };
    for (let yi = 0; yi < Y; yi++) {
      const ms = M.filter(m => m.yi === yi), year = inp.startYear + yi;
      const P = E.makeParams(defs, year, overrides);
      const income = sum(ms.map(m => m.cashIn));
      const capexY = yi === 0 ? (inp.capex || 0) : 0;
      const interestY = sum(ms.map(m => loan.rows[m.t].interest)) + (lineIntY ? lineIntY[yi] || 0 : 0);
      const opEx = sum(ms.map(m => m.varCost + m.fixed)) + interestY;
      // расходы для налога: на УСН/АУСН «Д−Р» ОС списываются при оплате (упрощённо), на ОСНО — амортизация
      const expTax = regimeId === "OSNO" ? opEx + sum(ms.map(m => m.amort)) : opEx + (["USN15", "AUSN20"].includes(regimeId) ? capexY : 0);
      const d = { income, expenses: expTax, prevIncome, physShare: (inp.physSharePct ?? 100) / 100, vatExpShare: (inp.vatExpSharePct || 0) / 100,
        staff: inp.staff || 0, salary: ms.length ? sum(ms.map(m => m.salary)) / ms.length : 0, msp: !!inp.msp, mspManufacturing: !!inp.mspManufacturing,
        resale: !!inp.resale, ausnRegion: inp.ausnRegion !== false, psnPotential: inp.psnPotential || 0 };
      if (inp.usnRegionalIncome != null) d.usnRegionalIncome = inp.usnRegionalIncome;
      if (inp.usnRegionalProfit != null) d.usnRegionalProfit = inp.usnRegionalProfit;
      const r = calcRegime(P, regimeId, d);
      const why = [...r.why];
      if (regimeId.startsWith("AUSN") && year > 2027) why.push("эксперимент АУСН — до 31.12.2027 (ч. 2 ст. 1 17-ФЗ)");
      if (regimeId === "NPD" && year > 2028) why.push("эксперимент НПД — до 31.12.2028 (ч. 2 ст. 1 422-ФЗ)");
      if (why.length && !unavailable) unavailable = `${year}: ${why.join("; ")}`;
      const fixedIP = ["NPD", "AUSN8", "AUSN20"].includes(regimeId) ? 0 : Math.min(P("ins.ip_fixed"), r.ipContrib);
      const onePct = r.ipContrib - fixedIP;
      years.push({ year, income, opEx, r, prevIncome });

      // доли кварталов/месяцев по поступлениям
      const share = m => income ? m.cashIn / income : 1 / ms.length;
      const base = yi * 12; // t первого месяца года
      // НДС и налог — уплата по срокам
      for (const m of ms) {
        m.tax = r.tax * share(m); m.vat = r.vat * share(m); m.ipContrib = r.ipContrib * share(m);
        m.payroll = r.payroll / ms.length;
        due(m.t + 1, "payrollPay", m.payroll); // взносы за работников — до 28-го следующего месяца
      }
      for (let q = 0; q < 4; q++) {
        const qm = ms.filter(m => Math.floor(m.mi / 3) === q); if (!qm.length) continue;
        const qTax = sum(qm.map(m => m.tax)), qVat = sum(qm.map(m => m.vat));
        // НДС: тремя равными частями в три месяца после квартала (ст. 174 НК — не сверял)
        for (let k = 1; k <= 3; k++) due(base + q * 3 + 2 + k, "vatPay", qVat / 3);
        if (["USN6", "USN15", "OSNO"].includes(regimeId)) {
          // авансы: апрель, июль, октябрь; за год — апрель следующего года (ИП)
          due(q < 3 ? base + q * 3 + 3 : base + 12 + 3, "taxPay", qTax);
        }
      }
      if (["NPD", "AUSN8", "AUSN20"].includes(regimeId)) for (const m of ms) due(m.t + 1, "taxPay", m.tax); // ежемесячно
      if (regimeId === "PSN") due(base + 11, "taxPay", r.tax); // патент на год — до конца срока (упрощённо: декабрь)
      due(base + 11, "ipPay", fixedIP);      // фиксированные — до 28 декабря
      due(base + 12 + 6, "ipPay", onePct);   // 1% — до 1 июля следующего года
      prevIncome = income;
    }
    // хвост платежей за пределами горизонта — в последний месяц (консервативно)
    const L = M[H - 1];
    L.taxPay += tail.tax; L.vatPay += tail.vat; L.ipPay += tail.ip; L.payrollPay += tail.payroll;

    // 3. БДДС
    const inj = Array(H).fill(0);
    inj[0] += inp.ownFunds || 0;
    for (const x of inp.injections || []) if (x && x.amount > 0) inj[Math.max(0, Math.min(H - 1, (x.month || 1) - 1))] += x.amount;
    const line = inp.creditLine || {}, lineOn = !!line.on, lim = line.limit || 0, lr_ = (line.ratePct || 0) / 100 / 12, reserve = line.reserve || 0;
    let cash = 0, cum = 0, cumD = 0, minCum = 0, lb = 0, lineMax = 0;
    const lineIntYNew = Array(Y).fill(0);
    const rm = Math.pow(1 + (inp.discountRatePct || 0) / 100, 1 / 12) - 1;
    for (const m of M) {
      const lr = loan.rows[m.t];
      m.opIn = m.cashIn;
      m.opOut = m.varCost + m.fixed + m.salaries + m.payrollPay + m.taxPay + m.vatPay + m.ipPay;
      m.opCF = m.opIn - m.opOut;
      m.invCF = m.t === 0 ? -(inp.capex || 0) : 0;
      m.injection = inj[m.t]; m.loanDraw = lr.draw; m.interest = lr.interest; m.principal = lr.principal; m.loanBal = lr.balance;
      m.cashStart = cash;
      cash += m.opCF + m.invCF + m.injection + m.loanDraw - m.principal - m.interest;
      // кредитная линия (овердрафт): проценты на остаток долга, выборка до неснижаемого остатка, погашение из излишка
      m.lineInt = lb * lr_; cash -= m.lineInt; lineIntYNew[m.yi] += m.lineInt;
      m.lineDraw = 0; m.lineRepay = 0;
      if (lineOn) {
        if (cash < reserve && lb < lim) { m.lineDraw = Math.min(reserve - cash, lim - lb); lb += m.lineDraw; cash += m.lineDraw; }
        else if (cash > reserve && lb > 0) { m.lineRepay = Math.min(lb, cash - reserve); lb -= m.lineRepay; cash -= m.lineRepay; }
      }
      m.lineBal = lb; lineMax = Math.max(lineMax, lb);
      m.finCF = m.injection + m.loanDraw - m.principal - m.interest - m.lineInt + m.lineDraw - m.lineRepay;
      m.cashEnd = cash;
      m.projectCF = m.opCF + m.invCF; // поток проекта для NPV (без финансирования)
      if (m.t === H - 1) m.projectCF += unpaidAR; // ASSUMPTION: дебиторка на конец горизонта будет получена
      cum += m.projectCF; m.cumCF = cum; minCum = Math.min(minCum, cum);
      m.disc = m.projectCF / Math.pow(1 + rm, m.t + 1); cumD += m.disc; m.cumDisc = cumD;
    }

    // 4. Показатели
    const flows = M.map(m => m.projectCF);
    const npv = r2(sum(M.map(m => m.disc)) - 0); // CAPEX в месяце 1, дисконтирование с 1-го месяца
    const irrM = irr(flows);
    let signCh = 0; for (let k = 1; k < flows.length; k++) if (flows[k] * flows[k - 1] < 0) signCh++;
    const pvPos = sum(M.filter(m => m.disc > 0).map(m => m.disc)), pvNeg = -sum(M.filter(m => m.disc < 0).map(m => m.disc));
    const firstPos = arr => { let seenNeg = false; for (const m of M) { if (arr(m) < 0) seenNeg = true; if (seenNeg && arr(m) >= 0) return m.t + 1; } return seenNeg ? null : 0; };
    const gap = M.find(m => m.cashEnd < -0.5);
    // точка безубыточности (1-й год, без налогов): постоянные / доля маржи
    const y1 = M.filter(m => m.yi === 0);
    const fcMonth = sum(y1.map(m => m.fixed + m.salaries + m.payroll)) / y1.length;
    const marginShare = 1 - (inp.varCostPct || 0) / 100;
    const beRev = marginShare > 0 ? fcMonth / marginShare : null;
    const revY1 = sum(y1.map(m => m.rev)) / y1.length;
    const safety = beRev != null && revY1 > 0 ? (revY1 - beRev) / revY1 * 100 : null; // запас финансовой прочности, % (1-й год)

    // 5. БДР по годам
    const pnl = years.map((y, yi) => {
      const ms = M.filter(m => m.yi === yi), rev = sum(ms.map(m => m.rev));
      const vat = y.r.vat * (y.income ? rev / y.income : 1);
      const netRev = rev - vat, varC = sum(ms.map(m => m.varCost)), margin = netRev - varC;
      const fixed = sum(ms.map(m => m.fixed)), sal = sum(ms.map(m => m.salaries)), pay = y.r.payroll, ip = y.r.ipContrib;
      const ebitda = margin - fixed - sal - pay - ip, amort = sum(ms.map(m => m.amort)), ebit = ebitda - amort;
      const interest = sum(ms.map(m => m.interest + m.lineInt)), ebt = ebit - interest, tax = y.r.tax, net = ebt - tax;
      const debtService = sum(ms.map(m => m.interest + m.principal + m.lineInt));
      const dscr = debtService > 0 ? (ebitda - tax) / debtService : null; // покрытие долга: (EBITDA − налог) / платежи по долгу
      return { year: y.year, rev, vat, netRev, varC, margin, fixed, sal, pay, ip, ebitda, amort, ebit, interest, ebt, tax, net,
        ros: netRev ? net / netRev * 100 : 0, dscr, debtService, burden: y.r.burden, burdenPct: y.r.burdenPct, cashIn: y.income };
    });

    return {
      regimeId, regimeName: REGIME_NAMES[regimeId], available: !unavailable, unavailable,
      _lineIntY: lineIntYNew, months: M, pnl, years: years.map(y => ({ year: y.year, income: y.income, tax: y.r.tax, vat: y.r.vat, ip: y.r.ipContrib, payroll: y.r.payroll, lines: y.r.lines })),
      kpi: {
        npv, irrMultiple: signCh > 1, irrYear: irrM == null ? null : (Math.pow(1 + irrM, 12) - 1) * 100,
        pi: pvNeg ? pvPos / pvNeg : null, pp: firstPos(m => m.cumCF), dpp: firstPos(m => m.cumDisc),
        maxNeed: -minCum, cashGapMonth: gap ? gap.t + 1 : null, cashMin: Math.min(...M.map(m => m.cashEnd)),
        beRevMonth: beRev, beUnitsMonth: beRev && inp.price ? beRev / inp.price : null,
        totalTaxes: sum(years.map(y => y.r.tax + y.r.vat + y.r.ipContrib + y.r.payroll)),
        netTotal: sum(pnl.map(p => p.net)), loanPay: loan.pay, loans: loan.pays, unpaidAR, safety,
        injectionsTotal: sum(inj), lineMax, lineBalEnd: lb, interestTotal: sum(M.map(m => m.interest + m.lineInt)),
        dscrMin: pnl.some(p => p.dscr != null) ? Math.min(...pnl.filter(p => p.dscr != null).map(p => p.dscr)) : null
      }
    };
  }

  // IRR месячный: бисекция по NPV(r)=0. Нет смены знака — null.
  function irr(flows) {
    const f = r => flows.reduce((s, c, t) => s + c / Math.pow(1 + r, t + 1), 0);
    if (!(flows.some(x => x < 0) && flows.some(x => x > 0))) return null;
    // ищем первую смену знака на сетке ставок, затем уточняем бисекцией
    // сначала ищем корень от 0 вверх, потом от 0 вниз — берём ближайший к нулю
    const up = [0, 0.005, 0.01, 0.02, 0.03, 0.05, 0.075, 0.1, 0.15, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3, 5];
    const down = [-0.02, -0.05, -0.1, -0.2, -0.5, -0.9];
    const pairs = [];
    for (let j = 0; j < up.length - 1; j++) pairs.push([up[j], up[j + 1]]);
    let prev = 0; for (const x of down) { pairs.push([x, prev]); prev = x; }
    for (const [a0, b0] of pairs) {
      let lo = a0, hi = b0, flo = f(lo), fhi = f(hi);
      if (flo === 0) return lo;
      if (flo * fhi > 0) continue;
      for (let k = 0; k < 200; k++) {
        const mid = (lo + hi) / 2, fm = f(mid);
        if (Math.abs(fm) < 1e-7) return mid;
        if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
      }
      return (lo + hi) / 2;
    }
    return null;
  }

  // Подбор вложений собственника: в каждый месяц, где остаток ниже неснижаемого, добавить недостающее.
  // Вложения не меняют налоги, поэтому жадный подбор даёт минимальные суммы в самые поздние возможные месяцы.
  function suggestInjections(inp, defs, ov, regimeId, reserve = 0) {
    const out = (inp.injections || []).map(x => ({ ...x }));
    for (let k = 0; k < 120; k++) {
      const r = runModel({ ...inp, injections: out, creditLine: { ...(inp.creditLine || {}), on: false } }, defs, ov, regimeId);
      const m = r.months.find(x => x.cashEnd < reserve - 0.5);
      if (!m) break;
      const need = Math.ceil((reserve - m.cashEnd) / 1000) * 1000; // округляем до 1 000 ₽ вверх
      const ex = out.find(x => x.month === m.t + 1 && x.auto);
      if (ex) ex.amount += need; else out.push({ month: m.t + 1, amount: need, auto: true });
    }
    return out.sort((a, b) => a.month - b.month);
  }

  // Сравнение режимов по всему горизонту
  function compareOverHorizon(inp, defs, ov) {
    return REGIMES.map(id => runModel(inp, defs, ov, id))
      .sort((a, b) => (b.available - a.available) || (b.kpi.npv - a.kpi.npv));
  }

  // Чувствительность NPV: ±delta по каждому фактору + порог (множитель, при котором NPV = 0)
  const FACTORS = [["price", "Цена"], ["volume", "Объём продаж"], ["varCostPct", "Переменные затраты, %"],
    ["fixed", "Постоянные расходы"], ["salary", "Зарплата"], ["capex", "Инвестиции (CAPEX)"]];
  function sensitivity(inp, defs, ov, regimeId, delta = 0.2) {
    const npvAt = (k, mult) => runModel({ ...inp, [k]: (inp[k] || 0) * mult }, defs, ov, regimeId).kpi.npv;
    const base = runModel(inp, defs, ov, regimeId).kpi.npv;
    return FACTORS.filter(([k]) => inp[k]).map(([k, name]) => {
      const lo = npvAt(k, 1 - delta), hi = npvAt(k, 1 + delta);
      // порог: множитель в [0; 3], где NPV меняет знак относительно базы
      let threshold = null;
      const f = m => npvAt(k, m);
      const probe = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
      for (let j = 0; j < probe.length - 1; j++) {
        let a = probe[j], b = probe[j + 1], fa = f(a), fb = f(b);
        if (fa === 0) { threshold = a; break; }
        if (fa * fb < 0) { for (let it = 0; it < 30; it++) { const c = (a + b) / 2, fc = f(c); if (fa * fc <= 0) { b = c; fb = fc; } else { a = c; fa = fc; } } threshold = (a + b) / 2; break; }
      }
      return { key: k, name, lo, hi, spread: Math.abs(hi - lo), threshold, base };
    }).sort((a, b) => b.spread - a.spread);
  }

  const api = { runModel, compareOverHorizon, sensitivity, irr, loanSchedule, buildLoans, suggestInjections, REGIMES, REGIME_NAMES, FACTORS };
  if (typeof module !== "undefined") module.exports = api; else root.FinModel = api;
})(this);
