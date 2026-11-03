/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * VelaWorkspaces — saved, named collections of tabs the user can switch
 * between.
 *
 * A workspace captures the URLs (and titles) of every open tab at the
 * moment it was saved. Switching workspaces closes the current tabs and
 * reopens the saved set. This is useful for separating contexts —
 * "Work", "Personal", "Research project", etc. — without keeping all
 * tabs open at once.
 *
 * Storage: a single string pref "vela.workspaces.list" containing a
 * JSON-encoded array of:
 *   { id, name, color, createdAt, lastOpenedAt, tabs: [{ url, title }] }
 *
 * The currently-active workspace id is stored in "vela.workspaces.active".
 *
 * This module runs in the browser-chrome scope (loaded as a subscript
 * of vela-browser.js). It uses the global `gBrowser` and `Services`.
 */

if (typeof Services === "undefined") {
  var { Services } = ChromeUtils.importESModule(
    "resource://gre/modules/Services.sys.mjs"
  );
}

const VelaWorkspaces = {
  PREF_LIST: "vela.workspaces.list",
  PREF_ACTIVE: "vela.workspaces.active",
  MAX: 50,
  MAX_TABS_PER: 200,

  _get() {
    try {
      const raw = Services.prefs.getStringPref(this.PREF_LIST, "[]");
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn("VelaWorkspaces: parse failed, resetting", e);
      Services.prefs.setStringPref(this.PREF_LIST, "[]");
      return [];
    }
  },

  _set(arr) {
    Services.prefs.setStringPref(this.PREF_LIST, JSON.stringify(arr));
  },

  all() {
    return this._get().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  },

  get(id) {
    return this._get().find(w => w.id === id) || null;
  },

  activeId() {
    return Services.prefs.getStringPref(this.PREF_ACTIVE, "");
  },

  active() {
    const id = this.activeId();
    return id ? this.get(id) : null;
  },

  /**
   * Create a new workspace from the currently-open tabs.
   * Returns the new workspace object.
   */
  create(name, color = "terracotta") {
    const ws = {
      id: "ws-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      name: name || "Workspace",
      color,
      createdAt: Date.now(),
      lastOpenedAt: 0,
      tabs: this._captureTabs(),
    };
    const arr = this._get();
    arr.push(ws);
    if (arr.length > this.MAX) arr.shift();
    this._set(arr);
    return ws;
  },

  /**
   * Update an existing workspace's name / colour.
   */
  update(id, { name, color } = {}) {
    const arr = this._get();
    const ws = arr.find(w => w.id === id);
    if (!ws) return;
    if (name !== undefined) ws.name = name;
    if (color !== undefined) ws.color = color;
    this._set(arr);
  },

  /**
   * Replace a workspace's saved tabs with the currently-open ones.
   */
  saveCurrent(id) {
    const arr = this._get();
    const ws = arr.find(w => w.id === id);
    if (!ws) return;
    ws.tabs = this._captureTabs();
    ws.lastOpenedAt = Date.now();
    this._set(arr);
  },

  /**
   * Delete a workspace by id.
   */
  remove(id) {
    const arr = this._get().filter(w => w.id !== id);
    this._set(arr);
    if (this.activeId() === id) {
      Services.prefs.setStringPref(this.PREF_ACTIVE, "");
    }
  },

  /**
   * Switch to a workspace: close all current tabs and open the saved
   * set. Returns true on success.
   *
   * The active workspace is recorded so the next launch can restore it.
   */
  switchTo(id) {
    const ws = this.get(id);
    if (!ws) return false;

    // Capture current tabs first (so the user can switch back).
    const previousId = this.activeId();
    if (previousId && previousId !== id) {
      this.saveCurrent(previousId);
    }

    // Close all current tabs except the last one (then replace it).
    // We keep one tab open throughout to avoid the "no tabs" state.
    if (!gBrowser) return false;
    const tabs = [...gBrowser.tabs];
    // Open the first saved URL in the existing tab, then add the rest.
    if (ws.tabs.length === 0) {
      // Empty workspace — open about:blank.
      gBrowser.selectedTab = gBrowser.selectedTab;
      gBrowser.loadURI(Services.io.newURI("about:blank"));
    } else {
      const first = ws.tabs[0];
      try {
        gBrowser.selectedTab = gBrowser.selectedTab;
        gBrowser.loadURI(Services.io.newURI(first.url));
      } catch (e) {
        console.warn("VelaWorkspaces: could not load first url", e);
      }
      for (let i = 1; i < ws.tabs.length && i < this.MAX_TABS_PER; i++) {
        try {
          gBrowser.addTab(ws.tabs[i].url);
        } catch (e) {
          console.warn("VelaWorkspaces: could not open tab", e);
        }
      }
    }
    // Close the other original tabs.
    for (const t of tabs) {
      if (t !== gBrowser.selectedTab && !t.closing) {
        gBrowser.removeTab(t);
      }
    }

    // Record active.
    Services.prefs.setStringPref(this.PREF_ACTIVE, id);
    const arr = this._get();
    const w = arr.find(x => x.id === id);
    if (w) w.lastOpenedAt = Date.now();
    this._set(arr);
    return true;
  },

  /**
   * Capture the currently-open tabs as a serialisable array.
   */
  _captureTabs() {
    if (!gBrowser) return [];
    const out = [];
    for (const tab of gBrowser.tabs) {
      const browser = gBrowser.getBrowserForTab(tab);
      if (!browser) continue;
      const url = browser.currentURI?.spec;
      if (!url) continue;
      // Skip internal pages that don't make sense to restore.
      if (url.startsWith("about:") && !url.startsWith("about:blank")) continue;
      const title = browser.contentTitle || tab.label || url;
      out.push({ url, title });
      if (out.length >= this.MAX_TABS_PER) break;
    }
    return out;
  },
};

this.VelaWorkspaces = VelaWorkspaces;
