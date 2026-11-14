export const MINUS = "−";

export const LEVELS = [
  {id:"v10", name:"Vriendjes van 10", ex:"7 + ? = 10", col:"var(--pink)"},
  {id:"p10", name:"Plus tot 10", ex:"4 + 3", col:"var(--sun)"},
  {id:"m10", name:"Min tot 10", ex:"9 " + MINUS + " 5", col:"var(--mint)"},
  {id:"x10", name:"Plus en min tot 10", ex:"door elkaar", col:"var(--blue)"},
  {id:"z20", name:"Tot 20, zonder brug", ex:"13 + 4 en 17 " + MINUS + " 5", col:"var(--lilac)"},
  {id:"b20", name:"Tot 20, over de brug", ex:"8 + 5 en 13 " + MINUS + " 6", col:"var(--pink)"},
  {id:"a20", name:"Alles tot 20", ex:"de grote uitdaging", col:"var(--sun)"}
];

// The key format a+op+b+hide is what v1 stored its hard weights under; keep it so migrated weights still match.
function fact(a, op, b, hide, w){ const c = op === "+" ? a + b : a - b; return {a, op, b, c, hide:hide||"c", w:w||1, key:a+op+b+(hide||"c")}; }

export function levelFacts(id){
  const out = [];
  const p10 = () => { for (let a=0;a<=10;a++) for (let b=0;b<=10-a;b++){ if (a+b===0) continue; out.push(fact(a,"+",b,"c",(a===0||b===0)?.35:1)); } };
  const m10 = () => { for (let a=1;a<=10;a++) for (let b=0;b<=a;b++) out.push(fact(a,"-",b,"c",(b===0||b===a)?.35:1)); };
  const z20 = w => { for (let t=0;t<=8;t++){ const a=10+t; for (let b=1;b<=9-t;b++){ out.push(fact(a,"+",b,"c",w)); out.push(fact(b,"+",a,"c",w*.5)); } }
                     for (let a=11;a<=19;a++) for (let b=1;b<=a-10;b++) out.push(fact(a,"-",b,"c",w)); };
  const b20 = w => { for (let a=2;a<=9;a++) for (let b=2;b<=9;b++) if (a+b>10) out.push(fact(a,"+",b,"c",w));
                     for (let a=11;a<=18;a++) for (let b=2;b<=9;b++) if (b>a-10) out.push(fact(a,"-",b,"c",w)); };
  if (id==="v10") for (let a=0;a<=10;a++) out.push(fact(a,"+",10-a,"b",(a===0||a===10)?.3:1));
  if (id==="p10") p10();
  if (id==="m10") m10();
  if (id==="x10"){ p10(); m10(); }
  if (id==="z20") z20(1);
  if (id==="b20") b20(1);
  if (id==="a20"){ p10(); m10(); out.forEach(f => f.w *= .3); z20(.7); b20(1.3); }
  return out;
}

export function helpPlusmin(f){
  const n = Math.max(f.a, f.c) > 10 ? 20 : 10, cells = Array(n).fill("");
  let hint = "";
  for (let i=0;i<f.a;i++) cells[i] = "p";
  if (f.op === "+"){
    if (f.hide === "b") hint = "Hoeveel lege vakjes zijn er nog?";
    else {
      for (let i=f.a;i<f.a+f.b;i++) cells[i] = "m";
      const big = Math.max(f.a,f.b), small = Math.min(f.a,f.b);
      if (f.c > 10 && big < 10){ const fill = 10 - big; hint = (f.a < f.b ? `Draai om: ${big} + ${small}. ` : "") + `${big} + ${fill} = 10, en dan nog ${small-fill} erbij.`; }
      else if (f.c > 10) hint = `Kijk naar de eenheden: ${big%10} + ${small}.`;
      else hint = "Hoeveel zijn het er samen?";
    }
  } else {
    for (let i=f.a-f.b;i<f.a;i++) cells[i] = "x";
    if (f.a > 10 && f.c < 10){ const s = f.a - 10; hint = `${f.a} ${MINUS} ${s} = 10, en dan nog ${f.b-s} eraf.`; }
    else if (f.a > 10) hint = `Kijk naar de eenheden: ${f.a%10} ${MINUS} ${f.b}.`;
    else hint = "Hoeveel blijven er over?";
  }
  let html = '<div class="frames">';
  for (let fr=0; fr<n/10; fr++){ html += '<div class="frame">' + cells.slice(fr*10, fr*10+10).map(c => `<span class="cell ${c}"></span>`).join("") + "</div>"; }
  return html + `</div><p class="hint">${hint}</p>`;
}

export const plusmin = {
  id: "plusmin",
  name: "Plus en min",
  levels: LEVELS,
  facts: cfg => levelFacts(cfg.level),
  help: helpPlusmin
};
