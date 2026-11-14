# Glitters, outfits en verrassingseenhoorns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Glitters verdienen per ronde, outfits kopen en dragen per eenhoorn, eenhoorns als kansbeloning met garantie.

**Architecture:** Pure beloningslogica en de catalogus in een nieuw `js/rewards.js` (testbaar in Node). De winkel als eigen scherm in `js/shop.js`. `app.js` roept de beloning aan in `finish()` en tekent elke eenhoorn via één helper `uniHTML`.

**Tech Stack:** vanilla ES-modules, `node --test`, geen dependencies.

**Spec:** `.claude/skill-workspace/superpowers/brainstorming/2026-11-14-glitters-outfits-design.md`

## Global Constraints

- Geen framework, bundler of npm-dependencies; nieuwe bestanden in `SHELL` van `sw.js` (`tests/sw.test.js` bewaakt dit).
- Vlaamse kindvriendelijke tekst, "oefening" en niet "som", geen em dashes.
- Tikvlakken minstens 48px, zichtbare focus, prefers-reduced-motion, light en dark mode.
- Opslag blijft versie 2; nieuwe spelervelden `glitters`, `closet`, `outfits`, `dry` krijgen standaardwaarden in `normalizePlayer`.
- Alleen emoji uit Emoji 13 of ouder.

## Review Focus

- Opslag van voor deze wijziging (geen nieuwe velden, `crown: true`) moet laden zonder fout en het kroontje zichtbaar houden. Test in Task 1.
- Kopen met te weinig glitters of een item dat ze al heeft, mag niets veranderen. Test in Task 1.
- Volle stal: geen kans meer op een eenhoorn, `dry` blijft staan, glitters wel. Test in Task 1.
- "Voortgang wissen" laat glitters, kast en outfits staan. Test in Task 1 (via een pure `resetProgress`).
- Een outfit op een eenhoorn-index die (nog) niet gevonden is, mag nergens crashen. Gedekt door `uniHTML` in Task 1.

---

### Task 1: Beloningslogica en catalogus

**Files:**
- Create: `js/rewards.js`, `tests/rewards.test.js`
- Modify: `js/core.js` (`normalizePlayer`, export `resetProgress`), `sw.js` (SHELL)

**Interfaces:**
- Produces:
  - `SLOTS = ["hoofd","ogen","hals","vriendje","glans"]`
  - `ITEMS: {id, emoji, name, slot, price}[]` met de 16 items uit de spec plus `{id:"kroon", emoji:"👑", name:"Kroontje", slot:"hoofd", price:null}` (niet te koop).
  - `glittersFor({mode, stars, timedOut, newRecord, newBadges}) -> number`: oefenen 5+5*stars; tempo niet timedOut 20, timedOut 5; +10 bij newRecord; +30 per badge.
  - `unicornChance(stars) -> number`: 1→.25, 2→.40, 3→.60.
  - `rollUnicorn(stars, dry, rand = Math.random) -> boolean`: `dry >= 4 || rand() < unicornChance(stars)`.
  - `buyItem(player, id) -> boolean`: false als prijs null, al in `closet`, of te weinig glitters; anders aftrekken, `closet[id] = Date.now()`.
  - `toggleWear(player, uni, id) -> void`: alleen als `closet[id]`; zelfde item in dat vak = uitdoen, anders aandoen.
  - `grantCrown(player) -> void`: `closet.kroon` zetten, en kroon op het hoofd van de rijder (`player.pick`).
  - `uniHTML(player, i, cls = "") -> string`: `<span class="unicorn ${cls}"><span class="face" style="filter:…">🦄</span>` + per gedragen vak `<span class="wear w-${slot}" aria-hidden="true">emoji</span>` + `</span>`.
  - In `core.js`: `normalizePlayer` vult `glitters:0, closet:{}, outfits:{}, dry:0`; bij `crown === true` en geen `closet.kroon`: `closet.kroon` zetten en `outfits[i].hoofd = "kroon"` voor elke `i < unicorns` zonder hoofd-item. `resetProgress(player) -> player`: nieuwe speler met dezelfde naam en id, maar met behoud van `glitters`, `closet`, `outfits`.

