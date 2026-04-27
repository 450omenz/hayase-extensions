export default new class Nyaa {
  const BASE = 'https://nyaasi-api.vercel.app/api/search'
  
  async function searchNyaa(query, fetch) {
    const res = await fetch(`${BASE}?q=${encodeURIComponent(query)}`)
  
    if (!res.ok) throw new Error(`Nyaa API error: HTTP ${res.status}. Try again later.`)
  
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Nyaa API returned an unexpected response format.')
  
    return data
  }
  
  function buildQuery({ titles, episode, resolution, exclusions }) {
    // Use the first title, strip special chars that break nyaa search
    const title = (titles?.[0] || '').replace(/[^\w\s-]/g, ' ').trim()
  
    let query = title
  
    if (episode !== undefined && episode !== null) {
      query += ` ${String(episode).padStart(2, '0')}`
    }
  
    if (resolution) {
      query += ` ${resolution}p`
    }
  
    return query
  }
  
  function mapResults(data, exclusions = []) {
    const lowerExclusions = exclusions.map(e => e.toLowerCase())
  
    return data
      .filter(item => {
        if (!item.title || !item.hash) return false
        const lower = item.title.toLowerCase()
        return !lowerExclusions.some(ex => lower.includes(ex))
      })
      .map(item => ({
        title: item.title,
        link: item.magnet || item.hash || item.link,
        hash: item.hash || '',
        seeders: Number(item.seeders) || 0,
        leechers: Number(item.leechers) || 0,
        downloads: Number(item.downloads) || 0,
        size: Number(item.size) || 0,
        date: item.date ? new Date(item.date) : new Date(0),
        accuracy: 'low', // nyaa string search — can return false positives
        type: undefined,  // never assume best/alt without manual verification
      }))
  }
  
  export default {
    async test(_, fetch) {
      try {
        const res = await fetch(`${BASE}?q=one+piece`)
        if (!res.ok) throw new Error(`Nyaa API returned HTTP ${res.status}`)
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error('Nyaa API returned unexpected data')
        return true
      } catch (err) {
        throw new Error(`Nyaa is unreachable: ${err.message}`)
      }
    },
  
    async single(query, options, fetch) {
      const { titles, episode, resolution, exclusions = [] } = query
      if (!titles?.length) return []
  
      const q = buildQuery({ titles, episode, resolution, exclusions })
      const data = await searchNyaa(q, fetch)
      return mapResults(data, exclusions)
    },
  
    async batch(query, options, fetch) {
      const { titles, exclusions = [] } = query
      if (!titles?.length) return []
  
      // Batch: search without episode number
      const title = (titles[0] || '').replace(/[^\w\s-]/g, ' ').trim()
      const data = await searchNyaa(title + ' Batch', fetch)
      return mapResults(data, exclusions)
    },
  
    async movie(query, options, fetch) {
      const { titles, resolution, exclusions = [] } = query
      if (!titles?.length) return []
  
      // Movies: no episode number
      const q = buildQuery({ titles, resolution, exclusions })
      const data = await searchNyaa(q, fetch)
      return mapResults(data, exclusions)
    },
  }
}()
