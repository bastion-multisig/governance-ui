import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import WalletConnectClient, { CLIENT_EVENTS } from '@walletconnect/client'
import { RequestEvent, SessionTypes } from '@walletconnect/types'
import ModalStore from './ModalStore'
import { SOLANA_SIGNING_METHODS } from 'WalletConnect/data/SolanaChains'
import { formatJsonRpcError } from '@json-rpc-tools/utils'
import { ERROR } from '@walletconnect/utils'
import {
  deserialiseTransaction,
  deserializeAllTransactions,
} from '@bastion-multisig/solana-wallet'
import { PublicKey, Transaction } from '@solana/web3.js'

const AUTO_APPROVE = true

export interface WalletConnectState {
  walletConnectClient?: WalletConnectClient
  approveSession: (
    proposal: SessionTypes.Proposal,
    wallets: PublicKey[]
  ) => Promise<void>
  rejectSession: (proposal: SessionTypes.Proposal) => Promise<void>
  approveRequest: (
    requestEvent: RequestEvent,
    requestSession: SessionTypes.Settled
  ) => Promise<void>
  rejectRequest: (request: RequestEvent) => Promise<void>
}

export const WalletConnectContext = createContext<WalletConnectState>({
  approveSession: async () => {}, // eslint-disable-line
  rejectSession: async () => {}, // eslint-disable-line
  approveRequest: async () => {}, // eslint-disable-line
  rejectRequest: async () => {}, // eslint-disable-line
})

export const WalletConnectProvider = ({
  children,
  onRequestApproved,
}: {
  children: ReactNode
  onRequestApproved: (
    transactions: Transaction[],
    requestSession: SessionTypes.Settled
  ) => Promise<void>
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

  /******************************************************************************
   * 1. Open session proposal modal for confirmation / rejection
   *****************************************************************************/
  const onSessionProposal = useCallback((proposal: SessionTypes.Proposal) => {
    ModalStore.open('SessionProposalModal', { proposal })
  }, [])

  /******************************************************************************
   * 2. [Optional] handle session created
   *****************************************************************************/
  const onSessionCreated = useCallback(
    (_created: SessionTypes.Created) => {}, // eslint-disable-line
    []
  )
  /******************************************************************************
   * 3. Open request handling modal based on method that was used
   *****************************************************************************/
  const onSessionRequest = useCallback(
    async (requestEvent: SessionTypes.RequestEvent) => {
      const { topic, request } = requestEvent
      const { method } = request
      const requestSession = await walletConnectClient?.session.get(topic)

      switch (method) {
        case SOLANA_SIGNING_METHODS.SOLANA_SIGN_MESSAGE:
          return ModalStore.open('SessionSignSolanaModal', {
            requestEvent,
            requestSession,
          })

        case SOLANA_SIGNING_METHODS.SOLANA_SIGN_TRANSACTION:
        case SOLANA_SIGNING_METHODS.SOLANA_SIGN_ALL_TRANSACTIONS:
          if (AUTO_APPROVE && requestSession) {
            return await approveRequest(requestEvent, requestSession)
          } else {
            return ModalStore.open('SessionSignSolanaModal', {
              requestEvent,
              requestSession,
            })
          }
        default:
          return ModalStore.open('SessionUnsuportedMethodModal', {
            requestEvent,
            requestSession,
          })
      }
    },
    [walletConnectClient]
  )

  async function approveSession(
    proposal: SessionTypes.Proposal,
    wallets: PublicKey[]
  ) {
    // Get required proposal data
    const chains = proposal.permissions.blockchain.chains

    // This connects to any cluster that the frontend requests
    // Chain consts are available in src/data/SolanaData.ts
    const accounts = chains.flatMap((chain) =>
      wallets.map((wallet) => `${chain}:${wallet.toBase58()}`)
    )
    const response = {
      state: {
        accounts,
      },
    }
    await walletConnectClient?.approve({ proposal, response })
  }

  // Hanlde reject action
  async function rejectSession(proposal: SessionTypes.Proposal) {
    await walletConnectClient?.reject({ proposal })
  }

  /** Signs a solana request using the wallet adapter */
  async function approveRequest(
    requestEvent: RequestEvent,
    requestSession: SessionTypes.Settled
  ): Promise<void> {
    const { method, params } = requestEvent.request

    switch (method) {
      case SOLANA_SIGNING_METHODS.SOLANA_SIGN_MESSAGE:
        console.log("Program derived addresses can't sign messages.", params)
        await rejectRequest(requestEvent)

        break
      case SOLANA_SIGNING_METHODS.SOLANA_SIGN_ALL_TRANSACTIONS:
        try {
          const transactions = deserializeAllTransactions(params)
          await onRequestApproved(transactions, requestSession)
          await rejectRequest(requestEvent)
        } catch (err: any) {
          console.log(err)
          await rejectRequest(requestEvent)
        }
        break
      case SOLANA_SIGNING_METHODS.SOLANA_SIGN_TRANSACTION:
        try {
          const transactions = deserialiseTransaction(params)
          await onRequestApproved([transactions], requestSession)
          await rejectRequest(requestEvent)
        } catch (err: any) {
          console.log(err)
          await rejectRequest(requestEvent)
        }
        break
      default:
        await rejectRequest(requestEvent)
        break
    }
  }

  /** Rejects the solana request */
  async function rejectRequest(request: RequestEvent) {
    const { id } = request.request

    const response = formatJsonRpcError(
      id,
      ERROR.JSONRPC_REQUEST_METHOD_REJECTED.format().message
    )
    await walletConnectClient?.respond({
      topic: request.topic,
      response,
    })
  }

  /******************************************************************************
   * Set up WalletConnect event listeners
   *****************************************************************************/
  useEffect(() => {
    const client = walletConnectClient
    if (client) {
      client.on(CLIENT_EVENTS.session.proposal, onSessionProposal)

      client.on(CLIENT_EVENTS.session.created, onSessionCreated)

      client.on(CLIENT_EVENTS.session.request, onSessionRequest)
    }
    return () => {
      if (client) {
        client.off(CLIENT_EVENTS.session.proposal, onSessionProposal)

        client.off(CLIENT_EVENTS.session.created, onSessionCreated)

        client.off(CLIENT_EVENTS.session.request, onSessionRequest)
      }
    }
  }, [
    walletConnectClient,
    onSessionProposal,
    onSessionCreated,
    onSessionRequest,
  ])

  return (
    <WalletConnectContext.Provider
      value={{
        walletConnectClient,
        approveSession,
        rejectSession,
        approveRequest,
        rejectRequest,
      }}
    >
      {children}
    </WalletConnectContext.Provider>
  )
}
export function useWalletConnectContext() {
  return useContext(WalletConnectContext)
}
