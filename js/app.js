import {
  UNI, loadState, saveState, recordAttempt, buildQueue, tempoQueue, tempoKey, betterRecord,
  fmtTime, factText, setSoundSource, sfx, initFx, rainShow, bigParty, initPlay, startSession, stopSession
} from "./core.js";
import { plusmin, LEVELS } from "./world-plusmin.js";
import { tafels, TABLES, isAutomated } from "./world-tafels.js";
import { initParent, openParent } from "./parent.js";
import { glittersFor, rollUnicorn, grantCrown, uniHTML } from "./rewards.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const WORLDS = { plusmin, tafels };
const OPS = [["x", "×"], [":", ":"], ["x:", "× en :"]];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let storage = null;
try { storage = window.localStorage; } catch (e) {}
const state = loadState(storage);
const persist = () => saveState(storage, state);
const player = () => state.players.find(p => p.id === state.activePlayer) || state.players[0];
setSoundSource(() => state.sound);

const SCREENS = ["pick", "name", "home", "plusmin", "tafels", "play", "end", "parent"];
function showScreen(id){ SCREENS.forEach(s => $("#" + s).hidden = s !== id); scrollTo(0, 0); }

function starStr(n){ return "★".repeat(n) + "<i>" + "★".repeat(3 - n) + "</i>"; }
function badgeLabel(k){ return `👑 ${k.slice(1)} ${k[0] === "x" ? "×" : ":"}`; }
function opsLabel(ops){ return OPS.find(o => o[0] === ops)[1]; }
const SVG = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">';
const SOUND_ON = SVG + '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
const SOUND_OFF = SVG + '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';
const TEMPO_LIMITS = { count: [5, 200, 5], seconds: [30, 3600, 30] };

function tempoSet(){
  const { count, seconds } = state.tempo;
  const row = (k, label, value, less, more) => {
    const [min, max] = TEMPO_LIMITS[k], v = state.tempo[k];
    return `<div class="stepper"><b>${label}</b>
      <button class="step" data-k="${k}" data-d="-1" aria-label="${less}" ${v <= min ? "disabled" : ""}>&minus;</button>
      <output aria-live="polite">${value}</output>
      <button class="step" data-k="${k}" data-d="1" aria-label="${more}" ${v >= max ? "disabled" : ""}>+</button></div>`;
  };
  const pace = (seconds / count).toFixed(1).replace(".", ",").replace(",0", "");
  return row("count", "Oefeningen", count, "Minder oefeningen", "Meer oefeningen")
    + row("seconds", "Tijd", fmtTime(seconds * 1000), "Minder tijd", "Meer tijd")
    + `<p class="note">Dat is ${pace} seconden per oefening. Geen hulp, zo vlot als je kan!</p>`;
}

/* kiezen en naam */

function renderPick(){
  $("#who").innerHTML = state.players.map(p =>
    `<button data-id="${esc(p.id)}">${uniHTML(p, p.pick, "u")}${esc(p.name)}</button>`).join("");
}
$("#who").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  state.activePlayer = b.dataset.id; persist(); sfx("tap"); enter();
});

function askName(){
  const p = player();
  $("#nameUni").innerHTML = uniHTML(p, p.pick);
  $("#nameInput").value = p.name;
  showScreen("name");
  $("#nameInput").focus();
}
$("#nameForm").addEventListener("submit", e => {
  e.preventDefault();
  const p = player();
  p.name = $("#nameInput").value.trim() || "Speler 1";
  p.needsName = false; persist(); sfx("tap"); goHome();
});

function enter(){ if (player().needsName) askName(); else goHome(); }

/* startscherm */

