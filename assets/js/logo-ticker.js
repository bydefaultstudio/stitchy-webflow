/**
 * Script Purpose: Stitchy London — Logo ticker. Auto-scrolling marquee of
 *                 client logos (SplideJS + AutoScroll), equal-area-sized.
 * Author: Erlen Masson
 * Created: 6 June 2026
 * Version: 1.4.0
 * Last Updated: 7 June 2026
 */

console.log("Script - Logo Ticker v1.4.0 (Stitchy) Local");

(function () {
  "use strict";

  //
  //------- Config -------//
  //

  // Defaults when the wrapper has no matching data-ticker-* attribute.
  var defaultSpeed = 1;
  var defaultSpeedMobile = 1.2;
  var defaultSize = 1;
  var defaultSizeMobile = 1;

  // Equal-area footprint + per-logo clamps. Desktop = vw (scales with the
  // viewport like the type scale); mobile = rem (fixed), matched at 1440px.
  var desktop = { area: 11.1, minH: 1.39, maxH: 3.33, maxW: 12.22, gap: "2.78vw", unit: "vw" };
  var mobile = { area: 5, minH: 1.25, maxH: 3, maxW: 11, gap: "1.5rem", unit: "rem" };

  // Guard a wild data-ticker-size typo (e.g. 50) from producing absurd logos.
  var minSize = 0.1;
  var maxSize = 5;

  var mobileQuery = "(max-width: 600px)";

  // Splide must load (from the CDN) before this script; bail quietly if not.
  if (typeof Splide === "undefined") {
    console.warn("logo-ticker: Splide not loaded, skipping init");
    return;
  }

  // AutoScroll registers on window.splide.Extensions; null = static ticker.
  var autoScroll =
    (window.splide && window.splide.Extensions && window.splide.Extensions.AutoScroll) || null;

  //
  //------- Utility Functions -------//
  //

  // Honor the user's reduced-motion preference.
  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // True below the ticker's own 600px threshold.
  function isMobile() {
    return window.matchMedia(mobileQuery).matches;
  }

  // Numeric data-attribute off an element, or fallback if absent/invalid.
  function attrNumber(el, name, fallback) {
    var value = parseFloat(el.getAttribute(name));
    return Number.isFinite(value) ? value : fallback;
  }

  // Constrain a value to [min, max].
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // Intrinsic aspect ratio (w/h) from an <img> or <svg> viewBox; 0 if unknown.
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

  // Every logo node in a ticker — the <img> and/or an inline <svg>.
  function logoEls(splideEl) {
    return Array.prototype.slice.call(splideEl.querySelectorAll("img, .svg-code > svg"));
  }

  //
  //------- Main Functions -------//
  //

  // Size one logo to the shared visual area, ×scale, clamped per profile.
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

  // Size every logo in a ticker for the active profile.
  function sizeAll(splideEl, profile, scale) {
    logoEls(splideEl).forEach(function (el) {
      sizeLogo(el, profile, scale);
    });
  }

  // Resolve once every <img> logo knows its natural size (SVGs are synchronous).
  function imagesReady(splideEl) {
    var imgs = logoEls(splideEl).filter(function (el) {
      return el.tagName.toLowerCase() === "img";
    });
    return Promise.all(
      imgs.map(function (img) {
        img.loading = "eager";
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        if (img.decode) return img.decode().catch(function () {});
        return new Promise(function (resolve) {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      })
    );
  }

  // Build one Splide ticker: size logos, mount, then re-measure on resize.
  function mountTicker(splideEl) {
    var wrapper = splideEl.closest(".logo-ticker") || splideEl;
    var speed = attrNumber(wrapper, "data-ticker-speed", defaultSpeed);
    var speedMobile = attrNumber(wrapper, "data-ticker-speed-mobile", defaultSpeedMobile);
    var size = clamp(attrNumber(wrapper, "data-ticker-size", defaultSize), minSize, maxSize);
    var sizeMobile = clamp(
      attrNumber(wrapper, "data-ticker-size-mobile", defaultSizeMobile),
      minSize,
      maxSize
    );

    function applySizes() {
      if (isMobile()) sizeAll(splideEl, mobile, sizeMobile);
      else sizeAll(splideEl, desktop, size);
    }

    imagesReady(splideEl).then(function () {
      applySizes(); // before mount so autoWidth measures real per-logo widths

      var ticker = new Splide(splideEl, {
        type: "loop",
        autoWidth: true,
        arrows: false,
        pagination: false,
        drag: false,
        gap: desktop.gap,
        autoScroll: {
          autoStart: Boolean(autoScroll) && !prefersReducedMotion(),
          speed: speed,
          pauseOnHover: false,
        },
        breakpoints: {
          600: {
            gap: mobile.gap,
            autoScroll: { speed: speedMobile },
          },
        },
      });

      ticker.mount(autoScroll ? { AutoScroll: autoScroll } : {});

      // Desktop widths are vw, so Splide must re-measure on any desktop resize;
      // a mobile/desktop flip also re-applies sizes (the unit changes).
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

  // Mount every .logo-ticker on the page.
  function initLogoTicker() {
    var tickers = document.querySelectorAll(".logo-ticker .splide");
    if (!tickers.length) return;
    if (!autoScroll) {
      console.warn("logo-ticker: AutoScroll extension not loaded — logos will be static");
    }
    tickers.forEach(mountTicker);
  }

  //
  //------- Initialize -------//
  //

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLogoTicker);
  } else {
    initLogoTicker();
  }
})();
