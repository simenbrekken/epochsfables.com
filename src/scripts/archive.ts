import { browseTags, matchesTag } from '../lib/tags.js'
import { contactMotion } from './contact-motion'

const cards = [...document.querySelectorAll<HTMLLIElement>('.episode')]
const episodes = cards.map((card) => ({ tags: JSON.parse(card.dataset.tags!) as string[] }))
const navigation = document.querySelector<HTMLElement>('.tag-navigation')!
const tagList = document.querySelector<HTMLUListElement>('.tag-list')!
const tagLinks = new Map([...tagList.querySelectorAll<HTMLAnchorElement>('[data-tag]')].map((link) => [link.dataset.tag!, link]))
const tagScroll = document.querySelector<HTMLElement>('.tag-scroll')!
const heading = document.querySelector<HTMLHeadingElement>('#results-heading')!
const count = document.querySelector<HTMLElement>('.result-count')!
const empty = document.querySelector<HTMLElement>('.empty-results')!
const motion = contactMotion(cards)

function closeDetails() {
  document.querySelectorAll<HTMLElement>('.cover-tile[data-open]').forEach((tile) => {
    tile.removeAttribute('data-open')
    tile.querySelector('.touch-cover')!.setAttribute('aria-expanded', 'false')
  })
}

function tagURL(tag: string) {
  const url = new URL(location.href)
  if (tag) url.searchParams.set('tag', tag)
  else url.searchParams.delete('tag')
  return url
}

function updateLinks() {
  document.querySelectorAll<HTMLAnchorElement>('a[data-tag]').forEach((link) => {
    link.href = tagURL(link.dataset.tag!).href
  })
}

function applyTag(tag: string) {
  if (tag && !tagLinks.has(tag)) tag = ''
  closeDetails()
  const visibleTags = browseTags(episodes, tag)
  for (const link of tagLinks.values()) link.parentElement!.hidden = true
  for (const name of visibleTags) {
    const link = tagLinks.get(name)!
    link.parentElement!.hidden = false
    tagList.append(link.parentElement!)
  }
  document.body.classList.toggle('selected', Boolean(tag))
  navigation.querySelector('#tag-heading')!.textContent = tag ? 'Related tags' : 'Popular tags'
  navigation.querySelector<HTMLElement>('.tag-reset')!.hidden = !tag
  tagScroll.setAttribute('aria-label', tag ? `All tags related to ${tag} in alphabetical order` : 'The 25 most used tags in alphabetical order')
  tagScroll.scrollTop = 0
  let visible = 0
  cards.forEach((card, index) => {
    card.hidden = !matchesTag(episodes[index].tags, tag)
    if (!card.hidden) visible++
  })
  heading.textContent = tag || 'All mixes'
  count.textContent = tag ? `${visible} / ${cards.length}` : `${visible} mixes`
  empty.hidden = visible > 0
  updateLinks()
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return
  const link = event.target.closest<HTMLAnchorElement>('a[data-tag]')
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  const tag = link.dataset.tag!
  scrollTo({ top: 0, behavior: 'instant' })
  const previous = motion.capture()
  history.replaceState(null, '', tagURL(tag))
  applyTag(tag)
  heading.focus({ preventScroll: true })
  motion.transition(previous)
})

applyTag(new URLSearchParams(location.search).get('tag') ?? '')
motion.intro()

window.addEventListener('popstate', () => {
  const previous = motion.capture()
  applyTag(new URLSearchParams(location.search).get('tag') ?? '')
  motion.transition(previous)
})

