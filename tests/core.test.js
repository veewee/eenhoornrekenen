import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KEY_V1, KEY_V2, loadState, saveState, migrateV1, emptyState,
  recordAttempt, buildQueue, tempoQueue, tempoKey, betterRecord, MAX_WEIGHT
} from "../js/core.js";

function memoryStorage(init = {}) {
  const data = { ...init };
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

// Shape as written by the v1 app after a few days of play.
const V1 = {
  unicorns: 5, pick: 3, rounds: 14, sound: false, len: 15,
  hard: { p10: { "7+3c": 2, "6+5c": 1 }, x10: { "7+3c": 4, "9-4c": 1 }, v10: { "3+7b": 3 } },
  best: { v10: 3, p10: 2, x10: 1 }
};

test("v1 wordt een eerste speler, v1 blijft staan als back-up", () => {
  const ls = memoryStorage({ [KEY_V1]: JSON.stringify(V1) });
  const s = loadState(ls);
  assert.equal(s.version, 2);
  assert.equal(s.sound, false);
  assert.equal(s.players.length, 1);
  const p = s.players[0];
  assert.equal(s.activePlayer, p.id);
  assert.equal(p.name, "Speler 1");
  assert.equal(p.needsName, true);
  assert.equal(p.unicorns, 5);
  assert.equal(p.pick, 3);
  assert.equal(p.rounds, 14);
  assert.equal(p.worlds.plusmin.len, 15);
  assert.deepEqual(p.worlds.plusmin.best, V1.best);
  assert.deepEqual(s.tempo, { count: 60, seconds: 900 });
  assert.equal(ls.data[KEY_V1], JSON.stringify(V1));
  assert.deepEqual(JSON.parse(ls.data[KEY_V2]), s);
});

test("hard-gewichten worden statistiekgewichten, het hoogste per feit telt", () => {
  const st = migrateV1(V1).players[0].worlds.plusmin.stats;
  assert.equal(st["7+3c"].w, 4);
  assert.equal(st["6+5c"].w, 1);
  assert.equal(st["3+7b"].w, 3);
  assert.equal(st["9-4c"].w, 1);
  assert.deepEqual(st["7+3c"].last, []);
});

test("bestaande v2 wordt gelezen en niet opnieuw gemigreerd", () => {
  const v2 = migrateV1(V1);
  v2.players[0].name = "Lotte";
  const ls = memoryStorage({ [KEY_V1]: JSON.stringify({ ...V1, unicorns: 1 }), [KEY_V2]: JSON.stringify(v2) });
  const s = loadState(ls);
  assert.equal(s.players[0].name, "Lotte");
  assert.equal(s.players[0].unicorns, 5);
});

test("zonder opslag of met kapotte opslag krijg je een correcte lege start", () => {
  for (const ls of [memoryStorage(), memoryStorage({ [KEY_V2]: "{kapot", [KEY_V1]: "ook kapot" }), {
    getItem() { throw new Error("geblokkeerd"); }, setItem() { throw new Error("geblokkeerd"); }
  }]) {
    const s = loadState(ls);
    assert.equal(s.players.length, 1);
    assert.equal(s.players[0].unicorns, 1);
    assert.equal(s.players[0].needsName, true);
    assert.equal(s.activePlayer, s.players[0].id);
    assert.deepEqual(s.players[0].worlds.tafels.settings, { tables: [2, 10], ops: "x", reverse: false });
  }
  assert.doesNotThrow(() => saveState({ setItem() { throw new Error("vol"); } }, emptyState()));
});

test("gewicht stijgt bij fout of traag, daalt bij juist en snel, blijft binnen grenzen", () => {
  const st = {};
  recordAttempt(st, "k", false, 2000);
  assert.equal(st.k.w, 2);
  recordAttempt(st, "k", true, 6000);
  assert.equal(st.k.w, 3);
  recordAttempt(st, "k", true, 4000);
  assert.equal(st.k.w, 3);
  recordAttempt(st, "k", true, 1500);
  assert.equal(st.k.w, 2);
  assert.equal(st.k.seen, 4);
  assert.deepEqual(st.k.last, [{ ok: true, ms: 6000 }, { ok: true, ms: 4000 }, { ok: true, ms: 1500 }]);
  for (let i = 0; i < 10; i++) recordAttempt(st, "k", false, 100);
  assert.equal(st.k.w, MAX_WEIGHT);
  for (let i = 0; i < 10; i++) recordAttempt(st, "k", true, 100);
  assert.equal(st.k.w, 0);
});

const FACTS = Array.from({ length: 6 }, (_, i) => ({ key: "f" + i, w: 1 }));

test("oefenwachtrij: juiste lengte, nooit twee keer hetzelfde na elkaar, zware feiten vaker", () => {
  const stats = { f0: { seen: 3, last: [], w: 5 } };
  let heavy = 0, total = 0;
  for (let r = 0; r < 200; r++) {
    const q = buildQueue(FACTS, stats, 10);
    assert.equal(q.length, 10);
    for (let i = 1; i < q.length; i++) assert.notEqual(q[i].key, q[i - 1].key);
    heavy += q.filter(f => f.key === "f0").length; total += q.length;
  }
  assert.ok(heavy / total > 1 / 6, "zwaar feit komt vaker dan gemiddeld");
});

test("tempowachtrij is evenwichtig gespreid en herhaalt nooit direct", () => {
  for (const n of [5, 6, 60, 61]) {
    const q = tempoQueue(FACTS, n);
    assert.equal(q.length, n);
    for (let i = 1; i < q.length; i++) assert.notEqual(q[i].key, q[i - 1].key);
    const counts = FACTS.map(f => q.filter(x => x.key === f.key).length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `n=${n}: ${counts}`);
  }
});

test("tempo-sleutel hangt af van exact de instelling", () => {
  const base = { world: "tafels", tables: [10, 2], ops: "x", reverse: false, count: 60, seconds: 900 };
  assert.equal(tempoKey(base), tempoKey({ ...base, tables: [2, 10] }));
  for (const d of [{ tables: [2] }, { ops: "x:" }, { reverse: true }, { count: 40 }, { seconds: 600 }])
    assert.notEqual(tempoKey(base), tempoKey({ ...base, ...d }));
  assert.notEqual(tempoKey({ world: "plusmin", level: "p10", count: 60, seconds: 900 }),
                  tempoKey({ world: "plusmin", level: "m10", count: 60, seconds: 900 }));
});

test("record: meeste juist wint, bij gelijkstand de kortste tijd", () => {
  assert.equal(betterRecord({ correct: 50, ms: 300000 }, undefined), true);
  assert.equal(betterRecord({ correct: 51, ms: 300000 }, { correct: 50, ms: 100000 }), true);
  assert.equal(betterRecord({ correct: 50, ms: 200000 }, { correct: 50, ms: 250000 }), true);
  assert.equal(betterRecord({ correct: 50, ms: 250000 }, { correct: 50, ms: 250000 }), false);
  assert.equal(betterRecord({ correct: 49, ms: 1000 }, { correct: 50, ms: 250000 }), false);
  assert.equal(betterRecord({ correct: 0, ms: 1000 }, undefined), false);
});
