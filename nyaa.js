export default new class Nyaa {
  base = 'https://nyaasi-api.vercel.app/api/search?q='

  async single({ titles, episode }) {
    if (!titles?.length) return []
    return this.search(titles[0], episode)
  }

  batch = this.single
  movie = this.single

  async search(title, episode) {
    let query = title.replace(/[^\w\s-]/g, ' ').trim()

    if (episode) {
      query += ` ${episode.toString().padStart(2, '0')}`
    }

    // ❗ FIX: remove encodeURIComponent (already handled by API usage)
    const res = await fetch(this.base + query)

    const data = await res.json()

    if (!Array.isArray(data)) return []

    return data.map(item => ({
      title: item.title,
      link: item.link,
      hash: item.hash || '',
      seeders: Number(item.seeders || 0),
      leechers: Number(item.leechers || 0),
      downloads: Number(item.downloads || 0),
      size: item.size || 0,
      date: item.date ? new Date(item.date) : null,
      accuracy: item.accuracy || 'medium',
      type: item.type || 'alt'
    }))
  }

  async test() {
    const res = await fetch(this.base + 'one%20piece')
    return res.ok
  }
}()
