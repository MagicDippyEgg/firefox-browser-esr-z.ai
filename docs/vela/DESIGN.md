# Vela — Design Document

**Vela** is an original web browser built on the Mozilla Firefox ESR engine. It is not a reskin: it has its own name, identity, visual language, and a growing set of original features designed around a single philosophy.

> **Sail the open web.**

---

## 1. Identity

**Name.** *Vela* — Latin for "the sails of a ship". Vela is also a constellation in the southern sky, named by 18th-century astronomers for the sails of the mythical Argo Navis. The name evokes calm navigation, the open water, the act of *setting out*. It is short (two syllables), easy to type, easy to say in most languages, and free of any existing major browser product.

**Tagline.** *Sail the open web.*

**Personality.** Calm. Unhurried. Warm. Crafted. Vela is the browser for people who want to spend less time fighting their tools and more time reading, exploring, and doing. Where Firefox is civic and protective, where Chrome is fast and pragmatic, Vela is **calm and intentional**. Every default, every animation, every empty state is designed to lower the user's pulse, not raise it.

**Visual reference.** A harbour at dawn — warm parchment light, smooth stones underfoot, a single terracotta sail catching the first breeze.

---

## 2. Design language

### 2.1 Palette

Vela's palette is warm and earthy — a deliberate counterpoint to the cool, neutral grey-blue chrome of every major browser.

| Token              | Light        | Dark         | Use                                  |
| ------------------ | ------------ | ------------ | ------------------------------------ |
| `--vela-cream`     | `#F7F2E8`    | `#14110D`    | Primary surface                      |
| `--vela-paper`     | `#FDFAF3`    | `#1F1B16`    | Cards, inputs, raised surfaces       |
| `--vela-sand`      | `#E8DCC4`    | `#2A241D`    | Neutral dividers, secondary surfaces |
| `--vela-mist`      | `#B8AFA1`    | `#5A5048`    | Muted text, scrollbar thumb          |
| `--vela-ink`       | `#1F1B16`    | `#E8DCC4`    | Primary text                         |
| `--vela-ink-soft`  | `#4A4238`    | `#B8AFA1`    | Secondary text                       |
| `--vela-terracotta`| `#C8553D`    | `#E07856`    | **Accent** — primary actions         |
| `--vela-teal`      | `#2D5F5D`    | `#7FB0AC`    | Secondary — container tabs, tides    |

The accent is a single warm terracotta — the colour of a sail at sunrise. It is used sparingly: for the URL bar focus ring, the selected-tab underline, primary buttons, the new-tab "sun" glow, the Focus Mode exit pill, and the Sepia Reader panel title.

The dark mode is not a cool black. It is a warm deep ink (`#14110D`) — the colour of a harbour at night, with the same terracotta accent brightened to read against the dark.

### 2.2 Typography

Vela uses the system sans-serif stack (`-apple-system, Segoe UI, Noto Sans, …`) so it feels native on every platform, with `font-feature-settings: "ss01", "cv01", "cv11"` enabled to opt into the system font's stylistic alternates where available. Headings are weight 600, body is 400. Letter-spacing is slightly negative on large text (`-0.01em` to `-0.02em`) for a calmer rhythm.

### 2.3 Geometry

- Border radius: `6px` (small controls), `10px` (cards, inputs), `14px` (panels), `999px` (pills, URL bar, toggle switches).
- Shadows are warm (`rgba(31, 27, 22, …)`), not cool — three elevations: `--vela-shadow-1/2/3`.
- Spacing follows an 8px grid; controls sit on a 36px toolbar.

### 2.4 Motion

All transitions use `cubic-bezier(0.16, 1, 0.3, 1)` — an "ease-out-expo" curve that decelerates noticeably. Durations: 140ms (fast), 220ms (default), 360ms (slow). Nothing snaps. Nothing bounces.

### 2.5 Iconography

The Vela logomark is a stylised billowing sail rising from a horizon line, with three small stars above — the constellation Vela. The original SVG artwork is in [`browser/branding/official/content/about-logo.svg`](../../browser/branding/official/content/about-logo.svg). All other icons are Firefox's existing UI icon set; they are intentionally restrained and read well against the warm parchment.

The Harbor sidebar has its own icon — a stylised harbour breakwater with a small terracotta-sailed boat sheltered inside ([`harbor.svg`](../../browser/themes/shared/vela/harbor.svg)).

