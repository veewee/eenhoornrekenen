/* Glitters, verrassingseenhoorns, kast en outfits. Puur en zonder DOM, zodat node --test het kan importeren. */
import { UNI } from "./core.js";

export const SLOTS = ["hoofd", "ogen", "hals", "vriendje", "glans"];

export const ITEMS = [
  { id: "strik", emoji: "🎀", name: "Strik", slot: "hoofd", price: 30 },
  { id: "bloem", emoji: "🌸", name: "Bloem", slot: "hoofd", price: 30 },
  { id: "madeliefje", emoji: "🌼", name: "Madeliefje", slot: "hoofd", price: 40 },
  { id: "zonnehoed", emoji: "👒", name: "Zonnehoed", slot: "hoofd", price: 80 },
  { id: "hogehoed", emoji: "🎩", name: "Hoge hoed", slot: "hoofd", price: 100 },
  { id: "kroon", emoji: "👑", name: "Kroontje", slot: "hoofd", price: null },
  { id: "bril", emoji: "👓", name: "Bril", slot: "ogen", price: 50 },
  { id: "zonnebril", emoji: "🕶️", name: "Zonnebril", slot: "ogen", price: 70 },
  { id: "lintje", emoji: "🎗️", name: "Lintje", slot: "hals", price: 50 },
  { id: "sjaal", emoji: "🧣", name: "Sjaal", slot: "hals", price: 60 },
  { id: "medaille", emoji: "🏅", name: "Medaille", slot: "hals", price: 90 },
  { id: "lieveheersbeestje", emoji: "🐞", name: "Lieveheersbeestje", slot: "vriendje", price: 40 },
  { id: "kuikentje", emoji: "🐤", name: "Kuikentje", slot: "vriendje", price: 60 },
  { id: "bijtje", emoji: "🐝", name: "Bijtje", slot: "vriendje", price: 60 },
  { id: "vlinder", emoji: "🦋", name: "Vlinder", slot: "vriendje", price: 80 },
  { id: "fonkels", emoji: "✨", name: "Fonkels", slot: "glans", price: 120 },
  { id: "regenboog", emoji: "🌈", name: "Regenboog", slot: "glans", price: 150 }
];
const BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const item = id => BY_ID[id];

export const DRY_GUARANTEE = 4;

export function glittersFor({ mode, stars = 0, timedOut = false, newRecord = false, newBadges = 0 }){
  const base = mode === "tempo" ? (timedOut ? 5 : 20) : 5 + 5 * stars;
  return base + (newRecord ? 10 : 0) + 30 * newBadges;
}

export function unicornChance(stars){ return stars >= 3 ? .6 : stars === 2 ? .4 : .25; }

export function rollUnicorn(stars, dry, rand = Math.random){
  return dry >= DRY_GUARANTEE || rand() < unicornChance(stars);
}

export function buyItem(p, id){
  const it = BY_ID[id];
  if (!it || it.price === null || p.closet[id] || p.glitters < it.price) return false;
  p.glitters -= it.price;
  p.closet[id] = Date.now();
  return true;
}

export function toggleWear(p, uni, id){
  const it = BY_ID[id];
  if (!it || !p.closet[id]) return;
  const o = p.outfits[uni] || (p.outfits[uni] = {});
  if (o[it.slot] === id) delete o[it.slot]; else o[it.slot] = id;
}

export function grantCrown(p){
  if (!p.closet.kroon) p.closet.kroon = Date.now();
  (p.outfits[p.pick] || (p.outfits[p.pick] = {})).hoofd = "kroon";
}

export function uniHTML(p, i, cls = ""){
  const filter = (UNI[i] && UNI[i][1]) || "none";
  const o = p.outfits[i] || {};
  const worn = SLOTS.filter(s => BY_ID[o[s]]).map(s => `<span class="wear w-${s}" aria-hidden="true">${BY_ID[o[s]].emoji}</span>`).join("");
  return `<span class="unicorn ${cls}"><span class="face" style="filter:${filter}">🦄</span>${worn}</span>`;
}
