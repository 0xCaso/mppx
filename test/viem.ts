import { createClient, http, publicActions, walletActions } from 'viem'
import { tempo } from 'viem/chains'
import { tempoActions } from 'viem/tempo'
import { rpcUrl } from './prool.js'

export const client = createClient({
  chain: tempo,
  transport: http(rpcUrl),
})
  .extend(publicActions)
  .extend(walletActions)
  .extend(tempoActions())
