<!-- Stitchy London — Webflow Custom Code (pinned @v1.3; bump the tag each release) -->

---
Global Header
---

<!-- JS-Available Guard -->
<script>document.documentElement.classList.add("js");</script>

<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

<!-- Custom CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/css/global.css">

<!-- BD Animation -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/css/bd-animations.css">

<!-- Cursor CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/css/bd-cursor.css">

<!-- Cursor overlay token bridge -->
<style>
  :root{
    --text-accent:#d3ff6b;   --text-primary:#171c17;
    --alpha-5:transparent 95%;  --alpha-10:transparent 90%;
    --alpha-20:transparent 80%; --alpha-50:transparent 50%;
    --alpha-90:transparent 10%;
    --duration-2xs:100ms;       --ease-out:cubic-bezier(0.16,1,0.3,1);
  }
</style>


---
Global Footer
---

<!-- BD Animations -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/js/bd-animations.js"></script>

<!-- Site Nav -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/js/site-nav.js"></script>

<!-- Post-it -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/js/postit.js"></script>

<!-- Custom Cursor -->
<div class="cursor-label">
  <span class="cursor-label-icon cursor-label-icon-lead"><svg><use href="#placeholder"></use></svg></span>
  <span class="cursor-label-text"></span>
  <span class="cursor-label-icon cursor-label-icon-end"><svg><use href="#placeholder"></use></svg></span>
</div>
<div class="cursor-halo"></div>
<script>window.BD_CURSOR_SPRITE = "https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/images/cursors/cursor-sprite.svg";</script>
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/js/bd-cursor.js"></script>


---
Homepage — Head
---

<!-- Splide core CSS (logo ticker) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide-core.min.css">


---
Homepage — Footer
---

<!-- Splide + AutoScroll (must load before logo-ticker.js) -->
<script src="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@splidejs/splide-extension-auto-scroll@0.5.3/dist/js/splide-extension-auto-scroll.min.js"></script>

<!-- Logo Ticker -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/js/logo-ticker.js"></script>

<!-- Homepage -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/js/homepage.js"></script>


---
Our Science — Footer
---

<!-- Matter.js -->
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20/build/matter.min.js"></script>

<!-- Our Science -->
<script src="https://cdn.jsdelivr.net/gh/bydefaultstudio/stitchy-webflow@v1.3/assets/js/our-science.js"></script>


---
Styleguide Page — Head (do NOT add site-wide)
---

<!-- Paste the <style id="sg-embed"> block from styleguide.html's head. -->
