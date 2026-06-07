/**
 * Script Purpose: Desktop tooltip-style cursor label + solo replacement mode
 * Author: Erlen Masson
 * Version: 4.2
 * Last Updated: June 7, 2026
 * Notes: Tooltip mode (default) keeps the native cursor visible and hangs a
 *        small label below it, showing text and/or icons declared via
 *        data-cursor-label, data-cursor-icon, data-cursor-icon-end on hovered
 *        elements. Solo mode (data-cursor-solo="icon-name") hides the native
 *        cursor over the flagged element and lets that icon ride the pointer,
 *        no text — for media / thumbnail targets. Hide mode (data-cursor-hide)
 *        renders nothing over the flagged element so the native cursor shows
 *        through — used to carve interactive controls (e.g. a video scrubber)
 *        out of a surrounding solo region; the element restores its own cursor
 *        value in CSS. The label/solo icon is LOCKED to the pointer
 *        (LABEL_LERP/HALO_LERP = 1) — no follow lag, matching the native
 *        pointer cursors (data-cursor="grab" etc.) now in bd-cursor.css.
 */

// Wrapped in an IIFE so re-loads of this script don't collide on the top-level
// `const` declarations below. The window.__bdCursorInited guard inside
// initBdCursor() prevents the listeners from being attached twice.
(function () {
console.log("Script - Cursor v4.2");

// Path to the SVG icon sprite. On Webflow the sprite isn't served from /assets,
// so set `window.BD_CURSOR_SPRITE` to its uploaded/jsDelivr URL in head custom
// code before this script loads. Falls back to the repo-relative path locally.
const SPRITE_URL = window.BD_CURSOR_SPRITE || "/assets/images/svg-icons/_sprite.svg";

// Solo mode — an element flagged with data-cursor-solo="icon-name" hides the
// native cursor over itself and lets that icon ride the pointer (no text).
const SOLO_ATTR = "data-cursor-solo";
const SOLO_SELECTOR = "[" + SOLO_ATTR + "]";
// Hide mode — an element flagged with data-cursor-hide suppresses the custom
// cursor over itself (no label, no riding icon) so the native cursor shows
// through. Lets an interactive control opt out of an ancestor's solo region;
// the element restores its own cursor value in CSS.
const HIDE_ATTR = "data-cursor-hide";
const HIDE_SELECTOR = "[" + HIDE_ATTR + "]";

// Cross-origin <use href="…sprite.svg#id"> is blocked by browsers regardless of
// CORS headers, so we fetch the sprite once and inject it into the document.
// All <use> references then resolve via bare "#id" fragments (same-doc).
function injectSprite() {
  if (document.querySelector("[data-bd-cursor-sprite]")) return Promise.resolve();
  return fetch(SPRITE_URL)
    .then(function (res) { return res.ok ? res.text() : ""; })
    .then(function (svg) {
      if (!svg) return;
      const wrap = document.createElement("div");
      wrap.setAttribute("data-bd-cursor-sprite", "");
      wrap.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
      wrap.innerHTML = svg;
      document.body.insertAdjacentElement("afterbegin", wrap);
    })
    .catch(function (err) {
      console.warn("Custom Cursor: sprite fetch failed", err);
    });
}

function initBdCursor() {
  // Idempotency guard — a re-load may run this script again, but the cursor
  // lives outside any swapped container and only needs its listeners set up once.
  if (window.__bdCursorInited) return;
  window.__bdCursorInited = true;

  const label = document.querySelector(".cursor-label");
  const halo = document.querySelector(".cursor-halo");

  if (!label || !halo) {
    console.warn("Custom Cursor skipped — .cursor-label or .cursor-halo not found.");
    return;
  }

  // Reduced-motion users get the OS cursor — strip the custom DOM so it can't render.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    label.remove();
    halo.remove();
    return;
  }

  const text = label.querySelector(".cursor-label-text");
  const leadIcon = label.querySelector(".cursor-label-icon-lead");
  const endIcon = label.querySelector(".cursor-label-icon-end");
  const leadUse = leadIcon && leadIcon.querySelector("use");
  const endUse = endIcon && endIcon.querySelector("use");

  if (!text || !leadIcon || !endIcon || !leadUse || !endUse) {
    console.warn("Custom Cursor skipped — .cursor-label internal structure malformed.");
    return;
  }

  // Cursor is confirmed live (not reduced-motion, DOM + structure valid).
  // Only now may CSS hide the native cursor over solo elements.
  document.documentElement.classList.add("bd-cursor-ready");

  // Inject the sprite once so cross-origin <use> refs aren't needed.
  injectSprite();

  // Must match the .cursor-label `transition: opacity` duration in bd-cursor.css
  // (both read the same --duration-2xs token, so they can't drift). Fallback
  // mirrors the token's current value (100ms) in case it's ever unresolved.
  const FADE_MS = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue("--duration-2xs"),
    10
  ) || 100;

  // ------- Animation Configuration ------- //
  // 1.0 = locked to the pointer (no follow lag); lower = softer trailing follow.
  // Locked here so the floating label / solo icon stays pixel-tight with the
  // cursor, matching the native pointer cursors (data-cursor="grab" etc.) — the
  // whole cursor system reads as one precise, lag-free pointer (owner request).

  const LABEL_LERP = 1;
  const HALO_LERP = 1;
  const SNAP_THRESHOLD = 0.5;
  const LABEL_OFFSET_Y = 20;  // px below the cursor

  // ------- State ------- //

  let mouseX = 0;
  let mouseY = 0;
  let labelX = 0;
  let labelY = 0;
  let haloX = 0;
  let haloY = 0;
  let rafId = null;
  let lastTime = 0;
  let firstMove = true;

  // Transition state machine
  let activeTarget = null;
  let phase = "idle";          // 'idle' | 'visible' | 'fading-out'
  let fadeTimeoutId = null;
  let soloActive = false;      // is the current activeTarget a solo target?

  // Single source of truth for the label transform so the two write sites
  // (animate + the firstMove snap) can never desync the offset. Normal mode
  // hangs the label LABEL_OFFSET_Y below the pointer; solo mode centers it ON
  // the pointer (vertical -50%, matching the horizontal -50% already applied).
  function labelTransform(x, y) {
    const yPart = soloActive
      ? `calc(${y}px - 50%)`
      : `calc(${y}px + ${LABEL_OFFSET_Y}px)`;
    return `translate3d(calc(${x}px - 50%), ${yPart}, 0)`;
  }

  // ------- Target detection + content swap ------- //

  function getCursorTargetAtPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    // elementFromPoint is unaffected by cursor:none — hit-testing ignores it,
    // so solo targets keep resolving even with the native cursor hidden.
    return el.closest(
      "[data-cursor-label], [data-cursor-icon], [data-cursor-icon-end], " +
      SOLO_SELECTOR + ", " + HIDE_SELECTOR
    );
  }

  function applyContent(target) {
    // Determine the mode once, up front, and keep the solo state in sync with
    // whatever is currently shown.
    const solo = target.hasAttribute(SOLO_ATTR);
    soloActive = solo;
    document.documentElement.classList.toggle("bd-cursor-solo-active", solo);
    // is-solo sizes the graphic larger than the shared .is-icon-only tooltip
    // pill; toggling here adds it in solo mode and clears it for normal targets.
    label.classList.toggle("is-solo", solo);

    if (solo) {
      // Solo: the icon becomes the cursor — no text, no trailing icon. Icon
      // name comes from the flag's value, falling back to data-cursor-icon for
      // the boolean form, then to nothing (graceful empty circle).
      const iconName =
        target.getAttribute(SOLO_ATTR) ||
        target.getAttribute("data-cursor-icon") ||
        "";

      text.textContent = "";
      endIcon.classList.remove("is-active");

      if (iconName) {
        leadUse.setAttribute("href", `#${iconName}`);
        leadIcon.classList.add("is-active");
      } else {
        leadIcon.classList.remove("is-active");
      }

      // Reuse the icon-only circle look, centered on the pointer by labelTransform.
      // Leaving solo for a normal target is cleaned up by the toggle() below.
      label.classList.add("is-icon-only");
      return;
    }

    const labelText = target.getAttribute("data-cursor-label") || "";
    const iconLead = target.getAttribute("data-cursor-icon") || "";
    const iconEnd = target.getAttribute("data-cursor-icon-end") || "";

    text.textContent = labelText;

    if (iconLead) {
      leadUse.setAttribute("href", `#${iconLead}`);
      leadIcon.classList.add("is-active");
    } else {
      leadIcon.classList.remove("is-active");
    }

    if (iconEnd) {
      endUse.setAttribute("href", `#${iconEnd}`);
      endIcon.classList.add("is-active");
    } else {
      endIcon.classList.remove("is-active");
    }

    label.classList.toggle("is-icon-only", Boolean(iconLead) && !labelText && !iconEnd);
  }

  function completeFadeOutThenIn() {
    fadeTimeoutId = null;
    // A hide target stays the activeTarget (so re-entering the surrounding region
    // still counts as a change) but renders nothing — treated like "no target"
    // for the label, leaving the native cursor visible.
    if (activeTarget && !activeTarget.hasAttribute(HIDE_ATTR)) {
      applyContent(activeTarget);
      label.classList.add("is-visible");
      phase = "visible";
    } else {
      soloActive = false;
      document.documentElement.classList.remove("bd-cursor-solo-active");
      phase = "idle";
    }
  }

  function transitionTo(newTarget) {
    if (newTarget === activeTarget) return;
    activeTarget = newTarget;

    if (phase === "fading-out") {
      // Mid fade-out — keep going, just update what'll show on completion.
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      fadeTimeoutId = setTimeout(completeFadeOutThenIn, FADE_MS);
      return;
    }

    if (phase === "idle") {
      // Hide targets show nothing — keep the label idle/hidden, native cursor through.
      if (newTarget && !newTarget.hasAttribute(HIDE_ATTR)) {
        applyContent(newTarget);
        label.classList.add("is-visible");
        phase = "visible";
      }
      return;
    }

    // phase === 'visible' — start fade-out
    label.classList.remove("is-visible");
    phase = "fading-out";
    if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
    fadeTimeoutId = setTimeout(completeFadeOutThenIn, FADE_MS);
  }

  // ------- Animation Loop ------- //

  function animate(time) {
    if (!lastTime) lastTime = time;
    const dt = (time - lastTime) / (1000 / 60);
    lastTime = time;

    const labelFactor = 1 - Math.pow(1 - LABEL_LERP, dt);
    const haloFactor = 1 - Math.pow(1 - HALO_LERP, dt);

    labelX += (mouseX - labelX) * labelFactor;
    labelY += (mouseY - labelY) * labelFactor;
    haloX += (mouseX - haloX) * haloFactor;
    haloY += (mouseY - haloY) * haloFactor;

    const labelDist = Math.abs(mouseX - labelX) + Math.abs(mouseY - labelY);
    const haloDist = Math.abs(mouseX - haloX) + Math.abs(mouseY - haloY);

    if (labelDist < SNAP_THRESHOLD) { labelX = mouseX; labelY = mouseY; }
    if (haloDist < SNAP_THRESHOLD) { haloX = mouseX; haloY = mouseY; }

    // Label position is owned by labelTransform (normal: below the pointer;
    // solo: centered on it). Halo is always centered.
    label.style.transform = labelTransform(labelX, labelY);
    halo.style.transform = `translate3d(calc(${haloX}px - 50%), calc(${haloY}px - 50%), 0)`;

    if (labelDist >= SNAP_THRESHOLD || haloDist >= SNAP_THRESHOLD) {
      rafId = requestAnimationFrame(animate);
    } else {
      rafId = null;
      lastTime = 0;
    }
  }

  function startAnimation() {
    if (!rafId) {
      lastTime = 0;
      rafId = requestAnimationFrame(animate);
    }
  }

  // ------- Event Listeners ------- //

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Resolve target/mode FIRST so the firstMove snap uses the right offset
    // (labelTransform reads soloActive, which transitionTo → applyContent sets).
    transitionTo(getCursorTargetAtPoint(mouseX, mouseY));

    // Snap on first move so we don't lerp from (0,0).
    if (firstMove) {
      labelX = mouseX;
      labelY = mouseY;
      haloX = mouseX;
      haloY = mouseY;
      label.style.transform = labelTransform(labelX, labelY);
      halo.style.transform = `translate3d(calc(${haloX}px - 50%), calc(${haloY}px - 50%), 0)`;
      firstMove = false;
    }

    startAnimation();
  });

  document.addEventListener("mousedown", () => {
    halo.classList.add("cursor-pressed");
  });

  document.addEventListener("mouseup", () => {
    halo.classList.remove("cursor-pressed");
  });

  // Scroll keeps target in sync when the mouse is still but elements move
  // beneath it. Browsers don't fire mousemove on scroll alone, so without
  // this the label sticks to the last-hovered element's content.
  window.addEventListener("scroll", () => {
    if (firstMove) return;
    transitionTo(getCursorTargetAtPoint(mouseX, mouseY));
  }, { passive: true });

  // Lets a hovered element mutate its own data-cursor-icon/label at runtime (e.g.
  // a media control swapping play↔pause as state changes) and have the cursor
  // update WITHOUT the pointer leaving the element. transitionTo only re-applies
  // on target *change*, so re-read the current target's content directly. Guarded
  // to a visible label — no target change, no fade, no focus/scroll side effects.
  document.addEventListener("bd-cursor:refresh", () => {
    if (activeTarget && phase === "visible") applyContent(activeTarget);
  });
}

// Run immediately if DOM is already ready (late script load), otherwise wait
// for DOMContentLoaded.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBdCursor);
} else {
  initBdCursor();
}
})();
