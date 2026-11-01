/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Vela Sepia Reader — frame script.
 *
 * Listens for "Vela:SepiaReader:Toggle" messages from the parent and
 * applies (or removes) a warm sepia overlay on the page document. The
 * overlay is a single <style> element with id "vela-sepia-overlay".
 *
 * The frame script also listens for DOMContentLoaded so that when the
 * user navigates within a tab that has sepia enabled, the overlay is
 * re-applied automatically. (Per-tab state lives in the parent, on the
 * tab element's [vela-sepia] attribute; the parent re-sends the toggle
 * message via a progress listener — see vela-browser.js.)
 *
 * Frame scripts run once per process per browser; this script is
 * registered via loadFrameScript at startup with allowDelayedLoad=true.
 */

const SEPIA_CSS = `
  html { filter: sepia(0.30) saturate(0.92) hue-rotate(-6deg) !important;
         background-color: #F7F2E8 !important; }
  body { background-color: #FBF6EC !important; }
  p, li, h1, h2, h3, h4, h5, h6 { color: #2A241D !important; }
  a { color: #9C3B2A !important; }
  a:visited { color: #6B3A2A !important; }
  img, video, canvas, svg { filter: sepia(0.18) saturate(0.95) !important; }
`.trim();

let enabled = false;

function applySepia(doc, on) {
  if (!doc) return;
  const id = "vela-sepia-overlay";
  const existing = doc.getElementById(id);
  if (on) {
    if (existing) return;
    const style = doc.createElement("style");
    style.id = id;
    style.type = "text/css";
    style.textContent = SEPIA_CSS;
    doc.documentElement.appendChild(style);
  } else if (existing) {
    existing.remove();
  }
}

addMessageListener("Vela:SepiaReader:Toggle", function (msg) {
  enabled = !!msg.data.enable;
  try {
    applySepia(content.document, enabled);
  } catch (e) {
    /* page may not be ready yet; the DOMContentLoaded handler will retry */
  }
});

// Re-apply on navigation, in case the parent's progress listener missed
// (e.g. sub-frame navigations).
addEventListener("DOMContentLoaded", function () {
  if (enabled) {
    try {
      applySepia(content.document, true);
    } catch (e) {
      /* ignore */
    }
  }
});
