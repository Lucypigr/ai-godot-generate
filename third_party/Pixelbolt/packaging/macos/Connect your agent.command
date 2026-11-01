#!/bin/sh
# Double-click in Finder to print MCP settings for this folder in a Terminal window.
exec "$(dirname "$0")/connect-your-agent" "$@"
