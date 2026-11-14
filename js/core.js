/* Opslag, profielen, statistieken, geluid, effecten, klavier en de sessie-engine.
   Top-level code mag geen DOM aanraken: node --test importeert dit bestand. */

export const KEY_V1 = "eenhoornrekenen:v1";
export const KEY_V2 = "eenhoornrekenen:v2";
export const FAST_MS = 3000;
export const SLOW_MS = 5000;
export const LIGHTNING_MS = 3500;
export const MAX_WEIGHT = 5;

export const UNI = [
  ["Glitter","none"],["Suikerspin","hue-rotate(300deg) saturate(1.4)"],["Sterrenstof","hue-rotate(200deg) saturate(1.5)"],
  ["Regenboog","hue-rotate(40deg) saturate(1.8)"],["Bubbel","hue-rotate(160deg) saturate(1.4)"],["Maanlicht","hue-rotate(240deg) saturate(1.3)"],
  ["Kaneel","sepia(.8) saturate(1.6)"],["Fonkel","hue-rotate(100deg) saturate(1.6)"],["Wolkje","grayscale(.85) brightness(1.15)"],
  ["Zonnestraal","hue-rotate(60deg) saturate(2)"],["Toverstaf","hue-rotate(270deg) saturate(1.8)"],["Pluim","hue-rotate(330deg) saturate(2)"]
];
export const PRAISE = ["Super!","Knap!","Toppie!","Yes!","Prachtig!","Wauw!","Goed zo!","Fantastisch!"];
export const SYM = { "+": "+", "-": "−", "x": "×", ":": ":" };

/* opslag en profielen */

export function emptyState(){
  return { version: 2, sound: true, activePlayer: null, players: [], tempo: { count: 60, seconds: 900 } };
}

export function newPlayer(name = "Speler 1", id = "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e4)){
  return {
    id, name, needsName: false, unicorns: 1, pick: 0, rounds: 0, crown: false, badges: {}, records: {},
    glitters: 0, closet: {}, outfits: {}, dry: 0,
    worlds: {
      plusmin: { mode: "oefenen", len: 10, best: {}, stats: {} },
      tafels: { mode: "oefenen", len: 10, settings: { tables: [2, 10], ops: "x" }, stats: {} }
    }
  };
}

function isObj(v){ return v !== null && typeof v === "object" && !Array.isArray(v); }

// Fills gaps with defaults so older or partial saves never crash a screen.
function normalizePlayer(p){
  const d = newPlayer(p.name || "Speler", p.id);
  const out = Object.assign(d, p);
  out.worlds = isObj(p.worlds) ? p.worlds : {};
  for (const w of ["plusmin", "tafels"]) out.worlds[w] = Object.assign(newPlayer().worlds[w], isObj(out.worlds[w]) ? out.worlds[w] : {});
  const { tables, ops } = Object.assign(newPlayer().worlds.tafels.settings, out.worlds.tafels.settings);
  out.worlds.tafels.settings = { tables, ops };
  for (const k of ["badges", "records", "closet", "outfits"]) if (!isObj(out[k])) out[k] = {};
  for (const k of ["glitters", "dry"]) out[k] = Math.max(0, Math.floor(+out[k]) || 0);
  out.unicorns = Math.max(1, Math.min(UNI.length, Math.floor(+out.unicorns) || 1));
  out.pick = Math.max(0, Math.min(out.unicorns - 1, Math.floor(+out.pick) || 0));
  // The crown used to be a fixed layer on every unicorn; it is now a head item, worn wherever nothing else is.
  if (out.crown === true && !out.closet.kroon){
    out.closet.kroon = Date.now();
    for (let i = 0; i < out.unicorns; i++){ const o = out.outfits[i] || (out.outfits[i] = {}); if (!o.hoofd) o.hoofd = "kroon"; }
  }
  return out;
}

