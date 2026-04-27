export default new class Nyaa {
  base = 'https://nyaasi-api.vercel.app/api/search'

  async single({ titles, episode, exclusions = [] }) {
    if (!titles?.length) return []
    return this.search(titles, episode, exclusions, false)
  }

  async batch({ titles, exclusions = [] }) {
    if (!titles?.length) return []
    return this.search(titles, undefined, exclusions, true)
  }

  async movie({ titles, resolution, exclusions = [] }) {
    if (!titles?.length) return []
    return this.search(titles, undefined, exclusions, false, resolution)
  }

  async search(titles, episode, exclusions, batch, resolution) {
    const latin = titles.filter(t => /[a-zA-Z]/.test(t))
    const pool  = latin.length ? latin : titles
    const title = pool.reduce((a, b) => a.length <= b.length ? a : b)

    let q = title.replace(/[^\w\s-]/g, ' ').trim()
    if (!batch && episode != null) q += ' ' + String(episode).padStart(2, '0')
    if (batch) q += ' Batch'
    if (resolution) q += ' ' + resolution + 'p'

    const params = '?q=' + encodeURIComponent(q)
      + '&title=' + encodeURIComponent(title)
      + '&batch=' + String(batch)
      + (episode != null ? '&episode=' + String(episode) : '')
      + (exclusions.length ? '&exclusions=' + encodeURIComponent(exclusions.join(',')) : '')

    const res = await fetch(this.base + params)
    if (!res.ok) return []

    const data = await res.json()
    if (!Array.isArray(data)) return []

    return data.map(item => ({
      title:     item.title     || 'Unknown',
      link:      item.magnet    || item.hash  || item.link || '',
      hash:      item.hash      || '',
      seeders:   Number(item.seeders)   || 0,
      leechers:  Number(item.leechers)  || 0,
      downloads: Number(item.downloads) || 0,
      size:      Number(item.size)      || 0,
      date:      item.date ? new Date(item.date) : new Date(0),
      accuracy:  item.accuracy  || 'low',
      type:      undefined,
    }))
  }

  async test() {
    try {
      const res = await fetch(this.base + '?q=test')
      return res.ok
    } catch {
      return false
    }
  }
}()
