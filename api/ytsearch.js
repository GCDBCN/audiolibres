// Vercel serverless function: /api/ytsearch?q=...
// Wraps yt-search (no API key needed) and returns clean JSON for the audiolibres app.
const yts = require('yt-search');

module.exports = async (req, res) => {
  // CORS — same-origin in prod, but be permissive in case of subdomains/preview deploys
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const q = ((req.query && req.query.q) || '').toString().trim();
  if (!q) { res.status(400).json({ error: 'Missing q' }); return; }
  if (q.length > 200) { res.status(400).json({ error: 'q too long' }); return; }

  try {
    const result = await yts(q);
    const items = (result.videos || []).slice(0, 25).map(v => ({
      videoId: v.videoId,
      title: v.title,
      author: v.author && v.author.name || '',
      thumbnail: (v.thumbnail || (v.image) || '').replace('http:', 'https:'),
      duration: v.seconds || 0,
      durationLabel: v.timestamp || '',
      views: v.views || 0,
      publishedLabel: v.ago || '',
      url: 'https://www.youtube.com/watch?v=' + v.videoId,
    }));
    res.status(200).json({ items });
  } catch (e) {
    res.status(502).json({ error: 'Search backend failed', detail: String((e && e.message) || e).slice(0, 300) });
  }
};
