![Vela](./docs/vela/vela-banner.svg)

# Vela — the calm browser

**Vela** is an original web browser built on the Mozilla Firefox ESR engine. It is not a reskin: it has its own name, identity, visual language, and a small set of original features designed around a single philosophy — *calm computing*.

> **Sail the open web.**

## What is Vela?

A browser designed to lower your pulse, not raise it. Warm parchment chrome instead of cool grey-blue. A pill-shaped URL bar with a terracotta focus ring. A new tab page that looks like a harbour at dawn. Four small, focused features:

- **Focus Mode** (`Ctrl+Shift+F`) — hide every piece of chrome except the page.
- **Harbor** (`Ctrl+Alt+H`) — a unified sidebar for bookmarks, history and downloads.
- **Tides** (`Ctrl+Shift+G`) — collapsible tab groups to keep the tab strip calm.
- **Sepia Reader** (`Ctrl+Alt+R`) — a warm sepia tint for long-form reading.
- **about:vela** (`Ctrl+Alt+V`) — Vela's home page with shortcuts and feature tour.

See [`docs/vela/DESIGN.md`](./docs/vela/DESIGN.md) for the full design document.

## Building Vela

Vela builds with the standard Mozilla build system. From a Mozilla-build-capable machine:

```sh
./mach bootstrap                          # one-time
./mach configure --enable-official-branding
./mach build
./mach run                                # launches the `vela` binary
```

The build produces a `vela` (or `vela-bin`) executable, a `~/.vela` profile directory, and an "About Vela" application menu item.

## Repository

This is a fork of Mozilla Firefox ESR, transformed into the Vela browser. The original Firefox README follows below for reference.

---

## Original Firefox README

![Firefox Browser](./docs/readme/readme-banner.svg)

[Firefox](https://firefox.com/) is a fast, reliable and private web browser from the non-profit [Mozilla organization](https://mozilla.org/).

### Contributing

To learn how to contribute to Firefox read the [Firefox Contributors' Quick Reference document](https://firefox-source-docs.mozilla.org/contributing/contribution_quickref.html).

We use [bugzilla.mozilla.org](https://bugzilla.mozilla.org/) as our issue tracker, please file bugs there.

### Resources

* [Firefox Source Docs](https://firefox-source-docs.mozilla.org/) is our primary documentation repository
* Nightly development builds can be downloaded from [Firefox Nightly page](https://www.mozilla.org/firefox/channel/desktop/#nightly)

If you have a question about developing Firefox, and can't find the solution
on [Firefox Source Docs](https://firefox-source-docs.mozilla.org/), you can try asking your question on Matrix at
chat.mozilla.org in the [Introduction channel](https://chat.mozilla.org/#/room/#introduction:mozilla.org).
