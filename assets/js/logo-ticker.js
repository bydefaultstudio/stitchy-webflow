/**
 * Script Purpose: Stitchy London — Logo ticker. Mounts a continuous,
 *                 auto-scrolling marquee of client logos on every
 *                 `.logo-ticker .splide` (SplideJS + AutoScroll), and
 *                 EQUAL-AREA-sizes each logo so wide, tall and square logos
 *                 occupy the same visual footprint — whatever a client uploads.
 *                 Desktop sizes are in vw so logos scale with the viewport like
 *                 the type scale (--font-* are vw); ≤600px sizes are fixed rem,
 *                 mirroring the type tokens' rem fallback. Self-guards on
 *                 presence; pauses for reduced motion. Distinct from the
 *                 CSS-only text `.ticker` ("No egos…").
 *
 *                 Webflow-editable attributes on the `.logo-ticker` wrapper —
 *                 all optional, all small 1-based numbers like the speed knob:
 *                   data-ticker-speed         → desktop scroll speed (default 1; negative reverses, 0 stops)
 *                   data-ticker-speed-mobile  → ≤600px scroll speed (default 1.2)
 *                   data-ticker-size          → desktop logo size (default 1; 2 = twice as big, 0.5 = half)
 *                   data-ticker-size-mobile   → ≤600px logo size (default 1)
 * Author: Erlen Masson
 * Version: 1.4.0
 * Created: 6 June 2026
 * Last Updated: 7 June 2026
 */

