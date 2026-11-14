import { SYM, FAST_MS, newPlayer, fmtTime, sfx } from "./core.js";
import { TABLES } from "./world-tafels.js";

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const NS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

let ctx, viewId = null, gridOp = "x";

const viewed = () => ctx.state.players.find(p => p.id === viewId) || ctx.state.players[0];
const secs = ms => (ms / 1000).toFixed(1).replace(".", ",") + " s";
const resultText = r => `${r.ok ? "juist" : "fout"} in ${secs(r.ms)}`;
const STATUS_WORD = { vlot: "vlot", traag: "traag", fout: "fout", nog: "nog niet geoefend" };

function status(st){
  const r = st && st.last[st.last.length - 1];
  if (!r) return "nog";
  if (!r.ok) return "fout";
  return r.ms < FAST_MS ? "vlot" : "traag";
}

// A second tap within 4 s confirms, so one stray tap never wipes anything.
function confirmTap(btn, label, action){
  if (btn.dataset.armed){ delete btn.dataset.armed; btn.textContent = label; action(); return; }
  btn.dataset.armed = "1"; btn.textContent = "Zeker? Tik nog eens";
  setTimeout(() => { if (btn.isConnected && btn.dataset.armed){ delete btn.dataset.armed; btn.textContent = label; } }, 4000);
}

function plusminText(key){
  const m = /^(\d+)([+-])(\d+)[bc]$/.exec(key);
  if (!m) return esc(key);
  const a = +m[1], b = +m[3];
  return `${a} ${SYM[m[2]]} ${b} = ${m[2] === "+" ? a + b : a - b}`;
}

function render(){
  const { state } = ctx, p = viewed();
  viewId = p.id;

  $("#pPlayers").innerHTML = state.players.map(x =>
    `<button class="chip" data-id="${esc(x.id)}" aria-pressed="${x.id === p.id}">${esc(x.name)}</button>`).join("");

  $("#pOps").innerHTML = [["x", "×"], [":", ":"]].map(([o, t]) => `<button class="chip" data-op="${o}" aria-pressed="${gridOp === o}">${t}</button>`).join("");
  const st = p.worlds.tafels.stats;
  let g = `<span class="hd">${gridOp === "x" ? "×" : ":"}</span>` + NS.map(n => `<span class="hd">${n}</span>`).join("");
  for (const t of TABLES){
    g += `<span class="hd">${t}</span>`;
    for (const n of NS){
      if (gridOp === ":" && t === 0){ g += '<span class="none"></span>'; continue; }
      const key = gridOp === "x" ? `${n}x${t}` : `${n * t}:${t}`;
      const label = gridOp === "x" ? `${n} × ${t}` : `${n * t} : ${t}`;
      const s = status(st[key]);
      g += `<button class="${s}" data-key="${key}" data-label="${label}" aria-label="${label}: ${STATUS_WORD[s]}">${gridOp === "x" ? n * t : n}</button>`;
    }
  }
  $("#pGrid").innerHTML = g;
  $("#pDetail").textContent = "Tik op een vakje voor de laatste resultaten.";

  const pm = Object.entries(p.worlds.plusmin.stats).filter(([, s]) => s.w > 0)
    .sort((a, b) => b[1].w - a[1].w || b[1].seen - a[1].seen).slice(0, 15);
  $("#pHard").innerHTML = pm.length
    ? pm.map(([k, s]) => `<li><span>${plusminText(k)}</span><small>${s.last.length ? s.last.map(resultText).join(", ") : "nog geen recente pogingen"}</small></li>`).join("")
    : "<li>Nog geen moeilijke oefeningen.</li>";

  $("#pCount").value = state.tempo.count;
  $("#pMin").value = Math.floor(state.tempo.seconds / 60);
  $("#pSec").value = state.tempo.seconds % 60;
  $("#pPace").textContent = `Dat is ${secs(state.tempo.seconds / state.tempo.count * 1000)} per oefening. Records gelden per instelling, dus een nieuwe tijd begint een nieuw record.`;
  const recs = Object.values(p.records).sort((a, b) => b.at - a.at);
  $("#pRecords").innerHTML = recs.length
    ? recs.map(r => `<li><span>${esc(r.label)}</span><small>${r.correct} juist, ${r.wrong} fout, ${fmtTime(r.ms)}</small></li>`).join("")
    : "<li>Nog geen records.</li>";

  $("#pManage").innerHTML = state.players.map(x =>
    `<div class="row"><input data-id="${esc(x.id)}" value="${esc(x.name)}" maxlength="20" aria-label="Naam van ${esc(x.name)}">
     <button class="sbtn" data-del="${esc(x.id)}" ${state.players.length < 2 ? "disabled" : ""}>Verwijderen</button></div>`).join("");

  $("#pSound").setAttribute("aria-checked", state.sound);
  $("#pReset").textContent = `Voortgang van ${p.name} wissen`;
}