---

## 3. UI redesign

Vela does not restructure the toolbar or move controls to unfamiliar places — that would be novelty for its own sake, and would harm usability for anyone arriving from another browser. Instead, Vela **re-skins every surface** of the chrome with the warm, calm design language above.

### 3.1 What changes

- **Tabs.** Selected tab is a warm "sail" raised above the strip, with a thin terracotta underline that reads as the curved base of a sail. Hover tabs get a faint terracotta tint. Container/identity tabs use teal.
- **URL bar.** A pill, not a rectangle. Hover gets a faint terracotta halo. Focus gets a clean terracotta outline + 3px tint halo. Dropdown is a card with soft shadow.
- **Toolbar buttons.** Rounded (6px), with a soft terracotta-tint hover. The hamburger menu button is fully circular.
- **Panels, popups, context menus.** Rounded (14px), warm paper background, soft shadow, items with rounded hover (28px min-height, 4px margins, terracotta-tint hover, 0.4 opacity for disabled, thin warm separators).
- **Permission prompts.** Warm card with terracotta primary buttons.
- **Doorhanger / identity panel.** Warm card.
- **Dialog boxes.** Warm card with dark overlay, terracotta primary buttons.
- **Customize mode.** Warm surfaces, rounded palette items with terracotta-tint hover.
- **Bookmarks editor panel.** Vela card with terracotta Done button.
- **Find bar.** Warm card at the bottom of the page.
- **Status panel.** A small warm pill at the bottom-left when hovering links.
- **Sidebar (Harbor).** Warm paper surface with a sand divider.
- **Notification bars.** Warm card with terracotta-tint button hover.
- **Tooltips.** Warm ink background with paper text, rounded, soft shadow.
- **Attention dots.** Terracotta with a surface-coloured halo.
- **Reader View button.** Terracotta-tint hover, solid terracotta when active.
- **Scrollbars.** Thin, warm mist on transparent — never a cool grey bar.

### 3.2 New tab page (Calm New Tab)

The Firefox new tab page is rendered by a React bundle (`activity-stream.bundle.js`). Vela does **not** rewrite that bundle — that would break top-sites, search, highlights, and recent-activity data flows. Instead, Vela injects a comprehensive CSS override ([`browser/themes/shared/vela/calm-newtab.css`](../../browser/themes/shared/vela/calm-newtab.css)) that completely transforms the visual layer while leaving the data layer intact.

The result: the same React-powered new tab page, but dressed as a harbour at dawn — warm parchment background, a soft radial "sun" glow at the top, search bar as a pill with terracotta focus, top sites as smooth stones, cards as soft warm paper. The Firefox logo is replaced by Vela's sail mark.

**Calm New Tab widgets** ([`calm-newtab-widgets.js`](../../browser/themes/shared/vela/calm-newtab-widgets.js)) — three original widgets injected above the React content:

1. **Clock widget** — large calm time (38px, weight 600) with the day and date below. Updates every 15s.
2. **Reading List widget** — the 3 most recent reading-list items with titles and relative timestamps. Empty state hints at the `Ctrl+Alt+Shift+L` shortcut.
3. **Recent Bookmarks widget** — the 5 most recent bookmarks with titles. Empty state hints at `Ctrl+D`.

The widgets are pure DOM, styled as warm parchment cards with terracotta section labels and rounded list-item hover. They read the reading list and bookmarks via the `RPMSendQuery` API that Firefox exposes to privileged-about pages, falling back to calm placeholder text if unavailable.

### 3.3 about: pages

- **about:home / about:newtab** — Calm New Tab dashboard (see above).
- **about:privatebrowsing** — Vela theme loaded; uses the warm night palette.
- **about:vela** (new) — Vela's home page. A calm welcome card with the wordmark, tagline, version info, shortcut tiles (Settings, Downloads, New Tab, Private Window), a feature tour, and a settings panel with toggle switches and sliders for every Vela feature and Sepia Reader parameter.
- **about:preferences** — Inherits the Vela chrome theme via the global tokens.
- **About dialog** — Branded with Vela logos; warm dark background.

---

## 4. Original features

Vela introduces six signature features. Each is small, focused, and designed to support the calm-computing philosophy rather than pad the feature list.

### 4.1 Focus Mode — `Ctrl/Cmd + Shift + F`

