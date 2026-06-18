#!/bin/bash
# Deploy script for audiolibres.com — used by the daily blog factory bot.
# 1. Validates HTML files don't have obvious errors
# 2. Regenerates blog.html index
# 3. Updates sitemap.xml with new post URLs
# 4. Commits + pushes to GitHub (Vercel auto-deploys on push)

set -e
cd "$(dirname "$0")"

if [ -z "$GH_PAT" ]; then
  echo "ERROR: GH_PAT not set. Export it before running this script." >&2
  exit 1
fi
REPO="github.com/GCDBCN/audiolibres.git"

echo "── Pre-flight checks ──"
# Ensure new blog posts have correct schema
for f in blog/*.html; do
  if ! grep -q '"@type": "Article"' "$f" 2>/dev/null; then
    echo "  ⚠ Missing Article schema in $f (skipping check)"
  fi
done

echo "── Regenerating blog index ──"
python3 regenerate-blog-index.py

echo "── Updating sitemap.xml ──"
python3 - <<'PY'
import re, glob
from pathlib import Path

POSTS = sorted(glob.glob('blog/*.html'))
sitemap = Path('sitemap.xml').read_text()

# Build URL entries from filesystem
seen_urls = set(re.findall(r'<loc>([^<]+)</loc>', sitemap))
new_entries = []
for f in POSTS:
    slug = Path(f).stem
    if slug == 'index': continue
    url = f'https://audiolibres.com/blog/{slug}'
    if url in seen_urls: continue
    new_entries.append(f'  <url>\n    <loc>{url}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>')

if new_entries:
    sitemap = sitemap.replace('</urlset>', '\n'.join(new_entries) + '\n</urlset>')
    Path('sitemap.xml').write_text(sitemap)
    print(f'  Added {len(new_entries)} new URLs to sitemap')
else:
    print('  Sitemap already up to date')
PY

echo "── Committing and pushing ──"
git add -A
if ! git diff --cached --quiet; then
  TS=$(date '+%Y-%m-%d %H:%M')
  git -c user.name="audiolibres-bot" -c user.email="bot@audiolibres.com" \
    commit -m "Daily posts batch · $TS"
  git push "https://GCDBCN:${GH_PAT}@${REPO}" main
  echo "  ✓ Pushed to GitHub"
else
  echo "  Nothing to commit"
fi

echo "── IndexNow ping (Bing/Yandex) ──"
KEY="b6a76a819c5630711e1c240d71cc83ae"
NEW_URLS=$(git diff HEAD~1 HEAD --name-only 2>/dev/null | grep '^blog/.*\.html$' | sed 's|^|https://audiolibres.com/|' | sed 's|\.html$||' || true)
if [ -n "$NEW_URLS" ]; then
  URL_ARR=$(echo "$NEW_URLS" | python3 -c "import sys,json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))")
  curl -sX POST 'https://api.indexnow.org/indexnow' \
    -H 'Content-Type: application/json' \
    -d "{\"host\":\"audiolibres.com\",\"key\":\"$KEY\",\"keyLocation\":\"https://audiolibres.com/$KEY.txt\",\"urlList\":$URL_ARR}" \
    > /dev/null && echo "  ✓ Pinged IndexNow with $(echo "$NEW_URLS" | wc -l) URLs"
fi

echo "── Done ──"
