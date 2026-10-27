# Epoch's Fables

A fan archive of [kingstonpork](https://www.mixcloud.com/kingstonpork/)'s long-running mix series on Mixcloud — 500+ episodes of eclectic, genre-spanning sets from Hull's underground electronic music scene.

🌐 **[epochsfables.com](https://epochsfables.com)**

## Features

- Browse the full archive in a dark contact sheet, newest first, with the latest episode's artwork in the masthead
- Hover or focus a cover for its full title and clickable tags; on touch screens, tap to open its details
- Browse the 25 most common episode tags, selected by distinct mix count and displayed alphabetically
- Select a tag to explore all co-occurring tags alphabetically; selecting another tag replaces the filter, and **Reset to popular** returns to all mixes
- Broad genre filters retain their existing grouped matches (for example, Drum & Bass includes Liquid Drum & Bass and Minimal D&B); related tags come from those same matching mixes
- Live mix count updates as you filter
- Native Mixcloud playback, saved listening progress, and shareable episode/tag URLs
- Finite entrance and filter transitions respect reduced-motion preferences

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
npm test         # focused tag, title and chronology checks
npm run build    # build to dist/
npm run preview  # preview the build locally
```

The self-hosted Poppins fonts are distributed under the [SIL Open Font License](public/fonts/poppins-OFL.txt), with their original copyright notice included.