function normalize(s){
  const st = Object.assign(emptyState(), s);
  st.tempo = Object.assign(emptyState().tempo, isObj(s.tempo) ? s.tempo : {});
  st.players = (Array.isArray(s.players) ? s.players : []).filter(isObj).map(normalizePlayer);
  if (!st.players.length){ const p = newPlayer(); p.needsName = true; st.players.push(p); }
  if (!st.players.some(p => p.id === st.activePlayer)) st.activePlayer = st.players[0].id;
  return st;
}

// Clears play progress but keeps what was earned to spend: glitters, closet and outfits.
export function resetProgress(p){
  return Object.assign(newPlayer(p.name, p.id), { glitters: p.glitters, closet: p.closet, outfits: p.outfits });
}

export function migrateV1(v1){
  const s = emptyState();
  const p = newPlayer("Speler 1");
  p.needsName = true;
  if (Number.isFinite(v1.unicorns)) p.unicorns = Math.max(1, Math.min(UNI.length, v1.unicorns));
  if (Number.isFinite(v1.pick)) p.pick = Math.min(v1.pick, p.unicorns - 1);
  if (Number.isFinite(v1.rounds)) p.rounds = v1.rounds;
  if ([10, 15, 20].includes(v1.len)) p.worlds.plusmin.len = v1.len;
  if (isObj(v1.best)) p.worlds.plusmin.best = { ...v1.best };
  // v1 kept hard weights per level; the same fact now has one weight, so the highest wins.
  const stats = p.worlds.plusmin.stats;
  for (const lvl of Object.values(isObj(v1.hard) ? v1.hard : {})) {
    if (!isObj(lvl)) continue;
    for (const [key, w] of Object.entries(lvl)) {
      if (!Number.isFinite(w) || w <= 0) continue;
      const cur = stats[key] || (stats[key] = { seen: 0, last: [], w: 0 });
      cur.w = Math.min(MAX_WEIGHT, Math.max(cur.w, w));
    }
  }
  if (typeof v1.sound === "boolean") s.sound = v1.sound;
  s.players.push(p);
  s.activePlayer = p.id;
  return s;
}

