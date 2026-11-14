import { test } from "node:test";
import assert from "node:assert/strict";
import { TABLES, tafelFacts, tableFactKeys, isAutomated, steunsom } from "../js/world-tafels.js";
import { recordAttempt } from "../js/core.js";

const keys = facts => facts.map(f => f.key).sort();

test("tafels 0 tot 10 zijn kiesbaar", () => {
  assert.deepEqual(TABLES, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("standaard: tafels 2 en 10, alleen ×, levert 20 feiten n × t", () => {
  const f = tafelFacts({ tables: [2, 10], ops: "x" });
  assert.equal(f.length, 20);
  for (const x of f) {
    assert.equal(x.op, "x");
    assert.ok([2, 10].includes(x.b));
    assert.ok(x.a >= 1 && x.a <= 10);
    assert.equal(x.c, x.a * x.b);
  }
});

test("tafel van 7 is n × 7, de tafel staat achteraan", () => {
  const ks = keys(tafelFacts({ tables: [7], ops: "x" }));
  assert.ok(ks.includes("2x7") && !ks.includes("7x2"));
  assert.equal(new Set(keys(tafelFacts({ tables: [2, 7], ops: "x" }))).size, 20);
});

test("delen: (n × t) : t = n, geen rest, geen negatieve uitkomst", () => {
  const f = tafelFacts({ tables: [3, 7], ops: ":" });
  assert.equal(f.length, 20);
  for (const x of f) {
    assert.equal(x.op, ":");
    assert.equal(x.a, x.c * x.b);
    assert.ok(x.c >= 1 && x.c <= 10);
  }
});

test("beide bewerkingen voor alle tafels", () => {
  const f = tafelFacts({ tables: TABLES, ops: "x:" });
  assert.equal(f.filter(x => x.op === "x").length, 110);
  assert.equal(f.filter(x => x.op === ":").length, 100, "geen delen door 0");
  for (const x of f) {
    assert.ok(x.c >= 0);
    assert.equal(x.op === "x" ? x.a * x.b : x.a / x.b, x.c);
  }
});

test("tafel van 0: n × 0 = 0, delen wordt overgeslagen", () => {
  const f = tafelFacts({ tables: [0], ops: "x:" });
  assert.ok(f.every(x => x.op === "x" && x.c === 0));
  assert.equal(f.length, 10);
});

test("lege keuze levert geen feiten", () => {
  assert.equal(tafelFacts({ tables: [], ops: "x" }).length, 0);
});

test("steunsom kiest de dichtstbijzijnde van 1, 2, 5, 10", () => {
  assert.equal(steunsom(6, 2), "5 × 2 = 10, dus 6 × 2 = 10 + 2");
  assert.equal(steunsom(9, 3), "10 × 3 = 30, dus 9 × 3 = 30 − 3");
  assert.equal(steunsom(7, 4), "5 × 4 = 20, dus 7 × 4 = 20 + 4 + 4");
  assert.equal(steunsom(3, 6), "2 × 6 = 12, dus 3 × 6 = 12 + 6");
  assert.equal(steunsom(8, 7), "10 × 7 = 70, dus 8 × 7 = 70 − 7 − 7");
});

test("geautomatiseerd: elk feit van de tafel 2 keer juist en onder 3 s", () => {
  const st = {};
  const ks = tableFactKeys(7, "x");
  assert.equal(ks.length, 10);
  for (const k of ks) { recordAttempt(st, k, true, 2000); recordAttempt(st, k, true, 2900); }
  assert.equal(isAutomated(st, 7, "x"), true);
  assert.equal(isAutomated(st, 7, ":"), false);
  recordAttempt(st, ks[3], true, 3100);
  assert.equal(isAutomated(st, 7, "x"), false, "traag laatste antwoord");
  recordAttempt(st, ks[3], true, 1000);
  assert.equal(isAutomated(st, 7, "x"), false, "traag antwoord zit nog in de laatste 2");
  recordAttempt(st, ks[3], true, 1000);
  assert.equal(isAutomated(st, 7, "x"), true);
  recordAttempt(st, ks[0], false, 1000);
  recordAttempt(st, ks[0], true, 1000);
  assert.equal(isAutomated(st, 7, "x"), false, "fout in de laatste 2");
  assert.equal(isAutomated({}, 0, ":"), false);
});
