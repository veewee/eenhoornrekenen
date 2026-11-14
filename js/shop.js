import { UNI, sfx, burst } from "./core.js";
import { SLOTS, ITEMS, buyItem, toggleWear, uniHTML } from "./rewards.js";

const $ = s => document.querySelector(s);
const SLOT_NAMES = { hoofd: "Op je hoofd", ogen: "Voor je ogen", hals: "Rond je hals", vriendje: "Een vriendje", glans: "Glans" };
let ctx, armed = null, armTimer = null;

function render(){
  const p = ctx.player(), o = p.outfits[p.pick] || {};
  $("#purse").textContent = `✨ ${p.glitters}`;
  $("#purse").setAttribute("aria-label", `Je hebt ${p.glitters} glitters`);
  $("#shopUni").innerHTML = uniHTML(p, p.pick);
  $("#shopWho").textContent = `Je kleedt ${UNI[p.pick][0]} aan.`;
  $("#shopPick").innerHTML = UNI.slice(0, p.unicorns).map((u, i) =>
    `<button class="uni" data-i="${i}" aria-pressed="${p.pick === i}" aria-label="${u[0]}">${uniHTML(p, i)}</button>`).join("");
  $("#shopItems").innerHTML = SLOTS.map(slot => {
    const tiles = ITEMS.filter(it => it.slot === slot && (it.price !== null || p.closet[it.id])).map(it => tile(p, o, it));
    if (slot === "hoofd" && !p.closet.kroon) tiles.push(`<button class="item poor" disabled><span class="em">👑</span><b>Kroontje</b><small>Win een tempo-record</small></button>`);
    return `<h2>${SLOT_NAMES[slot]}</h2><div class="items">${tiles.join("")}</div>`;
  }).join("");
}

function tile(p, o, it){
  const own = !!p.closet[it.id], worn = o[it.slot] === it.id;
  let cls = "item", note;
  if (own) note = worn ? "Draag je nu" : "Van jou";
  else if (armed === it.id){ cls += " armed"; note = `Kopen voor ${it.price} ✨? Tik nog eens`; }
  else if (p.glitters < it.price){ cls += " poor"; note = `Nog ${it.price - p.glitters} ✨ sparen`; }
  else note = `${it.price} ✨`;
  const label = own ? `${it.name}, ${worn ? "uitdoen" : "aandoen"}` : `${it.name}, ${note}`;
  return `<button class="${cls}" data-id="${it.id}" ${own ? `aria-pressed="${worn}"` : ""} aria-label="${label}"><span class="em" aria-hidden="true">${it.emoji}</span><b>${it.name}</b><small>${note}</small></button>`;
}

function disarm(){ clearTimeout(armTimer); armed = null; }

export function openShop(){
  disarm();
  render();
  ["pick", "name", "home", "plusmin", "tafels", "play", "end", "parent"].forEach(s => $("#" + s).hidden = true);
  $("#shop").hidden = false;
  scrollTo(0, 0);
}

export function initShop(c){
  ctx = c;
  $("#shopBack").addEventListener("click", () => { disarm(); $("#shop").hidden = true; ctx.onClose(); });
  $("#shopPick").addEventListener("click", e => {
    const b = e.target.closest(".uni"); if (!b) return;
    ctx.player().pick = +b.dataset.i; disarm(); ctx.persist(); sfx("tap"); render();
  });
  $("#shopItems").addEventListener("click", e => {
    const b = e.target.closest(".item"); if (!b || b.disabled) return;
    const p = ctx.player(), id = b.dataset.id, it = ITEMS.find(x => x.id === id);
    if (p.closet[id]){ disarm(); toggleWear(p, p.pick, id); ctx.persist(); sfx("tap"); render(); return; }
    if (p.glitters < it.price){ sfx("bad"); return; }
    // Buying takes a second tap so a stray tap never spends glitters.
    if (armed !== id){
      disarm(); armed = id; sfx("tap"); render();
      armTimer = setTimeout(() => { armed = null; render(); }, 4000);
      return;
    }
    disarm();
    if (buyItem(p, id)){
      toggleWear(p, p.pick, id);
      ctx.persist(); sfx("good");
      const r = $("#shopUni").getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 30, 7);
    }
    render();
    const again = $(`#shopItems .item[data-id="${id}"]`); if (again) again.focus();
  });
}
