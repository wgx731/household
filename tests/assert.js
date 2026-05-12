const state = { passed: 0, failed: 0, results: [] };

export function test(name, fn) {
  try { fn(); state.passed++; state.results.push({ name, pass: true }); }
  catch (e) { state.failed++; state.results.push({ name, pass: false, error: e.message }); }
}

export function assertEqual(actual, expected, msg = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

export function assertTrue(cond, msg = '') {
  if (!cond) throw new Error(`${msg} expected true`);
}

export function assertClose(actual, expected, eps = 0.001, msg = '') {
  if (Math.abs(actual - expected) > eps) throw new Error(`${msg} expected ~${expected}, got ${actual}`);
}

export function report() {
  const el = document.getElementById('results');
  el.innerHTML = state.results.map(r =>
    `<div style="color:${r.pass ? '#5f5' : '#f55'}">${r.pass ? 'PASS' : 'FAIL'} ${r.name}${r.error ? ': ' + r.error : ''}</div>`
  ).join('') + `<hr><div><b>${state.passed} passed, ${state.failed} failed</b></div>`;
}
