export default new class Nyaa {
  base = 'https://nyaasi-api.vercel.app/api/search'

  async single({ titles, episode }) {
    if (!titles?.length) return []
    return this.search(titles[0], episode)
  }

  batch = this.single
  movie = this.single

  async search(title, episode) {
    try {
      let query = title.replace(/[^\w\s-]/g, ' ').trim()

      if (episode !== undefined && episode !== null) {
        query += ` ${String(episode).padStart(2, '0')}`
      }

      const url = `${this.base}?q=${encodeURIComponent(query)}`
      const res = await fetch(url)
      if (!res.ok) return []

      const data = await res.json()

      // FIX: API returns { query, page, results: [...] }, not a bare array
      const results = Array.isArray(data) ? data : data?.results
      if (!Array.isArray(results)) return []

      return results.map(item => ({
        title: item.title || 'Unknown',
        link: item.magnet || item.link || '',  // FIX: Hayase needs a magnet URI, not a page URL
        hash: item.hash || '',
        seeders: Number(item.seeders) || 0,
        leechers: Number(item.leechers) || 0,
        downloads: Number(item.downloads) || 0,
        size: item.size || 0,
        date: item.date ? new Date(item.date) : new Date(0),
        accuracy: 'high',
        type: 'alt'
      }))
    } catch {
      return []
    }
  }

  async test() {
    try {
      const res = await fetch(`${this.base}?q=one%20piece`)
      if (!res.ok) return false
      const data = await res.json()
      // FIX: check the actual response shape
      return Array.isArray(data?.results)
    } catch {
      return false
    }
  }
}()