function readJSON(storage, key){
  try { const raw = storage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

export function saveState(storage, state){
  try { storage.setItem(KEY_V2, JSON.stringify(state)); } catch (e) {}
}

export function loadState(storage = globalThis.localStorage){
  const v2 = storage ? readJSON(storage, KEY_V2) : null;
  if (isObj(v2) && v2.version === 2) return normalize(v2);
  const v1 = storage ? readJSON(storage, KEY_V1) : null;
  const s = normalize(isObj(v1) ? migrateV1(v1) : emptyState());
  if (storage) saveState(storage, s);
  return s;
}

/* statistieken en slim herhalen */

export function recordAttempt(stats, key, ok, ms){
  const s = stats[key] || (stats[key] = { seen: 0, last: [], w: 0 });
  s.seen++;
  s.last = s.last.concat({ ok, ms: Math.round(ms) }).slice(-3);
  const d = !ok ? 2 : ms > SLOW_MS ? 1 : ms < FAST_MS ? -1 : 0;
  s.w = Math.max(0, Math.min(MAX_WEIGHT, s.w + d));
  return s;
}

const weightOf = (stats, f) => f.w * (1 + 2 * ((stats[f.key] && stats[f.key].w) || 0));

export function buildQueue(facts, stats, n, rand = Math.random){
  const q = [];
  let bag = [], guard = 0;
  while (q.length < n && guard++ < 5000){
    if (!bag.length) bag = facts.slice();
    const ws = bag.map(f => weightOf(stats, f));
    let r = rand() * ws.reduce((s, x) => s + x, 0), i = 0;
    while (i < ws.length - 1 && (r -= ws[i]) > 0) i++;
    const f = bag.splice(i, 1)[0];
    if (q.length && q[q.length - 1].key === f.key) continue;
    q.push(Object.assign({}, f));
  }
  return q;
}

function shuffle(a, rand){
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Whole shuffled passes over all facts keep the counts within one of each other.
export function tempoQueue(facts, n, rand = Math.random){
  const q = [];
  while (q.length < n && facts.length){
    const pass = shuffle(facts.slice(), rand);
    if (q.length && pass.length > 1 && pass[0].key === q[q.length - 1].key) [pass[0], pass[1]] = [pass[1], pass[0]];
    for (const f of pass){ if (q.length >= n) break; q.push(Object.assign({}, f)); }
  }
  return q;
}

export function tempoKey(c){
  const parts = [c.world];
  if (c.world === "tafels") parts.push([...c.tables].sort((a, b) => a - b).join("."), c.ops);
  else parts.push(c.level);
  parts.push(c.count, c.seconds);
  return parts.join("|");
}

export function betterRecord(res, rec){
  if (res.correct <= 0) return false;
  if (!rec) return true;
  return res.correct > rec.correct || (res.correct === rec.correct && res.ms < rec.ms);
}

export function fmtTime(ms){
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function factText(f, withAnswer){
  return `${f.a} ${SYM[f.op]} ${f.b} = ${withAnswer ? f.c : "?"}`;
}

/* geluid */

let ac, soundOn = () => true;
export function setSoundSource(fn){ soundOn = fn; }
function tone(f, t, d, type, v){
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || "triangle"; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v || .14, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .05);
}
export function sfx(kind){
  if (!soundOn()) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime;
    if (kind==="good") [784,988,1319].forEach((f,i) => tone(f, t+i*.07, .22));
    if (kind==="fast") [988,1319,1568,1976].forEach((f,i) => tone(f, t+i*.05, .2));
    if (kind==="bad") { tone(330, t, .2, "sine", .1); tone(262, t+.15, .3, "sine", .1); }
    if (kind==="streak") [523,659,784,1047,1319,1568,2093].forEach((f,i) => tone(f, t+i*.06, .25));
    if (kind==="win") [[523,0],[659,.15],[784,.3],[1047,.45],[784,.65],[1047,.8]].forEach(([f,d]) => tone(f, t+d, .35, "square", .07));
    if (kind==="tap") tone(1200, t, .05, "sine", .04);
  } catch (e) {}
}

/* effecten */

let cv, cx, reduce = false, parts = [], running = false;
const COLS = ["#FF4FA0","#FFC93C","#1FCB9D","#4DA8FF","#A77BFF","#FF8A3D"];
export function initFx(canvas){
  cv = canvas; cx = cv.getContext("2d");
  reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const size = () => { const r = devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r,0,0,r,0,0); };
  addEventListener("resize", size); size();
}
export function burst(x, y, n, spread){
  if (!cx) return;
  n = reduce ? Math.ceil(n/4) : n;
  for (let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, s = (spread||6)*(.4+Math.random());
    parts.push({x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 3, life:1, size:6+Math.random()*8,
      col:COLS[i%COLS.length], shape:["star","heart","dot"][i%3], rot:Math.random()*6, vr:(Math.random()-.5)*.3});
  }
  if (!running){ running = true; requestAnimationFrame(tick); }
}
export function rainShow(){
  for (let k=0;k<6;k++) setTimeout(() => burst(innerWidth*(.1+.16*k), innerHeight*.9, 22, 11), k*90);
}
export function bigParty(){
  rainShow();
  if (reduce) return;
  setTimeout(rainShow, 700); setTimeout(rainShow, 1400);
}
function drawStar(s){ cx.beginPath(); for (let i=0;i<10;i++){ const r = i%2 ? s*.45 : s, a = i*Math.PI/5 - Math.PI/2; cx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } cx.closePath(); cx.fill(); }
function drawHeart(s){ cx.beginPath(); cx.moveTo(0, s*.35); cx.bezierCurveTo(-s*1.2,-s*.4,-s*.4,-s*1.1,0,-s*.35); cx.bezierCurveTo(s*.4,-s*1.1,s*1.2,-s*.4,0,s*.35); cx.fill(); }
function tick(){
  cx.clearRect(0,0,innerWidth,innerHeight);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts){
    p.x += p.vx; p.y += p.vy; p.vy += .22; p.vx *= .99; p.rot += p.vr; p.life -= .014;
    cx.save(); cx.globalAlpha = Math.max(0, p.life); cx.fillStyle = p.col; cx.translate(p.x, p.y); cx.rotate(p.rot);
    if (p.shape==="star") drawStar(p.size); else if (p.shape==="heart") drawHeart(p.size); else { cx.beginPath(); cx.arc(0,0,p.size*.5,0,7); cx.fill(); }
    cx.restore();
  }
  if (parts.length) requestAnimationFrame(tick); else { running = false; cx.clearRect(0,0,innerWidth,innerHeight); }
}

