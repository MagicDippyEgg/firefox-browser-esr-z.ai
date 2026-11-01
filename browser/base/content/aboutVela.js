/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * about:vela — populates the version line with the running build's
 * version and channel info.
 *
 * about:vela is registered with IS_SECURE_CHROME_UI, so it runs with
 * chrome privileges and `Services` is available on the global scope.
 */

(function () {
  const versionEl = document.getElementById("vela-version");
  if (!versionEl) return;

  try {
    // Services is available in chrome-privileged about: pages.
    const appinfo = Services.appinfo;
    if (appinfo) {
      versionEl.textContent = "Version " + appinfo.version;
    }
  } catch (e) {
    console.warn("about:vela: could not read version", e);
    versionEl.textContent = "Version";
  }
})();
