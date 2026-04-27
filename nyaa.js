export default new class Nyaa {
  base = 'https://nyaasi-api.vercel.app/api/search'

  async test() {
    try {
      const res = await fetch(`${this.base}?q=test`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('Unexpected response format')
      return true
    } catch (err) {
      throw new Error(`Nyaa is unreachable: ${err.message}`)
    }
  }

  async single({ titles, episode, exclusions = [] }) {
    if (!titles?.length) return []
    const title = this.#bestTitle(titles)
    const ep    = String(episode ?? '').padStart(2, '0')
    const q     = `${title.replace(/[^\w\s-]/g, ' ').trim()} ${ep}`.trim()
    return this.#search({ q, title, episode, exclusions, batch: false })
  }

  async batch({ titles, exclusions = [] }) {
    if (!titles?.length) return []
    const title = this.#bestTitle(titles)
    const q     = `${title.replace(/[^\w\s-]/g, ' ').trim()} Batch`
    return this.#search({ q, title, exclusions, batch: true })
  }

  async movie({ titles, resolution, exclusions = [] }) {
    if (!titles?.length) return []
    const title = this.#bestTitle(titles)
    const q     = [title.replace(/[^\w\s-]/g, ' ').trim(), resolution ? `${resolution}p` : ''].filter(Boolean).join(' ')
    return this.#search({ q, title, exclusions, batch: false })
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  async #search({ q, title, episode, exclusions, batch }) {
    const params = new URLSearchParams({
      q,
      title,
      exclusions: exclusions.join(','),
      batch:      String(batch),
      ...(episode !== undefined && { episode: String(episode) }),
    })

    const res = await fetch(`${this.base}?${params}`)
    if (!res.ok) throw new Error(`Nyaa API error: HTTP ${res.status}. Try again later.`)

    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Nyaa API returned an unexpected response format.')

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
      type:      undefined,
    }))
  }

  #bestTitle(titles) {
    const latin = titles.filter(t => /[a-zA-Z]/.test(t))
    const pool  = latin.length ? latin : titles
    return pool.reduce((a, b) => a.length <= b.length ? a : b)
  }
}()
