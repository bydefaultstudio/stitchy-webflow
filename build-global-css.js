#!/usr/bin/env node
/*
  build-global-css.js — generate global.css from style.css.

  style.css is the single source of truth (local tokens, full prototype). This
  script extracts the rules that can't be authored natively in Webflow, renames
  local tokens to the Webflow Variable (--_) names, maps local asset paths to
  Webflow CDN URLs, and writes global.css (the file embedded in the live site).

  Three transforms:
    1. Region extract   — emit only rules inside the @global:start … @global:end
                          markers; an @global:skip comment drops the next rule.
    2. Token rename      — local design tokens → Webflow --_ names (TOKEN_MAP).
    3. Asset-URL map     — local sticker paths → Webflow CDN URLs (ASSET_MAP).

  Whole rules are kept as-is: global.css is a replication layer, so a rule that
  could be native is harmless redundancy (migrate it natively later, then drop
  the @global markers). Skip only rules whose inclusion would change behaviour.

  Phase A: only the motion clusters are annotated, so OUT is a scratch file
  (build/global.css) for verification — NOT the live assets/css/global.css.
  Phase B: once style.css carries every @global cluster, point OUT at
  assets/css/global.css and this becomes the single build step.

  Run: node build-global-css.js
*/

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "assets/css/style.css");
const OUT = path.join(__dirname, "build/global.css");


/* ------ TOKEN MAP (local → Webflow --_) ------ */

const TOKEN_MAP = {};
const map = (local, webflow) => { TOKEN_MAP[local] = webflow; };

// Spacing
["none", "2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "8xl", "10xl", "12xl", "14xl"]
  .forEach((k) => map(`--space-${k}`, `--_spacing---space--${k}`));

// Colour — backgrounds / text / border colours
["primary", "secondary", "plain", "faded", "accent", "white", "green", "orange", "blue", "dark"]
  .forEach((k) => map(`--background-${k}`, `--_color---background--${k}`));
["primary", "secondary", "plain", "faded", "accent", "link", "inverted"]
  .forEach((k) => map(`--text-${k}`, `--_color---text--${k}`));
["primary", "secondary", "faded"]
  .forEach((k) => map(`--border-${k}`, `--_color---border--${k}`));

// Border widths / radius (source uses --border-s/m/l for width, --radius-* for radius)
["s", "m", "l"].forEach((k) => map(`--border-${k}`, `--_border---width--${k}`));
["xs", "s", "pill"].forEach((k) => map(`--radius-${k}`, `--_border---radius--${k}`));

// Type — sizes / weights / line-heights / family
["2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "6xl"]
  .forEach((k) => map(`--font-${k}`, `--_type---size--font-${k}`));
["xs", "s", "m", "xl"].forEach((k) => map(`--font-headline-${k}`, `--_type---size--font-headline-${k}`));
["light", "regular", "medium", "semi-bold", "bold", "extra-bold"]
  .forEach((k) => map(`--font-weight-${k}`, `--_type---weight--${k}`));
["s", "m", "l", "xl"].forEach((k) => map(`--line-height-${k}`, `--_type---line-height--${k}`));
map("--font-primary", "--_type---family--mona-sans");
map("--font-tertiary", "--_type---family--mona-sans");

// Local/runtime custom properties that are NOT design tokens — keep verbatim.
const RUNTIME_VARS = new Set([
  "--bd-stack-overlap", "--sticker-rotation", "--sticker-image",
  "--grid-gap", "--icon-size", "--orb-size", "--six-things-padding",
]);


/* ------ ASSET MAP (local path → Webflow CDN URL) ------ */
/* Empty for the motion clusters (no asset URLs). Phase B fills this from the
   sticker filename → CDN URL table when the sticker cluster is annotated. */
const ASSET_MAP = {};


/* ------ TRANSFORMS ------ */

function renameTokens(css) {
  // Longest-first + a trailing identifier boundary so e.g. --border-s never
  // matches inside --border-secondary.
  const entries = Object.entries(TOKEN_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [local, webflow] of entries) {
    css = css.replace(new RegExp(local + "(?![\\w-])", "g"), webflow);
  }
  return css;
}

function mapAssets(css) {
  for (const [local, url] of Object.entries(ASSET_MAP)) {
    css = css.split(local).join(url);
  }
  return css;
}

// Split a region's inner CSS into top-level rules, honouring @global:skip and
// dropping all comments. Brace-aware so @media / @keyframes blocks stay whole.
function rulesInRegion(inner) {
  const rules = [];
  let i = 0;
  let skipNext = false;
  const n = inner.length;
  while (i < n) {
    if (/\s/.test(inner[i])) { i++; continue; }
    if (inner[i] === "/" && inner[i + 1] === "*") {
      const end = inner.indexOf("*/", i + 2);
      const comment = inner.slice(i, end < 0 ? n : end + 2);
      if (/@global:skip\b/.test(comment)) skipNext = true;
      i = end < 0 ? n : end + 2;
      continue;
    }
    const start = i;
    let depth = 0;
    let opened = false;
    while (i < n) {
      if (inner[i] === "/" && inner[i + 1] === "*") {
        const e = inner.indexOf("*/", i + 2);
        i = e < 0 ? n : e + 2;
        continue;
      }
      if (inner[i] === "{") { depth++; opened = true; }
      else if (inner[i] === "}") { depth--; if (opened && depth === 0) { i++; break; } }
      i++;
    }
    const rule = inner.slice(start, i).trim();
    if (skipNext) skipNext = false;
    else if (rule) rules.push(rule);
  }
  return rules;
}

// Warn on any var(--token) that survived without a mapping — catches a token
// missing from TOKEN_MAP. --_ names and known runtime vars are expected.
function unmappedTokens(css) {
  const found = new Set();
  for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
    const name = m[1];
    if (!name.startsWith("--_") && !RUNTIME_VARS.has(name)) found.add(name);
  }
  return [...found];
}


/* ------ BUILD ------ */

function build() {
  const src = fs.readFileSync(SRC, "utf8");

  const REGION_RE = /@global:start\b\s*:?\s*([^*]*?)\s*\*\/([\s\S]*?)\/\*\s*@global:end\b[^*]*\*\//g;
  const sections = [];
  let match;
  while ((match = REGION_RE.exec(src)) !== null) {
    const label = (match[1] || "").trim();
    const rules = rulesInRegion(match[2]);
    sections.push({ label, rules });
  }

  if (sections.length === 0) {
    console.error("No @global regions found in style.css — nothing to build.");
    process.exit(1);
  }

  const header =
    "/*\n" +
    "  global.css — GENERATED by build-global-css.js from style.css. Do not edit by hand.\n" +
    "  Holds the rules Webflow can't author natively; tokens reference Webflow\n" +
    "  Variables by their generated --_ names. Ships to the live site.\n" +
    "*/\n";

  let body = "";
  for (const { label, rules } of sections) {
    const css = mapAssets(renameTokens(rules.join("\n\n")));
    const title = label ? label.toUpperCase() : "GLOBAL";
    body += `\n\n/* ------ ${title} ------ */\n\n${css}\n`;
  }

  const output = header + body + "\n";
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, output);

  const warnings = unmappedTokens(output);
  console.log(`Wrote ${path.relative(__dirname, OUT)}`);
  for (const { label, rules } of sections) {
    console.log(`  ${(label || "GLOBAL").padEnd(16)} ${rules.length} rule(s)`);
  }
  if (warnings.length) {
    console.warn(`\n⚠ Unmapped tokens (add to TOKEN_MAP): ${warnings.join(", ")}`);
  } else {
    console.log("\n✓ All tokens mapped.");
  }
}

build();