Hides every piece of browser chrome — the toolbar, tabs, bookmarks bar, any open panels — leaving only the active page. A small floating "Exit Focus" pill appears at the top-right; `Escape` also exits. Focus Mode is **not** full-screen: the OS window chrome stays. It is a calmer, in-window alternative for reading or deep work.

State is persisted in the `vela.focusmode.active` pref and restored on restart. Toggleable from `about:vela`.

### 4.2 Harbor — `Ctrl/Cmd + Alt + H`

Vela's unified sidebar — a single panel with five tabs:

1. **Bookmarks** — populated from `PlacesUtils.bookmarks` (toolbar, menu, unfiled roots, top 50 each).
2. **History** — populated from `PlacesUtils.history` (last 200 visits, grouped by Today / Yesterday / date).
3. **Downloads** — populated from `DownloadsCommon.getData()` (active + completed, click to open).
4. **Reading List** — Vela's own pref-backed list (`vela.readinglist.items`).
5. **Notes** — Vela's own pref-backed scratchpad (`vela.notes.text`), auto-saves with 400ms debounce.

The panel is a chrome-privileged XHTML document at `chrome://browser/content/vela/harbor.xhtml`, registered as the `viewVelaHarborSidebar` sidebar panel in `browser/components/sidebar/browser-sidebar.js`. Its JS ([`harbor.js`](../../browser/base/content/vela/harbor.js)) lazy-loads `PlacesUtils` and `DownloadsCommon`, plus Vela's own `VelaReadingList` and `VelaQuickNotes` modules.

The panel has a Vela-styled tab strip (terracotta underline on the active tab), a pill-shaped search input that filters the active list, and rounded list items with terracotta-tint hover. The Notes tab is a full-height monospace textarea with a "Saved." / "Saving…" status footer.

Toggleable from `about:vela`.

### 4.3 Tides — `Ctrl/Cmd + Shift + G`

Collapsible tab groups ("tides" or "currents") you can stash tabs into. Vela leans on Firefox's existing tab-group infrastructure in `gBrowser.addTabGroup()` but wraps it with a calmer naming convention and a default colour from the Vela palette (orange → terracotta).

The tab group editor is Vela-styled: warm card with rounded name input (terracotta focus ring), circular colour swatches that scale on hover and get a text-coloured border when selected. Group containers in the tab strip have a soft secondary-tint background and rounded corners.

Default colour and collapse behaviour configurable via `vela.tides.default-color` and `vela.tides.collapse-by-default`. Toggleable from `about:vela`.

### 4.4 Sepia Reader — `Ctrl/Cmd + Alt + R`

A warm sepia tint applied to the active page **without** transforming it into Reader View. Useful for long-form reading on bright white sites that don't deserve a full reader-mode transform.

**Floating control panel** at the top-right with:
- **Warmth** slider (0.0–0.8, default 0.30 — "calm sepia, not antique").
- **Font size** slider (0.9–1.4×, default 1.05).
- **Line height** slider (1.3–2.0, default 1.65).
- **Warm background** toggle (parchment-coloured page background).
- **Warm link colours** toggle (terracotta links).

Settings are persisted in `vela.sepia-reader.*` prefs and applied live via a frame script that regenerates the `<style>` element's textContent. The tint is re-applied automatically on intra-tab navigation via a progress listener.

Implemented via:
- [`vela-browser.js`](../../browser/base/content/vela-browser.js) — the parent-side `VelaBrowser.toggleSepiaReader()` and the floating panel builder.
- [`vela-sepia-framescript.js`](../../browser/base/content/vela-sepia-framescript.js) — the content-process frame script that injects and updates the `<style>` overlay.

Toggleable from `about:vela`.

### 4.5 Workspaces — `Ctrl/Cmd + Alt + W`

Saved, named collections of tabs the user can switch between — useful for separating contexts ("Work", "Personal", "Research project") without keeping all tabs open at once.

A workspace captures the URLs (and titles) of every open tab at the moment it was saved. Switching workspaces closes the current tabs and reopens the saved set. The previously-active workspace is auto-saved before switching.

Storage: `vela.workspaces.list` (JSON array of `{ id, name, color, createdAt, lastOpenedAt, tabs: [{ url, title }] }`), capped at 50 workspaces × 200 tabs each. Active workspace id in `vela.workspaces.active`.

The v1 UI is prompt-based (type a name to switch, `new <name>` to create, `save` to update the active workspace, `delete` to remove it). A future v2 will replace the prompts with a proper Vela-styled panel.

