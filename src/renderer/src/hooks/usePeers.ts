import { useQuery } from '@tanstack/react-query'

export interface PeerList {
  symbol: string
  peers: string[]
}

export function usePeers(ticker: string | undefined): ReturnType<typeof useQuery<PeerList, Error>> {
  return useQuery<PeerList, Error>({
    queryKey: ['peers', ticker],
    queryFn: () => window.nexus.finance.peers(ticker as string) as Promise<PeerList>,
    enabled: !!ticker,
    staleTime: 60 * 60_000
  })
}
