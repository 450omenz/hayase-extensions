const base = 'https://nyaasi-api.vercel.app/api/search'

export default {
  async single(query, options) {
    const { titles, episode, absoluteEpisodeNumber, exclusions = [], resolution, fetch = globalThis.fetch } = query
    if (!titles?.length) return []
    return search({ titles, episode, absoluteEpisode: absoluteEpisodeNumber, exclusions, resolution, batch: false, fetch })
  },

  async batch(query, options) {
    const { titles, exclusions = [], fetch = globalThis.fetch } = query
    if (!titles?.length) return []
    return search({ titles, exclusions, batch: true, fetch })
  },

  async movie(query, options) {
    const { titles, resolution, exclusions = [], fetch = globalThis.fetch } = query
    if (!titles?.length) return []
    return search({ titles, exclusions, resolution, batch: false, fetch })
  },

  async test() {
    const res = await fetch(base + '?q=test&site=sukebei&category=1_0')
    if (!res.ok) throw new Error(`Sukebei API unavailable (HTTP ${res.status})`)
    return true
  }
}

async function search({ titles, episode, absoluteEpisode, exclusions, resolution, batch, fetch }) {
  const latin = titles.filter(t => /[a-zA-Z]/.test(t))
  const pool  = latin.length ? latin : titles
  const title = pool.reduce((a, b) => a.length <= b.length ? a : b)

  let q = title.replace(/[^\w\s-]/g, ' ').trim()
  if (!batch && episode != null) q += ' ' + String(episode).padStart(2, '0')
  if (batch) q += ' Batch'
  if (resolution) q += ' ' + resolution + 'p'

  const extraTitles = pool.filter(t => t !== title).slice(0, 2)
  const titlesParam = extraTitles.length ? extraTitles.join('|||') : ''

  const params = '?q=' + encodeURIComponent(q)
    + '&title=' + encodeURIComponent(title)
    + '&site=sukebei'
    + '&category=1_0'
    + '&batch=' + String(batch)
    + (episode != null         ? '&episode='         + String(episode)         : '')
    + (absoluteEpisode != null ? '&absoluteEpisode=' + String(absoluteEpisode) : '')
    + (resolution              ? '&resolution='      + resolution              : '')
    + (exclusions.length       ? '&exclusions='      + encodeURIComponent(exclusions.join(',')) : '')
    + (titlesParam             ? '&titles='          + encodeURIComponent(titlesParam)          : '')

  const res = await fetch(base + params)
  if (!res.ok) return []

  const data = await res.json()
  if (!Array.isArray(data)) return []

  return data.map(item => ({
    title:     item.title     || 'Unknown',
    link:      item.link      || item.magnet || '',
    hash:      item.hash      || '',
    seeders:   Number(item.seeders)   || 0,
    leechers:  Number(item.leechers)  || 0,
    downloads: Number(item.downloads) || 0,
    size:      Number(item.size)      || 0,
    date:      item.date ? new Date(item.date) : new Date(0),
    accuracy:  item.accuracy  || 'low',
  }))
}