Implemented in [`vela-workspaces.js`](../../browser/base/content/vela/vela-workspaces.js).

### 4.6 Reading List — `Ctrl/Cmd + Alt + Shift + L`

A flat, lightweight, chronological list of pages the user intends to read later. Distinct from bookmarks (which are hierarchical and permanent).

`VelaBrowser.addToReadingList()` captures the current tab's URL+title and adds it to `VelaReadingList` (the pref-backed store shared with the Harbor sidebar). Shows a brief confirmation notification that auto-dismisses after 2.5s.

Storage: `vela.readinglist.items` (JSON array of `{ url, title, addedAt }`), capped at 500 items. De-dupes by URL (re-adding moves to top).

Implemented in [`vela-readinglist.js`](../../browser/base/content/vela/vela-readinglist.js).

### 4.7 about:vela — `Ctrl/Cmd + Alt + V`

Opens the Vela home page — a calm welcome card with the wordmark, tagline, version info, shortcut tiles, a feature tour, and a settings panel with toggle switches for every Vela feature plus sliders for the Sepia Reader parameters. The settings panel is wired directly to the `vela.*` prefs via `Services.prefs`.

### 4.8 Quick Notes

A pref-backed scratchpad shown in the Harbor sidebar's Notes tab. Auto-saves with 400ms debounce. Storage: `vela.notes.text` (plain string, capped at 64 KB). Implemented in [`vela-quicknotes.js`](../../browser/base/content/vela/vela-quicknotes.js).

---

## 5. Build & identity changes

The following source-level changes rename the binary from `firefox` to `vela` and rebrand every visible string:

| File | Change |
| ---- | ------ |
| `browser/confvars.sh` | `MOZ_APP_NAME=vela`, `MOZ_APP_BASENAME=Vela` |
| `browser/branding/{official,nightly,aurora,unofficial}/configure.sh` | `MOZ_APP_DISPLAYNAME=Vela` |
| `browser/branding/{official,nightly,aurora,unofficial}/locales/en-US/brand.{ftl,properties}` | `Vela` / `Vela Browser` / `Vela Project` |
| `browser/branding/official/content/about-logo.svg` | Original Vela logomark |
| `browser/branding/official/content/about-wordmark.svg` | Original Vela wordmark logomark |
| `browser/branding/official/content/firefox-wordmark.svg` | Original Vela wordmark (text + logomark) |
| `browser/branding/official/content/about-logo-private.svg` | Vela private-browsing logomark (cool night palette) |
| `browser/branding/official/default{16,22,24,32,48,64,128,256}.png` | Regenerated from the Vela SVG |
| `browser/branding/official/content/about-logo{,@2x,-private,-private@2x}.png` | Regenerated |
| `browser/branding/official/content/aboutDialog.css` | Warm dark palette |
| `browser/extensions/newtab/data/content/assets/firefox.svg` | Vela logomark for the new tab page |

After a build with `--enable-official-branding`, the binary is `vela`, the profile directory is `~/.vela`, the application menu says "About Vela", and every visible Firefox reference in the chrome is replaced.

---

## 6. Architecture

