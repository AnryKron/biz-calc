// Стратегический анализ «Бизнес-калькулятор» · v0.1
// SWOT и PESTEL со связью с финмоделью: фактор может менять параметр модели → сценарии.
(function (root) {
  "use strict";
  const F = typeof module !== "undefined" ? require("./finmodel.js") : root.FinModel;

  // Параметры модели, на которые может влиять фактор
  const TARGETS = {
    price: "Цена", volume: "Объём продаж", growthPct: "Рост продаж", varCostPct: "Переменные затраты",
    fixed: "Постоянные расходы", salary: "Зарплата", capex: "Инвестиции", delayDays: "Отсрочка оплаты", loanRate: "Ставка кредита"
  };
  const SWOT_Q = { S: "Сильные стороны", W: "Слабые стороны", O: "Возможности", T: "Угрозы" };
  const PEST_G = { P: "Политические", E: "Экономические", S: "Социальные", T: "Технологические", Ecol: "Экологические", L: "Правовые" };

  // Фактор: { id, src:'SWOT'|'PEST', q:'S'|'W'|'O'|'T' (для PEST — 'O'|'T'), group (PEST), text,
  //           weight 1–5 (SWOT) | impact 1–3 (PEST), prob 0–1, target?, deltaPct? }
  const isFav = f => f.q === "S" || f.q === "O";
  const probOf = f => (f.q === "S" || f.q === "W") ? 1 : Math.min(1, Math.max(0, f.prob ?? 0.5)); // внутренние факторы — уже есть

  // SWOT: балл квадранта = Σ вес × вероятность; позиция = (S − W, O − T)
  function scoreSwot(factors) {
    const sw = factors.filter(f => f.src === "SWOT");
    const score = { S: 0, W: 0, O: 0, T: 0 };
    for (const f of sw) score[f.q] += (f.weight || 0) * probOf(f);
    const internal = score.S - score.W, external = score.O - score.T;
    const pos = internal >= 0 && external >= 0 ? ["SO", "Наступление", "Сильные стороны и возможности перевешивают: расширяться, использовать окно возможностей."]
      : internal >= 0 ? ["ST", "Защита", "Сильная позиция, но среда враждебна: использовать сильные стороны против угроз, не рисковать ростом."]
      : external >= 0 ? ["WO", "Укрепление", "Среда благоприятна, но есть внутренние слабости: закрыть их, чтобы воспользоваться возможностями."]
      : ["WT", "Выживание", "Слабости совпадают с угрозами: минимизировать риски, пересмотреть идею или масштаб."];
    return { score, internal, external, pos: { code: pos[0], name: pos[1], text: pos[2] } };
  }

  // PESTEL: значимость = сила влияния (1–3) × вероятность (0–1); нормированный вес по сумме
  function scorePest(factors) {
    const pe = factors.filter(f => f.src === "PEST").map(f => ({ ...f, score: (f.impact || 1) * probOf(f) }));
    const total = pe.reduce((s, f) => s + f.score, 0) || 1;
    for (const f of pe) f.share = f.score / total;
    const byGroup = {};
    for (const g of Object.keys(PEST_G)) byGroup[g] = pe.filter(f => f.group === g).reduce((s, f) => s + f.score, 0);
    return { list: pe.sort((a, b) => b.score - a.score), byGroup };
  }

  // Применение влияний к входу модели.
  // mode: 'PESS' — все неблагоприятные (W, T) целиком; 'OPT' — все благоприятные (S, O) целиком;
  //       'EXP' — ожидаемый: каждый фактор × вероятность (W, S — с вероятностью 1).
  // Несколько влияний на один параметр перемножаются: (1+a)(1+b).
  function applyImpacts(inp, factors, mode) {
    const out = { ...inp }, applied = [];
    const mult = {};
    for (const f of factors) {
      if (!f.target || !f.deltaPct || !(f.target in TARGETS)) continue;
      let k;
      if (mode === "PESS") { if (isFav(f)) continue; k = 1; }
      else if (mode === "OPT") { if (!isFav(f)) continue; k = 1; }
      else if (mode === "EXP") k = probOf(f);
      else continue;
      const d = f.deltaPct / 100 * k;
      mult[f.target] = (mult[f.target] ?? 1) * (1 + d);
      applied.push({ text: f.text, target: f.target, deltaPct: d * 100 });
    }
    for (const [t, m] of Object.entries(mult)) {
      out[t] = (inp[t] || 0) * m;
      if (t === "varCostPct") out[t] = Math.min(100, out[t]);
    }
    return { inp: out, applied, mult };
  }

  // Сценарии на выбранном режиме
  function scenarios(inp, factors, defs, ov, regimeId) {
    const mk = (id, name, src) => {
      const r = F.runModel(src.inp, defs, ov, regimeId);
      return { id, name, applied: src.applied, mult: src.mult || {}, kpi: r.kpi, available: r.available, unavailable: r.unavailable };
    };
    const base = { inp, applied: [], mult: {} };
    return [
      mk("PESS", "Пессимистичный", applyImpacts(inp, factors, "PESS")),
      mk("EXP", "Ожидаемый (с учётом вероятностей)", applyImpacts(inp, factors, "EXP")),
      mk("BASE", "Базовый (как введено)", base),
      mk("OPT", "Оптимистичный", applyImpacts(inp, factors, "OPT")),
    ];
  }

  // Проверки качества анализа — подсказки пользователю
  function lint(factors) {
    const w = [];
    const sw = factors.filter(f => f.src === "SWOT");
    for (const q of ["S", "W", "O", "T"]) if (!sw.some(f => f.q === q)) w.push(`В SWOT нет ни одного фактора «${SWOT_Q[q]}».`);
    const linked = factors.filter(f => f.target && f.deltaPct);
    if (!linked.length) w.push("Ни один фактор не связан с моделью — сценарии совпадут с базовым.");
    const t = {};
    for (const f of linked) (t[f.target] = t[f.target] || []).push(f);
    for (const [k, list] of Object.entries(t)) {
      const srcs = new Set(list.map(f => f.src));
      if (srcs.size > 1) w.push(`«${TARGETS[k]}» меняют факторы и из SWOT, и из PEST — проверьте, не одно ли это событие (иначе влияние посчитается дважды).`);
    }
    for (const f of linked) {
      if (!isFav(f) && ["price", "volume", "growthPct"].includes(f.target) && f.deltaPct > 0) w.push(`«${f.text}» — неблагоприятный фактор, но улучшает параметр «${TARGETS[f.target]}». Проверьте знак.`);
      if (isFav(f) && ["varCostPct", "fixed", "salary", "capex", "delayDays", "loanRate"].includes(f.target) && f.deltaPct > 0) w.push(`«${f.text}» — благоприятный фактор, но ухудшает параметр «${TARGETS[f.target]}». Проверьте знак.`);
      if (Math.abs(f.deltaPct) > 50) w.push(`«${f.text}»: влияние ${f.deltaPct}% очень большое — это точно не опечатка?`);
    }
    return w;
  }

  const api = { TARGETS, SWOT_Q, PEST_G, scoreSwot, scorePest, applyImpacts, scenarios, lint };
  if (typeof module !== "undefined") module.exports = api; else root.Analysis = api;
})(this);
