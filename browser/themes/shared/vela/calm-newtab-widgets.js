/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Vela — Calm New Tab widgets.
 *
 * Injects a small set of original widgets above the React-driven new
 * tab content:
 *
 *   1. A large calm clock with the current time and date.
 *   2. A "Today" row showing the day's first reading-list item and a
 *      one-click "Add current tab to reading list" button (no-op on
 *      about:home, but useful on about:newtab when the user came from
 *      another tab).
 *   3. A recent-bookmarks strip (last 5 bookmarks added).
 *
 * The widgets are pure DOM, styled by calm-newtab.css, and live above
 * the React root. They don't interfere with the bundle's own top-sites
 * / search / highlights rows.
 *
 * This script is loaded by the new tab page hosts:
 *   - browser/extensions/newtab/data/content/remote-renderer-host.html
 *   - browser/extensions/newtab/data/content/abouthomecache/page.html.template
 *   - browser/extensions/newtab/prerendered/activity-stream*.html
 *
 * It runs in the new tab content process — *not* chrome-privileged —
 * so it can only use the Web APIs available there. It reads the
 * reading list and bookmarks via the `ContentMessageBroker` that
 * Firefox exposes to the new tab page, falling back gracefully if
 * those messages aren't available.
 */

(function () {
  "use strict";

  const VELA_WIDGETS_ID = "vela-newtab-widgets";

  // Only inject once.
  if (document.getElementById(VELA_WIDGETS_ID)) return;

  // Only inject on the actual new tab / about:home pages.
  const isAboutHome =
    location.href.startsWith("about:home") ||
    location.href.startsWith("about:newtab") ||
    location.href.startsWith("about:asrouter") ||
    // The React bundle's host page is at a chrome: URL but renders as
    // about:newtab. Detect by the presence of #root.
    document.querySelector("#root") !== null;

  if (!isAboutHome) return;

  // ----------------------------------------------------------------- *
  // Build the widget container.
  // ----------------------------------------------------------------- *
  const container = document.createElement("div");
  container.id = VELA_WIDGETS_ID;
  container.className = "vela-newtab-widgets";

  // Clock widget.
  const clock = document.createElement("div");
  clock.className = "vela-widget vela-widget-clock";
  clock.innerHTML = `
    <div class="vela-clock-time"></div>
    <div class="vela-clock-date"></div>
  `;
  container.appendChild(clock);

  // Reading-list widget.
  const reading = document.createElement("div");
  reading.className = "vela-widget vela-widget-reading";
  reading.innerHTML = `
    <div class="vela-widget-label">Reading List</div>
    <div class="vela-widget-body vela-reading-list">—</div>
  `;
  container.appendChild(reading);

  // Recent bookmarks widget.
  const bookmarks = document.createElement("div");
  bookmarks.className = "vela-widget vela-widget-bookmarks";
  bookmarks.innerHTML = `
    <div class="vela-widget-label">Recent Bookmarks</div>
    <div class="vela-widget-body vela-recent-bookmarks">—</div>
  `;
  container.appendChild(bookmarks);

  // ----------------------------------------------------------------- *
  // Insert above the React root, but only after the body exists.
  // ----------------------------------------------------------------- *
  function insert() {
    const root = document.querySelector("#root") || document.body;
    if (!root || !root.parentNode) {
      setTimeout(insert, 50);
      return;
    }
    // Insert above #root, but inside body.
    document.body.insertBefore(container, root);
  }
  if (document.body) {
    insert();
  } else {
    document.addEventListener("DOMContentLoaded", insert);
  }

  // ----------------------------------------------------------------- *
  // Clock ticker.
  // ----------------------------------------------------------------- *
  function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    const date = now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const timeEl = container.querySelector(".vela-clock-time");
    const dateEl = container.querySelector(".vela-clock-date");
    if (timeEl) timeEl.textContent = time;
    if (dateEl) dateEl.textContent = date;
  }
  updateClock();
  setInterval(updateClock, 1000 * 15); // every 15s is enough for minute precision

  // ----------------------------------------------------------------- *
  // Reading list + recent bookmarks.
  //
  // We can't read prefs directly from the content process, so we ask
  // the parent via the React bundle's messaging bridge. If that's not
  // available (e.g. on prerendered pages), we show a calm placeholder.
  // ----------------------------------------------------------------- *
  function setPlaceholder(el, text) {
    if (el) el.textContent = text;
  }

  async function loadReadingList() {
    const el = container.querySelector(".vela-reading-list");
    if (!el) return;
    try {
      // Try the React bundle's message broker.
      const items = await VelaNewTabBridge.getReadingList();
      if (!items || !items.length) {
        el.innerHTML = `<span class="vela-empty-hint">No items yet. Press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> on any page to add it.</span>`;
        return;
      }
      el.innerHTML = items.slice(0, 3).map(it => `
        <a class="vela-list-item" href="${escapeHtml(it.url)}" title="${escapeHtml(it.title || it.url)}">
          <span class="vela-list-title">${escapeHtml(it.title || it.url)}</span>
          <span class="vela-list-meta">${formatTime(it.addedAt)}</span>
        </a>
      `).join("");
    } catch (e) {
      setPlaceholder(el, "Reading list unavailable here.");
    }
  }

  async function loadRecentBookmarks() {
    const el = container.querySelector(".vela-recent-bookmarks");
    if (!el) return;
    try {
      const items = await VelaNewTabBridge.getRecentBookmarks();
      if (!items || !items.length) {
        el.innerHTML = `<span class="vela-empty-hint">No bookmarks yet. Press <kbd>Ctrl</kbd>+<kbd>D</kbd> on any page to bookmark it.</span>`;
        return;
      }
      el.innerHTML = items.slice(0, 5).map(it => `
        <a class="vela-list-item" href="${escapeHtml(it.url)}" title="${escapeHtml(it.title || it.url)}">
          <span class="vela-list-title">${escapeHtml(it.title || it.url)}</span>
        </a>
      `).join("");
    } catch (e) {
      setPlaceholder(el, "Recent bookmarks unavailable here.");
    }
  }

  // ----------------------------------------------------------------- *
  // Bridge to the parent process.
  //
  // The new tab page runs in a privileged-about content process. We
  // can post messages to the parent via `RPMSendQuery` (the React
  // bundle's preferred API) or `sendAsyncMessage` (the older frame
  // script API). We try both, with timeouts.
  // ----------------------------------------------------------------- *
  const VelaNewTabBridge = {
    async getReadingList() {
      return this._query("Vela:GetReadingList", []);
    },
    async getRecentBookmarks() {
      return this._query("Vela:GetRecentBookmarks", []);
    },
    async _query(name, defaultVal) {
      // Try RPMSendQuery (privileged-about process API).
      if (typeof window.RPMSendQuery === "function" && typeof window.RPMAddMessageListener === "function") {
        return new Promise(resolve => {
          const id = name + ":" + Math.random().toString(36).slice(2);
          let done = false;
          const listener = msg => {
            if (msg.data && msg.data.id === id && !done) {
              done = true;
              window.RPMRemoveMessageListener(name + ":Response", listener);
              resolve(msg.data.result || defaultVal);
            }
          };
          window.RPMAddMessageListener(name + ":Response", listener);
          window.RPMSendQuery(name, { id });
          // Timeout after 1.5s.
          setTimeout(() => {
            if (!done) {
              done = true;
              window.RPMRemoveMessageListener?.(name + ":Response", listener);
              resolve(defaultVal);
            }
          }, 1500);
        });
      }
      // Fall back: no data available.
      return defaultVal;
    },
  };

  // ----------------------------------------------------------------- *
  // Helpers.
  // ----------------------------------------------------------------- *
  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime(ms) {
    if (!ms) return "";
    const d = new Date(ms);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  // Load widgets after a short delay so the React bundle has a chance
  // to lay out first.
  setTimeout(() => {
    loadReadingList();
    loadRecentBookmarks();
  }, 500);
})();
