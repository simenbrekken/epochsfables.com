const TAG_GROUPS = new Map([
  ['Drum & Bass', ['Drum & Bass', 'Liquid Drum & Bass', 'Minimal D&B']],
  ['Reggae', ['Reggae', 'Dub Reggae']],
  ['Hip Hop', ['Hip Hop', 'Instrumental Hip Hop']],
  ['Techno', ['Techno', 'Dub techno']],
  ['Dub', ['Dub', 'Dub techno', 'Dub poetry']],
  ['House', ['House']],
])

/**
 * @param {string[]} tags
 * @param {string} tag
 */
export function matchesTag(tags, tag) {
  return !tag || (TAG_GROUPS.get(tag) ?? [tag]).some((match) => tags.includes(match))
}

/**
 * @param {{ tags: string[] }[]} episodes
 * @param {string} [activeTag]
 */
export function rankTags(episodes, activeTag = '') {
  /** @type {Map<string, number>} */
  const counts = new Map()

  for (const { tags } of episodes) {
    if (!matchesTag(tags, activeTag)) continue
    for (const tag of new Set(tags)) {
      if (tag !== activeTag) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [...counts]
    .sort(([a, aCount], [b, bCount]) => bCount - aCount || (a < b ? -1 : a > b ? 1 : 0))
    .map(([tag]) => tag)
}

/**
 * @param {{ tags: string[] }[]} episodes
 * @param {string} [activeTag]
 */
export function browseTags(episodes, activeTag = '') {
  const ranked = rankTags(episodes, activeTag)
  return (activeTag ? ranked : ranked.slice(0, 25)).sort((a, b) => a.localeCompare(b, 'en'))
}
