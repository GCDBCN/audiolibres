// Vercel serverless function: /api/stream?v=VIDEOID
// Extracts the best audio-only stream URL of a YouTube video using yt-dlp.
// Returned URL is a signed googlevideo.com URL valid for a few hours.
// Used by the audiolibres app's "audio mode" so iOS can play in background
// (HTML5 <audio> works in lockscreen/background, iframes don't).

const ytdl = require('youtube-dl-exec');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  // 5 min CDN cache. Audio URLs expire ~6h so this is safe.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const v = ((req.query && req.query.v) || '').toString().trim();
  if (!v || !/^[\w-]{6,}$/.test(v)) {
    res.status(400).json({ error: 'Missing or invalid videoId' });
    return;
  }

  try {
    const info = await ytdl('https://www.youtube.com/watch?v=' + v, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificates: true,
      preferFreeFormats: false,
      youtubeSkipDashManifest: false,
      format: 'bestaudio/best',
    });

    const formats = (info.formats || []).filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'));
    formats.sort((a, b) => (b.abr || 0) - (a.abr || 0));
    const best = formats[0] || (info.formats || []).find(f => f.acodec && f.acodec !== 'none');
    if (!best || !best.url) {
      res.status(404).json({ error: 'No audio stream found' });
      return;
    }

    res.status(200).json({
      audioUrl: best.url,
      title: info.title || '',
      author: info.uploader || info.channel || '',
      duration: info.duration || 0,
      ext: best.ext || '',
      bitrate: Math.round(best.abr || 0),
      mime: best.ext === 'webm' ? 'audio/webm' : (best.ext === 'm4a' ? 'audio/mp4' : ''),
    });
  } catch (e) {
    res.status(502).json({
      error: 'Extraction failed',
      detail: String((e && e.stderr) || (e && e.message) || e).slice(0, 400),
    });
  }
};
