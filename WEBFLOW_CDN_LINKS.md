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

<!-- TRANSITION: style.css still ships below so global.css's --tokens resolve while
     the native build is in progress. Once the DS layer is fully native in Webflow,
     REMOVE this line and paste the :root token block into the header as a <style>
     embed (see the NOTE block at the bottom). -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/css/style.css">

<!-- (bd-cursor cut for Phase 1 — no bd-cursor.css / token bridge) -->


---
Global Footer
---

<!-- GSAP -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/SplitText.min.js"></script>

<!-- Lottie -->
<script src="https://cdn.jsdelivr.net/npm/lottie-web@5/build/player/lottie_light.min.js"></script>

<!-- BD Animations -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/js/bd-animations.js"></script>

<!-- Site Nav (mobile burger) -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/js/site-nav.js"></script>

<!-- Site Loader -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@main/assets/js/site-loader.js"></script>


---
Homepage Footer
---

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
