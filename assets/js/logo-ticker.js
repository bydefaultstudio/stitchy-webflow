/**
 * Script Purpose: Stitchy London — Logo ticker. Mounts a continuous,
 *                 auto-scrolling marquee of client/partner logos on every
 *                 `.logo-ticker .splide` using SplideJS + the AutoScroll
 *                 extension. Self-guards on presence; pauses for reduced motion.
 *                 Distinct from the CSS-only text `.ticker` ("No egos…").
 * Author: Erlen Masson
 * Version: 1.0.0
 * Created: 6 June 2026
 * Last Updated: 6 June 2026
 */

(function () {
  "use strict";

  // Guard: Splide ships from the CDN above this script. Bail quietly (logos
  // still render, just static + unstyled by Splide) rather than throwing.
  if (typeof Splide === "undefined") {
    console.warn("logo-ticker: Splide not loaded, skipping init");
    return;
  }

  console.log("Script - Logo Ticker v1.0.0 (Stitchy)");

  // AutoScroll registers itself on window.splide.Extensions when its script
  // loads. Cache it once; if it's missing the ticker still mounts, just static.
  var AutoScroll =
    (window.splide && window.splide.Extensions && window.splide.Extensions.AutoScroll) || null;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Mount one `.logo-ticker .splide` as a looping marquee. `autoWidth` lets each
  // logo keep its native aspect (heights are normalised in global.css) and
  // AutoScroll provides the slow, continuous drift. Reduced motion → mounted but
  // not auto-started, so the row of logos sits still.
  function mountTicker(splideEl) {
    var ticker = new Splide(splideEl, {
      type: "loop",
      autoWidth: true,
      arrows: false,
      pagination: false,
      drag: false,
      gap: "2.5rem",
      autoScroll: {
        autoStart: Boolean(AutoScroll) && !prefersReducedMotion(),
        speed: 0.3,
        pauseOnHover: false,
      },
      breakpoints: {
        600: {
          gap: "1.5rem",
          autoScroll: { speed: 0.5 },
        },
      },
    });

    ticker.mount(AutoScroll ? { AutoScroll: AutoScroll } : {});
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
