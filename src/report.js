// Отчёт «Бизнес-калькулятор»: сборка данных + выгрузка в XLSX (свой писатель, без библиотек) и PDF (jsPDF).
(function (root) {
  "use strict";
  const sum = a => a.reduce((s, x) => s + x, 0);
  const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const nf = (x, d = 0) => x == null || !isFinite(x) ? "—" : (Math.round(x * 10 ** d) / 10 ** d || 0).toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
  const money = x => x == null || !isFinite(x) ? "—" : nf(x) + " ₽";
  const mln = x => x == null || !isFinite(x) ? "—" : Math.abs(x) >= 1e6 ? nf(x / 1e6, 2) + " млн ₽" : money(x);
  const months = x => x == null ? "не окупается" : x === 0 ? "сразу" : x + " мес.";

  // ---------- 1. Данные отчёта ----------
  // ctx: { name, date, R (результат модели), cmp (сравнение режимов), inp, fin, factors, tows, scen, sens, sysVersion }
  function build(ctx) {
    const { R, inp } = ctx, k = R.kpi, P = R.pnl, M = R.months;
    const conclusions = [];
    conclusions.push(k.npv >= 0
      ? `Проект окупает вложения: NPV ${mln(k.npv)} при ставке дисконтирования ${nf(inp.discountRatePct, 1)}% годовых, срок окупаемости — ${months(k.pp).replace(/\.$/, "")}.`
      : `При ставке дисконтирования ${nf(inp.discountRatePct, 1)}% проект не окупает вложения: NPV ${mln(k.npv)}.`);
    conclusions.push(k.cashGapMonth ? `Кассовый разрыв в ${k.cashGapMonth}-м месяце (минимальный остаток ${money(k.cashMin)}) — нужно дополнительное финансирование.` : `Кассовых разрывов нет; минимальный остаток на счёте — ${money(k.cashMin)}.`);
    const best = ctx.cmp.find(x => x.available);
    if (best) conclusions.push(`Выбранный режим — ${R.regimeName}. ${best.regimeId === R.regimeId ? "Он же самый выгодный по NPV среди доступных." : `По NPV выгоднее режим ${best.regimeName} (${mln(best.kpi.npv)}).`}`);
    if (k.beRevMonth) conclusions.push(`Точка безубыточности — ${money(k.beRevMonth)} выручки в месяц; запас финансовой прочности ${nf(k.safety, 1)}%.`);
    if (k.dscrMin != null) conclusions.push(`Минимальное покрытие долга (DSCR) — ${nf(k.dscrMin, 2)}${k.dscrMin < 1 ? ": в каком-то году заработанного не хватает на платежи по кредитам" : ""}.`);
    if (ctx.scen && ctx.scen.length) { const pe = ctx.scen.find(s => s.id === "PESS"); if (pe) conclusions.push(`В пессимистичном сценарии NPV ${mln(pe.kpi.npv)}${pe.kpi.cashGapMonth ? `, кассовый разрыв в ${pe.kpi.cashGapMonth}-м месяце` : ""}.`); }
    if (ctx.sens && ctx.sens.length) { const s = ctx.sens[0]; conclusions.push(`Сильнее всего результат зависит от фактора «${s.name}»${s.threshold != null ? `: NPV = 0 при его ${s.threshold < 1 ? "снижении" : "росте"} на ${nf(Math.abs((s.threshold - 1) * 100))}%` : ""}.`); }

    const kpi = [
      ["NPV (чистая приведённая стоимость)", k.npv, "money"], ["IRR, % годовых", k.irrYear, "pct"], ["Индекс доходности PI", k.pi, "x"],
      ["Срок окупаемости, мес.", k.pp, "int"], ["Дисконтированный срок окупаемости, мес.", k.dpp, "int"],
      ["Максимальная потребность в деньгах", k.maxNeed, "money"], ["Точка безубыточности, выручка в месяц", k.beRevMonth, "money"],
      ["Запас финансовой прочности, %", k.safety, "pct"], ["Кассовый разрыв (месяц)", k.cashGapMonth, "int"], ["Минимальный остаток на счёте", k.cashMin, "money"],
      ["Минимальный DSCR", k.dscrMin, "x"], ["Инвестиции за горизонт", k.investTotal, "money"], ["Вложения собственника", k.injectionsTotal, "money"],
      ["Проценты по кредитам за горизонт", k.interestTotal, "money"], ["Налоги и взносы за горизонт", k.totalTaxes, "money"], ["Чистая прибыль за горизонт", k.netTotal, "money"],
      ...(k.terminalValue ? [["Остаточная стоимость в NPV", k.terminalValue, "money"]] : []),
    ];
    const pnlRows = [["Выручка", "rev"], ["НДС к уплате", "vat", -1], ["Выручка без НДС", "netRev", 1, 1], ["Переменные затраты", "varC", -1], ["Маржинальный доход", "margin", 1, 1],
      ["Постоянные расходы", "fixed", -1], ["Зарплата", "sal", -1], ["Взносы за работников", "pay", -1], ["Взносы ИП за себя", "ip", -1], ["EBITDA", "ebitda", 1, 1],
      ["Амортизация", "amort", -1], ["EBIT", "ebit", 1, 1], ["Проценты по кредитам", "interest", -1], ["Прибыль до налога", "ebt", 1, 1], ["Налог режима", "tax", -1], ["Чистая прибыль", "net", 1, 2]]
      .map(([n, key, sg = 1, b = 0]) => ({ n, b, v: [...P.map(p => sg * p[key]), sum(P.map(p => sg * p[key]))] }));
    pnlRows.push({ n: "Рентабельность продаж, %", pct: 1, v: [...P.map(p => p.ros), null] });
    pnlRows.push({ n: "Налоговая нагрузка, % поступлений", pct: 1, v: [...P.map(p => p.burdenPct), null] });
    pnlRows.push({ n: "DSCR, раз", pct: 1, v: [...P.map(p => p.dscr), null] });
    const cfDefs = [["Поступления от клиентов", m => m.cashIn], ["Переменные затраты", m => -m.varCost], ["Постоянные расходы", m => -m.fixed], ["Зарплата", m => -m.salaries],
      ["Взносы за работников", m => -m.payrollPay], ["Налог режима", m => -m.taxPay], ["НДС", m => -m.vatPay], ["Взносы ИП за себя", m => -m.ipPay], ["Операционный поток", m => m.opCF, 1],
      ["Инвестиции", m => m.invCF, 1], ["Вложения собственника", m => m.injection], ["Кредиты получены", m => m.loanDraw], ["Погашение кредитов", m => -m.principal], ["Проценты по кредитам", m => -m.interest],
      ["Кредитная линия: получено", m => m.lineDraw], ["Кредитная линия: погашено", m => -m.lineRepay], ["Кредитная линия: проценты", m => -m.lineInt], ["Финансовый поток", m => m.finCF, 1]];
    const years = [...new Set(M.map(m => m.year))];
    const cfYear = cfDefs.map(([n, f, b]) => ({ n, b, v: years.map(y => sum(M.filter(m => m.year === y).map(f))) }))
      .filter(r => r.b || r.v.some(x => Math.abs(x) > 0.5));
    cfYear.push({ n: "Остаток на конец", b: 2, v: years.map(y => M.filter(m => m.year === y).pop().cashEnd) });
    const cfMonth = cfDefs.map(([n, f, b]) => ({ n, b, v: M.map(f) })).filter(r => r.b || r.v.some(x => Math.abs(x) > 0.5));
    cfMonth.push({ n: "Остаток на конец", b: 2, v: M.map(m => m.cashEnd) }, { n: "Накопленный поток проекта", v: M.map(m => m.cumCF) });

    return {
      title: ctx.name, date: ctx.date, regime: R.regimeName, startYear: inp.startYear, horizon: inp.horizon, sysVersion: ctx.sysVersion,
      conclusions, kpi,
      products: (ctx.fin.products || []).map(p => ({ name: p.name, price: p.price, volume: p.volume, varCostPct: p.varCostPct, rev: p.price * p.volume, margin: p.price * p.volume * (1 - p.varCostPct / 100) })),
      productMargin: k.products, investments: ctx.fin.investments || [], loans: ctx.fin.loans || [], injections: ctx.fin.injections || [], line: ctx.fin.line,
      costs: [["Постоянные расходы, ₽/мес", inp.fixed], ["Рост постоянных, % в год", inp.fixedIndexPct], ["Работников, чел.", inp.staff], ["Зарплата, ₽/мес", inp.salary],
        ["Индексация зарплаты, % в год", inp.salaryIndexPct], ["Рост продаж, % в месяц", inp.growthPct], ["Выход на мощность, мес.", inp.rampMonths], ["Отсрочка оплаты клиентов, дней", inp.delayDays],
        ["Собственные средства на старте, ₽", inp.ownFunds], ["Ставка дисконтирования, % годовых", inp.discountRatePct]],
      regimes: ctx.cmp.map(x => ({ name: x.regimeName, npv: x.kpi.npv, taxes: x.kpi.totalTaxes, net: x.kpi.netTotal, available: x.available, why: x.unavailable || "" })),
      pnlCols: [...P.map(p => String(p.year)), "Итого"], pnlRows, cfYearCols: years.map(String), cfYear,
      cfMonthCols: M.map(m => `${MONTHS[m.mi]} ${m.year}`), cfMonth,
      cum: M.map(m => m.cumCF), cash: M.map(m => m.cashEnd), monthYears: M.map(m => m.year),
      sens: (ctx.sens || []).map(s => ({ name: s.name, lo: s.lo, hi: s.hi, threshold: s.threshold })),
      scen: (ctx.scen || []).map(s => ({ name: s.name, npv: s.kpi.npv, irr: s.kpi.irrYear, pp: s.kpi.pp, cashMin: s.kpi.cashMin, gap: s.kpi.cashGapMonth })),
      factors: ctx.factors || [], tows: ctx.tows || {},
      taxLines: R.years.map(y => ({ year: y.year, lines: y.lines })),
    };
  }

  // ---------- 2. XLSX ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = s => new TextEncoder().encode(s);
  function zip(files) { // [{name, data:Uint8Array}] → Uint8Array, без сжатия (STORE)
    const parts = [], cen = []; let off = 0;
    const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    for (const f of files) {
      const nm = enc(f.name), c = crc32(f.data), sz = f.data.length;
      const lh = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(sz), ...u32(sz), ...u16(nm.length), ...u16(0)]);
      parts.push(lh, nm, f.data);
      cen.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(sz), ...u32(sz), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nm);
      off += lh.length + nm.length + sz;
    }
    const cenSize = sum(cen.map(x => x.length));
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cenSize), ...u32(off), ...u16(0)]);
    const all = [...parts, ...cen, end], out = new Uint8Array(sum(all.map(x => x.length)));
    let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }
  const xesc = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const colName = i => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  // стили: 0 обычный, 1 жирный, 2 число, 3 жирное число, 4 число 0,0, 5 заголовок (жирный, заливка), 6 перенос текста
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.0"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F2"/></patternFill></fill></fills>
<borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="7"><xf xfId="0"/><xf xfId="0" fontId="1" applyFont="1"/><xf xfId="0" numFmtId="3" applyNumberFormat="1"/><xf xfId="0" numFmtId="3" fontId="1" applyNumberFormat="1" applyFont="1"/><xf xfId="0" numFmtId="164" applyNumberFormat="1"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  function sheetXml(rows, widths, freeze) {
    const xr = rows.map((r, i) => `<row r="${i + 1}">` + (r || []).map((c, j) => {
      if (c == null || c === "") return "";
      const ref = colName(j) + (i + 1), o = typeof c === "object" ? c : { v: c };
      if (typeof o.v === "number" && isFinite(o.v)) return `<c r="${ref}" s="${o.s ?? 2}"><v>${Math.round(o.v * 100) / 100}</v></c>`;
      return `<c r="${ref}" t="inlineStr" s="${o.s ?? 0}"><is><t xml:space="preserve">${xesc(o.v ?? "")}</t></is></c>`;
    }).join("") + `</row>`).join("");
    const cols = widths ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
    const pane = freeze ? `<sheetViews><sheetView workbookViewId="0"><pane xSplit="${freeze[0]}" ySplit="${freeze[1]}" topLeftCell="${colName(freeze[0])}${freeze[1] + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${xr}</sheetData></worksheet>`;
  }
  function toXlsx(D) {
    const H = v => ({ v, s: 5 }), B = v => ({ v, s: 1 }), N = (v, b) => ({ v, s: b ? 3 : 2 }), D1 = v => ({ v, s: 4 }), W = v => ({ v, s: 6 });
    const kv = (v, t) => v == null || !isFinite(v) ? "—" : t === "money" || t === "int" ? N(v) : D1(v);
    const sheets = [];
    sheets.push({ name: "Итоги", w: [46, 22], rows: [[B(D.title)], [`Отчёт от ${D.date} · режим: ${D.regime} · старт ${D.startYear}, горизонт ${D.horizon} мес.`], [],
      [H("Выводы")], ...D.conclusions.map(c => [W(c)]), [], [H("Показатель"), H("Значение")], ...D.kpi.map(([n, v, t]) => [n, kv(v, t)]), [],
      [W("Оценка для принятия решений, а не налоговая консультация. Параметры: " + D.sysVersion)]] });
    sheets.push({ name: "Исходные данные", w: [34, 14, 16, 14, 16, 16], rows: [[H("Продукт"), H("Цена, ₽"), H("Продаж в месяц"), H("Перем. затраты, %"), H("Выручка/мес, ₽"), H("Маржа/мес, ₽")],
      ...D.products.map(p => [p.name, N(p.price), N(p.volume), D1(p.varCostPct), N(p.rev), N(p.margin)]), [],
      [H("Инвестиция"), H("Месяц"), H("Сумма, ₽"), H("Срок службы, мес.")], ...D.investments.map(x => [x.name || "—", N(x.month), N(x.amount), N(x.lifeMonths || 0)]), [],
      [H("Кредит: месяц"), H("Сумма, ₽"), H("Ставка, %"), H("Срок, мес."), H("Платёж"), H("Отсрочка, мес.")], ...D.loans.map(l => [N(l.month), N(l.amount), D1(l.ratePct), N(l.termMonths), l.type === "DIFF" ? "дифференц." : "аннуитет", N(l.graceMonths || 0)]), [],
      [H("Вложение собственника: месяц"), H("Сумма, ₽")], ...D.injections.map(x => [N(x.month), N(x.amount)]), [],
      [H("Кредитная линия"), D.line && D.line.on ? `вкл.: лимит ${nf(D.line.limit)} ₽, ${nf(D.line.ratePct, 1)}%, неснижаемый остаток ${nf(D.line.reserve)} ₽` : "выкл."], [],
      [H("Прочие параметры"), H("Значение")], ...D.costs.map(([n, v]) => [n, typeof v === "number" ? N(v) : "—"])] });
    sheets.push({ name: "БДР", w: [34, ...D.pnlCols.map(() => 15)], freeze: [1, 1], rows: [[H("БДР, ₽"), ...D.pnlCols.map(H)], ...D.pnlRows.map(r => [r.b ? B(r.n) : r.n, ...r.v.map(v => v == null || !isFinite(v) ? "" : r.pct ? D1(v) : N(v, r.b))])] });
    sheets.push({ name: "БДДС по годам", w: [34, ...D.cfYearCols.map(() => 15)], freeze: [1, 1], rows: [[H("БДДС, ₽"), ...D.cfYearCols.map(H)], ...D.cfYear.map(r => [r.b ? B(r.n) : r.n, ...r.v.map(v => N(v, r.b))])] });
    sheets.push({ name: "БДДС по месяцам", w: [34, ...D.cfMonthCols.map(() => 13)], freeze: [1, 1], rows: [[H("БДДС, ₽"), ...D.cfMonthCols.map(H)], ...D.cfMonth.map(r => [r.b ? B(r.n) : r.n, ...r.v.map(v => N(v, r.b))])] });
    sheets.push({ name: "Налоговые режимы", w: [30, 16, 18, 16, 60], rows: [[H("Режим"), H("NPV, ₽"), H("Налоги и взносы, ₽"), H("Чистая прибыль, ₽"), H("Доступность")],
      ...D.regimes.map(x => [x.name, N(x.npv), N(x.taxes), N(x.net), W(x.available ? "доступен" : x.why)]), [], [H("Расчёт налогов выбранного режима по годам")],
      ...D.taxLines.flatMap(y => [[B(String(y.year))], ...y.lines.map(l => [W(l)])])] });
    if (D.productMargin && D.productMargin.length) sheets.push({ name: "Продукты", w: [34, 18, 18, 12, 12], rows: [[H("Продукт"), H("Выручка за горизонт, ₽"), H("Маржа за горизонт, ₽"), H("Маржа, %"), H("Доля маржи, %")],
      ...(() => { const t = sum(D.productMargin.map(p => p.margin)) || 1; return D.productMargin.map(p => [p.name, N(p.rev), N(p.margin), D1(p.rev ? p.margin / p.rev * 100 : 0), D1(p.margin / t * 100)]); })()] });
    if (D.sens.length || D.scen.length) sheets.push({ name: "Риски", w: [36, 16, 16, 30, 14, 16], rows: [[H("Чувствительность NPV, фактор ±20%"), H("NPV при −20%"), H("NPV при +20%"), H("Порог (NPV = 0)")],
      ...D.sens.map(s => [s.name, N(s.lo), N(s.hi), s.threshold == null ? "не меняет знак в 0–300%" : `${s.threshold < 1 ? "снижение" : "рост"} на ${nf(Math.abs((s.threshold - 1) * 100))}%`]), [],
      [H("Сценарий"), H("NPV, ₽"), H("IRR, %"), H("Окупаемость, мес."), H("Мин. остаток, ₽"), H("Кассовый разрыв")],
      ...D.scen.map(s => [s.name, N(s.npv), s.irr == null ? "—" : D1(Math.min(s.irr, 9999)), s.pp == null ? "не окуп." : N(s.pp), N(s.cashMin), s.gap ? s.gap + "-й мес." : "нет"])] });
    if (D.factors.length) {
      const Q = { S: "Сильная сторона", W: "Слабая сторона", O: "Возможность", T: "Угроза" };
      sheets.push({ name: "SWOT и PEST", w: [10, 18, 50, 10, 12, 22, 12], rows: [[H("Источник"), H("Тип"), H("Фактор"), H("Вес/сила"), H("Вероятность"), H("Влияет на"), H("Изменение, %")],
        ...D.factors.map(f => [f.src, Q[f.q] || f.q, W(f.text), N(f.weight ?? f.impact), f.q === "S" || f.q === "W" ? "—" : D1((f.prob ?? 0.5) * 100), f.target || "—", f.target ? D1(f.deltaPct) : "—"]), [],
        [H("Стратегии TOWS")], ...["SO", "ST", "WO", "WT"].filter(k => D.tows[k]).map(k => [k, W(D.tows[k])])] });
    }
    const wbRels = sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
    const files = [
      { name: "[Content_Types].xml", data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`) },
      { name: "_rels/.rels", data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
      { name: "xl/workbook.xml", data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xesc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`) },
      { name: "xl/_rels/workbook.xml.rels", data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels}</Relationships>`) },
      { name: "xl/styles.xml", data: enc(STYLES) },
      ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc(sheetXml(s.rows, s.w, s.freeze)) })),
    ];
    return zip(files);
  }

  // ---------- 3. PDF ----------
  // jsPDF и шрифт передаются снаружи: { jsPDF, fontRegular (base64), fontBold (base64) }
  function toPdf(D, lib) {
    const doc = new lib.jsPDF({ unit: "mm", format: "a4" });
    doc.addFileToVFS("DejaVuSans.ttf", lib.fontRegular); doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
    doc.addFileToVFS("DejaVuSans-Bold.ttf", lib.fontBold); doc.addFont("DejaVuSans-Bold.ttf", "DejaVu", "bold");
    doc.setFont("DejaVu", "normal");
    const PW = 210, ML = 14, MR = 14, CW = PW - ML - MR; let y = 16;
    const AT = (opts) => { doc.autoTable({ startY: y, margin: { left: ML, right: MR }, styles: { font: "DejaVu", fontSize: 8, cellPadding: 1.4, overflow: "linebreak" },
      headStyles: { font: "DejaVu", fontStyle: "bold", fillColor: [220, 230, 242], textColor: 20 }, theme: "grid", ...opts,
      didParseCell: d => { // заголовки числовых колонок — вправо, как и числа
        const cs = (opts.columnStyles || {})[d.column.index]; if (d.section === "head" && cs && cs.halign === "right") d.cell.styles.halign = "right";
        if (opts.didParseCell) opts.didParseCell(d); } }); y = doc.lastAutoTable.finalY + 6; };
    const need = h => { if (y + h > 285) { doc.addPage(); y = 16; } };
    const H1 = t => { need(14); doc.setFont("DejaVu", "bold"); doc.setFontSize(13); doc.text(t, ML, y); y += 6; doc.setFont("DejaVu", "normal"); };
    const P = (t, size = 9) => { doc.setFontSize(size); const lines = doc.splitTextToSize(t, CW); need(lines.length * size * 0.42 + 2); doc.text(lines, ML, y); y += lines.length * size * 0.42 + 2; };
    const right = { halign: "right" };
    // титул
    doc.setFont("DejaVu", "bold"); doc.setFontSize(18); doc.text(D.title, ML, y); y += 8; doc.setFont("DejaVu", "normal");
    P(`Оценка проекта · ${D.date} · режим: ${D.regime} · старт ${D.startYear}, горизонт ${D.horizon} мес.`, 9);
    y += 2; H1("Выводы"); D.conclusions.forEach(c => P("• " + c, 9.5));
    H1("Ключевые показатели");
    AT({ head: [["Показатель", "Значение"]], body: D.kpi.filter(([, v]) => v != null).map(([n, v, t]) => [n, t === "money" ? money(v) : t === "int" ? nf(v) : t === "pct" ? (v > 1000 ? "> 1000" : nf(v, 1)) : nf(v, 2)]), columnStyles: { 1: right } });
    // график
    need(70); H1("Денежный поток по месяцам");
    const gx = ML + 18, gw = CW - 20, gy = y + 2, gh = 50, all = [...D.cum, ...D.cash, 0], mn = Math.min(...all), mx = Math.max(...all), sp = mx - mn || 1, n = D.cum.length;
    const X = i => gx + gw * i / Math.max(1, n - 1), Y = v => gy + gh * (1 - (v - mn) / sp);
    doc.setFontSize(7); doc.setDrawColor(200);
    for (let k = 0; k <= 4; k++) { const v = mn + sp * k / 4; doc.line(gx, Y(v), gx + gw, Y(v)); doc.text(nf(v / 1e6, 1) + " млн", gx - 1, Y(v) + 1, { align: "right" }); }
    for (let i = 0; i < n; i += 12) doc.text(String(D.monthYears[i]), X(i), gy + gh + 4);
    doc.setDrawColor(40); doc.setLineWidth(0.3); doc.line(gx, Y(0), gx + gw, Y(0));
    const plot = (arr, rgb) => { doc.setDrawColor(...rgb); doc.setLineWidth(0.6); for (let i = 1; i < n; i++) doc.line(X(i - 1), Y(arr[i - 1]), X(i), Y(arr[i])); };
    plot(D.cum, [31, 111, 235]); plot(D.cash, [26, 127, 55]);
    y = gy + gh + 8; doc.setFontSize(8); doc.setTextColor(31, 111, 235); doc.text("— накопленный поток проекта (окупаемость)", ML, y); doc.setTextColor(26, 127, 55); doc.text("— остаток на счёте (с финансированием)", ML + 80, y); doc.setTextColor(0); y += 7;
    doc.setLineWidth(0.2);
    // исходные данные
    H1("Исходные данные");
    AT({ head: [["Продукт", "Цена, ₽", "Продаж/мес", "Перем. затр., %", "Выручка/мес, ₽", "Маржа/мес, ₽"]], body: D.products.map(p => [p.name, nf(p.price), nf(p.volume), nf(p.varCostPct, 1), nf(p.rev), nf(p.margin)]), columnStyles: { 1: right, 2: right, 3: right, 4: right, 5: right } });
    if (D.investments.length) AT({ head: [["Инвестиция", "Месяц", "Сумма, ₽", "Срок службы, мес."]], body: D.investments.map(x => [x.name || "—", nf(x.month), nf(x.amount), nf(x.lifeMonths || 0)]), columnStyles: { 1: right, 2: right, 3: right } });
    const fin = [...D.loans.map(l => [`Кредит с ${l.month}-го мес.`, `${nf(l.amount)} ₽, ${nf(l.ratePct, 1)}%, ${l.termMonths} мес., ${l.type === "DIFF" ? "дифференц." : "аннуитет"}${l.graceMonths ? `, отсрочка ${l.graceMonths} мес.` : ""}`]),
      ...D.injections.map(x => [`Вложение в ${x.month}-м мес.`, money(x.amount)]), ["Кредитная линия", D.line && D.line.on ? `лимит ${money(D.line.limit)}, ${nf(D.line.ratePct, 1)}%, неснижаемый остаток ${money(D.line.reserve)}` : "не используется"],
      ...D.costs.map(([n, v]) => [n, typeof v === "number" ? nf(v, v % 1 ? 1 : 0) : "—"])];
    AT({ head: [["Финансирование и параметры", ""]], body: fin, columnStyles: { 0: { cellWidth: 70 } } });
    H1("Сравнение налоговых режимов");
    AT({ head: [["Режим", "NPV, ₽", "Налоги и взносы, ₽", "Чистая прибыль, ₽", "Доступность"]], body: D.regimes.map(x => [x.name, nf(x.npv), nf(x.taxes), nf(x.net), x.available ? "доступен" : x.why]), columnStyles: { 1: right, 2: right, 3: right, 4: { cellWidth: 55 } } });
    H1("БДР — бюджет доходов и расходов, ₽");
    AT({ head: [["", ...D.pnlCols]], body: D.pnlRows.map(r => [r.n, ...r.v.map(v => v == null || !isFinite(v) ? "" : r.pct ? nf(v, 1) : nf(v))]), columnStyles: Object.fromEntries(D.pnlCols.map((c, i) => [i + 1, right])),
      didParseCell: d => { if (d.section === "body" && D.pnlRows[d.row.index].b) d.cell.styles.fontStyle = "bold"; } });
    H1("БДДС — движение денег по годам, ₽");
    AT({ head: [["", ...D.cfYearCols]], body: D.cfYear.map(r => [r.n, ...r.v.map(v => nf(v))]), columnStyles: Object.fromEntries(D.cfYearCols.map((c, i) => [i + 1, right])),
      didParseCell: d => { if (d.section === "body" && D.cfYear[d.row.index].b) d.cell.styles.fontStyle = "bold"; } });
    if (D.sens.length) { H1("Чувствительность NPV (фактор ±20%)"); AT({ head: [["Фактор", "NPV при −20%", "NPV при +20%", "Порог (NPV = 0)"]], body: D.sens.map(s => [s.name, nf(s.lo), nf(s.hi), s.threshold == null ? "не меняет знак" : `${s.threshold < 1 ? "снижение" : "рост"} на ${nf(Math.abs((s.threshold - 1) * 100))}%`]), columnStyles: { 1: right, 2: right } }); }
    if (D.scen.length) { H1("Сценарии"); AT({ head: [["Сценарий", "NPV, ₽", "IRR, %", "Окупаемость", "Мин. остаток, ₽", "Разрыв"]], body: D.scen.map(s => [s.name, nf(s.npv), s.irr == null ? "—" : s.irr > 1000 ? "> 1000" : nf(s.irr, 1), months(s.pp), nf(s.cashMin), s.gap ? s.gap + "-й мес." : "нет"]), columnStyles: { 1: right, 2: right, 4: right } }); }
    if (D.factors.length) {
      H1("SWOT");
      const Q = { S: "Сильные стороны", W: "Слабые стороны", O: "Возможности", T: "Угрозы" };
      const li = q => D.factors.filter(f => f.src === "SWOT" && f.q === q).map(f => "• " + f.text + (f.target ? ` (${f.deltaPct > 0 ? "+" : ""}${f.deltaPct}%)` : "")).join("\n") || "—";
      AT({ head: [[Q.S, Q.W]], body: [[li("S"), li("W")]] }); AT({ head: [[Q.O, Q.T]], body: [[li("O"), li("T")]] });
      const pest = D.factors.filter(f => f.src === "PEST");
      if (pest.length) { H1("PESTEL"); AT({ head: [["Группа", "Фактор", "Тип", "Сила", "Вероятность"]], body: pest.map(f => [({ P: "Политика", E: "Экономика", S: "Общество", T: "Технологии", Ecol: "Экология", L: "Право" })[f.group] || f.group, f.text, f.q === "O" ? "возможность" : "угроза", nf(f.impact), nf((f.prob ?? .5) * 100) + "%"]) }); }
      const tw = ["SO", "ST", "WO", "WT"].filter(k => D.tows[k]);
      if (tw.length) { H1("Стратегии (TOWS)"); tw.forEach(k => P(`${k}: ${D.tows[k]}`, 9)); }
    }
    H1("Допущения"); P("Только ИП. Налоговый учёт кассовый; налоги считаются за календарный год и платятся по срокам. NPV — по потоку проекта без кредитов и вложений. Оценка для принятия решений, а не налоговая консультация и не банковский бизнес-план. Параметры: " + D.sysVersion, 8);
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(7); doc.setTextColor(120); doc.text(`${D.title} · ${D.date}`, ML, 292); doc.text(`${i} / ${pages}`, PW - MR, 292, { align: "right" }); doc.setTextColor(0); }
    return doc.output("arraybuffer");
  }

  const api = { build, toXlsx, toPdf, zip, crc32 };
  if (typeof module !== "undefined") module.exports = api; else root.Report = api;
})(typeof window !== "undefined" ? window : this);
