/**
 * Lightweight lexicon-based sentiment scorer for financial news headlines.
 * Not a replacement for FinBERT but useful for ranking a list of headlines.
 *
 * Each word contributes a signed weight. Negators within a 2-word window flip
 * sign. Score normalized roughly to [-1, 1] via tanh.
 */

const POS: Record<string, number> = {
  beat: 2,
  beats: 2,
  surge: 2,
  surges: 2,
  surged: 2,
  soar: 2.5,
  soars: 2.5,
  soared: 2.5,
  jump: 1.5,
  jumps: 1.5,
  jumped: 1.5,
  gain: 1,
  gains: 1,
  gained: 1,
  rally: 1.5,
  rallies: 1.5,
  rallied: 1.5,
  upgrade: 2,
  upgraded: 2,
  bullish: 2,
  strong: 1,
  record: 1.5,
  growth: 1,
  profit: 1,
  profits: 1,
  profitable: 1.5,
  buyback: 1.5,
  dividend: 0.5,
  exceed: 1.5,
  exceeds: 1.5,
  exceeded: 1.5,
  exceeding: 1.5,
  outperform: 2,
  outperforms: 2,
  raise: 1,
  raises: 1,
  raised: 1,
  boost: 1.5,
  boosts: 1.5,
  boosted: 1.5,
  win: 1,
  wins: 1,
  won: 1,
  acquisition: 0.5,
  acquire: 0.5,
  acquires: 0.5,
  breakthrough: 2
}

const NEG: Record<string, number> = {
  miss: -2,
  misses: -2,
  missed: -2,
  plunge: -2.5,
  plunges: -2.5,
  plunged: -2.5,
  drop: -1.5,
  drops: -1.5,
  dropped: -1.5,
  fall: -1.5,
  falls: -1.5,
  fell: -1.5,
  slump: -2,
  slumps: -2,
  slumped: -2,
  loss: -1.5,
  losses: -1.5,
  downgrade: -2,
  downgraded: -2,
  bearish: -2,
  weak: -1,
  lawsuit: -1.5,
  sued: -1.5,
  investigation: -2,
  fraud: -3,
  probe: -1.5,
  warning: -1.5,
  cut: -1.5,
  cuts: -1.5,
  layoff: -1.5,
  layoffs: -2,
  bankruptcy: -3,
  bankrupt: -3,
  recall: -2,
  recalled: -1.5,
  underperform: -2,
  slash: -2,
  slashes: -2,
  slashed: -2,
  decline: -1.5,
  declines: -1.5,
  declined: -1.5,
  tumble: -2,
  tumbles: -2,
  tumbled: -2,
  crash: -2.5,
  crashes: -2.5,
  crashed: -2.5,
  resign: -1,
  resigns: -1,
  resigned: -1,
  delisting: -3,
  suspend: -1.5,
  suspended: -1.5,
  slides: -1,
  slide: -1,
  scandal: -2.5
}

const NEGATORS = new Set(['not', "don't", "doesn't", "didn't", 'no', 'never', 'without'])

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function scoreHeadline(text: string): number {
  if (!text) return 0
  const tokens = tokenize(text)
  let sum = 0
  let count = 0
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i]
    const p = POS[w]
    const n = NEG[w]
    if (p == null && n == null) continue
    let weight = p ?? n
    // Negator lookback (up to 2 words)
    for (let j = Math.max(0, i - 2); j < i; j++) {
      if (NEGATORS.has(tokens[j])) {
        weight = -weight
        break
      }
    }
    sum += weight
    count++
  }
  if (count === 0) return 0
  // Normalize via tanh to bound result
  return Math.tanh(sum / 3)
}

export interface SentimentSummary {
  averageScore: number // [-1, 1]
  positive: number
  negative: number
  neutral: number
  label: 'bullish' | 'bearish' | 'neutral'
}

export function aggregateSentiment(scores: number[]): SentimentSummary {
  if (scores.length === 0) {
    return { averageScore: 0, positive: 0, negative: 0, neutral: 0, label: 'neutral' }
  }
  let pos = 0
  let neg = 0
  let neutral = 0
  for (const s of scores) {
    if (s > 0.1) pos++
    else if (s < -0.1) neg++
    else neutral++
  }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  let label: SentimentSummary['label'] = 'neutral'
  if (avg > 0.1) label = 'bullish'
  else if (avg < -0.1) label = 'bearish'
  return { averageScore: avg, positive: pos, negative: neg, neutral, label }
}
