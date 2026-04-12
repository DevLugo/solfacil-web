/**
 * Fuzzy name matching utility for OCR-extracted names against system records.
 * Handles: accent differences, word-order permutations, 1-2 char typos.
 */

import type { CapturaClient, CapturaCredit } from '@/components/features/captura-ocr/types'

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

export interface FuzzyMatchResult {
  clientIndex: number
  score: number
  confidence: MatchConfidence
}

/** Standard Levenshtein distance (single-row DP). */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Ensure a is the shorter string for space optimization
  if (a.length > b.length) [a, b] = [b, a]

  const aLen = a.length
  const bLen = b.length
  let prev = Array.from({ length: aLen + 1 }, (_, i) => i)

  for (let j = 1; j <= bLen; j++) {
    const curr = [j]
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[i] = Math.min(
        curr[i - 1] + 1,       // insertion
        prev[i] + 1,           // deletion
        prev[i - 1] + cost,    // substitution
      )
    }
    prev = curr
  }
  return prev[aLen]
}

/** Normalize a name for comparison: lowercase, strip accents, remove filler words. */
export function normalizeName(name: string): string {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => !['de', 'del', 'la', 'las', 'los'].includes(w))
    .join(' ')
}

/**
 * Compute the best fuzzy distance between two names considering word-order permutations.
 * Returns the minimum of:
 *   1. Direct comparison
 *   2. Reversed word order of `a`
 *   3. Alphabetically sorted words of both
 */
function bestNameDistance(aNorm: string, bNorm: string): number {
  const direct = levenshteinDistance(aNorm, bNorm)
  if (direct === 0) return 0

  const aWords = aNorm.split(' ')
  const bWords = bNorm.split(' ')

  // Reversed word order
  const reversed = levenshteinDistance(aWords.slice().reverse().join(' '), bNorm)

  // Sorted words (catches any word-order permutation)
  const sorted = levenshteinDistance(
    aWords.slice().sort().join(' '),
    bWords.slice().sort().join(' '),
  )

  return Math.min(direct, reversed, sorted)
}

function scoreToConfidence(score: number, maxDistance: number): MatchConfidence {
  if (score === 0) return 'HIGH'
  if (score <= 1) return 'MEDIUM'
  if (score <= maxDistance) return 'LOW'
  return 'NONE'
}

/**
 * Find the best fuzzy match for an OCR name among a list of candidates.
 * Returns null if no match within maxDistance.
 */
export function fuzzyMatchName(
  ocrName: string,
  candidates: Array<{ borrowerName?: string }>,
  maxDistance = 2,
): FuzzyMatchResult | null {
  const ocrNorm = normalizeName(ocrName)
  if (!ocrNorm) return null

  let bestScore = Infinity
  let bestIndex = -1

  for (let i = 0; i < candidates.length; i++) {
    const candidateNorm = normalizeName(candidates[i].borrowerName || '')
    if (!candidateNorm) continue

    const score = bestNameDistance(ocrNorm, candidateNorm)
    if (score < bestScore) {
      bestScore = score
      bestIndex = i
    }
    if (score === 0) break // perfect match, stop early
  }

  if (bestIndex === -1 || bestScore > maxDistance) return null

  return {
    clientIndex: bestIndex,
    score: bestScore,
    confidence: scoreToConfidence(bestScore, maxDistance),
  }
}

/**
 * Auto-match credits against clientsList:
 *  - 'R' credits: try loanIdAnterior first, then fuzzy match (HIGH/MEDIUM/LOW).
 *  - 'N' credits: promote to 'R' ONLY on HIGH confidence (exact normalized match)
 *    to avoid false positives on OCR-garbled names of legitimate new clients.
 *
 * Returns a new array of credits with matchedClientPos, matchConfidence and
 * (for promoted N→R) tipo filled in. Deduplicates: each client can only be
 * matched to one credit.
 */
export function autoMatchCredits(
  credits: CapturaCredit[],
  clientsList: CapturaClient[],
): CapturaCredit[] {
  const usedClientPositions = new Set<number>()

  return credits.map(credit => {
    // === 'R' credits: existing flow (loanIdAnterior → fuzzy) ===
    if (credit.tipo === 'R') {
      // If pipeline already set loanIdAnterior, find client by loanId
      if (credit.loanIdAnterior) {
        const idx = clientsList.findIndex(c => c.loanId === credit.loanIdAnterior)
        if (idx !== -1) {
          usedClientPositions.add(clientsList[idx].pos)
          return { ...credit, matchedClientPos: clientsList[idx].pos, matchConfidence: 'HIGH' as const }
        }
      }

      // Fuzzy match by name
      if (!credit.nombre) return credit

      // Filter out already-used clients
      const available = clientsList.map((c, i) => ({ ...c, _originalIndex: i }))
        .filter(c => !usedClientPositions.has(c.pos))

      const match = fuzzyMatchName(credit.nombre, available)
      if (!match || match.confidence === 'NONE') return credit

      const matchedClient = available[match.clientIndex]
      usedClientPositions.add(matchedClient.pos)

      return {
        ...credit,
        matchedClientPos: matchedClient.pos,
        matchConfidence: match.confidence,
      }
    }

    // === 'N' credits: promote to 'R' only on exact normalized match ===
    // This handles the case where OCR mislabels a renewal as new (no 'R' marker
    // detected), but the client name is already in the locality's clientsList.
    if (credit.tipo === 'N' && credit.nombre) {
      const available = clientsList.map((c, i) => ({ ...c, _originalIndex: i }))
        .filter(c => !usedClientPositions.has(c.pos))

      // maxDistance=0 forces HIGH-only (exact after normalization: accents,
      // case, filler words stripped). Avoids false positives.
      const match = fuzzyMatchName(credit.nombre, available, 0)
      if (match && match.confidence === 'HIGH') {
        const matchedClient = available[match.clientIndex]
        usedClientPositions.add(matchedClient.pos)
        return {
          ...credit,
          tipo: 'R' as const,
          matchedClientPos: matchedClient.pos,
          matchConfidence: 'HIGH' as const,
        }
      }
    }

    return credit
  })
}