for (const card of cards) {
  const tile = card.querySelector<HTMLElement>('.cover-tile')!
  const touch = card.querySelector<HTMLButtonElement>('.touch-cover')!
  touch.addEventListener('click', () => {
    closeDetails()
    tile.setAttribute('data-open', '')
    touch.setAttribute('aria-expanded', 'true')
    tile.querySelector<HTMLAnchorElement>('.cover-title')!.focus({ preventScroll: true })
  })
  card.querySelector('.close-details')!.addEventListener('click', () => {
    closeDetails()
    heading.focus({ preventScroll: true })
  })
}
document.addEventListener('click', (event) => {
  if (event.target instanceof Element && !event.target.closest('.cover-tile')) closeDetails()
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.querySelector('.cover-tile[data-open]')) {
    closeDetails()
    heading.focus({ preventScroll: true })
  }
})

// Sample only the label's patch, never the hover overlay or the full photograph.
function sampleLabel(image: HTMLImageElement) {
  if (!image.naturalWidth || !image.crossOrigin || image.closest<HTMLElement>('.episode')!.hidden) return
  const label = image.closest('.cover-tile')!.querySelector<HTMLElement>('.cover-label')!
  const art = image.getBoundingClientRect()
  if (!art.width) return
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    console.warn('Artwork sampling unavailable; using adaptive image inversion.')
    return
  }
  try {
    const origin = label.offsetParent!.getBoundingClientRect()
    const x = Math.max(0, (origin.left + label.offsetLeft - art.left) / art.width * image.naturalWidth)
    const y = Math.max(0, (origin.top + label.offsetTop - art.top) / art.height * image.naturalHeight)
    const width = Math.min(image.naturalWidth - x, label.offsetWidth / art.width * image.naturalWidth)
    const height = Math.min(image.naturalHeight - y, label.offsetHeight / art.height * image.naturalHeight)
    context.drawImage(image, x, y, width, height, 0, 0, 32, 32)
    const pixels = context.getImageData(0, 0, 32, 32).data
    const linear = (value: number) => (value /= 255) <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
    let luminance = 0
    for (let i = 0; i < pixels.length; i += 4) {
      luminance += .2126 * linear(pixels[i]) + .7152 * linear(pixels[i + 1]) + .0722 * linear(pixels[i + 2])
    }
    luminance /= pixels.length / 4
    const dark = .2126 * linear(32) + .7152 * linear(29) + .0722 * linear(25)
    label.style.color = 1.05 / (luminance + .05) >= (luminance + .05) / (dark + .05) ? '#ffffff' : '#201d19'
    label.style.mixBlendMode = 'normal'
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'SecurityError') throw error
    console.warn('Artwork sampling unavailable; using adaptive image inversion.', image.src)
  }
}

const images = [...document.querySelectorAll<HTMLImageElement>('.cover-image')]
for (const image of images) {
  image.addEventListener('load', () => sampleLabel(image))
  const failed = () => {
    // Retry without CORS if the artwork host no longer permits pixel sampling.
    if (image.crossOrigin) {
      console.warn('Retrying artwork without pixel sampling.', image.src)
      image.removeAttribute('crossorigin')
      image.src = image.src
    } else console.error('Episode artwork failed to load.', image.src)
  }
  image.addEventListener('error', failed)
  if (image.complete) {
    if (image.naturalWidth) sampleLabel(image)
    else failed()
  }
}
document.fonts.ready.then(() => images.forEach(sampleLabel))
const resize = new ResizeObserver(() => images.forEach(sampleLabel))
resize.observe(document.querySelector('.episode-grid')!)

interface MixcloudWidget {
  ready: Promise<void>
  events: { progress: { on(callback: (position: number, duration: number) => void): void } }
  seek(position: number): void
  load(key: string, autoplay: boolean): void
  togglePlay(): void
  getPosition(): Promise<number>
}
declare global {
  interface Window { Mixcloud?: { PlayerWidget(iframe: HTMLIFrameElement): MixcloudWidget } }
}

const player = document.getElementById('player')!
const iframe = document.getElementById('player-iframe') as HTMLIFrameElement
const closeBtn = document.getElementById('player-close')!
const playerError = document.getElementById('player-error')!
const playerExternal = document.getElementById('player-external') as HTMLAnchorElement
const STORAGE_KEY = 'ef:progress'
let widget: MixcloudWidget | null = null
let currentKey = ''
let pendingSeek = 0
let currentCard: HTMLLIElement | undefined
const originalTitle = document.title

