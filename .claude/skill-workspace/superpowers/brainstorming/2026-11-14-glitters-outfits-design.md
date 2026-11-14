# Glitters, outfits en verrassingseenhoorns

## Intent

Eenhoornrekenen (zie `CLAUDE.md`) is een rekenspel voor een kind in de lagere school. Nu krijgt ze na elke uitgespeelde oefenronde een nieuwe eenhoorn, tot de stal met 12 eenhoorns vol is. Ze heeft er 5, dus binnen een week of twee is er niets meer te winnen behalve sterren en kroontjes. Ze houdt van aankleden en van outfits kopen. Het doel is dat elke ronde iets oplevert waar ze naar uitkijkt, zodat ze blijft oefenen.

## Goals

- Een kindvriendelijke munt, "glitters" (✨), die ze bij elke ronde verdient.
- Een winkel waar ze met glitters spulletjes koopt en haar eenhoorns ermee aankleedt.
- Eenhoorns worden een verrassing: een kans per ronde in plaats van elke ronde.
- In tempo verdient ze ook iets als ze alle oefeningen af heeft binnen de tijd.

## Non-goals

- Geen echt geld, geen advertenties, geen dagelijkse streaks of timers die druk zetten.
- Geen eigen tekeningen: alles blijft emoji, zoals nu.
- Eenhoorns kun je niet kopen, ze blijven een gratis verrassing.
- Het ouderscherm krijgt geen beheer van glitters (later eventueel).
- "Voortgang wissen" in het ouderscherm wist glitters, kast en outfits niet. De tekst bij die knop zegt dat ook.

## Anti-goals

- Nooit iets afpakken: glitters en gekochte spulletjes gaan nooit verloren, ook niet bij een slechte ronde.
- Geen "jammer, geen eenhoorn": als er geen eenhoorn komt, toont het eindscherm vrolijk wat ze wel kreeg.
- Geen lange pechreeksen: daarvoor is de garantie.

## Approaches

1. Emoji-spulletjes als laag bovenop de 🦄-emoji, zoals het kroontje nu (`.crowned::before`). Geen assets, de bestaande eenhoorns blijven gelijk, het werkt overal waar een eenhoorn staat. Nadeel: emoji verschillen per platform, dus posities worden afgestemd op Android (Noto Color Emoji), haar toestel. Gekozen.
2. Een eigen SVG-eenhoorn met kleding in lagen. Past precies en kan ook manen kleuren, maar verandert de eenhoorns die ze kent, kost veel meer werk en staat of valt met de tekenkwaliteit. Niet gekozen.
3. Spulletjes als stickers naast de eenhoorn. Snel, maar dat is verzamelen en geen aankleden. Niet gekozen.

## Beslist in het gesprek

### Glitters verdienen

| Gebeurtenis | Glitters |
|---|---|
| Oefenronde uitgespeeld | 5 + 5 per ster (dus 10, 15 of 20) |
| Tempo-ronde, alles af binnen de tijd | 20 |
| Tempo-ronde, tijd op | 5 |
| Nieuw tempo-record | +10 |
| Nieuw tafelkroontje (tafel geautomatiseerd) | +30 per kroontje |

Een ronde die gestopt wordt met ✕ levert niets op. Elke speler heeft een eigen spaarpot.

### Verrassingseenhoorns

Na een uitgespeelde oefenronde of een tempo-ronde die binnen de tijd af is, is er een kans op een nieuwe eenhoorn: 20% bij 1 ster, 30% bij 2 sterren, 40% bij 3 sterren. Met de garantie is dat gemiddeld één eenhoorn per 2,3 rondes bij 3 sterren en per 3,4 rondes bij 1 ster. (Eerst 25/40/60 voorgesteld, maar dat gaf 1,65 rondes bij 3 sterren, sneller dan beloofd.) Tempo binnen de tijd telt als 3 sterren. Na 4 zulke rondes zonder eenhoorn komt er bij de volgende gegarandeerd een. Een tempo-ronde waarbij de tijd op is, telt niet mee voor de kans en niet voor de teller. Als de stal vol is, valt dit weg. De nieuwe eenhoorn wordt zoals nu meteen de rijder.

