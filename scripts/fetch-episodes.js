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

function loadExisting() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return []
  }
}

function normaliseEpisode(raw) {
  return {
    key: raw.key,
    slug: raw.slug,
    name: raw.name,
    url: raw.url,
    description: raw.description ?? '',
    tags: (raw.tags ?? []).map((t) => t.name),
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

  const merged = [
    ...newEpisodes,
    ...existing,
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
