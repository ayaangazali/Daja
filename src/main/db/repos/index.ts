import { watchlistRepo } from './watchlist'
import { tradesRepo } from './trades'
import { strategiesRepo } from './strategies'
import { journalRepo } from './journal'
import { userContextRepo } from './userContext'

export const repos = {
  watchlist: watchlistRepo,
  trades: tradesRepo,
  strategies: strategiesRepo,
  journal: journalRepo,
  userContext: userContextRepo
} as const

export type RepoName = keyof typeof repos

export {
  watchlistRepo,
  tradesRepo,
  strategiesRepo,
  journalRepo,
  userContextRepo
}
