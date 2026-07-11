# Sasha Persholja Music Catalogue

A lightweight, zero-dependency static website generator for Sasha Persholja song pages. It is designed to scale beyond 50 releases while keeping one shared template and one JSON catalogue.

This repository is completely separate from `sasapersolja/big-black-puppet-independent` and is not connected to the current live website.

## Requirements

- Node.js 18 or newer
- No npm dependencies

## Build

```bash
npm run build
```

The complete static website is generated in:

```text
dist/
```

Generated output includes:

- `dist/index.html` – catalogue homepage
- `dist/<song-slug>/index.html` – clean song URLs
- `dist/sitemap.xml` – generated automatically
- `dist/robots.txt` – generated automatically
- `dist/_headers` – Cloudflare Pages headers
- shared CSS, JavaScript, favicon, manifest and WebP covers

## Cloudflare Pages deployment

Create a new Cloudflare Pages project for this repository only. Do not connect it to the existing `sashapersholja.com` production project.

Use these settings:

```text
Production branch: main
Framework preset: None
Build command: npm run build
Build output directory: dist
Root directory: /
Node.js version: 18 or newer
```

Recommended setup:

1. Open Cloudflare Dashboard.
2. Go to **Workers & Pages**.
3. Select **Create application → Pages → Connect to Git**.
4. Choose `sasapersolja/sasha-persholja-music-catalogue`.
5. Set the production branch to `main`.
6. Use `npm run build` as the build command.
7. Use `dist` as the build output directory.
8. Leave the root directory empty or `/`.
9. Deploy to the temporary `pages.dev` address first.
10. Do not add `sashapersholja.com` as a custom domain.

The repository also contains `wrangler.toml` with:

```toml
pages_build_output_dir = "./dist"
```

This supports Wrangler-based Pages deployment as well.

### Optional Wrangler deployment

After authenticating Wrangler:

```bash
npx wrangler pages deploy dist --project-name sasha-persholja-music-catalogue
```

## Important before public launch

Open `data/site.json` and replace:

```json
"baseUrl": "https://catalogue.example.com"
```

with the final separate catalogue domain or the assigned Cloudflare Pages URL. This controls canonical URLs, `robots.txt` and `sitemap.xml`.

Do not use the existing live website domain until a deliberate migration or subdomain plan is approved.

## Add a new song

### 1. Prepare the cover

Export a square WebP image, ideally 1200 × 1200 pixels and normally under 250 KB.

Place it here:

```text
assets/covers/my-new-song.webp
```

Do not commit WAV files, large MP3 files or large videos. Host large media externally and reference it by URL.

### 2. Add one JSON object

Open `data/songs.json` and add a new object:

```json
{
  "slug": "my-new-song",
  "title": "My New Song",
  "description": "My New Song by Sasha Persholja – official release description.",
  "cover": "/assets/covers/my-new-song.webp",
  "coverAlt": "My New Song by Sasha Persholja cover artwork",
  "lyrics": [
    "First verse line one\nFirst verse line two",
    "Second verse or chorus"
  ],
  "video": {
    "type": "youtube",
    "url": "https://www.youtube-nocookie.com/embed/VIDEO_ID"
  },
  "platforms": {
    "bandcamp": "https://...",
    "appleMusic": "https://...",
    "amazonMusic": "https://...",
    "spotify": "https://...",
    "youtubeMusic": "https://..."
  },
  "releaseDate": "2026-07-11",
  "genres": ["Blues Rock", "Funk", "Alternative"]
}
```

For a song without a video:

```json
"video": null
```

Empty platform URLs are not rendered.

### 3. Build

```bash
npm run build
```

The generator creates:

```text
dist/my-new-song/index.html
dist/sitemap.xml
```

## SEO generated for every song

Each generated page includes:

- canonical URL
- Open Graph metadata
- Twitter/X Card metadata
- Schema.org `MusicRecording`
- artist identity and profile links
- optimized cover preload
- robots metadata
- automatic sitemap entry

## Google Analytics

The Measurement ID is configured in `data/site.json`. Platform clicks send:

```text
event_name: select_platform
platform: bandcamp | appleMusic | amazonMusic | spotify | youtubeMusic
song_slug: the song slug
```

Set `measurementId` to an empty string to disable Google Analytics.

## Project structure

```text
assets/covers/          Optimized WebP song covers
data/site.json          Shared artist, domain and Analytics settings
data/songs.json         All song content
public/                 Files copied directly into dist
templates/song.html     Reusable song-page template
src/styles.css          Shared styles
src/app.js              Shared Analytics event tracking
scripts/build.mjs       Static site, robots and sitemap generator
scripts/clean.mjs       Removes generated output
wrangler.toml           Cloudflare Pages output configuration
dist/                   Generated static site; not committed
```
