# Eenhoornrekenen

Rekenspel als PWA voor een kind in de lagere school, gespeeld op een Android-gsm. Twee werelden: Plus en min (zeven niveaus tot 20) en Tafels (0 tot 10, maal en delen). Er wordt echt mee gespeeld, dus opgeslagen voortgang mag nooit verloren gaan.

## Randvoorwaarden

- Geen framework, geen bundler, geen npm-dependencies in de app. Wel ES-modules als losse bestanden.
- Volledig offline na de eerste keer openen. Elk nieuw bestand moet in `SHELL` in `sw.js`, en `tests/sw.test.js` controleert dat voor `js/`.
- Look behouden: Baloo 2, regenboog, pastelkleuren met light en dark mode, cijferklavier, geluid, confetti. Het gedrag van de zeven bestaande niveaus blijft gelijk.
- Alle tekst in het Nederlands (Vlaams) en kindvriendelijk, geen em dashes. Delen schrijf je met ":", vermenigvuldigen met "×", min met U+2212.
- Respecteer prefers-reduced-motion, zorg voor zichtbare focus en tikvlakken van minstens 48px.

## Structuur

- `index.html`: alleen markup en CSS, laadt `js/app.js` als module.
- `js/core.js`: opslag en migratie, profielen, statistieken en gewichten, wachtrijen, tempo-record, geluid, effecten, klavier, sessie-engine (oefenen en tempo). Top-level code raakt geen DOM, zodat Node het kan importeren.
- `js/world-plusmin.js`, `js/world-tafels.js`: een wereld levert `facts(config)`, `help(fact)` (HTML bij een fout) en per feit een `key`. Plus en min heeft daarnaast `LEVELS`.
- `js/app.js`: schermen en verloop (spelers, startscherm, werelden, eindscherm, badges, records).
- `js/parent.js`: ouderscherm, open door het tandwiel 2 seconden in te drukken.
- `tests/`: `node --test`, zonder dependencies.

## Opslag

Sleutel `eenhoornrekenen:v2`:

    {version: 2, sound, activePlayer, tempo: {count, seconds},
     players: [{id, name, needsName, unicorns, pick, rounds, crown, badges, records,
                worlds: {plusmin: {mode, len, best, stats}, tafels: {mode, len, settings, stats}}}]}

`stats[factKey] = {seen, last: [{ok, ms}] (max 3), w}`. Het gewicht `w` (0 tot 5) gaat +2 bij fout, +1 bij juist boven 5 s, -1 bij juist onder 3 s. Een tafel is per bewerking geautomatiseerd als elk feit de laatste 2 pogingen juist had, elk onder 3 s. Records hangen aan `tempoKey` (wereld, niveau of tafels, bewerkingen, omgekeerd, aantal, tijd).

Migratie: bestaat v2 niet maar v1 (`eenhoornrekenen:v1`) wel, dan wordt v1 de eerste speler (naam wordt gevraagd, standaard "Speler 1") en worden de hard-gewichten per niveau omgezet naar het hoogste gewicht per feit. v1 blijft staan als back-up. Verander het schema nooit zonder versie op te hogen en een migratie met test toe te voegen.

## Lokaal testen

    node --test
    python3 -m http.server 8080

Open http://localhost:8080. Op een Android-gsm via USB: `adb reverse tcp:8080 tcp:8080` en dan http://localhost:8080 in Chrome (localhost geldt als veilige context, dus de service worker werkt). Lokaal blijft de cachenaam `eenhoorn-__BUILD__`. Na een wijziging moet je dus de site-data wissen of in DevTools "Update on reload" aanzetten.

## Deploy

`.github/workflows/pages.yml` draait bij elke push naar main: tests, dan `__BUILD__` in `sw.js` vervangen door de korte commit-hash, dan publiceren met `actions/upload-pages-artifact` en `actions/deploy-pages`. Alleen de app-bestanden gaan mee, tests en documentatie niet. Pages-bron staat op GitHub Actions (`build_type=workflow`).