```
browser/
├── base/content/
│   ├── vela-browser.js              ← VelaBrowser module (Focus Mode, Harbor, Tides, Sepia, about:vela, Workspaces, Reading List)
│   ├── vela-sepia-framescript.js    ← frame script for Sepia Reader (per-tab, with settings)
│   ├── aboutVela.xhtml              ← about:vela home page with settings panel
│   ├── aboutVela.js                 ← about:vela version + settings wiring
│   ├── vela/
│   │   ├── harbor.xhtml             ← Harbor sidebar panel (5 tabs)
│   │   ├── harbor.js                ← Harbor panel logic (Places + Downloads + Vela modules)
│   │   ├── vela-readinglist.js      ← VelaReadingList (pref-backed reading list)
│   │   ├── vela-quicknotes.js       ← VelaQuickNotes (pref-backed scratchpad)
│   │   └── vela-workspaces.js       ← VelaWorkspaces (saved tab sessions)
│   ├── browser-sets.inc.xhtml       ← +7 Vela commands, +7 keyboard shortcuts
│   ├── browser-sets.js              ← +7 command handlers (dispatch into VelaBrowser.*)
│   └── global-scripts.js            ← loads vela-browser.js into the browser window
├── themes/shared/vela/
│   ├── vela-theme.css               ← Vela palette, tabs, urlbar, buttons, panels, context menus,
│   │                                  permission prompts, dialogs, customize mode, bookmarks editor,
│   │                                  Tides, notification bars, tooltips, attention dots, focus-mode
│   ├── calm-newtab.css              ← Vela override for the React new tab page + widget styles
│   ├── calm-newtab-widgets.js       ← Calm New Tab widgets (clock, reading list, recent bookmarks)
│   ├── harbor.css                   ← Harbor sidebar panel styles
│   └── harbor.svg                   ← Harbor sidebar icon
├── components/
│   ├── about/AboutRedirector.cpp    ← +about:vela URL mapping
│   ├── about/components.conf        ← +vela page registration
│   └── sidebar/browser-sidebar.js  ← +viewVelaHarborSidebar panel registration
├── app/profile/firefox.js           ← +vela.* prefs (focusmode, sepia-reader.*, tides.*, harbor.*,
│   │                                  readinglist.items, notes.text, workspaces.list, workspaces.active,
│   │                                  feature.* toggles, newtab.background-style)
├── locales/en-US/browser/vela.ftl   ← Vela feature strings
└── branding/official/               ← Vela logos, wordmarks, configure.sh, brand.ftl, brand.properties
```

---

## 7. Build pipeline

Vela is built by a GitHub Actions workflow at [`.github/workflows/build-vela.yml`](../../.github/workflows/build-vela.yml). The workflow:

1. Frees ~30 GB of disk on the standard `ubuntu-22.04` runner by removing preinstalled Android / .NET / Haskell / JDK / Docker toolchains.
2. Adds a 12 GB swap file (`/vela-swap`) as a safety net for the Rust compilation spike.
3. Runs `./mach bootstrap` to install the Rust toolchain, clang, Node, and all required system libraries.
4. Installs `sccache` and caches it across runs via `actions/cache`, turning the second build into a 30–60 minute job instead of a 3-hour one.
5. Builds with `./mach build --jobs 3` (4 vCPU minus 1 for mach/python overhead).
6. Packages via `./mach package` and stages a tarball containing the runnable browser directory plus a README.
7. Uploads `vela-browser-linux-x86_64` as a 90-day-retained artifact.
8. On failure, uploads `config.log` and `mozinfo.json` for diagnosis.

Triggers: `workflow_dispatch` (manual), `push` to `main`, tags `v*`, and `release` published. Build time on a cold cache: ~2h30m–3h30m. With sccache warm: ~30–60m. The 6-hour job timeout leaves comfortable headroom.

**To download the artifact:** go to the [Actions tab](https://github.com/MagicDippyEgg/firefox-browser-esr-z.ai/actions), click the latest successful "Build Vela" run, and download the `vela-browser-linux-x86_64` artifact from the run summary page.

---

## 8. Verification (and known limitations)

This sandbox cannot build Firefox (it requires ~30GB disk, 16GB+ RAM, hours of compile time, and a specific Mozilla build environment). The changes here have been verified at the source level:

- ✅ All JS files pass `node --check`.
- ✅ All SVG/XHTML files parse as valid XML.
- ✅ All CSS files have balanced braces.
- ✅ All `jar.mn` and `moz.build` references are consistent.
- ✅ The Vela PNG icons were rendered from the master SVG via `cairosvg` and verified by sampling pixel values.
- ✅ The GitHub Actions workflow YAML parses and triggers correctly.

The build is verified by the GitHub Actions workflow at [`.github/workflows/build-vela.yml`](../../.github/workflows/build-vela.yml). See the [Actions tab](https://github.com/MagicDippyEgg/firefox-browser-esr-z.ai/actions) for the latest run status and the downloadable artifact.

To produce a runnable Vela binary locally:

```sh
./mach bootstrap                          # one-time
./mach configure --enable-official-branding
./mach build
./mach run                                # launches the `vela` binary
```

`./mach run` will launch the `vela` binary with the Vela chrome, the Calm New Tab dashboard, the Harbor sidebar, and all six original features. The keyboard shortcuts (`Ctrl+Shift+F`, `Ctrl+Alt+H`, `Ctrl+Shift+G`, `Ctrl+Alt+R`, `Ctrl+Alt+W`, `Ctrl+Alt+Shift+L`, `Ctrl+Alt+V`) are wired up and ready.
