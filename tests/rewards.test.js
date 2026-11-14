import { test } from "node:test";
import assert from "node:assert/strict";
import { SLOTS, ITEMS, glittersFor, rollUnicorn, buyItem, toggleWear, grantCrown, uniHTML } from "../js/rewards.js";
import { KEY_V2, loadState, migrateV1, newPlayer, resetProgress } from "../js/core.js";

const mem = init => ({ getItem: k => (k in init ? init[k] : null), setItem: (k, v) => { init[k] = v; } });
const rich = n => Object.assign(newPlayer("Lotte", "p1"), { glitters: n, closet: {}, outfits: {}, dry: 0 });

test("glitters volgen de tabel uit het ontwerp", () => {
  assert.equal(glittersFor({ mode: "oefenen", stars: 1 }), 10);
  assert.equal(glittersFor({ mode: "oefenen", stars: 3 }), 20);
  assert.equal(glittersFor({ mode: "tempo", timedOut: false }), 20);
  assert.equal(glittersFor({ mode: "tempo", timedOut: true }), 5);
  assert.equal(glittersFor({ mode: "tempo", timedOut: false, newRecord: true, newBadges: 2 }), 90);
});

test("kans op een eenhoorn hangt af van de sterren, met garantie na 4 droge rondes", () => {
  assert.equal(rollUnicorn(1, 0, () => .24), true);
  assert.equal(rollUnicorn(1, 0, () => .25), false);
  assert.equal(rollUnicorn(2, 0, () => .39), true);
  assert.equal(rollUnicorn(2, 0, () => .40), false);
  assert.equal(rollUnicorn(3, 0, () => .59), true);
  assert.equal(rollUnicorn(3, 3, () => .99), false);
  assert.equal(rollUnicorn(1, 4, () => .99), true);
});

test("catalogus: unieke ids, geldige vakken, kroon niet te koop", () => {
  assert.equal(new Set(ITEMS.map(i => i.id)).size, ITEMS.length);
  for (const i of ITEMS) assert.ok(SLOTS.includes(i.slot), i.id);
  assert.equal(ITEMS.find(i => i.id === "kroon").price, null);
  assert.equal(ITEMS.filter(i => i.price !== null).length, 16);
});

test("kopen trekt af en lukt niet bij te weinig, dubbel of niet te koop", () => {
  const p = rich(100);
  assert.equal(buyItem(p, "strik"), true);
  assert.equal(p.glitters, 70);
  assert.ok(p.closet.strik);
  assert.equal(buyItem(p, "strik"), false);
  assert.equal(buyItem(p, "regenboog"), false);
  assert.equal(buyItem(p, "kroon"), false);
  assert.equal(buyItem(p, "bestaat-niet"), false);
  assert.equal(p.glitters, 70);
});

test("aankleden: aan, wisselen binnen een vak, uit, en niets zonder bezit", () => {
  const p = rich(200);
  buyItem(p, "strik"); buyItem(p, "bloem");
  toggleWear(p, 0, "strik");
  assert.equal(p.outfits[0].hoofd, "strik");
  toggleWear(p, 0, "bloem");
  assert.equal(p.outfits[0].hoofd, "bloem");
  toggleWear(p, 0, "bloem");
  assert.equal(p.outfits[0].hoofd, undefined);
  toggleWear(p, 0, "bril");
  assert.equal(p.outfits[0].ogen, undefined);
});

test("kroontje verdienen zet het in de kast en op de rijder", () => {
  const p = rich(0); p.pick = 0;
  grantCrown(p);
  assert.ok(p.closet.kroon);
  assert.equal(p.outfits[0].hoofd, "kroon");
});

test("bestaand kroontje uit oudere opslag blijft zichtbaar op elke eenhoorn zonder hoed", () => {
  const s = migrateV1({ unicorns: 3, pick: 1 });
  Object.assign(s.players[0], { crown: true });
  delete s.players[0].closet; delete s.players[0].outfits; delete s.players[0].glitters;
  const p = loadState(mem({ [KEY_V2]: JSON.stringify(s) })).players[0];
  assert.equal(p.glitters, 0);
  assert.equal(p.dry, 0);
  assert.ok(p.closet.kroon);
  for (const i of [0, 1, 2]) assert.equal(p.outfits[i].hoofd, "kroon");
  assert.equal(p.outfits[3], undefined);
});

test("voortgang wissen houdt glitters, kast en outfits", () => {
  const p = rich(55);
  Object.assign(p, { unicorns: 6, pick: 4, rounds: 9 });
  buyItem(p, "strik"); toggleWear(p, 4, "strik");
  const r = resetProgress(p);
  assert.equal(r.id, "p1"); assert.equal(r.name, "Lotte");
  assert.equal(r.unicorns, 1); assert.equal(r.pick, 0); assert.equal(r.rounds, 0);
  assert.equal(r.glitters, 25);
  assert.ok(r.closet.strik);
  assert.equal(r.outfits[4].hoofd, "strik");
});

test("uniHTML tekent de outfit en verdraagt een vreemde index", () => {
  const p = rich(100); buyItem(p, "strik"); toggleWear(p, 0, "strik");
  const h = uniHTML(p, 0);
  assert.match(h, /🦄/); assert.match(h, /w-hoofd/); assert.match(h, /🎀/);
  p.outfits[0].ogen = "verdwenen-item";
  assert.doesNotThrow(() => uniHTML(p, 0));
  assert.doesNotThrow(() => uniHTML(p, 99));
});
