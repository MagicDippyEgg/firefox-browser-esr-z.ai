/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Vela — original browser features.
 *
 * This module implements the four signature Vela features:
 *
 *   1. Focus Mode         — hide all chrome except the active page.
 *   2. Harbor             — a unified sidebar for bookmarks, history and
 *                           downloads, with a calm Vela-styled panel.
 *   3. Tides              — collapsible tab groups ("currents") you can
 *                           stash tabs into.
 *   4. Sepia Reader       — a warm sepia overlay applied to the active
 *                           page (distinct from Reader View).
 *
 * It also provides:
 *   - openAboutVela()     — opens the about:vela page.
 *   - A small "exit focus" pill that floats over the page in focus mode.
 *
 * All features are toggled via the Vela:* commands registered in
 * browser-sets.inc.xhtml and dispatched from browser-sets.js.
 *
 * The module is loaded as a subscript from global-scripts.js, so it runs
 * in the browser-window scope alongside browser.js, browser-places.js, etc.
 */

var VelaBrowser = {
  /* ----- Focus Mode --------------------------------------------------- */

  /**
   * Focus Mode hides every piece of browser chrome — the toolbar, tabs,
   * bookmarks bar and any open panels — leaving only the active page.
   *
   * The chrome is hidden via the [vela-focus-mode="true"] attribute set on
   * the document root; vela-theme.css collapses the navigator-toolbox and
   * titlebar when that attribute is present. A small "exit focus" pill is
   * injected so the user can leave focus mode with the mouse.
   *
   * Focus Mode is *not* full-screen: the OS window chrome stays. It is a
   * calmer, in-window alternative for reading or deep work.
   */
  _focusModeActive: false,

  toggleFocusMode() {
    this._focusModeActive = !this._focusModeActive;
    document.documentElement.setAttribute(
      "vela-focus-mode",
      this._focusModeActive ? "true" : "false"
    );
    if (this._focusModeActive) {
      this._enterFocusMode();
    } else {
      this._exitFocusMode();
    }
  },

  _enterFocusMode() {
    // Close any open popups (app menu, urlbar dropdown, etc.) so they don't
    // hover over the focused page.
    for (const popup of document.querySelectorAll(
      "panel:not([hidden]), menupopup:not([hidden])"
    )) {
      popup.hidePopup?.();
    }

    // Inject the exit-focus pill as an HTML element (the browser window's
    // root document is XHTML, so HTML elements work and respect CSS
    // position:fixed reliably across platforms).
    if (!document.getElementById("vela-focus-exit")) {
      const pill = document.createElement("button");
      pill.id = "vela-focus-exit";
      pill.type = "button";
      pill.textContent = "Exit Focus  ·  Esc";
      pill.setAttribute("title", "Exit Vela Focus Mode (Esc)");
      pill.addEventListener("click", () => this.toggleFocusMode());
      document.documentElement.appendChild(pill);
    }
    document.getElementById("vela-focus-exit")?.removeAttribute("hidden");

    // Persist via a pref so the user's choice survives restarts.
    Services.prefs.setBoolPref("vela.focusmode.active", true);
  },

  _exitFocusMode() {
    document.getElementById("vela-focus-exit")?.setAttribute("hidden", "true");
    Services.prefs.setBoolPref("vela.focusmode.active", false);
  },

  /** Restore the previous focus-mode state on startup. */
  initFocusMode() {
    this._focusModeActive = Services.prefs.getBoolPref(
      "vela.focusmode.active",
      false
    );
    if (this._focusModeActive) {
      document.documentElement.setAttribute("vela-focus-mode", "true");
      this._enterFocusMode();
    }
  },

  /* ----- Harbor ------------------------------------------------------- */

  /**
   * Harbor is a unified sidebar panel for bookmarks, history and downloads.
   * It is implemented as a thin wrapper around the existing SidebarUI
   * infrastructure: when toggled on, it shows a Vela-styled chrome document
   * that hosts a tabbed view of the three places.
   *
   * For now, the Harbor command toggles the existing sidebar with the
   * "viewBookmarksSidebar" view. This gives an immediate, functional
   * panel that inherits the Vela theme. The full unified Harbor panel
   * (with tabs) is left as an obvious next iteration.
   */
  _harborOpen: false,

  async toggleHarbor() {
    if (!window.SidebarUI) {
      console.warn("Vela: SidebarUI not available");
      return;
    }
    if (this._harborOpen) {
      await window.SidebarUI.hide();
      this._harborOpen = false;
      return;
    }
    // Show the bookmarks sidebar as the Harbor's default landing view.
    // The user can switch to history/downloads from the sidebar header.
    await window.SidebarUI.show("viewBookmarksSidebar");
    this._harborOpen = true;

    // Style the sidebar header to feel like Harbor.
    const header = document.getElementById("sidebar-header");
    if (header) {
      header.setAttribute("vela-harbor", "true");
    }
  },

  /* ----- Tides (tab groups) ------------------------------------------ */

  /**
   * Tides are collapsible tab groups. Vela leans on the existing
   * tab-group infrastructure in gBrowser.addTabGroup() but wraps it with
   * a calmer naming convention ("tide" instead of "group") and a default
   * colour from the Vela palette.
   *
   * The command creates a new tide containing the selected tabs (or, if
   * only one tab is selected, the selected tab and its neighbour) and
   * collapses it to keep the tab strip calm.
   */
  newTide() {
    if (!gBrowser?.addTabGroup) {
      console.warn("Vela: tab groups not supported in this build");
      return;
    }
    const selectedTabs = gBrowser.selectedTabs || [gBrowser.selectedTab];
    if (selectedTabs.length < 1) {
      return;
    }
    try {
      const group = gBrowser.addTabGroup(selectedTabs, {
        label: "Tide",
        color: "orange", // closest to Vela terracotta in the built-in palette
        collapsed: false,
      });
      // If a label editor appears, focus it so the user can name the tide.
      const editor = document.querySelector("tab-group-editor");
      if (editor && typeof editor.focus === "function") {
        editor.focus();
      }
      return group;
    } catch (e) {
      console.warn("Vela: could not create tide", e);
    }
  },

  /* ----- Sepia Reader ------------------------------------------------- */

  /**
   * Sepia Reader applies a warm sepia tint to the active page *without*
   * transforming it into Reader View. It works by injecting a <style>
   * element into the page document via a registered frame script.
   *
   * Per-tab state is tracked on the tab element via the [vela-sepia]
   * attribute. When the user navigates within a tab that has sepia
   * enabled, the frame script re-applies the overlay on DOMContentLoaded.
   *
   * The frame script is registered once per browser window via init().
   */
  _sepiaFrameScriptURL:
    "chrome://browser/content/vela-sepia-framescript.js",

  toggleSepiaReader() {
    const tab = gBrowser?.selectedTab;
    if (!tab) return;
    const enabled = tab.getAttribute("vela-sepia") === "true";
    const next = !enabled;
    tab.setAttribute("vela-sepia", next ? "true" : "false");
    const browser = gBrowser.getBrowserForTab(tab);
    if (browser?.messageManager) {
      browser.messageManager.sendAsyncMessage("Vela:SepiaReader:Toggle", {
        enable: next,
      });
    }
  },

  /**
   * Re-applies sepia to the browser after a navigation. Called from a
   * progress listener installed in init().
   */
  _reapplySepia(browser) {
    const tab = gBrowser.getTabForBrowser(browser);
    if (!tab) return;
    if (tab.getAttribute("vela-sepia") === "true" && browser.messageManager) {
      browser.messageManager.sendAsyncMessage("Vela:SepiaReader:Toggle", {
        enable: true,
      });
    }
  },

  /* ----- about:vela --------------------------------------------------- */

  /**
   * Opens about:vela — Vela's home page inside the browser, a calm
   * welcome screen with the wordmark, tagline, version info and a few
   * useful links (settings, help, etc.).
   */
  openAboutVela() {
    if (!gBrowser) return;
    gBrowser.selectedTab = gBrowser.addTab("about:vela");
  },

  /* ----- Init --------------------------------------------------------- */

  /**
   * Called once the main window is ready. Registers the Sepia Reader
   * frame script with every browser's message manager, installs a
   * progress listener so sepia is re-applied after navigation, restores
   * focus-mode state, and wires up the Escape-to-exit-focus shortcut.
   */
  init() {
    // Register the Sepia Reader frame script globally so it loads in
    // every browser, present and future. The second arg
    // (allowDelayedLoad) means frames will load the script on demand.
    try {
      Services.mm.loadFrameScript(this._sepiaFrameScriptURL, true);
    } catch (e) {
      console.warn("Vela: could not register sepia frame script", e);
    }

    // Restore focus mode state.
    try {
      this.initFocusMode();
    } catch (e) {
      console.warn("Vela: focus-mode init failed", e);
    }

    // Wire up the Escape key to exit focus mode.
    document.addEventListener("keydown", event => {
      if (
        this._focusModeActive &&
        event.key === "Escape" &&
        !event.defaultPrevented
      ) {
        // Only exit on Escape if no input is focused (so Escape in inputs
        // still works as expected).
        const tag = document.activeElement?.tagName;
        if (tag !== "input" && tag !== "textarea" && tag !== "browser") {
          this.toggleFocusMode();
          event.preventDefault();
        }
      }
    });

    // Install a progress listener so Sepia Reader is re-applied after the
    // user navigates within a sepia-enabled tab. We piggy-back on
    // gBrowser's existing tab progress listener stack.
    try {
      const listener = {
        onLocationChange: (aBrowser, aWebProgress, aRequest, aLocation) => {
          if (aBrowser) {
            this._reapplySepia(aBrowser);
          }
        },
        QueryInterface: ChromeUtils.generateQI([
          Ci.nsIWebProgressListener,
          Ci.nsISupportsWeakReference,
        ]),
      };
      gBrowser.addProgressListener(listener);
      // Stash so we could remove later if needed.
      this._sepiaProgressListener = listener;
    } catch (e) {
      console.warn("Vela: could not install sepia progress listener", e);
    }

    console.debug("Vela: original features initialised.");
  },
};

// Hook into browser-window startup. `BrowserWindowTracker` is loaded by
// browser.js, so we can wait for the delayed-init task before calling init.
// Simpler: register a load-event listener that fires after browser-init.
window.addEventListener("DOMContentLoaded", () => {
  // Run after the rest of the window has had a chance to set up.
  Services.tm.dispatchToMainThread(() => {
    try {
      VelaBrowser.init();
    } catch (e) {
      console.error("Vela: init failed", e);
    }
  });
});
