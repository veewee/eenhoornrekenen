import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);

test("elk app-bestand staat in de cachelijst, zodat de app offline werkt", () => {
  const sw = readFileSync(new URL("sw.js", root), "utf8");
  const files = ["index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png",
    ...readdirSync(new URL("js/", root)).filter(f => f.endsWith(".js")).map(f => "js/" + f)];
  for (const f of files) assert.ok(sw.includes(`"./${f}"`), `${f} ontbreekt in sw.js`);
  assert.ok(sw.includes("__BUILD__"), "placeholder voor de deploy ontbreekt");
});
