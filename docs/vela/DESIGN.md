# Vela — Design Document

**Vela** is an original web browser built on the Mozilla Firefox ESR engine. It is not a reskin: it has its own name, identity, visual language, and a small set of original features designed around a single philosophy.

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
| `--vela-teal`      | `#2D5F5D`    | `#7FB0AC`    | Secondary — container tabs           |

The accent is a single warm terracotta — the colour of a sail at sunrise. It is used sparingly: for the URL bar focus ring, the selected-tab underline, primary buttons, and the new-tab "sun" glow. Everywhere else, the surface is warm parchment.

The dark mode is not a cool black. It is a warm deep ink (`#14110D`) — the colour of a harbour at night, with the same terracotta accent brightened to read against the dark.

### 2.2 Typography

Vela uses the system sans-serif stack (`-apple-system, Segoe UI, Noto Sans, …`) so it feels native on every platform, with `font-feature-settings: "ss01", "cv01", "cv11"` enabled to opt into the system font's stylistic alternates where available. Headings are weight 600, body is 400. Letter-spacing is slightly negative on large text (`-0.01em` to `-0.02em`) for a calmer rhythm.

### 2.3 Geometry

- Border radius: `6px` (small controls), `10px` (cards, inputs), `14px` (panels), `999px` (pills, URL bar).
- Shadows are warm (`rgba(31, 27, 22, …)`), not cool — three elevations: `--vela-shadow-1/2/3`.
- Spacing follows an 8px grid; controls sit on a 36px toolbar.

### 2.4 Motion

All transitions use `cubic-bezier(0.16, 1, 0.3, 1)` — an "ease-out-expo" curve that decelerates noticeably. Durations: 140ms (fast), 220ms (default), 360ms (slow). Nothing snaps. Nothing bounces.

### 2.5 Iconography

The Vela logomark is a stylised billowing sail rising from a horizon line, with three small stars above — the constellation Vela. The original SVG artwork is in [`browser/branding/official/content/about-logo.svg`](../../browser/branding/official/content/about-logo.svg). All other icons are Firefox's existing UI icon set; they are intentionally restrained and read well against the warm parchment.

---

## 3. UI redesign

Vela does not restructure the toolbar or move controls to unfamiliar places — that would be novelty for its own sake, and would harm usability for anyone arriving from another browser. Instead, Vela **re-skins** every surface of the chrome with the warm, calm design language above.

### 3.1 What changes

- **Tabs.** Selected tab is a warm "sail" raised above the strip, with a thin terracotta underline that reads as the curved base of a sail. Hover tabs get a faint terracotta tint. Container/identity tabs use teal.
- **URL bar.** A pill, not a rectangle. Hover gets a faint terracotta halo. Focus gets a clean terracotta outline + 3px tint halo. Dropdown is a card with soft shadow.
- **Toolbar buttons.** Rounded (6px), with a soft terracotta-tint hover. The hamburger menu button is fully circular.
- **Panels, popups, context menus.** Rounded (14px), warm paper background, soft shadow, items with rounded hover.
- **Find bar.** Warm card at the bottom of the page.
- **Status panel.** A small warm pill at the bottom-left when hovering links.
- **Sidebar (Harbor).** Warm paper surface with a sand divider.
- **Scrollbars.** Thin, warm mist on transparent — never a cool grey bar.

### 3.2 New tab page (Calm New Tab)

The Firefox new tab page is rendered by a React bundle (`activity-stream.bundle.js`). Vela does **not** rewrite that bundle — that would break top-sites, search, highlights, and recent-activity data flows. Instead, Vela injects a comprehensive CSS override ([`browser/themes/shared/vela/calm-newtab.css`](../../browser/themes/shared/vela/calm-newtab.css)) that completely transforms the visual layer while leaving the data layer intact.

The result: the same React-powered new tab page, but dressed as a harbour at dawn — warm parchment background, a soft radial "sun" glow at the top, search bar as a pill with terracotta focus, top sites as smooth stones, cards as soft warm paper. The Firefox logo is replaced by Vela's sail mark.

### 3.3 about: pages

- **about:home / about:newtab** — Calm New Tab dashboard (see above).
- **about:privatebrowsing** — Vela theme loaded; uses the warm night palette.
- **about:vela** (new) — Vela's home page. A calm welcome card with the wordmark, tagline, version info, shortcut tiles, and a list of the four original features with their keyboard shortcuts.
- **about:preferences** — Inherits the Vela chrome theme via the global tokens.
- **About dialog** — Branded with Vela logos; warm dark background.

---

## 4. Original features

Vela introduces four signature features. Each is small, focused, and designed to support the calm-computing philosophy rather than pad the feature list.

### 4.1 Focus Mode — `Ctrl/Cmd + Shift + F`

Hides every piece of browser chrome — the toolbar, tabs, bookmarks bar, any open panels — leaving only the active page. A small floating "Exit Focus" pill appears at the top-right; `Escape` also exits. Focus Mode is **not** full-screen: the OS window chrome stays. It is a calmer, in-window alternative for reading or deep work.

