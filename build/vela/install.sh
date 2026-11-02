#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Vela — Linux installer script.
#
# Usage: ./install.sh [--prefix /usr/local] [--uninstall]
#
# Installs Vela to the specified prefix (default: /opt/vela), creates a
# symlink in the bin directory, installs the .desktop file, and copies
# icons to the system icon directories. After installation, Vela will
# appear in the applications menu and can be launched with `vela` from
# the command line.
#
# Run with --uninstall to remove Vela.

set -euo pipefail

PREFIX="${PREFIX:-/opt}"
BINDIR="/usr/local/bin"
APPNAME="Vela"
APPNAME_LOWER="vela"
INSTALL_DIR="$PREFIX/$APPNAME_LOWER"
DESKTOP_DIR="/usr/share/applications"
ICON_DIR="/usr/share/icons/hicolor"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Parse args.
ACTION="install"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix) PREFIX="$2"; INSTALL_DIR="$PREFIX/$APPNAME_LOWER"; shift 2;;
    --uninstall) ACTION="uninstall"; shift;;
    --help) echo "Usage: $0 [--prefix /opt] [--uninstall]"; exit 0;;
    *) echo "Unknown option: $1"; exit 1;;
  esac
done

if [[ "$EUID" -ne 0 ]]; then
  echo "This installer needs root privileges to install to $INSTALL_DIR."
  echo "Re-running with sudo..."
  exec sudo bash "$0" "$@" --prefix "$PREFIX"
fi

install() {
  echo "Installing Vela to $INSTALL_DIR ..."
  mkdir -p "$INSTALL_DIR"
  cp -a "$SCRIPT_DIR/vela/"* "$INSTALL_DIR/"
  chmod +x "$INSTALL_DIR/$APPNAME_LOWER" "$INSTALL_DIR/${APPNAME_LOWER}-bin"

  # Symlink the binary.
  mkdir -p "$BINDIR"
  ln -sf "$INSTALL_DIR/$APPNAME_LOWER" "$BINDIR/$APPNAME_LOWER"

  # Install icons.
  for size in 16 22 24 32 48 64 128 256; do
    icon_src="$INSTALL_DIR/browser/chrome/icons/default/default${size}.png"
    if [ ! -f "$icon_src" ]; then
      # Fall back to branding icons in the omni.ja (can't easily extract here).
      # Use the default128 as a fallback for all sizes.
      icon_src="$INSTALL_DIR/browser/chrome/icons/default/default128.png"
    fi
    if [ -f "$icon_src" ]; then
      mkdir -p "$ICON_DIR/${size}x${size}/apps"
      cp "$icon_src" "$ICON_DIR/${size}x${size}/apps/$APPNAME_LOWER.png"
    fi
  done

  # Install .desktop file.
  mkdir -p "$DESKTOP_DIR"
  cat > "$DESKTOP_DIR/$APPNAME_LOWER.desktop" <<EOF
[Desktop Entry]
Name=Vela
Comment=Sail the open web
Exec=$INSTALL_DIR/$APPNAME_LOWER %u
Terminal=false
X-MultipleArgs=false
Type=Application
Icon=$APPNAME_LOWER
Categories=Network;WebBrowser;
MimeType=text/html;text/xml;application/xhtml+xml;application/xml;application/rss+xml;application/rdf+xml;image/gif;image/jpeg;image/png;x-scheme-handler/http;x-scheme-handler/https;x-scheme-handler/ftp;
StartupWMClass=Vela
StartupNotify=true
EOF

  # Update desktop database.
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
  gtk-update-icon-cache -f "$ICON_DIR" 2>/dev/null || true

  echo ""
  echo "Vela installed successfully."
  echo "  Binary:   $BINDIR/$APPNAME_LOWER"
  echo "  Install:  $INSTALL_DIR"
  echo "  Desktop:  $DESKTOP_DIR/$APPNAME_LOWER.desktop"
  echo ""
  echo "Launch Vela from your applications menu or by typing 'vela' in a terminal."
}

uninstall() {
  echo "Uninstalling Vela ..."
  rm -rf "$INSTALL_DIR"
  rm -f "$BINDIR/$APPNAME_LOWER"
  rm -f "$DESKTOP_DIR/$APPNAME_LOWER.desktop"
  for size in 16 22 24 32 48 64 128 256; do
    rm -f "$ICON_DIR/${size}x${size}/apps/$APPNAME_LOWER.png"
  done
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
  gtk-update-icon-cache -f "$ICON_DIR" 2>/dev/null || true
  echo "Vela uninstalled."
}

case "$ACTION" in
  install) install;;
  uninstall) uninstall;;
esac
