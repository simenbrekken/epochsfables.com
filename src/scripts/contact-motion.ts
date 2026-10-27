export function contactMotion(cards: HTMLElement[]) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const active = new Set<Animation>()
  const departures = new Set<HTMLElement>()
  const seen = new WeakSet<HTMLElement>()
  const entrance = 'cubic-bezier(.16, 1, .3, 1)'
  const resolve = 'cubic-bezier(.33, 1, .68, 1)'
  const enabled = () => !reduced.matches && typeof Element.prototype.animate === 'function'

  function run(element: Element, frames: Keyframe[], timing: KeyframeAnimationOptions) {
    if (!enabled()) return
    const animation = element.animate(frames, { fill: 'both', ...timing })
    active.add(animation)
    const release = () => { active.delete(animation); animation.cancel() }
    animation.finished.then(release, release)
    return animation
  }

  function settle() {
    observer?.disconnect()
    for (const animation of active) animation.cancel()
    active.clear()
    for (const image of departures) image.remove()
    departures.clear()
  }

  function enter(card: HTMLElement, delay: number, initial: boolean) {
    if (seen.has(card) || !enabled()) return
    seen.add(card)
    run(card, [{ opacity: 0 }, { opacity: 1 }], { duration: initial ? 600 : 450, delay, easing: resolve })
    run(card, [{ transform: `translateY(${initial ? 24 : 16}px)` }, { transform: 'translateY(0)' }], { duration: initial ? 900 : 650, delay, easing: entrance })
    run(card.querySelector('.photo-resolve')!, [{ filter: 'blur(8px) saturate(.72)' }, { filter: 'blur(0px) saturate(1)' }], { duration: initial ? 800 : 600, delay, easing: resolve })
  }

  const observer = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry, index) => {
      observer.unobserve(entry.target)
      enter(entry.target as HTMLElement, Math.min(index, 3) * 55, true)
    })
  }, { rootMargin: '0px 0px 80px 0px', threshold: .01 })

  function watch(card: HTMLElement, delay: number, initial: boolean) {
    if (!enabled()) return
    const box = card.getBoundingClientRect()
    if (box.top < innerHeight + 80 && box.bottom > 0) enter(card, delay, initial)
    else observer.observe(card)
  }

  for (const event of ['focusin', 'pointerdown', 'pointerover']) {
    document.addEventListener(event, (event) => {
      if (event.target instanceof Element && event.target.closest('.episode')) settle()
    })
  }
  reduced.addEventListener('change', () => { if (reduced.matches) settle() })
  window.addEventListener('resize', settle)
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle() })

  return {
    intro() {
      if (!enabled()) return
      run(document.querySelector('.contact-name')!, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: resolve })
      for (const [index, selector] of ['.tag-navigation', '.results-bar'].entries()) {
        run(document.querySelector(selector)!, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 800, delay: 180 + index * 60, easing: entrance })
      }
      cards.filter((card) => !card.hidden).forEach((card, index) => watch(card, 180 + Math.min(index, 6) * 55, true))
    },
    capture() {
      settle()
      return new Map(cards.filter((card) => !card.hidden).map((card) => [card, card.getBoundingClientRect()]))
    },
    transition(previous: Map<HTMLElement, DOMRect>) {
      if (!enabled()) return
      for (const [card, box] of previous) {
        if (!card.hidden || box.bottom <= 0 || box.top >= innerHeight) continue
        const image = card.querySelector('img')!.cloneNode() as HTMLImageElement
        image.className = 'contact-departure'
        image.alt = ''
        image.inert = true
        image.setAttribute('aria-hidden', 'true')
        Object.assign(image.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` })
        document.body.append(image)
        departures.add(image)
        const animation = run(image, [{ opacity: .8, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 200, easing: resolve })
        const remove = () => { image.remove(); departures.delete(image) }
        animation?.finished.then(remove, remove)
      }
      cards.filter((card) => !card.hidden).forEach((card, index) => {
        const old = previous.get(card)
        if (!old) {
          seen.delete(card)
          return watch(card, 80 + Math.min(index, 4) * 35, false)
        }
        const box = card.getBoundingClientRect()
        if (box.bottom < 0 || box.top > innerHeight) return
        const x = old.left - box.left
        const y = old.top - box.top
        if (Math.abs(x) > .5 || Math.abs(y) > .5) run(card, [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }], { duration: 650, easing: entrance })
      })
      for (const selector of ['.tag-scroll', '.result-count']) {
        run(document.querySelector(selector)!, [{ opacity: .35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 400, easing: resolve })
      }
    },
  }
}
