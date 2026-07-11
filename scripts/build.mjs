import { access, readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const site = JSON.parse(await readFile(path.join(root, 'data/site.json'), 'utf8'));
const songs = JSON.parse(await readFile(path.join(root, 'data/songs.json'), 'utf8'));
const template = await readFile(path.join(root, 'templates/song.html'), 'utf8');

const fail = (message) => { throw new Error(`Build validation failed: ${message}`); };
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const escapeXml = (value = '') => escapeHtml(value);
const replaceAll = (html, values) => Object.entries(values)
  .reduce((output, [key, value]) => output.replaceAll(`{{${key}}}`, String(value)), html);

function parseHttpsUrl(value, label) {
  let url;
  try { url = new URL(value); } catch { fail(`${label} must be a valid absolute URL.`); }
  if (url.protocol !== 'https:') fail(`${label} must use HTTPS.`);
  return url;
}

function validateSite() {
  for (const field of ['artist', 'baseUrl', 'language', 'siteTitle', 'siteDescription']) {
    if (!String(site[field] || '').trim()) fail(`data/site.json is missing required field "${field}".`);
  }
  const base = parseHttpsUrl(site.baseUrl, 'baseUrl');
  if (base.hostname === 'catalogue.example.com' || base.hostname.endsWith('.example.com')) {
    fail('baseUrl still uses catalogue.example.com. Set the final Cloudflare Pages URL before building.');
  }
  if (base.pathname !== '/' || base.search || base.hash) fail('baseUrl must be an origin URL without a path, query or fragment.');
  for (const [name, value] of Object.entries(site.social || {})) {
    if (value) parseHttpsUrl(value, `social.${name}`);
  }
}

async function validateSongs() {
  if (!Array.isArray(songs) || songs.length === 0) fail('data/songs.json must contain at least one song.');
  const seen = new Set();
  const required = ['slug', 'title', 'description', 'cover', 'coverAlt', 'lyrics', 'platforms', 'genres'];

  for (const [index, song] of songs.entries()) {
    const label = `song #${index + 1}${song?.title ? ` (${song.title})` : ''}`;
    for (const field of required) {
      if (song[field] === undefined || song[field] === null) fail(`${label} is missing required field "${field}".`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(song.slug)) fail(`${label} has invalid slug "${song.slug}".`);
    if (seen.has(song.slug)) fail(`Duplicate song slug found: "${song.slug}".`);
    seen.add(song.slug);
    if (!String(song.title).trim()) fail(`${label} has an empty title.`);
    if (!String(song.description).trim()) fail(`${label} has an empty description.`);
    if (!String(song.coverAlt).trim()) fail(`${label} has an empty coverAlt.`);
    if (!Array.isArray(song.lyrics) || song.lyrics.length === 0 || !song.lyrics.some((section) => String(section).trim())) {
      fail(`${label} must contain non-empty lyrics.`);
    }
    if (!Array.isArray(song.genres) || song.genres.length === 0 || song.genres.some((genre) => !String(genre).trim())) {
      fail(`${label} must contain at least one non-empty genre.`);
    }
    if (typeof song.platforms !== 'object' || Array.isArray(song.platforms)) fail(`${label} platforms must be an object.`);
    for (const [platform, url] of Object.entries(song.platforms)) {
      if (url) parseHttpsUrl(url, `${label} platform URL "${platform}"`);
    }
    if (!String(song.cover).startsWith('/assets/covers/')) fail(`${label} cover must use /assets/covers/...`);
    const coverFile = path.join(root, String(song.cover).replace(/^\//, ''));
    try { await access(coverFile); } catch { fail(`${label} references missing cover file: ${song.cover}`); }

    if (song.video !== null && song.video !== undefined) {
      if (typeof song.video !== 'object' || !['youtube', 'file'].includes(song.video.type)) fail(`${label} video.type must be "youtube" or "file".`);
      const videoUrl = parseHttpsUrl(song.video.url, `${label} video URL`);
      if (song.video.type === 'youtube' && videoUrl.hostname !== 'www.youtube-nocookie.com') {
        fail(`${label} YouTube embeds must use www.youtube-nocookie.com.`);
      }
      if (song.video.type === 'file' && song.video.poster) parseHttpsUrl(song.video.poster, `${label} video poster URL`);
    }
  }
}

validateSite();
await validateSongs();

const baseUrl = site.baseUrl.replace(/\/$/, '');
const absoluteUrl = (url) => new URL(url, `${baseUrl}/`).href;

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
  if (video.type === 'youtube') {
    return `<section class="video" aria-labelledby="video-title"><h2 id="video-title">Video</h2><div class="video-frame"><iframe src="${escapeHtml(video.url)}" title="${escapeHtml(title)} video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></section>`;
  }
  return `<section class="video" aria-labelledby="video-title"><h2 id="video-title">Video</h2><div class="video-frame"><video controls preload="metadata"${video.poster ? ` poster="${escapeHtml(video.poster)}"` : ''}><source src="${escapeHtml(video.url)}"></video></div></section>`;
}

function gaHead() {
  if (!site.measurementId) return '';
  const id = escapeHtml(site.measurementId);
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');</script>`;
}

function songSchema(song, canonical) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    '@id': `${canonical}#recording`,
    name: song.title,
    url: canonical,
    description: song.description,
    image: absoluteUrl(song.cover),
    genre: song.genres,
    byArtist: {
      '@type': 'Person',
      '@id': `${baseUrl}/#artist`,
      name: site.artist,
      alternateName: site.alternateArtistName,
      url: site.social.website,
      sameAs: Object.values(site.social || {}).filter(Boolean)
    },
    sameAs: Object.values(song.platforms || {}).filter(Boolean)
  };
  if (song.releaseDate) data.datePublished = song.releaseDate;
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

function homepageSchema() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        name: site.siteTitle,
        url: `${baseUrl}/`,
        description: site.siteDescription,
        inLanguage: site.language,
        publisher: { '@id': `${baseUrl}/#artist` }
      },
      {
        '@type': 'Person',
        '@id': `${baseUrl}/#artist`,
        name: site.artist,
        alternateName: site.alternateArtistName,
        url: site.social.website,
        sameAs: Object.values(site.social || {}).filter(Boolean)
      }
    ]
  }).replaceAll('<', '\\u003c');
}

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'assets'), { recursive: true });
await cp(path.join(root, 'src/styles.css'), path.join(dist, 'assets/styles.css'));
await cp(path.join(root, 'src/app.js'), path.join(dist, 'assets/app.js'));
await cp(path.join(root, 'public'), dist, { recursive: true });
await cp(path.join(root, 'assets/covers'), path.join(dist, 'assets/covers'), { recursive: true });

