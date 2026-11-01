/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Vela Sepia Reader — frame script.
 *
 * Listens for messages from the parent:
 *   - "Vela:SepiaReader:Toggle"   { enable, settings } — turn sepia on/off
 *   - "Vela:SepiaReader:Settings" { settings }          — apply new settings
 *
 * The overlay is a single <style> element with id "vela-sepia-overlay",
 * whose textContent is regenerated from the current settings.
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

let enabled = false;
let settings = {
  intensity: 0.30,
  fontScale: 1.05,
  lineHeight: 1.65,
  warmBg: true,
  warmLinks: true,
};

function buildCSS(s) {
  const parts = [];
  // Sepia filter on the root + images.
  parts.push(
    `html { filter: sepia(${s.intensity.toFixed(2)}) saturate(0.92) ` +
    `hue-rotate(-6deg) !important; }`
  );
  // Optional warm parchment background.
  if (s.warmBg) {
    parts.push(`html { background-color: #F7F2E8 !important; }`);
    parts.push(`body { background-color: #FBF6EC !important; }`);
    parts.push(`p, li, h1, h2, h3, h4, h5, h6 { color: #2A241D !important; }`);
  }
  // Optional warm link colours.
  if (s.warmLinks) {
    parts.push(`a { color: #9C3B2A !important; }`);
    parts.push(`a:visited { color: #6B3A2A !important; }`);
  }
  // Typography (applied to body text containers; we use :is() to limit
  // to common article containers when possible, but fall back to body).
  parts.push(
    `p, li, blockquote, article, main, div ` +
    `{ font-size: ${(s.fontScale * 100).toFixed(0)}% !important; ` +
    `line-height: ${s.lineHeight.toFixed(2)} !important; }`
  );
  // Image desaturation so they don't fight the sepia.
  parts.push(
    `img, video, canvas, svg ` +
    `{ filter: sepia(${(s.intensity * 0.6).toFixed(2)}) saturate(0.95) !important; }`
  );
  return parts.join("\n");
}

function applySepia(doc, on, s) {
  if (!doc) return;
  const id = "vela-sepia-overlay";
  let existing = doc.getElementById(id);
  if (on) {
    const css = buildCSS(s || settings);
    if (existing) {
      existing.textContent = css;
    } else {
      const style = doc.createElement("style");
      style.id = id;
      style.type = "text/css";
      style.textContent = css;
      doc.documentElement.appendChild(style);
    }
  } else if (existing) {
    existing.remove();
  }
}

function handleMessage(msg) {
  if (msg.name === "Vela:SepiaReader:Toggle") {
    enabled = !!msg.data.enable;
    if (msg.data.settings) settings = msg.data.settings;
    try { applySepia(content.document, enabled, settings); } catch (e) {}
  } else if (msg.name === "Vela:SepiaReader:Settings") {
    if (msg.data.settings) settings = msg.data.settings;
    if (enabled) {
      try { applySepia(content.document, true, settings); } catch (e) {}
    }
  }
}

addMessageListener("Vela:SepiaReader:Toggle", handleMessage);
addMessageListener("Vela:SepiaReader:Settings", handleMessage);

// Re-apply on navigation, in case the parent's progress listener missed
// (e.g. sub-frame navigations).
addEventListener("DOMContentLoaded", function () {
  if (enabled) {
    try { applySepia(content.document, true, settings); } catch (e) {}
  }
});