### Winkel en outfits

- Spulletjes zijn emoji, elk in een vak (slot) op de eenhoorn. Per eenhoorn één spulletje per vak.
- Gekocht is van haar, voor altijd, en bruikbaar op elke eenhoorn. Elke eenhoorn onthoudt zijn eigen outfit.
- Prijzen tussen 30 en 150 glitters: gemiddeld ongeveer één aankoop per drie à vijf rondes, de duurste stukken zeven à tien rondes sparen.
- 👑 is een spulletje voor het hoofd dat je verdient met een tempo-record en niet kunt kopen. Bij het eerste record komt het in de kast en zet de app het meteen op de rijder. Daarna kiest ze per eenhoorn zelf of die het kroontje draagt of iets anders op het hoofd. Het kroontje vervangt dus de huidige vaste `.crowned`-laag.
- Spelers die nu al een kroontje hebben (`crown: true`), krijgen het in hun kast, en het staat op elke eenhoorn die ze hebben en die nog niets op het hoofd draagt. Zo verandert er voor haar niets zichtbaar.
- De outfit is zichtbaar overal waar een eenhoorn staat: startscherm, stal, rijder op de regenboog, eindscherm, kiesscherm.

Voorstel voor het assortiment (de bouwer mag het afstemmen, zie verder):

| Vak | Spulletjes (prijs) |
|---|---|
| Hoofd | 🎀 strik (30), 🌸 bloem (30), 🌼 madeliefje (40), 👒 zonnehoed (80), 🎩 hoge hoed (100) |
| Ogen | 👓 bril (50), 🕶️ zonnebril (70) |
| Hals | 🎗️ lintje (50), 🧣 sjaal (60), 🏅 medaille (90) |
| Vriendje | 🐞 lieveheersbeestje (40), 🐤 kuikentje (60), 🦋 vlinder (80), 🐝 bijtje (60) |
| Glans | ✨ fonkels (120), 🌈 regenboog (150) |

Alleen emoji uit Emoji 13 of ouder, zodat ze op oudere Android-toestellen ook bestaan.

## Constraints

Alle randvoorwaarden uit `CLAUDE.md` gelden: geen framework of dependencies, volledig offline, nieuwe bestanden in `SHELL` van `sw.js`, Vlaamse kindvriendelijke tekst ("oefeningen"), geen em dashes, prefers-reduced-motion, zichtbare focus, tikvlakken van minstens 48px, light en dark mode.

Opslag: de nieuwe velden per speler zijn additief met standaardwaarden in `normalizePlayer`, zodat bestaande v2-data zonder migratie blijft werken. Voorstel: `glitters` (getal), `closet` (`{itemId: tijdstip}`), `outfits` (`{eenhoornIndex: {vak: itemId}}`), `dry` (rondes zonder eenhoorn). De opslagversie blijft 2. Pas de regel in `CLAUDE.md` aan: additieve velden met standaardwaarden mogen zonder versieverhoging, al het andere niet.

## Overgelaten aan de bouwer

- De exacte posities van elk vak op de 🦄, afgestemd op Android Noto en gecontroleerd in de browser.
- Waar de winkel bereikbaar is (voorstel: een knop "Aankleden" bij de stal op het startscherm) en hoe het scherm eruitziet, binnen de bestaande stijl. Kopen gebeurt met een duidelijke bevestiging, zodat een kind niet per ongeluk koopt.
- Hoe het eindscherm de glitters en een eventuele eenhoorn toont.
- Pure functies voor de beloning (glitters per ronde, de kans op een eenhoorn met garantie) met `node --test`, met een injecteerbare random zoals `buildQueue` nu.
