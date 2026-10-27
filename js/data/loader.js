// Loads every data tab (M2j §4.1) from data/<tab>.csv and converts its cells by the schema.
// Conventions (§3.1): row 1 is the header; the `notes` column, columns starting with '_', blank
// rows and rows whose first cell starts with '#' are ignored; an empty cell is left out of the row
// object (the code's default applies). Each row keeps `_row`, its row number in the sheet.
// Problems are collected as { tab, row, column, message }; nothing here throws on bad data.

import { parseCsv } from './csv.js';
import { TABS, GLOBAL_TYPES, DRUID_KEYS } from './schema.js';

const ID_RE = /^[a-zA-Z][a-zA-Z0-9]*$/;

// Converts one cell; returns { value } or { error }.
function convert(type, raw) {
  const s = raw.trim();
  switch (type) {
    case 'text': return { value: s };
    case 'id': return ID_RE.test(s) ? { value: s } : { error: `"${s}" is not an ID (letters and digits only, e.g. hawkfeatherCrown)` };
    case 'number': case 'int': {
      const n = Number(s);
      if (!Number.isFinite(n)) return { error: `"${s}" is not a number` };
      if (type === 'int' && !Number.isInteger(n)) return { error: `"${s}" is not a whole number` };
      return { value: n };
    }
    case 'bool': {
      const u = s.toUpperCase();
      return u === 'TRUE' ? { value: true } : u === 'FALSE' ? { value: false } : { error: `"${s}" is not TRUE or FALSE` };
    }
    case 'list': {
      const parts = s.split(/[,;]/).map((p) => p.trim()).filter((p) => p !== '');
      const nums = parts.map(Number);
      return nums.every(Number.isFinite) ? { value: nums } : { error: `"${s}" is not a list of numbers (e.g. "1.5, 4")` };
    }
    default: return { value: s };
  }
}

// Column spec for a header in a tab, or null if unknown.
function columnSpec(tab, name) {
  const def = TABS[tab];
  if (def.columns[name]) return def.columns[name];
  if (def.pattern && def.pattern[0].test(name)) {
    const spec = def.pattern[1];
    if (spec.type === 'effect') return { type: name.endsWith('_value') ? 'number' : name.endsWith('_op') ? 'id' : 'text' };
    return spec;
  }
  return null;
}

// Parses one tab's CSV text into typed rows.
export function readTab(tab, text, problems) {
  const records = parseCsv(text);
  const rows = [];
  if (records.length === 0) {
    problems.errors.push({ tab, row: 1, column: '', message: 'the tab is empty (no header row)' });
    return rows;
  }
  const header = records[0].map((h) => h.trim());
  const columns = header.map((name) => {
    if (name === '' || name === 'notes' || name.startsWith('_')) return null;
    const spec = columnSpec(tab, name);
    if (!spec) {
      problems.warnings.push({ tab, row: 1, column: name, message: 'unknown column (ignored)' });
      return null;
    }
    return { name, spec };
  });
  for (const [name, spec] of Object.entries(TABS[tab].columns)) {
    if (spec.required && !header.includes(name)) problems.errors.push({ tab, row: 1, column: name, message: 'required column is missing' });
  }
  records.slice(1).forEach((record, i) => {
    const rowNumber = i + 2;
    if (record.every((c) => c.trim() === '')) return;    // blank row
    if (record[0].trim().startsWith('#')) return;         // commented out
    const row = { _row: rowNumber };
    columns.forEach((col, c) => {
      if (!col) return;
      const raw = record[c] ?? '';
      if (raw.trim() === '') {
        if (col.spec.required) problems.errors.push({ tab, row: rowNumber, column: col.name, message: 'a value is required' });
        return;
      }
      if (col.spec.type === 'value') { row[col.name] = raw.trim(); return; } // typed by its key below
      const r = convert(col.spec.type, raw);
      if (r.error) problems.errors.push({ tab, row: rowNumber, column: col.name, message: r.error });
      else row[col.name] = r.value;
    });
    rows.push(row);
  });
  // globals / druid: each value converted by its key's type.
  const keyTypes = tab === 'globals' ? GLOBAL_TYPES : tab === 'druid' ? DRUID_KEYS : null;
  if (keyTypes) {
    for (const row of rows) {
      const type = keyTypes[row.key];
      if (!type) {
        if (row.key !== undefined) problems.warnings.push({ tab, row: row._row, column: 'key', message: `unknown setting "${row.key}" (ignored)` });
        continue;
      }
      if (row.value === undefined) {
        problems.errors.push({ tab, row: row._row, column: 'value', message: `${row.key} needs a value` });
        continue;
      }
      const r = convert(type, row.value);
      if (r.error) problems.errors.push({ tab, row: row._row, column: 'value', message: `${row.key}: ${r.error}` });
      else row.value = r.value;
    }
  }
  return rows;
}

// Fetches and reads every tab. urlFor(tab) gives each tab's URL. Returns { tables, problems }.
export async function loadTables(urlFor) {
  const problems = { errors: [], warnings: [] };
  const tables = {};
  await Promise.all(Object.keys(TABS).map(async (tab) => {
    let text;
    try {
      const res = await fetch(urlFor(tab), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    } catch (err) {
      problems.errors.push({ tab, row: '', column: '', message: `could not load ${urlFor(tab)} (${err.message})` });
      tables[tab] = [];
      return;
    }
    tables[tab] = readTab(tab, text, problems);
  }));
  return { tables, problems };
}
