import { FAST_MS } from "./core.js";

export const TABLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const NS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MINUS = "−";

function mul(n, t){ return { key: `${n}x${t}`, a: n, op: "x", b: t, c: n * t, hide: "c", w: 1, n, t }; }
function div(n, t){ return { key: `${n * t}:${t}`, a: n * t, op: ":", b: t, c: n, hide: "c", w: 1, n, t }; }

/* settings: {tables: number[], ops: "x" | ":" | "x:"} */
export function tafelFacts(settings){
  const out = new Map();
  const add = f => { if (!out.has(f.key)) out.set(f.key, f); };
  for (const t of settings.tables){
    for (const n of NS){
      if (settings.ops.includes("x")) add(mul(n, t));
      if (settings.ops.includes(":") && t > 0) add(div(n, t));
    }
  }
  return [...out.values()];
}

export function tableFactKeys(t, op){
  if (op === ":") return t > 0 ? NS.map(n => `${n * t}:${t}`) : [];
  return NS.map(n => `${n}x${t}`);
}

export function isAutomated(stats, t, op){
  const keys = tableFactKeys(t, op);
  return keys.length > 0 && keys.every(k => {
    const last = stats[k] && stats[k].last;
    return last && last.length >= 2 && last.slice(-2).every(r => r.ok && r.ms < FAST_MS);
  });
}

export function steunsom(n, t){
  const base = [1, 2, 5, 10].reduce((best, b) => Math.abs(b - n) < Math.abs(best - n) ? b : best);
  const v = base * t, d = n - base;
  const steps = Array(Math.abs(d)).fill(`${d > 0 ? "+" : MINUS} ${t}`).join(" ");
  return `${base} × ${t} = ${v}, dus ${n} × ${t} = ${v} ${steps}`;
}

function mulHint(n, t){
  if (t === 0) return `${n} groepjes met 0 bolletjes: dat zijn er samen 0.`;
  if (n === 1) return `Eén groepje van ${t}.`;
  if (n === 2) return `Het dubbel van ${t}: ${t} + ${t}.`;
  if (n === 5) return `De helft van 10 × ${t} = ${10 * t}.`;
  if (n === 10) return `Zet een 0 achter de ${t}.`;
  return steunsom(n, t);
}

export function helpTafels(f){
  let html = '<div class="groups">';
  for (let g = 0; g < f.n; g++) html += '<span class="grp">' + '<span class="dot"></span>'.repeat(f.t) + "</span>";
  html += "</div>";
  let hint;
  if (f.op === ":") hint = `Hoeveel keer ${f.t} is ${f.a}?`;
  else hint = mulHint(f.n, f.t);
  return html + `<p class="hint">${hint}</p>`;
}

export const tafels = {
  id: "tafels",
  name: "Tafels",
  facts: settings => tafelFacts(settings),
  help: helpTafels
};