for (const song of songs) {
  const canonical = `${baseUrl}/${song.slug}/`;
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
    SCHEMA: songSchema(song, canonical)
  });
  const songDir = path.join(dist, song.slug);
  await mkdir(songDir, { recursive: true });
  await writeFile(path.join(songDir, 'index.html'), html);
}

const cards = songs.map((song) => `<li><a href="/${escapeHtml(song.slug)}/"><img src="${escapeHtml(song.cover)}" alt="${escapeHtml(song.coverAlt)}" width="600" height="600" loading="lazy"><span>${escapeHtml(song.title)}</span></a></li>`).join('');
const homeCanonical = `${baseUrl}/`;
const homeImage = absoluteUrl(songs[0].cover);
const index = `<!doctype html><html lang="${escapeHtml(site.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(site.siteTitle)}</title><meta name="description" content="${escapeHtml(site.siteDescription)}"><meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"><link rel="canonical" href="${homeCanonical}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#050505"><meta property="og:type" content="website"><meta property="og:site_name" content="${escapeHtml(site.artist)}"><meta property="og:title" content="${escapeHtml(site.siteTitle)}"><meta property="og:description" content="${escapeHtml(site.siteDescription)}"><meta property="og:url" content="${homeCanonical}"><meta property="og:image" content="${homeImage}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(site.siteTitle)}"><meta name="twitter:description" content="${escapeHtml(site.siteDescription)}"><meta name="twitter:image" content="${homeImage}"><link rel="stylesheet" href="/assets/styles.css">${gaHead()}<script type="application/ld+json">${homepageSchema()}</script></head><body><header class="site-header"><a class="brand" href="/">${escapeHtml(site.artist)}</a><span class="catalogue-label">Music Catalogue</span></header><main class="song"><header><p class="eyebrow">Official Catalogue</p><h1>${escapeHtml(site.artist)}</h1><p class="description">${escapeHtml(site.siteDescription)}</p></header><section aria-labelledby="releases-title"><h2 id="releases-title">Songs</h2><ul class="catalogue-grid">${cards}</ul></section></main></body></html>`;
await writeFile(path.join(dist, 'index.html'), index);

const urls = [homeCanonical, ...songs.map((song) => `${baseUrl}/${song.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(dist, 'sitemap.xml'), sitemap);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);

console.log(`Built ${songs.length} song page(s) in dist/.`);
