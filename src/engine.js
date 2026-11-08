// Налоговый движок «Бизнес-калькулятор» · v0.1 · только ИП, годовой расчёт
// Чистые функции: вход (параметры + данные проекта) → результат по каждому режиму.
// Нормы указаны у каждого шага. Допущения помечены ASSUMPTION.
(function (root) {
  "use strict";

  const r2 = x => Math.round(x * 100) / 100;
  const pos = x => Math.max(0, x);

  // ---------- Параметры ----------
  // P(code) → число. Источник — справочник M0 (системные значения + правки).
  function makeParams(defs, year, overrides) {
    const i = year >= 2027 ? 1 : 0; // после 2027 — значения 2027 (прогноз)
    const map = {};
    for (const d of defs) {
      let v = d[3 + i];
      if (v == null) v = d[3]; // прогноз: значение 2026
      map[d[0]] = v;
    }
    // правка года Y действует и на последующие годы, пока нет более поздней правки
    const best = {};
    for (const [k, o] of Object.entries(overrides || {})) {
      const [code, y] = k.split("@");
      if (!(code in map) || +y > year) continue;
      if (!best[code] || +y > best[code].y) best[code] = { y: +y, v: o.value };
    }
    for (const [code, b] of Object.entries(best)) map[code] = b.v;
    return code => {
      if (!(code in map)) throw new Error("Нет параметра " + code);
      return map[code];
    };
  }

  // ---------- Общие блоки ----------

  // Взносы ИП «за себя». base1 — база для 1% (своя на каждом режиме).
  // пп. 1–2 п. 1.2 ст. 430 НК РФ
  function ipContrib(P, base1) {
    const fixed = P("ins.ip_fixed");
    const onePct = Math.min(pos(base1 - P("ins.ip_1pct_threshold")) * 0.01, P("ins.ip_1pct_max"));
    return { fixed, onePct: r2(onePct), total: r2(fixed + onePct) };
  }

  // Взносы за работников за год. ст. 425, 427 НК РФ.
  // ASSUMPTION: зарплата одинаковая весь год; травматизм 0,2% (I класс риска, 125-ФЗ — не сверено).
  function payrollContrib(P, d) {
    const n = d.staff || 0, s = d.salary || 0;
    if (!n || !s) return { fot: 0, contrib: 0, injury: 0, total: 0, note: "" };
    const fot = 12 * n * s;
    let perPerson, note;
    if (d.msp) {
      const lim = 1.5 * P("gen.mrot");
      const msp = d.mspManufacturing ? P("ins.msp_manufacturing_rate") : P("ins.msp_rate");
      perPerson = 12 * (P("ins.tariff_base") / 100 * Math.min(s, lim) + msp / 100 * pos(s - lim));
      note = `льгота МСП: 30% до 1,5 МРОТ, ${msp}% сверх`;
    } else {
      const base = P("gen.ins_base_limit"), y = 12 * s;
      perPerson = P("ins.tariff_base") / 100 * Math.min(y, base) + P("ins.tariff_over") / 100 * pos(y - base);
      note = "единый тариф 30% / 15,1%";
    }
    const contrib = n * perPerson;
    const injury = fot * 0.002;
    return { fot, contrib: r2(contrib), injury: r2(injury), total: r2(contrib + injury), note };
  }

  // НДФЛ по прогрессивной шкале. п. 1 ст. 224 НК РФ
  function ndflProgressive(base) {
    const steps = [[2.4e6, 0.13], [5e6, 0.15], [20e6, 0.18], [50e6, 0.20], [Infinity, 0.22]];
    let tax = 0, prev = 0;
    for (const [top, rate] of steps) {
      if (base <= prev) break;
      tax += (Math.min(base, top) - prev) * rate;
      prev = top;
    }
    return r2(tax);
  }

  // НДС на УСН: месяцы, в которых действует обязанность. ст. 145, п. 8 ст. 164 НК РФ.
  // ASSUMPTION: выручка распределена по месяцам равномерно.
  function usnVatMonths(P, d) {
    if (d.prevIncome > P("vat.usn_free_prev_year")) return { from: 1, months: 12, reason: "доход прошлого года выше порога — НДС с января" };
    const thr = P("vat.usn_free_in_year");
    if (d.income <= thr) return { from: 13, months: 0, reason: "доход в пределах порога — освобождение" };
    const m = Math.ceil(thr / (d.income / 12)); // месяц превышения
    const from = m + 1;                          // со следующего месяца (абз. 3 п. 5 ст. 145)
    return { from, months: pos(12 - m), reason: `порог превышен в ${m}-м месяце — НДС с ${from}-го` };
  }

  function usnVatVariants(P, d) {
    const vm = usnVatMonths(P, d);
    const share = vm.months / 12;
    const grossTaxable = d.income * share;
    const exTaxable = d.expenses * share;
    const defl = P("gen.deflator_usn");
    const variants = [{ id: "NONE", label: "без НДС", vat: 0, vatOut: 0, vatIn: 0, incomeNet: d.income, expensesForTax: d.expenses }];
    if (vm.months > 0) {
      const reduced = d.income <= P("vat.usn5_limit_base") * defl ? 5 : 7;
      const out = grossTaxable * reduced / (100 + reduced);
      // при 5/7% входящий НДС не вычитается и остаётся в расходах
      variants[0] = { id: "R" + reduced, label: `НДС ${reduced}% без вычетов`, vat: r2(out), vatOut: r2(out), vatIn: 0,
        incomeNet: d.income - out, expensesForTax: d.expenses };
      const b = P("vat.base");
      const out22 = grossTaxable * b / (100 + b);
      const in22 = exTaxable * (d.vatExpShare || 0) * b / (100 + b);
      variants.push({ id: "R22", label: `НДС ${b}% с вычетами`, vat: r2(out22 - in22), vatOut: r2(out22), vatIn: r2(in22),
        incomeNet: d.income - out22, expensesForTax: d.expenses - in22 });
    }
    return { vm, variants };
  }

  // ---------- Режимы ----------
  function calcNPD(P, d) {
    const why = [];
    if (d.income > P("npd.income_limit")) why.push(`доход выше ${fmtM(P("npd.income_limit"))} (пп. 8 ч. 2 ст. 4 422-ФЗ)`);
    if (d.staff > 0) why.push("есть работники по трудовому договору (пп. 4 ч. 2 ст. 4 422-ФЗ)");
    if (d.resale) why.push("перепродажа товаров запрещена (пп. 2 ч. 2 ст. 4 422-ФЗ)");
    const ph = d.income * (d.physShare ?? 1), bz = d.income - ph;
    const gross = ph * P("npd.rate_individuals") / 100 + bz * P("npd.rate_business") / 100;
    const ded = Math.min(d.npdDeductionLeft ?? P("npd.deduction"), ph * 0.01 + bz * 0.02); // ч. 2 ст. 12 422-ФЗ
    const tax = r2(gross - ded);
    return res("NPD", "НПД (самозанятый)", why, d, { tax, vat: 0, ipContrib: 0, payroll: 0 }, [
      `Налог: ${fmtR(ph)} × ${P("npd.rate_individuals")}% + ${fmtR(bz)} × ${P("npd.rate_business")}% = ${fmtR(gross)}`,
      `Вычет (1% / 2% от базы, не более остатка 10 000 ₽): −${fmtR(ded)}`,
      "Взносы ИП за себя не платятся (ч. 11 ст. 2 422-ФЗ)"]);
  }

  function calcPSN(P, d) {
    const why = [];
    if (!d.psnPotential) why.push("не задан потенциальный доход по патенту (региональный закон)");
    if (d.income > P("psn.income_limit")) why.push(`доход выше ${fmtM(P("psn.income_limit"))} (пп. 1 п. 6 ст. 346.45 НК)`);
    if (d.staff > P("psn.staff_max")) why.push(`работников больше ${P("psn.staff_max")} (п. 5 ст. 346.43 НК)`);
    const pot = d.psnPotential || 0;
    const ip = ipContrib(P, pot); // база 1% на ПСН — потенциальный доход
    const pr = payrollContrib(P, d);
    const gross = pot * P("psn.rate") / 100;
    const limit = d.staff > 0 ? gross * 0.5 : gross; // п. 1.2 ст. 346.51 НК (сверено)
    const reduce = Math.min(limit, ip.total + pr.contrib);
    const tax = r2(gross - reduce);
    return res("PSN", "ПСН (патент)", why, d, { tax, vat: 0, ipContrib: ip.total, payroll: pr.total, fot: pr.fot }, [
      `Патент: ${fmtR(pot)} × ${P("psn.rate")}% = ${fmtR(gross)}`,
      `Уменьшение на взносы (${d.staff > 0 ? "не более 50%" : "до 100%"}): −${fmtR(reduce)}`,
      `Взносы ИП: ${fmtR(ip.fixed)} + 1% с потенц. дохода сверх 300 000 = ${fmtR(ip.total)}`,
      pr.fot ? `Взносы за работников (${pr.note}) + травматизм 0,2%: ${fmtR(pr.total)}` : null]);
  }

  function calcUSN(P, d, obj) {
    const why = [];
    const lim = P("usn.income_limit_base") * P("gen.deflator_usn");
    if (d.income > lim) why.push(`доход выше ${fmtM(lim)} (п. 4 ст. 346.13 НК)`);
    if (d.staff > P("usn.staff_max")) why.push(`работников больше ${P("usn.staff_max")}`);
    const rate = obj === "INCOME" ? (d.usnRegionalIncome ?? P("usn.rate_income")) : (d.usnRegionalProfit ?? P("usn.rate_profit"));
    const pr = payrollContrib(P, d);
    const { vm, variants } = usnVatVariants(P, d);
    const results = variants.map(v => {
      const income = v.incomeNet; // ASSUMPTION: НДС, предъявленный покупателю, не включается в доходы (ст. 248 НК)
      const exp = v.expensesForTax;
      let tax, ip, lines = [];
      if (obj === "INCOME") {
        ip = ipContrib(P, income); // база 1% — все доходы
        const gross = income * rate / 100;
        const limit = d.staff > 0 ? gross * 0.5 : gross; // п. 3.1 ст. 346.21 НК
        const reduce = Math.min(limit, ip.total + pr.contrib);
        tax = r2(gross - reduce);
        lines = [`Налог: ${fmtR(income)} × ${rate}% = ${fmtR(gross)}`,
          `Уменьшение на взносы (${d.staff > 0 ? "не более 50%" : "до 100%"}): −${fmtR(reduce)}`];
      } else {
        // база 1% = доходы − (расходы без взносов ИП за себя); 425-ФЗ
        ip = ipContrib(P, income - exp - pr.fot - pr.total);
        const base = income - exp - pr.fot - pr.total - ip.total; // взносы — в расходах (пп. 7 п. 1 ст. 346.16)
        const t = pos(base) * rate / 100, minT = income * P("usn.min_tax") / 100;
        tax = r2(Math.max(t, minT));
        lines = [`База: ${fmtR(income)} − расходы ${fmtR(exp)} − ФОТ и взносы ${fmtR(pr.fot + pr.total + ip.total)} = ${fmtR(base)}`,
          `Налог ${rate}%: ${fmtR(t)}; минимальный ${P("usn.min_tax")}%: ${fmtR(minT)} → ${fmtR(tax)}`];
      }
      lines.push(`Взносы ИП: ${fmtR(ip.total)} (фикс. ${fmtR(ip.fixed)} + 1% ${fmtR(ip.onePct)})`);
      if (pr.fot) lines.push(`Взносы за работников (${pr.note}) + травматизм: ${fmtR(pr.total)}`);
      if (vm.months) lines.push(`НДС (${v.label}): ${vm.reason}; к уплате ${fmtR(v.vat)}${v.vatIn ? ` (начислено ${fmtR(v.vatOut)}, вычет ${fmtR(v.vatIn)})` : ""}`);
      return { v, tax, ip, lines };
    });
    // выбираем вариант НДС с наименьшей нагрузкой
    const total = x => x.tax + x.v.vat + x.ip.total;
    results.sort((a, b) => total(a) - total(b));
    const best = results[0];
    const alt = results[1];
    const lines = [...best.lines];
    if (alt) lines.push(`Альтернатива «${alt.v.label}»: нагрузка ${fmtR(total(alt) + pr.total)} — дороже на ${fmtR(total(alt) - total(best))}. Выбор 5/7% — минимум на 12 кварталов.`);
    const id = obj === "INCOME" ? "USN6" : "USN15";
    const name = obj === "INCOME" ? `УСН «Доходы» ${rate}%` : `УСН «Доходы − расходы» ${rate}%`;
    return res(id, name, why, d, { tax: best.tax, vat: best.v.vat, ipContrib: best.ip.total, payroll: pr.total, fot: pr.fot, vatMode: best.v.label }, lines);
  }

  function calcAUSN(P, d, obj) {
    const why = [];
    if (d.income > P("ausn.income_limit")) why.push(`доход выше ${fmtM(P("ausn.income_limit"))} (пп. 23 ч. 2 ст. 3 17-ФЗ)`);
    if (d.staff > P("ausn.staff_max")) why.push(`работников больше ${P("ausn.staff_max")} (пп. 28 ч. 2 ст. 3 17-ФЗ)`);
    if (d.ausnRegion === false) why.push("АУСН не введена в регионе");
    const fot = 12 * (d.staff || 0) * (d.salary || 0);
    const injury = d.staff > 0 ? P("ausn.injury_fixed") : 0; // ASSUMPTION: фикс. сумма на плательщика при наличии работников
    let tax, lines;
    if (obj === "INCOME") {
      tax = r2(d.income * P("ausn.rate_income") / 100);
      lines = [`Налог: ${fmtR(d.income)} × ${P("ausn.rate_income")}% = ${fmtR(tax)}`];
    } else {
      const base = d.income - d.expenses - fot - injury;
      const t = pos(base) * P("ausn.rate_profit") / 100, minT = d.income * P("ausn.min_tax") / 100;
      tax = r2(Math.max(t, minT));
      lines = [`База: ${fmtR(d.income)} − ${fmtR(d.expenses + fot + injury)} = ${fmtR(base)}`,
        `Налог ${P("ausn.rate_profit")}%: ${fmtR(t)}; минимальный ${P("ausn.min_tax")}%: ${fmtR(minT)} → ${fmtR(tax)}`];
    }
    lines.push("Взносы ИП за себя — 0 ₽, за работников — 0% (ч. 1, 7 ст. 18 17-ФЗ)");
    if (injury) lines.push(`Взносы на травматизм: ${fmtR(injury)}`);
    lines.push("НДС не уплачивается. Эксперимент — до 31.12.2027.");
    return res(obj === "INCOME" ? "AUSN8" : "AUSN20", `АУСН «${obj === "INCOME" ? "Доходы" : "Доходы − расходы"}»`, why, d,
      { tax, vat: 0, ipContrib: 0, payroll: injury, fot }, lines);
  }

  function calcOSNO(P, d) {
    const b = P("vat.base");
    const vatOut = d.income * b / (100 + b);
    const vatIn = d.expenses * (d.vatExpShare || 0) * b / (100 + b);
    const vat = r2(vatOut - vatIn);
    const income = d.income - vatOut, exp = d.expenses - vatIn;
    const pr = payrollContrib(P, d);
    const ip = ipContrib(P, income - exp - pr.fot - pr.total); // ASSUMPTION: база 1% = доходы − проф. вычеты
    const base = income - exp - pr.fot - pr.total - ip.total;
    const tax = ndflProgressive(pos(base));
    return res("OSNO", "ОСНО (НДФЛ + НДС)", [], d, { tax, vat, ipContrib: ip.total, payroll: pr.total, fot: pr.fot }, [
      `НДС ${b}%: начислено ${fmtR(vatOut)}, вычет ${fmtR(vatIn)} → ${fmtR(vat)}`,
      `База НДФЛ: ${fmtR(income)} − ${fmtR(exp + pr.fot + pr.total + ip.total)} = ${fmtR(base)}`,
      `НДФЛ по шкале 13–22% (ст. 224 НК): ${fmtR(tax)}`,
      `Взносы ИП: ${fmtR(ip.total)}`,
      pr.fot ? `Взносы за работников (${pr.note}) + травматизм: ${fmtR(pr.total)}` : null]);
  }

  // ---------- Сборка результата ----------
  function res(id, name, why, d, m, lines) {
    const burden = r2(m.tax + m.vat + m.ipContrib + m.payroll);
    const fot = m.fot || 0;
    return {
      id, name, available: why.length === 0, why,
      tax: m.tax, vat: m.vat, ipContrib: m.ipContrib, payroll: m.payroll, fot, vatMode: m.vatMode || "",
      burden, burdenPct: d.income ? r2(burden / d.income * 100) : 0,
      net: r2(d.income - d.expenses - fot - burden),
      lines: lines.filter(Boolean)
    };
  }

  function compareRegimes(P, d) {
    const list = [calcNPD(P, d), calcPSN(P, d), calcUSN(P, d, "INCOME"), calcUSN(P, d, "PROFIT"),
      calcAUSN(P, d, "INCOME"), calcAUSN(P, d, "PROFIT"), calcOSNO(P, d)];
    const ok = list.filter(x => x.available).sort((a, b) => a.burden - b.burden);
    const best = ok[0] ? ok[0].id : null;
    return { list, best };
  }

  function fmtR(x) { return (Math.round(x)).toLocaleString("ru-RU") + " ₽"; }
  function fmtM(x) { return (x / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + " млн ₽"; }

  const api = { makeParams, ipContrib, payrollContrib, ndflProgressive, usnVatMonths, calcNPD, calcPSN, calcUSN, calcAUSN, calcOSNO, compareRegimes };
  if (typeof module !== "undefined") module.exports = api; else root.TaxEngine = api;
})(this);
