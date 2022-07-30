import ProjectInfoCard from '../components/ProjectInfoCard'
import RequesDetailsCard from '../components/RequestDetalilsCard'
import RequestMethodCard from '../components/RequestMethodCard'
import RequestModalContainer from '../components/RequestModalContainer'
import ModalStore from '../store/ModalStore'
import { Button, Divider, Modal, Text } from '@nextui-org/react'
import { useWalletConnectContext } from 'WalletConnect/store/WalletConnectContext'
import { NotYetImplementedError } from '@metaplex-foundation/js'
import { Keypair } from '@solana/web3.js'

export default function SessionProposalModal() {
  const { walletConnectClient } = useWalletConnectContext()

  // Get proposal data and wallet address from store
  const proposal = ModalStore.state.data?.proposal

  // Ensure proposal is defined
  if (!proposal) {
    return <Text>Missing proposal data</Text>
  }

  // Get required proposal data
  const { proposer, permissions, relay } = proposal
  const { chains } = permissions.blockchain
  const { methods } = permissions.jsonrpc

  // FIXME!! Treasury PK
  const treasuryPk = Keypair.generate().publicKey.toBase58()

  // Handle approve action
  async function onApprove() {
    throw new NotYetImplementedError()
    // if (proposal && treasuryPk) {
    //   // This connects to any cluster that the frontend requests
    //   // Chain consts are available in src/data/SolanaData.ts

    //   // FIXME! This may cause a problem when connecting to a
    //   // cluster where the smart wallet does not exist.
    //   // Check if the smart wallet exists on the chain before continuing
    //   const accounts = chains.map(
    //     (chain) => `${chain}:${treasuryPk.toBase58()}`
    //   )
    //   const response = {
    //     state: {
    //       accounts,
    //     },
    //   }
    //   await walletConnectClient?.approve({ proposal, response })
    // }
    ModalStore.close()
  }

  // Hanlde reject action
  async function onReject() {
    if (proposal) {
      await walletConnectClient?.reject({ proposal })
    }
    ModalStore.close()
  }

  return (
    <>
      <RequestModalContainer title="Session Proposal">
        <ProjectInfoCard metadata={proposer.metadata} />

        <Divider y={2} />

        <RequesDetailsCard chains={chains} protocol={relay.protocol} />

        <Divider y={2} />

        <RequestMethodCard methods={methods} />
      </RequestModalContainer>

      <Modal.Footer>
        <Button auto flat color="error" onClick={onReject}>
          {treasuryPk ? 'Reject' : 'Smart Wallet not connected'}
        </Button>

        {treasuryPk && (
          <Button auto flat color="success" onClick={onApprove}>
            Approve
          </Button>
        )}
      </Modal.Footer>
    </>
  )
}