function renderHome(){
  const p = player();
  $("#sound").innerHTML = state.sound ? SOUND_ON : SOUND_OFF;
  $("#sound").setAttribute("aria-pressed", state.sound);
  $("#heroUni").innerHTML = uniHTML(p, p.pick);
  $("#hello").textContent = `Hoi ${p.name}! Breng je eenhoorn naar het kasteel en verzamel ze allemaal!`;
  $("#stable").innerHTML = UNI.map((u, i) => {
    const open = i < p.unicorns;
    return `<button class="uni ${open ? "" : "locked"}" data-i="${i}" ${open ? `aria-pressed="${p.pick === i}" aria-label="${u[0]}"` : 'aria-label="Nog niet gevonden" disabled'}>${open ? uniHTML(p, i) : "<span>🦄</span>"}</button>`;
  }).join("");
  const left = UNI.length - p.unicorns;
  $("#stableNote").textContent = left
    ? `Rijdt nu: ${UNI[p.pick][0]}. Nog ${left} eenhoorns te vinden. Haal het kasteel, misschien wacht er een nieuwe op je!`
    : `Rijdt nu: ${UNI[p.pick][0]}. Je hebt ze allemaal gevonden!`;
  const badges = Object.keys(p.badges).sort((a, b) => a.slice(1) - b.slice(1) || a.localeCompare(b));
  $("#badges").innerHTML = badges.map(k => `<span class="badge">${badgeLabel(k)}</span>`).join("");
  $("#switchPlayer").hidden = state.players.length < 2;
  $("#whoName").textContent = p.name;
  $("#switchPlayer").setAttribute("aria-label", `Andere speler kiezen, nu speelt ${p.name}`);
}
function goHome(){ renderHome(); showScreen("home"); }

$("#stable").addEventListener("click", e => {
  const b = e.target.closest(".uni"); if (!b || b.disabled) return;
  player().pick = +b.dataset.i; persist(); sfx("tap"); renderHome();
});
$("#sound").addEventListener("click", () => { state.sound = !state.sound; persist(); renderHome(); sfx("tap"); });
$("#switchPlayer").addEventListener("click", () => { renderPick(); showScreen("pick"); });
$$(".world").forEach(b => b.addEventListener("click", () => { sfx("tap"); openWorld(b.dataset.world); }));
$$("[data-back]").forEach(b => b.addEventListener("click", goHome));

// Two seconds of holding keeps small fingers out of the parent screen.
const gear = $("#gear");
let holdTimer = null, hintTimer = null;
function startHold(){
  if (holdTimer) return;
  gear.classList.add("holding");
  holdTimer = setTimeout(() => { holdTimer = null; endHold(); openParent(); }, 2000);
}
function endHold(){
  if (holdTimer){
    $("#gearHint").textContent = "Hou 2 seconden ingedrukt";
    clearTimeout(hintTimer); hintTimer = setTimeout(() => $("#gearHint").textContent = "", 2500);
  }
  clearTimeout(holdTimer); holdTimer = null; gear.classList.remove("holding");
}
gear.addEventListener("pointerdown", e => { e.preventDefault(); gear.setPointerCapture(e.pointerId); startHold(); });
["pointerup", "pointercancel"].forEach(t => gear.addEventListener(t, endHold));
gear.addEventListener("contextmenu", e => e.preventDefault());
gear.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.repeat){ e.preventDefault(); startHold(); } });
gear.addEventListener("keyup", e => { if (e.key === "Enter" || e.key === " ") endHold(); });

/* werelden */

function renderModes(worldId){
  const ws = player().worlds[worldId], sec = $("#" + worldId), tempo = ws.mode === "tempo";
  sec.querySelector(".modes").innerHTML = [["oefenen", "Oefenen"], ["tempo", "Tempo"]].map(([m, t]) =>
    `<button class="chip" data-mode="${m}" aria-pressed="${ws.mode === m}">${t}</button>`).join("");
  sec.querySelector("[data-practice]").hidden = tempo;
  sec.querySelector("[data-tempo]").hidden = !tempo;
  sec.querySelector("[data-tempo]").innerHTML = tempoSet();
  sec.querySelector(".lens").innerHTML = [10, 15, 20].map(n => `<button class="len" data-n="${n}" aria-pressed="${ws.len === n}">${n}</button>`).join("");
}
$$(".modes").forEach(el => el.addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  player().worlds[el.dataset.world].mode = b.dataset.mode; persist(); sfx("tap"); openWorld(el.dataset.world, true);
}));
$$("[data-tempo]").forEach(el => el.addEventListener("click", e => {
  const b = e.target.closest(".step"); if (!b) return;
  const [min, max, step] = TEMPO_LIMITS[b.dataset.k];
  state.tempo[b.dataset.k] = Math.max(min, Math.min(max, state.tempo[b.dataset.k] + step * b.dataset.d));
  persist(); sfx("tap");
  el.innerHTML = tempoSet();
  const same = el.querySelector(`.step[data-k="${b.dataset.k}"][data-d="${b.dataset.d}"]`);
  if (same && !same.disabled) same.focus();
}));
$$(".lens").forEach(el => el.addEventListener("click", e => {
  const b = e.target.closest(".len"); if (!b) return;
  player().worlds[el.dataset.world].len = +b.dataset.n; persist(); sfx("tap"); openWorld(el.dataset.world, true);
}));

