#!/bin/sh
# Double-click in Finder to start Pixelbolt Studio in a Terminal window.
exec "$(dirname "$0")/pixelbolt-studio" "$@"
