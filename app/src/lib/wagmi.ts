import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'Vectis — Wallet with Opinions',
        url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      },
    }),
  ],
  transports: {
    [base.id]: http(),
  },
})
