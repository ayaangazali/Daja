import { watchlistRepo } from './watchlist'
import { tradesRepo } from './trades'
import { strategiesRepo } from './strategies'
import { journalRepo } from './journal'
import { userContextRepo } from './userContext'
import { healthRepo } from './health'
import { medicationsRepo } from './medications'
import { layoutsRepo } from './layouts'
import { conversationsRepo } from './conversations'

export const repos = {
  watchlist: watchlistRepo,
  trades: tradesRepo,
  strategies: strategiesRepo,
  journal: journalRepo,
  userContext: userContextRepo,
  health: healthRepo,
  medications: medicationsRepo,
  layouts: layoutsRepo,
  conversations: conversationsRepo
} as const

export type RepoName = keyof typeof repos

export {
  watchlistRepo,
  tradesRepo,
  strategiesRepo,
  journalRepo,
  userContextRepo,
  healthRepo,
  medicationsRepo,
  layoutsRepo,
  conversationsRepo
}
