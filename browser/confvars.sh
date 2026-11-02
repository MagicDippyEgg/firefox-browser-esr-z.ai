#! /bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Vela — the calm browser.
# Built on the Mozilla Firefox ESR engine.
#
# These two values rename the *binary* and the application.ini "Name"
# field, so the executable becomes `vela` (or `vela-bin`) instead of
# `firefox`, and the profile path becomes ~/.vela instead of ~/.firefox.
# MOZ_APP_DISPLAYNAME is set by branding/configure.sh.

MOZ_APP_BASENAME=Vela
MOZ_APP_NAME=vela
# The User-Agent app token. When set, this appears as "Vela/<version>" in
# the UA string alongside the "Firefox/<version>" compat token (enabled via
# general.useragent.compatMode.firefox in firefox.js). Together they give:
#   Mozilla/5.0 (...) Gecko/... Firefox/<ver> Vela/<ver>
MOZ_APP_UA_NAME=Vela

# MOZ_BRANDING_DIRECTORY is the default branding directory used when none is
# specified. It should never point to the "official" branding directory.
# For mozilla-beta, mozilla-release, or mozilla-central repositories, use
# "unofficial" branding.
# For the mozilla-aurora repository, use "aurora".
MOZ_BRANDING_DIRECTORY=browser/branding/unofficial
MOZ_OFFICIAL_BRANDING_DIRECTORY=browser/branding/official
