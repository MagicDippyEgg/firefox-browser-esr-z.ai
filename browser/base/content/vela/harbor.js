/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Vela Harbor — sidebar panel logic.
 *
 * Wires up the five Harbor tabs (Bookmarks, History, Downloads, Reading,
 * Notes) to their data sources:
 *
 *   - Bookmarks : PlacesUtils.bookmarks (read-only tree, top-level + recent)
 *   - History   : PlacesUtils.history   (recent visit query)
 *   - Downloads : DownloadsCommon.getData()  (active + completed)
 *   - Reading   : VelaReadingList (Vela's own pref-backed list)
 *   - Notes     : VelaQuickNotes  (Vela's own pref-backed scratchpad)
 *
 * The panel is chrome-privileged, so it can use Services, ChromeUtils
 * and XPCOM directly.
 */

const { Services } = ChromeUtils.importESModule(
  "resource://gre/modules/Services.sys.mjs"
);

// Lazy-load the heavyweight modules so the panel opens fast.
const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  DownloadsCommon:
    "resource:///modules/DownloadsCommon.sys.mjs",
});

// Vela's own modules — loaded synchronously since they're small.
Services.scriptloader.loadSubScript(
  "chrome://browser/content/vela/vela-readinglist.js", this
);
Services.scriptloader.loadSubScript(
  "chrome://browser/content/vela/vela-quicknotes.js", this
);

