/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * about:vela — populates the version line with the running build's
 * version, and wires up the feature-settings toggles/sliders to the
 * corresponding vela.* prefs.
 *
 * about:vela is registered with IS_SECURE_CHROME_UI, so it runs with
 * chrome privileges and `Services` is available on the global scope.
 */

(function () {
  // ----------------------------------------------------------------- *
  // Version line.
  // ----------------------------------------------------------------- *
  try {
    const versionEl = document.getElementById("vela-version");
    if (versionEl && Services.appinfo) {
      versionEl.textContent = "Version " + Services.appinfo.version;
    }
  } catch (e) {
    console.warn("about:vela: could not read version", e);
  }

  // ----------------------------------------------------------------- *
  // Settings panel — wire up each input to its pref.
  // ----------------------------------------------------------------- *
  function readPref(pref) {
    try {
      // Try Bool first, then Int, then String, then Float.
      if (Services.prefs.getBoolPref.length !== undefined) {
        try {
          return Services.prefs.getBoolPref(pref);
        } catch (e) { /* not a bool */ }
      }
      try {
        const v = Services.prefs.getStringPref(pref);
        return v;
      } catch (e) { /* not a string */ }
    } catch (e) {}
    return undefined;
  }

  function readFloat(pref, defaultVal) {
    try {
      return Services.prefs.getFloatPref(pref, defaultVal);
    } catch (e) {
      return defaultVal;
    }
  }

  function readBool(pref, defaultVal) {
    try {
      return Services.prefs.getBoolPref(pref, defaultVal);
    } catch (e) {
      return defaultVal;
    }
  }

  function writeBool(pref, val) {
    try { Services.prefs.setBoolPref(pref, val); } catch (e) { console.warn(e); }
  }

  function writeFloat(pref, val) {
    try { Services.prefs.setFloatPref(pref, val); } catch (e) { console.warn(e); }
  }

  // Initialise each control from its pref.
  for (const input of document.querySelectorAll("[data-pref]")) {
    const pref = input.dataset.pref;

    if (input.type === "checkbox") {
      input.checked = readBool(pref, true);
      input.addEventListener("change", () => writeBool(pref, input.checked));
    } else if (input.type === "range") {
      input.value = readFloat(pref, parseFloat(input.value) || 0);
      input.addEventListener("input", () => writeFloat(pref, parseFloat(input.value)));
    }
  }
})();
