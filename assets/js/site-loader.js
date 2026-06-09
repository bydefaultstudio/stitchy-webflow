/**
 * Script Purpose: Stitchy London — Site Loader. The bd-animations "intro
 *                 curtain": opaque from first paint, sits over an animated
 *                 gradient while the line-draw Stitchy logo plays, waits for the
 *                 page to settle, then fades out and hands control back to
 *                 bd-animations.
 *
 *                 ONCE PER SESSION — a tiny inline <head> script decides BEFORE
 *                 first paint whether THIS load shows the curtain. It is shown on
 *                 the first load of a session and on every hard refresh, and
 *                 skipped on in-session navigations. The head script sets
 *                 window.__siteLoaderSkip (and adds html.loader-seen so CSS hides
 *                 the curtain with no flash); this controller reads that flag and
 *                 takes the matching path. See the head block in
 *                 templates/webflow-header-code.html.
 *
 *                 LOGO — in production the Lottie is a NATIVE Webflow element
 *                 (.site-loader-logo) that autoplays once; no lottie-web is
 *                 loaded, so this controller never injects a player and the
 *                 min-display floor holds the curtain while the native draw
 *                 plays. The local prototype keeps lottie-web + an empty
 *                 [data-site-loader-logo] mount, so the optional branch below
 *                 still animates the logo offline.
 *
 *                 Dismiss gates (SHOW path — all must pass, or 5s safety cap):
 *                   1. Lottie finished — its own lottie-web draw, OR (native
 *                      Webflow Lottie with no mount div) treated as done at once.
 *                   2. studio:ready dispatched by bd-animations.js
 *                   3. window.load fired
 *                   4. minimum display time elapsed (data-min-display, default
 *                      1700ms) so a native Lottie / IX2 draw is always seen.
 *
 *                 Curtain enforcement: pauses gsap.globalTimeline immediately so
 *                 above-fold reveals bd-animations queues during its fonts.ready
 *                 init are held at progress 0 until the fade-out completes.
 *
 *                 Contract with bd-animations.js (assets/js/bd-animations.js):
 *                   • body.is-intro-loading must be present BEFORE bd-animations
 *                     init runs — set in HTML, not from JS.
 *                   • dispatch studio:intro-complete  → in-view reveals start
 *                   • dispatch bd:intro-complete      → ScrollTrigger refresh
 *                 Both events fire on BOTH paths, always AFTER studio:ready, so
 *                 reveals are released whether or not the curtain was shown.
 *
 * Author: Erlen Masson
 * Version: 2.0.0
 * Created: 29 May 2026
 */

