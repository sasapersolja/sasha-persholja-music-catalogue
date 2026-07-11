import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const site = JSON.parse(await readFile(path.join(root, 'data/site.json'), 'utf8'));
const songs = JSON.parse(await readFile(path.join(root, 'data/songs.json'), 'utf8'));
const template = await readFile(path.join(root, 'templates/song.html'), 'utf8');

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const absoluteUrl = (url) => new URL(url, `${site.baseUrl}/`).href;
const replaceAll = (html, values) => Object.entries(values)
  .reduce((output, [key, value]) => output.replaceAll(`{{${key}}}`, String(value)), html);

function platformLinks(song) {
  const labels = {
    bandcamp: 'Bandcamp',
    appleMusic: 'Apple Music',
    amazonMusic: 'Amazon Music',
    spotify: 'Spotify',
    youtubeMusic: 'YouTube Music'
  };

  return Object.entries(song.platforms || {})
    .filter(([, url]) => Boolean(url))
    .map(([platform, url]) => `<a class="platform-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer external" data-platform="${escapeHtml(platform)}">${labels[platform] || escapeHtml(platform)}</a>`)
    .join('\n');
}

function lyricsHtml(lyrics = []) {
  return lyrics.map((section) => `<p>${escapeHtml(section).replaceAll('\n', '<br>')}</p>`).join('\n');
}

function videoHtml(video, title) {
  if (!video) return '';
  if (video.type === 'youtube' && video.url) {
    return `<section class="video" aria-labelledby="video-title"><h2 id="video-title">Video</h2><div class="video-frame"><iframe src="${escapeHtml(video.url)}" title="${escapeHtml(title)} video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></section>`;
  }
  if (video.type === 'file' && video.url) {
    return `<section class="video" aria-labelledby="video-title"><h2 id="video-title">Video</h2><div class="video-frame"><video controls preload="metadata" poster="${escapeHtml(video.poster || '')}"><source src="${escapeHtml(video.url)}"></video></div></section>`;
  }
  return '';
}

function gaHead() {
  if (!site.measurementId) return '';
  const id = escapeHtml(site.measurementId);
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');</script>`;
}

function schema(song, canonical) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    '@id': `${canonical}#recording`,
    name: song.title,
    url: canonical,
    description: song.description,
    image: absoluteUrl(song.cover),
    genre: song.genres || [],
    byArtist: {
      '@type': 'Person',
      name: site.artist,
      alternateName: site.alternateArtistName,
      url: site.social.website,
      sameAs: Object.values(site.social).filter(Boolean)
    },
    sameAs: Object.values(song.platforms || {}).filter(Boolean)
  };
  if (song.releaseDate) data.datePublished = song.releaseDate;
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'assets', 'covers'), { recursive: true });
await cp(path.join(root, 'src/styles.css'), path.join(dist, 'assets/styles.css'));
await cp(path.join(root, 'src/app.js'), path.join(dist, 'assets/app.js'));
await cp(path.join(root, 'public/favicon.svg'), path.join(dist, 'favicon.svg'));
await cp(path.join(root, 'public/site.webmanifest'), path.join(dist, 'site.webmanifest'));
await cp(path.join(root, 'assets/covers'), path.join(dist, 'assets/covers'), { recursive: true });

for (const song of songs) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(song.slug)) throw new Error(`Invalid slug: ${song.slug}`);
  const canonical = `${site.baseUrl.replace(/\/$/, '')}/${song.slug}/`;
  const html = replaceAll(template, {
    LANG: escapeHtml(site.language),
    PAGE_TITLE: escapeHtml(`${song.title} – ${site.artist}`),
    DESCRIPTION: escapeHtml(song.description),
    CANONICAL: canonical,
    ARTIST: escapeHtml(site.artist),
    TITLE: escapeHtml(song.title),
    OG_TITLE: escapeHtml(`${song.title} – ${site.artist}`),
    COVER: escapeHtml(song.cover),
    COVER_ABSOLUTE: absoluteUrl(song.cover),
    COVER_ALT: escapeHtml(song.coverAlt),
    SLUG: escapeHtml(song.slug),
    PLATFORM_LINKS: platformLinks(song) || '<p>Platform links coming soon.</p>',
    LYRICS: lyricsHtml(song.lyrics),
    VIDEO_SECTION: videoHtml(song.video, song.title),
    GA_HEAD: gaHead(),
    SCHEMA: schema(song, canonical)
  });
  const songDir = path.join(dist, song.slug);
  await mkdir(songDir, { recursive: true });
  await writeFile(path.join(songDir, 'index.html'), html);
}

const cards = songs.map((song) => `<li><a href="/${song.slug}/"><img src="${escapeHtml(song.cover)}" alt="${escapeHtml(song.coverAlt)}" width="600" height="600" loading="lazy"><span>${escapeHtml(song.title)}</span></a></li>`).join('');
const index = `<!doctype html><html lang="${escapeHtml(site.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(site.siteTitle)}</title><meta name="description" content="${escapeHtml(site.siteDescription)}"><link rel="canonical" href="${site.baseUrl}/"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/styles.css"></head><body><header class="site-header"><a class="brand" href="/">${escapeHtml(site.artist)}</a><span class="catalogue-label">Music Catalogue</span></header><main class="song"><p class="eyebrow">Official Catalogue</p><h1>${escapeHtml(site.artist)}</h1><ul class="catalogue-grid">${cards}</ul></main></body></html>`;
await writeFile(path.join(dist, 'index.html'), index);

const urls = [`${site.baseUrl.replace(/\/$/, '')}/`, ...songs.map((song) => `${site.baseUrl.replace(/\/$/, '')}/${song.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(dist, 'sitemap.xml'), sitemap);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.baseUrl.replace(/\/$/, '')}/sitemap.xml\n`);
console.log(`Built ${songs.length} song page(s) in dist/.`);
