/**
 * Script Purpose: Stitchy London — Post-it note dialog (CMS-ready, repeatable).
 *                 ONE modal shell + a hidden note "source". ANY element with
 *                 `data-postit-open="<id>"` opens the shell, filled with the note
 *                 whose `data-postit-id` matches. Notes are a hidden CMS Collection
 *                 List (one `.post-it-source` per item; the "Post-it ID" field →
 *                 `data-postit-id`; Title → `.post-it-source-title`, Description →
 *                 `.post-it-source-body`). On open the shell's title/body are copied
 *                 from the source, the rest of the page is inert-ed behind it, focus
 *                 moves to the dialog and is restored to the trigger on close.
 *                 Entrance/exit is CSS via an `.is-open` class toggled on the dialog
 *                 AND each animated part (backdrop/card/shadow), so the open/close
 *                 states can be authored as native combo classes — no GSAP, no portal.
 * Author: Erlen Masson
 * Version: 0.5.0
 * Created: 7 June 2026
 * Last Updated: 7 June 2026
 */

(function () {
  "use strict";

  var triggers = document.querySelectorAll("[data-postit-open]");
  if (!triggers.length) return; // no-op on pages without a trigger

  var shell = document.querySelector(".post-it-dialog");
  if (!shell) {
    console.warn("postit: triggers present but no .post-it-dialog shell on the page");
    return;
  }

  console.log("Script - Post-it v0.5.0 (Stitchy)");

  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), ' +
    'select:not([disabled]), textarea:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"])';
  // Fade-out time before the shell is hidden. Read from the CSS token so JS + CSS
  // can't drift.
  var EXIT_MS =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--duration-m")
    ) || 600;

  var titleEl = shell.querySelector(".post-it-title");
  var bodyEl = shell.querySelector(".post-it-body");
  var closeBtn = shell.querySelector(".post-it-close");

  // Elements that animate on open/close. `is-open` is toggled on each (not only
  // the dialog) so the entrance/exit states can be authored as native Webflow
  // combo classes — .post-it-backdrop.is-open, .post-it.is-open, .post-it-shadow.is-open.
  var animatedEls = [
    shell,
    shell.querySelector(".post-it-backdrop"),
    shell.querySelector(".post-it"),
    shell.querySelector(".post-it-shadow"),
  ];

  function setOpenState(on) {
    for (var i = 0; i < animatedEls.length; i++) {
      if (animatedEls[i]) animatedEls[i].classList.toggle("is-open", on);
    }
  }

  var inerted = []; // elements we inert-ed on open, to reverse exactly on close
  var activeTrigger = null;
  var isOpen = false;
  var closeTimer = null;

  //
  //------- Utilities -------//
  //

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function findSource(id) {
    if (!id) return null;
    var safe = window.CSS && CSS.escape ? CSS.escape(id) : id;
    return document.querySelector('[data-postit-id="' + safe + '"]');
  }

  function fill(targetEl, source, sourceSelector) {
    if (!targetEl) return;
    var src = source.querySelector(sourceSelector);
    targetEl.textContent = src ? src.textContent : "";
  }

  // inert + aria-hidden everything except the shell's own ancestor path: walk up
  // from the shell to <body>, inert-ing each level's other children. Works wherever
  // the shell sits (top level, in .page-wrapper, inside a component) without moving
  // it. Reverses exactly what it set; skips nodes that manage their own aria-hidden.
  function setBackgroundInert(on) {
    if (on) {
      inerted = [];
      var node = shell;
      while (node && node !== document.body && node.parentNode) {
        var siblings = node.parentNode.children;
        for (var i = 0; i < siblings.length; i++) {
          var el = siblings[i];
          if (el === node) continue;
          var tag = el.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "LINK" || tag === "TEMPLATE") continue;
          if (el.hasAttribute("inert") || el.hasAttribute("aria-hidden")) continue;
          el.setAttribute("inert", "");
          el.setAttribute("aria-hidden", "true");
          inerted.push(el);
        }
        node = node.parentNode;
      }
    } else {
      for (var j = 0; j < inerted.length; j++) {
        inerted[j].removeAttribute("inert");
        inerted[j].removeAttribute("aria-hidden");
      }
      inerted = [];
    }
  }

  function visibleFocusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll(FOCUSABLE),
      function isVisible(el) {
        return el.getClientRects().length > 0;
      }
    );
  }

  // Keep Tab / Shift+Tab cycling inside the shell.
  function trapFocus(event) {
    var nodes = visibleFocusables(shell);
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  //
  //------- Open / close -------//
  //

  function openPostit(source, trigger) {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
    // Fill the shell from the source BEFORE it's shown/focused, so aria-labelledby
    // + aria-describedby announce the right note on entry.
    fill(titleEl, source, ".post-it-source-title");
    fill(bodyEl, source, ".post-it-source-body");

    activeTrigger = trigger;
    isOpen = true;

    shell.hidden = false;
    shell.removeAttribute("aria-hidden"); // it's the live modal now
    void shell.offsetWidth; // reflow so the .is-open transition runs from hidden
    setOpenState(true);
    setBackgroundInert(true);
    document.body.classList.add("is-postit-open");

    // Focus the dialog itself (tabindex=-1 + aria-labelledby/describedby) so AT
    // announces the note's title + body, not the destructive Close.
    shell.focus();
  }

  function closePostit(immediate) {
    if (!isOpen) return;
    isOpen = false;
    var trigger = activeTrigger;
    activeTrigger = null;

    setOpenState(false);
    shell.setAttribute("aria-hidden", "true"); // AT ignores the fading ghost
    setBackgroundInert(false);
    document.body.classList.remove("is-postit-open");

    if (immediate || prefersReducedMotion()) {
      shell.hidden = true;
    } else {
      closeTimer = window.setTimeout(function onExitDone() {
        closeTimer = null;
        shell.hidden = true;
      }, EXIT_MS);
    }

    if (trigger) trigger.focus(); // page is un-inert-ed above, so this lands
  }

  //
  //------- Events -------//
  //

  function onKeydown(event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      closePostit();
    } else if (event.key === "Tab") {
      trapFocus(event);
    }
  }

  function wireShell() {
    shell.tabIndex = -1; // focus target on open
    if (titleEl) {
      if (!titleEl.id) titleEl.id = "postit-title";
      shell.setAttribute("aria-labelledby", titleEl.id);
    }
    if (bodyEl) {
      if (!bodyEl.id) bodyEl.id = "postit-body";
      shell.setAttribute("aria-describedby", bodyEl.id);
    }
    shell.addEventListener("click", function onShellClick(event) {
      if (!event.target.closest(".post-it")) closePostit(); // click outside the card
    });
    if (closeBtn) {
      closeBtn.addEventListener("click", function onCloseClick() {
        closePostit();
      });
    }
  }

  function wireTrigger(trigger) {
    function activate() {
      var id = trigger.getAttribute("data-postit-open");
      var source = findSource(id);
      if (!source) {
        console.warn('postit: no note found with data-postit-id="' + id + '"');
        return;
      }
      openPostit(source, trigger);
    }
    trigger.addEventListener("click", activate);
    // A real <button>/<a> fires click on Enter/Space natively; any other element
    // (e.g. a span with role="button") does not, so add keyboard activation to
    // keep every trigger operable. preventDefault stops Space from scrolling.
    var tag = trigger.tagName;
    if (tag !== "BUTTON" && tag !== "A") {
      trigger.addEventListener("keydown", function onTriggerKey(event) {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          activate();
        }
      });
    }
  }

  //
  //------- Init -------//
  //

  function init() {
    wireShell();
    Array.prototype.forEach.call(triggers, wireTrigger);
    document.addEventListener("keydown", onKeydown);
    // No resize handler: a modal needs no geometry rebuild on viewport change.
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
