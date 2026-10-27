// Start-up (M2j §4): load the data tabs from data/*.csv behind a "Loading…" screen, check them,
// apply them to config.js, and only then start the game (main.js and everything it imports, so
// every module sees the loaded values). Problems are shown in the page, not just the console:
// errors in a panel that stops the game from starting; warnings in a small list that can be
// dismissed. The existing start-up checks that run as main.js starts (levels, candidates,
// corridors, items…) report through the console as before; what they report is shown too.

import * as C from './config.js';
import { loadTables } from './data/loader.js';
import { validateTables } from './data/validate.js';

const loadingScreen = document.getElementById('loading-screen');

// "spawns · row 42 · type: unknown enemy "stirg"" (parts that don't apply are left out).
function problemLine(p) {
  const where = [p.tab, p.row !== '' && p.row !== undefined ? `row ${p.row}` : '', p.column].filter(Boolean).join(' · ');
  return where ? `${where}: ${p.message}` : p.message;
}

function showProblems(kind, problems) {
  const panel = document.getElementById(kind === 'error' ? 'data-errors' : 'data-warnings');
  const list = panel.querySelector('ul');
  list.replaceChildren(...problems.map((p) => {
    const li = document.createElement('li');
    li.textContent = problemLine(p);
    return li;
  }));
  panel.hidden = false;
}

document.querySelector('#data-warnings button').addEventListener('click', () => {
  document.getElementById('data-warnings').hidden = true;
});

// Console errors and warnings from main.js's start-up checks, as problems.
function captureConsole(problems) {
  const original = { error: console.error, warn: console.warn };
  console.error = (...args) => { problems.errors.push({ tab: 'start-up check', message: args.join(' ') }); original.error(...args); };
  console.warn = (...args) => { problems.warnings.push({ tab: 'start-up check', message: args.join(' ') }); original.warn(...args); };
  return () => Object.assign(console, original);
}

const { tables, problems } = await loadTables((tab) => `data/${tab}.csv`);
if (problems.errors.length === 0) validateTables(tables, problems);
if (problems.errors.length === 0) {
  try {
    C.applyData(tables);
  } catch (err) {
    problems.errors.push({ tab: '', message: `the data could not be applied: ${err.message}` });
    console.error(err);
  }
}

if (problems.errors.length > 0) {
  loadingScreen.hidden = true;
  showProblems('error', problems.errors);
  if (problems.warnings.length) showProblems('warning', problems.warnings);
} else {
  const restore = captureConsole(problems);
  try {
    await import('./main.js');
  } catch (err) {
    problems.errors.push({ tab: '', message: `the game failed to start: ${err.message}` });
    console.error(err);
  } finally {
    restore();
  }
  loadingScreen.hidden = true;
  if (problems.errors.length) showProblems('error', problems.errors);
  if (problems.warnings.length) showProblems('warning', problems.warnings);
}
