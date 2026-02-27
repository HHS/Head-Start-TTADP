#!/usr/bin/env bash
# Syncs Claude Code skills from the version-controlled source (.github/skills/)
# to the local Claude Code skills directory (.claude/skills/).
#
# Claude Code reads skills from .claude/skills/, but that directory is gitignored.
# Skills are authored and shared with the team in .github/skills/.
# This script bridges the two by copying skills from the shared location
# to the local one, ensuring every developer has up-to-date skills.
#
# Called automatically by:
#   - git hooks: post-merge (git pull/merge) and post-checkout (git checkout/switch)
#   - yarn postinstall (initial setup / yarn install)
#
# Safe to run manually or repeatedly — it does a clean copy each time.

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$REPO_ROOT/.github/skills"
DEST="$REPO_ROOT/.claude/skills"

# Exit silently if source doesn't exist
[ -d "$SOURCE" ] || exit 0

# Clean and copy
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SOURCE"/. "$DEST"/
