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
   * Harbor is Vela's unified sidebar — a single panel with tabs for
   * bookmarks, history, downloads, reading list and quick notes.
   *
   * The panel itself is a chrome-privileged XHTML document at
   * chrome://browser/content/vela/harbor.xhtml, registered as the
   * "viewVelaHarborSidebar" sidebar panel in browser-sidebar.js.
   *
   * toggleHarbor() shows or hides that panel via SidebarController.
   * The panel's own JS (harbor.js) handles tab switching and
   * populating each view from Places, Downloads and the Vela
   * ReadingList / QuickNotes modules.
   */
  _harborOpen: false,

  async toggleHarbor() {
    const SidebarController = window.SidebarController;
    if (!SidebarController) {
      // Fall back to SidebarUI (older API name).
      if (window.SidebarUI) {
        if (this._harborOpen) {
          await window.SidebarUI.hide();
          this._harborOpen = false;
        } else {
          await window.SidebarUI.show("viewVelaHarborSidebar");
          this._harborOpen = true;
        }
      } else {
        console.warn("Vela: no sidebar controller available");
      }
      return;
    }
    if (this._harborOpen || SidebarController.currentID === "viewVelaHarborSidebar") {
      await SidebarController.hide();
      this._harborOpen = false;
      return;
    }
    await SidebarController.show("viewVelaHarborSidebar");
    this._harborOpen = true;
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
   * transforming it into Reader View. Useful for long-form reading on
   * bright white sites that don't deserve a full reader-mode transform.
   *
   * Implementation:
   *   - A registered frame script (vela-sepia-framescript.js) injects a
   *     <style> element with CSS `filter: sepia()` on <html> plus a warm
   *     parchment background colour and warm link colours.
   *   - Per-tab state is tracked on the tab element via the [vela-sepia]
   *     attribute. The frame script re-applies the overlay on
   *     DOMContentLoaded so navigation within a sepia tab keeps the tint.
   *   - A floating control panel (Sepia Reader toolbar) appears at the
   *     top-right whenever Sepia Reader is on, with sliders for intensity,
   *     font scale, line height, and toggles for warm background and warm
   *     link colours. The panel is injected into the browser chrome and
   *     styled by vela-theme.css.
   *   - Settings are persisted in the vela.sepia-reader.* prefs and
   *     applied to every tab where Sepia Reader is enabled.
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
        settings: this._sepiaSettings(),
      });
    }
    if (next) {
      this._showSepiaPanel();
    } else {
      this._hideSepiaPanel();
    }
  },

  /**
   * Returns the current Sepia Reader settings from prefs, with defaults.
   */
  _sepiaSettings() {
    return {
      intensity: Services.prefs.getFloatPref("vela.sepia-reader.intensity", 0.30),
      fontScale: Services.prefs.getFloatPref("vela.sepia-reader.font-scale", 1.05),
      lineHeight: Services.prefs.getFloatPref("vela.sepia-reader.line-height", 1.65),
      warmBg: Services.prefs.getBoolPref("vela.sepia-reader.warm-bg", true),
      warmLinks: Services.prefs.getBoolPref("vela.sepia-reader.warm-links", true),
    };
  },

  /**
   * Pushes the current settings to the active sepia-enabled tab.
   */
  _pushSepiaSettings() {
    const tab = gBrowser?.selectedTab;
    if (!tab || tab.getAttribute("vela-sepia") !== "true") return;
    const browser = gBrowser.getBrowserForTab(tab);
    if (browser?.messageManager) {
      browser.messageManager.sendAsyncMessage("Vela:SepiaReader:Settings", {
        settings: this._sepiaSettings(),
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
        settings: this._sepiaSettings(),
      });
    }
  },

  /**
   * Shows the Sepia Reader floating control panel. The panel is created
   * lazily and reused across toggles.
   */
  _showSepiaPanel() {
    let panel = document.getElementById("vela-sepia-panel");
    if (!panel) {
      panel = this._buildSepiaPanel();
      document.documentElement.appendChild(panel);
    }
    panel.removeAttribute("hidden");
  },

  _hideSepiaPanel() {
    document.getElementById("vela-sepia-panel")?.setAttribute("hidden", "true");
  },

  _buildSepiaPanel() {
    const s = this._sepiaSettings();
    const panel = document.createElement("div");
    panel.id = "vela-sepia-panel";
    panel.innerHTML = `
      <div class="vela-sepia-header">
        <span class="vela-sepia-title">Sepia Reader</span>
        <button class="vela-sepia-close" title="Turn off Sepia Reader">×</button>
      </div>
      <label class="vela-sepia-row">
        <span>Warmth</span>
        <input type="range" min="0" max="0.8" step="0.05" value="${s.intensity}" data-pref="intensity" />
        <span class="vela-sepia-value"></span>
      </label>
      <label class="vela-sepia-row">
        <span>Font size</span>
        <input type="range" min="0.9" max="1.4" step="0.05" value="${s.fontScale}" data-pref="font-scale" />
        <span class="vela-sepia-value"></span>
      </label>
      <label class="vela-sepia-row">
        <span>Line height</span>
        <input type="range" min="1.3" max="2.0" step="0.05" value="${s.lineHeight}" data-pref="line-height" />
        <span class="vela-sepia-value"></span>
      </label>
      <label class="vela-sepia-row vela-sepia-toggle-row">
        <input type="checkbox" ${s.warmBg ? "checked" : ""} data-pref="warm-bg" />
        <span>Warm background</span>
      </label>
      <label class="vela-sepia-row vela-sepia-toggle-row">
        <input type="checkbox" ${s.warmLinks ? "checked" : ""} data-pref="warm-links" />
        <span>Warm link colours</span>
      </label>
    `;

    // Wire up controls.
    panel.querySelector(".vela-sepia-close").addEventListener("click", () => {
      this.toggleSepiaReader();
    });
    for (const input of panel.querySelectorAll("input")) {
      input.addEventListener("input", () => {
        const pref = input.dataset.pref;
        const prefName = "vela.sepia-reader." + pref;
        let val = input.type === "checkbox" ? input.checked : parseFloat(input.value);
        if (pref === "intensity" || pref === "font-scale" || pref === "line-height") {
          Services.prefs.setFloatPref(prefName, val);
        } else {
          Services.prefs.setBoolPref(prefName, val);
        }
        this._pushSepiaSettings();
        this._updateSepiaPanelValues();
      });
    }
    this._updateSepiaPanelValues();
    return panel;
  },

  _updateSepiaPanelValues() {
    const panel = document.getElementById("vela-sepia-panel");
    if (!panel) return;
    const s = this._sepiaSettings();
    panel.querySelectorAll('input[type="range"]').forEach(input => {
      const pref = input.dataset.pref;
      const val = pref === "intensity" ? s.intensity
                : pref === "font-scale" ? s.fontScale
                : pref === "line-height" ? s.lineHeight
                : 0;
      const display = input.parentElement.querySelector(".vela-sepia-value");
      if (display) display.textContent = val.toFixed(2);
    });
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

  /* ----- Duplicate Tab — Ctrl+Shift+D ------------------------------- */

  /**
   * Duplicates the current tab — opens a new tab with the same URL and
   * history, right next to the current one.
   */
  duplicateTab() {
    if (!gBrowser) return;
    const tab = gBrowser.selectedTab;
    if (!tab) return;
    try {
      // duplicateTab returns the new tab; it's placed after the original.
      gBrowser.duplicateTab(tab);
    } catch (e) {
      console.warn("Vela: could not duplicate tab", e);
    }
  },

  /* ----- Calm Tabs — dim inactive tabs for focus --------------------- */

  /**
   * Calm Tabs dims all tabs except the selected one, making it easier
   * to focus on the current page. Toggled by Ctrl+Alt+C.
   *
   * Implemented by setting a [vela-calm-tabs] attribute on the
   * document root; vela-theme.css then applies opacity to non-selected
   * tabs when the attribute is present.
   */
  _calmTabsActive: false,

  toggleCalmTabs() {
    this._calmTabsActive = !this._calmTabsActive;
    document.documentElement.setAttribute(
      "vela-calm-tabs",
      this._calmTabsActive ? "true" : "false"
    );
    Services.prefs.setBoolPref("vela.calm-tabs.active", this._calmTabsActive);
  },

  _initCalmTabs() {
    try {
      this._calmTabsActive = Services.prefs.getBoolPref(
        "vela.calm-tabs.active",
        false
      );
      if (this._calmTabsActive) {
        document.documentElement.setAttribute("vela-calm-tabs", "true");
      }
    } catch (e) {
      console.warn("Vela: calm-tabs init failed", e);
    }
  },

  /* ----- Pin Tab — Ctrl+Alt+P --------------------------------------- */

  /**
   * Toggles the pinned state of the current tab. Pinned tabs are
   * shrunk to their favicon and moved to the left side of the tab
   * strip — useful for keeping mail, calendar, or music players
   * always accessible.
   */
  pinTab() {
    if (!gBrowser) return;
    const tab = gBrowser.selectedTab;
    if (!tab) return;
    try {
      if (tab.pinned) {
        gBrowser.unpinTab(tab);
      } else {
        gBrowser.pinTab(tab);
      }
    } catch (e) {
      console.warn("Vela: could not toggle pin", e);
    }
  },

  /* ----- Tab Overview — Ctrl+Alt+O ---------------------------------- */

  /**
   * Tab Overview opens a panel showing all open tabs grouped by
   * domain. Clicking a tab switches to it. This is a quick way to
   * find a tab when you have many open.
   *
   * Implemented as a simple panel injected into the browser chrome.
   */
  tabOverview() {
    if (!gBrowser) return;
    let panel = document.getElementById("vela-tab-overview-panel");
    if (!panel) {
      panel = this._buildTabOverviewPanel();
      document.documentElement.appendChild(panel);
    }
    this._refreshTabOverview();
    panel.openPopup(
      document.getElementById("PanelUI-menu-button") || document.documentElement,
      "after_start",
      0,
      0,
      false,
      false
    );
  },

  _buildTabOverviewPanel() {
    const panel = document.createXULElement("panel");
    panel.id = "vela-tab-overview-panel";
    panel.setAttribute("type", "arrow");
    panel.setAttribute("flip", "both");
    panel.setAttribute("noautofocus", "true");
    panel.setAttribute("norolluponanchor", "true");
    panel.setAttribute("level", "parent");
    panel.style.width = "400px";
    panel.style.maxHeight = "500px";

    const container = document.createXULElement("vbox");
    container.id = "vela-tab-overview-container";
    container.style.overflow = "auto";
    container.style.maxHeight = "480px";
    panel.appendChild(container);

    panel.addEventListener("popupshowing", () => this._refreshTabOverview());
    return panel;
  },

  _refreshTabOverview() {
    const container = document.getElementById("vela-tab-overview-container");
    if (!container || !gBrowser) return;
    container.innerHTML = "";

    // Group tabs by domain.
    const groups = new Map();
    for (const tab of gBrowser.tabs) {
      const browser = gBrowser.getBrowserForTab(tab);
      if (!browser) continue;
      let host;
      try {
        host = browser.currentURI?.host || browser.currentURI?.spec || "(no host)";
        if (host.length > 40) host = host.slice(0, 40) + "…";
      } catch (e) {
        host = "(internal)";
      }
      if (!groups.has(host)) groups.set(host, []);
      groups.get(host).push({ tab, title: tab.label || host, host });
    }

    // Render groups.
    for (const [host, tabs] of groups) {
      const heading = document.createXULElement("label");
      heading.textContent = `${host} (${tabs.length})`;
      heading.style.cssText = "font-weight:600;font-size:11px;color:var(--vela-accent,#C8553D);padding:8px 12px 4px;text-transform:uppercase;letter-spacing:0.06em;";
      container.appendChild(heading);

      for (const { tab, title } of tabs) {
        const item = document.createXULElement("toolbarbutton");
        item.className = "vela-tab-overview-item";
        item.setAttribute("label", title);
        if (tab === gBrowser.selectedTab) {
          item.setAttribute("selected", "true");
        }
        item.style.cssText = "padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;";
        item.addEventListener("command", () => {
          gBrowser.selectedTab = tab;
          document.getElementById("vela-tab-overview-panel")?.hidePopup();
        });
        container.appendChild(item);
      }
    }
  },

  /* ----- Reading List ------------------------------------------------- */

  /**
   * Adds the current page to the Vela Reading List.
   * Loaded lazily so the vela-readinglist.js module is only pulled in
   * when the feature is first used.
   */
  addToReadingList(url, title) {
    if (!this._readingListLoaded) {
      Services.scriptloader.loadSubScript(
        "chrome://browser/content/vela/vela-readinglist.js", this
      );
      if (typeof VelaReadingList !== "undefined") {
        this.VelaReadingList = VelaReadingList;
      }
      this._readingListLoaded = true;
    }
    const RL = this.VelaReadingList;
    if (!RL) {
      console.warn("Vela: reading-list module not available");
      return;
    }
    // Default to current tab.
    if (!url) {
      const tab = gBrowser?.selectedTab;
      const browser = tab && gBrowser.getBrowserForTab(tab);
      if (!browser) return;
      url = browser.currentURI?.spec;
      title = browser.contentTitle || tab.label || url;
    }
    if (!url) return;
    RL.add(url, title || url);
    // Brief confirmation.
    try {
      const notifications = document.getElementById("global-notificationbox");
      if (notifications) {
        notifications.appendNotification(
          "vela-readinglist-added",
          { label: `Added to Reading List: ${title || url}`,
            priority: notifications.PRIORITY_INFO_LOW,
            eventCallback: () => {},
          },
          [/* no buttons */]
        );
        // Auto-dismiss after 2.5s.
        setTimeout(() => {
          const n = notifications.getNotificationWithValue("vela-readinglist-added");
          if (n) notifications.removeNotification(n);
        }, 2500);
      }
    } catch (e) {
      console.debug("Vela: could not show reading-list notification", e);
    }
  },

  /* ----- Workspaces --------------------------------------------------- */

  /**
   * Workspaces — saved, named collections of tabs the user can switch
   * between (e.g. "Work", "Personal", "Research project").
   *
   * The data layer is in vela-workspaces.js (loaded below as a
   * subscript). This method opens a small chrome dialog that lets the
   * user create, switch to, rename and delete workspaces.
   *
   * For v1, the dialog is a simple prompt-based flow:
   *   - No active workspace: prompt for a name, create + switch.
   *   - Active workspace: show a menu of all workspaces + "New…" +
   *     "Save current into <active>" + "Delete <active>".
   *
   * A future v2 will replace the prompts with a proper Vela-styled panel.
   */
  openWorkspaces() {
    if (!gBrowser) return;
    // Lazy-load the module.
    if (!this._workspacesLoaded) {
      Services.scriptloader.loadSubScript(
        "chrome://browser/content/vela/vela-workspaces.js", this
      );
      // Re-attach to this scope.
      if (typeof VelaWorkspaces !== "undefined") {
        this.VelaWorkspaces = VelaWorkspaces;
      } else if (this.VelaWorkspaces) {
        // already attached
      }
      this._workspacesLoaded = true;
    }
    const WS = this.VelaWorkspaces;
    if (!WS) {
      console.warn("Vela: workspaces module not available");
      return;
    }

    const active = WS.active();
    const list = WS.all();

    // Build a prompt string.
    let promptText;
    if (active) {
      const lines = [
        `Active workspace: ${active.name} (${active.tabs.length} tabs)`,
        "",
        "Workspaces:",
        ...list.map(w => `  ${w.id === active.id ? "* " : "  "}${w.name} (${w.tabs.length} tabs)`),
        "",
        "Type a workspace name to switch to it,",
        "or 'new <name>' to create one,",
        "or 'save' to update the active workspace,",
        "or 'delete' to remove the active workspace.",
      ];
      promptText = lines.join("\n");
    } else {
      const lines = [
        "No active workspace.",
        "",
        list.length ? "Workspaces:" : "No saved workspaces yet.",
        ...list.map(w => `  ${w.name} (${w.tabs.length} tabs)`),
        "",
        "Type 'new <name>' to create a workspace from the current tabs,",
        "or type a workspace name to switch to it.",
      ];
      promptText = lines.join("\n");
    }

    const inputObj = { value: "" };
    const ok = Services.prompt.prompt(
      window,
      "Vela Workspaces",
      promptText,
      inputObj,
      null,
      {}
    );
    if (!ok) return;
    const trimmed = (inputObj.value || "").trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === "save" && active) {
      WS.saveCurrent(active.id);
      Services.prompt.alert(window, "Vela Workspaces",
        `Saved ${WS._captureTabs().length} tabs into "${active.name}".`);
      return;
    }
    if (trimmed.toLowerCase() === "delete" && active) {
      const ok = Services.prompt.confirm(window, "Vela Workspaces",
        `Delete workspace "${active.name}"?`);
      if (ok) WS.remove(active.id);
      return;
    }
    if (trimmed.toLowerCase().startsWith("new ")) {
      const name = trimmed.slice(4).trim();
      if (!name) return;
      const ws = WS.create(name);
      Services.prefs.setStringPref(WS.PREF_ACTIVE, ws.id);
      Services.prompt.alert(window, "Vela Workspaces",
        `Created workspace "${name}" with ${ws.tabs.length} tabs.`);
      return;
    }
    // Otherwise, treat as a workspace name to switch to.
    const target = list.find(w => w.name.toLowerCase() === trimmed.toLowerCase());
    if (target) {
      WS.switchTo(target.id);
    } else {
      Services.prompt.alert(window, "Vela Workspaces",
        `No workspace named "${trimmed}".`);
    }
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

    // Restore calm tabs state.
    try {
      this._initCalmTabs();
    } catch (e) {
      console.warn("Vela: calm-tabs init failed", e);
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
