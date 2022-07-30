import useWalletConnectEventsManager from '../hooks/useWalletConnectEventsManager'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import WalletConnectClient from '@walletconnect/client'
import { RequestEvent } from '@walletconnect/types'

export interface WalletConnectState {
  walletConnectClient?: WalletConnectClient
  approveSolanaRequest: (requestEvent: RequestEvent) => Promise<void>
  rejectSolanaRequest: (request: RequestEvent) => Promise<void>
}

export const WalletConnectContext = createContext<WalletConnectState>({
  approveSolanaRequest: async () => {},
  rejectSolanaRequest: async () => {},
})

export const WalletConnectProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [
    walletConnectClient,
    setWalletConnectClient,
  ] = useState<WalletConnectClient>()

  // Step 1 - Initialize wallets and wallet connect client
  useEffect(() => {
    if (!walletConnectClient) {
      WalletConnectClient.init({
        controller: true,
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
        relayUrl:
          process.env.NEXT_PUBLIC_RELAY_URL ?? 'wss://relay.walletconnect.com',
        metadata: {
          name: 'React Wallet',
          description: 'React Wallet for WalletConnect',
          url: 'https://walletconnect.com/',
          icons: ['https://avatars.githubusercontent.com/u/37784886'],
        },
      })
        .then((client) => {
          setWalletConnectClient(client)
        })
        .catch((err: unknown) => {
          setWalletConnectClient(undefined)
          console.log(err)
          alert(err)
        })
    }
  }, [walletConnectClient])

  // Step 2 - Once initialized, set up wallet connect event manager
  const {
    approveSolanaRequest,
    rejectSolanaRequest,
  } = useWalletConnectEventsManager()

  return (
    <WalletConnectContext.Provider
      value={{
        walletConnectClient,
        approveSolanaRequest,
        rejectSolanaRequest,
      }}
    >
      {children}
    </WalletConnectContext.Provider>
  )
}
export function useWalletConnectContext() {
  return useContext(WalletConnectContext)
}
