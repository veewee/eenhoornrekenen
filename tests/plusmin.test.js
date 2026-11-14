import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, levelFacts } from "../js/world-plusmin.js";

const EXPECTED = { v10: 11, p10: 65, m10: 65, x10: 130, z20: 135, b20: 72, a20: 337 };

test("elk niveau levert het verwachte aantal feiten", () => {
  assert.deepEqual(LEVELS.map(l => l.id), Object.keys(EXPECTED));
  for (const [id, n] of Object.entries(EXPECTED)) assert.equal(levelFacts(id).length, n, id);
});

test("feiten zijn uniek, niet negatief en rekenkundig juist", () => {
  for (const { id } of LEVELS) {
    const facts = levelFacts(id);
    assert.equal(new Set(facts.map(f => f.key)).size, facts.length, `${id}: dubbele sleutels`);
    for (const f of facts) {
      for (const v of [f.a, f.b, f.c]) assert.ok(v >= 0, `${id}: negatief in ${f.key}`);
      assert.equal(f.c, f.op === "+" ? f.a + f.b : f.a - f.b, f.key);
      assert.ok(f.c <= 20, f.key);
      assert.ok(f.w > 0, f.key);
    }
  }
});

test("niveaus tot 10 blijven tot 10, vriendjes van 10 vragen het tweede getal", () => {
  for (const id of ["v10", "p10", "m10", "x10"]) for (const f of levelFacts(id)) assert.ok(Math.max(f.a, f.c) <= 10, f.key);
  for (const f of levelFacts("v10")) { assert.equal(f.hide, "b"); assert.equal(f.c, 10); }
});

test("over de brug betekent echt over 10", () => {
  for (const f of levelFacts("b20")) {
    if (f.op === "+") assert.ok(f.a < 10 && f.b < 10 && f.c > 10, f.key);
    else assert.ok(f.a > 10 && f.c < 10, f.key);
  }
});
