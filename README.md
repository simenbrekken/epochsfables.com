# Epoch's Fables

A fan archive of [kingstonpork](https://www.mixcloud.com/kingstonpork/)'s long-running mix series on Mixcloud — 500+ episodes of eclectic, genre-spanning sets from Hull's underground electronic music scene.

🌐 **[epochsfables.com](https://epochsfables.com)**

## Features

- Browse all episodes with cover art, date, and tags
- Filter by genre tag (Drum & Bass, Downtempo, Dub, and more)
- Live mix count updates as you filter
- Dark/light mode

## Tech stack

- [Astro](https://astro.build) — static site generation
- [GitHub Pages](https://pages.github.com) — hosting
- [Mixcloud API](https://www.mixcloud.com/developers/) — episode data
- GitHub Actions — daily sync cron + deploy

## Data

All episode data lives in `data/episodes.json`, fetched from the Mixcloud API and committed to the repo. A GitHub Actions workflow runs daily at 06:00 UTC to pull new episodes and trigger a rebuild if anything changed.

To manually refresh:

```bash
npm run fetch
```

## Development

```bash
npm install
npm run dev      # start dev server at localhost:4321
npm run build    # build to dist/
npm run preview  # preview the build locally
```