/* sessie-engine: oefenen en tempo, voor elke wereld */

const $ = s => document.querySelector(s);
let S = null;

export function initPlay(){
  $("#pad").innerHTML = ["1","2","3","4","5","6","7","8","9","del","0","ok"].map(k =>
    `<button class="key ${k==="ok"?"go":k==="del"?"del":""}" data-k="${k}" ${k==="ok"?'aria-label="Klaar"':k==="del"?'aria-label="Wissen"':""}>${k==="ok"?"✓":k==="del"?"⌫":k}</button>`).join("");
  $("#pad").addEventListener("click", e => { const b = e.target.closest(".key"); if (b) press(b.dataset.k); });
  addEventListener("keydown", e => {
    if ($("#play").hidden) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("del");
    else if (e.key === "Enter") { e.preventDefault(); press("ok"); }
  });
  $("#stop").addEventListener("click", () => { const s = S; stopSession(); if (s) s.onStop(); });
}

export function stopSession(){
  if (!S) return;
  clearInterval(S.timer); S.timeouts.forEach(clearTimeout);
  S = null;
}

/* opts: {world, queue, mode: "oefenen"|"tempo", seconds, filter, crown, onAnswer(fact, ok, ms), onEnd(result), onStop()} */
export function startSession(opts){
  stopSession();
  const tempo = opts.mode === "tempo";
  S = Object.assign({}, opts, {
    tempo, idx: 0, input: "", tries: 0, first: 0, fast: 0, streak: 0, missed: [], requeued: new Set(), lock: false,
    correct: 0, wrong: 0, wrongList: [], timeouts: [], startedAt: performance.now(),
    maxDigits: String(Math.max(...opts.queue.map(f => f[f.hide]))).length
  });
  $("#play").classList.toggle("tempo", tempo);
  $("#riderUni").style.filter = opts.filter;
  $("#runner").classList.toggle("crowned", !!opts.crown);
  $("#streak").textContent = "";
  if (tempo){
    S.endsAt = S.startedAt + opts.seconds * 1000;
    S.timer = setInterval(updateClock, 250);
    updateClock();
  }
  show();
}

function later(fn, ms){ const s = S; s.timeouts.push(setTimeout(() => { if (S === s) fn(); }, ms)); }
function cur(){ return S.queue[S.idx]; }

function updateClock(){
  const left = Math.max(0, S.endsAt - performance.now());
  $("#timefill").style.width = (left / (S.seconds * 1000) * 100) + "%";
  $("#timebar").setAttribute("aria-valuenow", Math.ceil(left / 1000));
  $("#timebar").setAttribute("aria-valuemax", S.seconds);
  $("#timeleft").textContent = fmtTime(left);
  if (left <= 0) finish(true);
}

function renderEq(state){
  const f = cur();
  const slot = `<span class="slot ${state||""}">${state==="show" ? f[f.hide] : (S.input || "?")}</span>`;
  const p = k => k === f.hide ? slot : `<span>${f[k]}</span>`;
  $("#eq").innerHTML = `${p("a")}<span class="op">${SYM[f.op]}</span>${p("b")}<span class="op">=</span>${p("c")}`;
}

