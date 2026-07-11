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

The build fails with a clear message when:

- `baseUrl` is missing, invalid, non-HTTPS or still uses `catalogue.example.com`
- duplicate or invalid song slugs exist
- required song fields are missing
- descriptions or lyrics are empty
- a referenced cover file does not exist
- platform URLs use invalid or unsafe protocols
- video configuration or video URLs are invalid
- a YouTube embed does not use `www.youtube-nocookie.com`

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
9. Deploy only to the separate `pages.dev` project.
10. Do not add `sashapersholja.com` as a custom domain.

The configured catalogue URL is currently:

```text
https://sasha-persholja-music-catalogue.pages.dev
```

It is used only to generate canonical URLs, sitemap entries and `robots.txt`. Creating or editing this repository does not deploy the site or connect a domain.

The repository also contains `wrangler.toml` with:

```toml
pages_build_output_dir = "./dist"
```

### Optional Wrangler deployment

After authenticating Wrangler:

```bash
npx wrangler pages deploy dist --project-name sasha-persholja-music-catalogue
```

Do not run this command until the Cloudflare Pages project is intentionally ready for deployment.

## Cache policy

- `assets/covers/*` uses one-year immutable caching because cover filenames are expected to change when the image changes.
- `assets/styles.css` and `assets/app.js` use short, revalidated caching because their filenames are not content-hashed.
- sitemap and robots use short revalidated caching.

## Add a new song

### 1. Prepare the cover

Export a square WebP image, ideally 1200 × 1200 pixels and normally under 250 KB.

Place it here:

```text
assets/covers/my-new-song.webp
```

Do not commit WAV files, large MP3 files or large videos. Host large media externally and reference it by HTTPS URL.

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

Empty platform URLs are not rendered. Non-empty platform URLs must use HTTPS.

### 3. Build

```bash
npm run build
```

The generator creates:

```text
dist/my-new-song/index.html
dist/sitemap.xml
```

## SEO generated for the homepage

The generated catalogue homepage includes:

- Google Analytics using `measurementId`
- canonical URL
- robots meta
- Open Graph metadata
- Twitter/X Card metadata
- favicon and manifest
- Schema.org `WebSite` and `Person`
- accessible `h1` and `h2` structure

## SEO generated for every song

Each generated song page includes:

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

Tracking uses `transport_type: beacon`, an `event_callback` and a short fallback timeout. Links opening in a new tab are never delayed or blocked by Analytics.

Set `measurementId` to an empty string to disable Google Analytics.

## Continuous integration

GitHub Actions runs `npm run build` and verifies:

- generated homepage
- demo song page
- required assets
- sitemap XML validity
- HTTPS production URLs
- absence of `catalogue.example.com` anywhere in `dist`

## Project structure

```text
assets/covers/          Optimized WebP song covers
data/site.json          Shared artist, domain and Analytics settings
data/songs.json         All song content
public/                 Files copied directly into dist
templates/song.html     Reusable song-page template
src/styles.css          Shared styles
src/app.js              Shared Analytics event tracking
scripts/build.mjs       Validating static site, robots and sitemap generator
scripts/clean.mjs       Removes generated output
wrangler.toml           Cloudflare Pages output configuration
dist/                   Generated static site; not committed
```