- [ ] Step 1: Tests in `tests/rewards.test.js`: `glittersFor` voor de vijf rijen uit de spec-tabel; `rollUnicorn(1, 0, () => .24) === true`, `rollUnicorn(1, 0, () => .25) === false`, `rollUnicorn(3, 0, () => .59) === true`, `rollUnicorn(1, 4, () => .99) === true`; `buyItem` slaagt en trekt af, faalt bij te weinig, bij dubbel en bij `kroon`; `toggleWear` aan, wissel binnen vak, uit, en geen effect zonder bezit; `loadState` met v2 met `crown:true, unicorns:3` geeft `closet.kroon` en kroon op hoofd van 0..2; `resetProgress` behoudt glitters/kast/outfits en zet unicorns op 1; `uniHTML` met outfit op onbekende index geeft geldige string; alle `ITEMS`-ids uniek en elk `slot` in `SLOTS`.
- [ ] Step 2: `node --test` → FAIL (module ontbreekt).
- [ ] Step 3: Implementeer `js/rewards.js` en de wijzigingen in `core.js`; voeg `./js/rewards.js` en `./js/shop.js` toe aan SHELL (shop.js komt in Task 3; tot dan faalt sw.test niet, want die controleert alleen bestaande bestanden).
- [ ] Step 4: `node --test` → alle tests PASS.
- [ ] Step 5: Commit "Beloningslogica: glitters, kansen op eenhoorns, kast en outfits".

### Task 2: Beloning in het spel en outfits overal zichtbaar

**Files:** Modify `js/app.js` (`finish`, `renderHome`, `renderPick`, eindscherm, `play`), `js/core.js` (`startSession`: rijder-HTML in plaats van filter + crowned), `js/parent.js` (reset via `resetProgress`, reset-tekst), `index.html` (CSS voor `.unicorn`, `.wear.w-*`, eindscherm-regel glitters; `.crowned` weg).

**Interfaces:** Consumes Task 1. `startSession` krijgt `riderHTML: string` in plaats van `filter` en `crown`.

- [ ] Step 1: In `finish()`: sterren ook bij tempo (3 als niet timedOut); `newRecord` → `grantCrown`; glitters via `glittersFor`; eenhoorn alleen als stal niet vol en (oefenen of tempo niet timedOut): `rollUnicorn` → nieuwe eenhoorn + `dry = 0`, anders `dry++`. Eindscherm toont "+N ✨" en het totaal; titel bij geen eenhoorn: "Kasteel gehaald!" (oefenen) of de bestaande tempo-titels.
- [ ] Step 2: Elke eenhoorn via `uniHTML`: hero, stal, kiesscherm, naamscherm, eindscherm, rijder. Posities van de vakken afstemmen in de browser (Android Noto als richtpunt).
- [ ] Step 3: Parent-reset gebruikt `resetProgress`; tekst: "Wist de stal, sterren, statistieken en records van de gekozen speler. De naam, glitters en outfits blijven."
- [ ] Step 4: `node --test` PASS; browser: oefenronde en tempo-ronde, glitters stijgen, geen consolefouten; v2-data met `crown:true` toont kroon.
- [ ] Step 5: Commit "Glitters en verrassingseenhoorns na elke ronde, outfits zichtbaar op elke eenhoorn".

### Task 3: Winkel en aankleden

**Files:** Create `js/shop.js`; Modify `index.html` (sectie `#shop`, knop "Aankleden" bij de stal), `js/app.js` (scherm in `SCREENS`, `initShop`).

**Interfaces:** `initShop({state, persist, player, onClose})`, `openShop()`. Consumes `ITEMS`, `SLOTS`, `buyItem`, `toggleWear`, `uniHTML`.

- [ ] Step 1: Scherm: terugknop, grote eenhoorn met outfit, saldo "✨ N", rij gevonden eenhoorns om te kiezen wie je aankleedt, per vak een rij tegels (≥48px) met emoji en prijs of "Van jou". Tik op eigen item = aan/uit. Tik op niet-eigen item = tegel toont "Kopen?" met prijs; tweede tik koopt (feestje + geluid), na 4 s terug. Te weinig glitters: tegel gedimd met "Nog N ✨ sparen", geen koop.
- [ ] Step 2: Browser: koop, draag, wissel, uitdoen, andere eenhoorn kiezen; gsm 320/390 en tablet; light en dark; geen consolefouten.
- [ ] Step 3: Commit "Winkel om eenhoorns aan te kleden".

### Task 4: Documentatie en publicatie

- [ ] Step 1: `CLAUDE.md`: `js/rewards.js` en `js/shop.js` bij de structuur; opslagschema met de vier velden; regel "additieve velden met standaardwaarden mogen zonder versieverhoging, al het andere niet".
- [ ] Step 2: phpro-code-review op de branch tegenover `origin/main`, bevindingen oplossen.
- [ ] Step 3: Commit, push, workflow volgen, live cachenaam en bestanden controleren.
