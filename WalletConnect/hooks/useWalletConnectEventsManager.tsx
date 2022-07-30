import { SOLANA_SIGNING_METHODS } from '../data/SolanaChains'
import ModalStore from '../store/ModalStore'
import { CLIENT_EVENTS } from '@walletconnect/client'
import { RequestEvent, SessionTypes } from '@walletconnect/types'
import { useCallback, useEffect } from 'react'
import useWallet from '@hooks/useWallet'
import { NoWalletError } from 'WalletConnect/utils/error'
import {
  deserialiseTransaction,
  deserializeAllTransactions,
  SolanaSignAllTransactions,
  SolanaSignTransaction,
} from '@bastion-multisig/solana-wallet'
import { useWalletConnectContext } from 'WalletConnect/store/WalletConnectContext'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { ERROR } from '@walletconnect/utils'
import { NotYetImplementedError } from '@metaplex-foundation/js'

const AUTO_APPROVE = true

export default function useWalletConnectEventsManager() {
  const { walletConnectClient } = useWalletConnectContext()
  const { wallet } = useWallet()
  const walletPubkey = wallet?.publicKey

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
          if (AUTO_APPROVE) {
            return await approveSolanaRequest(requestEvent)
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

  /** Signs a solana request using the wallet adapter */
  async function approveSolanaRequest(
    requestEvent: RequestEvent
  ): Promise<void> {
    const { method, params, id } = requestEvent.request

    switch (method) {
      case SOLANA_SIGNING_METHODS.SOLANA_SIGN_MESSAGE:
        console.log("Program derived addresses can't sign messages.", params)
        return await rejectSolanaRequest(requestEvent)

      case SOLANA_SIGNING_METHODS.SOLANA_SIGN_ALL_TRANSACTIONS:
        try {
          const signedParams = await signAllTransactions(params)
          const response = formatJsonRpcResult(id, signedParams)
          return await walletConnectClient?.respond({
            topic: requestEvent.topic,
            response,
          })
        } catch (err: any) {
          console.log(err)
          return await rejectSolanaRequest(requestEvent)
        }

      case SOLANA_SIGNING_METHODS.SOLANA_SIGN_TRANSACTION:
        try {
          const signedParams = await signTransaction(params)
          const response = formatJsonRpcResult(id, signedParams)
          return await walletConnectClient?.respond({
            topic: requestEvent.topic,
            response,
          })
        } catch (err: any) {
          console.log(err)
          return await rejectSolanaRequest(requestEvent)
        }
      default:
        return await rejectSolanaRequest(requestEvent)
    }
  }

  /** Rejects the solana request */
  async function rejectSolanaRequest(request: RequestEvent) {
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

  async function signAllTransactions(params: SolanaSignAllTransactions) {
    if (!wallet || !walletPubkey || !wallet.signAllTransactions) {
      throw new NoWalletError()
    }

    // Interpret the solana request as a multisig transaction before passing it on
    const transactions = deserializeAllTransactions(params)
    console.log('tx', transactions)
    throw new NotYetImplementedError()
    // const { interpreted, txPubkeys } = await TxInterpreter.multisig(
    //   program,
    //   smartWalletAddress,
    //   transactions
    // )
    // console.log('interpreted', interpreted)

    // // Sign
    // const signedTransactions = await wallet.signAllTransactions(interpreted)

    // return serializeAllTransactions(signedTransactions)
  }

  async function signTransaction(params: SolanaSignTransaction) {
    if (!wallet || !walletPubkey || !wallet.signTransaction) {
      throw new NoWalletError()
    }

    // Interpret the solana request as a multisig transaction before passing it on
    const transaction = deserialiseTransaction(params)
    console.log('tx', transaction)
    throw new NotYetImplementedError()
    // const { interpreted, txPubkeys } = await TxInterpreter.multisig(
    //   program,
    //   smartWalletAddress,
    //   [transaction]
    // )
    // console.log('interpreted', interpreted)

    // if (interpreted.length === 0) {
    //   throw new WalletSignTransactionError(
    //     'Interpreting one transaction as multisig and got none back.'
    //   )
    // }
    // if (interpreted.length > 1) {
    //   throw new WalletSignTransactionError(
    //     'Interpreting one transacton as multisig and got many back.'
    //   )
    // }

    // // Sign
    // const signedTransaction = await wallet.signTransaction(interpreted[0])

    // return serialiseTransaction(signedTransaction)
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

  return { approveSolanaRequest, rejectSolanaRequest }
}