function playbackError(error: unknown) {
  console.error('Mixcloud playback failed:', error)
  playerError.hidden = false
}

function loadProgress(): Record<string, number> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid playback progress')
    return Object.fromEntries(Object.entries(value).filter(([, position]) => typeof position === 'number' && Number.isFinite(position) && position >= 0))
  } catch (error) {
    console.warn('Playback progress could not be restored:', error)
    return {}
  }
}

function saveProgress(progress: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.warn('Playback progress could not be saved:', error)
  }
}

function initWidget() {
  if (!window.Mixcloud) return playbackError(new Error('Mixcloud widget API is unavailable'))
  const instance = window.Mixcloud.PlayerWidget(iframe)
  widget = instance
  instance.ready.then(() => {
    if (widget !== instance) return
    instance.events.progress.on((position, duration) => {
      if (widget !== instance || duration === 0) return
      if (pendingSeek > 0) {
        instance.seek(pendingSeek)
        pendingSeek = 0
        return
      }
      if (currentKey && position > 0) {
        const all = loadProgress()
        if (duration - position > 30) all[currentKey] = position
        else delete all[currentKey]
        saveProgress(all)
      }
    })
  }).catch(playbackError)
}

function setEpisodeParam(slug: string | null) {
  const url = new URL(location.href)
  if (slug) url.searchParams.set('episode', slug)
  else url.searchParams.delete('episode')
  history.replaceState(null, '', url)
  updateLinks()
}

function play(card: HTMLLIElement) {
  const key = card.dataset.key!
  const previousKey = currentKey
  currentCard = card
  pendingSeek = loadProgress()[key] ?? 0
  currentKey = key
  cards.forEach((item) => item.classList.toggle('playing', item === card))
  playerError.hidden = true
  playerExternal.href = card.querySelector<HTMLAnchorElement>('[data-play]')!.href

  if (widget) {
    if (previousKey !== key) widget.load(key, true)
  } else {
    iframe.onload = initWidget
    iframe.src = `https://player-widget.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(key)}&hide_cover=1&light=1&autoplay=1`
  }
  player.hidden = false
  document.body.classList.add('player-open')
  setEpisodeParam(card.dataset.slug!)
  document.title = `${card.dataset.name} · ${originalTitle}`
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return
  const link = event.target.closest<HTMLAnchorElement>('a[data-play]')
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  play(link.closest<HTMLLIElement>('.episode')!)
})
iframe.addEventListener('error', playbackError)

closeBtn.addEventListener('click', () => {
  player.hidden = true
  iframe.onload = null
  iframe.removeAttribute('src')
  widget = null
  currentKey = ''
  pendingSeek = 0
  document.body.classList.remove('player-open')
  cards.forEach((card) => card.classList.remove('playing'))
  setEpisodeParam(null)
  document.title = originalTitle
  if (currentCard && !currentCard.hidden) currentCard.querySelector<HTMLAnchorElement>('.cover-listen')!.focus({ preventScroll: true })
  else heading.focus({ preventScroll: true })
})

const initialEpisode = new URLSearchParams(location.search).get('episode')
const initialCard = cards.find((card) => card.dataset.slug === initialEpisode)
if (initialCard) play(initialCard)

document.addEventListener('keydown', (event) => {
  if (!widget || player.hidden) return
  if (event.target instanceof Element && event.target.matches('input, textarea, button, a, [contenteditable]')) return
  if (event.code === 'Space') {
    event.preventDefault()
    widget.togglePlay()
  } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
    event.preventDefault()
    widget.getPosition().then((position) => widget?.seek(Math.max(0, position + (event.code === 'ArrowRight' ? 30 : -30)))).catch(playbackError)
  }
})
