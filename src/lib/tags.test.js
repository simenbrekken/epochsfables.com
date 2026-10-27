import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browseTags, matchesTag, rankTags } from './tags.js'

test('ranks by distinct episodes, breaking ties by tag name', () => {
  const episodes = [
    { tags: ['Dub', 'Dub', 'Dub', 'Ambient'] },
    { tags: ['Ambient', 'Techno'] },
    { tags: ['Techno'] },
    { tags: [] },
  ]

  assert.deepEqual(rankTags(episodes), ['Ambient', 'Techno', 'Dub'])
})

test('related tags use only matching episodes and exclude the active tag', () => {
  const episodes = [
    { tags: ['Dub', 'Ambient', 'Techno'] },
    { tags: ['Dub', 'Techno'] },
    { tags: ['Ambient', 'Drone'] },
    { tags: ['Drone'] },
  ]

  assert.deepEqual(rankTags(episodes, 'Dub'), ['Techno', 'Ambient'])
  assert.deepEqual(rankTags(episodes, 'Ambient'), ['Drone', 'Dub', 'Techno'])
  assert.deepEqual(rankTags(episodes, 'Drone'), ['Ambient'])
  assert.deepEqual(rankTags(episodes, 'Unknown'), [])
})

test('grouped filters and related tags use the same episode set', () => {
  const episodes = [
    { tags: ['Drum & Bass', 'Ambient'] },
    { tags: ['Liquid Drum & Bass', 'Jazz', 'Jazz'] },
    { tags: ['Minimal D&B', 'Jazz'] },
    { tags: ['Jazz', 'House'] },
  ]

  assert.deepEqual(episodes.filter(({ tags }) => matchesTag(tags, 'Drum & Bass')), episodes.slice(0, 3))
  assert.deepEqual(rankTags(episodes, 'Drum & Bass'), [
    'Jazz', 'Ambient', 'Liquid Drum & Bass', 'Minimal D&B',
  ])
  assert.deepEqual(rankTags(episodes, 'Jazz'), ['House', 'Liquid Drum & Bass', 'Minimal D&B'])
  for (const [group, member] of [
    ['Reggae', 'Dub Reggae'],
    ['Hip Hop', 'Instrumental Hip Hop'],
    ['Techno', 'Dub techno'],
    ['Dub', 'Dub poetry'],
    ['House', 'House'],
  ]) {
    assert.equal(matchesTag([member], group), true)
  }
  assert.equal(matchesTag([], ''), true)
  assert.equal(matchesTag(['Dub'], 'House'), false)
  assert.equal(matchesTag(['Dub'], 'toString'), false)
})

test('returns all related tags, even when more than 25 co-occur', () => {
  const related = Array.from({ length: 30 }, (_, i) => `Genre ${String(i).padStart(2, '0')}`)
  const episodes = related.map((tag) => ({ tags: ['Dub', tag] }))

  assert.deepEqual(rankTags(episodes, 'Dub'), related)
  assert.deepEqual(rankTags([{ tags: ['Solo'] }], 'Solo'), [])
  assert.deepEqual(rankTags([]), [])
})

test('chooses 25 popular tags before alphabetizing; alphabetizes every related tag', () => {
  const tags = Array.from({ length: 30 }, (_, i) => `Tag ${String(i).padStart(2, '0')}`)
  const episodes = [
    { tags: ['Active', ...tags] },
    { tags: ['Tag 29'] },
    { tags: ['Tag 29'] },
  ]
  const popular = browseTags(episodes)
  assert.equal(popular.length, 25)
  assert.equal(popular.includes('Tag 29'), true)
  assert.equal(popular.includes('Tag 28'), false)
  assert.deepEqual(popular, [...popular].sort((a, b) => a.localeCompare(b, 'en')))
  assert.deepEqual(browseTags(episodes, 'Active'), tags)
})
