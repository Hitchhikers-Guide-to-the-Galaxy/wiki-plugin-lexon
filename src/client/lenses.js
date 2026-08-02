// Emphasis lenses — runtime-switchable styling states. A lens is just a
// data-lens attribute on the item container; all appearance differences live
// in theme.css. Chips are transient UI; the EMPHASIS header persists a default.

export const LENSES = ['all', 'clauses', 'terms', 'none']

export const normalizeLens = word => {
  const w = (word || '').toLowerCase().replace(/s$/, '')
  if (w === 'clause') return 'clauses'
  if (w === 'term' || w === 'party' || w === 'partie') return 'terms'
  if (w === 'none' || w === 'plain') return 'none'
  return 'all'
}

export const lensChips = current =>
  `<span class="lx-lenses">${LENSES.map(
    l =>
      `<span class="lx-lens${l === current ? ' lx-active' : ''}" data-lens-choice="${l}">${l}</span>`,
  ).join('')}</span>`

export const bindLenses = div => {
  div.find('.lx-lens').on('click', function (e) {
    e.preventDefault()
    e.stopPropagation()
    const choice = this.getAttribute('data-lens-choice')
    div.find('.lexon-wrap').attr('data-lens', choice)
    div.find('.lx-lens').removeClass('lx-active')
    this.classList.add('lx-active')
  })
}
