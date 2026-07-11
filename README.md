# Sasha Persholja Music Catalogue

A lightweight, zero-dependency static website generator for Sasha Persholja song pages. It scales beyond 50 releases while keeping one shared template and one JSON catalogue.

This repository is completely separate from `sasapersolja/big-black-puppet-independent` and is not connected to the current live website.

## Requirements

- Node.js 20 recommended; Node.js 18 or newer supported
- No npm dependencies are required for the site build

## Build

```bash
npm run build
```

The complete static website is generated in `dist/`:

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

## Automatic Cloudflare Pages deployment

The workflow is:

```text
.github/workflows/deploy-pages.yml
```

It runs automatically on every push to `main` and can also be started manually. It:

1. checks out the repository,
2. uses Node.js 20,
3. runs `npm run build`,
4. checks whether the separate Cloudflare Pages project exists,
5. creates `sasha-persholja-music-catalogue` when missing,
6. deploys `dist` to the `main` production branch with Wrangler.

The workflow deploys only to the separate Cloudflare Pages project. It does not add or connect a custom domain.

### Required Cloudflare API token permission

Create a custom Cloudflare API token with exactly this account permission:

```text
Account → Cloudflare Pages → Edit
```

Restrict the token to the Cloudflare account that will own the catalogue project. Do not reuse the old Big Black Puppet token.

The workflow reads credentials only from these GitHub repository secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Nothing sensitive is stored in repository files.

## Add the two GitHub secrets on a Samsung Galaxy or other mobile phone

Use a browser such as Chrome on the phone. The GitHub mobile app may not expose all repository Settings pages, so use the GitHub website.

### Secret 1: CLOUDFLARE_API_TOKEN

1. Open Chrome.
2. Sign in to GitHub.
3. Open:
   `https://github.com/sasapersolja/sasha-persholja-music-catalogue`
4. Tap the browser menu with three dots.
5. Enable **Desktop site** if the repository **Settings** tab is not visible.
6. Tap **Settings** in the repository navigation.
7. In the left menu, open **Secrets and variables**.
8. Tap **Actions**.
9. Tap **New repository secret**.
10. In **Name**, enter exactly:

```text
CLOUDFLARE_API_TOKEN
```

11. In **Secret**, paste the new Cloudflare API token.
12. Tap **Add secret**.

### Secret 2: CLOUDFLARE_ACCOUNT_ID

1. Stay on **Settings → Secrets and variables → Actions**.
2. Tap **New repository secret** again.
3. In **Name**, enter exactly:

```text
CLOUDFLARE_ACCOUNT_ID
```

4. In **Secret**, paste the Cloudflare account ID.
5. Tap **Add secret**.

The account ID is visible in the Cloudflare dashboard account overview. It is not the zone ID and not an API token.

After saving, GitHub shows the secret names but never reveals their values again. If a value is wrong, replace that secret with the correct value.

## Manually run the deployment workflow

1. Open the repository on GitHub:
   `https://github.com/sasapersolja/sasha-persholja-music-catalogue`
2. Tap **Actions**.
3. Select **Deploy to Cloudflare Pages**.
4. Tap **Run workflow**.
5. Confirm the branch is `main`.
6. Tap the green **Run workflow** button.
7. Open the new workflow run to follow the build and deployment logs.

The workflow can also run automatically when a commit is pushed to `main`.

## Cloudflare project details

```text
Project name: sasha-persholja-music-catalogue
Production branch: main
Build command: npm run build
Output directory: dist
Expected Pages address: https://sasha-persholja-music-catalogue.pages.dev
```

The deployment command is:

```bash
npx --yes wrangler@4 pages deploy dist \
  --project-name=sasha-persholja-music-catalogue \
  --branch=main
```

Do not add `sashapersholja.com` as a custom domain.

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

## SEO

The generated homepage includes Google Analytics, canonical, robots meta, Open Graph, Twitter/X Card, favicon, manifest, and Schema.org `WebSite` and `Person` data.

Every song page includes canonical metadata, Open Graph, Twitter/X Cards, Schema.org `MusicRecording`, artist identity, cover preload, robots metadata and an automatic sitemap entry.

## Google Analytics

The Measurement ID is configured in `data/site.json`. Platform clicks send:

```text
event_name: select_platform
platform: bandcamp | appleMusic | amazonMusic | spotify | youtubeMusic
song_slug: the song slug
```

Tracking uses `transport_type: beacon`, an `event_callback` and a short fallback timeout. Links opening in a new tab are never delayed or blocked by Analytics.

## Continuous integration

The verification workflow runs `npm run build` and checks the generated homepage, demo song page, required assets, sitemap XML validity, HTTPS production URLs and the absence of `catalogue.example.com` in `dist`.

## Project structure

```text
assets/covers/                    Optimized WebP song covers
data/site.json                    Shared artist, domain and Analytics settings
data/songs.json                   All song content
public/                           Files copied directly into dist
templates/song.html               Reusable song-page template
src/styles.css                    Shared styles
src/app.js                        Shared Analytics event tracking
scripts/build.mjs                 Validating static site generator
scripts/clean.mjs                 Removes generated output
.github/workflows/build.yml       Build verification
.github/workflows/deploy-pages.yml Automatic Cloudflare Pages deployment
wrangler.toml                     Cloudflare Pages output configuration
dist/                             Generated static site; not committed
```
