/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * VelaReadingList — a lightweight, pref-backed reading list.
 *
 * Distinct from bookmarks: a flat, chronological list of pages the user
 * intends to read later. Items are added from the Vela menu or the
 * page context menu.
 *
 * Storage: a single string pref "vela.readinglist.items" containing
 * a JSON-encoded array of { url, title, addedAt } objects. Capped at
 * 500 items to keep the pref small.
 */

const VelaReadingList = {
  PREF: "vela.readinglist.items",
  MAX: 500,

  _get() {
    try {
      const raw = Services.prefs.getStringPref(this.PREF, "[]");
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn("VelaReadingList: parse failed, resetting", e);
      Services.prefs.setStringPref(this.PREF, "[]");
      return [];
    }
  },

  _set(arr) {
    Services.prefs.setStringPref(this.PREF, JSON.stringify(arr));
  },

  all() {
    // Newest first.
    return this._get().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  },

  add(url, title = "") {
    if (!url) return;
    const items = this._get();
    // De-dupe by URL.
    const existing = items.findIndex(i => i.url === url);
    if (existing >= 0) {
      // Move to top with refreshed title.
      items.splice(existing, 1);
    }
    items.push({ url, title: title || url, addedAt: Date.now() });
    // Cap.
    if (items.length > this.MAX) items.length = this.MAX;
    this._set(items);
  },

  remove(url) {
    const items = this._get().filter(i => i.url !== url);
    this._set(items);
  },

  has(url) {
    return this._get().some(i => i.url === url);
  },

  clear() {
    this._set([]);
  },
};

// Expose to the window scope (this script runs in the harbor panel's
// context via loadSubScript).
this.VelaReadingList = VelaReadingList;