(function () {
  "use strict";

  var loaderEl = document.querySelector("[data-site-loader], .site-loader");
  if (!loaderEl) return;

  console.log("Script - Site Loader v2.0.0 (Stitchy)");

  // Cross-page anchor support: if the URL arrived with a hash (e.g. /#about),
  // the browser auto-jumps to it before ScrollTrigger is built. Scrub reveals
  // above the target then have nothing to scrub through — they stick mid-state.
  // Strip the hash so the curtain starts at top-of-page, capture the target,
  // and re-scroll smoothly after intro-complete so each scrub plays through.
  var initialHash = "";
  if (window.location.hash && window.location.hash.length > 1) {
    initialHash = window.location.hash;
    try {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (e) {
      // History API unavailable — fall through; the scroll reset alone covers most cases.
    }
    window.scrollTo(0, 0);
  }

  var fadeMs = 500; // matches the opacity transition on .site-loader

  function dispatchIntroComplete() {
    document.dispatchEvent(new CustomEvent("studio:intro-complete"));
    document.dispatchEvent(new CustomEvent("bd:intro-complete"));
  }

  // CSS `html { scroll-behavior: smooth }` drives the timing; ScrollTrigger
  // scrubs each reveal as the page passes through its range. prefers-reduced-motion
  // downgrades the CSS to auto, so the scroll becomes an instant jump.
  function scrollToInitialHash() {
    if (!initialHash) return;
    var slug = initialHash.charAt(0) === "#" ? initialHash.slice(1) : initialHash;
    if (!slug) return;
    var selector;
    try {
      selector = "#" + (window.CSS && CSS.escape ? CSS.escape(slug) : slug);
    } catch (e) {
      selector = "#" + slug;
    }
    var target = document.querySelector(selector);
    if (!target) return;
    // rAF so bd-animations' bd:intro-complete listener (ScrollTrigger.refresh)
    // has measured fresh trigger positions before we start scrolling.
    requestAnimationFrame(function () {
      target.scrollIntoView({ block: "start" });
    });
  }

  // bd-animations sets data-studio-ready before dispatching the event, so we can
  // detect a fire that happened before our listener attached (cached-font cold
  // loads, bfcache, etc.). If GSAP isn't loaded, bd-animations bails and never
  // fires studio:ready — treat that as ready so we don't hang.
  var studioReady =
    document.documentElement.dataset.studioReady === "true" ||
    typeof gsap === "undefined";

  //
  //------- Skip path (in-session navigation) -------//
  //

  // The head script already hid the curtain (html.loader-seen → display:none),
  // so there is nothing to fade. We only have to release the bd-animations
  // handshake. Wait for studio:ready first: bd-animations self-inits on
  // fonts.ready and this controller runs BEFORE it in the footer, so its
  // studio:intro-complete listener may not be attached yet. Dispatching after
  // studio:ready guarantees the held above-fold reveals are released, not lost.
  function dismissSkipped() {
    document.body.classList.remove("is-intro-loading");
    dispatchIntroComplete();
    if (loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl);
    scrollToInitialHash();
  }

  if (window.__siteLoaderSkip === true) {
    if (studioReady) {
      dismissSkipped();
    } else {
      document.addEventListener("studio:ready", dismissSkipped, { once: true });
    }
    return;
  }

  //
  //------- Show path (first load of the session / hard refresh) -------//
  //

  // Pause the GSAP global timeline IMMEDIATELY. bd-animations' fonts.ready
  // callback may have already queued tweens for above-fold reveals (fade,
  // slide-up, headline-reveal) — those tweens are added to the global timeline
  // but won't visually advance until the next rAF. Pausing here catches them
  // before that rAF, so they sit at progress 0 throughout the curtain. We resume
  // them after the fade-out.
  var pausedGsap = false;
  if (typeof gsap !== "undefined" && gsap.globalTimeline) {
    gsap.globalTimeline.pause();
    pausedGsap = true;
  }

  var logoMount = loaderEl.querySelector("[data-site-loader-logo]");
  var animationPath =
    loaderEl.getAttribute("data-lottie-path") ||
    "assets/images/logo-line-svg.json";
  // Lottie native duration is 3s (75 frames @ 25fps). 1.5x ⇒ 2s draw.
  var animationSpeed =
    parseFloat(loaderEl.getAttribute("data-lottie-speed")) || 1.5;
  var safetyMs = 5000;
  // Minimum time the curtain stays up so a native Webflow Lottie / IX2 draw is
  // always seen, even when load + studio:ready resolve sooner. Override per page
  // with data-min-display (ms) on the loader element.
  var minDisplayMs =
    parseFloat(loaderEl.getAttribute("data-min-display")) || 1700;

  var lottieDone = false;
  var pageLoaded = document.readyState === "complete";
  var hidden = false;
  var minDisplayElapsed = false;

  function hideLoader() {
    if (hidden) return;
    hidden = true;

    // Phase 1 (under opaque curtain): lift the scroll lock so any browser
    // scroll-restoration deferred by overflow:hidden can apply, and resume the
    // global timeline so queued tweens can advance. Curtain is still opaque.
    document.body.classList.remove("is-intro-loading");
    if (pausedGsap && typeof gsap !== "undefined" && gsap.globalTimeline) {
      gsap.globalTimeline.resume();
    }

    // Phase 2 (still opaque): defer one frame so the browser settles its
    // restored scroll position, then dispatch intro-complete. bd-animations'
    // handler synchronously rebuilds its triggers (full reinit when the page
    // booted scrolled) against the settled scroll. All of this lands under the
    // opaque curtain — the user never sees the rebuild flash.
    requestAnimationFrame(function () {
      dispatchIntroComplete();

      // Phase 3: now start the curtain fade. Reveals are already correctly
      // positioned behind it; their tweens animate up to the fade duration and
      // finish smoothly as the curtain disappears.
      loaderEl.classList.add("is-hidden");
      window.setTimeout(function () {
        scrollToInitialHash();
        if (loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl);
      }, fadeMs);
    });
  }

  function maybeHide() {
    if (lottieDone && pageLoaded && studioReady && minDisplayElapsed) hideLoader();
  }

  function startLottie() {
    // No lottie-web, or no [data-site-loader-logo] mount (the Lottie is a native
    // Webflow element / IX2-played) → don't inject a player; treat the draw as
    // done and let the min-display floor hold the curtain up while it plays.
    if (typeof lottie === "undefined" || !logoMount) {
      lottieDone = true;
      maybeHide();
      return;
    }
    var anim = lottie.loadAnimation({
      container: logoMount,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: animationPath,
    });
    anim.setSpeed(animationSpeed);
    anim.addEventListener("complete", function () {
      lottieDone = true;
      maybeHide();
    });
    anim.addEventListener("data_failed", function () {
      console.warn("site-loader: Lottie data failed to load — dismissing");
      lottieDone = true;
      maybeHide();
    });
  }

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    // Honour the user's setting: skip the draw, shorten the display, still let
    // the gradient sit briefly so the brand moment isn't completely silent.
    safetyMs = 1000;
    lottieDone = true;
  } else {
    startLottie();
  }

  if (!studioReady) {
    document.addEventListener(
      "studio:ready",
      function () {
        studioReady = true;
        maybeHide();
      },
      { once: true }
    );
  }

  window.addEventListener("load", function () {
    pageLoaded = true;
    maybeHide();
  });

  // Minimum-display floor: release the last gate after minDisplayMs so a native
  // Lottie / IX2 draw is always seen even when the other gates resolve sooner.
  window.setTimeout(function () {
    minDisplayElapsed = true;
    maybeHide();
  }, minDisplayMs);

  // Safety cap: dismiss even if one of the gates never resolves (CDN fail, GSAP
  // missing, fonts.ready hang) so the page is never stuck behind the curtain.
  // Resume + dispatchIntroComplete() still fire so reveals catch up.
  window.setTimeout(hideLoader, safetyMs);
})();
