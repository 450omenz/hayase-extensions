export default new class TokyoTosho {
  base = 'https://nyaasi-api.vercel.app/api/search'

  async single(query) {
    const { titles, episode, absoluteEpisodeNumber, exclusions = [], resolution, fetch } = query
    if (!titles?.length) return []
    return this.search(titles, episode, absoluteEpisodeNumber, exclusions, false, resolution, fetch)
  }

  async batch(query) {
    const { titles, exclusions = [], fetch } = query
    if (!titles?.length) return []
    return this.search(titles, undefined, undefined, exclusions, true, undefined, fetch)
  }

  async movie(query) {
    const { titles, resolution, exclusions = [], fetch } = query
    if (!titles?.length) return []
    return this.search(titles, undefined, undefined, exclusions, false, resolution, fetch)
  }

  async search(titles, episode, absoluteEpisode, exclusions, batch, resolution, fetch) {
    const latin = titles.filter(t => /[a-zA-Z]/.test(t))
    const pool  = latin.length ? latin : titles
    const title = pool.reduce((a, b) => a.length <= b.length ? a : b)

    // Tokyo Tosho mirrors to nyaa — search nyaa filtering to their uploads
    // Their releases are typically tagged as non-English or raw categories
    let q = title.replace(/[^\w\s-]/g, ' ').trim()
    if (!batch && episode != null) q += ' ' + String(episode).padStart(2, '0')
    if (batch) q += ' Batch'
    if (resolution) q += ' ' + resolution + 'p'

    const params = '?q=' + encodeURIComponent(q)
      + '&title=' + encodeURIComponent(title)
      + '&site=nyaa'
      + '&category=1_0'
      + '&batch=' + String(batch)
      + (episode != null         ? '&episode='         + String(episode)         : '')
      + (absoluteEpisode != null ? '&absoluteEpisode=' + String(absoluteEpisode) : '')
      + (resolution              ? '&resolution='      + resolution              : '')
      + (exclusions.length       ? '&exclusions='      + encodeURIComponent(exclusions.join(',')) : '')

    const res = await fetch(this.base + params)
    if (!res.ok) return []

    const data = await res.json()
    if (!Array.isArray(data)) return []

    return data.map(item => ({
      title:     item.title     || 'Unknown',
      link:      item.magnet    || item.hash || item.link || '',
      hash:      item.hash      || '',
      seeders:   Number(item.seeders)   || 0,
      leechers:  Number(item.leechers)  || 0,
      downloads: Number(item.downloads) || 0,
      size:      Number(item.size)      || 0,
      date:      item.date ? new Date(item.date) : new Date(0),
      accuracy:  item.accuracy || 'low',
    }))
  }

  async test(options, fetch) {
    try {
      const res = await fetch(this.base + '?q=test&site=nyaa&category=1_0')
      return res.ok
    } catch {
      return false
    }
  }
}()