function openWorld(worldId, keepScroll){
  renderModes(worldId);
  if (worldId === "plusmin") renderPlusmin(); else renderTafels();
  if (keepScroll) SCREENS.forEach(s => $("#" + s).hidden = s !== worldId);
  else showScreen(worldId);
}

function renderPlusmin(){
  const best = player().worlds.plusmin.best;
  $("#levels").innerHTML = LEVELS.map((l, i) =>
    `<button class="level" data-id="${l.id}"><span class="nr" style="background:${l.col}">${i + 1}</span>
     <span><b>${l.name}</b><small>${l.ex}</small></span><span class="st">${starStr(best[l.id] || 0)}</span></button>`).join("");
}
$("#levels").addEventListener("click", e => { const b = e.target.closest(".level"); if (b) play("plusmin", { level: b.dataset.id }); });

function renderTafels(){
  const p = player(), s = p.worlds.tafels.settings;
  $("#tables").innerHTML = TABLES.map(t => {
    const crowns = ["x", ":"].filter(op => p.badges[op + t]).map(op => op === "x" ? "×" : ":").join("");
    return `<button class="tbl" data-t="${t}" aria-pressed="${s.tables.includes(t)}" aria-label="Tafel van ${t}${crowns ? ", kroontje" : ""}">${t}${crowns ? `<small aria-hidden="true">👑${crowns}</small>` : ""}</button>`;
  }).join("") + `<button class="tbl all" data-t="all" aria-pressed="${s.tables.length === TABLES.length}">Alle</button>`;
  $("#ops").innerHTML = OPS.map(([o, t]) => `<button class="chip" data-op="${o}" aria-pressed="${s.ops === o}">${t}</button>`).join("");
  $("#goTafels").disabled = tafels.facts(s).length === 0;
}
$("#tables").addEventListener("click", e => {
  const b = e.target.closest(".tbl"); if (!b) return;
  const s = player().worlds.tafels.settings, t = +b.dataset.t;
  if (b.dataset.t === "all") s.tables = s.tables.length === TABLES.length ? [] : TABLES.slice();
  else s.tables = s.tables.includes(t) ? s.tables.filter(x => x !== t) : [...s.tables, t].sort((a, c) => a - c);
  persist(); sfx("tap"); renderTafels();
});
$("#ops").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  player().worlds.tafels.settings.ops = b.dataset.op; persist(); sfx("tap"); renderTafels();
});
$("#goTafels").addEventListener("click", () => play("tafels", { ...player().worlds.tafels.settings }));

/* spelen */

let last = null;
function play(worldId, cfg){
  const p = player(), ws = p.worlds[worldId], W = WORLDS[worldId];
  const facts = W.facts(cfg);
  if (!facts.length) return;
  const tempo = ws.mode === "tempo";
  last = { worldId, cfg, mode: ws.mode, count: state.tempo.count, seconds: state.tempo.seconds };
  startSession({
    world: W, mode: ws.mode, seconds: state.tempo.seconds, riderHTML: uniHTML(p, p.pick),
    queue: tempo ? tempoQueue(facts, state.tempo.count) : buildQueue(facts, ws.stats, ws.len),
    onAnswer: (f, ok, ms) => { recordAttempt(ws.stats, f.key, ok, ms); persist(); },
    onEnd: res => finish(res),
    onStop: () => openWorld(worldId)
  });
  showScreen("play");
}

function recordLabel(l){
  const base = l.worldId === "plusmin"
    ? `Plus en min: ${LEVELS.find(x => x.id === l.cfg.level).name}`
    : `Tafels ${l.cfg.tables.join(", ")}, ${opsLabel(l.cfg.ops)}`;
  return `${base} (${l.count} in ${fmtTime(l.seconds * 1000)})`;
}

