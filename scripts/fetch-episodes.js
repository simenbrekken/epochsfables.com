#!/usr/bin/env node
/**
 * Fetches all kingstonpork cloudcasts from the Mixcloud API and writes
 * them to data/episodes.json. Safe to re-run — existing episodes are
 * preserved and only new ones are prepended.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, '..', 'data', 'episodes.json')
const BASE_URL = 'https://api.mixcloud.com/kingstonpork/cloudcasts/'
const PAGE_SIZE = 100

/**
 * Maps raw tag variants to a canonical form.
 * Keys are lowercase for case-insensitive matching.
 */
const TAG_ALIASES = {
  // Drum & Bass
  'drum and bass': 'Drum & Bass',
  "drum'n'bass": 'Drum & Bass',
  'd&b': 'Drum & Bass',
  'minimal d&b': 'Minimal D&B',
  'liquid drum and bass': 'Liquid Drum & Bass',
  'atmospheric drum and bass': 'Drum & Bass',
  'techstep': 'Drum & Bass',

  // Techno (consolidate Minimal, Minimal Techno, typos)
  'minimal': 'Techno',
  'minimal techno': 'Techno',
  'mininmal': 'Techno',
  'tech': 'Techno',
  'ambient techno': 'Techno',

  // Electronic
  'electronica': 'Electronic',

  // House
  'deep house': 'House',
  'tech house': 'House',
  'slow house': 'House',

  // Downtempo
  'downtemp': 'Downtempo',
  'downtmpo': 'Downtempo',
  'midtempo': 'Downtempo',

  // Soundtrack(s)
  'soundtracks': 'Soundtrack',
  'soundtrtack': 'Soundtrack',

  // Balearic
  'balaeric': 'Balearic',
  'balic': 'Baltic',

  // Lo-fi / Slo-fi
  'slow-fi': 'Lo-fi',
  'slo fi': 'Lo-fi',
  'chill': 'Lo-fi',

  // Slowcore
  'slow-core': 'Slowcore',
  'slow-wave': 'Slo:Wave',

  // Hip Hop
  'instumental hip hop': 'Instrumental Hip Hop',
  'intrumental hip hop': 'Instrumental Hip Hop',
  'inst. hip hip': 'Instrumental Hip Hop',
  'instrumental hip hop': 'Instrumental Hip Hop',
  'underground hip hop': 'Hip Hop',
  'beats (hip hop)': 'Hip Hop',
  'rap': 'Hip Hop',

  // Psychedelic
  'psych': 'Psychedelic',
  'psychedelic rock': 'Psychedelic',

  // Disco
  'cosmic disco': 'Disco',
  'space disco': 'Disco',

  // Dubstep
  'wobble': 'Dubstep',
  'drumstep': 'Dubstep',
  'freqstep': 'Dubstep',

  // Jungle
  'jump up': 'Jungle',

  // Reggae
  'raggamuffin': 'Reggae',
  'dub roots reggae': 'Dub Reggae',

  // Dub
  'dubwise': 'Dub',
  'tech dub': 'Dub techno',
  'vapordub': 'Dub',

  // Ambient
  'beatless': 'Ambient',
  'experimental ambient': 'Ambient',
  'ambient sleep drone atmospheric electronic': 'Ambient',

  // Vocals
  'vocal': 'Vocals',

  // Breakbeat
  'breaks': 'Breakbeat',
  'electro breaks': 'Breakbeat',

  // Glitch
  'fattyglitch': 'Glitch',

  // Classical
  'neo-classical': 'Modern Classical',

  // Funk
  '20funkcentury1st': 'Funk',
  '20funkcenturyfirst': 'Funk',

  // Phonk
  '20phonkcentury1st': 'Phonk',

  // Afro
  'afrobeats': 'Afro',
  'afro-latin': 'Afro',

  // Soundscape
  'scenic sounds': 'Soundscape',

  // Footwork
  'footwork/juke': 'Footwork',
  'footwork / juke': 'Footwork',

  // Vaporwave
  'vapourware': 'Vaporwave',

  // Left Handed Japanese Trap
  'lefthandedjapanesefirst': 'Left Handed Japanese Trap',
  'lefthandedjapanesestep': 'Left Handed Japanese Trap',
  'lefthanded japanese trap': 'Left Handed Japanese Trap',
  'lefthandedjapanesetrap': 'Left Handed Japanese Trap',
}

function normaliseTag(raw) {
  const lower = raw.toLowerCase().trim()
  return TAG_ALIASES[lower] ?? raw.trim()
}

function loadExisting() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return []
  }
}

function normaliseEpisode(raw) {
  const rawTags = (raw.tags ?? []).map((t) => t.name)
  const tags = [...new Set(rawTags.map(normaliseTag))]

  return {
    key: raw.key,
    slug: raw.slug,
    name: raw.name,
    url: raw.url,
    description: raw.description ?? '',
    tags,
    pictures: raw.pictures ?? {},
    audio_length: raw.audio_length ?? 0,
    created_time: raw.created_time,
    play_count: raw.play_count ?? 0,
    favorite_count: raw.favorite_count ?? 0,
    listener_count: raw.listener_count ?? 0,
    repost_count: raw.repost_count ?? 0,
  }
}

async function fetchPage(url) {
  const res = await fetch(url)

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)

  return res.json()
}

async function fetchAll() {
  const existing = loadExisting()
  const existingSlugs = new Set(existing.map((e) => e.slug))

  const allFetched = []
  let nextUrl = `${BASE_URL}?limit=${PAGE_SIZE}`
  let page = 1

  while (nextUrl) {
    process.stdout.write(`  Page ${page}… `)
    const data = await fetchPage(nextUrl)
    const items = data.data ?? []

    process.stdout.write(`${items.length} episodes\n`)
    allFetched.push(...items.map(normaliseEpisode))

    nextUrl = data.paging?.next ?? null
    page++

    if (nextUrl) await new Promise((r) => setTimeout(r, 300))
  }

  const newEpisodes = allFetched.filter((e) => !existingSlugs.has(e.slug))

  // Re-normalise tags on existing episodes too (picks up alias changes)
  const normalisedExisting = existing.map((ep) => ({
    ...ep,
    tags: [...new Set(ep.tags.map(normaliseTag))],
  }))

  const merged = [
    ...newEpisodes,
    ...normalisedExisting,
  ].sort((a, b) => new Date(b.created_time) - new Date(a.created_time))

  mkdirSync(dirname(DATA_FILE), { recursive: true })
  writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2))

  return { total: merged.length, added: newEpisodes.length }
}

console.log('Fetching kingstonpork cloudcasts from Mixcloud API…\n')

fetchAll()
  .then(({ total, added }) => {
    console.log(`\nDone. ${added} new episode(s) added. ${total} total in data/episodes.json`)
  })
  .catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
