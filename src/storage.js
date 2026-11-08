// Хранение проектов «Бизнес-калькулятор» · v0.1
// Формат проекта + проверка + миграции + хранилище с адаптером (браузер сейчас, Android — потом).
(function (root) {
  "use strict";
  const FORMAT = "biz-calc-project", SCHEMA = 1;
  const KEY_INDEX = "bc_projects_index_v1", KEY_P = id => "bc_project_" + id;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function makeProject(name, data) {
    const now = new Date().toISOString();
    return { format: FORMAT, schema: SCHEMA, id: uid(), name: name || "Новый проект", createdAt: now, savedAt: now,
      form: data.form || {}, factors: data.factors || [], tows: data.tows || { SO: "", ST: "", WO: "", WT: "" },
      regime: data.regime || "AUTO", overrides: data.overrides || {} };
  }

  // Проверка и нормализация при импорте. Возвращает { project, warnings } или бросает Error.
  function validate(obj) {
    const w = [];
    if (!obj || typeof obj !== "object") throw new Error("Файл не похож на проект.");
    if (obj.format !== FORMAT) throw new Error("Это не файл проекта бизнес-калькулятора.");
    let p = { ...obj };
    if ((p.schema || 0) > SCHEMA) throw new Error(`Проект сохранён в более новой версии (схема ${p.schema}). Обновите приложение.`);
    p = migrate(p);
    if (typeof p.name !== "string" || !p.name.trim()) { p.name = "Импортированный проект"; w.push("У проекта не было названия."); }
    if (!p.form || typeof p.form !== "object") { p.form = {}; w.push("Нет данных формы — поля будут пустыми."); }
    if (!Array.isArray(p.factors)) { p.factors = []; w.push("Нет факторов SWOT/PEST."); }
    p.factors = p.factors.filter(f => f && (f.src === "SWOT" || f.src === "PEST") && typeof f.q === "string");
    p.tows = Object.assign({ SO: "", ST: "", WO: "", WT: "" }, p.tows || {});
    if (typeof p.overrides !== "object" || !p.overrides) p.overrides = {};
    for (const [k, v] of Object.entries(p.overrides)) if (!v || typeof v.value !== "number") { delete p.overrides[k]; w.push(`Правка параметра ${k} некорректна и пропущена.`); }
    if (!p.id) p.id = uid();
    return { project: p, warnings: w };
  }

  // Миграции схемы: v0 → v1 и т. д. Сейчас версия одна — заготовка.
  function migrate(p) {
    if (!p.schema) { p.schema = 1; }
    return p;
  }

  // ---------- Хранилище ----------
  // Адаптер: get(key) → string|null, set(key, str), del(key). Ошибки адаптера не роняют приложение.
  function browserAdapter() {
    try {
      const ls = root.localStorage, t = "__bc_test";
      ls.setItem(t, "1"); ls.removeItem(t);
      return { name: "browser", get: k => ls.getItem(k), set: (k, v) => ls.setItem(k, v), del: k => ls.removeItem(k) };
    } catch (e) { return null; }
  }
  function memoryAdapter() {
    const m = new Map();
    return { name: "memory", get: k => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, String(v)), del: k => m.delete(k) };
  }

  function createStore(adapter) {
    const a = adapter || browserAdapter() || memoryAdapter();
    const readIndex = () => { try { return JSON.parse(a.get(KEY_INDEX) || "[]"); } catch (e) { return []; } };
    const writeIndex = idx => a.set(KEY_INDEX, JSON.stringify(idx));
    return {
      kind: a.name, // "browser" | "memory" | "android" и т. п.
      list() { return readIndex().sort((x, y) => (y.savedAt || "").localeCompare(x.savedAt || "")); },
      load(id) { const s = a.get(KEY_P(id)); if (!s) return null; try { return validate(JSON.parse(s)).project; } catch (e) { return null; } },
      save(p) {
        p.savedAt = new Date().toISOString();
        a.set(KEY_P(p.id), JSON.stringify(p));
        const idx = readIndex().filter(x => x.id !== p.id);
        idx.push({ id: p.id, name: p.name, savedAt: p.savedAt });
        writeIndex(idx);
        return p;
      },
      remove(id) { a.del(KEY_P(id)); writeIndex(readIndex().filter(x => x.id !== id)); },
      duplicate(id) {
        const p = this.load(id); if (!p) return null;
        const c = { ...JSON.parse(JSON.stringify(p)), id: uid(), name: p.name + " (копия)", createdAt: new Date().toISOString() };
        return this.save(c);
      }
    };
  }

  const toJSON = p => JSON.stringify(p, null, 2);
  const fromJSON = s => { let o; try { o = JSON.parse(s); } catch (e) { throw new Error("Текст не является корректным JSON."); } return validate(o); };

  const api = { FORMAT, SCHEMA, makeProject, validate, createStore, memoryAdapter, toJSON, fromJSON, uid };
  if (typeof module !== "undefined") module.exports = api; else root.ProjectStore = api;
})(typeof window !== "undefined" ? window : this);
