// Fetches the book cover from Google Books API and sets it as background of .book-cover
// (shared across all blog posts). Extracts title/author from the <h2> and <p> inside .book-cover.
(async () => {
  const cover = document.querySelector('.book-cover');
  if (!cover) return;
  const h2 = cover.querySelector('h2');
  const p = cover.querySelector('p');
  if (!h2 || !p) return;
  const title = h2.textContent.trim();
  const author = (p.textContent.split('·')[0] || '').trim();
  if (!title || !author) return;

  async function fetchCover(q) {
    try {
      const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1&langRestrict=es`);
      if (!r.ok) return '';
      const data = await r.json();
      const img = data?.items?.[0]?.volumeInfo?.imageLinks;
      if (!img) return '';
      return (img.extraLarge || img.large || img.medium || img.thumbnail || img.smallThumbnail || '')
        .replace('http:', 'https:').replace('&edge=curl', '').replace('zoom=1', 'zoom=3');
    } catch { return ''; }
  }

  let url = await fetchCover(`intitle:"${title}" inauthor:"${author}"`);
  if (!url) url = await fetchCover(`${title} ${author}`);
  if (!url) return;

  const applyToElement = (el, bgTitle) => {
    const imgEl = new Image();
    imgEl.onload = () => {
      const imgTag = document.createElement('img');
      imgTag.src = url;
      imgTag.alt = bgTitle || title;
      imgTag.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;';
      el.style.position = 'relative';
      el.insertBefore(imgTag, el.firstChild);
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.15) 100%);z-index:1;';
      el.insertBefore(overlay, el.children[1]);
      el.querySelectorAll('.content, .play-chip, .cover-text').forEach(e => {
        e.style.position = 'relative';
        e.style.zIndex = '2';
      });
    };
    imgEl.src = url;
  };

  applyToElement(cover);
})();
