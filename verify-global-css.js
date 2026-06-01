#!/usr/bin/env node
/*
  verify-global-css.js — semantic diff of two CSS files.

  Compares the generated global.css against a reference by selector → declaration
  set (order- and comment-insensitive, @media / @keyframes context-qualified), so
  property reordering and section reordering don't register as differences.

  Reports, per selector key:
    =  identical       (same declaration set)
    +  generated-only  (extra rule — expected redundancy in a replication layer)
    Δ  generated wider (a superset — generated keeps native props too)
    !  reference-only / conflicting  (something the generated file LOST — investigate)

  Run: node verify-global-css.js <generated.css> <reference.css>
*/

const fs = require("fs");

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

// Flatten CSS into Map<selectorKey, Set<declaration>>; recurses @media/@keyframes.
function parse(css, ctx, out) {
  css = ctx ? css : stripComments(css);
  let i = 0;
  const n = css.length;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    let j = i;
    while (j < n && css[j] !== "{" && css[j] !== "}") j++;
    if (css[j] !== "{") break;
    const prelude = css.slice(i, j).trim().replace(/\s+/g, " ");
    let depth = 0;
    let k = j;
    for (; k < n; k++) {
      if (css[k] === "{") depth++;
      else if (css[k] === "}") { depth--; if (depth === 0) { k++; break; } }
    }
    const body = css.slice(j + 1, k - 1);
    if (/^@(media|supports|keyframes)/.test(prelude)) {
      parse(body, ctx + prelude + " >> ", out);
    } else {
      const sel = prelude.split(",").map((s) => s.trim().replace(/\s+/g, " ")).sort().join(", ");
      const decls = body.split(";").map((d) => d.trim().replace(/\s+/g, " ")).filter(Boolean).sort();
      out.set(ctx + sel, new Set(decls));
    }
    i = k;
  }
  return out;
}

function setDiff(a, b) {
  return [...a].filter((x) => !b.has(x));
}

const [genPath, refPath] = process.argv.slice(2);
if (!genPath || !refPath) {
  console.error("Usage: node verify-global-css.js <generated.css> <reference.css>");
  process.exit(1);
}

const gen = parse(fs.readFileSync(genPath, "utf8"), "", new Map());
const ref = parse(fs.readFileSync(refPath, "utf8"), "", new Map());

const identical = [];
const wider = [];
const conflicting = [];
const generatedOnly = [];

for (const [sel, gd] of gen) {
  if (!ref.has(sel)) { generatedOnly.push(sel); continue; }
  const rd = ref.get(sel);
  const missingFromGen = setDiff(rd, gd); // ref decls the generated lacks
  const extraInGen = setDiff(gd, rd);      // generated decls not in ref
  if (missingFromGen.length === 0 && extraInGen.length === 0) identical.push(sel);
  else if (missingFromGen.length === 0) wider.push({ sel, extraInGen });
  else conflicting.push({ sel, missingFromGen, extraInGen });
}
const referenceOnly = [...ref.keys()].filter((s) => !gen.has(s));

const line = (s) => "    " + s;
console.log(`\n= identical: ${identical.length}`);
identical.forEach((s) => console.log(line(s)));

console.log(`\nΔ generated wider (keeps native props too): ${wider.length}`);
wider.forEach(({ sel, extraInGen }) => {
  console.log(line(sel));
  extraInGen.forEach((d) => console.log(line("    + " + d)));
});

console.log(`\n+ generated-only selectors (redundant native rules): ${generatedOnly.length}`);
generatedOnly.forEach((s) => console.log(line(s)));

console.log(`\n! conflicting (generated LOST a declaration — investigate): ${conflicting.length}`);
conflicting.forEach(({ sel, missingFromGen, extraInGen }) => {
  console.log(line(sel));
  missingFromGen.forEach((d) => console.log(line("    - " + d)));
  extraInGen.forEach((d) => console.log(line("    + " + d)));
});

console.log(`\n! reference-only selectors (in reference, NOT generated): ${referenceOnly.length}`);
referenceOnly.forEach((s) => console.log(line(s)));

const ok = conflicting.length === 0 && referenceOnly.length === 0;
console.log(`\n${ok ? "✓ No declarations lost — generated covers the reference." : "✗ Coverage gaps above."}`);
process.exit(ok ? 0 : 1);
