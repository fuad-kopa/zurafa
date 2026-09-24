#!/usr/bin/env bash
# Publish the current build to the gh-pages branch (GitHub Pages). Run from the project root.
set -euo pipefail
npm run build
cd dist && touch .nojekyll
git init -q -b gh-pages
git add -A
git -c user.name="Fuad Kopa" -c user.email="fuadbeykopadze@gmail.com" commit -q -m "deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -q -f "https://github.com/fuad-kopa/zurafa.git" gh-pages
cd .. && rm -rf dist/.git
echo "published: https://fuad-kopa.github.io/zurafa/"
