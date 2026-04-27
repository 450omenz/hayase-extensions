export default new class Nyaa {
  const BASE = 'https://nyaasi-api.vercel.app/api/search'
  
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  
  /**
   * Normalize a string for comparison: lowercase, strip bracketed tags like
   * [SubGroup], punctuation, and extra whitespace.
   */
  function normalize(str) {
    return str
      .toLowerCase()
      .replace(/\[[^\]]*\]/g, ' ') // remove [SubGroup], [1080p], etc.
      .replace(/\([^)]*\)/g, ' ')  // remove (2024), (TV), etc.
      .replace(/[^\w\s]/g, ' ')    // strip punctuation
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  /**
   * Simple word-overlap similarity score between two strings (0–1).
   */
  function similarity(a, b) {
    const wordsA = new Set(normalize(a).split(' ').filter(w => w.length > 1))
    const wordsB = new Set(normalize(b).split(' ').filter(w => w.length > 1))
    if (!wordsA.size || !wordsB.size) return 0
    let overlap = 0
    for (const w of wordsA) if (wordsB.has(w)) overlap++
    return overlap / Math.max(wordsA.size, wordsB.size)
  }
  
  /**
   * Check if a result title plausibly contains the given episode number.
   */
  function containsEpisode(title, episode) {
    if (episode === undefined || episode === null) return true
    const epNum = String(episode)
    const patterns = [
      new RegExp(`[-_\\s\\[\\(]0*${epNum}[-_\\s\\]\\)v]`, 'i'),
      new RegExp(`E0*${epNum}\\b`, 'i'),
    ]
    return patterns.some(p => p.test(title))
  }
  
  /**
   * Pick the best title to search with — shortest latin-script title.
   */
  function bestTitle(titles) {
    if (!titles?.length) return ''
    const latin = titles.filter(t => /[a-zA-Z]/.test(t))
    const pool  = latin.length ? latin : titles
    return pool.reduce((a, b) => (a.length <= b.length ? a : b))
  }
  
  /**
   * Apply exclusions, episode filtering, scoring, and sorting to results.
   */
  function filterAndScore(results, { title, episode, exclusions = [], isBatch }) {
    const lowerExclusions = exclusions.map(e => e.toLowerCase())
  
    return results
      .filter(item => {
        const lower = item.title.toLowerCase()
        if (lowerExclusions.some(ex => lower.includes(ex))) return false
        if (!isBatch && episode !== undefined && !containsEpisode(item.title, episode)) return false
        return true
      })
      .map(item => {
        const score    = similarity(item.title, title)
        const accuracy = score >= 0.6 ? 'medium' : 'low'
        return { ...item, accuracy }
      })
      .sort((a, b) => similarity(b.title, title) - similarity(a.title, title))
  }
  
  /**
   * Fetch results from the API, routing to nyaa or sukebei based on options.
   */
  async function searchNyaa(query, fetch, options = {}) {
    const site = options.sukebei ? 'sukebei' : 'nyaa'
    const url  = `${BASE}?site=${site}&q=${encodeURIComponent(query)}`
    const res  = await fetch(url)
  
    if (!res.ok) throw new Error(`Nyaa API error: HTTP ${res.status}. Try again later.`)
  
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Nyaa API returned an unexpected response format.')
    return data
  }
  
  function mapResults(data) {
    return data.map(item => ({
      title:     item.title     || 'Unknown',
      link:      item.magnet    || item.hash || item.link || '',
      hash:      item.hash      || '',
      seeders:   Number(item.seeders)   || 0,
      leechers:  Number(item.leechers)  || 0,
      downloads: Number(item.downloads) || 0,
      size:      Number(item.size)      || 0,
      date:      item.date ? new Date(item.date) : new Date(0),
      accuracy:  'low',
      type:      undefined,
    }))
  }
  
  // ---------------------------------------------------------------------------
  // Extension
  // ---------------------------------------------------------------------------
  
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
  
    async single(query, options) {
      const { titles, episode, exclusions, fetch } = query
      if (!titles?.length) return []
  
      const title = bestTitle(titles)
      const ep    = String(episode ?? '').padStart(2, '0')
      const q     = `${title.replace(/[^\w\s-]/g, ' ').trim()} ${ep}`.trim()
  
      const raw    = await searchNyaa(q, fetch, options)
      const mapped = mapResults(raw)
      return filterAndScore(mapped, { title, episode, exclusions, isBatch: false })
    },
  
    async batch(query, options) {
      const { titles, exclusions, fetch } = query
      if (!titles?.length) return []
  
      const title = bestTitle(titles)
      const q     = `${title.replace(/[^\w\s-]/g, ' ').trim()} Batch`
  
      const raw    = await searchNyaa(q, fetch, options)
      const mapped = mapResults(raw)
      return filterAndScore(mapped, { title, exclusions, isBatch: true })
    },
  
    async movie(query, options) {
      const { titles, resolution, exclusions, fetch } = query
      if (!titles?.length) return []
  
      const title = bestTitle(titles)
      const q     = [title.replace(/[^\w\s-]/g, ' ').trim(), resolution ? `${resolution}p` : '']
        .filter(Boolean).join(' ')
  
      const raw    = await searchNyaa(q, fetch, options)
      const mapped = mapResults(raw)
      return filterAndScore(mapped, { title, exclusions, isBatch: false })
    },
  }
}()