function updateTrack(){
  const n = S.queue.length, p = S.idx / n;
  $("#runner").style.left = `calc(${p*100}% - ${p*40}px)`;
  $("#count").textContent = `${Math.min(S.idx+1,n)}/${n}`;
}

function show(){
  S.input = ""; S.tries = 0; S.lock = false; S.shownAt = performance.now();
  $("#help").hidden = true; $("#feedback").textContent = cur().again ? "Deze ken je nu!" : "";
  renderEq(); updateTrack();
}

function next(delay){
  S.idx++;
  if (delay) { updateTrack(); later(() => S.idx >= S.queue.length ? finish(false) : show(), delay); }
  else if (S.idx >= S.queue.length) finish(false);
  else show();
}

function cardCenter(){ const r = $("#card").getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height*.35]; }
function shake(){ const c = $("#card"); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); }
function hop(){ const r = $("#runner"); r.classList.remove("hop"); void r.offsetWidth; r.classList.add("hop"); }

function submit(){
  if (S.lock || !S.input) return;
  const f = cur(), ans = f[f.hide], t = performance.now() - S.shownAt, ok = +S.input === ans;
  if (S.tries === 0) S.onAnswer(f, ok, t);
  if (S.tempo) return submitTempo(f, ok);
  if (ok){
    S.lock = true;
    const quick = S.tries === 0 && t < LIGHTNING_MS;
    if (S.tries === 0){ S.first++; S.streak++; if (quick) S.fast++; }
    renderEq("ok");
    $("#feedback").textContent = quick ? "⚡ Bliksemsnel!" : PRAISE[Math.floor(Math.random()*PRAISE.length)];
    const [x,y] = cardCenter(); burst(x, y, quick ? 40 : 26, quick ? 9 : 7);
    sfx(quick ? "fast" : "good");
    if (S.streak && S.streak % 5 === 0 && S.tries === 0){ later(() => { rainShow(); sfx("streak"); }, 250); }
    $("#streak").textContent = S.streak >= 2 ? `🌈 ${S.streak} op rij!` : "";
    hop();
    next(quick ? 700 : 900);
  } else {
    S.tries++; S.streak = 0; $("#streak").textContent = "";
    shake(); sfx("bad");
    $("#help").innerHTML = S.world.help(f); $("#help").hidden = false;
    if (S.tries === 1){
      S.input = ""; renderEq();
      $("#feedback").textContent = "Bijna! Kijk naar de bolletjes en probeer nog eens.";
    } else {
      S.lock = true;
      renderEq("show");
      $("#feedback").textContent = `Het is ${ans}. Die komt straks nog eens terug.`;
      if (!S.missed.some(m => m.key === f.key)) S.missed.push(f);
      if (!S.requeued.has(f.key)){ S.requeued.add(f.key); S.queue.splice(Math.min(S.idx+3, S.queue.length), 0, Object.assign({}, f, {again:true})); }
      next(2800);
    }
  }
}

function submitTempo(f, ok){
  if (ok){
    S.correct++;
    renderEq("ok"); sfx("good");
    const [x,y] = cardCenter(); burst(x, y, 12, 5);
  } else {
    S.wrong++; S.wrongList.push(f);
    shake(); sfx("bad");
  }
  next(0);
}

function finish(timedOut){
  const s = S;
  if (!s) return;
  const ms = Math.min(performance.now() - s.startedAt, s.tempo ? s.seconds * 1000 : Infinity);
  stopSession();
  s.onEnd({
    mode: s.mode, total: s.queue.length, first: s.first, fast: s.fast, missed: s.missed,
    correct: s.correct, wrong: s.wrong, wrongList: s.wrongList, done: s.idx, ms, timedOut
  });
}

function press(k){
  if (!S || S.lock) return;
  if (k === "ok") return submit();
  sfx("tap");
  if (k === "del") S.input = S.input.slice(0,-1);
  else if (S.input.length < S.maxDigits) S.input = (S.input === "0" ? "" : S.input) + k;
  renderEq();
}
