/**
 * Script Purpose: Stitchy London — Logo ticker. Mounts a continuous,
 *                 auto-scrolling marquee of client logos on every
 *                 `.logo-ticker .splide` (SplideJS + AutoScroll), and
 *                 EQUAL-AREA-sizes each logo so wide, tall and square logos
 *                 occupy the same visual footprint — whatever a client uploads.
 *                 Self-guards on presence; pauses for reduced motion. Distinct
 *                 from the CSS-only text `.ticker` ("No egos…").
 *
 *                 Webflow-editable attributes on the `.logo-ticker` wrapper (all
 *                 optional; defaults below; speed: negative reverses, 0 stops):
 *                   data-ticker-speed         → desktop scroll speed (px/frame)
 *                   data-ticker-speed-mobile  → ≤600px scroll speed
 *                   data-ticker-area          → desktop logo footprint (rem²; bigger = larger)
 *                   data-ticker-area-mobile   → ≤600px logo footprint
 * Author: Erlen Masson
 * Version: 1.2.0
 * Created: 6 June 2026
 * Last Updated: 6 June 2026
 */

(function () {
  "use strict";

  // Defaults used when the wrapper carries no matching data-ticker-* attribute.
  var DEFAULT_SPEED = 1; // desktop px/frame
  var DEFAULT_SPEED_MOBILE = 1.2; // ≤600px px/frame
  var DEFAULT_AREA = 9; // desktop rem² (~3rem-square footprint)
  var DEFAULT_AREA_MOBILE = 5; // ≤600px rem²

  // Height/width clamp so extreme aspect ratios stay in a sane band. Keep these
  // in step with the max-height/max-width in global.css (LOGO TICKER) — the CSS
  // caps sit just above so they never clip the inline sizes.
  var MIN_H = 1.25; // rem
  var MAX_H = 3; // rem
  var MAX_W = 11; // rem

  var MOBILE_QUERY = "(max-width: 600px)";

  // Guard: Splide ships from the CDN above this script. Bail quietly (logos
  // still render, contained by the CSS fallback) rather than throwing.
  if (typeof Splide === "undefined") {
    console.warn("logo-ticker: Splide not loaded, skipping init");
    return;
  }

  console.log("Script - Logo Ticker v1.2.0 (Stitchy)");

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

  // Intrinsic aspect ratio (w/h) of a logo: an <img>'s natural size, or an
  // <svg>'s viewBox. Returns 0 when unknown so the caller leaves it to the CSS
  // contain-box (e.g. an image not yet decoded, or an SVG with no viewBox).
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

  // Equal-area sizing: every logo gets the same footprint (area), so its height
  // is √(area / ratio) and its width follows the ratio — wide logos get shorter,
  // square logos taller, none distorted. Clamped to a sane height/width band.
  function sizeLogo(el, area) {
    var ratio = logoRatio(el);
    if (!ratio) return;
    var h = Math.sqrt(area / ratio);
    h = Math.min(Math.max(h, MIN_H), MAX_H);
    var w = h * ratio;
    if (w > MAX_W) {
      w = MAX_W;
      h = w / ratio;
    }
    el.style.height = h + "rem";
    el.style.width = w + "rem";
  }

  // All logo elements in a ticker — the client <img> (Logo field) and/or an
  // inline <svg> (the svg-code embed). Loop clones are sized too (harmless: same
  // source → same size), so there's no need to filter them out.
  function logoEls(splideEl) {
    return Array.prototype.slice.call(splideEl.querySelectorAll("img, .svg-code > svg"));
  }

  function sizeAll(splideEl, area) {
    logoEls(splideEl).forEach(function (el) {
      sizeLogo(el, area);
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
    var area = attrNumber(wrapper, "data-ticker-area", DEFAULT_AREA);
    var areaMobile = attrNumber(wrapper, "data-ticker-area-mobile", DEFAULT_AREA_MOBILE);

    imagesReady(splideEl).then(function () {
      // Size before mount so autoWidth measures the real per-logo widths.
      sizeAll(splideEl, isMobile() ? areaMobile : area);

      var ticker = new Splide(splideEl, {
        type: "loop",
        autoWidth: true,
        arrows: false,
        pagination: false,
        drag: false,
        gap: "2.5rem",
        autoScroll: {
          autoStart: Boolean(AutoScroll) && !prefersReducedMotion(),
          speed: speed,
          pauseOnHover: false,
        },
        breakpoints: {
          600: {
            gap: "1.5rem",
            autoScroll: { speed: speedMobile },
          },
        },
      });

      ticker.mount(AutoScroll ? { AutoScroll: AutoScroll } : {});

      // Re-size + re-measure only when the desktop/mobile area bucket flips
      // (rem sizes are otherwise viewport-independent).
      var wasMobile = isMobile();
      var resizeTimer = null;
      window.addEventListener("resize", function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function apply() {
          var nowMobile = isMobile();
          if (nowMobile === wasMobile) return;
          wasMobile = nowMobile;
          sizeAll(splideEl, nowMobile ? areaMobile : area);
          ticker.refresh();
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
