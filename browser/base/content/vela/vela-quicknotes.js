/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * VelaQuickNotes — a pref-backed scratchpad.
 *
 * A single string of notes that persists across sessions, stored in the
 * pref "vela.notes.text". Used by the Harbor sidebar's Notes tab.
 *
 * The text is capped at 64 KB to keep the pref store small.
 */

const VelaQuickNotes = {
  PREF: "vela.notes.text",
  MAX: 65536,

  load() {
    try {
      return Services.prefs.getStringPref(this.PREF, "");
    } catch (e) {
      console.warn("VelaQuickNotes: load failed", e);
      return "";
    }
  },

  save(text) {
    if (typeof text !== "string") return;
    if (text.length > this.MAX) text = text.slice(0, this.MAX);
    Services.prefs.setStringPref(this.PREF, text);
  },

  clear() {
    Services.prefs.setStringPref(this.PREF, "");
  },
};

this.VelaQuickNotes = VelaQuickNotes;
