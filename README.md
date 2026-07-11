# Sasha Persholja Music Catalogue

A lightweight, zero-dependency static website generator for Sasha Persholja song pages. It is designed to scale beyond 50 releases while keeping one shared template and one JSON catalogue.

This repository is completely separate from `sasapersolja/big-black-puppet-independent` and is not connected to `sashapersholja.com`.

## Requirements

- Node.js 18 or newer
- No npm dependencies

## Build

```bash
npm run build
```

The generated static website is written to `dist/`:

- `/index.html` – catalogue homepage
- `/<song-slug>/index.html` – clean song URL
- `/sitemap.xml` – generated automatically
- `/robots.txt` – generated automatically
- shared CSS, JavaScript, favicon and covers

Serve `dist/` with any static host.

## Important before deployment

Open `data/site.json` and replace:

```json
"baseUrl": "https://catalogue.example.com"
```

with the final catalogue domain. Do this before submitting the generated sitemap to search engines. The new catalogue must not be deployed over the existing Big Black Puppet website.

## Add a new song

### 1. Prepare the cover

Export a square WebP image, ideally 1200 × 1200 pixels and normally under 250 KB.

Place it here:

```text
assets/covers/my-new-song.webp
```

Do not commit WAV files, large MP3 files or large videos. Host large media externally and reference it by URL.

### 2. Add one JSON object

Open `data/songs.json` and add a new object after the existing demo song:

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

For a song without a video, use:

```json
"video": null
```

Platform values may be empty while links are unavailable. Empty links are not rendered.

### 3. Build

```bash
npm run build
```

The generator creates:

```text
dist/my-new-song/index.html
dist/sitemap.xml
```

The public URL becomes:

```text
https://YOUR-CATALOGUE-DOMAIN/my-new-song/
```

## Song data fields

| Field | Required | Purpose |
|---|---:|---|
| `slug` | Yes | Clean URL segment using lowercase letters, numbers and hyphens |
| `title` | Yes | Song title |
| `description` | Yes | Meta, Open Graph and page description |
| `cover` | Yes | Root-relative WebP path |
| `coverAlt` | Yes | Accessible image description |
| `lyrics` | Yes | Array of lyric sections |
| `video` | No | YouTube embed or hosted file configuration |
| `platforms` | Yes | Streaming and purchase URLs |
| `releaseDate` | No | ISO date, used in Schema.org when present |
| `genres` | Yes | Schema.org genre values |

## SEO generated for every song

Each generated page includes:

- canonical URL
- Open Graph metadata
- Twitter/X Card metadata
- `MusicRecording` structured data
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

Set `measurementId` to an empty string to disable Google Analytics for a deployment.

## Project structure

```text
assets/covers/          Optimized WebP song covers
data/site.json          Shared artist, domain and Analytics settings
data/songs.json         All song content
public/                 Shared public files
templates/song.html     Reusable song-page template
src/styles.css          Shared styles
src/app.js              Shared Analytics event tracking
scripts/build.mjs       Page, robots and sitemap generator
scripts/clean.mjs       Removes generated output
dist/                   Generated static site; not committed
```