export function openParent(){
  viewId = ctx.state.activePlayer;
  render();
  ["pick", "name", "home", "plusmin", "tafels", "play", "end"].forEach(s => $("#" + s).hidden = true);
  $("#parent").hidden = false;
  scrollTo(0, 0);
}

export function initParent(c){
  ctx = c;
  const save = () => { ctx.persist(); render(); };

  $("#parentClose").addEventListener("click", () => { $("#parent").hidden = true; ctx.onClose(); });
  $("#pPlayers").addEventListener("click", e => { const b = e.target.closest(".chip"); if (b){ viewId = b.dataset.id; render(); } });
  $("#pOps").addEventListener("click", e => { const b = e.target.closest(".chip"); if (b){ gridOp = b.dataset.op; render(); } });
  $("#pGrid").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const s = viewed().worlds.tafels.stats[b.dataset.key];
    $("#pDetail").textContent = `${b.dataset.label}: ` + (s && s.last.length ? `${s.seen} keer gezien, laatst ${s.last.slice().reverse().map(resultText).join(", ")}` : "nog niet geoefend");
  });

  const setTempo = () => {
    const count = Math.max(5, Math.min(200, Math.round(+$("#pCount").value) || 60));
    const secsTotal = Math.max(30, Math.min(3600, (Math.round(+$("#pMin").value) || 0) * 60 + (Math.round(+$("#pSec").value) || 0)));
    ctx.state.tempo = { count, seconds: secsTotal };
    save();
  };
  ["#pCount", "#pMin", "#pSec"].forEach(id => $(id).addEventListener("change", setTempo));

  $("#pManage").addEventListener("change", e => {
    const inp = e.target.closest("input[data-id]"); if (!inp) return;
    const x = ctx.state.players.find(q => q.id === inp.dataset.id);
    const name = inp.value.trim();
    if (x && name){ x.name = name; x.needsName = false; }
    save();
  });
  $("#pManage").addEventListener("click", e => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    confirmTap(b, "Verwijderen", () => {
      const { state } = ctx;
      if (state.players.length < 2) return;
      state.players = state.players.filter(q => q.id !== b.dataset.del);
      if (!state.players.some(q => q.id === state.activePlayer)) state.activePlayer = state.players[0].id;
      if (viewId === b.dataset.del) viewId = state.activePlayer;
      save();
    });
  });
  $("#pAdd").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#pNewName").value.trim(); if (!name) return;
    const x = newPlayer(name);
    ctx.state.players.push(x);
    $("#pNewName").value = ""; viewId = x.id;
    save();
  });

  $("#pSound").addEventListener("click", () => { ctx.state.sound = !ctx.state.sound; save(); sfx("tap"); });
  $("#pReset").addEventListener("click", () => {
    const btn = $("#pReset");
    confirmTap(btn, btn.textContent, () => {
      const { state } = ctx, i = state.players.findIndex(q => q.id === viewId);
      if (i < 0) return;
      state.players[i] = newPlayer(state.players[i].name, state.players[i].id);
      save();
    });
  });
}