const Harbor = {
  _activeTab: "bookmarks",
  _filter: "",

  async init() {
    // Tab switching.
    for (const tab of document.querySelectorAll(".harbor-tab")) {
      tab.addEventListener("click", () => this.switchTo(tab.dataset.tab));
    }

    // Search filter.
    const search = document.getElementById("harbor-search");
    search.addEventListener("input", () => {
      this._filter = search.value.trim().toLowerCase();
      this._renderActive();
    });

    // Notes editor — load and wire up auto-save.
    this._initNotes();

    // Initial render of all panels.
    await this._refreshBookmarks();
    await this._refreshHistory();
    this._refreshDownloads();
    this._refreshReadingList();
  },

  switchTo(name) {
    this._activeTab = name;
    for (const tab of document.querySelectorAll(".harbor-tab")) {
      tab.setAttribute("aria-selected", tab.dataset.tab === name ? "true" : "false");
    }
    for (const panel of document.querySelectorAll(".harbor-panel")) {
      panel.hidden = panel.dataset.panel !== name ? "hidden" : null;
    }
    this._renderActive();
  },

  _renderActive() {
    switch (this._activeTab) {
      case "bookmarks":   this._refreshBookmarks(); break;
      case "history":     this._refreshHistory(); break;
      case "downloads":   this._refreshDownloads(); break;
      case "reading":     this._refreshReadingList(); break;
      // notes panel doesn't filter
    }
  },

  /* ----- Bookmarks --------------------------------------------------- */

  async _refreshBookmarks() {
    const ul = document.getElementById("harbor-bookmarks-list");
    const empty = document.getElementById("harbor-bookmarks-empty");
    ul.innerHTML = "";
    try {
      const bm = lazy.PlacesUtils.bookmarks;
      // Top-level bookmarks (toolbar, menu, unfiled).
      const roots = [
        lazy.PlacesUtils.bookmarks.toolbarGuid,
        lazy.PlacesUtils.bookmarks.menuGuid,
        lazy.PlacesUtils.bookmarks.unfiledGuid,
      ];
      let count = 0;
      for (const guid of roots) {
        const items = await bm.fetchDescendantBMs(guid);
        if (!items || !items.length) continue;
        // Section heading.
        const headingMap = {
          [lazy.PlacesUtils.bookmarks.toolbarGuid]: "Bookmarks Toolbar",
          [lazy.PlacesUtils.bookmarks.menuGuid]: "Bookmarks Menu",
          [lazy.PlacesUtils.bookmarks.unfiledGuid]: "Other Bookmarks",
        };
        const h = document.createElement("li");
        h.className = "harbor-section-heading";
        h.textContent = headingMap[guid] || "Bookmarks";
        ul.appendChild(h);
        for (const it of items.slice(0, 50)) {
          if (this._filter && !it.url && !it.title) continue;
          if (this._filter) {
            const t = (it.title || "").toLowerCase();
            const u = (it.url || "").toLowerCase();
            if (!t.includes(this._filter) && !u.includes(this._filter)) continue;
          }
          ul.appendChild(this._renderItem({
            title: it.title || it.url || "(no title)",
            url: it.url || "",
            type: it.type === bm.TYPE_FOLDER ? "folder" : "bookmark",
            guid: it.guid,
          }));
          count++;
        }
      }
      empty.hidden = count > 0;
    } catch (e) {
      console.warn("Harbor: bookmarks refresh failed", e);
      empty.hidden = false;
      empty.textContent = "Could not load bookmarks.";
    }
  },

  /* ----- History ----------------------------------------------------- */

  async _refreshHistory() {
    const ul = document.getElementById("harbor-history-list");
    const empty = document.getElementById("harbor-history-empty");
    ul.innerHTML = "";
    try {
      // Query the last 200 visits, grouped by day.
      const opts = lazy.PlacesUtils.history.getNewQueryOptions();
      opts.sortingMode = opts.SORT_BY_DATE_DESCENDING;
      opts.maxResults = 200;
      const query = lazy.PlacesUtils.history.getNewQuery();
      const result = lazy.PlacesUtils.history.executeQuery(query, opts);
      const root = result.root;
      root.containerOpen = true;
      let count = 0;
      let lastDay = null;
      for (let i = 0; i < root.childCount; i++) {
        const node = root.getChild(i);
        if (this._filter) {
          const t = (node.title || "").toLowerCase();
          const u = (node.uri || "").toLowerCase();
          if (!t.includes(this._filter) && !u.includes(this._filter)) continue;
        }
        // Section heading per day.
        const day = this._dayString(node.time);
        if (day !== lastDay) {
          const h = document.createElement("li");
          h.className = "harbor-section-heading";
          h.textContent = day;
          ul.appendChild(h);
          lastDay = day;
        }
        ul.appendChild(this._renderItem({
          title: node.title || node.uri,
          url: node.uri,
          type: "history",
          time: node.time,
        }));
        count++;
      }
      root.containerOpen = false;
      empty.hidden = count > 0;
    } catch (e) {
      console.warn("Harbor: history refresh failed", e);
      empty.hidden = false;
      empty.textContent = "Could not load history.";
    }
  },

  _dayString(prTime) {
    // prTime is microseconds.
    const d = new Date(prTime / 1000);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yest.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  },

  /* ----- Downloads --------------------------------------------------- */

  _refreshDownloads() {
    const ul = document.getElementById("harbor-downloads-list");
    const empty = document.getElementById("harbor-downloads-empty");
    ul.innerHTML = "";
    try {
      const list = lazy.DownloadsCommon.getData();
      // Use getAll() to get all downloads.
      list.getAll().then(downloads => {
        let count = 0;
        for (const dl of downloads.slice(0, 100)) {
          if (this._filter) {
            const t = (dl.target?.path || "").toLowerCase();
            const u = (dl.source?.url || "").toLowerCase();
            if (!t.includes(this._filter) && !u.includes(this._filter)) continue;
          }
          const path = dl.target?.path || "(unknown)";
          const name = path.split("/").pop().split("\\").pop() || path;
          const item = this._renderItem({
            title: name,
            url: dl.source?.url || "",
            type: "download",
            state: this._downloadState(dl),
          });
          // Click opens the downloaded file.
          item.addEventListener("click", e => {
            if (e.target.closest(".remove")) return;
            try {
              const file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
              file.initWithPath(path);
              if (file.exists()) file.launch();
            } catch (err) {
              console.warn("Harbor: could not open download", err);
            }
          });
          ul.appendChild(item);
          count++;
        }
        empty.hidden = count > 0;
      }).catch(e => {
        console.warn("Harbor: downloads getAll failed", e);
        empty.hidden = false;
        empty.textContent = "Could not load downloads.";
      });
    } catch (e) {
      console.warn("Harbor: downloads refresh failed", e);
      empty.hidden = false;
      empty.textContent = "Could not load downloads.";
    }
  },

  _downloadState(dl) {
    if (dl.succeeded) return "Done";
    if (dl.error) return "Failed";
    if (dl.canceled) return "Cancelled";
    if (dl.hasProgress) return `${Math.round(dl.progress)}%`;
    return "Pending";
  },

  /* ----- Reading list ------------------------------------------------ */

  _refreshReadingList() {
    const ul = document.getElementById("harbor-reading-list");
    const empty = document.getElementById("harbor-reading-empty");
    ul.innerHTML = "";
    try {
      const items = VelaReadingList.all();
      let count = 0;
      for (const it of items) {
        if (this._filter) {
          const t = (it.title || "").toLowerCase();
          const u = (it.url || "").toLowerCase();
          if (!t.includes(this._filter) && !u.includes(this._filter)) continue;
        }
        const item = this._renderItem({
          title: it.title || it.url,
          url: it.url,
          type: "reading",
          time: it.addedAt,
        });
        // Remove button.
        const remove = item.querySelector(".remove");
        if (remove) {
          remove.textContent = "×";
          remove.title = "Remove from reading list";
          remove.addEventListener("click", e => {
            e.stopPropagation();
            VelaReadingList.remove(it.url);
            this._refreshReadingList();
          });
        }
        ul.appendChild(item);
        count++;
      }
      empty.hidden = count > 0;
    } catch (e) {
      console.warn("Harbor: reading list refresh failed", e);
      empty.hidden = false;
      empty.textContent = "Could not load reading list.";
    }
  },

  /* ----- Notes ------------------------------------------------------- */

  _initNotes() {
    const editor = document.getElementById("harbor-notes-editor");
    const status = document.getElementById("harbor-notes-status");
    try {
      editor.value = VelaQuickNotes.load();
    } catch (e) {
      console.warn("Harbor: notes load failed", e);
    }
    let saveTimer = null;
    editor.addEventListener("input", () => {
      status.textContent = "Saving…";
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          VelaQuickNotes.save(editor.value);
          status.textContent = "Saved.";
        } catch (e) {
          status.textContent = "Save failed.";
          console.warn("Harbor: notes save failed", e);
        }
      }, 400);
    });
  },

  /* ----- Item rendering --------------------------------------------- */

  _renderItem({ title, url, type, time, state, guid }) {
    const li = document.createElement("li");
    li.className = "harbor-item";
    if (type === "folder") li.classList.add("folder");

    // Favicon / placeholder.
    const host = this._hostFromUrl(url);
    if (type !== "folder" && url) {
      const img = document.createElement("img");
      img.className = "favicon";
      img.src = `https://icon.horse/icon/${host}`;
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => {
        const ph = document.createElement("span");
        ph.className = "favicon-placeholder";
        ph.textContent = host ? host[0] : "?";
        img.replaceWith(ph);
      };
      li.appendChild(img);
    } else {
      const ph = document.createElement("span");
      ph.className = "favicon-placeholder";
      ph.textContent = type === "folder" ? "▸" : (host ? host[0].toUpperCase() : "?");
      li.appendChild(ph);
    }

    // Label.
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = title || url || "(untitled)";
    li.appendChild(label);

    // Meta (state / time).
    if (state) {
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = state;
      li.appendChild(meta);
    } else if (time) {
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = this._timeShort(time);
      li.appendChild(meta);
    }

    // Remove button (only for reading list and bookmarks).
    if (type === "reading") {
      const rm = document.createElement("button");
      rm.className = "remove";
      rm.textContent = "×";
      rm.setAttribute("aria-label", "Remove");
      li.appendChild(rm);
    }

    // Click = open in current tab.
    if (url && type !== "folder") {
      li.addEventListener("click", e => {
        if (e.target.closest(".remove")) return;
        this._openInBrowser(url);
      });
    }

    return li;
  },

  _openInBrowser(url) {
    try {
      // Open in the topmost browser window's current tab.
      const win = Services.wm.getMostRecentWindow("navigator:browser");
      if (win) {
        win.gBrowser.loadURI(Services.io.newURI(url));
        win.focus();
      } else {
        window.open(url, "_blank");
      }
    } catch (e) {
      console.warn("Harbor: could not open url", url, e);
    }
  },

  _hostFromUrl(url) {
    try {
      return Services.io.newURI(url).host;
    } catch (e) {
      return "";
    }
  },

  _timeShort(prTime) {
    if (!prTime) return "";
    const d = new Date(prTime / 1000);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  },
};

// Boot when DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
  Harbor.init().catch(e => console.error("Harbor init failed", e));
});
