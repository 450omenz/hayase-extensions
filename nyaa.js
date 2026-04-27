export default new class Nyaa {
  const BASE = 'https://nyaasi-api.vercel.app/api/search'
  
  function bestTitle(titles) {
    if (!titles?.length) return ''
    const latin = titles.filter(t => /[a-zA-Z]/.test(t))
    const pool  = latin.length ? latin : titles
    return pool.reduce((a, b) => a.length <= b.length ? a : b)
  }
  
  async function search(params, fetch) {
    const url = `${BASE}?${new URLSearchParams(params)}`
    const res  = await fetch(url)
    if (!res.ok) throw new Error(`Nyaa API error: HTTP ${res.status}. Try again later.`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Nyaa API returned an unexpected response format.')
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
  
  export default {
    async test(options, fetch) {
      try {
        const site = options?.sukebei ? 'sukebei' : 'nyaa'
        const res  = await fetch(`${BASE}?site=${site}&q=test`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error('Unexpected response format')
        return true
      } catch (err) {
        throw new Error(`Nyaa is unreachable: ${err.message}`)
      }
    },
  
    async single(query, options, fetch) {
      const { titles, episode, exclusions = [], resolution } = query
      if (!titles?.length) return []
      const title = bestTitle(titles)
      const ep    = String(episode ?? '').padStart(2, '0')
      const q     = `${title.replace(/[^\w\s-]/g, ' ').trim()} ${ep}`.trim()
      return search({
        q,
        title,
        episode:    episode ?? '',
        exclusions: exclusions.join(','),
        site:       options?.sukebei ? 'sukebei' : 'nyaa',
        batch:      'false',
      }, fetch)
    },
  
    async batch(query, options, fetch) {
      const { titles, exclusions = [] } = query
      if (!titles?.length) return []
      const title = bestTitle(titles)
      const q     = `${title.replace(/[^\w\s-]/g, ' ').trim()} Batch`
      return search({
        q,
        title,
        exclusions: exclusions.join(','),
        site:       options?.sukebei ? 'sukebei' : 'nyaa',
        batch:      'true',
      }, fetch)
    },
  
    async movie(query, options, fetch) {
      const { titles, resolution, exclusions = [] } = query
      if (!titles?.length) return []
      const title = bestTitle(titles)
      const q     = [title.replace(/[^\w\s-]/g, ' ').trim(), resolution ? `${resolution}p` : ''].filter(Boolean).join(' ')
      return search({
        q,
        title,
        exclusions: exclusions.join(','),
        site:       options?.sukebei ? 'sukebei' : 'nyaa',
        batch:      'false',
      }, fetch)
    },
  }
}()