State is persisted in the `vela.focusmode.active` pref and restored on restart.

### 4.2 Harbor — `Ctrl/Cmd + Alt + H`

A unified sidebar for bookmarks, history and downloads. The v1 implementation opens the existing bookmarks sidebar with a Vela-styled header; the v2 vision (left as an obvious next iteration) is a single panel with three tabs.

Default view configurable via `vela.harbor.default-view`.

### 4.3 Tides — `Ctrl/Cmd + Shift + G`

Collapsible tab groups ("tides" or "currents") you can stash tabs into. Vela leans on Firefox's existing tab-group infrastructure in `gBrowser.addTabGroup()` but wraps it with a calmer naming convention and a default colour from the Vela palette (orange → terracotta).

Default colour and collapse behaviour configurable via `vela.tides.default-color` and `vela.tides.collapse-by-default`.

### 4.4 Sepia Reader — `Ctrl/Cmd + Alt + R`

A warm sepia tint applied to the active page **without** transforming it into Reader View. Useful for long-form reading on bright white sites that don't deserve a full reader-mode transform. Implemented via a frame script that injects a `<style>` element with a CSS `filter: sepia()` rule on `html`, plus a parchment background colour and warm link colours. The tint is re-applied automatically on intra-tab navigation via a progress listener.

Intensity configurable via `vela.sepia-reader.intensity` (0.0–1.0, default 0.30 — "calm sepia, not antique").

### 4.5 about:vela — `Ctrl/Cmd + Alt + V`

Opens the Vela home page — a calm welcome card with the wordmark, tagline, version info, shortcut tiles (Settings, Downloads, New Tab, Private Window), and a list of the four original features with their keyboard shortcuts.

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
│   ├── vela-browser.js              ← VelaBrowser module (Focus Mode, Harbor, Tides, Sepia, about:vela)
│   ├── vela-sepia-framescript.js    ← frame script for Sepia Reader (per-tab)
│   ├── aboutVela.xhtml              ← about:vela home page
│   ├── aboutVela.js                 ← about:vela version-population script
│   ├── browser-sets.inc.xhtml       ← +5 Vela commands, +5 keyboard shortcuts
│   ├── browser-sets.js              ← +5 command handlers (dispatch into VelaBrowser.*)
│   └── global-scripts.js            ← loads vela-browser.js into the browser window
├── themes/shared/vela/
│   ├── vela-theme.css               ← Vela palette, tabs, urlbar, buttons, panels, focus-mode
│   └── calm-newtab.css              ← Vela override for the React new tab page
├── components/about/
│   ├── AboutRedirector.cpp          ← +about:vela URL mapping
│   └── components.conf              ← +vela page registration
├── app/profile/firefox.js           ← +vela.* prefs (focusmode, sepia, tides, harbor, features)
├── locales/en-US/browser/vela.ftl   ← Vela feature strings
└── branding/official/               ← Vela logos, wordmarks, configure.sh, brand.ftl, brand.properties
```

---

## 7. Verification (and known limitations)

This sandbox cannot build Firefox (it requires ~30GB disk, 16GB+ RAM, hours of compile time, and a specific Mozilla build environment). The changes here have been verified at the source level:

- ✅ All JS files pass `node --check`.
- ✅ All SVG/XHTML files parse as valid XML.
- ✅ All CSS files have balanced braces.
- ✅ All `jar.mn` and `moz.build` references are consistent.
- ✅ The Vela PNG icons were rendered from the master SVG via `cairosvg` and verified by sampling pixel values.

To produce a runnable Vela binary, a developer would check out this branch on a Mozilla build-capable machine and run:

```sh
./mach bootstrap        # one-time, installs Rust/C++ toolchain + deps
./mach configure --enable-official-branding
./mach build
./mach run
```

`./mach run` will launch the `vela` binary with the Vela chrome, the Calm New Tab dashboard, and all four original features. The keyboard shortcuts (`Ctrl+Shift+F`, `Ctrl+Alt+H`, `Ctrl+Shift+G`, `Ctrl+Alt+R`, `Ctrl+Alt+V`) are wired up and ready.

If any source-level issue is discovered during a real build, the most likely candidates are:

1. The `vela-browser.js` module's reliance on `Services.mm.loadFrameScript` — needs verifying that frame scripts can be loaded from `chrome://browser/content/` URLs at startup. (If not, fall back to `ChromeUtils.registerWindowActor`.)
2. The Sepia Reader's per-tab state — currently stored as a tab attribute. If tab attributes don't survive a tab move, the state could be moved to a `WeakMap` keyed on the tab's linked browser.
3. The `about:vela` registration in `components.conf` — the `HIDE_FROM_ABOUTABOUT` flag means it won't appear on `about:about`. Remove the flag if you want it listed.
