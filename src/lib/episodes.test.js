import assert from 'node:assert/strict'
import { test } from 'node:test'
import { artwork, episodeLabel, newestFirst } from './episodes.js'

test('only canonical episode titles become numbers; other titles remain complete', () => {
  assert.equal(episodeLabel("Epoch's Fables Vol.514"), '514')
  assert.equal(episodeLabel('Epoch’s Fables Vol 2'), '2')
  assert.equal(episodeLabel('Disco Vol.2'), 'Disco Vol.2')
  assert.equal(episodeLabel("Fila Brazillia Remixes (Pork's Picks Vol.2)"), "Fila Brazillia Remixes (Pork's Picks Vol.2)")
  assert.equal(episodeLabel("Epoch's Fables Vol.500 — Special"), "Epoch's Fables Vol.500 — Special")
})

test('latest artwork follows full archive chronology, not episode numbers or source order', () => {
  const episodes = [
    { name: "Epoch's Fables Vol.999", created_time: '2020-01-01', pictures: { large: 'older.jpg' } },
    { name: 'Unnumbered special', created_time: '2026-01-01', pictures: { '1024wx1024h': 'latest.jpg' } },
    { name: "Epoch's Fables Vol.514", created_time: '2025-01-01', pictures: { large: 'previous.jpg' } },
  ]
  const sorted = newestFirst(episodes)
  assert.equal(artwork(sorted[0].pictures), 'latest.jpg')
  assert.equal(episodes[0].name, "Epoch's Fables Vol.999")
  assert.deepEqual(newestFirst([]), [])
  assert.throws(() => newestFirst([{ created_time: 'invalid' }]), /Invalid episode date/)
})
