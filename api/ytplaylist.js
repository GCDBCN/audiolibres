// Vercel serverless function: /api/ytplaylist?list=PLQxJB1T...
const yts = require('yt-search');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=900, stale-while-revalidate=3600');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const list = ((req.query && req.query.list) || '').toString().trim();
  if (!list || !/^[\w-]{10,}$/.test(list)) {
    res.status(400).json({ error: 'Missing or invalid list id' });
    return;
  }

  try {
    const r = await yts({ listId: list });
    const videos = (r && r.videos) || [];
    if (!videos.length) { res.status(404).json({ error: 'Playlist empty or not found' }); return; }

    res.status(200).json({
      playlist: {
        listId: r.listId || list,
        title: r.title || '',
        author: (r.author && (r.author.name || r.author.handle)) || '',
        size: r.size || videos.length,
        thumbnail: r.image || r.thumbnail || (videos[0] && videos[0].thumbnail) || '',
        videos: videos.slice(0, 200).map(v => ({
          videoId: v.videoId,
          title: v.title || '',
          author: (v.author && v.author.name) || '',
          duration: (v.duration && v.duration.seconds) || v.seconds || 0,
          durationLabel: (v.duration && v.duration.timestamp) || v.timestamp || '',
          thumbnail: v.thumbnail || '',
        })),
      },
    });
  } catch (e) {
    res.status(502).json({ error: 'Playlist fetch failed', detail: String((e && e.message) || e).slice(0, 300) });
  }
};
