#!/usr/bin/env python3
"""Regenerate /blog/index.html with cards for ALL posts in /blog/*.html.

Run after the daily bot produces new posts. Sorts by datePublished extracted
from each post's Article schema (newest first).
"""
import re, json, glob
from pathlib import Path
from html import escape

POSTS_DIR = Path('blog')
OUT = Path('blog.html')

# ---- Read each post and extract title, description, slug, date, category ----
posts = []
for f in sorted(glob.glob('blog/*.html')):
    s = Path(f).read_text()
    slug = Path(f).stem
    if slug == 'index':  # skip
        continue
    # Title
    m = re.search(r'<title>([^|]+?)\s*(?:\||—)', s)
    title = m.group(1).strip() if m else slug
    # Description
    m = re.search(r'<meta name="description" content="([^"]+)"', s)
    desc = m.group(1).strip() if m else ''
    # Date from Article schema
    m = re.search(r'"datePublished":\s*"([^"]+)"', s)
    date = m.group(1) if m else '2026-01-01'
    # Pillar/category from URL or kw
    posts.append({
        'slug': slug,
        'title': title,
        'desc': desc[:200],
        'date': date,
    })

posts.sort(key=lambda x: x['date'], reverse=True)
# Featured = newest, all-posts = the rest
featured = posts[0] if posts else None
rest = posts[1:] if len(posts) > 1 else []

# ---- Read the current blog.html as template ----
tpl = OUT.read_text()

# Replace the all-posts grid items
# We replace the contents between <div class="posts-grid"> ... </div>
def cards_html(items):
    out = []
    GRADIENTS = ['grad-marco', 'grad-coelho', 'grad-rubin']
    for i, p in enumerate(items):
        grad = GRADIENTS[i % len(GRADIENTS)]
        out.append(f'''
      <a href="/blog/{escape(p["slug"])}" class="post-card">
        <div class="cover {grad}">
          <div class="play-chip">▶</div>
          <div class="cover-text">
            <h3>{escape(p["title"][:48])}</h3>
            <p>{escape(p["desc"][:60])}</p>
          </div>
        </div>
        <div class="post-body">
          <h4>{escape(p["title"][:80])}</h4>
          <p>{escape(p["desc"][:150])}</p>
          <div class="post-meta-mini">
            <span>{p["date"]}</span>
          </div>
        </div>
      </a>''')
    return ''.join(out)

if rest:
    new_grid = cards_html(rest)
    # Replace the contents of <div class="posts-grid"> ... </div>
    new_tpl = re.sub(
        r'(<div class="posts-grid">)([\s\S]*?)(</div>\s*</div>\s*</section>)',
        lambda m: m.group(1) + new_grid + '\n    ' + m.group(3),
        tpl, count=1
    )
    # Update post count
    new_tpl = re.sub(
        r'<span class="count">\d+ (?:audiolibros analizados|reseñas)</span>',
        f'<span class="count">{len(posts)} reseñas</span>',
        new_tpl
    )
    OUT.write_text(new_tpl)
    print(f'blog.html regenerated with {len(posts)} posts total')
else:
    print('No posts to render')
