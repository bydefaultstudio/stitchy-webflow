---
Global Header
---

<!-- JS-Available Guard -->
<script>document.documentElement.classList.add("js");</script>

<!-- Viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

<!-- Inline Tweaks -->
<style>
  * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .grecaptcha-badge { box-shadow: none !important; background: transparent !important; padding: 0 !important; border: none !important; width: auto !important; height: auto !important; bottom: auto !important; right: auto !important; }
</style>

<!-- Stitchy Styles -->
<!-- global.css = the can't-be-native layer (buttons, [data-grid], stickers). SHIPS. -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/css/global.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/css/bd-animations.css">

<!-- style.css NO LONGER SHIPS (decision 2026-05-31). global.css + the styleguide
     #sg-embed swatch CSS now reference Webflow Variables DIRECTLY by their generated
     names (--_color---*, --_spacing---space--*, --_border---radius--*/--_border---width--*,
     --_type---family/line-height/weight--*), so no token layer is needed. style.css
     stays the LOCAL prototype/spec stylesheet only. ⚠ This makes global.css Webflow-only
     (it won't style the standalone prototype HTML) and rename-fragile (renaming the
     Color/Spacing/Border/Type collections or groups breaks global.css). See memory
     global-css-reads-webflow-variables. -->

<!-- (bd-cursor cut for Phase 1 — no bd-cursor.css / token bridge) -->


---
Global Footer
---

<!-- GSAP + ScrollTrigger + SplitText: loaded by Webflow's native GSAP
     integration (head), NOT jsDelivr (decision 2026-06-01). They MUST expose
     window.gsap / ScrollTrigger / SplitText as globals — verify on the
     published site. bd-animations.js + site-loader.js depend on them. -->

<!-- Lottie: not loaded — the loader uses a native Webflow Lottie element
     (logo-line-svg.json) played by IX2; site-loader.js no longer injects one. -->

<!-- BD Animations -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/js/bd-animations.js"></script>

<!-- Site Nav (mobile burger) -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/js/site-nav.js"></script>

<!-- Site Loader (v1.5.0 — native-Lottie aware, 1.7s min-display floor) -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/js/site-loader.js"></script>


---
Homepage Head (Page Settings → Custom Code, head)
---

<!-- Splide core CSS — REQUIRED for the logo ticker layout (without it the
     slides stack vertically). Core only: no arrows/pagination theme needed. -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide-core.min.css">


---
Homepage Footer
---

<!-- Logo ticker — Splide core + AutoScroll extension. MUST load before
     logo-ticker.js. (Intersection extension from the old project is NOT needed.) -->
<script src="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@splidejs/splide-extension-auto-scroll@0.5.3/dist/js/splide-extension-auto-scroll.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/js/logo-ticker.js"></script>

<!-- Homepage Scripts -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/js/homepage.js"></script>


---
Our Science Footer
---

<!-- Matter.js -->
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20/build/matter.min.js"></script>

<!-- Our Science Scripts -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/js/our-science.js"></script>


---
Styleguide Page ONLY — do NOT add site-wide
---

<!-- The standalone styleguide.css file is RETIRED. The simplified native
     styleguide page needs only one small page-level block: the `#sg-embed`
     <style> from the HEAD of styleguide.html (swatch boxes + layout demo
     frames). For the hidden/noindex Webflow Styleguide page, copy that whole
     <style id="sg-embed"> block into Page Settings → Custom Code (head), or
     paste it into an Embed element on the page. It is STYLEGUIDE-ONLY — never
     add it to the Global Header / never recreate it as Webflow classes.
     Everything else on the styleguide page is built with native classes. -->


---
NOTE — delivery model (native-first)
---

Two parallel token systems (WEBFLOW_PLAN §8): Webflow **Variables** (added in the
Designer) power the **natively-built classes**; our CSS **--tokens** (`--space-*`,
`--font-*`, …) power the **shipped CSS** (`global.css`). Same values, independent —
Webflow's Variables do NOT expose `--space-m` to `global.css`.

- **`global.css`** — the can't-be-native layer (button + `[data-grid]` attribute APIs,
  `.sticker-add::before` artwork + geometry). SHIPS site-wide (header `<link>` above,
  or paste as an HTML embed). Contains no token definitions — it reads the --tokens.
- **`style.css`** — full spec + local prototype. SHIPS only during the transition so
  `global.css`'s --tokens resolve. Does NOT ship at the native end state.
- **`bd-animations.css`** — motion/FOUC engine (token-free). SHIPS site-wide.
- **End state (full native):** remove the `style.css` link above and add a header
  `<style>` embed containing the `:root` token block (base + the ≤991/≤767 overrides)
  so `global.css` + the motion JS still resolve their --tokens.
- **`styleguide.css`** — RETIRED/deleted. The simplified native styleguide carries its only demo CSS inline as the `#sg-embed` `<style>` block in `styleguide.html`'s head (paste page-level on the Webflow styleguide page; never site-wide).