function newBadges(p){
  const out = [];
  for (const t of TABLES) for (const op of ["x", ":"]) {
    const k = op + t;
    if (!p.badges[k] && isAutomated(p.worlds.tafels.stats, t, op)) { p.badges[k] = Date.now(); out.push(k); }
  }
  return out;
}

function finish(res){
  const p = player(), l = last, news = [];
  p.rounds++;
  let party = false, title, stats, missed, missedTitle, stars, newRecord = false;

  if (res.mode === "tempo"){
    const key = tempoKey({ world: l.worldId, level: l.cfg.level, tables: l.cfg.tables, ops: l.cfg.ops, count: l.count, seconds: l.seconds });
    const rec = p.records[key];
    const result = { correct: res.correct, wrong: res.wrong, ms: res.ms };
    title = res.timedOut ? "De tijd is om!" : "Klaar!";
    stats = `${res.correct} juist, ${res.wrong} fout in ${fmtTime(res.ms)}` + (res.done < res.total ? ` (${res.done} van de ${res.total} gemaakt)` : "");
    if (betterRecord(result, rec)){
      p.records[key] = { ...result, label: recordLabel(l), at: Date.now() };
      p.crown = true; grantCrown(p); party = true; newRecord = true;
      news.push("👑 Nieuw record! Je kroontje hangt in je kast.");
    } else if (rec) {
      news.push(`Je record: ${rec.correct} juist in ${fmtTime(rec.ms)}`);
    }
    missed = res.wrongList; missedTitle = "Deze waren fout:";
    stars = res.timedOut ? 0 : 3;
    $("#endStars").innerHTML = "";
  } else {
    const acc = res.first / res.total;
    stars = acc >= .9 ? 3 : acc >= .7 ? 2 : 1;
    if (l.worldId === "plusmin") p.worlds.plusmin.best[l.cfg.level] = Math.max(p.worlds.plusmin.best[l.cfg.level] || 0, stars);
    title = "Kasteel gehaald!";
    stats = `${res.first} van de ${res.total} meteen juist` + (res.fast ? `, ${res.fast} keer bliksemsnel ⚡` : "");
    missed = res.missed; missedTitle = "Deze oefenen we nog eens:";
    $("#endStars").innerHTML = starStr(stars);
  }

  const badges = l.worldId === "tafels" ? newBadges(p) : [];
  for (const k of badges){ news.push(`Nieuw kroontje: ${badgeLabel(k)}`); party = true; }

  const gained = glittersFor({ mode: res.mode, stars, timedOut: res.timedOut, newRecord, newBadges: badges.length });
  p.glitters += gained;
  news.push(`+${gained} ✨ Je hebt nu ${p.glitters} glitters.`);

  // Only a finished round can bring a unicorn: practice always, tempo when everything was done in time.
  if (p.unicorns < UNI.length && (res.mode !== "tempo" || !res.timedOut)){
    if (rollUnicorn(stars, p.dry)){
      p.pick = p.unicorns++; p.dry = 0; party = true;
      title = `Nieuw in je stal: ${UNI[p.pick][0]}!`;
    } else p.dry++;
  }
  persist();

  const u = $("#endUni");
  u.innerHTML = uniHTML(p, p.pick);
  u.style.animation = "none"; void u.offsetWidth; u.style.animation = "";
  $("#endTitle").textContent = title;
  $("#endStats").textContent = stats;
  $("#endRecord").hidden = !news.length;
  $("#endRecord").classList.toggle("new", party);
  $("#endRecord").innerHTML = news.join("<br>");
  $("#missed").hidden = !missed.length;
  $("#missedTitle").textContent = missedTitle;
  $("#missedList").innerHTML = missed.map(f => `<li>${factText(f, true)}</li>`).join("");
  showScreen("end");
  setTimeout(() => { if (party) bigParty(); else rainShow(); sfx("win"); }, 200);
}
$("#again").addEventListener("click", () => play(last.worldId, last.cfg));
$("#toHome").addEventListener("click", goHome);

/* start */

initFx($("#fx"));
initPlay();
initParent({ state, persist, onClose: () => { stopSession(); goHome(); } });

function boot(){
  if (state.players.length > 1 && !player().needsName){ renderPick(); showScreen("pick"); }
  else enter();
}
boot();

if ("serviceWorker" in navigator && window.isSecureContext) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
