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
   * Gives a rough idea of how much the result title matches the query.
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
   * Looks for common patterns: "- 03", "E03", "_03", etc.
   */
  function containsEpisode(title, episode) {
    if (episode === undefined || episode === null) return true
    const ep = String(episode).padStart(2, '0')
    const epNum = String(episode)
    // Patterns: "- 03", "E03", " 03 ", "_03", "[03]"
    const patterns = [
      new RegExp(`[-_\\s\\[\\(]0*${epNum}[-_\\s\\]\\)v]`, 'i'),
      new RegExp(`E0*${epNum}\\b`, 'i'),
    ]
    return patterns.some(p => p.test(title))
  }
  
  /**
   * Pick the best title to search with. Prefers the shortest romanized title
   * since nyaa tends to index those most consistently.
   */
  function bestTitle(titles) {
    if (!titles?.length) return ''
    // Filter out titles that are pure non-latin (e.g. Japanese/Chinese/Korean)
    const latin = titles.filter(t => /[a-zA-Z]/.test(t))
    const pool  = latin.length ? latin : titles
    // Shortest title tends to be least ambiguous on nyaa
    return pool.reduce((a, b) => (a.length <= b.length ? a : b))
  }
  
  /**
   * Apply exclusions and accuracy filtering to raw API results.
   */
  function filterAndScore(results, { title, episode, exclusions = [], isBatch }) {
    const lowerExclusions = exclusions.map(e => e.toLowerCase())
  
    return results
      .filter(item => {
        const lower = item.title.toLowerCase()
        // Drop if any exclusion keyword is in the title
        if (lowerExclusions.some(ex => lower.includes(ex))) return false
        // For single episode searches, require the episode number to appear
        if (!isBatch && episode !== undefined && !containsEpisode(item.title, episode)) return false
        return true
      })
      .map(item => {
        const score = similarity(item.title, title)
        // Mark accuracy based on title similarity score
        const accuracy = score >= 0.6 ? 'medium' : 'low'
        return { ...item, accuracy }
      })
      // Sort by similarity descending so best matches come first
      .sort((a, b) => similarity(b.title, title) - similarity(a.title, title))
  }
  
  async function searchNyaa(query, fetch) {
    const res = await fetch(`${BASE}?q=${encodeURIComponent(query)}`)
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
      accuracy:  'low',   // default; filterAndScore may upgrade to 'medium'
      type:      undefined,
    }))
  }
  
  // ---------------------------------------------------------------------------
  // Extension
  // ---------------------------------------------------------------------------
  
  export default {
    // FIX: correct signature — (options, fetch), not (_, fetch)
    async test(options, fetch) {
      try {
        const res = await fetch(`${BASE}?q=one+piece`)
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
  
      const raw     = await searchNyaa(q, fetch)
      const mapped  = mapResults(raw)
      return filterAndScore(mapped, { title, episode, exclusions, isBatch: false })
    },
  
    async batch(query, options) {
      const { titles, exclusions, fetch } = query
      if (!titles?.length) return []
  
      const title = bestTitle(titles)
      const q     = `${title.replace(/[^\w\s-]/g, ' ').trim()} Batch`
  
      const raw    = await searchNyaa(q, fetch)
      const mapped = mapResults(raw)
      return filterAndScore(mapped, { title, exclusions, isBatch: true })
    },
  
    async movie(query, options) {
      const { titles, resolution, exclusions, fetch } = query
      if (!titles?.length) return []
  
      const title = bestTitle(titles)
      const q     = [title.replace(/[^\w\s-]/g, ' ').trim(), resolution ? `${resolution}p` : '']
        .filter(Boolean).join(' ')
  
      const raw    = await searchNyaa(q, fetch)
      const mapped = mapResults(raw)
      return filterAndScore(mapped, { title, exclusions, isBatch: false })
    },
  }
}()