(function () {
  "use strict";

  // Defaults when the wrapper carries no matching data-ticker-* attribute.
  var DEFAULT_SPEED = 1; // desktop px/frame
  var DEFAULT_SPEED_MOBILE = 1.2; // ≤600px px/frame
  var DEFAULT_SIZE = 1; // desktop logo size scale (1 = default)
  var DEFAULT_SIZE_MOBILE = 1; // ≤600px logo size scale

  // Equal-area footprint (NOT exposed — the client tunes the linear
  // `data-ticker-size` scale instead) + per-logo clamps that stop an extreme
  // aspect ratio running away, bundled as a desktop/mobile profile pair:
  //   DESKTOP is in vw, so logos scale with the viewport exactly like the type
  //   scale (--font-* are vw); MOBILE is in rem (fixed) ≤600px, mirroring the
  //   type tokens' rem fallback. Desktop vw values are calibrated to match the
  //   previous rem look at 1440px (1vw = 14.4px), then grow/shrink from there.
  //   area = footprint at scale 1 (unit²); minH/maxH/maxW = per-logo clamps
  //   (unit, ×scale so the knob keeps headroom); gap = space between logos.
  var DESKTOP = { area: 11.1, minH: 1.39, maxH: 3.33, maxW: 12.22, gap: "2.78vw", unit: "vw" };
  var MOBILE = { area: 5, minH: 1.25, maxH: 3, maxW: 11, gap: "1.5rem", unit: "rem" };

  // Keep a stray data-ticker-size typo (e.g. 50) from producing absurd logos.
  var MIN_SIZE = 0.1;
  var MAX_SIZE = 5;

  var MOBILE_QUERY = "(max-width: 600px)";

  // Guard: Splide ships from the CDN above this script. Bail quietly (logos
  // still render, contained by the CSS fallback) rather than throwing.
  if (typeof Splide === "undefined") {
    console.warn("logo-ticker: Splide not loaded, skipping init");
    return;
  }

  console.log("Script - Logo Ticker v1.4.0 (Stitchy)");

  // AutoScroll registers itself on window.splide.Extensions when its script
  // loads. Cache it once; if it's missing the ticker still mounts, just static.
  var AutoScroll =
    (window.splide && window.splide.Extensions && window.splide.Extensions.AutoScroll) || null;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  // Read a numeric attribute off the wrapper; absent/blank/non-numeric → fallback.
  function attrNumber(el, name, fallback) {
    var value = parseFloat(el.getAttribute(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // Intrinsic aspect ratio (w/h): an <img>'s natural size, or an <svg>'s
  // viewBox. Returns 0 when unknown so the CSS contain-box governs instead.
  function logoRatio(el) {
    if (el.tagName.toLowerCase() === "img") {
      return el.naturalWidth > 0 && el.naturalHeight > 0 ? el.naturalWidth / el.naturalHeight : 0;
    }
    var box = el.viewBox && el.viewBox.baseVal;
    if (box && box.width > 0 && box.height > 0) return box.width / box.height;
    var attr = el.getAttribute("viewBox");
    if (attr) {
      var parts = attr.split(/[\s,]+/);
      var w = parseFloat(parts[2]);
      var h = parseFloat(parts[3]);
      if (w > 0 && h > 0) return w / h;
    }
    return 0;
  }

  // Equal-area sizing, then a linear `scale` (data-ticker-size). The footprint
  // height is √(profile.area / ratio) so every logo shares one visual area;
  // ×scale resizes the whole group linearly (scale 2 → twice as tall/wide).
  // Clamps scale with `scale` to keep headroom; units come from the profile
  // (vw desktop / rem mobile); maxWidth/Height cleared inline so the global.css
  // fallback caps never clip a JS-sized logo.
  function sizeLogo(el, profile, scale) {
    var ratio = logoRatio(el);
    if (!ratio) return;
    var h = Math.sqrt(profile.area / ratio) * scale;
    h = clamp(h, profile.minH * scale, profile.maxH * scale);
    var w = h * ratio;
    var maxW = profile.maxW * scale;
    if (w > maxW) {
      w = maxW;
      h = w / ratio;
    }
    el.style.height = h + profile.unit;
    el.style.width = w + profile.unit;
    el.style.maxHeight = "none";
    el.style.maxWidth = "none";
  }

  // All logo elements in a ticker — the client <img> (Logo field) and/or an
  // inline <svg> (the svg-code embed). Loop clones are sized too (harmless: same
  // source → same size), so there's no need to filter them out.
  function logoEls(splideEl) {
    return Array.prototype.slice.call(splideEl.querySelectorAll("img, .svg-code > svg"));
  }

  function sizeAll(splideEl, profile, scale) {
    logoEls(splideEl).forEach(function (el) {
      sizeLogo(el, profile, scale);
    });
  }

  // Resolve once every <img> has its natural size (decode/load), so equal-area
  // can measure before Splide mounts. SVGs are synchronous, so skipped here.
  function imagesReady(splideEl) {
    var imgs = logoEls(splideEl).filter(function (el) {
      return el.tagName.toLowerCase() === "img";
    });
    return Promise.all(
      imgs.map(function (img) {
        img.loading = "eager"; // a ticker shouldn't lazy-load its own logos
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        if (img.decode) return img.decode().catch(function () {});
        return new Promise(function (resolve) {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      })
    );
  }

  function mountTicker(splideEl) {
    var wrapper = splideEl.closest(".logo-ticker") || splideEl;
    var speed = attrNumber(wrapper, "data-ticker-speed", DEFAULT_SPEED);
    var speedMobile = attrNumber(wrapper, "data-ticker-speed-mobile", DEFAULT_SPEED_MOBILE);
    var size = clamp(attrNumber(wrapper, "data-ticker-size", DEFAULT_SIZE), MIN_SIZE, MAX_SIZE);
    var sizeMobile = clamp(
      attrNumber(wrapper, "data-ticker-size-mobile", DEFAULT_SIZE_MOBILE),
      MIN_SIZE,
      MAX_SIZE
    );

    function applySizes() {
      if (isMobile()) sizeAll(splideEl, MOBILE, sizeMobile);
      else sizeAll(splideEl, DESKTOP, size);
    }

    imagesReady(splideEl).then(function () {
      applySizes(); // before mount so autoWidth measures the real per-logo widths

      var ticker = new Splide(splideEl, {
        type: "loop",
        autoWidth: true,
        arrows: false,
        pagination: false,
        drag: false,
        gap: DESKTOP.gap,
        autoScroll: {
          autoStart: Boolean(AutoScroll) && !prefersReducedMotion(),
          speed: speed,
          pauseOnHover: false,
        },
        breakpoints: {
          600: {
            gap: MOBILE.gap,
            autoScroll: { speed: speedMobile },
          },
        },
      });

      ticker.mount(AutoScroll ? { AutoScroll: AutoScroll } : {});

      // Desktop logo widths are vw, so Splide (autoWidth) must re-measure on any
      // desktop resize, not just at a bucket flip. A flip also re-applies sizes
      // because the unit changes (vw ↔ rem); a no-flip resize below 600px needs
      // nothing — those sizes are fixed rem.
      var wasMobile = isMobile();
      var resizeTimer = null;
      window.addEventListener("resize", function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function apply() {
          var nowMobile = isMobile();
          var flipped = nowMobile !== wasMobile;
          wasMobile = nowMobile;
          if (flipped) applySizes();
          if (flipped || !nowMobile) ticker.refresh();
        }, 200);
      });
    });
  }

  function initLogoTicker() {
    var tickers = document.querySelectorAll(".logo-ticker .splide");
    if (!tickers.length) return;
    if (!AutoScroll) {
      console.warn("logo-ticker: AutoScroll extension not loaded — logos will be static");
    }
    tickers.forEach(mountTicker);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLogoTicker);
  } else {
    initLogoTicker();
  }
})();
