// Vercel serverless function: /api/librivox
//   ?q=meditaciones        → search audiobooks (title + author, with case variations)
//   ?id=18163              → get full book info (all sections with MP3 URLs)
// Proxies the public LibriVox JSON API and works around its picky matching:
// LibriVox is case-sensitive, partial-prefix only (e.g. "Don Quixote" finds the book
// but "quixote" alone does not), so we fan out multiple variations server-side.

const BASE = 'https://librivox.org/api/feed/audiobooks/';

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'audiolibres/1.0 (+https://audiolibres.com)' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

function authorName(a) {
  return ((a && a.first_name ? a.first_name + ' ' : '') + (a && a.last_name ? a.last_name : '')).trim();
}

function trimBook(b, withSections) {
  const out = {
    id: b.id,
    title: b.title,
    description: (b.description || '').replace(/<[^>]+>/g, '').slice(0, 600),
    language: b.language,
    totaltime: b.totaltime,
    totaltimesecs: b.totaltimesecs,
    authors: (b.authors || []).map(authorName).filter(Boolean),
    url_iarchive: b.url_iarchive || '',
    sectionsCount: (b.sections || []).length,
  };
  if (withSections) {
    out.sections = (b.sections || []).map(s => ({
      id: s.id,
      section_number: s.section_number,
      title: s.title,
      listen_url: s.listen_url,
      playtime: s.playtime,
    }));
  }
  return out;
}

function capitalize(s) { return s.replace(/\b\w/g, c => c.toUpperCase()); }

async function trySearch(params) {
  try {
    const data = await fetchJson(`${BASE}?${params}`);
    return Array.isArray(data && data.books) ? data.books : [];
  } catch { return []; }
}

// Spanish ↔ English aliases for very common works whose LibriVox title differs
const TITLE_ALIASES = {
  'quijote': ['Don Quixote'],
  'don quijote': ['Don Quixote'],
  'odisea': ['Odyssey'],
  'iliada': ['Iliad'],
  'ilíada': ['Iliad'],
  'biblia': ['Bible'],
  'principito': ['Le Petit Prince', 'Little Prince'],
  'principe': ['Prince'],
  'príncipe': ['Prince'],
  'crimen y castigo': ['Crime and Punishment'],
  'guerra y paz': ['War and Peace'],
  'metamorfosis': ['Metamorphosis'],
  'rebelion en la granja': ['Animal Farm'],
  'rebelión en la granja': ['Animal Farm'],
};

function planSearches(q) {
  const lower = q.trim().toLowerCase();
  const words = lower.split(/\s+/).filter(w => w.length >= 4 && !/^[\W_]+$/.test(w));
  // Build (priority, params) tuples — lower number = higher priority
  const plans = [];
  // 1. Direct alias hits (instant results for known works)
  if (TITLE_ALIASES[lower]) {
    for (const t of TITLE_ALIASES[lower]) plans.push([0, `title=${encodeURIComponent(t)}`]);
  }
  // 2. The full string as title, in original + Capitalized variants
  plans.push([1, `title=${encodeURIComponent(q.trim())}`]);
  plans.push([1, `title=${encodeURIComponent(capitalize(lower))}`]);
  plans.push([1, `title=${encodeURIComponent(lower)}`]);
  // 3. Each word as author (LibriVox author is case-insensitive last-name match)
  for (const w of words) plans.push([2, `author=${encodeURIComponent(w)}`]);
  // 4. Each significant word as title (catches single-word queries)
  for (const w of words) {
    plans.push([3, `title=${encodeURIComponent(capitalize(w))}`]);
    plans.push([3, `title=${encodeURIComponent(w)}`]);
  }
  // De-duplicate URL params, preserving priority
  const seen = new Set();
  return plans.filter(([_, p]) => seen.has(p) ? false : (seen.add(p), true)).slice(0, 18);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=900, stale-while-revalidate=3600');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const q = (req.query.q || '').toString().trim();
  const id = (req.query.id || '').toString().trim();

  try {
    if (id) {
      const url = `${BASE}?format=json&extended=1&id=${encodeURIComponent(id)}`;
      const data = await fetchJson(url);
      const book = (data.books || [])[0];
      if (!book) { res.status(404).json({ error: 'Book not found' }); return; }
      res.status(200).json({ book: trimBook(book, true) });
      return;
    }
    if (!q) { res.status(400).json({ error: 'Missing q' }); return; }

    const plans = planSearches(q);
    const all = await Promise.all(plans.map(([_, p]) => trySearch(`format=json&extended=1&limit=12&${p}`)));
    // all[i] aligns with plans[i] which is priority-ordered

    // Deduplicate by id; keep first occurrence (= highest-priority match)
    const seen = new Set();
    const merged = [];
    for (let i = 0; i < all.length; i++) {
      for (const b of all[i]) {
        if (!b || !b.id || seen.has(b.id)) continue;
        seen.add(b.id);
        merged.push(trimBook(b, false));
        if (merged.length >= 15) break;
      }
      if (merged.length >= 15) break;
    }
    res.status(200).json({ books: merged });
  } catch (e) {
    res.status(502).json({ error: 'LibriVox fetch failed', detail: String((e && e.message) || e).slice(0, 300) });
  }
};
