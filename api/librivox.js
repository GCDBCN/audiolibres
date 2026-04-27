// Vercel serverless function: /api/librivox
//   ?q=meditaciones        → search audiobooks by title
//   ?author=marcus aurelio → search by author
//   ?id=18163              → get full book info (all sections with MP3 URLs)
// Proxies the public LibriVox JSON API so the browser doesn't worry about CORS.

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=900, stale-while-revalidate=3600');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const q = (req.query.q || '').toString().trim();
  const author = (req.query.author || '').toString().trim();
  const id = (req.query.id || '').toString().trim();

  try {
    if (id) {
      // Single book with full sections
      const url = `${BASE}?format=json&extended=1&id=${encodeURIComponent(id)}`;
      const data = await fetchJson(url);
      const book = (data.books || [])[0];
      if (!book) { res.status(404).json({ error: 'Book not found' }); return; }
      res.status(200).json({ book: trimBook(book, true) });
      return;
    }
    if (!q && !author) { res.status(400).json({ error: 'Missing q or author' }); return; }

    const params = new URLSearchParams({ format: 'json', extended: '1', limit: '15' });
    if (q) params.set('title', q);
    if (author) params.set('author', author);
    const data = await fetchJson(`${BASE}?${params}`);
    const books = (data.books || []).map(b => trimBook(b, false));
    res.status(200).json({ books });
  } catch (e) {
    res.status(502).json({ error: 'LibriVox fetch failed', detail: String((e && e.message) || e).slice(0, 300) });
  }
};
