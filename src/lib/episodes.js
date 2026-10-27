/** @param {string} name */
export function episodeLabel(name) {
  return name.match(/^Epoch['’]s\s+Fables\s+(?:Vol\.?\s*)?(\d+)\s*$/i)?.[1] ?? name.trim()
}

/**
 * @template {{ created_time: string }} T
 * @param {T[]} episodes
 */
export function newestFirst(episodes) {
  for (const episode of episodes) {
    if (!Number.isFinite(Date.parse(episode.created_time))) {
      throw new Error(`Invalid episode date: ${episode.created_time}`)
    }
  }
  return [...episodes].sort((a, b) => Date.parse(b.created_time) - Date.parse(a.created_time))
}

/** @param {Record<string, string>} pictures */
export function artwork(pictures) {
  return pictures['1024wx1024h'] ?? pictures['768wx768h'] ?? pictures['640wx640h']
    ?? pictures.extra_large ?? pictures.large ?? pictures['320wx320h']
}
